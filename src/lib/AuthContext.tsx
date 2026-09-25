import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User, signInWithPopup } from 'firebase/auth';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { auth, db, googleProvider, microsoftProvider } from './firebase';
import { UserProfile, JudicialUnit, DEFAULT_UNITS } from '../types';
import { 
  syncUserProfile, 
  subscribeToUnits, 
  saveUnitsToDb, 
  updateUserTours, 
  setGlobalTenantId, 
  fetchAllUnitsForSuperAdmin,
  fetchAllTenantsAndUnitsForSuperAdmin,
  SuperAdminTenantInfo,
  SuperAdminTenantUnit,
  isPrimaryCabinet
} from './firestoreUtils';
import { syncApiKeyWithUserProfile, setNativeKeyAccessState } from '../utils/apiKeyManager';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isJudge: boolean;
  isDeactivated: boolean;
  isUnauthorized: boolean;
  isTenantSuspended: boolean;
  tenantSuspensionReason: string | null;
  tenantName: string | null;
  authError: string | null;
  canUseNativeKey: boolean;
  loading: boolean;
  activeUnit: JudicialUnit;
  setActiveUnit: (unit: JudicialUnit) => void;
  allowedUnits: JudicialUnit[];
  activeTenantId: string;
  allTenants: SuperAdminTenantInfo[];
  allUnitsForSuperAdmin: SuperAdminTenantUnit[];
  setSuperAdminActiveTenant: (tenantId: string, unitId?: string) => Promise<void>;
  signIn: (providerType?: 'google' | 'microsoft') => Promise<void>;
  signOut: () => Promise<void>;
  completeTour: (tourId: string) => Promise<void>;
  resetTours: () => Promise<void>;
  clearAuthError: () => void;
  recheckInvite: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isAdmin: false,
  isSuperAdmin: false,
  isJudge: false,
  isDeactivated: false,
  isUnauthorized: false,
  isTenantSuspended: false,
  tenantSuspensionReason: null,
  tenantName: null,
  authError: null,
  canUseNativeKey: false,
  loading: true,
  activeUnit: DEFAULT_UNITS[0],
  setActiveUnit: () => {},
  allowedUnits: [],
  activeTenantId: 'gabinete_default',
  allTenants: [],
  allUnitsForSuperAdmin: [],
  setSuperAdminActiveTenant: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  completeTour: async () => {},
  resetTours: async () => {},
  clearAuthError: () => {},
  recheckInvite: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const ACTIVE_UNIT_KEY = "agaia_active_unit_id";
const SUPERADMIN_TENANT_KEY = "agaia_superadmin_active_tenant";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dynamicUnits, setDynamicUnits] = useState<JudicialUnit[]>(DEFAULT_UNITS);
  const [isTenantSuspended, setIsTenantSuspended] = useState(false);
  const [tenantSuspensionReason, setTenantSuspensionReason] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);

  // Super Admin Multi-Tenant States
  const [superAdminTenantId, setSuperAdminTenantId] = useState<string | null>(() => {
    return localStorage.getItem(SUPERADMIN_TENANT_KEY);
  });
  const [allTenants, setAllTenants] = useState<SuperAdminTenantInfo[]>([]);
  const [allUnitsForSuperAdmin, setAllUnitsForSuperAdmin] = useState<SuperAdminTenantUnit[]>([]);

  const isSuperAdmin = (user?.email || '').toLowerCase() === 'fabriciocunha.adv@gmail.com';
  const isAdmin = userProfile?.role === 'admin' || isSuperAdmin;
  const isJudge = Boolean(userProfile?.isJudge);
  const isDeactivated = Boolean(userProfile && userProfile.isActive === false && !isSuperAdmin);
  const isUnauthorized = Boolean(
    user && 
    !isSuperAdmin && 
    (userProfile?.isUnauthorized || !userProfile?.tenantId || userProfile?.tenantId === 'unassigned' || userProfile?.tenantId === 'unauthorized')
  );
  const canUseNativeKey = Boolean(userProfile?.canUseNativeKey);

  useEffect(() => {
    setNativeKeyAccessState(canUseNativeKey);
  }, [canUseNativeKey]);

  const activeTenantId = useMemo(() => {
    if (isSuperAdmin && superAdminTenantId) {
      return superAdminTenantId;
    }
    return userProfile?.tenantId || 'gabinete_default';
  }, [isSuperAdmin, superAdminTenantId, userProfile?.tenantId]);

  const [activeUnit, setActiveUnitState] = useState<JudicialUnit>(() => {
    const saved = localStorage.getItem(ACTIVE_UNIT_KEY);
    if (saved) {
      const found = DEFAULT_UNITS.find(u => u.id === saved);
      if (found) return found;
    }
    return DEFAULT_UNITS[0];
  });

  const setActiveUnit = (unit: JudicialUnit) => {
    setActiveUnitState(unit);
    localStorage.setItem(ACTIVE_UNIT_KEY, unit.id);
    if (isSuperAdmin && unit.tenantId && unit.tenantId !== activeTenantId) {
      setSuperAdminTenantId(unit.tenantId);
      setGlobalTenantId(unit.tenantId);
      localStorage.setItem(SUPERADMIN_TENANT_KEY, unit.tenantId);
      window.dispatchEvent(new CustomEvent('tenant_changed', { detail: { tenantId: unit.tenantId, unitId: unit.id } }));
      window.dispatchEvent(new Event('storage'));
    }
  };

  const setSuperAdminActiveTenant = async (tenantId: string, unitId?: string) => {
    if (!isSuperAdmin) return;
    const targetTenantId = tenantId || 'gabinete_default';
    setSuperAdminTenantId(targetTenantId);
    setGlobalTenantId(targetTenantId);
    localStorage.setItem(SUPERADMIN_TENANT_KEY, targetTenantId);

    const tenantObj = allTenants.find(t => t.id === targetTenantId);
    if (tenantObj) {
      setTenantName(tenantObj.name);
    }

    const isCurrentTenant = targetTenantId === activeTenantId;
    const matchingUnits = isCurrentTenant 
      ? dynamicUnits 
      : allUnitsForSuperAdmin.filter(u => u.tenantId === targetTenantId);
      
    let targetUnit: JudicialUnit;
    if (unitId) {
      targetUnit = matchingUnits.find(u => u.id === unitId) || allUnitsForSuperAdmin.find(u => u.id === unitId) || (matchingUnits[0] || DEFAULT_UNITS[0]);
    } else {
      targetUnit = matchingUnits.length > 0 ? matchingUnits[0] : (dynamicUnits[0] || DEFAULT_UNITS[0]);
    }

    setActiveUnitState(targetUnit);
    localStorage.setItem(ACTIVE_UNIT_KEY, targetUnit.id);
    window.dispatchEvent(new CustomEvent('tenant_changed', { detail: { tenantId: targetTenantId, unitId: targetUnit.id } }));
    window.dispatchEvent(new Event('storage'));
  };

  const clearAuthError = () => setAuthError(null);

  // Sync all tenants and units for Super Admin in realtime
  useEffect(() => {
    if (!isSuperAdmin || !user) return;

    const refreshSuperAdminData = async () => {
      try {
        const data = await fetchAllTenantsAndUnitsForSuperAdmin();
        setAllTenants(data.tenants);
        setAllUnitsForSuperAdmin(data.units);
      } catch (err) {
        console.warn("Could not load super admin multi-tenant data:", err);
      }
    };

    refreshSuperAdminData();

    // Subscribe to tenants collection
    const unsubscribeTenants = onSnapshot(collection(db, 'tenants'), async () => {
      refreshSuperAdminData();
    }, (error) => { console.warn('Snapshot error on tenants:', error); 
              if (error.code === 'resource-exhausted' || (error.message && error.message.includes('Quota limit'))) {
                setAuthError("Aviso: A quota gratuita diária do Firebase foi excedida. Você precisará habilitar o plano pago (Blaze) ou aguardar o reset diário para ler do banco. Tente novamente mais tarde.");
              }
 });

    return () => {
      unsubscribeTenants();
    };
  }, [isSuperAdmin, user]);

  useEffect(() => {
    let unsubscribeUnits: (() => void) | null = null;
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeTenant: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthError(null);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (unsubscribeUnits) {
        unsubscribeUnits();
        unsubscribeUnits = null;
      }
      if (unsubscribeTenant) {
        unsubscribeTenant();
        unsubscribeTenant = null;
      }

      if (u) {
        try {
          const initialProfile = await syncUserProfile(u);
          const isSuper = (u.email || '').toLowerCase() === 'fabriciocunha.adv@gmail.com';
          const savedSuperTenant = localStorage.getItem(SUPERADMIN_TENANT_KEY);
          const currentTenantId = isSuper && savedSuperTenant 
            ? savedSuperTenant 
            : (initialProfile.tenantId || 'unassigned');
          
          setGlobalTenantId(currentTenantId);
          setUserProfile(initialProfile);

          if (!initialProfile.isUnauthorized && currentTenantId !== 'unassigned') {
            syncApiKeyWithUserProfile(initialProfile, u.uid);

            // Listen to tenant status
            unsubscribeTenant = onSnapshot(doc(db, 'tenants', currentTenantId), (tenantSnap) => {
              if (tenantSnap.exists()) {
                const tData = tenantSnap.data();
                setTenantName(tData.name || null);
                const isSuspended = tData.status === 'suspended' || tData.status === 'maintenance';
                setIsTenantSuspended(isSuspended);
                setTenantSuspensionReason(tData.suspendedReason || (tData.status === 'maintenance' ? 'Gabinete em manutenção técnica programada.' : 'Acesso ao Gabinete temporariamente suspenso pela administração SaaS.'));
              } else {
                setIsTenantSuspended(false);
                setTenantSuspensionReason(null);
                setTenantName(isPrimaryCabinet(currentTenantId) ? 'Gabinete Principal (Dr. Rafael Machado)' : null);
              }
            }, (error) => { console.warn('Snapshot error on tenant status:', error); 
              if (error.code === 'resource-exhausted' || (error.message && error.message.includes('Quota limit'))) {
                setAuthError("Aviso: A quota gratuita diária do Firebase foi excedida. Você precisará habilitar o plano pago (Blaze) ou aguardar o reset diário para ler do banco. Tente novamente mais tarde.");
              }
 });

            // Load units based on current tenant
            unsubscribeUnits = subscribeToUnits((units) => {
              if (units && units.length > 0) {
                setDynamicUnits(units);
                setActiveUnitState(prev => {
                  const stillExists = units.find(unit => unit.id === prev.id);
                  if (stillExists) return prev;
                  localStorage.setItem(ACTIVE_UNIT_KEY, units[0].id);
                  return units[0];
                });
              } else {
                setDynamicUnits(DEFAULT_UNITS);
              }
              setLoading(false);
            });

            // Realtime listener for any updates to user's profile
            unsubscribeProfile = onSnapshot(doc(db, 'users', u.uid), (snapshot) => {
              if (snapshot.exists()) {
                const updatedProfile = snapshot.data() as UserProfile;
                if (!isSuper || !savedSuperTenant) {
                  setGlobalTenantId(updatedProfile.tenantId || 'gabinete_default');
                }
                setUserProfile(updatedProfile);
                syncApiKeyWithUserProfile(updatedProfile, u.uid);
              }
            }, (error) => { console.warn('Snapshot error on user profile:', error); 
              if (error.code === 'resource-exhausted' || (error.message && error.message.includes('Quota limit'))) {
                setAuthError("Aviso: A quota gratuita diária do Firebase foi excedida. Você precisará habilitar o plano pago (Blaze) ou aguardar o reset diário para ler do banco. Tente novamente mais tarde.");
              }
 });
          }
        } catch (error: any) {
          console.warn("Notice during profile sync:", error);
          setAuthError(error.message || "Erro ao carregar perfil do usuário.");
        }
      } else {
        setUserProfile(null);
        syncApiKeyWithUserProfile(null);
        setIsTenantSuspended(false);
        setTenantSuspensionReason(null);
        setLoading(false);
      }
      if (!u || ((u.email || '').toLowerCase() !== 'fabriciocunha.adv@gmail.com')) {
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeUnits) unsubscribeUnits();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeTenant) unsubscribeTenant();
      unsubscribeAuth();
    };
  }, []);

  // When activeTenantId changes dynamically for Super Admin, re-bind units listener
  useEffect(() => {
    if (!isSuperAdmin || !user) return;
    setGlobalTenantId(activeTenantId);
    const unsub = subscribeToUnits((units) => {
      if (units && units.length > 0) {
        setDynamicUnits(units);
        setActiveUnitState(prev => {
          const matched = units.find(u => u.id === prev.id);
          if (matched) return matched;
          localStorage.setItem(ACTIVE_UNIT_KEY, units[0].id);
          return units[0];
        });
      } else if (isPrimaryCabinet(activeTenantId)) {
        setDynamicUnits(DEFAULT_UNITS);
      }
    });
    return () => {
      unsub();
    };
  }, [activeTenantId, isSuperAdmin, user]);

  const signIn = async (providerType: 'google' | 'microsoft' = 'google') => {
    try {
      setAuthError(null);
      const provider = providerType === 'microsoft' ? microsoftProvider : googleProvider;
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.warn("Notice during sign in:", error);
      if (error.code === 'auth/operation-not-allowed') {
        if (providerType === 'microsoft') {
          setAuthError("O provedor Microsoft não está ativado. Acesse o Firebase Console > Authentication > Sign-in method e ative a opção 'Microsoft' para liberar o acesso, ou utilize a opção de entrar com Google (ela funciona para a maioria dos e-mails institucionais).");
        } else {
          setAuthError("O provedor de login não está ativado no Firebase Console.");
        }
      } else {
        setAuthError(error.message || `Erro ao conectar com ${providerType === 'microsoft' ? 'Microsoft' : 'Google'}.`);
      }
    }
  };

  const completeTour = async (tourId: string) => {
    if (userProfile) {
      const current = userProfile.completedTours || [];
      if (!current.includes(tourId)) {
        const updated = [...current, tourId];
        await updateUserTours(userProfile.uid, updated);
        setUserProfile({ ...userProfile, completedTours: updated });
      }
    }
  };

  const resetTours = async () => {
    if (userProfile) {
      await updateUserTours(userProfile.uid, []);
      setUserProfile({ ...userProfile, completedTours: [] });
    }
  };

  const signOut = async () => {
    try {
      syncApiKeyWithUserProfile(null);
      await auth.signOut();
      setUser(null);
      setUserProfile(null);
      setAuthError(null);
    } catch (error) {
      console.warn("Notice during sign out:", error);
    }
  };

  const recheckInvite = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const refreshedProfile = await syncUserProfile(user);
      setUserProfile(refreshedProfile);
    } catch (err: any) {
      console.warn("Notice during recheck invite:", err);
    } finally {
      setLoading(false);
    }
  };

  const allowedUnits = useMemo(() => {
    const baseUnits = dynamicUnits && dynamicUnits.length > 0 ? dynamicUnits : DEFAULT_UNITS;
    if (isAdmin) {
      return baseUnits;
    }
    if (userProfile?.allowedUnits && userProfile.allowedUnits.length > 0) {
      const filtered = baseUnits.filter(u => userProfile.allowedUnits?.includes(u.id));
      if (filtered.length > 0) {
        return filtered;
      }
    }
    return baseUnits;
  }, [isAdmin, dynamicUnits, userProfile?.allowedUnits]);

  // Keep activeUnit valid within allowedUnits
  useEffect(() => {
    if (allowedUnits.length > 0) {
      setActiveUnitState(prev => {
        if (prev && allowedUnits.some(u => u.id === prev.id)) {
          return prev;
        }
        localStorage.setItem(ACTIVE_UNIT_KEY, allowedUnits[0].id);
        return allowedUnits[0];
      });
    }
  }, [allowedUnits]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      isAdmin, 
      isSuperAdmin, 
      isJudge, 
      isDeactivated,
      isUnauthorized,
      isTenantSuspended: isTenantSuspended && !isSuperAdmin,
      tenantSuspensionReason,
      tenantName,
      authError,
      canUseNativeKey, 
      loading, 
      activeUnit, 
      setActiveUnit, 
      allowedUnits, 
      activeTenantId,
      allTenants,
      allUnitsForSuperAdmin,
      setSuperAdminActiveTenant,
      signIn, 
      signOut, 
      completeTour, 
      resetTours,
      clearAuthError,
      recheckInvite
    }}>
      {children}
    </AuthContext.Provider>
  );
};
