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

export const saveLocalAudits = (audits: AuditedProcessRecord[]) => {
  try {
    safeSetItem(getLocalStorageKey(), JSON.stringify(audits));
    window.dispatchEvent(new CustomEvent("agaia_audits_updated"));
  } catch (err) {
    console.warn("Could not write audits to local storage:", err);
  }
};

export const subscribeToAudits = (callback: (audits: AuditedProcessRecord[]) => void): (() => void) => {
  return subscribeToAuditsDb((remoteAudits) => {
    if (remoteAudits && remoteAudits.length > 0) {
      saveLocalAudits(remoteAudits);
      callback(remoteAudits);
    } else {
      const local = getLocalAudits();
      callback(local);
    }
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

export const saveAudit = async (record: AuditedProcessRecord): Promise<void> => {
  if (!record || !record.id) return;

  // 1. Update LocalStorage cache
  const localList = getLocalAudits();
  const existingIdx = localList.findIndex((item) => item.id === record.id);
  let updatedList: AuditedProcessRecord[];
  if (existingIdx >= 0) {
    updatedList = [...localList];
    updatedList[existingIdx] = record;
  } else {
    updatedList = [record, ...localList];
  }
  saveLocalAudits(updatedList);

  // 2. Persist to Firestore DB
  try {
    await saveAuditToDb(record);
  } catch (err) {
    console.warn("Could not save audit to DB:", err);
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
