import { LoggedExecution, ApiUsageStats, saveUsageLogToDb, getUsageLogsFromDb, getApiUsageStatsFromDb, saveApiUsageStatsToDb, recordTokenUsageToDb, globalTenantId } from "../lib/firestoreUtils";
import { ExecutionModuleType } from "../types";
import { auth } from "../lib/firebase";
import { safeGetItem, safeSetItem } from "./safeStorage";
import { isNativeKeyAllowed, getAllCustomApiKeys, getCustomApiKey } from "./apiKeyManager";

export type { ApiUsageStats, LoggedExecution };

const USAGE_STATS_KEY = "assessor_api_usage_stats_v2";
const USAGE_LOGS_KEY = "assessor_api_usage_logs_v2";

export const DEFAULT_INITIAL_DEPOSIT_BRL = 60.0; // R$ 60,00 Pre-pago Cloud
export const DEFAULT_CURRENT_BALANCE_BRL = 42.55; // R$ 42,55 saldo inicial

// BRL pricing constants (US$ -> BRL @ R$ 5.75)
// Gemini 3.7 Flash: Input US$ 0.15/1M (~R$ 0.8625/1M), Output US$ 0.60/1M (~R$ 3.45/1M)
export const PRICE_PER_MILLION_INPUT_37_BRL = 0.8625;
export const PRICE_PER_MILLION_OUTPUT_37_BRL = 3.45;

export const calculateCostBrl = (
  promptTokens: number = 0,
  outputTokens: number = 0,
  model: string = "gemini-3.8-flash"
): number => {
  const isLite = model.toLowerCase().includes("lite");
  const inputRate = isLite ? 0.43125 : PRICE_PER_MILLION_INPUT_37_BRL;
  const outputRate = isLite ? 1.725 : PRICE_PER_MILLION_OUTPUT_37_BRL;

  const cost = (promptTokens * inputRate / 1_000_000) + (outputTokens * outputRate / 1_000_000);
  return Math.max(0.0001, Number(cost.toFixed(6)));
};

export const getLocalUsageStats = (): ApiUsageStats => {
  try {
    const raw = safeGetItem(USAGE_STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.totalTokens === "number") return parsed;
    }
  } catch (e) {
    console.warn("Could not read local usage stats:", e);
  }

  return {
    totalTokens: 0,
    totalCostBrl: 0,
    currentBalanceBrl: DEFAULT_CURRENT_BALANCE_BRL,
    initialDepositBrl: DEFAULT_INITIAL_DEPOSIT_BRL,
    lastUpdated: Date.now(),
  };
};

export const getLocalUsageLogs = (): LoggedExecution[] => {
  try {
    const raw = safeGetItem(USAGE_LOGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Could not read local usage logs:", e);
  }
  return [];
};

export const recordApiExecution = async (params: {
  label: string;
  processNumber?: string;
  model?: string;
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  module?: ExecutionModuleType;
}): Promise<{ log: LoggedExecution; stats: ApiUsageStats }> => {
  const promptTokens = params.promptTokens || 0;
  const outputTokens = params.outputTokens || 0;
  const totalTokens = params.totalTokens || (promptTokens + outputTokens);
  const model = params.model || "Gemini 3.7 Flash";
  const costBrl = calculateCostBrl(promptTokens, outputTokens, model);

  // Detecção inteligente do módulo se não informado explicitamente
  let detectedModule: ExecutionModuleType = params.module || 'outros';
  if (!params.module) {
    const lbl = (params.label || '').toLowerCase();
    if (lbl.includes('audiência') || lbl.includes('audiencia') || lbl.includes('hearing') || lbl.includes('assentada') || lbl.includes('ata ')) {
      detectedModule = 'audiencia';
    } else if (lbl.includes('lupa') || lbl.includes('auditoria') || lbl.includes('audit')) {
      detectedModule = 'lupa_magistrado';
    } else if (lbl.includes('chat') || lbl.includes('reescrita') || lbl.includes('agaia') || lbl.includes('consulta')) {
      detectedModule = 'chat_refino';
    } else if (lbl.includes('minuta') || lbl.includes('sentença') || lbl.includes('decisão') || lbl.includes('despacho') || lbl.includes('análise')) {
      detectedModule = 'minuta';
    }
  }

  const nativeAllowed = isNativeKeyAllowed();
  const uid = auth.currentUser?.uid || "anonymous";
  const allKeys = getAllCustomApiKeys(uid);
  const activeKeyRaw = getCustomApiKey(uid) || "";
  const activeKeyItem = allKeys.find(k => k.key === activeKeyRaw);
  const snippet = activeKeyRaw ? `...${activeKeyRaw.slice(-4)}` : '';
  const label = nativeAllowed
    ? 'Chave Nativa Corporativa'
    : (activeKeyItem?.label || (allKeys.length > 0 ? allKeys[0].label : 'Chave Pessoal'));

  const now = new Date();
  const log: LoggedExecution = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    timeMs: Date.now(),
    label: params.label || "Execução Jurídica",
    processNumber: params.processNumber || "Gabinete TJGO",
    model,
    promptTokens,
    outputTokens,
    totalTokens,
    costBrl,
    userId: auth.currentUser?.uid || "anonymous",
    userName: auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "Assessor",
    userEmail: auth.currentUser?.email || "",
    module: detectedModule,
    keyType: nativeAllowed ? 'native' : 'byok',
    keyLabel: label,
    tenantId: globalTenantId,
  };

  // Update local logs
  const localLogs = getLocalUsageLogs();
  const updatedLogs = [log, ...localLogs.slice(0, 30)];
  try {
    safeSetItem(USAGE_LOGS_KEY, JSON.stringify(updatedLogs));
  } catch (e) {
    console.warn(e);
  }

  // Update stats
  const currentStats = getLocalUsageStats();
  const newTotalTokens = currentStats.totalTokens + totalTokens;
  const newTotalCost = Number((currentStats.totalCostBrl + costBrl).toFixed(4));
  const newBalance = Math.max(0, Number((currentStats.currentBalanceBrl - costBrl).toFixed(4)));

  const updatedStats: ApiUsageStats = {
    ...currentStats,
    totalTokens: newTotalTokens,
    totalCostBrl: newTotalCost,
    currentBalanceBrl: newBalance,
    lastUpdated: Date.now(),
  };

  try {
    safeSetItem(USAGE_STATS_KEY, JSON.stringify(updatedStats));
  } catch (e) {
    console.warn(e);
  }

  // Background persist to Firestore
  if (auth.currentUser) {
    saveUsageLogToDb(log).catch(() => {});
    saveApiUsageStatsToDb(updatedStats).catch(() => {});

    // Telemetria Unificada: registra requisições, tokens e módulos tanto para Chave Nativa quanto para Chaves Gratuitas do Usuário
    recordTokenUsageToDb({
      tenantId: globalTenantId,
      userEmail: auth.currentUser.email || log.userEmail,
      userName: auth.currentUser.displayName || log.userName,
      totalTokens,
      promptTokens,
      candidatesTokens: outputTokens,
      costBrl,
      module: detectedModule,
      keyMode: nativeAllowed ? 'native' : 'custom',
      activeKeyLabel: label,
      activeKeySnippet: nativeAllowed ? 'NATIVA' : snippet,
      poolSize: nativeAllowed ? 1 : Math.max(1, allKeys.length),
      userId: uid
    }).catch((err) => console.warn("[TokenTelemetry] Erro ao consolidar cota:", err));
  }

  // Notify listeners across components
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("api-usage-updated", { detail: { log, stats: updatedStats } }));
  }

  return { log, stats: updatedStats };
};

export const updateInitialDeposit = (initialDepositBrl: number, currentBalanceBrl: number) => {
  const current = getLocalUsageStats();
  const updated: ApiUsageStats = {
    ...current,
    initialDepositBrl: Math.max(0, initialDepositBrl),
    currentBalanceBrl: Math.max(0, currentBalanceBrl),
    lastUpdated: Date.now(),
  };

  try {
    safeSetItem(USAGE_STATS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn(e);
  }

  if (auth.currentUser) {
    saveApiUsageStatsToDb(updated).catch(() => {});
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("api-usage-updated", { detail: { stats: updated } }));
  }
};
