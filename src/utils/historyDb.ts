import { SavedAnalysis } from "../types";
import { getHistoryFromDb, saveHistoryToDb, deleteHistoryFromDb, globalTenantId } from "../lib/firestoreUtils";
import { auth } from "../lib/firebase";
import { safeGetItem, safeSetItem, safeRemoveItem } from "./safeStorage";

export type { SavedAnalysis };

const TOMBSTONE_KEY = "assessor_deleted_analysis_tombstones_v1";

const getTombstones = (): Set<string> => {
  try {
    const raw = safeGetItem(TOMBSTONE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

const addTombstone = (id: string) => {
  try {
    const set = getTombstones();
    set.add(id);
    const arr = Array.from(set).slice(-300);
    safeSetItem(TOMBSTONE_KEY, JSON.stringify(arr));
  } catch {}
};

const removeTombstone = (id: string) => {
  try {
    const set = getTombstones();
    if (set.has(id)) {
      set.delete(id);
      safeSetItem(TOMBSTONE_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {}
};

export const isCorruptedHistoryItem = (item: SavedAnalysis): boolean => {
  if (!item || !item.id) return true;
  if ((item.result as any)?.error || (item.result as any)?.isError) return true;
  if (!item.result?.minute && !item.originalMinute) return true;
  return false;
};

export const repairHistoryItem = (item: SavedAnalysis): SavedAnalysis => {
  if (!item) return item;
  let changed = false;

  const isInvalidProc = (val?: string) =>
    !val ||
    typeof val !== "string" ||
    val.trim().length < 5 ||
    val.toLowerCase().includes("extrair") ||
    val.toLowerCase().includes("não informado") ||
    val.toLowerCase().includes("autos do processo");

  const isInvalidParty = (val?: string) =>
    !val ||
    typeof val !== "string" ||
    val.trim().length < 3 ||
    val.toLowerCase().includes("parte autora") ||
    val.toLowerCase().includes("parte ré") ||
    val.toLowerCase().includes("extrair");

  const relatorio = item.result?.minute?.relatorio || (item as any).relatorio || item.result?.minute?.fullFormattedText || item.processTextContext || "";

  // 1. Process Number
  if (isInvalidProc(item.processNumber) || (item.result?.minute && isInvalidProc(item.result.minute.processNumber))) {
    const cnjMatch = relatorio.match(/\b(\d{7}[-.]\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4})\b/);
    if (cnjMatch && cnjMatch[1]) {
      item.processNumber = cnjMatch[1];
      if (item.result?.minute) {
        item.result.minute.processNumber = cnjMatch[1];
      }
      changed = true;
    }
  }

  // 2. Author
  if (item.result?.minute?.parties && isInvalidParty(item.result.minute.parties.author)) {
    const authorMatch = relatorio.match(/(?:instaurad[oa]|propost[oa]|ajuizad[oa]|promovid[oa]|movid[oa])\s+por\s+([A-ZÁ-Ú\s]{3,60}?)(?:\s*,\s*qualificad|\s+em\s+face|\s+contra)/i)
      || relatorio.match(/(?:polo\s+ativo|promovente|autor(?:a)?|exequente)[\s:]+([A-ZÁ-Ú\s]{3,60}?)(?:[,\.\n]|\s+em\s+face)/i);
    if (authorMatch && authorMatch[1] && authorMatch[1].trim().length > 2) {
      item.result.minute.parties.author = authorMatch[1].trim();
      changed = true;
    }
  }

  // 3. Defendant
  if (item.result?.minute?.parties && isInvalidParty(item.result.minute.parties.defendant)) {
    const defMatch = relatorio.match(/(?:em\s+face\s+d[eao]s?|contra\s+(?:o|a)?)\s+([A-ZÁ-Ú\s]{3,60}?)(?:\s*,\s*tombad|\s*,\s*qualificad|\s*,\s*todos|[,\.\n])/i)
      || relatorio.match(/(?:polo\s+passivo|promovid[oa]|r[ée]u|executad[oa])[\s:]+([A-ZÁ-Ú\s]{3,60}?)(?:[,\.\n])/i);
    if (defMatch && defMatch[1] && defMatch[1].trim().length > 2) {
      item.result.minute.parties.defendant = defMatch[1].trim();
      changed = true;
    }
  }

  if (changed && item.result?.minute?.fullFormattedText) {
    if (item.processNumber && item.result.minute.fullFormattedText.includes("PROCESSO Nº: Extrair automaticamente dos autos")) {
      item.result.minute.fullFormattedText = item.result.minute.fullFormattedText.replace(
        "PROCESSO Nº: Extrair automaticamente dos autos",
        `PROCESSO Nº: ${item.processNumber}`
      );
    }
  }

  return item;
};

const getLocalStorageKey = () => {
  const unitId = safeGetItem("agaia_active_unit_id") || "montes_claros";
  return `assessor_fabricio_history_cache_v3_${unitId}_${globalTenantId}`;
};

const getLocalHistory = (): SavedAnalysis[] => {
  try {
    const raw = safeGetItem(getLocalStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const tombstones = getTombstones();
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && item.id && !tombstones.has(item.id) && !isCorruptedHistoryItem(item))
      : [];
  } catch (e) {
    console.warn("Could not read local history cache:", e);
    return [];
  }
};

const saveLocalHistory = (list: SavedAnalysis[]) => {
  try {
    const tombstones = getTombstones();
    const cleaned = list.filter((item) => item && item.id && !tombstones.has(item.id) && !isCorruptedHistoryItem(item));
    safeSetItem(getLocalStorageKey(), JSON.stringify(cleaned.slice(0, 50)));
  } catch (e) {
    console.warn("Could not write local history cache:", e);
  }
};

export const getHistory = async (): Promise<SavedAnalysis[]> => {
  const localList = getLocalHistory();
  const tombstones = getTombstones();

  const filterAndPrune = (list: SavedAnalysis[]): SavedAnalysis[] => {
    const clean: SavedAnalysis[] = [];
    const corruptedIds: string[] = [];

    for (const item of list) {
      if (!item || !item.id || tombstones.has(item.id)) continue;
      if (isCorruptedHistoryItem(item)) {
        corruptedIds.push(item.id);
      } else {
        clean.push(repairHistoryItem(item));
      }
    }

    if (corruptedIds.length > 0) {
      console.warn(`[History] Pruning ${corruptedIds.length} corrupted/incomplete history items:`, corruptedIds);
      corruptedIds.forEach((id) => {
        addTombstone(id);
        deleteHistoryFromDb(id).catch(() => {});
      });
    }

    return clean;
  };

  // If user is authenticated, Firestore is the absolute single source of truth
  if (auth.currentUser) {
    try {
      const dbList = await getHistoryFromDb();
      // Filter out tombstones and corrupted entries immediately
      const cleanList = filterAndPrune(dbList);
      // Update local cache to match Firestore exactly, removing any ghosts deleted on another device
      saveLocalHistory(cleanList);
      return cleanList;
    } catch (err) {
      console.warn("Could not fetch history from DB, falling back to local cache:", err);
      return filterAndPrune(localList);
    }
  }

  return filterAndPrune(localList);
};

export const saveToHistory = async (analysis: SavedAnalysis): Promise<void> => {
  if (!analysis || !analysis.id) return;
  if (isCorruptedHistoryItem(analysis)) {
    console.warn("Blocked attempt to save corrupted/error analysis to history:", analysis.id);
    return;
  }
  removeTombstone(analysis.id);

  // 1. Persist to Firestore DB (source of truth)
  try {
    await saveHistoryToDb(analysis);
  } catch (err) {
    console.warn("Could not save history to Firestore DB:", err);
  }

  // 2. Persist to LocalStorage cache
  const localList = getLocalHistory();
  const existingIdx = localList.findIndex((item) => item.id === analysis.id);
  let updatedList: SavedAnalysis[];
  if (existingIdx >= 0) {
    updatedList = [...localList];
    updatedList[existingIdx] = analysis;
  } else {
    updatedList = [analysis, ...localList];
  }
  saveLocalHistory(updatedList);
};

export const deleteFromHistory = async (id: string): Promise<void> => {
  if (!id) return;
  addTombstone(id);

  // 1. Delete from Firestore DB first
  try {
    await deleteHistoryFromDb(id);
  } catch (err) {
    console.warn("Could not delete from history DB:", err);
  }

  // 2. Clean all localStorage history caches across all units
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("assessor_fabricio_history_cache_")) {
        const raw = safeGetItem(key);
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const filtered = list.filter((item) => item && item.id !== id);
              safeSetItem(key, JSON.stringify(filtered));
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn("Error cleaning local history keys:", e);
  }
};

export const deleteDossierFromHistory = async (processNumber: string, unitId?: string): Promise<void> => {
  if (!processNumber) return;
  const cleanTargetNum = processNumber.replace(/[^\d]/g, '');

  // 1. Delete all matching docs from Firestore DB
  try {
    const { deleteDossierFromDb } = await import("../lib/firestoreUtils");
    await deleteDossierFromDb(processNumber, unitId);
  } catch (err) {
    console.warn("Could not delete dossier from DB:", err);
  }

  // 2. Clean from all localStorage caches and record tombstones for all its items
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("assessor_fabricio_history_cache_")) {
        const raw = safeGetItem(key);
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const toTombstone: string[] = [];
              const filtered = list.filter((item) => {
                if (!item) return false;
                const itemNum = (item.processNumber || item.result?.minute?.processNumber || "").replace(/[^\d]/g, '');
                const matches = (cleanTargetNum && itemNum === cleanTargetNum) || item.processNumber === processNumber;
                if (matches && item.id) {
                  toTombstone.push(item.id);
                }
                return !matches;
              });
              toTombstone.forEach(addTombstone);
              safeSetItem(key, JSON.stringify(filtered));
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn("Error cleaning local history keys for dossier:", e);
  }
};

export const updateAnalysisUnit = async (
  id: string,
  unitData: { unitId?: string; judicialUnit?: string; comarca?: string; vara?: string }
): Promise<void> => {
  if (!id) return;

  // 1. Update in Firestore
  try {
    const { updateAnalysisUnitInDb } = await import("../lib/firestoreUtils");
    await updateAnalysisUnitInDb(id, unitData);
  } catch (err) {
    console.warn("Could not update analysis unit in DB:", err);
  }

  // 2. Update in LocalStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("assessor_fabricio_history_cache_")) {
        const raw = safeGetItem(key);
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const updated = list.map((item: SavedAnalysis) => {
                if (item && item.id === id) {
                  return {
                    ...item,
                    ...(unitData.unitId ? { unitId: unitData.unitId } : {}),
                    ...(item.result
                      ? {
                          result: {
                            ...item.result,
                            minute: {
                              ...item.result.minute,
                              judicialUnit: unitData.judicialUnit || item.result.minute?.judicialUnit,
                              comarca: unitData.comarca || item.result.minute?.comarca,
                              vara: unitData.vara || item.result.minute?.vara,
                            },
                          },
                        }
                      : {}),
                  };
                }
                return item;
              });
              safeSetItem(key, JSON.stringify(updated));
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn("Error updating local history cache:", e);
  }
};

export const updateProcessUnit = async (
  processNumber: string,
  unitData: { unitId: string; judicialUnit: string; comarca?: string; vara?: string }
): Promise<void> => {
  if (!processNumber) return;
  const cleanTargetNum = processNumber.replace(/[^\d]/g, '');

  // 1. Update in Firestore
  try {
    const { updateProcessUnitInDb } = await import("../lib/firestoreUtils");
    await updateProcessUnitInDb(processNumber, unitData);
  } catch (err) {
    console.warn("Could not update dossier unit in DB:", err);
  }

  // 2. Update in LocalStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("assessor_fabricio_history_cache_")) {
        const raw = safeGetItem(key);
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const updated = list.map((item: SavedAnalysis) => {
                if (!item) return item;
                const itemNum = (item.processNumber || item.result?.minute?.processNumber || "").replace(/[^\d]/g, '');
                const isMatch = (cleanTargetNum.length >= 5 && itemNum === cleanTargetNum) || item.processNumber === processNumber;
                if (isMatch) {
                  return {
                    ...item,
                    unitId: unitData.unitId,
                    ...(item.result
                      ? {
                          result: {
                            ...item.result,
                            minute: {
                              ...item.result.minute,
                              judicialUnit: unitData.judicialUnit,
                              comarca: unitData.comarca || item.result.minute?.comarca,
                              vara: unitData.vara || item.result.minute?.vara,
                            },
                          },
                        }
                      : {}),
                  };
                }
                return item;
              });
              safeSetItem(key, JSON.stringify(updated));
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn("Error updating local history caches for process unit:", e);
  }
};

export const updateAnalysisCategory = async (
  id: string,
  categoryData: { promptCategory: string; vara?: string }
): Promise<void> => {
  if (!id) return;

  // 1. Update in Firestore
  try {
    const { updateAnalysisCategoryInDb } = await import("../lib/firestoreUtils");
    await updateAnalysisCategoryInDb(id, categoryData);
  } catch (err) {
    console.warn("Could not update analysis category in DB:", err);
  }

  // 2. Update in LocalStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("assessor_fabricio_history_cache_")) {
        const raw = safeGetItem(key);
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const updated = list.map((item: SavedAnalysis) => {
                if (item && item.id === id) {
                  return {
                    ...item,
                    promptCategory: categoryData.promptCategory,
                    ...(item.result
                      ? {
                          result: {
                            ...item.result,
                            minute: {
                              ...item.result.minute,
                              ...(categoryData.vara ? { vara: categoryData.vara } : {}),
                            },
                          },
                        }
                      : {}),
                  };
                }
                return item;
              });
              safeSetItem(key, JSON.stringify(updated));
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn("Error updating local history cache for category:", e);
  }
};

export const updateProcessCategory = async (
  processNumber: string,
  categoryData: { promptCategory: string; vara?: string }
): Promise<void> => {
  if (!processNumber) return;
  const cleanTargetNum = processNumber.replace(/[^\d]/g, '');

  // 1. Update in Firestore
  try {
    const { updateProcessCategoryInDb } = await import("../lib/firestoreUtils");
    await updateProcessCategoryInDb(processNumber, categoryData);
  } catch (err) {
    console.warn("Could not update dossier category in DB:", err);
  }

  // 2. Update in LocalStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("assessor_fabricio_history_cache_")) {
        const raw = safeGetItem(key);
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const updated = list.map((item: SavedAnalysis) => {
                if (!item) return item;
                const itemNum = (item.processNumber || item.result?.minute?.processNumber || "").replace(/[^\d]/g, '');
                const isMatch = (cleanTargetNum.length >= 5 && itemNum === cleanTargetNum) || item.processNumber === processNumber;
                if (isMatch) {
                  return {
                    ...item,
                    promptCategory: categoryData.promptCategory,
                    ...(item.result
                      ? {
                          result: {
                            ...item.result,
                            minute: {
                              ...item.result.minute,
                              ...(categoryData.vara ? { vara: categoryData.vara } : {}),
                            },
                          },
                        }
                      : {}),
                  };
                }
                return item;
              });
              safeSetItem(key, JSON.stringify(updated));
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn("Error updating local history caches for process category:", e);
  }
};

export const clearAllHistory = async (): Promise<void> => {
  safeRemoveItem(getLocalStorageKey());
  try {
    const list = await getHistoryFromDb();
    for (const item of list) {
      addTombstone(item.id);
      await deleteHistoryFromDb(item.id);
    }
  } catch (err) {
    console.warn("Could not clear all history:", err);
  }
};

export const exportHistoryJson = (history: SavedAnalysis[]) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `historico_analises_fabricio_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const importHistoryFromJson = async (jsonText: string): Promise<number> => {
  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) throw new Error("Invalid array");
    let count = 0;
    for (const item of parsed) {
      if (item && item.id) {
        await saveToHistory(item);
        count++;
      }
    }
    return count;
  } catch (e: any) {
    throw new Error("Error parsing JSON: " + e.message);
  }
};

