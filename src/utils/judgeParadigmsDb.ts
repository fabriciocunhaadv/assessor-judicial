import { JudgeParadigmModel } from "../data/defaultParadigms";
import { saveParadigmsToDb, getParadigmsFromDb, globalTenantId, getActiveUnitId } from "../lib/firestoreUtils";
import { safeGetItem, safeSetItem } from "./safeStorage";

const getStorageKey = () => `assessor_judge_paradigms_v2_${globalTenantId}_${getActiveUnitId()}`;
export const PARADIGMS_UPDATE_EVENT = "assessor_paradigms_updated";

/** Broadcast changes to all open tabs and components in real time */
const notifyParadigmsUpdated = (paradigms: JudgeParadigmModel[]) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PARADIGMS_UPDATE_EVENT, { detail: paradigms }));
  }
};

export const getJudgeParadigms = (): JudgeParadigmModel[] => {
  try {
    const raw = safeGetItem(getStorageKey());
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not load judge paradigms from storage:", err);
  }
  // Proibição Absoluta de auto-injeção de modelos padrão (Regra 4 do usuário).
  // O gabinete inicia limpo e preserva exclusivamente os modelos criados pelo usuário.
  return [];
};

export const saveJudgeParadigms = (paradigms: JudgeParadigmModel[], syncRemote = true): Promise<void> => {
  try {
    safeSetItem(getStorageKey(), JSON.stringify(paradigms));
    notifyParadigmsUpdated(paradigms);
    if (syncRemote) {
      return saveParadigmsToDb(paradigms).catch((e) => {
        console.warn("Could not persist paradigms to Firestore:", e);
      });
    }
  } catch (err) {
    console.warn("Could not save judge paradigms locally (cloud active):", err);
  }
  return Promise.resolve();
};

export const addJudgeParadigm = (
  model: Omit<JudgeParadigmModel, "id" | "createdAt" | "updatedAt">
): JudgeParadigmModel => {
  const current = getJudgeParadigms();
  const newModel: JudgeParadigmModel = {
    ...model,
    id: `paradigm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const updated = [newModel, ...current];
  saveJudgeParadigms(updated);
  return newModel;
};

export const updateJudgeParadigm = (
  id: string,
  updates: Partial<JudgeParadigmModel>
): JudgeParadigmModel[] => {
  const current = getJudgeParadigms();
  const updated = current.map((item) =>
    item.id === id ? { ...item, ...updates, updatedAt: Date.now() } : item
  );
  saveJudgeParadigms(updated);
  return updated;
};

export const deleteJudgeParadigm = (id: string): JudgeParadigmModel[] => {
  const current = getJudgeParadigms();
  const updated = current.filter((item) => item.id !== id);
  saveJudgeParadigms(updated);
  return updated;
};

export const resetJudgeParadigmsToDefault = (): JudgeParadigmModel[] => {
  saveJudgeParadigms([]);
  return [];
};

/** 
 * Merges remote paradigms with any local user-created paradigms so that 
 * a lagged or older remote snapshot never wipes out recently created models.
 * Conforms strictly to Rule 4 (Proibição Absoluta de Sobrescrita de Dados).
 */
export const mergeAndSaveJudgeParadigms = (
  remoteList: JudgeParadigmModel[],
  syncRemote = false
): JudgeParadigmModel[] => {
  if (!Array.isArray(remoteList)) return getJudgeParadigms();
  const current = getJudgeParadigms();
  
  if (remoteList.length === 0) {
    // Se a lista remota está vazia (ex: usuário excluiu todos os modelos),
    // verificamos se o cache local só tem modelos padrão residuais. Se sim, limpa.
    const hasOnlyDefaults = current.every(
      (c) => c.isDefault || (c.id && c.id.startsWith("paradigm-") && !isNaN(Number(c.id.replace("paradigm-", ""))))
    );
    if (hasOnlyDefaults) {
      saveJudgeParadigms([], false);
      return [];
    }
    return current;
  }
  
  const remoteIds = new Set(remoteList.map((r) => r.id));
  const localOnly = current.filter((c) => !remoteIds.has(c.id) && !c.isDefault);
  const merged = localOnly.length > 0 ? [...localOnly, ...remoteList] : remoteList;
  saveJudgeParadigms(merged, syncRemote || localOnly.length > 0);
  return merged;
};

/** Sync paradigms from remote Firestore with anti-overwrite safety */
export const syncParadigmsWithDb = async (): Promise<JudgeParadigmModel[]> => {
  try {
    const remote = await getParadigmsFromDb();
    if (remote !== null && Array.isArray(remote)) {
      return mergeAndSaveJudgeParadigms(remote, false);
    }
  } catch (err) {
    console.warn("Could not sync paradigms from remote DB:", err);
  }
  return getJudgeParadigms();
};

