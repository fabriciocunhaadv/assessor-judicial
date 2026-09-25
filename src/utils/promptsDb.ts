import { CustomPrompt } from "../types";
import { DEFAULT_PROMPTS } from "../data/defaultPrompts";
import { getPromptsFromDb, savePromptToDb, globalTenantId, getActiveUnitId, isPrimaryCabinet } from "../lib/firestoreUtils";
import { auth } from "../lib/firebase";
import { safeGetItem, safeSetItem } from "./safeStorage";

const getPromptsKeys = () => {
  const tenant = globalTenantId || 'gabinete_default';
  return {
    storage: `assessor_fabricio_prompts_v3_${tenant}`,
    backup: `assessor_fabricio_prompts_backup_v3_${tenant}`,
    trash: `assessor_fabricio_prompts_trash_v3_${tenant}`,
  };
};

const isSyntheticDefault = (p: CustomPrompt) => p?.id === "prompt-padrao" || p?.title === "Prompt Padrão";

/** Get currently cached prompts from localStorage */
export function getLocalCachedPrompts(): CustomPrompt[] {
  const keys = getPromptsKeys();
  const unitId = getActiveUnitId();
  const tenant = globalTenantId || 'gabinete_default';

  // 1. Try modern tenant-wide cache first
  try {
    const raw = safeGetItem(keys.storage);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed.filter((p) => !isSyntheticDefault(p));
        if (cleaned.length !== parsed.length) {
          saveLocalCachedPrompts(cleaned);
        }
        if (cleaned.length > 0) {
          return cleaned;
        }
      }
    }
  } catch (err) {
    console.warn("Could not parse prompts from localStorage:", err);
  }

  // 2. Check backup key if primary key was empty or corrupted
  try {
    const backupRaw = safeGetItem(keys.backup);
    if (backupRaw) {
      const parsed = JSON.parse(backupRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed.filter((p) => !isSyntheticDefault(p));
        if (cleaned.length > 0) {
          return cleaned;
        }
      }
    }
  } catch {}

  // 3. Fallback to legacy unit-specific cache keys and migrate automatically
  const legacyKeys = [
    `assessor_fabricio_prompts_v2_${unitId}_${tenant}`,
    `assessor_fabricio_prompts_v2_montes_claros_${tenant}`,
    `assessor_fabricio_prompts_${tenant}`,
  ];
  for (const lk of legacyKeys) {
    try {
      const legRaw = safeGetItem(lk);
      if (legRaw) {
        const parsed = JSON.parse(legRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter((p) => !isSyntheticDefault(p));
          if (cleaned.length > 0) {
            saveLocalCachedPrompts(cleaned); // Migrate to modern tenant key
            return cleaned;
          }
        }
      }
    } catch {}
  }

  return [];
}

/** Save prompts safely to local storage and maintain rolling backup */
export function saveLocalCachedPrompts(prompts: CustomPrompt[]): void {
  if (!Array.isArray(prompts)) return;
  const filtered = prompts.filter((p) => !isSyntheticDefault(p));
  const keys = getPromptsKeys();
  try {
    const newJson = JSON.stringify(filtered);
    const current = safeGetItem(keys.storage);
    
    // Save main storage first to guarantee current data is cached
    const savedMain = safeSetItem(keys.storage, newJson);
    
    // If there's previous state different from new state, attempt backup
    if (current && current !== newJson && savedMain) {
      safeSetItem(keys.backup, current);
    }
  } catch (err) {
    console.warn("Notice: Local prompts cache update bypassed (cloud persistence active):", err);
  }
}

/** Merge server prompts, local storage prompts, and default prompts without losing any custom items */
export function mergePromptsSafely(
  serverPrompts: CustomPrompt[],
  localPrompts: CustomPrompt[],
  defaultPrompts: CustomPrompt[] = []
): CustomPrompt[] {
  const mergedMap = new Map<string, CustomPrompt>();

  // 1. Add default prompts first (only if provided and not synthetic prompt-padrao)
  for (const p of defaultPrompts) {
    if (!isSyntheticDefault(p)) {
      mergedMap.set(p.id, p);
    }
  }

  // 2. Overlay local prompts (preserve user's edits and custom creations)
  for (const p of localPrompts) {
    if (!isSyntheticDefault(p)) {
      mergedMap.set(p.id, p);
    }
  }

  // 3. Overlay server prompts (from cloud database)
  for (const p of serverPrompts) {
    if (isSyntheticDefault(p)) continue;
    const existing = mergedMap.get(p.id);
    if (!existing) {
      mergedMap.set(p.id, p);
    } else {
      // Server version always wins over initial default, or use newer timestamp
      const serverUpdated = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
      const existingUpdated = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      if (serverUpdated >= existingUpdated || (!existing.createdBy && p.createdBy) || p.isDeleted) {
        mergedMap.set(p.id, { ...existing, ...p });
      }
    }
  }

  // 4. Remove any prompts marked as deleted or synthetic
  for (const [id, p] of mergedMap.entries()) {
    if (p.isDeleted || isSyntheticDefault(p)) {
      mergedMap.delete(id);
    }
  }

  return Array.from(mergedMap.values());
}

/** Fetch shared prompts with smart synchronization */
export async function syncPromptsWithDb(): Promise<CustomPrompt[]> {
  const localPrompts = getLocalCachedPrompts();

  if (!auth.currentUser) {
    return localPrompts;
  }

  try {
    const serverPrompts = await getPromptsFromDb();
    
    // If server has prompts, merge them safely with local prompts without overriding user data
    if (Array.isArray(serverPrompts) && serverPrompts.length > 0) {
      const merged = mergePromptsSafely(serverPrompts, localPrompts, []);
      saveLocalCachedPrompts(merged);
      return merged;
    } else {
      // If server is empty, only save local prompts to cache. Do NOT auto-seed default system prompts to remote db!
      if (localPrompts.length > 0) {
        saveLocalCachedPrompts(localPrompts);
      }
      return localPrompts;
    }
  } catch (err) {
    console.warn("Could not sync shared prompts from server, using local fallback:", err);
    return localPrompts;
  }
}

/** Get prompt backup history */
export function getPromptBackups(): CustomPrompt[] | null {
  const keys = getPromptsKeys();
  try {
    const backup = localStorage.getItem(keys.backup);
    if (backup) {
      const parsed = JSON.parse(backup);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return null;
}
