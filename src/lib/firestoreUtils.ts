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