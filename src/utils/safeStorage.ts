/**
 * safeStorage.ts
 * Utility to safely interact with window.localStorage without crashing on QuotaExceededError.
 * Automatically cleans up non-essential caches and large temporary items when quota limits are approached.
 */

// Keys of items that can be safely purged if localStorage quota is exceeded
const DISPENSABLE_KEY_PREFIXES = [
  'agaia_latest_global_snapshot',
  'agaia_cabinet_latest_backup_',
  'assessor_fabricio_prompts_backup_',
  'assessor_audits_db',
  'assessor_api_usage_logs',
];

/**
 * Attempts to clear non-essential cached objects from localStorage to recover space.
 */
export function pruneDispensableStorage(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let freedCount = 0;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        for (const prefix of DISPENSABLE_KEY_PREFIXES) {
          if (k.startsWith(prefix)) {
            keysToRemove.push(k);
            break;
          }
        }
      }
    }

    for (const key of keysToRemove) {
      try {
        localStorage.removeItem(key);
        freedCount++;
      } catch (_) {}
    }
  } catch (e) {
    console.warn("Error during storage cleanup:", e);
  }
  return freedCount;
}

/**
 * Safely writes a key-value pair to localStorage with automatic quota recovery.
 * Returns true if stored successfully, false otherwise.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      (typeof err?.message === 'string' && err.message.toLowerCase().includes('quota'));

    if (isQuotaError) {
      console.warn(`[safeStorage] Storage quota reached while setting "${key}". Pruning non-essential caches...`);
      pruneDispensableStorage();

      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        console.warn(`[safeStorage] Unable to save "${key}" to localStorage even after pruning. Firestore remains source of truth.`, retryErr);
        return false;
      }
    }

    console.warn(`[safeStorage] Failed to set item "${key}":`, err);
    return false;
  }
}

/**
 * Safely retrieves an item from localStorage.
 */
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[safeStorage] Failed to read item "${key}":`, err);
    return null;
  }
}

/**
 * Safely removes an item from localStorage.
 */
export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[safeStorage] Failed to remove item "${key}":`, err);
  }
}
