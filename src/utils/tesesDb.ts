import { CabinetTesesData } from "../types";
import { DEFAULT_CABINET_TESES } from "../data/defaultTeses";
import { getTesesFromDb, saveTesesToDb, globalTenantId, getActiveUnitId, isPrimaryCabinet } from "../lib/firestoreUtils";
import { safeGetItem, safeSetItem } from "./safeStorage";

const getLocalStorageKey = () => `assessor_cabinet_teses_v2_${globalTenantId}_${getActiveUnitId()}`;

export const getCabinetTeses = async (): Promise<CabinetTesesData> => {
  try {
    const fromDb = await getTesesFromDb();
    if (fromDb && typeof fromDb.text === "string") {
      try {
        safeSetItem(getLocalStorageKey(), JSON.stringify(fromDb));
      } catch {}
      return fromDb;
    }
  } catch (err) {
    console.warn("Could not fetch teses from DB:", err);
  }

  try {
    const cached = safeGetItem(getLocalStorageKey());
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.text === "string") {
        return parsed;
      }
    }
  } catch {}

  // Only inject DEFAULT_CABINET_TESES if this is the primary cabinet (Dr. Rafael).
  // For all other cabinets (e.g. Gabriel, custom tenants), NEVER inject default system teses!
  const initialText = isPrimaryCabinet(globalTenantId) ? DEFAULT_CABINET_TESES : "";
  return { text: initialText, isEnabled: true, updatedAt: new Date().toISOString() };
};

export const saveCabinetTeses = async (data: CabinetTesesData): Promise<CabinetTesesData> => {
  const updatedData = { ...data, updatedAt: new Date().toISOString() };
  try {
    safeSetItem(getLocalStorageKey(), JSON.stringify(updatedData));
  } catch {}

  try {
    await saveTesesToDb(updatedData);
  } catch (err) {
    console.error("Error saving teses to DB:", err);
  }
  return updatedData;
};

export const resetCabinetTeses = async (): Promise<CabinetTesesData> => {
  const defaultData: CabinetTesesData = {
    text: isPrimaryCabinet(globalTenantId) ? DEFAULT_CABINET_TESES : "",
    isEnabled: true,
    updatedAt: new Date().toISOString()
  };
  try {
    safeSetItem(getLocalStorageKey(), JSON.stringify(defaultData));
  } catch {}

  try {
    await saveTesesToDb(defaultData);
  } catch (err) {
    console.warn("Could not reset teses on DB:", err);
  }
  return defaultData;
};
