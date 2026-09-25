import { db, auth } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc, updateDoc, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { CustomPrompt, GenerationResult, CabinetTesesData, ProjudiGuideData, UserProfile, UserRole, ChatMessage, MinuteData, SavedAnalysis, ApiUsageMetadata, SystemBroadcast, MinuteVersion, AuditedProcessRecord, CabinetCalendarSettings, SaaSTenant, CabinetBackupSnapshot, GlobalDatabaseSnapshot, CabinetFullPartitionData, CabinetMonthlyTokenUsage, ExecutionModuleType, ModuleTokenUsageStats } from '../types';
import { JudgeParadigmModel } from '../data/defaultParadigms';
import { SavedKnowledgeDoc } from '../utils/knowledgeDb';
import { DEFAULT_CABINET_TESES } from '../data/defaultTeses';
import { DEFAULT_PROJUDI_GUIDE } from '../data/defaultProjudiGuide';
import { safeGetItem, safeSetItem, pruneDispensableStorage } from '../utils/safeStorage';

import { JudicialUnit, DEFAULT_UNITS } from '../types';


export let globalTenantId = 'gabinete_default';

export function setGlobalTenantId(tenantId: string) {
  globalTenantId = tenantId || 'gabinete_default';
}

function getTenantPath(collectionName: string) {
  return `gabinetes/${globalTenantId}/${collectionName}`;
}

function getTenantDocPath(collectionName: string, docId: string) {
  return `gabinetes/${globalTenantId}/${collectionName}/${docId}`;
}

export const isPrimaryCabinet = (tenantId?: string | null): boolean => {
  if (!tenantId) return true;
  const tid = tenantId.toLowerCase().trim();
  return (
    tid === '' ||
    tid === 'gabinete_default' ||
    tid === 'default' ||
    tid === 'gab_rafael_machado' ||
    tid === 'rafael_machado' ||
    tid === 'montes_claros' ||
    tid === 'fazenda_nova' ||
    tid === 'principal' ||
    tid === 'gabinete_principal'
  );
};

export function getHistoryCollectionPaths(): string[] {
  const currentPath = getTenantPath('history');
  if (isPrimaryCabinet(globalTenantId)) {
    return Array.from(new Set([
      currentPath,
      'gabinetes/gab_rafael_machado/history',
      'gabinetes/gabinete_default/history',
      'history'
    ]));
  }
  return [currentPath];
}


export function getActiveUnitId() {
  return safeGetItem("agaia_active_unit_id") || "montes_claros";
}

export const subscribeToUnits = (callback: (units: JudicialUnit[]) => void): (() => void) => {
  try {
    return onSnapshot(doc(db, getTenantPath('settings'), 'units'), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.units) && data.units.length > 0) {
          callback(data.units);
          return;
        }
      }

      // Fallback for primary cabinet
      if (isPrimaryCabinet(globalTenantId)) {
        try {
          if (globalTenantId !== 'gabinete_default') {
            const defSnap = await getDoc(doc(db, 'gabinetes/gabinete_default/settings', 'units'));
            if (defSnap.exists() && Array.isArray(defSnap.data().units) && defSnap.data().units.length > 0) {
              callback(defSnap.data().units);
              return;
            }
          }
          if (globalTenantId !== 'gab_rafael_machado') {
            const rafSnap = await getDoc(doc(db, 'gabinetes/gab_rafael_machado/settings', 'units'));
            if (rafSnap.exists() && Array.isArray(rafSnap.data().units) && rafSnap.data().units.length > 0) {
              callback(rafSnap.data().units);
              return;
            }
          }
        } catch {}
      }

      callback([]);
    }, (err) => { console.warn("Snapshot error in firestoreUtils:", err); });
  } catch (err) {
    console.error("Error subscribing to units:", err);
    return () => {};
  }
};

export const saveUnitsToDb = async (units: JudicialUnit[]): Promise<void> => {
  try {
    await setDoc(doc(db, getTenantPath('settings'), 'units'), { units, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error("Error saving units:", err);
    throw err;
  }
};

export interface LoggedExecution {
  id: string;
  timestamp: string;
  timeMs: number;
  label: string;
  processNumber?: string;
  model: string;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  costBrl: number;
  userId?: string;
  userName?: string;
  userEmail?: string;
  module?: ExecutionModuleType;
  keyType?: 'native' | 'byok';
  keyLabel?: string;
  tenantId?: string;
  tenantName?: string;
}

export interface ApiUsageStats {
  totalTokens: number;
  totalCostBrl: number;
  currentBalanceBrl: number;
  initialDepositBrl: number;
  lastUpdated: number;
}

/** Remove undefined values recursively so Firestore never throws unsupported field value error */
export function cleanForFirestore<T>(data: T): T {
  if (data === undefined) return null as any;
  return JSON.parse(JSON.stringify(data));
}

export const getPromptsFromDb = async (): Promise<CustomPrompt[]> => {
  if (!auth.currentUser) return [];
  const map = new Map<string, CustomPrompt>();

  const addDocs = (snapDocs: any[]) => {
    snapDocs.forEach(d => {
      const data = d.data();
      if (!data || data.isDeleted) return;
      const actualId = data.id || d.id;
      if (!map.has(actualId)) {
        map.set(actualId, { ...data, id: actualId } as CustomPrompt);
      } else {
        const existing = map.get(actualId)!;
        const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const newTime = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
        if (newTime >= existingTime) {
          map.set(actualId, { ...existing, ...data, id: actualId } as CustomPrompt);
        }
      }
    });
  };

  try {
    const snapshot = await getDocs(collection(db, getTenantPath('prompts')));
    addDocs(snapshot.docs);
  } catch (e) {
    console.warn("Could not fetch tenant prompts:", e);
  }

  // Cross-tenant fallback for primary cabinet
  if (isPrimaryCabinet(globalTenantId)) {
    if (globalTenantId !== 'gabinete_default') {
      try {
        const defSnap = await getDocs(collection(db, 'gabinetes/gabinete_default/prompts'));
        addDocs(defSnap.docs);
      } catch {}
    }
    if (globalTenantId !== 'gab_rafael_machado') {
      try {
        const rafSnap = await getDocs(collection(db, 'gabinetes/gab_rafael_machado/prompts'));
        addDocs(rafSnap.docs);
      } catch {}
    }
    try {
      const rootSnap = await getDocs(collection(db, 'prompts'));
      addDocs(rootSnap.docs);
    } catch {}
  }

  return Array.from(map.values()).filter(p => !p.isDeleted);
};

export const subscribeToPrompts = (callback: (prompts: CustomPrompt[]) => void): (() => void) => {
  if (!auth.currentUser) return () => {};
  try {
    return onSnapshot(collection(db, getTenantPath('prompts')), (snapshot) => {
      const map = new Map<string, CustomPrompt>();
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (!data || data.isDeleted) return;
        const actualId = data.id || d.id;
        if (!map.has(actualId)) {
          map.set(actualId, { ...data, id: actualId } as CustomPrompt);
        } else {
          const existing = map.get(actualId)!;
          const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const newTime = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
          if (newTime >= existingTime) {
            map.set(actualId, { ...existing, ...data, id: actualId } as CustomPrompt);
          }
        }
      });
      callback(Array.from(map.values()).filter(p => !p.isDeleted));
    }, (error) => {
      console.warn("Realtime listener error on prompts:", error);
    });
  } catch (err) {
    console.warn("Could not attach listener for prompts:", err);
    return () => {};
  }
};

export const savePromptToDb = async (prompt: CustomPrompt): Promise<void> => {
  if (!auth.currentUser) return;
  const user = auth.currentUser;
  const unitId = getActiveUnitId();
  const targetUnitId = prompt.unitId || unitId;
  
  const dataToSave = cleanForFirestore({
    ...prompt,
    tenant: globalTenantId,
    unitId: targetUnitId,
    updatedAt: new Date().toISOString(),
    createdBy: prompt.createdBy || user.uid,
    creatorName: prompt.creatorName || user.displayName || user.email?.split('@')[0] || 'Usuário',
    creatorEmail: prompt.creatorEmail || user.email || '',
  });

  // Always save with canonical prompt.id as document ID so all devices load the exact same doc
  const docId = prompt.id;
  await setDoc(doc(db, getTenantPath('prompts'), docId), dataToSave);
};

export const broadcastPromptToTenants = async (prompt: CustomPrompt, targetTenantIds: string[]): Promise<void> => {
  if (!auth.currentUser) return;
  const user = auth.currentUser;
  
  const batchRequests = targetTenantIds.map(async (tId) => {
    const dataToSave = cleanForFirestore({
      ...prompt,
      tenant: tId,
      updatedAt: new Date().toISOString(),
      createdBy: prompt.createdBy || user.uid,
      creatorName: prompt.creatorName || user.displayName || user.email?.split('@')[0] || 'Usuário',
      creatorEmail: prompt.creatorEmail || user.email || '',
    });
    
    // Save to the target tenant's prompts collection, maintaining the same prompt ID
    await setDoc(doc(db, `gabinetes/${tId}/prompts`, prompt.id), dataToSave);
  });
  
  await Promise.all(batchRequests);
};

export const deletePromptFromDb = async (id: string): Promise<void> => {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, getTenantPath('prompts'), id));
  } catch (e) {
    console.warn("Could not delete prompt doc:", e);
  }
};

export const getHistoryFromDb = async (): Promise<SavedAnalysis[]> => {
  if (!auth.currentUser) return [];
  try {
    const map = new Map<string, SavedAnalysis>();
    const currentUnitId = getActiveUnitId();

    const addDocs = (snapDocs: any[]) => {
      snapDocs.forEach(d => {
        const data = d.data();
        const itemUnit = data.unitId || "montes_claros";
        if (itemUnit !== currentUnitId) return;
        if (!map.has(d.id)) {
          map.set(d.id, { id: d.id, ...data } as SavedAnalysis);
        }
      });
    };

    // 1. Fetch from current tenant path: gabinetes/{globalTenantId}/history
    try {
      const snapshot = await getDocs(collection(db, getTenantPath('history')));
      addDocs(snapshot.docs);
    } catch (e) {
      console.warn("Could not fetch tenant history:", e);
    }

    // 2. Cross-fallback for primary cabinet
    if (isPrimaryCabinet(globalTenantId)) {
      if (globalTenantId !== 'gabinete_default') {
        try {
          const defSnap = await getDocs(collection(db, 'gabinetes/gabinete_default/history'));
          addDocs(defSnap.docs);
        } catch {}
      }
      if (globalTenantId !== 'gab_rafael_machado') {
        try {
          const rafSnap = await getDocs(collection(db, 'gabinetes/gab_rafael_machado/history'));
          addDocs(rafSnap.docs);
        } catch {}
      }
      try {
        const rootSnap = await getDocs(collection(db, 'history'));
        addDocs(rootSnap.docs);
      } catch (e) {
        console.warn("Could not fetch root legacy history:", e);
      }
    }

    const all = Array.from(map.values());
    return all.sort((a, b) => (b.date || 0) - (a.date || 0));
  } catch (err) {
    console.warn("Could not fetch history from Firestore:", err);
    return [];
  }
};

export const saveHistoryToDb = async (analysis: SavedAnalysis): Promise<void> => {
  if (!auth.currentUser) return;
  const user = auth.currentUser;
  const unitId = getActiveUnitId();
  const dataToSave: any = cleanForFirestore({
    ...analysis,
    tenant: globalTenantId,
    unitId: analysis.unitId || unitId,
    createdBy: analysis.createdBy || user.uid,
    creatorName: analysis.creatorName || user.displayName || user.email?.split('@')[0] || 'Assessor',
    creatorEmail: analysis.creatorEmail || user.email || '',
  });

  await setDoc(doc(db, getTenantPath('history'), analysis.id), dataToSave);
};

export const updateAnalysisChatAndMinute = async (
  analysisId: string,
  chatMessages: ChatMessage[],
  updatedMinute?: MinuteData,
  versions?: MinuteVersion[]
): Promise<void> => {
  if (!auth.currentUser || !analysisId) return;
  try {
    const docRef = doc(db, getTenantPath('history'), analysisId);
    const existing = await getDoc(docRef);
    if (!existing.exists()) return;

    const currentData = existing.data() as SavedAnalysis;
    const updatePayload: any = cleanForFirestore({
      chatMessages,
    });

    const preservedOriginal = currentData.result?.originalMinute || currentData.originalMinute || currentData.result?.minute;
    const mergedVersions = versions || currentData.result?.versions || currentData.versions || [];

    if (updatedMinute || versions) {
      if (currentData.result) {
        updatePayload.result = {
          ...currentData.result,
          originalMinute: preservedOriginal,
          versions: mergedVersions,
          ...(updatedMinute ? { minute: updatedMinute } : {}),
        };
        if (!currentData.originalMinute && preservedOriginal) {
          updatePayload.originalMinute = preservedOriginal;
        }
        if (mergedVersions.length > 0) {
          updatePayload.versions = mergedVersions;
        }
      }
    }

    await updateDoc(docRef, updatePayload);
  } catch (err) {
    console.warn("Could not update chat in Firestore history:", err);
  }
};

export const updateAnalysisUnitInDb = async (
  analysisId: string,
  unitData: { unitId?: string; judicialUnit?: string; comarca?: string; vara?: string }
): Promise<void> => {
  if (!auth.currentUser || !analysisId) return;
  try {
    const docRef = doc(db, getTenantPath('history'), analysisId);
    const existing = await getDoc(docRef);
    if (!existing.exists()) return;

    const currentData = existing.data() as SavedAnalysis;
    const updatePayload: any = cleanForFirestore({
      ...(unitData.unitId ? { unitId: unitData.unitId } : {}),
      ...(currentData.result
        ? {
            result: {
              ...currentData.result,
              minute: {
                ...currentData.result.minute,
                judicialUnit: unitData.judicialUnit || currentData.result.minute?.judicialUnit,
                comarca: unitData.comarca || currentData.result.minute?.comarca,
                vara: unitData.vara || currentData.result.minute?.vara,
              },
            },
          }
        : {}),
    });

    await updateDoc(docRef, updatePayload);
  } catch (err) {
    console.error("Error updating analysis unit in Firestore:", err);
    throw err;
  }
};

export const updateProcessUnitInDb = async (
  processNumber: string,
  unitData: { unitId: string; judicialUnit: string; comarca?: string; vara?: string }
): Promise<number> => {
  if (!auth.currentUser || !processNumber) return 0;
  try {
    const snapshot = await getDocs(collection(db, getTenantPath('history')));
    const cleanTargetNum = processNumber.replace(/[^\d]/g, '');

    const matchingDocs = snapshot.docs.filter((d) => {
      const data = d.data() as SavedAnalysis;
      const itemNum = (data.processNumber || data.result?.minute?.processNumber || "").replace(/[^\d]/g, '');
      return (cleanTargetNum.length >= 5 && itemNum === cleanTargetNum) || (data.processNumber === processNumber);
    });

    if (matchingDocs.length === 0) return 0;

    await Promise.all(
      matchingDocs.map((d) => {
        const currentData = d.data() as SavedAnalysis;
        const updatePayload: any = cleanForFirestore({
          unitId: unitData.unitId,
          ...(currentData.result
            ? {
                result: {
                  ...currentData.result,
                  minute: {
                    ...currentData.result.minute,
                    judicialUnit: unitData.judicialUnit,
                    comarca: unitData.comarca || currentData.result.minute?.comarca,
                    vara: unitData.vara || currentData.result.minute?.vara,
                  },
                },
              }
            : {}),
        });
        return updateDoc(doc(db, getTenantPath('history'), d.id), updatePayload);
      })
    );

    return matchingDocs.length;
  } catch (err) {
    console.error("Error updating dossier unit in Firestore:", err);
    throw err;
  }
};

export const updateAnalysisCategoryInDb = async (
  analysisId: string,
  categoryData: { promptCategory: string; vara?: string }
): Promise<void> => {
  if (!auth.currentUser || !analysisId) return;
  try {
    const docRef = doc(db, getTenantPath('history'), analysisId);
    const existing = await getDoc(docRef);
    if (!existing.exists()) return;

    const currentData = existing.data() as SavedAnalysis;
    const updatePayload: any = cleanForFirestore({
      promptCategory: categoryData.promptCategory,
      ...(currentData.result
        ? {
            result: {
              ...currentData.result,
              minute: {
                ...currentData.result.minute,
                ...(categoryData.vara ? { vara: categoryData.vara } : {}),
              },
            },
          }
        : {}),
    });

    await updateDoc(docRef, updatePayload);
  } catch (err) {
    console.error("Error updating analysis category in Firestore:", err);
    throw err;
  }
};

export const updateProcessCategoryInDb = async (
  processNumber: string,
  categoryData: { promptCategory: string; vara?: string }
): Promise<number> => {
  if (!auth.currentUser || !processNumber) return 0;
  try {
    const snapshot = await getDocs(collection(db, getTenantPath('history')));
    const cleanTargetNum = processNumber.replace(/[^\d]/g, '');

    const matchingDocs = snapshot.docs.filter((d) => {
      const data = d.data() as SavedAnalysis;
      const itemNum = (data.processNumber || data.result?.minute?.processNumber || "").replace(/[^\d]/g, '');
      return (cleanTargetNum.length >= 5 && itemNum === cleanTargetNum) || (data.processNumber === processNumber);
    });

    if (matchingDocs.length === 0) return 0;

    await Promise.all(
      matchingDocs.map((d) => {
        const currentData = d.data() as SavedAnalysis;
        const updatePayload: any = cleanForFirestore({
          promptCategory: categoryData.promptCategory,
          ...(currentData.result
            ? {
                result: {
                  ...currentData.result,
                  minute: {
                    ...currentData.result.minute,
                    ...(categoryData.vara ? { vara: categoryData.vara } : {}),
                  },
                },
              }
            : {}),
        });
        return updateDoc(doc(db, getTenantPath('history'), d.id), updatePayload);
      })
    );

    return matchingDocs.length;
  } catch (err) {
    console.error("Error updating dossier category in Firestore:", err);
    throw err;
  }
};

export const deleteHistoryFromDb = async (id: string): Promise<void> => {
  if (!auth.currentUser || !id) return;
  const paths = getHistoryCollectionPaths();
  
  const results = await Promise.allSettled(
    paths.map((collPath) => deleteDoc(doc(db, collPath, id)))
  );
  
  const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  if (rejected.length === paths.length) {
    console.error(`Error deleting history doc ${id} from Firestore across all paths:`, rejected[0].reason);
    throw rejected[0].reason;
  }
};

export const deleteDossierFromDb = async (processNumber: string, unitId?: string): Promise<number> => {
  if (!auth.currentUser || !processNumber) return 0;
  try {
    const targetUnit = unitId || getActiveUnitId();
    const cleanTargetNum = processNumber.replace(/[^\d]/g, '');
    const paths = getHistoryCollectionPaths();
    let totalDeleted = 0;

    for (const collPath of paths) {
      try {
        const snapshot = await getDocs(collection(db, collPath));
        const docsToDelete = snapshot.docs.filter((d) => {
          const data = d.data() as SavedAnalysis;
          const itemUnit = data.unitId || "montes_claros";
          if (targetUnit !== "montes_claros" && itemUnit !== targetUnit) return false;
          if (targetUnit === "montes_claros" && itemUnit !== "montes_claros" && !!data.unitId) return false;
          
          const itemNum = (data.processNumber || data.result?.minute?.processNumber || "").replace(/[^\d]/g, '');
          return (cleanTargetNum && itemNum === cleanTargetNum) || (data.processNumber === processNumber);
        });

        if (docsToDelete.length > 0) {
          await Promise.all(docsToDelete.map((d) => deleteDoc(doc(db, collPath, d.id))));
          totalDeleted += docsToDelete.length;
        }
      } catch (collErr) {
        console.warn(`Could not check/delete dossier in ${collPath}:`, collErr);
      }
    }

    return totalDeleted;
  } catch (err) {
    console.error("Error deleting dossier from Firestore:", err);
    throw err;
  }
};

export const getKnowledgeFromDb = async (): Promise<SavedKnowledgeDoc[]> => {
  if (!auth.currentUser) return [];
  const snapshot = await getDocs(collection(db, getTenantPath('knowledge')));
  return snapshot.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data } as SavedKnowledgeDoc;
  }).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
};

export const saveKnowledgeToDb = async (docData: SavedKnowledgeDoc): Promise<void> => {
  if (!auth.currentUser) return;
  const user = auth.currentUser;
  const dataToSave: any = cleanForFirestore({
    ...docData,
    tenant: globalTenantId,
    createdBy: docData.createdBy || user.uid,
    creatorName: docData.creatorName || user.displayName || user.email?.split('@')[0] || 'Usuário',
    creatorEmail: docData.creatorEmail || user.email || '',
  });

  await setDoc(doc(db, getTenantPath('knowledge'), docData.id), dataToSave);
};

export const deleteKnowledgeFromDb = async (id: string): Promise<void> => {
  if (!auth.currentUser) return;
  await deleteDoc(doc(db, getTenantPath('knowledge'), id));
};

function getTesesDocId() {
  const unitId = getActiveUnitId();
  return unitId === "montes_claros" ? "teses" : `teses_${unitId}`;
}

export const getTesesFromDb = async (): Promise<CabinetTesesData | null> => {
  const docId = getTesesDocId();
  try {
    let d = await getDoc(doc(db, getTenantPath('settings'), docId));
    
    // Cross-tenant fallback for primary cabinet
    if ((!d.exists() || !d.data()?.text) && isPrimaryCabinet(globalTenantId)) {
      if (globalTenantId !== 'gabinete_default') {
        const dDef = await getDoc(doc(db, 'gabinetes/gabinete_default/settings', docId));
        if (dDef.exists() && dDef.data()?.text) d = dDef;
      }
      if ((!d.exists() || !d.data()?.text) && globalTenantId !== 'gab_rafael_machado') {
        const dRaf = await getDoc(doc(db, 'gabinetes/gab_rafael_machado/settings', docId));
        if (dRaf.exists() && dRaf.data()?.text) d = dRaf;
      }
      if (!d.exists() || !d.data()?.text) {
        const dRoot = await getDoc(doc(db, 'settings', docId));
        if (dRoot.exists() && dRoot.data()?.text) d = dRoot;
      }
    }

    if (d.exists()) {
      const data = d.data();
      return {
        text: typeof data.text === 'string' ? data.text : (isPrimaryCabinet(globalTenantId) ? DEFAULT_CABINET_TESES : ''),
        isEnabled: data.isEnabled ?? true,
        updatedAt: data.updatedAt || new Date().toISOString(),
        updatedBy: data.updatedBy,
        updatedByName: data.updatedByName,
        title: data.title || 'Caderno de Teses do Gabinete'
      };
    }
  } catch (err) {
    console.warn("Could not fetch teses from DB:", err);
  }
  return null;
};

export const subscribeToCabinetTeses = (callback: (data: CabinetTesesData) => void): (() => void) => {
  try {
    return onSnapshot(doc(db, getTenantPath('settings'), getTesesDocId()), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          text: typeof data.text === 'string' ? data.text : (isPrimaryCabinet(globalTenantId) ? DEFAULT_CABINET_TESES : ''),
          isEnabled: data.isEnabled ?? true,
          updatedAt: data.updatedAt || new Date().toISOString(),
          updatedBy: data.updatedBy,
          updatedByName: data.updatedByName,
          title: data.title || 'Caderno de Teses do Gabinete'
        });
      }
    }, (error) => {
      console.warn("Realtime listener error on cabinet teses:", error);
    });
  } catch (err) {
    console.warn("Could not attach listener for cabinet teses:", err);
    return () => {};
  }
};

export const saveTesesToDb = async (data: CabinetTesesData): Promise<void> => {
  const user = auth.currentUser;
  await setDoc(doc(db, getTenantPath('settings'), getTesesDocId()), cleanForFirestore({
    tenant: globalTenantId,
    text: data.text,
    isEnabled: data.isEnabled ?? true,
    updatedAt: new Date().toISOString(),
    updatedBy: user?.uid || 'system',
    updatedByName: user?.displayName || user?.email?.split('@')[0] || 'Gabinete',
    title: data.title || 'Caderno de Teses do Gabinete'
  }));
};

function getParadigmsDocId() {
  const unitId = getActiveUnitId();
  return unitId === "montes_claros" ? "judge_paradigms" : `judge_paradigms_${unitId}`;
}

export const getParadigmsFromDb = async (): Promise<JudgeParadigmModel[] | null> => {
  const docId = getParadigmsDocId();
  try {
    let d = await getDoc(doc(db, getTenantPath('settings'), docId));

    // Cross-tenant fallback for primary cabinet
    if ((!d.exists() || !Array.isArray(d.data()?.paradigms) || d.data()?.paradigms.length === 0) && isPrimaryCabinet(globalTenantId)) {
      if (globalTenantId !== 'gabinete_default') {
        const dDef = await getDoc(doc(db, 'gabinetes/gabinete_default/settings', docId));
        if (dDef.exists() && Array.isArray(dDef.data()?.paradigms) && dDef.data()?.paradigms.length > 0) d = dDef;
      }
      if ((!d.exists() || !Array.isArray(d.data()?.paradigms) || d.data()?.paradigms.length === 0) && globalTenantId !== 'gab_rafael_machado') {
        const dRaf = await getDoc(doc(db, 'gabinetes/gab_rafael_machado/settings', docId));
        if (dRaf.exists() && Array.isArray(dRaf.data()?.paradigms) && dRaf.data()?.paradigms.length > 0) d = dRaf;
      }
      if (!d.exists() || !Array.isArray(d.data()?.paradigms) || d.data()?.paradigms.length === 0) {
        const dRoot = await getDoc(doc(db, 'settings', docId));
        if (dRoot.exists() && Array.isArray(dRoot.data()?.paradigms) && dRoot.data()?.paradigms.length > 0) d = dRoot;
      }
    }

    if (d.exists()) {
      const data = d.data();
      if (Array.isArray(data.paradigms)) {
        return data.paradigms as JudgeParadigmModel[];
      }
    }
  } catch (err) {
    console.warn("Could not fetch judge paradigms from DB:", err);
  }
  return null;
};

export const subscribeToJudgeParadigms = (callback: (paradigms: JudgeParadigmModel[]) => void): (() => void) => {
  try {
    return onSnapshot(doc(db, getTenantPath('settings'), getParadigmsDocId()), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.paradigms)) {
          callback(data.paradigms as JudgeParadigmModel[]);
        }
      }
    }, (error) => {
      console.warn("Realtime listener error on judge paradigms:", error);
    });
  } catch (err) {
    console.warn("Could not attach listener for judge paradigms:", err);
    return () => {};
  }
};

export const saveParadigmsToDb = async (paradigms: JudgeParadigmModel[]): Promise<void> => {
  const user = auth.currentUser;
  const docId = getParadigmsDocId();
  const payload = cleanForFirestore({
    tenant: globalTenantId,
    paradigms,
    updatedAt: new Date().toISOString(),
    updatedBy: user?.uid || 'system',
    updatedByName: user?.displayName || user?.email?.split('@')[0] || 'Gabinete',
  });

  // 1. Gravação principal no caminho multi-tenant do gabinete
  try {
    await setDoc(doc(db, getTenantPath('settings'), docId), payload);
  } catch (err) {
    console.warn("Could not save paradigms to tenant DB path:", err);
  }

  // 2. Gravação de contingência e sincronização de fallback para Gabinete Principal e aliases
  if (isPrimaryCabinet(globalTenantId)) {
    try {
      await setDoc(doc(db, 'settings', docId), payload, { merge: true });
    } catch (e) {
      console.warn("Could not sync paradigms to root settings fallback:", e);
    }
    const primaryAliases = ['gabinete_default', 'gab_rafael_machado'];
    for (const pAlias of primaryAliases) {
      if (pAlias !== globalTenantId) {
        try {
          await setDoc(doc(db, `gabinetes/${pAlias}/settings`, docId), payload, { merge: true });
        } catch (e) {
          // ignora caso o alias não tenha permissão direta
        }
      }
    }
  }
};

function getProjudiGuideDocId() {
  const unitId = getActiveUnitId();
  return unitId === "montes_claros" ? "projudiGuide" : `projudiGuide_${unitId}`;
}

export const getProjudiGuideFromDb = async (): Promise<ProjudiGuideData | null> => {
  const docId = getProjudiGuideDocId();
  try {
    let d = await getDoc(doc(db, getTenantPath('settings'), docId));

    // Cross-tenant fallback for primary cabinet
    if ((!d.exists() || !d.data()?.text) && isPrimaryCabinet(globalTenantId)) {
      if (globalTenantId !== 'gabinete_default') {
        const dDef = await getDoc(doc(db, 'gabinetes/gabinete_default/settings', docId));
        if (dDef.exists() && dDef.data()?.text) d = dDef;
      }
      if ((!d.exists() || !d.data()?.text) && globalTenantId !== 'gab_rafael_machado') {
        const dRaf = await getDoc(doc(db, 'gabinetes/gab_rafael_machado/settings', docId));
        if (dRaf.exists() && dRaf.data()?.text) d = dRaf;
      }
      if (!d.exists() || !d.data()?.text) {
        const dRoot = await getDoc(doc(db, 'settings', docId));
        if (dRoot.exists() && dRoot.data()?.text) d = dRoot;
      }
    }

    if (d.exists()) {
      const data = d.data();
      return {
        text: typeof data.text === 'string' ? data.text : (isPrimaryCabinet(globalTenantId) ? DEFAULT_PROJUDI_GUIDE : ''),
        updatedAt: data.updatedAt || new Date().toISOString(),
        updatedBy: data.updatedBy,
        updatedByName: data.updatedByName,
        title: data.title || 'Guia Rápido de Lançamentos no PROJUDI'
      };
    }
  } catch (err) {
    console.warn("Could not fetch Projudi guide from DB:", err);
  }
  return null;
};

export const subscribeToProjudiGuide = (callback: (data: ProjudiGuideData) => void): (() => void) => {
  try {
    return onSnapshot(doc(db, getTenantPath('settings'), getProjudiGuideDocId()), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          text: typeof data.text === 'string' ? data.text : (isPrimaryCabinet(globalTenantId) ? DEFAULT_PROJUDI_GUIDE : ''),
          updatedAt: data.updatedAt || new Date().toISOString(),
          updatedBy: data.updatedBy,
          updatedByName: data.updatedByName,
          title: data.title || 'Guia Rápido de Lançamentos no PROJUDI'
        });
      }
    }, (error) => {
      console.warn("Realtime listener error on Projudi guide:", error);
    });
  } catch (err) {
    console.warn("Could not attach listener for Projudi guide:", err);
    return () => {};
  }
};

export const saveProjudiGuideToDb = async (data: ProjudiGuideData): Promise<void> => {
  const user = auth.currentUser;
  await setDoc(doc(db, getTenantPath('settings'), getProjudiGuideDocId()), cleanForFirestore({
    tenant: globalTenantId,
    text: data.text,
    updatedAt: new Date().toISOString(),
    updatedBy: user?.uid || 'system',
    updatedByName: user?.displayName || user?.email?.split('@')[0] || 'Gabinete',
    title: data.title || 'Guia Rápido de Lançamentos no PROJUDI'
  }));
};

/* ========================================================================== */
/*           AGENDA COMPARTILHADA DO GABINETE / GOOGLE CALENDAR               */
/* ========================================================================== */

const CABINET_CALENDAR_DOC = 'cabinet_calendar';

export const getCabinetCalendarSettings = async (): Promise<CabinetCalendarSettings | null> => {
  try {
    const d = await getDoc(doc(db, getTenantPath('settings'), CABINET_CALENDAR_DOC));
    if (d.exists()) {
      return d.data() as CabinetCalendarSettings;
    }
  } catch (err) {
    console.warn("Could not fetch cabinet calendar from DB:", err);
  }
  return null;
};

export const subscribeToCabinetCalendarSettings = (callback: (settings: CabinetCalendarSettings | null) => void): (() => void) => {
  try {
    return onSnapshot(doc(db, getTenantPath('settings'), CABINET_CALENDAR_DOC), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as CabinetCalendarSettings);
      } else {
        callback(null);
      }
    }, (error) => {
      console.warn("Realtime listener error on cabinet calendar:", error);
    });
  } catch (err) {
    console.warn("Could not attach listener for cabinet calendar:", err);
    return () => {};
  }
};

export const saveCabinetCalendarSettings = async (settings: CabinetCalendarSettings): Promise<void> => {
  const user = auth.currentUser;
  
  await setDoc(doc(db, getTenantPath('settings'), CABINET_CALENDAR_DOC), cleanForFirestore({
    tenant: globalTenantId,
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: user?.uid || 'system',
    updatedByName: user?.displayName || user?.email?.split('@')[0] || 'Magistrado',
  }));
};

// API Usage Tracking and Auto-Calculation
export const saveUsageLogToDb = async (log: LoggedExecution): Promise<void> => {
  if (!auth.currentUser) return;
  const user = auth.currentUser;
  const dataToSave = cleanForFirestore({
    ...log,
    tenant: globalTenantId,
    userId: log.userId || user.uid,
    userName: log.userName || user.displayName || user.email?.split('@')[0] || 'Assessor',
    userEmail: log.userEmail || user.email || '',
  });
  await setDoc(doc(db, getTenantPath('usageLogs'), log.id), dataToSave);
};

export const getUsageLogsFromDb = async (): Promise<LoggedExecution[]> => {
  if (!auth.currentUser) return [];
  try {
    const snapshot = await getDocs(collection(db, getTenantPath('usageLogs')));
    return snapshot.docs.map(d => {
      const data = d.data();
      return { id: d.id, ...data } as LoggedExecution;
    }).sort((a, b) => (b.timeMs || 0) - (a.timeMs || 0));
  } catch (err) {
    console.warn("Could not load usage logs from DB:", err);
    return [];
  }
};

export const getAllTenantsUsageLogs = async (limitCount = 100): Promise<LoggedExecution[]> => {
  try {
    const allLogs: LoggedExecution[] = [];
    const tSnap = await getDocs(collection(db, 'tenants'));
    const tIds = new Set<string>(['gabinete_default', 'gabinete_tjgo_1', 'gabinete_1vara_civel']);
    tSnap.forEach(d => tIds.add(d.id));

    for (const tId of tIds) {
      try {
        const snap = await getDocs(collection(db, 'gabinetes', tId, 'usageLogs'));
        snap.forEach(d => {
          allLogs.push({ id: d.id, tenantId: tId, ...d.data() } as LoggedExecution);
        });
      } catch {}
    }

    // Incorporar histórico do servidor
    try {
      const srvRes = await fetch('/api/telemetry/server-history');
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        if (srvData.success && Array.isArray(srvData.items)) {
          for (const item of srvData.items) {
            const pTokens = item.promptTokenCount || 0;
            const cTokens = item.candidatesTokenCount || 0;
            const tTokens = item.totalTokenCount || (pTokens + cTokens);
            const cost = calculateTokenCostBRL(pTokens, cTokens, tTokens).brlTotal;
            allLogs.push({
              id: item.id || `srv-${item.date || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              timestamp: item.date ? new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString(),
              timeMs: item.date ? new Date(item.date).getTime() : Date.now(),
              label: item.type === 'hearing' ? 'Mesa de Audiência' : (item.promptId ? `Minuta: ${item.promptId}` : 'Operação IA'),
              processNumber: item.processNumber || 'Processo TJGO',
              model: item.model || 'Gemini Flash',
              promptTokens: pTokens,
              outputTokens: cTokens,
              totalTokens: tTokens,
              costBrl: cost,
              userId: item.userId || 'system',
              userName: item.userName || 'Assessor',
              userEmail: item.userEmail || '',
              module: item.type === 'hearing' ? 'audiencia' : 'minuta',
              keyType: item.wasRotated ? 'byok' : 'native',
              keyLabel: item.wasRotated ? 'Pool BYOK (Rotacionada)' : 'Chave Nativa Corporativa',
              tenantId: item.tenantId || 'gabinete_default'
            });
          }
        }
      }
    } catch {}

    const seen = new Set<string>();
    const uniqueLogs: LoggedExecution[] = [];
    allLogs.sort((a, b) => (b.timeMs || 0) - (a.timeMs || 0));

    for (const l of allLogs) {
      if (!seen.has(l.id)) {
        seen.add(l.id);
        uniqueLogs.push(l);
        if (uniqueLogs.length >= limitCount) break;
      }
    }

    return uniqueLogs;
  } catch (err) {
    console.warn("Could not load all tenants usage logs:", err);
    return [];
  }
};

export const getApiUsageStatsFromDb = async (): Promise<ApiUsageStats | null> => {
  if (!auth.currentUser) return null;
  try {
    const d = await getDoc(doc(db, getTenantPath('settings'), 'apiUsage'));
    if (d.exists()) {
      return d.data() as ApiUsageStats;
    }
  } catch (err) {
    console.warn("Could not get API usage stats:", err);
  }
  return null;
};

export const saveApiUsageStatsToDb = async (stats: ApiUsageStats): Promise<void> => {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, getTenantPath('settings'), 'apiUsage'), cleanForFirestore({
      ...stats,
      tenant: globalTenantId,
      lastUpdated: Date.now(),
    }));
  } catch (err) {
    console.warn("Could not save API usage stats:", err);
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const d = await getDoc(doc(db, 'users', uid));
  if (d.exists()) {
    return d.data() as UserProfile;
  }
  return null;
};

export const syncUserProfile = async (user: any): Promise<UserProfile> => {
  let profile = await getUserProfile(user.uid);
  const userEmail = (user.email || '').toLowerCase().trim();
  
  // Master admin and titular judge default flags
  const isFirstAdmin = userEmail === 'fabriciocunha.adv@gmail.com';
  const isJudgeAccount = userEmail === 'repeteco@gmail.com';
  const isFazendaNovaAdmin = userEmail === 'fabriciocunha.fazendanova@gmail.com';

  let shouldUpdate = false;
  let targetTenantId = profile?.tenantId && profile.tenantId !== 'unassigned' && profile.tenantId !== 'unauthorized' ? profile.tenantId : undefined;
  let targetRole = profile?.role || 'user';

  // If this is a completely brand new profile or has no tenantId assigned yet
  if (!profile || !targetTenantId) {
    if (isFirstAdmin || isJudgeAccount || isFazendaNovaAdmin) {
      targetTenantId = targetTenantId || 'gab_rafael_machado';
      targetRole = 'admin';
      shouldUpdate = true;
    } else {
      // 1. Look up active invites in Firestore
      try {
        const invitesRef = collection(db, 'invites');
        const inviteDoc = await getDoc(doc(invitesRef, userEmail));
        if (inviteDoc.exists()) {
          const invData = inviteDoc.data();
          if (invData.tenantId && invData.tenantId !== 'unassigned') {
            targetTenantId = invData.tenantId;
            targetRole = invData.role || targetRole;
            shouldUpdate = true;
            try {
              await deleteDoc(doc(invitesRef, userEmail));
            } catch (err) {
              console.warn("Notice: could not delete consumed invite", err);
            }
          }
        }
      } catch (e) {
        console.warn("Notice: could not verify invites doc:", e);
      }

      // 2. Check if user is owner of any registered SaaS tenant
      if (!targetTenantId) {
        try {
          const tenantsRef = collection(db, 'tenants');
          const q = query(tenantsRef, where('ownerEmail', '==', userEmail));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            targetTenantId = snapshot.docs[0].id;
            targetRole = 'admin';
            shouldUpdate = true;
          }
        } catch (e) {
          console.warn("Notice: could not verify tenant ownership:", e);
        }
      }

      // 3. STRICT INVITE-ONLY POLICY: If user has no active invite and is not a registered tenant owner,
      // DO NOT create user profile in Firestore and DO NOT assign to any cabinet automatically!
      if (!targetTenantId) {
        const unauthorizedProfile: UserProfile = {
          uid: user.uid,
          email: userEmail,
          name: user.displayName || (userEmail ? userEmail.split('@')[0] : 'Usuário'),
          role: 'user',
          isActive: false,
          createdAt: Date.now(),
          completedTours: [],
          canUseNativeKey: false,
          tenantId: 'unassigned',
          isUnauthorized: true
        };
        setGlobalTenantId('unassigned');
        return unauthorizedProfile;
      }
    }
  }

  if (!profile) {
    profile = {
      uid: user.uid,
      email: user.email || '',
      name: user.displayName || (isJudgeAccount ? 'Dr. Rafael Machado de Souza' : isFirstAdmin ? 'Fabricio Alves da Cunha' : user.email?.split('@')[0] || 'Usuário'),
      role: (isFirstAdmin || isJudgeAccount) ? 'admin' : targetRole,
      isActive: true,
      createdAt: Date.now(),
      completedTours: [],
      canUseNativeKey: isFirstAdmin,
      tenantId: targetTenantId,
      isJudge: isJudgeAccount
    };
    await setDoc(doc(db, 'users', user.uid), cleanForFirestore(profile));
  } else {
    // If profile already exists, preserve all custom fields and tenantId assigned
    if (profile.isActive === undefined) {
      profile.isActive = true;
      shouldUpdate = true;
    }
    if (isFirstAdmin && profile.role !== 'admin') {
      profile.role = 'admin';
      shouldUpdate = true;
    }
    if (isJudgeAccount && !profile.isJudge) {
      profile.isJudge = true;
      profile.role = 'admin';
      shouldUpdate = true;
    }
    if (!profile.tenantId && targetTenantId) {
      profile.tenantId = targetTenantId;
      shouldUpdate = true;
    }
    if (shouldUpdate && targetTenantId) {
      profile.tenantId = profile.tenantId || targetTenantId;
      profile.role = profile.role || (isFirstAdmin ? 'admin' : targetRole);
      await setDoc(doc(db, 'users', user.uid), cleanForFirestore(profile), { merge: true });
    }
  }
  
  // Update globalTenantId to guarantee it is set before any queries are fired
  setGlobalTenantId(profile.tenantId || 'unassigned');
  
  return profile;
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  if (!auth.currentUser) return [];
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const currentEmail = (auth.currentUser?.email || '').toLowerCase().trim();
    
    const userMap = new Map<string, UserProfile>();
    const ghostDocsToDelete: string[] = [];

    snapshot.docs.forEach(d => {
      const data = d.data() as UserProfile;
      const docId = d.id;
      const email = (data.email || (docId.includes('@') ? docId : '')).toLowerCase().trim();
      const uid = data.uid || docId;
      const isJudgeAccount = email === 'repeteco@gmail.com';
      const isFirstAdmin = email === 'fabriciocunha.adv@gmail.com';

      const profile: UserProfile = {
        ...data,
        uid,
        email: data.email || (docId.includes('@') ? docId : ''),
        name: data.name || (isJudgeAccount ? 'Dr. Rafael Machado de Souza' : isFirstAdmin ? 'Fabricio Alves da Cunha' : (email ? email.split('@')[0] : 'Assessor')),
        role: data.role || (isJudgeAccount || isFirstAdmin ? 'admin' : 'user'),
        isActive: data.isActive !== false,
        isJudge: data.isJudge !== undefined ? data.isJudge : isJudgeAccount,
        judgeTitle: data.judgeTitle || (isJudgeAccount ? 'Magistrado Titular' : undefined),
        tenantId: data.tenantId || 'gabinete_default'
      };

      const key = email || uid;
      if (!userMap.has(key)) {
        userMap.set(key, profile);
      } else {
        const existing = userMap.get(key)!;
        const isDocIdEmail = docId.includes('@');
        const isExistingIdEmail = existing.uid.includes('@');

        const existingTime = typeof existing.updatedAt === 'number' ? existing.updatedAt : (existing.updatedAt ? new Date(existing.updatedAt).getTime() : (existing.createdAt || 0));
        const profileTime = typeof profile.updatedAt === 'number' ? profile.updatedAt : (profile.updatedAt ? new Date(profile.updatedAt).getTime() : (profile.createdAt || 0));

        const newest = profileTime >= existingTime ? profile : existing;
        const oldest = profileTime >= existingTime ? existing : profile;
        const realUid = !docId.includes('@') ? docId : (existing.uid && !existing.uid.includes('@') ? existing.uid : (profile.uid || docId));

        const merged: UserProfile = {
          ...oldest,
          ...newest,
          uid: realUid,
          email: email || existing.email || profile.email,
          name: newest.name || oldest.name,
          role: newest.role || oldest.role || (isJudgeAccount || isFirstAdmin ? 'admin' : 'user'),
          isActive: newest.isActive !== undefined ? newest.isActive : (oldest.isActive !== undefined ? oldest.isActive : true),
          isJudge: newest.isJudge !== undefined ? newest.isJudge : (oldest.isJudge !== undefined ? oldest.isJudge : isJudgeAccount),
          judgeTitle: newest.judgeTitle || oldest.judgeTitle || (isJudgeAccount ? 'Magistrado Titular' : undefined),
          canUseNativeKey: newest.canUseNativeKey !== undefined ? newest.canUseNativeKey : oldest.canUseNativeKey,
          allowedUnits: newest.allowedUnits || oldest.allowedUnits,
          tenantId: (newest.tenantId && newest.tenantId !== 'gabinete_default' && newest.tenantId !== 'unassigned')
            ? newest.tenantId
            : (oldest.tenantId || newest.tenantId || 'gabinete_default')
        };

        userMap.set(key, merged);

        if (isExistingIdEmail && !isDocIdEmail) {
          ghostDocsToDelete.push(existing.uid);
        } else if (!isExistingIdEmail && isDocIdEmail) {
          ghostDocsToDelete.push(docId);
        }
      }
    });

    if (ghostDocsToDelete.length > 0) {
      ghostDocsToDelete.forEach(ghostId => {
        deleteDoc(doc(db, 'users', ghostId)).catch(() => {});
      });
    }

    const allUsers = Array.from(userMap.values());

    const currentTenant = globalTenantId || 'gabinete_default';
    const isCurrentPrimary = isPrimaryCabinet(currentTenant);

    // If in the primary / Dr. Rafael cabinet, include all primary cabinet users
    let filtered: UserProfile[] = allUsers.filter(u => {
      if (isCurrentPrimary) {
        return isPrimaryCabinet(u.tenantId);
      }
      return u.tenantId === currentTenant;
    });

    // Ensure Dr. Rafael Machado de Souza is always present in the primary cabinet team
    if (isCurrentPrimary) {
      const hasJudge = filtered.some(u => (u.email || '').toLowerCase().trim() === 'repeteco@gmail.com' || u.isJudge);
      if (!hasJudge) {
        const judgeFromAll = allUsers.find(u => (u.email || '').toLowerCase().trim() === 'repeteco@gmail.com');
        if (judgeFromAll) {
          filtered.push({
            ...judgeFromAll,
            name: judgeFromAll.name || 'Dr. Rafael Machado de Souza',
            isJudge: true,
            judgeTitle: judgeFromAll.judgeTitle || 'Magistrado Titular',
            role: 'admin',
            tenantId: 'gabinete_default'
          });
        } else {
          const defaultJudge: UserProfile = {
            uid: 'judge_rafael_machado',
            email: 'repeteco@gmail.com',
            name: 'Dr. Rafael Machado de Souza',
            role: 'admin',
            isActive: true,
            createdAt: Date.now(),
            completedTours: [],
            canUseNativeKey: true,
            tenantId: 'gabinete_default',
            isJudge: true,
            judgeTitle: 'Magistrado Titular',
            allowedUnits: ['montes_claros', 'fazenda_nova']
          };
          filtered.push(defaultJudge);

          // Proactively persist in Firestore
          try {
            setDoc(doc(db, 'users', defaultJudge.uid), cleanForFirestore(defaultJudge as any), { merge: true }).catch(() => {});
          } catch {}
        }
      }
    }

    // Sort: Judge first, then Admins, then Active users, then alphabetically by name
    return filtered.sort((a, b) => {
      if (a.isJudge && !b.isJudge) return -1;
      if (!a.isJudge && b.isJudge) return 1;
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (a.role !== 'admin' && b.role === 'admin') return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  } catch (err) {
    console.error("Erro ao buscar usuários do Firestore:", err);
    return [];
  }
};

export const updateUserNativeKeyAccess = async (uid: string, canUseNativeKey: boolean, email?: string): Promise<void> => {
  if (!auth.currentUser) return;
  const updateData = { canUseNativeKey, updatedAt: new Date().toISOString() };
  if (uid) {
    try {
      await setDoc(doc(db, 'users', uid), updateData, { merge: true });
    } catch (e) {
      console.warn("Could not update native key access for uid:", uid, e);
    }
  }
  const targetEmail = (email || (uid.includes('@') ? uid : '')).trim().toLowerCase();
  if (targetEmail) {
    try {
      if (targetEmail !== uid) {
        await setDoc(doc(db, 'users', targetEmail), updateData, { merge: true });
      }
      const q = query(collection(db, 'users'), where('email', '==', targetEmail));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (d.id !== uid && d.id !== targetEmail) {
          await setDoc(doc(db, 'users', d.id), updateData, { merge: true });
        }
      }
    } catch (e) {
      console.warn("Could not sync native key access by email:", e);
    }
  }
};

export const updateUserUnits = async (uid: string, allowedUnits: string[], email?: string): Promise<void> => {
  if (!auth.currentUser) return;
  const updateData = { allowedUnits, updatedAt: new Date().toISOString() };
  if (uid) {
    try {
      await setDoc(doc(db, 'users', uid), updateData, { merge: true });
    } catch (e) {
      console.warn("Could not update units for uid:", uid, e);
    }
  }
  const targetEmail = (email || (uid.includes('@') ? uid : '')).trim().toLowerCase();
  if (targetEmail) {
    try {
      if (targetEmail !== uid) {
        await setDoc(doc(db, 'users', targetEmail), updateData, { merge: true });
      }
      const q = query(collection(db, 'users'), where('email', '==', targetEmail));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (d.id !== uid && d.id !== targetEmail) {
          await setDoc(doc(db, 'users', d.id), updateData, { merge: true });
        }
      }
    } catch (e) {
      console.warn("Could not sync units by email:", e);
    }
  }
};

export const updateUserTours = async (uid: string, completedTours: string[]): Promise<void> => {
  if (!auth.currentUser) return;
  await setDoc(doc(db, 'users', uid), { completedTours, updatedAt: new Date().toISOString() }, { merge: true });
};

export const updateUserRole = async (uid: string, role: UserRole, email?: string): Promise<void> => {
  if (!auth.currentUser) return;
  const updateData = { role, updatedAt: new Date().toISOString() };
  
  if (uid) {
    try {
      await setDoc(doc(db, 'users', uid), updateData, { merge: true });
    } catch (e) {
      console.warn("Could not update role for uid:", uid, e);
    }
  }

  const targetEmail = (email || (uid.includes('@') ? uid : '')).trim().toLowerCase();
  if (targetEmail) {
    try {
      if (targetEmail !== uid) {
        await setDoc(doc(db, 'users', targetEmail), updateData, { merge: true });
      }
      const q = query(collection(db, 'users'), where('email', '==', targetEmail));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (d.id !== uid && d.id !== targetEmail) {
          await setDoc(doc(db, 'users', d.id), updateData, { merge: true });
        }
      }
    } catch (e) {
      console.warn("Could not sync role across email query:", e);
    }

    try {
      const inviteRef = doc(db, 'invites', targetEmail);
      const invSnap = await getDoc(inviteRef);
      if (invSnap.exists()) {
        await setDoc(inviteRef, { role, updatedAt: Date.now() }, { merge: true });
      }
    } catch (_) {}
  }
};

export const updateUserStatus = async (uid: string, isActive: boolean, email?: string): Promise<void> => {
  if (!auth.currentUser) return;
  const updateData = { isActive, isUnauthorized: !isActive, updatedAt: new Date().toISOString() };
  
  if (uid) {
    try {
      await setDoc(doc(db, 'users', uid), updateData, { merge: true });
    } catch (e) {
      console.warn("Could not update status for uid:", uid, e);
    }
  }

  const targetEmail = (email || (uid.includes('@') ? uid : '')).trim().toLowerCase();
  if (targetEmail) {
    try {
      if (targetEmail !== uid) {
        await setDoc(doc(db, 'users', targetEmail), updateData, { merge: true });
      }
      const q = query(collection(db, 'users'), where('email', '==', targetEmail));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (d.id !== uid && d.id !== targetEmail) {
          await setDoc(doc(db, 'users', d.id), updateData, { merge: true });
        }
      }
    } catch (e) {
      console.warn("Could not sync status across email query:", e);
    }
  }
};

export const removeUserFromTenant = async (uid: string, email?: string): Promise<void> => {
  if (!auth.currentUser) return;
  // Detach user and deactivate
  await setDoc(doc(db, 'users', uid), { 
    tenantId: 'unassigned', 
    role: 'user', 
    isActive: false, 
    updatedAt: new Date().toISOString() 
  }, { merge: true });

  if (email) {
    const emailLower = email.trim().toLowerCase();
    try {
      await deleteDoc(doc(db, 'invites', emailLower));
    } catch (err) {
      console.warn("Could not delete invite doc:", err);
    }
  }
};

export const deleteUserPermanently = async (uid: string, email?: string): Promise<void> => {
  if (!auth.currentUser) return;
  if (uid) {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      console.warn("Could not delete user doc from Firestore:", err);
    }
  }

  if (email) {
    const emailLower = email.trim().toLowerCase();
    if (emailLower !== uid) {
      try {
        await deleteDoc(doc(db, 'users', emailLower));
      } catch {}
    }
    try {
      await deleteDoc(doc(db, 'invites', emailLower));
    } catch (err) {
      console.warn("Could not delete invite doc:", err);
    }
  }
};

export const updateUserJudgeStatus = async (uid: string, isJudge: boolean, judgeTitle?: string, email?: string): Promise<void> => {
  if (!auth.currentUser) return;
  const updatePayload: any = { isJudge, updatedAt: new Date().toISOString() };
  if (judgeTitle !== undefined) {
    updatePayload.judgeTitle = judgeTitle;
  }
  if (uid) {
    try {
      await setDoc(doc(db, 'users', uid), updatePayload, { merge: true });
    } catch (e) {
      console.warn("Could not update judge status for uid:", uid, e);
    }
  }

  const targetEmail = (email || (uid.includes('@') ? uid : '')).trim().toLowerCase();
  if (targetEmail) {
    try {
      if (targetEmail !== uid) {
        await setDoc(doc(db, 'users', targetEmail), updatePayload, { merge: true });
      }
      const q = query(collection(db, 'users'), where('email', '==', targetEmail));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (d.id !== uid && d.id !== targetEmail) {
          await setDoc(doc(db, 'users', d.id), updatePayload, { merge: true });
        }
      }
    } catch (e) {
      console.warn("Could not sync judge status by email:", e);
    }
  }
};

export const saveUserApiKeyToDb = async (
  uid: string,
  apiKey: string,
  extra?: { customApiKeys?: any[]; isCustomKeyActive?: boolean; activeKeyId?: string }
): Promise<void> => {
  if (!auth.currentUser) return;
  try {
    const updateData: any = {
      customApiKey: apiKey.trim(),
      updatedAt: new Date().toISOString(),
    };
    if (extra?.customApiKeys !== undefined) {
      updateData.customApiKeys = extra.customApiKeys;
    }
    if (extra?.isCustomKeyActive !== undefined) {
      updateData.isCustomKeyActive = extra.isCustomKeyActive;
    }
    if (extra?.activeKeyId !== undefined) {
      updateData.activeKeyId = extra.activeKeyId;
    }
    await setDoc(doc(db, 'users', uid), updateData, { merge: true });
  } catch (err) {
    console.warn("Could not save user API key to Firestore:", err);
  }
};

export const updateUserApiKeySettingsInDb = async (
  uid: string,
  data: {
    customApiKey?: string;
    customApiKeys?: any[];
    isCustomKeyActive?: boolean;
    activeKeyId?: string;
  }
): Promise<void> => {
  if (!auth.currentUser) return;
  try {
    const keys = data.customApiKeys || [];
    const activeKey = data.customApiKey || '';
    const activeItem = keys.find((k: any) => k.key === activeKey || k.id === data.activeKeyId);
    const snippet = activeKey ? `...${activeKey.slice(-4)}` : '';
    const label = activeItem?.label || (keys.length > 0 ? (keys[0].label || 'Chave 1') : 'Sem chave');

    const userRef = doc(db, 'users', uid);
    let existingTelem: any = {};
    try {
      const uSnap = await getDoc(userRef);
      if (uSnap.exists()) {
        existingTelem = uSnap.data().keyTelemetry || {};
      }
    } catch (_) {}

    const updateData: any = {
      ...data,
      updatedAt: new Date().toISOString(),
      keyTelemetry: {
        ...existingTelem,
        poolSize: keys.length,
        activeKeyLabel: label,
        activeKeySnippet: snippet,
        keyMode: 'custom'
      }
    };

    await setDoc(
      userRef,
      cleanForFirestore(updateData),
      { merge: true }
    );
  } catch (err) {
    console.warn("Could not update user API key settings in Firestore:", err);
  }
};

export const removeUserApiKeyFromDb = async (uid: string): Promise<void> => {
  if (!auth.currentUser) return;
  try {
    await setDoc(
      doc(db, 'users', uid),
      cleanForFirestore({
        customApiKey: "",
        customApiKeys: [],
        isCustomKeyActive: false,
        activeKeyId: "",
        updatedAt: new Date().toISOString(),
        keyTelemetry: {
          poolSize: 0,
          activeKeyLabel: 'Sem chave',
          activeKeySnippet: '',
          keyMode: 'custom'
        }
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn("Could not remove user API key settings from Firestore:", err);
  }
};

// System Broadcasts & Live Multi-User Notifications
export const getSystemBroadcastFromDb = async (): Promise<SystemBroadcast | null> => {
  try {
    const d = await getDoc(doc(db, getTenantPath('settings'), 'broadcast'));
    if (d.exists()) {
      return d.data() as SystemBroadcast;
    }
  } catch (err) {
    console.warn("Could not get system broadcast:", err);
  }
  return null;
};

export const saveSystemBroadcastToDb = async (broadcast: SystemBroadcast): Promise<void> => {
  if (!auth.currentUser) return;
  const user = auth.currentUser;
  try {
    await setDoc(doc(db, getTenantPath('settings'), 'broadcast'), cleanForFirestore({
      ...broadcast,
      tenant: globalTenantId,
      createdAt: Date.now(),
      completedTours: [],
      createdBy: user.uid,
      createdByName: user.displayName || user.email?.split('@')[0] || 'Administrador',
    }));
  } catch (err) {
    console.warn("Could not save system broadcast:", err);
    throw err;
  }
};

export const subscribeToSystemBroadcast = (callback: (broadcast: SystemBroadcast | null) => void) => {
  try {
    let globalActive = false;
    let globalData: SystemBroadcast | null = null;
    let localData: SystemBroadcast | null = null;

    // Check cached localStorage broadcast first
    try {
      const raw = localStorage.getItem('agaia_global_broadcast');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.active) {
          globalData = parsed;
          globalActive = true;
        }
      }
    } catch {}

    const emit = () => {
      if (globalActive && globalData) {
        callback(globalData);
      } else if (localData && localData.active) {
        callback(localData);
      } else {
        callback(null);
      }
    };

    emit();

    const handleCustomBroadcastEvent = (e: any) => {
      const bc = e.detail as SystemBroadcast;
      if (bc) {
        if (!bc.active) {
          globalActive = false;
          globalData = null;
          if (localData) localData.active = false;
        } else {
          globalData = bc;
          globalActive = true;
        }
        emit();
      }
    };
    window.addEventListener('agaia_broadcast_changed', handleCustomBroadcastEvent);

    const unsubGlobal = onSnapshot(doc(db, 'settings', 'global_broadcast'), (snapshot) => {
      if (snapshot.exists()) {
        globalData = snapshot.data() as SystemBroadcast;
        globalActive = !!globalData.active;
      } else {
        globalData = null;
        globalActive = false;
      }
      emit();
    }, (err) => console.warn("Notice on global broadcast listener:", err));

    const unsubLocal = onSnapshot(doc(db, getTenantPath('settings'), 'broadcast'), (snapshot) => {
      if (snapshot.exists()) {
        localData = snapshot.data() as SystemBroadcast;
      } else {
        localData = null;
      }
      emit();
    }, (err) => console.warn("Notice on local broadcast listener:", err));

    return () => {
      window.removeEventListener('agaia_broadcast_changed', handleCustomBroadcastEvent);
      unsubGlobal();
      unsubLocal();
    };
  } catch (err) {
    console.warn("Failed to attach system broadcast listener:", err);
    return () => {};
  }
};

/* ========================================================================== */
/*                AUDITORIA DE MINUTAS DO JUIZ (COLEÇÃO FIRESTORE)             */
/* ========================================================================== */

export const getAuditsFromDb = async (): Promise<AuditedProcessRecord[]> => {
  if (!auth.currentUser) return [];
  try {
    const snapshot = await getDocs(collection(db, getTenantPath('audits')));
    const unitId = getActiveUnitId();
    const all = snapshot.docs.map(d => {
      const data = d.data();
      return { id: d.id, ...data } as AuditedProcessRecord;
    });

    let filtered = all;
    if (unitId === "montes_claros") {
      filtered = all.filter(a => !a.unitId || a.unitId === "montes_claros");
    } else {
      filtered = all.filter(a => a.unitId === unitId);
    }
    return filtered.sort((a, b) => (b.date || 0) - (a.date || 0));
  } catch (err) {
    console.warn("Could not fetch audits from Firestore:", err);
    return [];
  }
};

export const saveAuditToDb = async (auditRecord: AuditedProcessRecord): Promise<void> => {
  if (!auth.currentUser) return;
  const user = auth.currentUser;
  const unitId = getActiveUnitId();
  const dataToSave: any = cleanForFirestore({
    ...auditRecord,
    tenant: globalTenantId,
    unitId: auditRecord.unitId || unitId,
    createdBy: auditRecord.createdBy || user.uid,
    creatorName: auditRecord.creatorName || user.displayName || user.email?.split('@')[0] || 'Magistrado',
    creatorEmail: auditRecord.creatorEmail || user.email || '',
    updatedAt: Date.now(),
  });

  await setDoc(doc(db, getTenantPath('audits'), auditRecord.id), dataToSave);
};

export const deleteAuditFromDb = async (id: string): Promise<void> => {
  if (!auth.currentUser || !id) return;
  await deleteDoc(doc(db, getTenantPath('audits'), id));
};

export const updateAuditInDb = async (id: string, partial: Partial<AuditedProcessRecord>): Promise<void> => {
  if (!auth.currentUser || !id) return;
  const docRef = doc(db, getTenantPath('audits'), id);
  const dataToUpdate = cleanForFirestore({
    ...partial,
    updatedAt: Date.now(),
  });
  await updateDoc(docRef, dataToUpdate);
};

export const subscribeToAudits = (callback: (audits: AuditedProcessRecord[]) => void): (() => void) => {
  if (!auth.currentUser) return () => {};
  try {
    const unitId = getActiveUnitId();
    const q = query(collection(db, getTenantPath('audits')));
    const unsub = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data } as AuditedProcessRecord;
      });

      let filtered = all;
      if (unitId === "montes_claros") {
        filtered = all.filter(a => !a.unitId || a.unitId === "montes_claros");
      } else {
        filtered = all.filter(a => a.unitId === unitId);
      }
      const sorted = filtered.sort((a, b) => (b.date || 0) - (a.date || 0));
      callback(sorted);
    }, (err) => {
      console.warn("Error in audits real-time subscription:", err);
    });
    return unsub;
  } catch (err) {
    console.warn("Could not subscribe to audits from Firestore:", err);
    return () => {};
  }
};




export const inviteUserToTenant = async (email: string, targetTenantId?: string): Promise<void> => {
  if (!auth.currentUser) return;
  const emailLower = email.trim().toLowerCase();
  const currentTenant = targetTenantId || globalTenantId || 'gabinete_default';
  
  // Create invite record
  await setDoc(doc(db, 'invites', emailLower), {
     email: emailLower,
     tenantId: currentTenant,
     invitedAt: Date.now()
  });
  
  // Also migrate immediately if they already have an existing user profile
  try {
    const q = query(collection(db, 'users'), where('email', '==', emailLower));
    const snap = await getDocs(q);
    if (!snap.empty) {
      for (const uDoc of snap.docs) {
        await setDoc(doc(db, 'users', uDoc.id), { 
          tenantId: currentTenant, 
          isActive: true,
          updatedAt: Date.now() 
        }, { merge: true });
      }
    }
  } catch (e) {
    console.warn("Could not query existing users during invite:", e);
  }
};

export const getPendingInvites = async (targetTenantId?: string): Promise<{email: string, tenantId: string, invitedAt: number}[]> => {
  if (!auth.currentUser) return [];
  try {
    const snapshot = await getDocs(collection(db, 'invites'));
    const isAll = targetTenantId === 'ALL';
    const currentTenant = targetTenantId || globalTenantId || 'gabinete_default';
    const isCurrentPrimary = !isAll && isPrimaryCabinet(currentTenant);
    
    const invites = snapshot.docs.map(d => {
      const data = d.data() || {};
      return {
        email: data.email || d.id,
        tenantId: data.tenantId || 'gabinete_default',
        invitedAt: data.invitedAt || Date.now()
      };
    });
    
    if (isAll) {
      return invites;
    }
    
    return invites.filter(inv => {
      if (isCurrentPrimary) {
        return isPrimaryCabinet(inv.tenantId);
      }
      return inv.tenantId === currentTenant;
    });
  } catch (err) {
    console.error("Erro ao buscar convites pendentes:", err);
    return [];
  }
};

export const removeInvite = async (email: string): Promise<void> => {
  if (!auth.currentUser) return;
  const emailLower = email.trim().toLowerCase();
  await deleteDoc(doc(db, 'invites', emailLower));
};

// ==========================================
// SAAS SUPER ADMIN ADVANCED UTILITIES
// ==========================================

export const getAllTenantsWithMetrics = async (): Promise<SaaSTenant[]> => {
  if (!auth.currentUser) return [];
  try {
    const snap = await getDocs(collection(db, 'tenants'));
    const tenants: SaaSTenant[] = [];
    
    // Get all users once to calculate unique user counts per tenant
    const usersSnap = await getDocs(collection(db, 'users'));
    const usersByTenant: Record<string, number> = {};
    const seenUserKeys = new Set<string>();

    usersSnap.forEach(uDoc => {
      const uData = uDoc.data();
      const email = (uData.email || (uDoc.id.includes('@') ? uDoc.id : '')).toLowerCase().trim();
      const key = email || uDoc.id;
      if (!seenUserKeys.has(key)) {
        seenUserKeys.add(key);
        const tId = uData.tenantId || 'gabinete_default';
        usersByTenant[tId] = (usersByTenant[tId] || 0) + 1;
      }
    });

    for (const d of snap.docs) {
      const data = d.data() as SaaSTenant;
      const tId = d.id;

      // Count metrics safely
      let promptsCount = 0;
      let historyCount = 0;
      let unitsCount = 0;
      let paradigmsCount = 0;

      const isPrimary = isPrimaryCabinet(tId);
      const effectivePathId = tId;

      try {
        let promptsSnap = await getDocs(collection(db, `gabinetes/${effectivePathId}/prompts`));
        if (promptsSnap.empty && isPrimary) {
          promptsSnap = await getDocs(collection(db, `gabinetes/gabinete_default/prompts`));
        }
        promptsCount = promptsSnap.size;
      } catch {}

      try {
        let historySnap = await getDocs(collection(db, `gabinetes/${effectivePathId}/history`));
        if (historySnap.empty && isPrimary) {
          historySnap = await getDocs(collection(db, `gabinetes/gabinete_default/history`));
        }
        historyCount = historySnap.size;
      } catch {}

      let primaryUnitName = '';
      try {
        let unitsDoc = await getDoc(doc(db, `gabinetes/${effectivePathId}/settings/units`));
        if (!unitsDoc.exists() && isPrimary) {
          unitsDoc = await getDoc(doc(db, `gabinetes/gabinete_default/settings/units`));
        }
        if (unitsDoc.exists()) {
          const unitsArr = unitsDoc.data()?.units || [];
          unitsCount = unitsArr.length;
          if (unitsArr.length > 0 && unitsArr[0]?.name) {
            primaryUnitName = unitsArr[0].name;
          }
        }
      } catch {}

      // Auto-heal / sync initial lotação if cabinet notes was provided as a comarca name (e.g. Palmeiras de Goiás)
      if (tId === 'gab_dr_jose_cassio_de_sousa' || (data.notes && data.notes.trim() && primaryUnitName && primaryUnitName.startsWith('1ª Vara Judicial / '))) {
        const candidateName = (data.notes && data.notes.trim()) ? data.notes.trim() : (tId === 'gab_dr_jose_cassio_de_sousa' ? 'Palmeiras de Goiás' : '');
        if (candidateName && (!primaryUnitName || primaryUnitName.startsWith('1ª Vara Judicial / '))) {
          try {
            const healedUnits: JudicialUnit[] = [
              {
                id: `vara_${tId.replace(/^gab_/, '') || 'principal'}`,
                name: candidateName,
                tenantId: tId,
                tenantName: data.name || tId
              }
            ];
            await setDoc(doc(db, 'gabinetes', tId, 'settings', 'units'), cleanForFirestore({
              units: healedUnits,
              updatedAt: new Date().toISOString()
            }));
            primaryUnitName = candidateName;
            unitsCount = 1;
          } catch (healErr) {
            console.warn("Could not auto-heal tenant unit:", healErr);
          }
        }
      }

      try {
        let paradSnap = await getDocs(collection(db, `gabinetes/${effectivePathId}/judge_paradigms`));
        if (paradSnap.empty && isPrimary) {
          paradSnap = await getDocs(collection(db, `gabinetes/gabinete_default/judge_paradigms`));
        }
        paradigmsCount = paradSnap.size;
      } catch {}

      const effectiveUserCount = isPrimary
        ? (usersByTenant[tId] || 0) + (tId !== 'gabinete_default' ? (usersByTenant['gabinete_default'] || 0) : 0)
        : (usersByTenant[tId] || 0);

      tenants.push({
        ...data,
        id: tId,
        status: data.status || 'active',
        plan: data.plan || 'magistrado',
        usersCount: effectiveUserCount,
        promptsCount,
        historyCount,
        unitsCount,
        paradigmsCount,
        primaryUnitName: primaryUnitName || (data.notes ? data.notes : (isPrimary ? 'Montes Claros / Vara Única' : '1ª Vara Judicial')),
      });
    }

    // Sort active first, then newest
    return tenants.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    console.error("Error fetching all tenants with metrics:", err);
    return [];
  }
};

export const updateCabinetPrimaryUnit = async (
  tenantId: string,
  unitName: string,
  tenantDisplayName?: string
): Promise<void> => {
  if (!auth.currentUser) return;
  const cleanTenant = tenantId.trim();
  const cleanName = unitName.trim();
  if (!cleanTenant || !cleanName) return;

  try {
    const uDoc = await getDoc(doc(db, 'gabinetes', cleanTenant, 'settings', 'units'));
    let currentUnits: JudicialUnit[] = uDoc.exists() && Array.isArray(uDoc.data()?.units) ? uDoc.data()?.units : [];
    
    if (currentUnits.length === 0) {
      currentUnits = [{
        id: `vara_${cleanTenant.replace(/^gab_/, '') || 'principal'}`,
        name: cleanName,
        tenantId: cleanTenant,
        tenantName: tenantDisplayName || cleanTenant
      }];
    } else {
      currentUnits = currentUnits.map((u, idx) => idx === 0 ? {
        ...u,
        name: cleanName,
        ...(tenantDisplayName ? { tenantName: tenantDisplayName } : {})
      } : {
        ...u,
        ...(tenantDisplayName ? { tenantName: tenantDisplayName } : {})
      });
    }

    await setDoc(doc(db, 'gabinetes', cleanTenant, 'settings', 'units'), cleanForFirestore({
      units: currentUnits,
      updatedAt: new Date().toISOString()
    }));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('units_updated', { detail: { tenantId: cleanTenant, units: currentUnits } }));
    }
  } catch (err) {
    console.error("Error updating cabinet primary unit:", err);
    throw err;
  }
};

export const updateTenantStatus = async (
  tenantId: string, 
  status: "active" | "suspended" | "trial" | "maintenance",
  suspendedReason?: string
): Promise<void> => {
  if (!auth.currentUser) return;
  const updates: any = {
    status,
    updatedAt: Date.now()
  };
  if (suspendedReason !== undefined) {
    updates.suspendedReason = suspendedReason;
  }
  await setDoc(doc(db, 'tenants', tenantId), updates, { merge: true });
};

export const updateTenantDetails = async (
  tenantId: string,
  details: Partial<SaaSTenant>
): Promise<void> => {
  if (!auth.currentUser) return;
  const payload = {
    ...details,
    updatedAt: Date.now()
  };
  await setDoc(doc(db, 'tenants', tenantId), cleanForFirestore(payload), { merge: true });
  
  // Also update profile doc inside the cabinet
  if (details.name || details.ownerEmail) {
    await setDoc(doc(db, `gabinetes/${tenantId}/settings/profile`), {
      name: details.name,
      ownerEmail: details.ownerEmail,
      updatedAt: Date.now()
    }, { merge: true });
  }
};

export const getAllGlobalUsers = async (): Promise<UserProfile[]> => {
  if (!auth.currentUser) return [];
  try {
    const snap = await getDocs(collection(db, 'users'));
    const userMap = new Map<string, UserProfile>();
    const ghostDocsToDelete: string[] = [];

    snap.forEach(d => {
      const data = d.data() as UserProfile;
      const docId = d.id;
      const email = (data.email || (docId.includes('@') ? docId : '')).toLowerCase().trim();
      const uid = data.uid || docId;

      const profile: UserProfile = {
        ...data,
        uid,
        email: data.email || (docId.includes('@') ? docId : ''),
        name: data.name || (email ? email.split('@')[0] : 'Usuário'),
        role: data.role || 'user',
        isActive: data.isActive !== false,
        tenantId: data.tenantId || 'gabinete_default'
      };

      const key = email || uid;
      if (!userMap.has(key)) {
        userMap.set(key, profile);
      } else {
        const existing = userMap.get(key)!;
        const isDocIdEmail = docId.includes('@');
        const isExistingIdEmail = existing.uid.includes('@');

        const existingTime = typeof existing.updatedAt === 'number' ? existing.updatedAt : (existing.updatedAt ? new Date(existing.updatedAt).getTime() : (existing.createdAt || 0));
        const profileTime = typeof profile.updatedAt === 'number' ? profile.updatedAt : (profile.updatedAt ? new Date(profile.updatedAt).getTime() : (profile.createdAt || 0));

        const newest = profileTime >= existingTime ? profile : existing;
        const oldest = profileTime >= existingTime ? existing : profile;
        const realUid = !docId.includes('@') ? docId : (existing.uid && !existing.uid.includes('@') ? existing.uid : (profile.uid || docId));

        const merged: UserProfile = {
          ...oldest,
          ...newest,
          uid: realUid,
          email: email || existing.email || profile.email,
          name: newest.name || oldest.name,
          role: newest.role || oldest.role || 'user',
          isActive: newest.isActive !== undefined ? newest.isActive : (oldest.isActive !== undefined ? oldest.isActive : true),
          isJudge: newest.isJudge !== undefined ? newest.isJudge : oldest.isJudge,
          judgeTitle: newest.judgeTitle || oldest.judgeTitle,
          canUseNativeKey: newest.canUseNativeKey !== undefined ? newest.canUseNativeKey : oldest.canUseNativeKey,
          allowedUnits: newest.allowedUnits || oldest.allowedUnits,
          tenantId: (newest.tenantId && newest.tenantId !== 'gabinete_default' && newest.tenantId !== 'unassigned')
            ? newest.tenantId
            : (oldest.tenantId || newest.tenantId || 'gabinete_default')
        };

        userMap.set(key, merged);

        if (isExistingIdEmail && !isDocIdEmail) {
          ghostDocsToDelete.push(existing.uid);
        } else if (!isExistingIdEmail && isDocIdEmail) {
          ghostDocsToDelete.push(docId);
        }
      }
    });

    if (ghostDocsToDelete.length > 0) {
      ghostDocsToDelete.forEach(ghostId => {
        deleteDoc(doc(db, 'users', ghostId)).catch(() => {});
      });
    }

    const list = Array.from(userMap.values());
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    console.error("Error fetching global users:", err);
    return [];
  }
};

export const transferUserToCabinet = async (uid: string, targetTenantId: string, email?: string): Promise<void> => {
  if (!auth.currentUser) return;

  const targetCleanTenant = targetTenantId.trim();

  // 1. Update user profile by UID
  await setDoc(doc(db, 'users', uid), {
    tenantId: targetCleanTenant,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // 2. If email provided, remove any ghost doc in `users` and update invite
  if (email) {
    const emailLower = email.trim().toLowerCase();
    
    // Clean up ghost doc if it exists and is distinct from UID
    if (emailLower !== uid) {
      try {
        await deleteDoc(doc(db, 'users', emailLower));
      } catch (err) {
        console.warn("Notice: could not delete ghost email user doc:", err);
      }
    }

    try {
      await setDoc(doc(db, 'invites', emailLower), {
        email: emailLower,
        tenantId: targetCleanTenant,
        invitedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn("Could not update invite during transfer:", e);
    }
  }
};

export const getGlobalSaaSBroadcast = async (): Promise<SystemBroadcast | null> => {
  try {
    const snap = await getDoc(doc(db, 'settings', 'global_broadcast'));
    if (snap.exists()) {
      return snap.data() as SystemBroadcast;
    }
    return null;
  } catch (e) {
    console.warn("Could not fetch global broadcast:", e);
    return null;
  }
};

export const saveGlobalSaaSBroadcast = async (broadcast: SystemBroadcast): Promise<void> => {
  try {
    // 1. Always sync to localStorage and broadcast event across all tabs/windows
    try {
      localStorage.setItem('agaia_global_broadcast', JSON.stringify(broadcast));
      window.dispatchEvent(new CustomEvent('agaia_broadcast_changed', { detail: broadcast }));
    } catch (lsErr) {
      console.warn("Notice: could not update broadcast in localStorage:", lsErr);
    }

    // 2. Persist to Firestore global settings doc
    try {
      await setDoc(doc(db, 'settings', 'global_broadcast'), cleanForFirestore(broadcast));
    } catch (gErr) {
      console.warn("Could not save to settings/global_broadcast:", gErr);
    }

    // 3. If concluding / deactivating update, also sync current tenant's local settings doc
    try {
      if (!broadcast.active) {
        await setDoc(doc(db, getTenantPath('settings'), 'broadcast'), cleanForFirestore({
          active: false,
          message: '',
          type: 'info',
          createdAt: Date.now()
        }), { merge: true });
      }
    } catch (tErr) {
      console.warn("Could not sync local cabinet broadcast:", tErr);
    }
  } catch (err) {
    console.error("Error in saveGlobalSaaSBroadcast:", err);
    throw err;
  }
};

/* ========================================================================== */
/*           BACKUP AUTOMÁTICO DO GABINETE AO TRANSMITIR COMUNICADO           */
/* ========================================================================== */

/** Captures a full data snapshot of the current cabinet */
export const captureCabinetFullData = async (): Promise<CabinetBackupSnapshot['data']> => {
  const currentTenantId = globalTenantId;
  const snapshotData: CabinetBackupSnapshot['data'] = {
    teses: {},
    projudiGuide: {},
    paradigms: {},
    prompts: [],
    units: [],
    calendarSettings: null,
  };

  try {
    // 1. Fetch units
    const unitsSnap = await getDoc(doc(db, `gabinetes/${currentTenantId}/settings`, 'units'));
    if (unitsSnap.exists()) {
      snapshotData.units = unitsSnap.data().units || [];
    }

    const unitsList: string[] = ['montes_claros', ...(snapshotData.units?.map(u => u.id) || [])];
    const uniqueUnitIds = Array.from(new Set(unitsList));

    // 2. Fetch Teses for each unit
    for (const uId of uniqueUnitIds) {
      const docName = uId === 'montes_claros' ? 'teses' : `teses_${uId}`;
      try {
        const snap = await getDoc(doc(db, `gabinetes/${currentTenantId}/settings`, docName));
        if (snap.exists()) {
          snapshotData.teses![uId] = snap.data() as CabinetTesesData;
        }
      } catch (e) {
        console.warn(`Could not read teses for ${uId}:`, e);
      }
    }

    // 3. Fetch Projudi Guide for each unit
    for (const uId of uniqueUnitIds) {
      const docName = uId === 'montes_claros' ? 'projudiGuide' : `projudiGuide_${uId}`;
      try {
        const snap = await getDoc(doc(db, `gabinetes/${currentTenantId}/settings`, docName));
        if (snap.exists()) {
          snapshotData.projudiGuide![uId] = snap.data() as ProjudiGuideData;
        }
      } catch (e) {
        console.warn(`Could not read projudiGuide for ${uId}:`, e);
      }
    }

    // 4. Fetch Paradigms for each unit
    for (const uId of uniqueUnitIds) {
      const docName = uId === 'montes_claros' ? 'judge_paradigms' : `judge_paradigms_${uId}`;
      try {
        const snap = await getDoc(doc(db, `gabinetes/${currentTenantId}/settings`, docName));
        if (snap.exists() && Array.isArray(snap.data().paradigms)) {
          snapshotData.paradigms![uId] = snap.data().paradigms as JudgeParadigmModel[];
        }
      } catch (e) {
        console.warn(`Could not read paradigms for ${uId}:`, e);
      }
    }

    // 5. Fetch Prompts
    try {
      const promptsSnap = await getDocs(collection(db, `gabinetes/${currentTenantId}/prompts`));
      snapshotData.prompts = promptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CustomPrompt));
    } catch (e) {
      console.warn("Could not read prompts for backup:", e);
    }

    // 6. Fetch Calendar
    try {
      const calSnap = await getDoc(doc(db, `gabinetes/${currentTenantId}/settings`, 'cabinet_calendar'));
      if (calSnap.exists()) {
        snapshotData.calendarSettings = calSnap.data() as CabinetCalendarSettings;
      }
    } catch (e) {
      console.warn("Could not read calendar for backup:", e);
    }

  } catch (err) {
    console.error("Erro ao capturar dados do gabinete para backup:", err);
  }

  return snapshotData;
};

/** Loads full cabinet backup data, reassembling chunks if chunked */
export const fetchFullCabinetBackupSnapshot = async (
  backupOrId: CabinetBackupSnapshot | string,
  tenantId?: string
): Promise<CabinetBackupSnapshot | null> => {
  try {
    let backup: CabinetBackupSnapshot;
    const currentTenantId = tenantId || globalTenantId;

    if (typeof backupOrId === 'string') {
      const docSnap = await getDoc(doc(db, `gabinetes/${currentTenantId}/backups`, backupOrId));
      if (!docSnap.exists()) return null;
      backup = { id: docSnap.id, ...docSnap.data() } as CabinetBackupSnapshot;
    } else {
      backup = backupOrId;
    }

    if (backup.data && Object.keys(backup.data).length > 0) {
      return backup;
    }

    const tId = backup.tenantId || currentTenantId;
    const chunksSnap = await getDocs(collection(db, `gabinetes/${tId}/backups/${backup.id}/chunks`));
    if (chunksSnap.size > 0) {
      const chunkList: { index: number; data: string }[] = [];
      chunksSnap.forEach(d => {
        const dData = d.data();
        chunkList.push({ index: dData.index ?? 0, data: dData.data ?? '' });
      });
      chunkList.sort((a, b) => a.index - b.index);
      const combinedJson = chunkList.map(c => c.data).join('');
      const fullData = JSON.parse(combinedJson);
      return {
        ...backup,
        data: fullData
      };
    }

    return backup;
  } catch (err) {
    console.error("Erro ao carregar backup completo do gabinete:", err);
    return null;
  }
};

/** Executes full backup snapshot and stores it in Firestore & localStorage */
export const createCabinetBackupSnapshot = async (
  triggeredBy: "broadcast" | "manual" | "migration",
  broadcastDetails?: { message?: string; type?: string }
): Promise<CabinetBackupSnapshot | null> => {
  const user = auth.currentUser;
  const currentTenantId = globalTenantId;
  const now = Date.now();
  const backupId = `backup_${now}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const fullData = await captureCabinetFullData();

    let tesesCount = 0;
    if (fullData.teses) {
      Object.values(fullData.teses).forEach(t => { if (t && t.text) tesesCount++; });
    }
    let projudiCount = 0;
    if (fullData.projudiGuide) {
      Object.values(fullData.projudiGuide).forEach(p => { if (p && p.text) projudiCount++; });
    }
    let paradigmsCount = 0;
    if (fullData.paradigms) {
      Object.values(fullData.paradigms).forEach(pList => { if (Array.isArray(pList)) paradigmsCount += pList.length; });
    }
    const promptsCount = fullData.prompts?.length || 0;
    const unitsCount = fullData.units?.length || 0;

    const snapshot: CabinetBackupSnapshot = {
      id: backupId,
      timestamp: now,
      dateIso: new Date(now).toISOString(),
      tenantId: currentTenantId,
      triggeredBy,
      broadcastMessage: broadcastDetails?.message,
      broadcastType: broadcastDetails?.type,
      authorEmail: user?.email || 'admin@sistema.adv',
      authorName: user?.displayName || user?.email?.split('@')[0] || 'Administrador',
      data: fullData,
      summary: {
        tesesCount,
        projudiGuideCount: projudiCount,
        paradigmsCount,
        promptsCount,
        unitsCount,
      }
    };

    // Serialize data to measure size safely under Firestore 1MB document limit
    const dataJson = JSON.stringify(cleanForFirestore(fullData));
    const CHUNK_SIZE = 400000;

    if (dataJson.length <= CHUNK_SIZE) {
      // 1. Save to Firestore in subcollection 'backups' of the cabinet
      await setDoc(doc(db, `gabinetes/${currentTenantId}/backups`, backupId), cleanForFirestore({
        ...snapshot,
        isChunked: false,
        totalSize: dataJson.length
      }));
    } else {
      // Partition into subcollection chunks
      const chunks: string[] = [];
      for (let i = 0; i < dataJson.length; i += CHUNK_SIZE) {
        chunks.push(dataJson.substring(i, i + CHUNK_SIZE));
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunkDocId = `chunk_${String(i).padStart(4, '0')}`;
        await setDoc(doc(db, `gabinetes/${currentTenantId}/backups/${backupId}/chunks`, chunkDocId), {
          index: i,
          totalChunks: chunks.length,
          data: chunks[i],
          timestamp: now
        });
      }

      const metadataDoc: Partial<CabinetBackupSnapshot> & { isChunked: boolean; totalChunks: number; totalSize: number } = {
        id: backupId,
        timestamp: now,
        dateIso: snapshot.dateIso,
        tenantId: currentTenantId,
        triggeredBy,
        broadcastMessage: broadcastDetails?.message,
        broadcastType: broadcastDetails?.type,
        authorEmail: snapshot.authorEmail,
        authorName: snapshot.authorName,
        summary: snapshot.summary,
        isChunked: true,
        totalChunks: chunks.length,
        totalSize: dataJson.length
      };

      await setDoc(doc(db, `gabinetes/${currentTenantId}/backups`, backupId), cleanForFirestore(metadataDoc));
    }

    // 2. Keep local metadata in localStorage if capacity permits
    try {
      const localKey = `agaia_cabinet_latest_backup_${currentTenantId}`;
      const lightSnapshot = {
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        dateIso: snapshot.dateIso,
        tenantId: snapshot.tenantId,
        authorEmail: snapshot.authorEmail,
        authorName: snapshot.authorName,
        summary: snapshot.summary
      };
      safeSetItem(localKey, JSON.stringify(lightSnapshot));
    } catch (e) {
      console.warn("Could not save backup copy to localStorage:", e);
    }

    return snapshot;
  } catch (err) {
    console.error("Falha ao gerar snapshot de backup do gabinete:", err);
    return null;
  }
};

/** Retrieves all historical backup snapshots for current cabinet */
export const getCabinetBackupSnapshots = async (): Promise<CabinetBackupSnapshot[]> => {
  const currentTenantId = globalTenantId;
  try {
    const snap = await getDocs(collection(db, `gabinetes/${currentTenantId}/backups`));
    const list: CabinetBackupSnapshot[] = [];
    snap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as CabinetBackupSnapshot);
    });
    return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    console.warn("Could not fetch backup snapshots from Firestore:", err);
    return [];
  }
};

/** Restores a specific backup snapshot to current cabinet without erasing unrelated data */
export const restoreCabinetBackupSnapshot = async (backupInput: CabinetBackupSnapshot): Promise<{
  restoredUnits: number;
  restoredTeses: number;
  restoredParadigms: number;
  restoredPrompts: number;
  restoredProjudi: number;
}> => {
  const backup = (await fetchFullCabinetBackupSnapshot(backupInput)) || backupInput;
  const currentTenantId = (globalTenantId && globalTenantId !== 'unassigned' && globalTenantId !== 'unauthorized')
    ? globalTenantId
    : (backup.tenantId || 'gab_rafael_machado');
  const user = auth.currentUser;

  if (!backup || !backup.data) {
    throw new Error("Dados de backup inválidos ou corrompidos.");
  }

  const isPrimary = isPrimaryCabinet(currentTenantId);
  const targetTenants = isPrimary 
    ? Array.from(new Set([currentTenantId, 'gab_rafael_machado', 'gabinete_default']))
    : [currentTenantId];

  let restoredUnits = 0;
  let restoredTeses = 0;
  let restoredParadigms = 0;
  let restoredPrompts = 0;
  let restoredProjudi = 0;

  // 1. Restore Units
  if (Array.isArray(backup.data.units) && backup.data.units.length > 0) {
    for (const tId of targetTenants) {
      await setDoc(doc(db, `gabinetes/${tId}/settings`, 'units'), {
        units: backup.data.units,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      try {
        localStorage.setItem(`assessor_judicial_units_${tId}`, JSON.stringify(backup.data.units));
      } catch {}
    }
    if (isPrimary) {
      try {
        await setDoc(doc(db, 'settings', 'units'), {
          units: backup.data.units,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch {}
    }
    restoredUnits = backup.data.units.length;
  }

  // 2. Restore Teses
  if (backup.data.teses) {
    for (const [uId, teseData] of Object.entries(backup.data.teses)) {
      if (teseData && typeof teseData.text === 'string') {
        const docName = uId === 'montes_claros' ? 'teses' : `teses_${uId}`;
        const payload = cleanForFirestore({
          tenant: currentTenantId,
          text: teseData.text,
          isEnabled: teseData.isEnabled ?? true,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid || 'system',
          updatedByName: `Restaurado por ${user?.displayName || user?.email || 'Admin'}`,
          title: teseData.title || 'Caderno de Teses do Gabinete'
        });

        for (const tId of targetTenants) {
          await setDoc(doc(db, `gabinetes/${tId}/settings`, docName), { ...payload, tenant: tId });
          try {
            localStorage.setItem(`assessor_cabinet_teses_v2_${tId}_${uId}`, JSON.stringify(payload));
          } catch {}
        }
        if (isPrimary) {
          try {
            await setDoc(doc(db, 'settings', docName), payload);
          } catch {}
        }
        restoredTeses++;
      }
    }
  }

  // 3. Restore Projudi Guides
  if (backup.data.projudiGuide) {
    for (const [uId, guideData] of Object.entries(backup.data.projudiGuide)) {
      if (guideData && typeof guideData.text === 'string') {
        const docName = uId === 'montes_claros' ? 'projudiGuide' : `projudiGuide_${uId}`;
        const payload = cleanForFirestore({
          tenant: currentTenantId,
          text: guideData.text,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid || 'system',
          updatedByName: `Restaurado por ${user?.displayName || user?.email || 'Admin'}`,
          title: guideData.title || 'Guia Rápido de Lançamentos no PROJUDI'
        });

        for (const tId of targetTenants) {
          await setDoc(doc(db, `gabinetes/${tId}/settings`, docName), { ...payload, tenant: tId });
          try {
            localStorage.setItem(`assessor_projudi_guide_text_v2_${tId}_${uId}`, guideData.text);
          } catch {}
        }
        if (isPrimary) {
          try {
            await setDoc(doc(db, 'settings', docName), payload);
          } catch {}
        }
        restoredProjudi++;
      }
    }
  }

  // 4. Restore Paradigms
  if (backup.data.paradigms) {
    for (const [uId, paradigmsList] of Object.entries(backup.data.paradigms)) {
      if (Array.isArray(paradigmsList)) {
        const docName = uId === 'montes_claros' ? 'judge_paradigms' : `judge_paradigms_${uId}`;
        const payload = cleanForFirestore({
          tenant: currentTenantId,
          paradigms: paradigmsList,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid || 'system',
          updatedByName: `Restaurado por ${user?.displayName || user?.email || 'Admin'}`
        });

        for (const tId of targetTenants) {
          await setDoc(doc(db, `gabinetes/${tId}/settings`, docName), { ...payload, tenant: tId });
          try {
            localStorage.setItem(`assessor_judge_paradigms_v2_${tId}_${uId}`, JSON.stringify(paradigmsList));
          } catch {}
        }
        if (isPrimary) {
          try {
            await setDoc(doc(db, 'settings', docName), payload);
          } catch {}
        }
        restoredParadigms += paradigmsList.length;

        // Dispatch update for active unit
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('assessor_paradigms_updated', { detail: paradigmsList }));
        }
      }
    }
  }

  // 5. Restore Prompts
  if (Array.isArray(backup.data.prompts) && backup.data.prompts.length > 0) {
    // Group prompts by unit
    const promptsByUnit: Record<string, CustomPrompt[]> = {};
    for (const prompt of backup.data.prompts) {
      const uId = (prompt as any).unitId || 'montes_claros';
      if (!promptsByUnit[uId]) promptsByUnit[uId] = [];
      promptsByUnit[uId].push(prompt);

      const promptPayload = cleanForFirestore({
        ...prompt,
        tenant: currentTenantId,
        updatedAt: new Date().toISOString()
      });

      for (const tId of targetTenants) {
        await setDoc(doc(db, `gabinetes/${tId}/prompts`, prompt.id), { ...promptPayload, tenant: tId });
      }
      if (isPrimary) {
        try {
          await setDoc(doc(db, 'prompts', prompt.id), promptPayload);
        } catch {}
      }
      restoredPrompts++;
    }

    // Save locally for quick offline access
    for (const [uId, pList] of Object.entries(promptsByUnit)) {
      for (const tId of targetTenants) {
        try {
          localStorage.setItem(`assessor_fabricio_prompts_v2_${uId}_${tId}`, JSON.stringify(pList));
          localStorage.setItem(`assessor_fabricio_prompts_backup_v2_${uId}_${tId}`, JSON.stringify(pList));
        } catch {}
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('assessor_prompts_updated', { detail: backup.data.prompts }));
    }
  }

  // 6. Restore Calendar
  if (backup.data.calendarSettings) {
    for (const tId of targetTenants) {
      await setDoc(doc(db, `gabinetes/${tId}/settings`, 'cabinet_calendar'), cleanForFirestore({
        tenant: tId,
        ...backup.data.calendarSettings,
        updatedAt: new Date().toISOString()
      }));
    }
  }

  // 7. Global Broadcast Event to notify all components and storage listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('assessor_data_restored', { detail: backup }));
    window.dispatchEvent(new Event('storage'));
  }

  return {
    restoredUnits,
    restoredTeses,
    restoredParadigms,
    restoredPrompts,
    restoredProjudi
  };
};

/** Deletes a specific backup snapshot document from Firestore and localStorage */
export const deleteCabinetBackupSnapshot = async (backupId: string): Promise<void> => {
  const currentTenantId = globalTenantId;
  try {
    try {
      const chunksSnap = await getDocs(collection(db, `gabinetes/${currentTenantId}/backups/${backupId}/chunks`));
      for (const d of chunksSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (chunkErr) {
      console.warn("Notice: could not delete backup sub-chunks:", chunkErr);
    }

    await deleteDoc(doc(db, `gabinetes/${currentTenantId}/backups`, backupId));
    
    // Also clean local copy if it matches
    try {
      const localKey = `agaia_cabinet_latest_backup_${currentTenantId}`;
      const saved = localStorage.getItem(localKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id === backupId) {
          localStorage.removeItem(localKey);
        }
      }
    } catch (e) {
      console.warn("Could not check/clean local backup copy:", e);
    }
  } catch (err) {
    console.error("Erro ao excluir documento de backup:", err);
    throw err;
  }
};





export interface SuperAdminTenantInfo {
  id: string;
  name: string;
  isPrimary?: boolean;
  status?: string;
  judgeName?: string;
}

export interface SuperAdminTenantUnit extends JudicialUnit {
  tenantId: string;
  tenantName: string;
}

export const fetchAllTenantsAndUnitsForSuperAdmin = async (): Promise<{
  tenants: SuperAdminTenantInfo[];
  units: SuperAdminTenantUnit[];
}> => {
  if (!auth.currentUser) return { tenants: [], units: [] };
  try {
    const tenantsSnap = await getDocs(collection(db, 'tenants'));
    const tenantMap = new Map<string, SuperAdminTenantInfo>();

    // Standard / Primary cabinet
    tenantMap.set('gab_rafael_machado', {
      id: 'gab_rafael_machado',
      name: 'Gabinete Principal (Dr. Rafael Machado)',
      isPrimary: true,
      status: 'active',
      judgeName: 'Dr. Rafael Machado'
    });

    tenantsSnap.docs.forEach(tDoc => {
      const data = tDoc.data();
      const isPrimary = isPrimaryCabinet(tDoc.id);
      tenantMap.set(tDoc.id, {
        id: tDoc.id,
        name: data.name || (isPrimary ? 'Gabinete Principal (Dr. Rafael Machado)' : `Gabinete ${tDoc.id}`),
        isPrimary,
        status: data.status || 'active',
        judgeName: data.judgeName || ''
      });
    });

    const tenantsList = Array.from(tenantMap.values());
    const allUnitsList: SuperAdminTenantUnit[] = [];

    for (const t of tenantsList) {
      try {
        let uDoc = await getDoc(doc(db, 'gabinetes', t.id, 'settings', 'units'));
        if (!uDoc.exists() && t.isPrimary) {
          uDoc = await getDoc(doc(db, 'gabinetes', 'gabinete_default', 'settings', 'units'));
        }
        if (uDoc.exists() && Array.isArray(uDoc.data()?.units) && uDoc.data()?.units.length > 0) {
          uDoc.data()?.units.forEach((u: JudicialUnit) => {
            allUnitsList.push({
              ...u,
              tenantId: t.id,
              tenantName: t.name
            });
          });
        } else if (t.isPrimary) {
          DEFAULT_UNITS.forEach(u => {
            allUnitsList.push({
              ...u,
              tenantId: t.id,
              tenantName: t.name
            });
          });
        }
      } catch (e) {
        console.warn(`Could not read units for tenant ${t.id}:`, e);
      }
    }

    return { tenants: tenantsList, units: allUnitsList };
  } catch (err) {
    console.warn("Could not fetch all tenants and units for super admin (quota limit or permission):", err);
    return { tenants: [], units: [] };
  }
};

export const fetchAllUnitsForSuperAdmin = async (): Promise<JudicialUnit[]> => {
  const result = await fetchAllTenantsAndUnitsForSuperAdmin();
  return result.units;
};

/* ========================================================================== */
/*     MECANISMO DE SNAPSHOT GLOBAL & PONTO DE RESTAURAÇÃO DE SEGURANÇA       */
/* ========================================================================== */

/**
 * Captures full data of the entire multi-tenant system:
 * All tenants, all users, all invites, global settings, and partition data for each cabinet.
 */
export const captureGlobalDatabaseData = async (): Promise<{
  data: GlobalDatabaseSnapshot['data'];
  summary: GlobalDatabaseSnapshot['summary'];
}> => {
  const resultData: GlobalDatabaseSnapshot['data'] = {
    tenants: [],
    users: [],
    invites: [],
    globalSettings: {},
    gabinetesData: {},
    legacyData: {
      history: [],
      prompts: [],
      teses: [],
      knowledge: [],
      audits: []
    }
  };

  let totalHistoriesCount = 0;
  let totalPromptsCount = 0;
  let totalTesesCount = 0;
  let totalParadigmsCount = 0;
  let totalAuditsCount = 0;
  let totalUnitsCount = 0;

  try {
    // 1. Capture Tenants
    const tenantsSnap = await getDocs(collection(db, 'tenants'));
    const tenantIdsSet = new Set<string>(['gabinete_default', 'gab_rafael_machado', 'gab_julia_vianna']);
    tenantsSnap.forEach(d => {
      tenantIdsSet.add(d.id);
      resultData.tenants.push({ id: d.id, ...d.data() } as SaaSTenant);
    });

    // 2. Capture Users
    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.forEach(d => {
      const uData = { uid: d.id, ...d.data() } as UserProfile;
      resultData.users.push(uData);
      if (uData.tenantId) tenantIdsSet.add(uData.tenantId);
    });

    // 3. Capture Invites
    try {
      const invitesSnap = await getDocs(collection(db, 'invites'));
      invitesSnap.forEach(d => {
        const inv = { email: d.id, ...d.data() } as any;
        resultData.invites.push(inv);
        if (inv.tenantId) tenantIdsSet.add(inv.tenantId);
      });
    } catch (e) {
      console.warn("Notice: could not capture invites:", e);
    }

    // 4. Capture Global Settings (e.g. global broadcast)
    try {
      const settingsSnap = await getDocs(collection(db, 'settings'));
      settingsSnap.forEach(d => {
        resultData.globalSettings![d.id] = d.data();
      });
    } catch (e) {
      console.warn("Notice: could not capture root settings:", e);
    }

    // 5. Capture Partitions for each Tenant/Gabinete
    for (const tId of Array.from(tenantIdsSet)) {
      if (!tId || tId === 'unassigned' || tId === 'unauthorized') continue;
      const cabData: CabinetFullPartitionData = {
        teses: {},
        paradigms: {},
        projudiGuide: {},
        prompts: [],
        units: [],
        history: [],
        knowledge: [],
        audits: [],
        calendarSettings: null
      };

      try {
        // Profile
        const profSnap = await getDoc(doc(db, `gabinetes/${tId}/settings`, 'profile'));
        if (profSnap.exists()) cabData.profile = profSnap.data();

        // Units
        const unitsSnap = await getDoc(doc(db, `gabinetes/${tId}/settings`, 'units'));
        if (unitsSnap.exists() && Array.isArray(unitsSnap.data().units)) {
          cabData.units = unitsSnap.data().units;
          totalUnitsCount += cabData.units.length;
        }

        // Calendar
        const calSnap = await getDoc(doc(db, `gabinetes/${tId}/settings`, 'cabinet_calendar'));
        if (calSnap.exists()) cabData.calendarSettings = calSnap.data() as CabinetCalendarSettings;

        // Teses, Paradigms, ProjudiGuide for standard unit ids
        const unitIdsToCheck = ['montes_claros', 'fazenda_nova', ...(cabData.units?.map(u => u.id) || [])];
        const uniqueUnitIds = Array.from(new Set(unitIdsToCheck));

        for (const uId of uniqueUnitIds) {
          // Teses
          const docNameTeses = uId === 'montes_claros' ? 'teses' : `teses_${uId}`;
          const tSnap = await getDoc(doc(db, `gabinetes/${tId}/settings`, docNameTeses));
          if (tSnap.exists()) {
            cabData.teses![uId] = tSnap.data() as CabinetTesesData;
            totalTesesCount++;
          }

          // Paradigms
          const docNameParadigms = uId === 'montes_claros' ? 'judge_paradigms' : `judge_paradigms_${uId}`;
          const pSnap = await getDoc(doc(db, `gabinetes/${tId}/settings`, docNameParadigms));
          if (pSnap.exists() && Array.isArray(pSnap.data().paradigms)) {
            cabData.paradigms![uId] = pSnap.data().paradigms as JudgeParadigmModel[];
            totalParadigmsCount += (cabData.paradigms![uId]?.length || 0);
          }

          // ProjudiGuide
          const docNameGuide = uId === 'montes_claros' ? 'projudiGuide' : `projudiGuide_${uId}`;
          const gSnap = await getDoc(doc(db, `gabinetes/${tId}/settings`, docNameGuide));
          if (gSnap.exists()) {
            cabData.projudiGuide![uId] = gSnap.data() as ProjudiGuideData;
          }
        }

        // Prompts
        const promptsSnap = await getDocs(collection(db, `gabinetes/${tId}/prompts`));
        promptsSnap.forEach(d => {
          cabData.prompts!.push({ id: d.id, ...d.data() } as CustomPrompt);
          totalPromptsCount++;
        });

        // History
        const histSnap = await getDocs(collection(db, `gabinetes/${tId}/history`));
        histSnap.forEach(d => {
          cabData.history!.push({ id: d.id, ...d.data() } as SavedAnalysis);
          totalHistoriesCount++;
        });

        // Knowledge
        const knowSnap = await getDocs(collection(db, `gabinetes/${tId}/knowledge`));
        knowSnap.forEach(d => {
          cabData.knowledge!.push({ id: d.id, ...d.data() } as SavedKnowledgeDoc);
        });

        // Audits
        const auditSnap = await getDocs(collection(db, `gabinetes/${tId}/audits`));
        auditSnap.forEach(d => {
          cabData.audits!.push({ id: d.id, ...d.data() } as AuditedProcessRecord);
          totalAuditsCount++;
        });

        resultData.gabinetesData[tId] = cabData;
      } catch (err) {
        console.warn(`Notice reading partition for ${tId}:`, err);
      }
    }

    // 6. Root Legacy Collections (if any exist)
    try {
      const rootHist = await getDocs(collection(db, 'history'));
      rootHist.forEach(d => resultData.legacyData!.history!.push({ id: d.id, ...d.data() } as SavedAnalysis));
    } catch (_) {}

    try {
      const rootPrompts = await getDocs(collection(db, 'prompts'));
      rootPrompts.forEach(d => resultData.legacyData!.prompts!.push({ id: d.id, ...d.data() } as CustomPrompt));
    } catch (_) {}

  } catch (err) {
    console.error("Erro ao capturar snapshot global do banco de dados:", err);
  }

  const summary: GlobalDatabaseSnapshot['summary'] = {
    tenantsCount: resultData.tenants.length,
    usersCount: resultData.users.length,
    invitesCount: resultData.invites.length,
    totalHistoriesCount,
    totalPromptsCount,
    totalTesesCount,
    totalParadigmsCount,
    totalAuditsCount,
    totalUnitsCount,
  };

  return { data: resultData, summary };
};

/**
 * Loads the complete data of a GlobalDatabaseSnapshot, reassembling chunks if chunked.
 */
export const fetchFullGlobalDatabaseSnapshot = async (
  snapshotOrId: GlobalDatabaseSnapshot | string
): Promise<GlobalDatabaseSnapshot | null> => {
  try {
    let snapshot: GlobalDatabaseSnapshot;

    if (typeof snapshotOrId === 'string') {
      const docSnap = await getDoc(doc(db, 'system_snapshots', snapshotOrId));
      if (!docSnap.exists()) return null;
      snapshot = { id: docSnap.id, ...docSnap.data() } as GlobalDatabaseSnapshot;
    } else {
      snapshot = snapshotOrId;
    }

    // If data is already populated and not empty, return it directly
    if (snapshot.data && Object.keys(snapshot.data).length > 0) {
      return snapshot;
    }

    // Check if chunks exist in subcollection
    const chunksSnap = await getDocs(collection(db, `system_snapshots/${snapshot.id}/chunks`));
    if (chunksSnap.size > 0) {
      const chunkList: { index: number; data: string }[] = [];
      chunksSnap.forEach(d => {
        const dData = d.data();
        chunkList.push({ index: dData.index ?? 0, data: dData.data ?? '' });
      });
      chunkList.sort((a, b) => a.index - b.index);
      const combinedJson = chunkList.map(c => c.data).join('');
      const fullData = JSON.parse(combinedJson);
      return {
        ...snapshot,
        data: fullData
      };
    }

    return snapshot;
  } catch (err) {
    console.error("Erro ao carregar snapshot completo do Firestore:", err);
    return null;
  }
};

/**
 * Creates a Global Database Snapshot point of restoration.
 * Stored in Firestore `system_snapshots` (with subcollection chunking to support multi-megabyte payloads)
 * and locally in `localStorage` as offline redundancy.
 */
export const createGlobalDatabaseSnapshot = async (
  reason: string,
  triggeredBy: "superadmin" | "permission_change" | "manual" | "migration" | "auto" = "manual"
): Promise<GlobalDatabaseSnapshot | null> => {
  const user = auth.currentUser;
  const now = Date.now();
  const snapshotId = `snapshot_${now}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const { data, summary } = await captureGlobalDatabaseData();

    const snapshot: GlobalDatabaseSnapshot = {
      id: snapshotId,
      timestamp: now,
      dateIso: new Date(now).toISOString(),
      reason: reason.trim() || 'Ponto de Restauração de Segurança',
      triggeredBy,
      authorEmail: user?.email || 'admin@sistema.adv',
      authorName: user?.displayName || user?.email?.split('@')[0] || 'Super Admin',
      data,
      summary
    };

    // Serialize data to measure size safely under Firestore 1MB document limit
    const dataJson = JSON.stringify(cleanForFirestore(data));
    const CHUNK_SIZE = 400000; // 400KB chunks, safely under Firestore 1,048,576 byte document limit

    if (dataJson.length <= CHUNK_SIZE) {
      // 1. Save directly to Firestore for small snapshots
      await setDoc(doc(db, 'system_snapshots', snapshotId), cleanForFirestore({
        ...snapshot,
        isChunked: false,
        totalSize: dataJson.length
      }));
    } else {
      // 2. Large snapshot: partition into chunks in subcollection 'chunks'
      const chunks: string[] = [];
      for (let i = 0; i < dataJson.length; i += CHUNK_SIZE) {
        chunks.push(dataJson.substring(i, i + CHUNK_SIZE));
      }

      // Write chunk documents to subcollection
      for (let i = 0; i < chunks.length; i++) {
        const chunkDocId = `chunk_${String(i).padStart(4, '0')}`;
        await setDoc(doc(db, `system_snapshots/${snapshotId}/chunks`, chunkDocId), {
          index: i,
          totalChunks: chunks.length,
          data: chunks[i],
          timestamp: now
        });
      }

      // Write metadata document without the heavy 'data' payload to stay way under 1MB
      const metadataDoc: Partial<GlobalDatabaseSnapshot> & { isChunked: boolean; totalChunks: number; totalSize: number } = {
        id: snapshotId,
        timestamp: now,
        dateIso: snapshot.dateIso,
        reason: snapshot.reason,
        triggeredBy,
        authorEmail: snapshot.authorEmail,
        authorName: snapshot.authorName,
        summary: snapshot.summary,
        isChunked: true,
        totalChunks: chunks.length,
        totalSize: dataJson.length
      };

      await setDoc(doc(db, 'system_snapshots', snapshotId), cleanForFirestore(metadataDoc));
    }

    // 3. Save offline summary metadata to localStorage (handling quota limits gracefully)
    try {
      const lightSnapshot = {
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        dateIso: snapshot.dateIso,
        reason: snapshot.reason,
        triggeredBy: snapshot.triggeredBy,
        authorEmail: snapshot.authorEmail,
        authorName: snapshot.authorName,
        summary: snapshot.summary
      };
      safeSetItem('agaia_latest_global_snapshot_meta', JSON.stringify(lightSnapshot));
    } catch (localErr) {
      console.warn("Notice: Local storage metadata update skipped.", localErr);
    }

    return snapshot;
  } catch (err) {
    console.error("Falha ao criar Snapshot Global do Banco de Dados:", err);
    return null;
  }
};

/**
 * Hook to automatically take a safety snapshot before any critical permission / tenant / user modification.
 */
export const autoPrePermissionChangeSnapshot = async (operationLabel: string): Promise<GlobalDatabaseSnapshot | null> => {
  try {
    return await createGlobalDatabaseSnapshot(`Pré-Alteração Crítica de Permissões: ${operationLabel}`, "permission_change");
  } catch (e) {
    console.warn("Auto pre-permission snapshot notice:", e);
    return null;
  }
};

/**
 * Retrieves all global database snapshots ordered by date descending.
 */
export const getGlobalDatabaseSnapshots = async (): Promise<GlobalDatabaseSnapshot[]> => {
  try {
    const snap = await getDocs(collection(db, 'system_snapshots'));
    const list: GlobalDatabaseSnapshot[] = [];
    snap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as GlobalDatabaseSnapshot);
    });
    return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    console.warn("Could not fetch global snapshots from Firestore:", err);
    // Fallback: check localStorage
    try {
      const local = safeGetItem('agaia_latest_global_snapshot_meta') || safeGetItem('agaia_latest_global_snapshot');
      if (local) {
        return [JSON.parse(local)];
      }
    } catch (_) {}
    return [];
  }
};

/**
 * Deletes a snapshot document and its subcollection chunks from Firestore.
 */
export const deleteGlobalDatabaseSnapshot = async (snapshotId: string): Promise<void> => {
  try {
    try {
      const chunksSnap = await getDocs(collection(db, `system_snapshots/${snapshotId}/chunks`));
      for (const d of chunksSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (chunkErr) {
      console.warn("Notice: could not delete snapshot sub-chunks:", chunkErr);
    }
    await deleteDoc(doc(db, 'system_snapshots', snapshotId));
  } catch (err) {
    console.error("Erro ao excluir snapshot:", err);
    throw err;
  }
};

/**
 * Restores a complete Global Database Snapshot with zero permission conflict and strict integrity.
 */
export const restoreGlobalDatabaseSnapshot = async (
  snapshotInput: GlobalDatabaseSnapshot,
  options?: { targetTenantOnly?: string }
): Promise<{ restoredTenants: number; restoredUsers: number; restoredHistories: number; restoredPrompts: number }> => {
  const snapshot = (await fetchFullGlobalDatabaseSnapshot(snapshotInput)) || snapshotInput;

  if (!snapshot || !snapshot.data) {
    throw new Error("Dados de Snapshot inválidos ou corrompidos.");
  }

  // Pre-snapshot before restoring, for maximum safety
  try {
    await createGlobalDatabaseSnapshot(`Pré-Restauração do Ponto: ${snapshot.reason || snapshot.id}`, "auto");
  } catch (_) {}

  let restoredTenants = 0;
  let restoredUsers = 0;
  let restoredHistories = 0;
  let restoredPrompts = 0;

  const targetTenant = options?.targetTenantOnly;

  // 1. Restore Tenants
  if (Array.isArray(snapshot.data.tenants)) {
    for (const t of snapshot.data.tenants) {
      if (targetTenant && t.id !== targetTenant) continue;
      await setDoc(doc(db, 'tenants', t.id), cleanForFirestore(t), { merge: true });
      restoredTenants++;
    }
  }

  // 2. Restore Users
  if (Array.isArray(snapshot.data.users)) {
    for (const u of snapshot.data.users) {
      if (targetTenant && u.tenantId !== targetTenant) continue;
      await setDoc(doc(db, 'users', u.uid), cleanForFirestore(u), { merge: true });
      restoredUsers++;
    }
  }

  // 3. Restore Invites
  if (Array.isArray(snapshot.data.invites)) {
    for (const inv of snapshot.data.invites) {
      if (targetTenant && inv.tenantId !== targetTenant) continue;
      if (inv.email) {
        await setDoc(doc(db, 'invites', inv.email.toLowerCase()), cleanForFirestore(inv), { merge: true });
      }
    }
  }

  // 4. Restore Global Settings
  if (snapshot.data.globalSettings && !targetTenant) {
    for (const [sId, sData] of Object.entries(snapshot.data.globalSettings)) {
      await setDoc(doc(db, 'settings', sId), cleanForFirestore(sData), { merge: true });
    }
  }

  // 5. Restore Cabinet Partitions
  if (snapshot.data.gabinetesData) {
    for (const [tId, cab] of Object.entries(snapshot.data.gabinetesData)) {
      if (targetTenant && tId !== targetTenant) continue;

      // Profile
      if (cab.profile) {
        await setDoc(doc(db, `gabinetes/${tId}/settings`, 'profile'), cleanForFirestore(cab.profile), { merge: true });
      }

      // Units
      if (Array.isArray(cab.units) && cab.units.length > 0) {
        await setDoc(doc(db, `gabinetes/${tId}/settings`, 'units'), cleanForFirestore({ units: cab.units, updatedAt: new Date().toISOString() }), { merge: true });
      }

      // Calendar
      if (cab.calendarSettings) {
        await setDoc(doc(db, `gabinetes/${tId}/settings`, 'cabinet_calendar'), cleanForFirestore(cab.calendarSettings), { merge: true });
      }

      // Teses
      if (cab.teses) {
        for (const [uId, tData] of Object.entries(cab.teses)) {
          if (tData) {
            const docName = uId === 'montes_claros' ? 'teses' : `teses_${uId}`;
            await setDoc(doc(db, `gabinetes/${tId}/settings`, docName), cleanForFirestore(tData), { merge: true });
          }
        }
      }

      // Paradigms
      if (cab.paradigms) {
        for (const [uId, pList] of Object.entries(cab.paradigms)) {
          if (Array.isArray(pList)) {
            const docName = uId === 'montes_claros' ? 'judge_paradigms' : `judge_paradigms_${uId}`;
            await setDoc(doc(db, `gabinetes/${tId}/settings`, docName), cleanForFirestore({ paradigms: pList, tenant: tId, updatedAt: new Date().toISOString() }), { merge: true });
          }
        }
      }

      // ProjudiGuide
      if (cab.projudiGuide) {
        for (const [uId, gData] of Object.entries(cab.projudiGuide)) {
          if (gData) {
            const docName = uId === 'montes_claros' ? 'projudiGuide' : `projudiGuide_${uId}`;
            await setDoc(doc(db, `gabinetes/${tId}/settings`, docName), cleanForFirestore(gData), { merge: true });
          }
        }
      }

      // Prompts
      if (Array.isArray(cab.prompts)) {
        for (const p of cab.prompts) {
          await setDoc(doc(db, `gabinetes/${tId}/prompts`, p.id), cleanForFirestore({ ...p, tenant: tId }), { merge: true });
          restoredPrompts++;
        }
      }

      // History
      if (Array.isArray(cab.history)) {
        for (const h of cab.history) {
          await setDoc(doc(db, `gabinetes/${tId}/history`, h.id), cleanForFirestore({ ...h, tenant: tId }), { merge: true });
          restoredHistories++;
        }
      }

      // Knowledge
      if (Array.isArray(cab.knowledge)) {
        for (const k of cab.knowledge) {
          await setDoc(doc(db, `gabinetes/${tId}/knowledge`, k.id), cleanForFirestore({ ...k, tenant: tId }), { merge: true });
        }
      }

      // Audits
      if (Array.isArray(cab.audits)) {
        for (const a of cab.audits) {
          await setDoc(doc(db, `gabinetes/${tId}/audits`, a.id), cleanForFirestore({ ...a, tenant: tId }), { merge: true });
        }
      }
    }
  }

  return { restoredTenants, restoredUsers, restoredHistories, restoredPrompts };
};

/**
 * Script de Auto-Cura e Restauração dos Gabinetes (Dr. Rafael Machado, Dra. Júlia Vianna, etc.),
 * seus usuários, perfis, equipes, unidades e integridade de históricos.
 */
export const restoreAndHealDatabaseEntities = async (): Promise<{
  tenantsHealed: string[];
  usersHealed: string[];
  historyRescued: number;
  promptsRescued: number;
  message: string;
}> => {
  const tenantsHealed: string[] = [];
  const usersHealed: string[] = [];
  let historyRescued = 0;
  let promptsRescued = 0;

  // 1. Take safety snapshot before healing
  try {
    await autoPrePermissionChangeSnapshot("Execução do Script de Auto-Cura e Restauração de Gabinetes");
  } catch (_) {}

  // 2. Garante Gabinete Dr. Rafael Machado de Souza / Gabinete Principal
  const rafaelTenantData: SaaSTenant = {
    id: 'gab_rafael_machado',
    name: 'Gabinete Dr. Rafael Machado de Souza',
    ownerEmail: 'repeteco@gmail.com',
    createdAt: Date.now(),
    status: 'active',
    plan: 'magistrado',
    notes: 'Gabinete Judicial - Montes Claros e Fazenda Nova',
    maxUsers: 15
  };
  await setDoc(doc(db, 'tenants', 'gab_rafael_machado'), cleanForFirestore(rafaelTenantData), { merge: true });
  await setDoc(doc(db, 'tenants', 'gabinete_default'), cleanForFirestore({ ...rafaelTenantData, id: 'gabinete_default' }), { merge: true });
  
  await setDoc(doc(db, 'gabinetes/gab_rafael_machado/settings', 'profile'), {
    name: 'Gabinete Dr. Rafael Machado de Souza',
    ownerEmail: 'repeteco@gmail.com',
    createdAt: Date.now(),
    plan: 'magistrado'
  }, { merge: true });

  await setDoc(doc(db, 'gabinetes/gabinete_default/settings', 'profile'), {
    name: 'Gabinete Dr. Rafael Machado de Souza',
    ownerEmail: 'repeteco@gmail.com',
    createdAt: Date.now(),
    plan: 'magistrado'
  }, { merge: true });

  tenantsHealed.push("Gabinete Dr. Rafael Machado de Souza (gab_rafael_machado & gabinete_default)");

  // 3. Garante Gabinete Dra. Júlia Vianna
  const juliaTenantData: SaaSTenant = {
    id: 'gab_julia_vianna',
    name: 'Gabinete Dra. Júlia Vianna',
    ownerEmail: 'juliavianna.adv@gmail.com',
    createdAt: Date.now(),
    status: 'active',
    plan: 'magistrado',
    notes: 'Gabinete Judicial - Dra. Júlia Vianna',
    maxUsers: 10
  };
  await setDoc(doc(db, 'tenants', 'gab_julia_vianna'), cleanForFirestore(juliaTenantData), { merge: true });

  await setDoc(doc(db, 'gabinetes/gab_julia_vianna/settings', 'profile'), {
    name: 'Gabinete Dra. Júlia Vianna',
    ownerEmail: 'juliavianna.adv@gmail.com',
    createdAt: Date.now(),
    plan: 'magistrado'
  }, { merge: true });

  // Provision units for Dra. Júlia Vianna if not present
  const juliaUnitsSnap = await getDoc(doc(db, 'gabinetes/gab_julia_vianna/settings', 'units'));
  if (!juliaUnitsSnap.exists() || !juliaUnitsSnap.data().units || juliaUnitsSnap.data().units.length === 0) {
    const juliaUnits: JudicialUnit[] = [
      {
        id: 'vara_julia_vianna',
        name: '1ª Vara Cível / Gabinete Dra. Júlia Vianna',
        tenantId: 'gab_julia_vianna',
        tenantName: 'Gabinete Dra. Júlia Vianna'
      }
    ];
    await setDoc(doc(db, 'gabinetes/gab_julia_vianna/settings', 'units'), {
      units: juliaUnits,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  tenantsHealed.push("Gabinete Dra. Júlia Vianna (gab_julia_vianna)");

  // 4. Garante convites e integridade de usuários conhecidos
  await inviteUserToTenant('repeteco@gmail.com', 'gab_rafael_machado');
  await inviteUserToTenant('fabriciocunha.adv@gmail.com', 'gab_rafael_machado');
  await inviteUserToTenant('fabriciocunha.fazendanova@gmail.com', 'gab_rafael_machado');
  await inviteUserToTenant('juliavianna.adv@gmail.com', 'gab_julia_vianna');
  await inviteUserToTenant('juliavianna@gmail.com', 'gab_julia_vianna');

  // Varre usuários no banco para garantir correções de permissões
  const usersSnap = await getDocs(collection(db, 'users'));
  for (const uDoc of usersSnap.docs) {
    const u = uDoc.data() as UserProfile;
    const email = (u.email || '').toLowerCase();

    // Dr. Rafael Machado
    if (email === 'repeteco@gmail.com') {
      await setDoc(doc(db, 'users', uDoc.id), {
        tenantId: 'gab_rafael_machado',
        isJudge: true,
        judgeTitle: 'Magistrado Titular',
        role: 'admin',
        isActive: true,
        canUseNativeKey: true,
        isUnauthorized: false
      }, { merge: true });
      usersHealed.push(`Dr. Rafael Machado (${email})`);
    }

    // Dra. Júlia Vianna
    if (email.includes('juliavianna')) {
      await setDoc(doc(db, 'users', uDoc.id), {
        tenantId: 'gab_julia_vianna',
        isJudge: true,
        judgeTitle: 'Magistrada Titular',
        role: 'admin',
        isActive: true,
        canUseNativeKey: true,
        isUnauthorized: false
      }, { merge: true });
      usersHealed.push(`Dra. Júlia Vianna (${email})`);
    }

    // Super Admin / Master
    if (email === 'fabriciocunha.adv@gmail.com') {
      await setDoc(doc(db, 'users', uDoc.id), {
        tenantId: 'gab_rafael_machado',
        role: 'super_admin',
        isActive: true,
        canUseNativeKey: true,
        isUnauthorized: false
      }, { merge: true });
      usersHealed.push(`Super Admin Fabrício Cunha (${email})`);
    }
  }

  // 5. Reconciliação e Resgate de Históricos e Prompts Legados
  try {
    const rootHistSnap = await getDocs(collection(db, 'history'));
    for (const hDoc of rootHistSnap.docs) {
      const hData = hDoc.data();
      const targetTenant = hData.tenant || 'gab_rafael_machado';
      await setDoc(doc(db, `gabinetes/${targetTenant}/history`, hDoc.id), cleanForFirestore({
        ...hData,
        tenant: targetTenant,
        unitId: hData.unitId || 'montes_claros'
      }), { merge: true });
      historyRescued++;
    }
  } catch (_) {}

  try {
    const rootPromptsSnap = await getDocs(collection(db, 'prompts'));
    for (const pDoc of rootPromptsSnap.docs) {
      const pData = pDoc.data();
      const targetTenant = pData.tenant || 'gab_rafael_machado';
      await setDoc(doc(db, `gabinetes/${targetTenant}/prompts`, pDoc.id), cleanForFirestore({
        ...pData,
        tenant: targetTenant
      }), { merge: true });
      promptsRescued++;
    }
  } catch (_) {}

  const message = `Auto-Cura e Restauração concluídas! ${tenantsHealed.length} gabinetes estruturados, ${usersHealed.length} perfis atualizados, ${historyRescued} históricos e ${promptsRescued} prompts preservados.`;

  return {
    tenantsHealed,
    usersHealed,
    historyRescued,
    promptsRescued,
    message
  };
};

export interface DeepScanRescueReport {
  snapshotBeforeId: string;
  snapshotAfterId: string;
  rescuedTesesCount: number;
  rescuedParadigmsCount: number;
  rescuedProjudiGuidesCount: number;
  rescuedPromptsCount: number;
  rescuedHistoriesCount: number;
  rescuedUnitsCount: number;
  scannedTenants: string[];
  scannedSnapshotsCount: number;
  details: string[];
  message: string;
}

/**
 * Realiza uma varredura minuciosa e profunda em todo o Firestore (todas as partições de gabinetes,
 * coleções raiz legadas e histórico de snapshots arquivados) e resgata todos os cadastros
 * de teses, modelos/minutas paradigmas, guias de lançamento PROJUDI e gerenciador de prompts
 * para seus devidos lugares e partições de cada gabinete, salvando pontos de restauração de segurança antes e depois.
 */
export const deepScanAndRescueAllCabinetData = async (): Promise<DeepScanRescueReport> => {
  const details: string[] = [];
  let rescuedTesesCount = 0;
  let rescuedParadigmsCount = 0;
  let rescuedProjudiGuidesCount = 0;
  let rescuedPromptsCount = 0;
  let rescuedHistoriesCount = 0;
  let rescuedUnitsCount = 0;

  // 1. Criar Ponto de Restauração de Segurança antes da varredura
  const preSnap = await createGlobalDatabaseSnapshot("Backup de Segurança Pré-Varredura Profunda e Resgate de Cadastros", "auto");
  const snapshotBeforeId = preSnap?.id || `snap_${Date.now()}`;
  details.push(`Backup de segurança prévio gerado com sucesso (ID: ${snapshotBeforeId})`);

  // 2. Descobrir todos os gabinetes/tenants cadastrados
  const tenantIdsSet = new Set<string>(['gabinete_default', 'gab_rafael_machado', 'gab_julia_vianna']);
  try {
    const tSnap = await getDocs(collection(db, 'tenants'));
    tSnap.forEach(d => tenantIdsSet.add(d.id));
  } catch (e) {
    console.warn("Notice reading tenants:", e);
  }

  // 3. Varrer Snapshots Anteriores para encontrar dados salvos
  let scannedSnapshotsCount = 0;
  const snapshotsSnap = await getDocs(collection(db, 'system_snapshots'));
  scannedSnapshotsCount = snapshotsSnap.size;
  details.push(`Varrendo ${scannedSnapshotsCount} snapshots de segurança arquivados no sistema...`);

  // Mapas acumuladores por tenant e por unit
  const tesesMap = new Map<string, CabinetTesesData>();
  const paradigmsMap = new Map<string, Map<string, JudgeParadigmModel>>();
  const projudiMap = new Map<string, ProjudiGuideData>();
  const promptsMap = new Map<string, Map<string, CustomPrompt>>();
  const historyMap = new Map<string, Map<string, SavedAnalysis>>();
  const unitsMap = new Map<string, Map<string, JudicialUnit>>();

  const getPromptSubMap = (tId: string) => {
    if (!promptsMap.has(tId)) promptsMap.set(tId, new Map());
    return promptsMap.get(tId)!;
  };
  const getHistorySubMap = (tId: string) => {
    if (!historyMap.has(tId)) historyMap.set(tId, new Map());
    return historyMap.get(tId)!;
  };
  const getParadigmsSubMap = (tId: string, uId: string) => {
    const key = `${tId}:::${uId}`;
    if (!paradigmsMap.has(key)) paradigmsMap.set(key, new Map());
    return paradigmsMap.get(key)!;
  };
  const getUnitsSubMap = (tId: string) => {
    if (!unitsMap.has(tId)) unitsMap.set(tId, new Map());
    return unitsMap.get(tId)!;
  };

  // Process data from snapshots
  for (const sDoc of snapshotsSnap.docs) {
    const rawSnapObj = sDoc.data() as GlobalDatabaseSnapshot;
    const snapObj = (await fetchFullGlobalDatabaseSnapshot({ id: sDoc.id, ...rawSnapObj })) || rawSnapObj;
    if (!snapObj || !snapObj.data) continue;

    if (snapObj.data.gabinetesData) {
      for (const [tId, cab] of Object.entries(snapObj.data.gabinetesData)) {
        tenantIdsSet.add(tId);

        // Teses
        if (cab.teses) {
          for (const [uId, tData] of Object.entries(cab.teses)) {
            if (tData && tData.text && tData.text.trim()) {
              const key = `${tId}:::${uId}`;
              const existing = tesesMap.get(key);
              if (!existing || (tData.text.length > (existing.text?.length || 0))) {
                tesesMap.set(key, tData);
              }
            }
          }
        }

        // Paradigms
        if (cab.paradigms) {
          for (const [uId, pList] of Object.entries(cab.paradigms)) {
            if (Array.isArray(pList)) {
              const pSub = getParadigmsSubMap(tId, uId);
              pList.forEach(p => {
                const pKey = p.id || p.title;
                if (pKey && !pSub.has(pKey)) pSub.set(pKey, p);
              });
            }
          }
        }

        // ProjudiGuide
        if (cab.projudiGuide) {
          for (const [uId, gData] of Object.entries(cab.projudiGuide)) {
            if (gData && gData.text && gData.text.trim()) {
              const key = `${tId}:::${uId}`;
              const existing = projudiMap.get(key);
              if (!existing || (gData.text.length > (existing.text?.length || 0))) {
                projudiMap.set(key, gData);
              }
            }
          }
        }

        // Prompts
        if (Array.isArray(cab.prompts)) {
          const prSub = getPromptSubMap(tId);
          cab.prompts.forEach(p => {
            const prKey = p.id || p.title;
            if (prKey && !prSub.has(prKey)) prSub.set(prKey, p);
          });
        }

        // History
        if (Array.isArray(cab.history)) {
          const hSub = getHistorySubMap(tId);
          cab.history.forEach(h => {
            const hKey = h.id || h.processNumber;
            if (hKey && !hSub.has(hKey)) hSub.set(hKey, h);
          });
        }

        // Units
        if (Array.isArray(cab.units)) {
          const uSub = getUnitsSubMap(tId);
          cab.units.forEach(u => {
            if (u.id) uSub.set(u.id, u);
          });
        }
      }
    }
  }

  // 4. Varrer Coleções Raiz (Root collections: settings, prompts, history)
  try {
    const rootSettingsSnap = await getDocs(collection(db, 'settings'));
    rootSettingsSnap.forEach(d => {
      const docId = d.id;
      const data = d.data();
      const primaryTenant = 'gab_rafael_machado';

      if (docId.startsWith('teses')) {
        const uId = docId === 'teses' ? 'montes_claros' : docId.replace('teses_', '');
        if (data.text && data.text.trim()) {
          const key = `${primaryTenant}:::${uId}`;
          const existing = tesesMap.get(key);
          if (!existing || (data.text.length > (existing.text?.length || 0))) {
            tesesMap.set(key, data as CabinetTesesData);
          }
        }
      } else if (docId.startsWith('judge_paradigms')) {
        const uId = docId === 'judge_paradigms' ? 'montes_claros' : docId.replace('judge_paradigms_', '');
        if (Array.isArray(data.paradigms)) {
          const pSub = getParadigmsSubMap(primaryTenant, uId);
          data.paradigms.forEach((p: JudgeParadigmModel) => {
            const pKey = p.id || p.title;
            if (pKey && !pSub.has(pKey)) pSub.set(pKey, p);
          });
        }
      } else if (docId.startsWith('projudiGuide')) {
        const uId = docId === 'projudiGuide' ? 'montes_claros' : docId.replace('projudiGuide_', '');
        if (data.text && data.text.trim()) {
          const key = `${primaryTenant}:::${uId}`;
          const existing = projudiMap.get(key);
          if (!existing || (data.text.length > (existing.text?.length || 0))) {
            projudiMap.set(key, data as ProjudiGuideData);
          }
        }
      } else if (docId === 'units' && Array.isArray(data.units)) {
        const uSub = getUnitsSubMap(primaryTenant);
        data.units.forEach((u: JudicialUnit) => {
          if (u.id) uSub.set(u.id, u);
        });
      }
    });
  } catch (e) {
    console.warn("Notice scanning root settings:", e);
  }

  // Root Prompts
  try {
    const rootPromptsSnap = await getDocs(collection(db, 'prompts'));
    rootPromptsSnap.forEach(d => {
      const pData = d.data() as any;
      const tId = pData.tenant || 'gab_rafael_machado';
      const prSub = getPromptSubMap(tId);
      const prKey = pData.id || d.id || pData.title;
      if (prKey && !prSub.has(prKey)) prSub.set(prKey, { ...pData, id: d.id });
    });
  } catch (e) {
    console.warn("Notice scanning root prompts:", e);
  }

  // Root History
  try {
    const rootHistSnap = await getDocs(collection(db, 'history'));
    rootHistSnap.forEach(d => {
      const hData = d.data() as any;
      const tId = hData.tenant || 'gab_rafael_machado';
      const hSub = getHistorySubMap(tId);
      const hKey = hData.id || d.id;
      if (hKey && !hSub.has(hKey)) hSub.set(hKey, { ...hData, id: d.id });
    });
  } catch (e) {
    console.warn("Notice scanning root history:", e);
  }

  // 5. Varrer todas as partições gabinetes/{tenantId}
  const allTenantsList = Array.from(tenantIdsSet);
  for (const tId of allTenantsList) {
    try {
      // settings
      const settingsSnap = await getDocs(collection(db, `gabinetes/${tId}/settings`));
      settingsSnap.forEach(d => {
        const docId = d.id;
        const data = d.data();

        if (docId.startsWith('teses')) {
          const uId = docId === 'teses' ? 'montes_claros' : docId.replace('teses_', '');
          if (data.text && data.text.trim()) {
            const key = `${tId}:::${uId}`;
            const existing = tesesMap.get(key);
            if (!existing || (data.text.length > (existing.text?.length || 0))) {
              tesesMap.set(key, data as CabinetTesesData);
            }
          }
        } else if (docId.startsWith('judge_paradigms')) {
          const uId = docId === 'judge_paradigms' ? 'montes_claros' : docId.replace('judge_paradigms_', '');
          if (Array.isArray(data.paradigms)) {
            const pSub = getParadigmsSubMap(tId, uId);
            data.paradigms.forEach((p: JudgeParadigmModel) => {
              const pKey = p.id || p.title;
              if (pKey && !pSub.has(pKey)) pSub.set(pKey, p);
            });
          }
        } else if (docId.startsWith('projudiGuide')) {
          const uId = docId === 'projudiGuide' ? 'montes_claros' : docId.replace('projudiGuide_', '');
          if (data.text && data.text.trim()) {
            const key = `${tId}:::${uId}`;
            const existing = projudiMap.get(key);
            if (!existing || (data.text.length > (existing.text?.length || 0))) {
              projudiMap.set(key, data as ProjudiGuideData);
            }
          }
        } else if (docId === 'units' && Array.isArray(data.units)) {
          const uSub = getUnitsSubMap(tId);
          data.units.forEach((u: JudicialUnit) => {
            if (u.id) uSub.set(u.id, u);
          });
        }
      });

      // prompts
      const promptsSnap = await getDocs(collection(db, `gabinetes/${tId}/prompts`));
      promptsSnap.forEach(d => {
        const pData = d.data() as CustomPrompt;
        const prSub = getPromptSubMap(tId);
        const prKey = pData.id || d.id || pData.title;
        if (prKey && !prSub.has(prKey)) prSub.set(prKey, { ...pData, id: d.id });
      });

      // history
      const histSnap = await getDocs(collection(db, `gabinetes/${tId}/history`));
      histSnap.forEach(d => {
        const hData = d.data() as SavedAnalysis;
        const hSub = getHistorySubMap(tId);
        const hKey = hData.id || d.id;
        if (hKey && !hSub.has(hKey)) hSub.set(hKey, { ...hData, id: d.id });
      });

    } catch (e) {
      console.warn(`Notice scanning partition ${tId}:`, e);
    }
  }

  // 6. Efetivar Gravação e Sincronização nos Gabinetes de Destino
  details.push("Consolidando e gravando registros nos seus devidos lugares...");

  const primaryAliases = ['gab_rafael_machado', 'gabinete_default'];

  // A) Teses
  for (const [key, tData] of tesesMap.entries()) {
    const [tId, uId] = key.split(':::');
    const docName = uId === 'montes_claros' ? 'teses' : `teses_${uId}`;
    
    if (isPrimaryCabinet(tId)) {
      for (const pAlias of primaryAliases) {
        await setDoc(doc(db, `gabinetes/${pAlias}/settings`, docName), cleanForFirestore({
          ...tData,
          tenant: pAlias,
          updatedAt: tData.updatedAt || new Date().toISOString()
        }), { merge: true });
        rescuedTesesCount++;
      }
      await setDoc(doc(db, 'settings', docName), cleanForFirestore(tData), { merge: true });
    } else {
      await setDoc(doc(db, `gabinetes/${tId}/settings`, docName), cleanForFirestore({
        ...tData,
        tenant: tId,
        updatedAt: tData.updatedAt || new Date().toISOString()
      }), { merge: true });
      rescuedTesesCount++;
    }
  }

  // B) Modelos / Minutas Paradigmas
  for (const [key, pSubMap] of paradigmsMap.entries()) {
    const [tId, uId] = key.split(':::');
    const docName = uId === 'montes_claros' ? 'judge_paradigms' : `judge_paradigms_${uId}`;
    const paradigmsArray = Array.from(pSubMap.values());

    if (isPrimaryCabinet(tId)) {
      for (const pAlias of primaryAliases) {
        await setDoc(doc(db, `gabinetes/${pAlias}/settings`, docName), cleanForFirestore({
          paradigms: paradigmsArray,
          tenant: pAlias,
          updatedAt: new Date().toISOString()
        }), { merge: true });
        rescuedParadigmsCount += paradigmsArray.length;
      }
      await setDoc(doc(db, 'settings', docName), cleanForFirestore({
        paradigms: paradigmsArray,
        updatedAt: new Date().toISOString()
      }), { merge: true });
    } else {
      await setDoc(doc(db, `gabinetes/${tId}/settings`, docName), cleanForFirestore({
        paradigms: paradigmsArray,
        tenant: tId,
        updatedAt: new Date().toISOString()
      }), { merge: true });
      rescuedParadigmsCount += paradigmsArray.length;
    }
  }

  // C) Guia PROJUDI
  for (const [key, gData] of projudiMap.entries()) {
    const [tId, uId] = key.split(':::');
    const docName = uId === 'montes_claros' ? 'projudiGuide' : `projudiGuide_${uId}`;

    if (isPrimaryCabinet(tId)) {
      for (const pAlias of primaryAliases) {
        await setDoc(doc(db, `gabinetes/${pAlias}/settings`, docName), cleanForFirestore({
          ...gData,
          tenant: pAlias,
          updatedAt: gData.updatedAt || new Date().toISOString()
        }), { merge: true });
        rescuedProjudiGuidesCount++;
      }
      await setDoc(doc(db, 'settings', docName), cleanForFirestore(gData), { merge: true });
    } else {
      await setDoc(doc(db, `gabinetes/${tId}/settings`, docName), cleanForFirestore({
        ...gData,
        tenant: tId,
        updatedAt: gData.updatedAt || new Date().toISOString()
      }), { merge: true });
      rescuedProjudiGuidesCount++;
    }
  }

  // D) Gerenciador de Prompts
  for (const [tId, prSubMap] of promptsMap.entries()) {
    const promptList = Array.from(prSubMap.values());
    if (isPrimaryCabinet(tId)) {
      for (const p of promptList) {
        for (const pAlias of primaryAliases) {
          await setDoc(doc(db, `gabinetes/${pAlias}/prompts`, p.id), cleanForFirestore({
            ...p,
            tenant: pAlias
          }), { merge: true });
          rescuedPromptsCount++;
        }
        await setDoc(doc(db, 'prompts', p.id), cleanForFirestore(p), { merge: true });
      }
    } else {
      for (const p of promptList) {
        await setDoc(doc(db, `gabinetes/${tId}/prompts`, p.id), cleanForFirestore({
          ...p,
          tenant: tId
        }), { merge: true });
        rescuedPromptsCount++;
      }
    }
  }

  // E) Históricos de Minutas
  for (const [tId, hSubMap] of historyMap.entries()) {
    const historyList = Array.from(hSubMap.values());
    if (isPrimaryCabinet(tId)) {
      for (const h of historyList) {
        for (const pAlias of primaryAliases) {
          await setDoc(doc(db, `gabinetes/${pAlias}/history`, h.id), cleanForFirestore({
            ...h,
            tenant: pAlias
          }), { merge: true });
          rescuedHistoriesCount++;
        }
        await setDoc(doc(db, 'history', h.id), cleanForFirestore(h), { merge: true });
      }
    } else {
      for (const h of historyList) {
        await setDoc(doc(db, `gabinetes/${tId}/history`, h.id), cleanForFirestore({
          ...h,
          tenant: tId
        }), { merge: true });
        rescuedHistoriesCount++;
      }
    }
  }

  // F) Lotações / Unidades
  for (const [tId, uSubMap] of unitsMap.entries()) {
    const unitsList = Array.from(uSubMap.values());
    if (unitsList.length > 0) {
      if (isPrimaryCabinet(tId)) {
        for (const pAlias of primaryAliases) {
          await setDoc(doc(db, `gabinetes/${pAlias}/settings`, 'units'), cleanForFirestore({
            units: unitsList,
            updatedAt: new Date().toISOString()
          }), { merge: true });
          rescuedUnitsCount += unitsList.length;
        }
        await setDoc(doc(db, 'settings', 'units'), cleanForFirestore({ units: unitsList }), { merge: true });
      } else {
        await setDoc(doc(db, `gabinetes/${tId}/settings`, 'units'), cleanForFirestore({
          units: unitsList,
          updatedAt: new Date().toISOString()
        }), { merge: true });
        rescuedUnitsCount += unitsList.length;
      }
    }
  }

  // 7. Salvar Ponto de Restauração Pós-Varredura
  const postSnap = await createGlobalDatabaseSnapshot(
    `Ponto de Restauração Pós-Varredura Profunda: ${rescuedTesesCount} teses, ${rescuedParadigmsCount} modelos, ${rescuedProjudiGuidesCount} guias, ${rescuedPromptsCount} prompts resgatados`,
    "auto"
  );
  const snapshotAfterId = postSnap?.id || `snap_${Date.now()}`;
  details.push(`Novo Ponto de Restauração Pós-Varredura gerado e salvo com sucesso (ID: ${snapshotAfterId})`);

  const message = `Varredura Profunda concluída com sucesso! Varremos ${scannedSnapshotsCount} snapshots e todas as partições do banco. ` +
    `Foram resgatados e consolidados nos seus devidos lugares: ` +
    `cadernos de teses (${rescuedTesesCount}), modelos de minutas paradigmas (${rescuedParadigmsCount}), ` +
    `guias de lançamento PROJUDI (${rescuedProjudiGuidesCount}), prompts personalizados (${rescuedPromptsCount}) e históricos de análises (${rescuedHistoriesCount}). ` +
    `Um snapshot de backup prévio e um snapshot pós-varredura foram arquivados para total segurança.`;

  return {
    snapshotBeforeId,
    snapshotAfterId,
    rescuedTesesCount,
    rescuedParadigmsCount,
    rescuedProjudiGuidesCount,
    rescuedPromptsCount,
    rescuedHistoriesCount,
    rescuedUnitsCount,
    scannedTenants: allTenantsList,
    scannedSnapshotsCount,
    details,
    message
  };
};

/* ========================================================================== */
/*                TELEMETRIA DE TOKENS E CONSUMO DE COTA (SUPER ADMIN)        */
/* ========================================================================== */

export const getAllCabinetMonthlyUsage = async (monthKey?: string): Promise<CabinetMonthlyTokenUsage[]> => {
  if (!auth.currentUser) return [];
  const targetMonth = monthKey || new Date().toISOString().slice(0, 7); // "YYYY-MM"
  try {
    const list: CabinetMonthlyTokenUsage[] = [];
    const tenantMap = new Map<string, string>();

    // 1. Tenants cadastrados na coleção 'tenants'
    try {
      const tenantsSnap = await getDocs(collection(db, 'tenants'));
      tenantsSnap.docs.forEach(d => {
        const data = d.data() as SaaSTenant;
        tenantMap.set(d.id, data.name || d.id);
      });
    } catch (_) {}

    // 2. Gabinetes conhecidos do sistema
    if (!tenantMap.has('gab_rafael_machado')) {
      tenantMap.set('gab_rafael_machado', 'Gabinete Dr. Rafael Machado');
    }
    if (!tenantMap.has('gabinete_default')) {
      tenantMap.set('gabinete_default', 'Gabinete Padrão');
    }

    // 3. Gabinetes vinculados a usuários cadastrados
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.docs.forEach(uDoc => {
        const uData = uDoc.data();
        if (uData.tenantId && !tenantMap.has(uData.tenantId) && uData.tenantId !== 'unassigned') {
          tenantMap.set(uData.tenantId, `Gabinete (${uData.tenantId})`);
        }
      });
    } catch (_) {}
    
    for (const [tenantId, tenantName] of tenantMap.entries()) {
      const usageDocRef = doc(db, 'gabinetes', tenantId, 'token_usage', targetMonth);
      const usageSnap = await getDoc(usageDocRef);
      
      if (usageSnap.exists()) {
        const uData = usageSnap.data();
        list.push({
          id: usageSnap.id,
          monthKey: targetMonth,
          tenantId,
          tenantName,
          totalTokens: uData.totalTokens || 0,
          promptTokens: uData.promptTokens || 0,
          candidatesTokens: uData.candidatesTokens || 0,
          requestCount: uData.requestCount || 0,
          lastUsedAt: uData.lastUsedAt || 0,
          users: uData.users || {}
        });
      } else {
        // Gabinete sem consumo registrado no mês
        list.push({
          id: targetMonth,
          monthKey: targetMonth,
          tenantId,
          tenantName,
          totalTokens: 0,
          promptTokens: 0,
          candidatesTokens: 0,
          requestCount: 0,
          lastUsedAt: 0,
          users: {}
        });
      }
    }
    return list;
  } catch (err) {
    console.warn("Erro ao buscar métricas de uso de tokens:", err);
    return [];
  }
};

/**
 * Tabela de Precificação Oficial Google Gemini Flash (AI Studio & Google Cloud Vertex)
 * - Entrada (Prompt): ~$0.13 / 1M tokens (ponderado para peças jurídicas com anexos e autos volumosos)
 * - Saída (Candidatos): ~$0.50 / 1M tokens (minutas, despachos e sentenças completas)
 * - Cotação de Câmbio de Referência (USD -> BRL com tributação/IOF): R$ 5,65
 */
export interface TokenCostEstimate {
  usdTotal: number;
  brlTotal: number;
  formattedBrl: string;
}

export const calculateTokenCostBRL = (
  promptTokens: number = 0,
  candidatesTokens: number = 0,
  totalTokens: number = 0
): TokenCostEstimate => {
  let p = promptTokens || 0;
  let c = candidatesTokens || 0;
  const t = totalTokens || (p + c);

  if (p === 0 && c === 0 && t > 0) {
    p = Math.round(t * 0.90);
    c = Math.round(t * 0.10);
  }

  const usdInput = (p / 1_000_000) * 0.13;
  const usdOutput = (c / 1_000_000) * 0.50;
  const usdTotal = usdInput + usdOutput;
  const brlTotal = usdTotal * 5.65;

  return {
    usdTotal,
    brlTotal,
    formattedBrl: brlTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  };
};

export const recordTokenUsageToDb = async (usageData: {
  tenantId: string;
  userEmail: string;
  userName?: string;
  totalTokens: number;
  promptTokens: number;
  candidatesTokens: number;
  keyMode?: "native" | "custom";
  activeKeyLabel?: string;
  activeKeySnippet?: string;
  poolSize?: number;
  rotationsCount?: number;
  lastRotationAt?: number;
  lastRotationReason?: string;
  userId?: string;
  module?: ExecutionModuleType;
  costBrl?: number;
}): Promise<void> => {
  try {
    const tId = usageData.tenantId || globalTenantId || 'gabinete_default';
    const email = usageData.userEmail || auth.currentUser?.email || 'desconhecido@tribunal';
    const name = usageData.userName || auth.currentUser?.displayName || email.split('@')[0] || 'Usuário';
    const monthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const docRef = doc(db, 'gabinetes', tId, 'token_usage', monthKey);
    
    const snap = await getDoc(docRef);
    const now = Date.now();
    
    // Normalizar chave do usuário sem pontos e caracteres inválidos para o objeto
    const sanitizedEmailKey = email.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
    
    let userDailyRequests = 1;
    let prevRotations = usageData.rotationsCount || 0;
    let prevLastRotationAt: number | null = usageData.lastRotationAt || null;
    let prevLastRotationReason: string | null = usageData.lastRotationReason || null;

    const moduleKey: ExecutionModuleType = usageData.module || 'outros';
    const itemCostBrl = usageData.costBrl !== undefined 
      ? usageData.costBrl 
      : calculateTokenCostBRL(usageData.promptTokens, usageData.candidatesTokens, usageData.totalTokens).brlTotal;

    if (snap.exists()) {
      const existing = snap.data();
      const existingUsers = existing.users || {};
      const userStats = existingUsers[sanitizedEmailKey] || {
        userEmail: email,
        userName: name,
        totalTokens: 0,
        promptTokens: 0,
        candidatesTokens: 0,
        requestCount: 0,
        lastUsedAt: 0,
      };

      userDailyRequests = userStats.dailyDate === todayStr ? (userStats.dailyRequests || 0) + 1 : 1;
      prevRotations = usageData.rotationsCount !== undefined ? usageData.rotationsCount : (userStats.rotationsCount || 0);
      prevLastRotationAt = usageData.lastRotationAt || userStats.lastRotationAt || null;
      prevLastRotationReason = usageData.lastRotationReason || userStats.lastRotationReason || null;

      // Atualizar estatísticas de módulos do usuário
      const existingUserModules = userStats.modules || {};
      const userMod = existingUserModules[moduleKey] || {
        totalTokens: 0,
        promptTokens: 0,
        candidatesTokens: 0,
        requestCount: 0,
        costBrl: 0,
      };
      const updatedUserModules = {
        ...existingUserModules,
        [moduleKey]: {
          totalTokens: (userMod.totalTokens || 0) + (usageData.totalTokens || 0),
          promptTokens: (userMod.promptTokens || 0) + (usageData.promptTokens || 0),
          candidatesTokens: (userMod.candidatesTokens || 0) + (usageData.candidatesTokens || 0),
          requestCount: (userMod.requestCount || 0) + 1,
          costBrl: Number(((userMod.costBrl || 0) + itemCostBrl).toFixed(4)),
        }
      };

      // Atualizar estatísticas de módulos do gabinete
      const existingCabModules = existing.modules || {};
      const cabMod = existingCabModules[moduleKey] || {
        totalTokens: 0,
        promptTokens: 0,
        candidatesTokens: 0,
        requestCount: 0,
        costBrl: 0,
      };
      const updatedCabModules = {
        ...existingCabModules,
        [moduleKey]: {
          totalTokens: (cabMod.totalTokens || 0) + (usageData.totalTokens || 0),
          promptTokens: (cabMod.promptTokens || 0) + (usageData.promptTokens || 0),
          candidatesTokens: (cabMod.candidatesTokens || 0) + (usageData.candidatesTokens || 0),
          requestCount: (cabMod.requestCount || 0) + 1,
          costBrl: Number(((cabMod.costBrl || 0) + itemCostBrl).toFixed(4)),
        }
      };

      const updatedUser = {
        userEmail: email,
        userName: name || userStats.userName,
        totalTokens: (userStats.totalTokens || 0) + (usageData.totalTokens || 0),
        promptTokens: (userStats.promptTokens || 0) + (usageData.promptTokens || 0),
        candidatesTokens: (userStats.candidatesTokens || 0) + (usageData.candidatesTokens || 0),
        requestCount: (userStats.requestCount || 0) + 1,
        lastUsedAt: now,
        keyMode: usageData.keyMode || userStats.keyMode || 'custom',
        activeKeyLabel: usageData.activeKeyLabel || userStats.activeKeyLabel || 'Chave 1',
        activeKeySnippet: usageData.activeKeySnippet || userStats.activeKeySnippet || '',
        poolSize: usageData.poolSize !== undefined ? usageData.poolSize : (userStats.poolSize || 1),
        rotationsCount: prevRotations,
        dailyRequests: userDailyRequests,
        dailyDate: todayStr,
        lastRotationAt: prevLastRotationAt,
        lastRotationReason: prevLastRotationReason,
        modules: updatedUserModules,
      };

      const updatedDoc = cleanForFirestore({
        monthKey,
        tenantId: tId,
        totalTokens: (existing.totalTokens || 0) + (usageData.totalTokens || 0),
        promptTokens: (existing.promptTokens || 0) + (usageData.promptTokens || 0),
        candidatesTokens: (existing.candidatesTokens || 0) + (usageData.candidatesTokens || 0),
        requestCount: (existing.requestCount || 0) + 1,
        lastUsedAt: now,
        modules: updatedCabModules,
        users: {
          ...existingUsers,
          [sanitizedEmailKey]: updatedUser
        }
      });

      await setDoc(docRef, updatedDoc, { merge: true });
    } else {
      const initialDoc = cleanForFirestore({
        monthKey,
        tenantId: tId,
        totalTokens: usageData.totalTokens || 0,
        promptTokens: usageData.promptTokens || 0,
        candidatesTokens: usageData.candidatesTokens || 0,
        requestCount: 1,
        lastUsedAt: now,
        modules: {
          [moduleKey]: {
            totalTokens: usageData.totalTokens || 0,
            promptTokens: usageData.promptTokens || 0,
            candidatesTokens: usageData.candidatesTokens || 0,
            requestCount: 1,
            costBrl: Number(itemCostBrl.toFixed(4)),
          }
        },
        users: {
          [sanitizedEmailKey]: {
            userEmail: email,
            userName: name,
            totalTokens: usageData.totalTokens || 0,
            promptTokens: usageData.promptTokens || 0,
            candidatesTokens: usageData.candidatesTokens || 0,
            requestCount: 1,
            lastUsedAt: now,
            keyMode: usageData.keyMode || 'custom',
            activeKeyLabel: usageData.activeKeyLabel || 'Chave 1',
            activeKeySnippet: usageData.activeKeySnippet || '',
            poolSize: usageData.poolSize !== undefined ? usageData.poolSize : 1,
            rotationsCount: prevRotations,
            dailyRequests: 1,
            dailyDate: todayStr,
            lastRotationAt: prevLastRotationAt,
            lastRotationReason: prevLastRotationReason,
            modules: {
              [moduleKey]: {
                totalTokens: usageData.totalTokens || 0,
                promptTokens: usageData.promptTokens || 0,
                candidatesTokens: usageData.candidatesTokens || 0,
                requestCount: 1,
                costBrl: Number(itemCostBrl.toFixed(4)),
              }
            }
          }
        }
      });

      await setDoc(docRef, initialDoc);
    }

    // Sincronizar também no perfil individual do usuário em users/{uid}
    const uid = usageData.userId || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', uid), cleanForFirestore({
          keyTelemetry: {
            keyMode: usageData.keyMode || 'custom',
            activeKeyLabel: usageData.activeKeyLabel || 'Chave 1',
            activeKeySnippet: usageData.activeKeySnippet || '',
            poolSize: usageData.poolSize !== undefined ? usageData.poolSize : 1,
            rotationsCount: prevRotations,
            dailyRequests: userDailyRequests,
            dailyDate: todayStr,
            lastRotationAt: prevLastRotationAt,
            lastRotationReason: prevLastRotationReason,
            lastUsedAt: now,
          },
          updatedAt: new Date().toISOString()
        }), { merge: true });
      } catch (userErr) {
        console.warn("[TokenTelemetry] Aviso ao sincronizar keyTelemetry no usuário:", userErr);
      }
    }
  } catch (err) {
    console.warn("[TokenTelemetry] Falha ao registrar uso de tokens no Firestore:", err);
  }
};

/**
 * Registra um evento de rotação de chaves por erro de cota (429) no Firestore
 */
export const recordKeyRotationEventToDb = async (eventData: {
  userId?: string;
  userEmail?: string;
  tenantId?: string;
  newKeyLabel?: string;
  newKeySnippet?: string;
  reason?: string;
}): Promise<void> => {
  try {
    let uid = eventData.userId || auth.currentUser?.uid;
    let email = (eventData.userEmail || auth.currentUser?.email || '').toLowerCase().trim();
    const tId = eventData.tenantId || globalTenantId || 'gabinete_default';
    const monthKey = new Date().toISOString().slice(0, 7);
    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);

    // Se temos email mas não temos uid, buscar uid
    if (!uid && email) {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        for (const uDoc of usersSnap.docs) {
          const uD = uDoc.data();
          if ((uD.email || '').toLowerCase().trim() === email) {
            uid = uDoc.id;
            break;
          }
        }
      } catch (_) {}
    }

    // Se temos uid mas não temos email, buscar email
    if (uid && !email) {
      try {
        const uSnap = await getDoc(doc(db, 'users', uid));
        if (uSnap.exists()) {
          email = (uSnap.data().email || '').toLowerCase().trim();
        }
      } catch (_) {}
    }

    // 1. Atualizar no perfil do usuário users/{uid}
    if (uid) {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        const existingTelem = uData.keyTelemetry || {};
        const currentRotations = (existingTelem.rotationsCount || 0) + 1;
        await setDoc(userRef, cleanForFirestore({
          keyTelemetry: {
            ...existingTelem,
            rotationsCount: currentRotations,
            lastRotationAt: now,
            lastRotationReason: eventData.reason || 'Cota esgotada (Erro 429) - Failover automático',
            activeKeyLabel: eventData.newKeyLabel || existingTelem.activeKeyLabel || 'Chave Reserva',
            activeKeySnippet: eventData.newKeySnippet || existingTelem.activeKeySnippet || ''
          },
          updatedAt: new Date().toISOString()
        }), { merge: true });
        console.log(`[TokenTelemetry] Rotação registrada para usuário ${uid} (${email}): ${currentRotations} rotações.`);
      }
    }

    // 2. Atualizar em gabinetes/{tenantId}/token_usage/{monthKey}
    if (email && tId) {
      const sanitizedKey = email.replace(/[^a-zA-Z0-9_-]/g, '_');
      const docRef = doc(db, 'gabinetes', tId, 'token_usage', monthKey);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const uData = snap.data();
        const existingUsers = uData.users || {};
        const userObj = existingUsers[sanitizedKey] || {
          userEmail: email,
          userName: email.split('@')[0],
          totalTokens: 0,
          promptTokens: 0,
          candidatesTokens: 0,
          requestCount: 0,
          lastUsedAt: now,
          keyMode: 'custom',
          activeKeyLabel: eventData.newKeyLabel || 'Chave Reserva',
          activeKeySnippet: eventData.newKeySnippet || '',
          poolSize: 1,
          rotationsCount: 0,
          dailyRequests: 0,
          dailyDate: todayStr,
        };
        userObj.rotationsCount = (userObj.rotationsCount || 0) + 1;
        userObj.lastRotationAt = now;
        userObj.lastRotationReason = eventData.reason || 'Cota esgotada (Erro 429) - Failover automático';
        if (eventData.newKeyLabel) userObj.activeKeyLabel = eventData.newKeyLabel;
        if (eventData.newKeySnippet) userObj.activeKeySnippet = eventData.newKeySnippet;
        await setDoc(docRef, cleanForFirestore({
          users: {
            ...existingUsers,
            [sanitizedKey]: userObj
          }
        }), { merge: true });
        console.log(`[TokenTelemetry] Rotação registrada em gabinete ${tId} para ${sanitizedKey}: ${userObj.rotationsCount} rotações.`);
      } else {
        const initialUserObj = {
          userEmail: email,
          userName: email.split('@')[0],
          totalTokens: 0,
          promptTokens: 0,
          candidatesTokens: 0,
          requestCount: 0,
          lastUsedAt: now,
          keyMode: 'custom',
          activeKeyLabel: eventData.newKeyLabel || 'Chave Reserva',
          activeKeySnippet: eventData.newKeySnippet || '',
          poolSize: 1,
          rotationsCount: 1,
          dailyRequests: 0,
          dailyDate: todayStr,
          lastRotationAt: now,
          lastRotationReason: eventData.reason || 'Cota esgotada (Erro 429) - Failover automático'
        };
        await setDoc(docRef, cleanForFirestore({
          monthKey,
          tenantId: tId,
          totalTokens: 0,
          promptTokens: 0,
          candidatesTokens: 0,
          requestCount: 0,
          lastUsedAt: now,
          users: {
            [sanitizedKey]: initialUserObj
          }
        }));
        console.log(`[TokenTelemetry] Novo doc de token_usage criado em ${tId} para ${monthKey} com 1 rotação.`);
      }
    }
  } catch (err) {
    console.warn("[TokenTelemetry] Erro ao registrar evento de rotação de chave:", err);
  }
};

export interface RetroactiveImportResult {
  totalRecordsProcessed: number;
  totalTokensImported: number;
  cabinetsUpdated: number;
  monthsAffected: string[];
}

export const importPastTokenUsageHistory = async (): Promise<RetroactiveImportResult> => {
  if (!auth.currentUser) throw new Error("Usuário não autenticado");

  // 1. Obter lista de todos os tenants cadastrados
  const tenantsSnap = await getDocs(collection(db, 'tenants'));
  const tenantIds: string[] = tenantsSnap.docs.map(d => d.id);
  
  if (!tenantIds.includes('gab_rafael_machado')) {
    tenantIds.push('gab_rafael_machado');
  }

  // 2. Obter mapa de usuários para associar e-mails a nomes reais caso o registro histórico esteja sem nome
  const usersSnap = await getDocs(collection(db, 'users'));
  const usersByTenant: Record<string, { email: string; name: string }[]> = {};
  usersSnap.forEach(uDoc => {
    const u = uDoc.data();
    const tId = u.tenantId || 'gab_rafael_machado';
    if (!usersByTenant[tId]) usersByTenant[tId] = [];
    const email = (u.email || (uDoc.id.includes('@') ? uDoc.id : '')).toLowerCase().trim();
    const name = u.name || u.displayName || email.split('@')[0] || 'Assessor';
    if (email) {
      usersByTenant[tId].push({ email, name });
    }
  });

  let totalRecordsProcessed = 0;
  let totalTokensImported = 0;
  const affectedMonthsSet = new Set<string>();
  const cabinetsUpdatedSet = new Set<string>();
  const processedDocIds = new Set<string>();

  for (const tenantId of tenantIds) {
    const isPrimary = isPrimaryCabinet(tenantId);
    
    // Objeto temporário agrupado por mês para este gabinete
    const monthAggregates: Record<string, {
      totalTokens: number;
      promptTokens: number;
      candidatesTokens: number;
      requestCount: number;
      lastUsedAt: number;
      modules: Partial<Record<ExecutionModuleType, ModuleTokenUsageStats>>;
      users: Record<string, {
        userEmail: string;
        userName: string;
        totalTokens: number;
        promptTokens: number;
        candidatesTokens: number;
        requestCount: number;
        lastUsedAt: number;
        modules?: Partial<Record<ExecutionModuleType, ModuleTokenUsageStats>>;
      }>;
    }> = {};

    const helperAddUsage = (
      docId: string,
      dateVal: number | string | undefined,
      pTokens: number,
      cTokens: number,
      tTokens: number,
      userEmail?: string,
      userName?: string,
      moduleType?: ExecutionModuleType
    ) => {
      if (docId && processedDocIds.has(docId)) return;
      if (docId) processedDocIds.add(docId);

      let ts = Date.now();
      if (typeof dateVal === 'number' && !isNaN(dateVal) && dateVal > 0) {
        ts = dateVal;
      } else if (typeof dateVal === 'string') {
        const parsed = new Date(dateVal).getTime();
        if (!isNaN(parsed) && parsed > 0) ts = parsed;
      }

      const dateObj = new Date(ts);
      const monthKey = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7);
      affectedMonthsSet.add(monthKey);

      let email = (userEmail || '').trim().toLowerCase();
      let name = (userName || '').trim();

      if (!email) {
        const tUsers = usersByTenant[tenantId] || [];
        if (tUsers.length > 0) {
          email = tUsers[0].email;
          name = name || tUsers[0].name;
        } else {
          email = 'assessor@tribunal';
          name = name || 'Assessor';
        }
      }

      const sanitizedEmailKey = email.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');

      // Detectar módulo automaticamente se não especificado
      let mod: ExecutionModuleType = moduleType || 'minuta';
      if (!moduleType) {
        const idLower = docId.toLowerCase();
        if (idLower.includes('audienc') || idLower.includes('hearing') || idLower.includes('ata')) {
          mod = 'audiencia';
        } else if (idLower.includes('audit') || idLower.includes('lupa')) {
          mod = 'lupa_magistrado';
        } else if (idLower.includes('chat') || idLower.includes('reescrit') || idLower.includes('agaia')) {
          mod = 'chat_refino';
        } else {
          mod = 'minuta';
        }
      }

      const costEst = calculateTokenCostBRL(pTokens, cTokens, tTokens).brlTotal;

      if (!monthAggregates[monthKey]) {
        monthAggregates[monthKey] = {
          totalTokens: 0,
          promptTokens: 0,
          candidatesTokens: 0,
          requestCount: 0,
          lastUsedAt: 0,
          modules: {},
          users: {}
        };
      }

      const m = monthAggregates[monthKey];
      m.totalTokens += tTokens;
      m.promptTokens += pTokens;
      m.candidatesTokens += cTokens;
      m.requestCount += 1;
      if (ts > m.lastUsedAt) m.lastUsedAt = ts;

      // Atualiza módulos no gabinete
      if (!m.modules[mod]) {
        m.modules[mod] = { totalTokens: 0, promptTokens: 0, candidatesTokens: 0, requestCount: 0, costBrl: 0 };
      }
      m.modules[mod]!.totalTokens += tTokens;
      m.modules[mod]!.promptTokens += pTokens;
      m.modules[mod]!.candidatesTokens += cTokens;
      m.modules[mod]!.requestCount += 1;
      m.modules[mod]!.costBrl = Number(((m.modules[mod]!.costBrl || 0) + costEst).toFixed(4));

      if (!m.users[sanitizedEmailKey]) {
        m.users[sanitizedEmailKey] = {
          userEmail: email,
          userName: name || email.split('@')[0],
          totalTokens: 0,
          promptTokens: 0,
          candidatesTokens: 0,
          requestCount: 0,
          lastUsedAt: 0,
          modules: {}
        };
      }

      const u = m.users[sanitizedEmailKey];
      u.totalTokens += tTokens;
      u.promptTokens += pTokens;
      u.candidatesTokens += cTokens;
      u.requestCount += 1;
      if (ts > u.lastUsedAt) u.lastUsedAt = ts;

      // Atualiza módulos no usuário
      if (!u.modules) u.modules = {};
      if (!u.modules[mod]) {
        u.modules[mod] = { totalTokens: 0, promptTokens: 0, candidatesTokens: 0, requestCount: 0, costBrl: 0 };
      }
      u.modules[mod]!.totalTokens += tTokens;
      u.modules[mod]!.promptTokens += pTokens;
      u.modules[mod]!.candidatesTokens += cTokens;
      u.modules[mod]!.requestCount += 1;
      u.modules[mod]!.costBrl = Number(((u.modules[mod]!.costBrl || 0) + costEst).toFixed(4));

      totalRecordsProcessed++;
      totalTokensImported += tTokens;
    };

    // A. Ler registros da coleção 'usageLogs'
    const pathsToCheckUsage = [`gabinetes/${tenantId}/usageLogs`];
    if (isPrimary) {
      pathsToCheckUsage.push('gabinetes/gabinete_default/usageLogs');
    }

    for (const p of pathsToCheckUsage) {
      try {
        const logsSnap = await getDocs(collection(db, p));
        logsSnap.forEach(d => {
          const data = d.data();
          const pTokens = data.promptTokens || 0;
          const cTokens = data.outputTokens || 0;
          const tTokens = data.totalTokens || (pTokens + cTokens);
          if (tTokens > 0) {
            helperAddUsage(
              `usagelog_${d.id}`,
              data.timeMs || data.timestamp,
              pTokens,
              cTokens,
              tTokens,
              data.userEmail,
              data.userName
            );
          }
        });
      } catch (e) {
        console.warn(`[RetroImport] Aviso ao ler usageLogs de ${p}:`, e);
      }
    }

    // B. Ler histórico de minutas e análises ('history')
    const pathsToCheckHistory = [`gabinetes/${tenantId}/history`];
    if (isPrimary) {
      pathsToCheckHistory.push('gabinetes/gabinete_default/history');
      pathsToCheckHistory.push('history');
    }

    for (const p of pathsToCheckHistory) {
      try {
        const histSnap = await getDocs(collection(db, p));
        histSnap.forEach(d => {
          const data = d.data();
          let pTokens = data.result?.usage?.promptTokenCount || 0;
          let cTokens = data.result?.usage?.candidatesTokenCount || 0;
          let tTokens = data.result?.usage?.totalTokenCount || (pTokens + cTokens);

          // Se não houver contador gravado no resultado antigo, estimar com base nos caracteres
          if (tTokens === 0) {
            const contextLen = (data.processTextContext || '').length;
            const minuteLen = (data.result?.minute?.fullHtml || data.result?.auditAnalysis?.generalObservations || '').length;
            pTokens = Math.max(750, Math.round(contextLen > 0 ? contextLen / 4 : 1200));
            cTokens = Math.max(350, Math.round(minuteLen > 0 ? minuteLen / 4 : 800));
            tTokens = pTokens + cTokens;
          }

          // Incorporar uso de chat interativo se presente
          if (Array.isArray(data.chatMessages)) {
            for (const msg of data.chatMessages) {
              if (msg.usage) {
                pTokens += (msg.usage.promptTokenCount || 0);
                cTokens += (msg.usage.candidatesTokenCount || 0);
                tTokens += (msg.usage.totalTokenCount || 0);
              }
            }
          }

          helperAddUsage(
            `hist_${d.id}`,
            data.date || data.createdAt || data.timestamp,
            pTokens,
            cTokens,
            tTokens,
            data.creatorEmail || data.userEmail,
            data.creatorName || data.userName
          );
        });
      } catch (e) {
        console.warn(`[RetroImport] Aviso ao ler history de ${p}:`, e);
      }
    }

    // C. Ler registros do servidor (/api/telemetry/server-history)
    try {
      const srvRes = await fetch('/api/telemetry/server-history');
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        if (srvData.success && Array.isArray(srvData.items)) {
          for (const sItem of srvData.items) {
            const pTokens = sItem.promptTokenCount || 1000;
            const cTokens = sItem.candidatesTokenCount || 500;
            const tTokens = sItem.totalTokenCount || (pTokens + cTokens);
            helperAddUsage(
              `srv_${sItem.id}`,
              sItem.date,
              pTokens,
              cTokens,
              tTokens,
              sItem.userEmail,
              sItem.userName
            );
            if (sItem.wasRotated) {
              const uEmail = (sItem.userEmail || '').trim().toLowerCase();
              if (uEmail) {
                const sKey = uEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
                const mKey = new Date(sItem.date || Date.now()).toISOString().slice(0, 7);
                if (monthAggregates[mKey]?.users[sKey]) {
                  const uObj: any = monthAggregates[mKey].users[sKey];
                  uObj.rotationsCount = (uObj.rotationsCount || 0) + 1;
                  uObj.lastRotationAt = Math.max(uObj.lastRotationAt || 0, sItem.date || Date.now());
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("[RetroImport] Falha ao ler /api/telemetry/server-history:", e);
    }

    // D. Salvar no Firestore para cada mês encontrado
    for (const [monthKey, aggregated] of Object.entries(monthAggregates)) {
      if (aggregated.totalTokens > 0) {
        cabinetsUpdatedSet.add(tenantId);
        const docRef = doc(db, 'gabinetes', tenantId, 'token_usage', monthKey);
        
        try {
          const currentDocSnap = await getDoc(docRef);
          if (currentDocSnap.exists()) {
            const cur = currentDocSnap.data();
            const curUsers = cur.users || {};
            
            const mergedTotalTokens = Math.max(cur.totalTokens || 0, aggregated.totalTokens);
            const mergedPromptTokens = Math.max(cur.promptTokens || 0, aggregated.promptTokens);
            const mergedCandidatesTokens = Math.max(cur.candidatesTokens || 0, aggregated.candidatesTokens);
            const mergedRequestCount = Math.max(cur.requestCount || 0, aggregated.requestCount);
            const mergedLastUsedAt = Math.max(cur.lastUsedAt || 0, aggregated.lastUsedAt);

            const curModules = cur.modules || {};
            const mergedModules = { ...curModules };
            for (const [mKey, mData] of Object.entries(aggregated.modules)) {
              const curMod = mergedModules[mKey as ExecutionModuleType];
              if (!curMod) {
                mergedModules[mKey as ExecutionModuleType] = mData;
              } else {
                mergedModules[mKey as ExecutionModuleType] = {
                  totalTokens: Math.max(curMod.totalTokens || 0, mData!.totalTokens),
                  promptTokens: Math.max(curMod.promptTokens || 0, mData!.promptTokens),
                  candidatesTokens: Math.max(curMod.candidatesTokens || 0, mData!.candidatesTokens),
                  requestCount: Math.max(curMod.requestCount || 0, mData!.requestCount),
                  costBrl: Math.max(curMod.costBrl || 0, mData!.costBrl),
                };
              }
            }

            const mergedUsers = { ...curUsers };
            for (const [uKey, uData] of Object.entries(aggregated.users)) {
              const existingU = mergedUsers[uKey];
              if (!existingU) {
                mergedUsers[uKey] = uData;
              } else {
                const existingUMods = existingU.modules || {};
                const mergedUMods = { ...existingUMods };
                if (uData.modules) {
                  for (const [modKey, modData] of Object.entries(uData.modules)) {
                    const curUMod = mergedUMods[modKey as ExecutionModuleType];
                    if (!curUMod) {
                      mergedUMods[modKey as ExecutionModuleType] = modData;
                    } else {
                      mergedUMods[modKey as ExecutionModuleType] = {
                        totalTokens: Math.max(curUMod.totalTokens || 0, modData!.totalTokens),
                        promptTokens: Math.max(curUMod.promptTokens || 0, modData!.promptTokens),
                        candidatesTokens: Math.max(curUMod.candidatesTokens || 0, modData!.candidatesTokens),
                        requestCount: Math.max(curUMod.requestCount || 0, modData!.requestCount),
                        costBrl: Math.max(curUMod.costBrl || 0, modData!.costBrl),
                      };
                    }
                  }
                }

                mergedUsers[uKey] = {
                  userEmail: uData.userEmail || existingU.userEmail,
                  userName: uData.userName || existingU.userName,
                  totalTokens: Math.max(existingU.totalTokens || 0, uData.totalTokens),
                  promptTokens: Math.max(existingU.promptTokens || 0, uData.promptTokens),
                  candidatesTokens: Math.max(existingU.candidatesTokens || 0, uData.candidatesTokens),
                  requestCount: Math.max(existingU.requestCount || 0, uData.requestCount),
                  lastUsedAt: Math.max(existingU.lastUsedAt || 0, uData.lastUsedAt),
                  rotationsCount: Math.max(existingU.rotationsCount || 0, (uData as any).rotationsCount || 0),
                  lastRotationAt: Math.max(existingU.lastRotationAt || 0, (uData as any).lastRotationAt || 0),
                  modules: mergedUMods,
                };
              }
            }

            await setDoc(docRef, cleanForFirestore({
              monthKey,
              tenantId,
              totalTokens: mergedTotalTokens,
              promptTokens: mergedPromptTokens,
              candidatesTokens: mergedCandidatesTokens,
              requestCount: mergedRequestCount,
              lastUsedAt: mergedLastUsedAt,
              modules: mergedModules,
              users: mergedUsers
            }), { merge: true });
          } else {
            await setDoc(docRef, cleanForFirestore({
              monthKey,
              tenantId,
              totalTokens: aggregated.totalTokens,
              promptTokens: aggregated.promptTokens,
              candidatesTokens: aggregated.candidatesTokens,
              requestCount: aggregated.requestCount,
              lastUsedAt: aggregated.lastUsedAt,
              modules: aggregated.modules,
              users: aggregated.users
            }));
          }
        } catch (saveErr) {
          console.warn(`[RetroImport] Falha ao salvar token_usage de ${tenantId} para ${monthKey}:`, saveErr);
        }
      }
    }
  }

  return {
    totalRecordsProcessed,
    totalTokensImported,
    cabinetsUpdated: cabinetsUpdatedSet.size,
    monthsAffected: Array.from(affectedMonthsSet).sort()
  };
};



