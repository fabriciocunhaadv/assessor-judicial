import { AuditedProcessRecord } from "../types";
import {
  getAuditsFromDb,
  saveAuditToDb,
  deleteAuditFromDb,
  updateAuditInDb,
  subscribeToAudits as subscribeToAuditsDb,
  getActiveUnitId,
} from "../lib/firestoreUtils";
import { safeGetItem, safeSetItem } from "./safeStorage";
import { gravarListaNoNavegador } from "./auditTamanho";
import { auth } from "../lib/firebase";
import toast from "react-hot-toast";

const AUDITS_LOCAL_STORAGE_KEY_PREFIX = "agaia_judge_audits_";

function getLocalStorageKey(): string {
  const unitId = getActiveUnitId();
  return `${AUDITS_LOCAL_STORAGE_KEY_PREFIX}${unitId}`;
}

export const getLocalAudits = (): AuditedProcessRecord[] => {
  try {
    const raw = safeGetItem(getLocalStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Could not read audits from local storage:", err);
    return [];
  }
};

export const saveLocalAudits = (audits: AuditedProcessRecord[]): boolean => {
  try {
    // Cada auditoria leva o texto dos autos; com processos grandes o navegador (~5 MB) enchia e a auditoria nova se perdia sem aviso.
    // Se a lista inteira não couber, os textos longos das mais antigas são encurtados (a nuvem continua com a cópia completa).
    const r = gravarListaNoNavegador(audits, (json) => safeSetItem(getLocalStorageKey(), json));
    if (r.ok && r.nivel > 0) console.warn(`[Auditorias] navegador cheio: textos longos das auditorias mais antigas foram encurtados (nível ${r.nivel}).`);
    if (!r.ok) console.warn("Could not write audits to local storage (mesmo encurtando).");
    window.dispatchEvent(new CustomEvent("agaia_audits_updated"));
    return r.ok;
  } catch (err) {
    console.warn("Could not write audits to local storage:", err);
    return false;
  }
};

export const subscribeToAudits = (callback: (audits: AuditedProcessRecord[]) => void): (() => void) => {
  iniciarReenvio();
  return subscribeToAuditsDb((remoteAudits) => {
    // Junta nuvem + navegador por id (antes a lista da nuvem substituía tudo e apagava
    // registros que ainda não tinham sido gravados/aceitos na nuvem).
    const local = getLocalAudits();
    const map = new Map<string, AuditedProcessRecord>();
    for (const item of local) map.set(item.id, item);
    for (const item of remoteAudits || []) map.set(item.id, item);
    const merged = Array.from(map.values()).sort((a, b) => (b.date || 0) - (a.date || 0));
    if (merged.length > 0) saveLocalAudits(merged);
    callback(merged);
  });
};

export const getAudits = async (): Promise<AuditedProcessRecord[]> => {
  const localList = getLocalAudits();
  try {
    const remoteList = await getAuditsFromDb();
    if (remoteList && remoteList.length > 0) {
      // Merge remote and local by id, preferring remote
      const map = new Map<string, AuditedProcessRecord>();
      for (const item of localList) {
        map.set(item.id, item);
      }
      for (const item of remoteList) {
        map.set(item.id, item);
      }
      const merged = Array.from(map.values()).sort(
        (a, b) => (b.date || 0) - (a.date || 0)
      );
      saveLocalAudits(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Could not fetch remote audits:", err);
  }
  return localList.sort((a, b) => (b.date || 0) - (a.date || 0));
};

// ===== Gravação na nuvem com tentativas, fila de pendentes e aviso visível =====
const PENDENTES_KEY = "agaia_audits_pendentes_v1";
const memoriaPendentes = new Map<string, AuditedProcessRecord>();      // cópia completa enquanto a página estiver aberta
const lerPendentes = (): string[] => { try { const v = JSON.parse(safeGetItem(PENDENTES_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const gravarPendentes = (ids: string[]) => { safeSetItem(PENDENTES_KEY, JSON.stringify(Array.from(new Set(ids)))); };
const comTempo = <T,>(p: Promise<T>, ms: number): Promise<T> => new Promise((ok, falha) => {
  const t = setTimeout(() => falha(new Error("tempo esgotado ao gravar na nuvem (conexão lenta ou sem rede)")), ms);
  p.then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); falha(e); });
});
const descreverErro = (e: any): string => `${e?.code ? e.code + ": " : ""}${String(e?.message || e || "erro desconhecido").slice(0, 140)}`;

const enviarParaNuvem = async (registro: AuditedProcessRecord, ms: number) => { await comTempo(saveAuditToDb(registro), ms); };

let reenvioIniciado = false, reenviando = false;
export const reenviarAuditoriasPendentes = async (): Promise<void> => {
  if (reenviando || !auth.currentUser) return;
  const ids = lerPendentes();
  if (!ids.length) return;
  reenviando = true;
  try {
    const restantes: string[] = [];
    for (const id of ids) {
      const reg = memoriaPendentes.get(id) || getLocalAudits().find((a) => a.id === id);
      if (!reg) continue;      // já não existe (foi excluída)
      try { await enviarParaNuvem(reg, 30000); memoriaPendentes.delete(id); toast.success(`Auditoria ${reg.processNumber || ""} gravada na nuvem.`, { duration: 6000 }); }
      catch (e) { console.warn("[Auditorias] reenvio falhou:", descreverErro(e)); restantes.push(id); }
    }
    gravarPendentes(restantes);
  } finally { reenviando = false; }
};
const iniciarReenvio = () => {
  if (reenvioIniciado || typeof window === "undefined") return;
  reenvioIniciado = true;
  window.addEventListener("online", () => { void reenviarAuditoriasPendentes(); });
  setInterval(() => { void reenviarAuditoriasPendentes(); }, 60000);
  setTimeout(() => { void reenviarAuditoriasPendentes(); }, 8000);
};

export const saveAudit = async (record: AuditedProcessRecord): Promise<void> => {
  if (!record || !record.id) return;
  iniciarReenvio();

  // 1. Cópia no navegador (encurta textos longos se o navegador estiver cheio)
  const localList = getLocalAudits();
  const existingIdx = localList.findIndex((item) => item.id === record.id);
  let updatedList: AuditedProcessRecord[];
  if (existingIdx >= 0) {
    updatedList = [...localList];
    updatedList[existingIdx] = record;
  } else {
    updatedList = [record, ...localList];
  }
  const localOk = saveLocalAudits(updatedList);

  // 2. Nuvem: uma tentativa agora (até 15 s); se falhar, entra na fila e é reenviada sozinha (online, a cada minuto)
  if (!auth.currentUser) return;
  try {
    await enviarParaNuvem(record, 15000);
  } catch (err) {
    console.warn("Could not save audit to DB:", err);
    memoriaPendentes.set(record.id, record);
    gravarPendentes([...lerPendentes(), record.id]);
    toast.error(
      `Auditoria ${record.processNumber || ""} concluída, mas não foi gravada na nuvem agora (${descreverErro(err)}). ` +
      (localOk ? "Ficou guardada neste navegador e será reenviada automaticamente." : "ATENÇÃO: também não coube no navegador; mantenha esta aba aberta, vou tentar de novo e copie o resultado se precisar."),
      { duration: 20000 }
    );
  }
};

export const updateAudit = async (
  id: string,
  partial: Partial<AuditedProcessRecord>
): Promise<void> => {
  if (!id) return;

  // 1. Update LocalStorage
  const localList = getLocalAudits();
  const existingIdx = localList.findIndex((item) => item.id === id);
  if (existingIdx >= 0) {
    const updated = { ...localList[existingIdx], ...partial, updatedAt: Date.now() };
    const updatedList = [...localList];
    updatedList[existingIdx] = updated;
    saveLocalAudits(updatedList);
  }

  // 2. Update Firestore DB
  try {
    await updateAuditInDb(id, partial);
  } catch (err) {
    console.warn("Could not update audit in DB:", err);
  }
};

export const deleteAudit = async (id: string): Promise<void> => {
  if (!id) return;

  // 1. Delete from LocalStorage
  const localList = getLocalAudits();
  const filtered = localList.filter((item) => item.id !== id);
  saveLocalAudits(filtered);

  // 2. Delete from Firestore DB
  try {
    await deleteAuditFromDb(id);
  } catch (err) {
    console.warn("Could not delete audit from DB:", err);
  }
};

export const clearAllAudits = async (): Promise<void> => {
  localStorage.removeItem(getLocalStorageKey());
  window.dispatchEvent(new CustomEvent("agaia_audits_updated"));
  try {
    const list = await getAuditsFromDb();
    for (const item of list) {
      await deleteAuditFromDb(item.id);
    }
  } catch (err) {
    console.warn("Could not clear all audits:", err);
  }
};

export const exportAuditsJson = (audits: AuditedProcessRecord[]) => {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(audits, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute(
    "download",
    `auditorias_magistrado_${new Date().toISOString().slice(0, 10)}.json`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const importAuditsFromJson = async (jsonText: string): Promise<number> => {
  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) throw new Error("Invalid array");
    let count = 0;
    for (const item of parsed) {
      if (item && item.id) {
        await saveAudit(item);
        count++;
      }
    }
    return count;
  } catch (e: any) {
    throw new Error("Erro ao importar auditorias: " + e.message);
  }
};