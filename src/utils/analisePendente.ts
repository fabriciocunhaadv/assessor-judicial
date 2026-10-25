// ANÁLISE PENDENTE: o navegador do celular costuma fechar a página quando o usuário sai para outro aplicativo. A análise continua no servidor; aqui fica o marcador (no próprio aparelho)
// que permite buscar o resultado de volta quando a página reabre, em vez de refazer tudo.
import { getApiHeaders } from "./apiKeyManager";

export interface AnalisePendente {
  progId: string; tipo: "analise" | "etapa2"; iniciadoEm: number; uid?: string;
  promptTitle?: string; promptId?: string; promptCategory?: string; promptScope?: string; unitId?: string; unitName?: string; processNumber?: string; contexto?: string;
}
const CHAVE = "assessor_analise_pendente";
const VALIDADE_MS = 90 * 60_000;      // o servidor guarda o resultado por 1 hora

export function salvarPendente(p: AnalisePendente): void { try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* sem armazenamento: segue sem recuperação */ } }
export function lerPendente(): AnalisePendente | null {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (!p?.progId || Date.now() - Number(p.iniciadoEm || 0) > VALIDADE_MS) { if (p) localStorage.removeItem(CHAVE); return null; }
    return p;
  } catch { return null; }
}
export function limparPendente(progId?: string): void { try { const p = JSON.parse(localStorage.getItem(CHAVE) || "null"); if (!progId || !p || p.progId === progId) localStorage.removeItem(CHAVE); } catch { /* ignora */ } }

export interface RespostaResultado { pronto: boolean; status?: number; body?: string; andamento?: { texto?: string; pct?: number | null; decorridoSeg?: number }; desconhecido?: boolean }
export async function consultarResultado(progId: string): Promise<RespostaResultado> {
  const r = await fetch(`/api/resultado/${encodeURIComponent(progId)}`, { headers: getApiHeaders(), cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

/** Extrai o JSON da resposta guardada (o servidor manda espaços de "batimento" antes do JSON). */
export function lerCorpo(body: string): any {
  const t = String(body || "").trim(), i = t.indexOf("{"), j = t.lastIndexOf("}");
  return JSON.parse(i >= 0 && j >= i ? t.slice(i, j + 1) : t);
}

// ----- marcadores dos módulos (Turbo, Lupa): um por módulo -----
export type ModuloPendente = "turbo" | "lupa";
export interface PendenteModulo { progId: string; iniciadoEm: number; uid?: string; tenant?: string; unitName?: string; promptTitle?: string; processNumber?: string; assessorName?: string; draftText?: string; specificInstructions?: string; pdfFileNames?: string[]; contexto?: string }
const chaveModulo = (m: ModuloPendente) => `assessor_pendente_${m}`;
export function salvarPendenteModulo(m: ModuloPendente, d: PendenteModulo): void { try { localStorage.setItem(chaveModulo(m), JSON.stringify(d)); } catch { /* sem armazenamento: segue sem recuperação */ } }
export function lerPendenteModulo(m: ModuloPendente): PendenteModulo | null {
  try { const p = JSON.parse(localStorage.getItem(chaveModulo(m)) || "null"); if (!p?.progId || Date.now() - Number(p.iniciadoEm || 0) > VALIDADE_MS) { if (p) localStorage.removeItem(chaveModulo(m)); return null; } return p; } catch { return null; }
}
export function limparPendenteModulo(m: ModuloPendente, progId?: string): void { try { const p = JSON.parse(localStorage.getItem(chaveModulo(m)) || "null"); if (!progId || !p || p.progId === progId) localStorage.removeItem(chaveModulo(m)); } catch { /* ignora */ } }

/** Pedidos de módulos que ESTA página ainda está esperando: a recuperação automática não mexe neles (a própria tela já vai receber o resultado). */
export const ativosNestaPagina = new Set<string>();
