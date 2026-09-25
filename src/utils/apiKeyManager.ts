import { auth } from "../lib/firebase";
import { saveUserApiKeyToDb, removeUserApiKeyFromDb, updateUserApiKeySettingsInDb, recordKeyRotationEventToDb, globalTenantId } from "../lib/firestoreUtils";
import { UserProfile, UserApiKeyItem } from "../types";
import { toast } from "react-hot-toast";

// Scoped key prefix base
const BASE_KEY_STORAGE = "agaia_user_api_key";
const BASE_LIST_STORAGE = "agaia_user_api_keys_list";
const BASE_ACTIVE_STORAGE = "agaia_user_api_key_active";
const API_BANNER_DISMISSED_KEY = "agaia_api_key_banner_dismissed";

const activeKeyMemoryCache: Record<string, string | null> = {};
const activeStateMemoryCache: Record<string, boolean> = {};
let currentCanUseNativeKey: boolean = false;

export function setNativeKeyAccessState(canUse: boolean): void {
  currentCanUseNativeKey = canUse;
}

export function isNativeKeyAllowed(): boolean {
  return currentCanUseNativeKey;
}

// Cleanup legacy unscoped or anon keys that might have leaked across accounts
try {
  localStorage.removeItem("agaia_custom_gemini_api_key");
  localStorage.removeItem("agaia_custom_gemini_api_keys_list");
  localStorage.removeItem("agaia_custom_gemini_api_key_active");
  localStorage.removeItem("agaia_user_api_key_anon");
  localStorage.removeItem("agaia_user_api_keys_list_anon");
  localStorage.removeItem("agaia_user_api_key_active_anon");
  localStorage.removeItem("agaia_user_api_key_undefined");
  localStorage.removeItem("agaia_user_api_keys_list_undefined");
  localStorage.removeItem("agaia_user_api_key_null");
  localStorage.removeItem("agaia_user_api_keys_list_null");
} catch {
  // Ignore in environments without localStorage
}

/**
 * Returns a user-scoped storage key to ensure 100% data isolation between different users.
 * Returns null if no valid user UID is present (preventing shared state across logins).
 */
function getStorageKey(baseKey: string, explicitUid?: string): string | null {
  const uid = explicitUid || auth.currentUser?.uid;
  if (!uid || uid === "anon" || uid === "undefined" || uid === "null") {
    return null;
  }
  return `${baseKey}_${uid}`;
}

export function isCustomApiKeyActive(uid?: string): boolean {
  try {
    const targetUid = uid || auth.currentUser?.uid;
    if (!targetUid) return false;

    if (activeStateMemoryCache[targetUid] !== undefined) {
      return activeStateMemoryCache[targetUid];
    }

    const key = getStorageKey(BASE_ACTIVE_STORAGE, targetUid);
    if (!key) return false;
    const val = localStorage.getItem(key);
    if (val === null) return true; // Default to active if configured
    return val === "true";
  } catch {
    return true;
  }
}

export function setCustomApiKeyActive(active: boolean, uid?: string): void {
  const targetUid = uid || auth.currentUser?.uid;
  if (!targetUid) return;

  activeStateMemoryCache[targetUid] = active;

  // 1. Tenta salvar no banco primeiro (nuvem)
  updateUserApiKeySettingsInDb(targetUid, {
    isCustomKeyActive: active,
  }).catch(() => {});

  // 2. Tenta salvar no cache local
  try {
    const key = getStorageKey(BASE_ACTIVE_STORAGE, targetUid);
    if (key) {
      localStorage.setItem(key, active ? "true" : "false");
    }
  } catch (err) {
    console.warn("Could not set active state in localStorage:", err);
  }

  window.dispatchEvent(new CustomEvent("api-key-updated", {
    detail: { apiKey: getCustomApiKey(targetUid), isActive: active, uid: targetUid }
  }));
}

export function getAllCustomApiKeys(uid?: string): UserApiKeyItem[] {
  try {
    const targetUid = uid || auth.currentUser?.uid;
    if (!targetUid) return [];

    const key = getStorageKey(BASE_LIST_STORAGE, targetUid);
    if (!key) return [];

    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Fallback: check single key for this specific user
    const singleKeyStorage = getStorageKey(BASE_KEY_STORAGE, targetUid);
    if (singleKeyStorage) {
      const singleKey = localStorage.getItem(singleKeyStorage);
      if (singleKey && singleKey.trim().length > 10) {
        return [{
          id: "key_primary",
          key: singleKey.trim(),
          label: "Chave Principal",
          createdAt: Date.now(),
        }];
      }
    }
  } catch (err) {
    console.warn("Could not read API keys list from localStorage:", err);
  }

  return [];
}

export function getCustomApiKey(uid?: string): string | null {
  try {
    const targetUid = uid || auth.currentUser?.uid;
    if (!targetUid) return null;

    // If user explicitly deactivated the personal key, return null so native key or prompt will be used
    if (!isCustomApiKeyActive(targetUid)) {
      return null;
    }

    if (activeKeyMemoryCache[targetUid] !== undefined && activeKeyMemoryCache[targetUid] !== null) {
      return activeKeyMemoryCache[targetUid];
    }

    const keyStorage = getStorageKey(BASE_KEY_STORAGE, targetUid);
    if (!keyStorage) return null;

    const key = localStorage.getItem(keyStorage);
    if (key && key.trim().length > 10) {
      return key.trim();
    }

    const all = getAllCustomApiKeys(targetUid);
    if (all.length > 0 && all[0].key) {
      return all[0].key.trim();
    }
  } catch (err) {
    console.warn("Could not read API key from localStorage:", err);
  }
  return null;
}

export function getActiveRawCustomKey(uid?: string): string | null {
  try {
    const targetUid = uid || auth.currentUser?.uid;
    if (!targetUid) return null;

    if (activeKeyMemoryCache[targetUid] !== undefined && activeKeyMemoryCache[targetUid] !== null) {
      return activeKeyMemoryCache[targetUid];
    }

    const keyStorage = getStorageKey(BASE_KEY_STORAGE, targetUid);
    if (!keyStorage) return null;

    const key = localStorage.getItem(keyStorage);
    if (key && key.trim().length > 10) {
      return key.trim();
    }
    const all = getAllCustomApiKeys(targetUid);
    if (all.length > 0 && all[0].key) {
      return all[0].key.trim();
    }
  } catch (err) {
    console.warn("Could not read raw API key from localStorage:", err);
  }
  return null;
}

export function saveAllCustomApiKeys(keys: UserApiKeyItem[], activeKeyId?: string, uid?: string): boolean {
  const targetUid = uid || auth.currentUser?.uid;
  if (!targetUid) return false;

  let activeKey = "";
  if (keys.length > 0) {
    const found = activeKeyId ? keys.find(k => k.id === activeKeyId) : keys[0];
    activeKey = found ? found.key : keys[0].key;
  }

  if (activeKey) {
    activeKeyMemoryCache[targetUid] = activeKey.trim();
  } else {
    activeKeyMemoryCache[targetUid] = null;
  }

  // 1. Sempre tenta salvar no banco de dados primeiro (nuvem)
  if (auth.currentUser && auth.currentUser.uid === targetUid) {
    updateUserApiKeySettingsInDb(targetUid, {
      customApiKey: activeKey.trim(),
      customApiKeys: keys,
      activeKeyId: activeKeyId || (keys[0]?.id ?? ""),
      isCustomKeyActive: isCustomApiKeyActive(targetUid),
    }).catch((err) => {
      console.warn("Falha ao salvar chaves no Firestore:", err);
    });
  }

  // 2. Tenta salvar no cache local (pode falhar se cheio, mas não bloqueia)
  const listStorageKey = getStorageKey(BASE_LIST_STORAGE, targetUid);
  const keyStorageKey = getStorageKey(BASE_KEY_STORAGE, targetUid);
  
  if (listStorageKey && keyStorageKey) {
    try {
      localStorage.setItem(listStorageKey, JSON.stringify(keys));
    } catch (err) {
      console.warn("Não foi possível salvar a lista de chaves no cache local:", err);
    }
    
    try {
      if (activeKey) {
        localStorage.setItem(keyStorageKey, activeKey.trim());
      } else {
        localStorage.removeItem(keyStorageKey);
      }
    } catch (err) {
      console.warn("Não foi possível salvar a chave ativa no cache local:", err);
    }
  }

  window.dispatchEvent(new CustomEvent("api-key-updated", {
    detail: { apiKey: activeKey.trim(), keys, uid: targetUid }
  }));

  return true;
}

export function addCustomApiKey(keyString: string, label?: string, keyType?: "paid" | "free", uid?: string): UserApiKeyItem {
  const targetUid = uid || auth.currentUser?.uid;
  const trimmed = keyString.trim();
  const currentKeys = getAllCustomApiKeys(targetUid);
  
  // Check if key already exists in this user's list
  const existing = currentKeys.find(k => k.key === trimmed);
  if (existing) {
    if (keyType && existing.keyType !== keyType) {
      existing.keyType = keyType;
    }
    const success = saveAllCustomApiKeys(currentKeys, existing.id, targetUid);
    if (!success) throw new Error("Usuário não autenticado. Não foi possível salvar a chave.");
    setCustomApiKeyActive(true, targetUid);
    return existing;
  }

  const newItem: UserApiKeyItem = {
    id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    key: trimmed,
    label: label?.trim() || `Chave ${currentKeys.length + 1} (${new Date().toLocaleDateString("pt-BR")})`,
    keyType: keyType || (trimmed.startsWith("AIzaSy") ? "paid" : "free"),
    createdAt: Date.now(),
  };

  const updated = [newItem, ...currentKeys];
  const success = saveAllCustomApiKeys(updated, newItem.id, targetUid);
  if (!success) throw new Error("Usuário não autenticado. Não foi possível salvar a chave.");
  setCustomApiKeyActive(true, targetUid);
  return newItem;
}

export function updateCustomApiKeyType(keyId: string, keyType: "paid" | "free", uid?: string): void {
  const targetUid = uid || auth.currentUser?.uid;
  const currentKeys = getAllCustomApiKeys(targetUid);
  const target = currentKeys.find(k => k.id === keyId);
  if (target) {
    target.keyType = keyType;
    saveAllCustomApiKeys(currentKeys, undefined, targetUid);
  }
}

export function deleteCustomApiKeyById(keyId: string, uid?: string): void {
  const targetUid = uid || auth.currentUser?.uid;
  const currentKeys = getAllCustomApiKeys(targetUid);
  const filtered = currentKeys.filter(k => k.id !== keyId);
  saveAllCustomApiKeys(filtered, filtered[0]?.id, targetUid);
}

export function setCustomApiKey(apiKey: string, label?: string, uid?: string): void {
  try {
    const trimmed = apiKey.trim();
    if (trimmed.length > 0) {
      addCustomApiKey(trimmed, label, undefined, uid);
    } else {
      removeCustomApiKey(uid);
    }
  } catch (err) {
    console.error("Could not save API key:", err);
  }
}

export function removeCustomApiKey(uid?: string): void {
  const targetUid = uid || auth.currentUser?.uid;
  if (!targetUid) return;

  activeKeyMemoryCache[targetUid] = null;
  delete activeStateMemoryCache[targetUid];

  if (auth.currentUser && auth.currentUser.uid === targetUid) {
    removeUserApiKeyFromDb(targetUid).catch(() => {});
  }

  try {
    localStorage.removeItem(getStorageKey(BASE_KEY_STORAGE, targetUid));
    localStorage.removeItem(getStorageKey(BASE_LIST_STORAGE, targetUid));
    const activeKeyStorage = getStorageKey(BASE_ACTIVE_STORAGE, targetUid);
    if (activeKeyStorage) {
      localStorage.setItem(activeKeyStorage, "false");
    }
  } catch (err) {
    console.warn("Could not remove API key from localStorage:", err);
  }

  window.dispatchEvent(new CustomEvent("api-key-updated", { detail: { apiKey: null, isActive: false, uid: targetUid } }));
}

/**
 * Automatically syncs the API key and list from the user's Firestore profile to the current device's user-scoped localStorage.
 * Strict isolation: NEVER copies keys from another user!
 */
export function syncApiKeyWithUserProfile(userProfile: UserProfile | null, uid?: string): void {
  const currentUid = uid || auth.currentUser?.uid;
  
  if (!userProfile || !currentUid) {
    window.dispatchEvent(new CustomEvent("api-key-updated", { detail: { apiKey: null, keys: [], isActive: false } }));
    return;
  }

  // 1. Determine the desired active key and list based on Firestore
  let activeKeyToDispatch = "";
  let keysToDispatch: UserApiKeyItem[] = [];

  if (userProfile.customApiKeys && Array.isArray(userProfile.customApiKeys) && userProfile.customApiKeys.length > 0) {
    keysToDispatch = userProfile.customApiKeys;
    const activeItem = userProfile.activeKeyId 
      ? userProfile.customApiKeys.find(k => k.id === userProfile.activeKeyId) 
      : userProfile.customApiKeys[0];
    activeKeyToDispatch = activeItem?.key || userProfile.customApiKey || "";
  } else if (userProfile.customApiKey && userProfile.customApiKey.trim().length > 10) {
    activeKeyToDispatch = userProfile.customApiKey.trim();
    keysToDispatch = [{
      id: "key_primary",
      key: activeKeyToDispatch,
      label: "Chave Principal",
      createdAt: Date.now(),
    }];
  }

  // 2. Sync to in-memory cache
  if (activeKeyToDispatch) {
    activeKeyMemoryCache[currentUid] = activeKeyToDispatch.trim();
  } else {
    activeKeyMemoryCache[currentUid] = null;
  }
  
  if (userProfile.isCustomKeyActive !== undefined) {
    activeStateMemoryCache[currentUid] = userProfile.isCustomKeyActive;
  }

  if (userProfile.canUseNativeKey !== undefined) {
    currentCanUseNativeKey = Boolean(userProfile.canUseNativeKey);
  }

  // 3. Try to sync to local storage (ignoring quota errors if they happen)
  try {
    if (userProfile.isCustomKeyActive !== undefined) {
      localStorage.setItem(getStorageKey(BASE_ACTIVE_STORAGE, currentUid), userProfile.isCustomKeyActive ? "true" : "false");
    }

    if (keysToDispatch.length > 0) {
      localStorage.setItem(getStorageKey(BASE_LIST_STORAGE, currentUid), JSON.stringify(keysToDispatch));
      if (activeKeyToDispatch) {
        localStorage.setItem(getStorageKey(BASE_KEY_STORAGE, currentUid), activeKeyToDispatch.trim());
      }
    } else {
      localStorage.removeItem(getStorageKey(BASE_KEY_STORAGE, currentUid));
      localStorage.removeItem(getStorageKey(BASE_LIST_STORAGE, currentUid));
      localStorage.setItem(getStorageKey(BASE_ACTIVE_STORAGE, currentUid), "false");
    }
  } catch (err) {
    console.warn("Could not sync API key to local storage due to possible quota limit:", err);
  }

  // 4. Always dispatch the event to keep the UI in sync with Firestore!
  window.dispatchEvent(new CustomEvent("api-key-updated", {
    detail: { apiKey: activeKeyToDispatch || null, keys: keysToDispatch, uid: currentUid }
  }));
}

export function hasCustomApiKey(uid?: string): boolean {
  const key = getCustomApiKey(uid);
  return Boolean(key && key.length > 10);
}

export function hasAnySavedCustomKey(uid?: string): boolean {
  const all = getAllCustomApiKeys(uid);
  if (all.length > 0) return true;
  const raw = getActiveRawCustomKey(uid);
  return Boolean(raw && raw.length > 10);
}

export function getMaskedApiKey(key?: string | null, uid?: string): string {
  const target = key ?? getCustomApiKey(uid) ?? getActiveRawCustomKey(uid);
  if (!target || target.length < 10) return "";
  if (target.length <= 12) {
    return `${target.slice(0, 4)}...${target.slice(-3)}`;
  }
  return `${target.slice(0, 6)}...${target.slice(-4)}`;
}

export function isApiBannerDismissed(): boolean {
  try {
    return localStorage.getItem(API_BANNER_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setApiBannerDismissed(dismissed: boolean): void {
  try {
    if (dismissed) {
      localStorage.setItem(API_BANNER_DISMISSED_KEY, "true");
    } else {
      localStorage.removeItem(API_BANNER_DISMISSED_KEY);
    }
  } catch (err) {
    console.warn("Could not save banner dismissal state:", err);
  }
}

/**
 * Retorna o pool ordenado de chaves cadastradas do usuário.
 * A chave atualmente ativa vem sempre no índice 0, seguida pelas demais chaves cadastradas como reserva.
 */
export function getCustomApiKeyPool(uid?: string): string[] {
  try {
    const targetUid = uid || auth.currentUser?.uid;
    if (!targetUid) return [];
    if (!isCustomApiKeyActive(targetUid)) return [];

    const allKeys = getAllCustomApiKeys(targetUid);
    const activeKey = getCustomApiKey(targetUid);
    const pool: string[] = [];

    if (activeKey && activeKey.trim().length > 10) {
      pool.push(activeKey.trim());
    }

    allKeys.forEach((k) => {
      if (k.key && k.key.trim().length > 10 && !pool.includes(k.key.trim())) {
        pool.push(k.key.trim());
      }
    });

    return pool;
  } catch {
    return [];
  }
}

/**
 * Retorna os detalhes (id, label, chave mascarada) do pool ordenado para exibição na UI.
 */
export function getCustomApiKeyPoolDetails(uid?: string): { id: string; label: string; masked: string; isActive: boolean; orderIndex: number }[] {
  try {
    const targetUid = uid || auth.currentUser?.uid;
    if (!targetUid) return [];
    const allKeys = getAllCustomApiKeys(targetUid);
    const activeKey = getCustomApiKey(targetUid);

    if (allKeys.length === 0) return [];

    const activeItem = allKeys.find(k => k.key === activeKey) || allKeys[0];
    const orderedItems = [activeItem, ...allKeys.filter(k => k.id !== activeItem.id)];
    return orderedItems.map((item, idx) => ({
      id: item.id,
      label: item.label || `Chave ${idx + 1}`,
      masked: getMaskedApiKey(item.key),
      isActive: idx === 0,
      orderIndex: idx + 1,
    }));
  } catch {
    return [];
  }
}

/**
 * Sincroniza a chave ativa no cliente quando o backend ou uma resposta informar
 * que realizou a rotação automática por esgotamento de cota da chave anterior.
 */
export function syncRotatedKeyToFrontend(rotatedKeyString: string, uid?: string): { rotated: boolean; newKeyLabel?: string; newKeyId?: string } {
  try {
    const targetUid = uid || auth.currentUser?.uid;
    if (!targetUid || !rotatedKeyString) return { rotated: false };

    const cleanRotatedKey = rotatedKeyString.trim();
    const allKeys = getAllCustomApiKeys(targetUid);
    const matched = allKeys.find(k => k.key === cleanRotatedKey);
    const snippet = `...${cleanRotatedKey.slice(-4)}`;
    const label = matched?.label || `Chave Reserva (${snippet})`;

    // Atualiza active key no cache e no armazenamento persistente
    if (matched) {
      activeKeyMemoryCache[targetUid] = matched.key;
      saveAllCustomApiKeys(allKeys, matched.id, targetUid);
    } else {
      activeKeyMemoryCache[targetUid] = cleanRotatedKey;
    }
    
    console.log(`[Key Manager] Rotação automática sincronizada: agora usando "${label}"`);
    
    try {
      toast(`⚡ Rotação Automática de Cota: chave alternada para "${label}" sem interrupção!`, {
        icon: '🔄',
        duration: 5000,
        style: {
          background: '#0f172a',
          color: '#38bdf8',
          border: '1px solid #0284c7',
          fontWeight: 'bold',
          fontSize: '13px',
        }
      });
    } catch (_) {}

    window.dispatchEvent(new CustomEvent("api-key-rotated", {
      detail: { newKey: cleanRotatedKey, label, id: matched?.id || 'rotated_key', uid: targetUid }
    }));

    // SEMPRE grava o evento de telemetria no Firestore para visualização do Super Admin
    recordKeyRotationEventToDb({
      userId: targetUid,
      userEmail: auth.currentUser?.email || '',
      tenantId: globalTenantId,
      newKeyLabel: label,
      newKeySnippet: snippet,
      reason: 'Cota de requisições excedida (Erro 429) - Failover automático para reserva'
    }).catch((err) => console.warn("[Key Manager] Falha ao registrar rotação no Firestore:", err));

    return { rotated: true, newKeyLabel: label, newKeyId: matched?.id };
  } catch (err) {
    console.warn("Erro ao sincronizar chave rotacionada:", err);
  }
  return { rotated: false };
}

/**
 * Avança manualmente ou programaticamente para a próxima chave do pool cadastrado.
 */
export function rotateToNextApiKey(failedKey?: string, uid?: string): { rotated: boolean; newKeyLabel?: string; newKeyId?: string } {
  try {
    const targetUid = uid || auth.currentUser?.uid;
    if (!targetUid) return { rotated: false };

    const allKeys = getAllCustomApiKeys(targetUid);
    if (allKeys.length <= 1) return { rotated: false };

    const activeRaw = failedKey || getCustomApiKey(targetUid) || "";
    let currentIndex = allKeys.findIndex(k => k.key === activeRaw);
    if (currentIndex === -1) currentIndex = 0;

    const nextIndex = (currentIndex + 1) % allKeys.length;
    const nextKey = allKeys[nextIndex];

    saveAllCustomApiKeys(allKeys, nextKey.id, targetUid);
    activeKeyMemoryCache[targetUid] = nextKey.key;

    try {
      toast(`⚡ Rotação de Chaves: alternado para "${nextKey.label}" (${nextIndex + 1}/${allKeys.length})`, {
        icon: '🔄',
        duration: 4000,
      });
    } catch (_) {}

    window.dispatchEvent(new CustomEvent("api-key-rotated", {
      detail: { newKey: nextKey.key, label: nextKey.label, id: nextKey.id, uid: targetUid }
    }));

    recordKeyRotationEventToDb({
      userId: targetUid,
      userEmail: auth.currentUser?.email || '',
      tenantId: globalTenantId,
      newKeyLabel: nextKey.label,
      newKeySnippet: `...${nextKey.key.slice(-4)}`,
      reason: 'Rotação programada para próxima chave do pool'
    }).catch(() => {});

    return { rotated: true, newKeyLabel: nextKey.label, newKeyId: nextKey.id };
  } catch (err) {
    console.warn("Erro ao rotacionar chave:", err);
    return { rotated: false };
  }
}

/**
 * Returns fetch headers with the custom API key and user identity included
 */
export function getApiHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  // Envia a chave personalizada e o pool de chaves do usuário se configurados
  const customKey = getCustomApiKey();
  if (customKey) {
    headers["x-gemini-api-key"] = customKey;
  }
  const pool = getCustomApiKeyPool();
  if (pool.length > 0) {
    headers["x-gemini-api-key-pool"] = JSON.stringify(pool);
  }

  const nativeAllowed = isNativeKeyAllowed();
  if (nativeAllowed) {
    headers["x-use-native-key"] = "true";
  }

  if (auth.currentUser) {
    headers["x-user-uid"] = auth.currentUser.uid;
    if (auth.currentUser.email) {
      headers["x-user-email"] = auth.currentUser.email;
    }
    if (auth.currentUser.displayName) {
      headers["x-user-name"] = encodeURIComponent(auth.currentUser.displayName);
    }
  }

  if (globalTenantId) {
    headers["x-tenant-id"] = globalTenantId;
  }
  return headers;
}

/**
 * Checks a fetch Response or parsed JSON data for a rotated key, and updates local state transparently
 */
export function checkResponseForRotatedKey(responseOrData: any): void {
  try {
    if (!responseOrData) return;
    if (typeof responseOrData === "object") {
      // Check in parsed JSON payload
      if (responseOrData.rotatedKey && typeof responseOrData.rotatedKey === "string") {
        syncRotatedKeyToFrontend(responseOrData.rotatedKey);
        return;
      }
      // Check in response headers if it's a Fetch Response
      if (responseOrData.headers && typeof responseOrData.headers.get === "function") {
        const headerKey = responseOrData.headers.get("x-gemini-rotated-key");
        if (headerKey) {
          syncRotatedKeyToFrontend(headerKey);
          return;
        }
      }
    }
  } catch (_) {}
}

// Interceptor global do fetch para capturar cabeçalho de rotação de chave transparente de forma segura
try {
  if (typeof window !== "undefined" && typeof window.fetch === "function") {
    const descriptor = Object.getOwnPropertyDescriptor(window, "fetch") ||
                       Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window) || {}, "fetch");

    // Only patch if fetch is writable or has a setter (not a getter-only property)
    if (!descriptor || descriptor.writable || typeof descriptor.set === "function") {
      const originalFetch = window.fetch;
      const wrappedFetch = async function (this: any, ...args: any[]) {
        try {
          const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
          if (typeof url === 'string' && (url.startsWith('/api/') || url.includes('/api/'))) {
            let options = args[1] ? { ...args[1] } : {};
            let headers: Headers;
            if (options.headers instanceof Headers) {
              headers = new Headers(options.headers);
            } else if (Array.isArray(options.headers)) {
              headers = new Headers(options.headers);
            } else if (typeof options.headers === 'object' && options.headers !== null) {
              headers = new Headers(options.headers);
            } else {
              headers = new Headers();
            }

            if (auth.currentUser) {
              if (!headers.has('x-user-uid')) headers.set('x-user-uid', auth.currentUser.uid);
              if (auth.currentUser.email && !headers.has('x-user-email')) headers.set('x-user-email', auth.currentUser.email);
              if (auth.currentUser.displayName && !headers.has('x-user-name')) {
                headers.set('x-user-name', encodeURIComponent(auth.currentUser.displayName));
              }
            }
            if (globalTenantId && !headers.has('x-tenant-id')) {
              headers.set('x-tenant-id', globalTenantId);
            }
            if (!isNativeKeyAllowed()) {
              const customKey = getCustomApiKey();
              if (customKey && !headers.has('x-gemini-api-key')) headers.set('x-gemini-api-key', customKey);
              const pool = getCustomApiKeyPool();
              if (pool.length > 0 && !headers.has('x-gemini-api-key-pool')) {
                headers.set('x-gemini-api-key-pool', JSON.stringify(pool));
              }
            } else {
              if (!headers.has('x-use-native-key')) headers.set('x-use-native-key', 'true');
            }
            options.headers = headers;
            args[1] = options;
          }
        } catch (_) {}

        const response = await originalFetch.apply(this, args);
        try {
          checkResponseForRotatedKey(response);
        } catch (_) {}
        return response;
      };

      try {
        window.fetch = wrappedFetch;
      } catch {
        // Safely ignore if window.fetch cannot be set
      }
    }
  }
} catch {
  // Safely ignore in restricted or sandboxed iframe environments
}

export interface AiAccessCheck {
  canExecute: boolean;
  reason: "custom_key" | "native_allowed" | "blocked";
  message: string;
}

/**
 * Validates if the current user is permitted to execute AI tasks.
 * Allowed if:
 * 1. User has native key permission activated by an Administrator (canUseNativeKey === true) -> SOBREPÕE CHAVE PESSOAL!
 * 2. User configured and enabled their own custom Google AI Studio key.
 */
export function checkUserAiAccess(userProfile: UserProfile | null, userEmail?: string | null): AiAccessCheck {
  const effectiveEmail = userEmail || auth.currentUser?.email || userProfile?.email;
  const isMasterAdmin = effectiveEmail === "fabriciocunha.adv@gmail.com";
  const isAdmin = userProfile?.role === "admin" || isMasterAdmin;
  const nativeAllowed = Boolean(userProfile?.canUseNativeKey ?? isNativeKeyAllowed());

  // 1. PRIORIDADE MÁXIMA: Se o Super Admin autorizou a Chave Nativa, ela sobrepõe o uso da chave pessoal!
  if (nativeAllowed) {
    return {
      canExecute: true,
      reason: "native_allowed",
      message: isAdmin
        ? "Chave Nativa do Gabinete ativa na sua conta de Administrador (sobrepondo chaves pessoais)."
        : "Chave Nativa do Gabinete autorizada pelo Super Administrador (sobrepondo chaves pessoais).",
    };
  }

  // 2. Se a chave nativa não estiver autorizada, utiliza a chave pessoal cadastrada do usuário
  const activeCustomKey = getCustomApiKey();
  if (activeCustomKey && activeCustomKey.length > 10) {
    return {
      canExecute: true,
      reason: "custom_key",
      message: "Utilizando sua Chave de API Pessoal do Google AI Studio.",
    };
  }

  // 3. Otherwise blocked
  return {
    canExecute: false,
    reason: "blocked",
    message: isAdmin
      ? "A Chave Nativa do Gabinete está desativada para sua conta e sua Chave Pessoal está desativada ou não cadastrada. Ative sua Chave Pessoal ou ative a Chave Nativa."
      : "Acesso bloqueado: Ative/insira sua Chave do Google AI Studio (gratuita) ou solicite ao Administrador a liberação da Chave Nativa do Gabinete.",
  };
}

export function requestOpenApiKeyModal(alertMessage?: string): void {
  window.dispatchEvent(new CustomEvent("open-api-key-modal", { detail: { message: alertMessage } }));
}

/**
 * Tests an API key against the server endpoint
 */
export async function testGeminiApiKey(testKey?: string): Promise<{
  success: boolean;
  message: string;
  isCustom?: boolean;
}> {
  const targetKey = testKey !== undefined ? testKey.trim() : (getCustomApiKey() || getActiveRawCustomKey() || "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (targetKey) {
    headers["x-gemini-api-key"] = targetKey;
  }

  try {
    const response = await fetch("/api/test-api-key", {
      method: "POST",
      headers,
      body: JSON.stringify({ customApiKey: targetKey }),
    });

    let data: any = {};
    try {
      const responseText = await response.text();
      data = JSON.parse(responseText);
    } catch {
      return { success: false, message: "A API retornou um formato inválido ao testar a chave." };
    }

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.error || "Falha na validação da chave com o Google AI Studio.",
      };
    }

    return {
      success: true,
      message: data.message || "Chave de API validada com sucesso pelo Google Gemini!",
      isCustom: data.isCustom,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Erro de conexão ao testar a chave de API.",
    };
  }
}
