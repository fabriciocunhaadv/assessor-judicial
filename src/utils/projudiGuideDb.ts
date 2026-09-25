import { ProjudiGuideData } from "../types";
import { DEFAULT_PROJUDI_GUIDE } from "../data/defaultProjudiGuide";
import { getProjudiGuideFromDb, saveProjudiGuideToDb, globalTenantId, getActiveUnitId, isPrimaryCabinet } from "../lib/firestoreUtils";
import { safeGetItem, safeSetItem } from "./safeStorage";

const getLocalStorageKey = () => `assessor_projudi_guide_text_v2_${globalTenantId}_${getActiveUnitId()}`;

export const getProjudiGuide = async (): Promise<ProjudiGuideData> => {
  // Try to load from Firestore DB
  try {
    const fromDb = await getProjudiGuideFromDb();
    if (fromDb && typeof fromDb.text === "string") {
      try {
        safeSetItem(getLocalStorageKey(), fromDb.text);
      } catch {}
      return fromDb;
    }
  } catch (err) {
    console.warn("Could not fetch Projudi guide from DB:", err);
  }

  // Fallback to local storage or default
  try {
    const cached = safeGetItem(getLocalStorageKey());
    if (cached !== null) {
      return { text: cached, updatedAt: new Date().toISOString() };
    }
  } catch {}

  const initialText = isPrimaryCabinet(globalTenantId) ? DEFAULT_PROJUDI_GUIDE : "";
  return { text: initialText, updatedAt: new Date().toISOString() };
};

export const saveProjudiGuide = async (data: ProjudiGuideData): Promise<ProjudiGuideData> => {
  const updatedData = { ...data, updatedAt: new Date().toISOString() };
  try {
    safeSetItem(getLocalStorageKey(), updatedData.text);
  } catch {}

  try {
    await saveProjudiGuideToDb(updatedData);
  } catch (err) {
    console.error("Error saving Projudi guide to DB:", err);
  }
  return updatedData;
};

export const resetProjudiGuide = async (): Promise<ProjudiGuideData> => {
  const defaultText = isPrimaryCabinet(globalTenantId) ? DEFAULT_PROJUDI_GUIDE : "";
  const defaultData: ProjudiGuideData = {
    text: defaultText,
    updatedAt: new Date().toISOString()
  };
  try {
    safeSetItem(getLocalStorageKey(), defaultText);
  } catch {}

  try {
    await saveProjudiGuideToDb(defaultData);
  } catch (err) {
    console.warn("Could not reset Projudi guide on DB:", err);
  }
  return defaultData;
};
