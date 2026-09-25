import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Server, 
  Building, 
  Users, 
  ShieldCheck, 
  Plus, 
  Database, 
  AlertCircle, 
  Check, 
  X, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Power, 
  PowerOff, 
  ArrowRight, 
  RefreshCw, 
  Megaphone, 
  Key, 
  Crown, 
  Gavel, 
  FileText, 
  BookOpen, 
  Layers, 
  Lock, 
  Unlock, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown, 
  ExternalLink,
  Sparkles,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  UserPlus,
  Mail,
  Send,
  Share2,
  SendHorizontal,
  User,
  Copy,
  Bell,
  Download,
  Upload,
  Camera,
  History,
  ShieldAlert,
  Wrench,
  Scale,
  RotateCcw,
  Activity,
  Zap,
  Coins,
  BarChart3,
  PieChart,
  MessageSquare,
  Eye,
  Sliders
} from 'lucide-react';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  getAllTenantsWithMetrics, 
  updateTenantStatus, 
  updateTenantDetails, 
  updateCabinetPrimaryUnit,
  getAllGlobalUsers, 
  transferUserToCabinet, 
  deleteUserPermanently,
  updateUserStatus, 
  updateUserRole, 
  updateUserJudgeStatus, 
  updateUserNativeKeyAccess,
  updateUserUnits,
  getGlobalSaaSBroadcast,
  saveGlobalSaaSBroadcast,
  createCabinetBackupSnapshot,
  isPrimaryCabinet,
  inviteUserToTenant,
  getPendingInvites,
  removeInvite,
  createGlobalDatabaseSnapshot,
  autoPrePermissionChangeSnapshot,
  getGlobalDatabaseSnapshots,
  fetchFullGlobalDatabaseSnapshot,
  deleteGlobalDatabaseSnapshot,
  restoreGlobalDatabaseSnapshot,
  restoreAndHealDatabaseEntities,
  deepScanAndRescueAllCabinetData,
  DeepScanRescueReport,
  cleanForFirestore,
  getAllCabinetMonthlyUsage,
  importPastTokenUsageHistory,
  RetroactiveImportResult,
  calculateTokenCostBRL,
  getAllTenantsUsageLogs,
  LoggedExecution
} from '../lib/firestoreUtils';
import { 
  SaaSTenant, 
  TenantStatus, 
  TenantPlan, 
  UserProfile, 
  UserRole, 
  SystemBroadcast, 
  GlobalDatabaseSnapshot, 
  JudicialUnit, 
  CabinetMonthlyTokenUsage,
  ExecutionModuleType,
  ModuleTokenUsageStats
} from '../types';

interface SuperAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTicketsModal?: () => void;
}

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({ isOpen, onClose, onOpenTicketsModal }) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'snapshots' | 'broadcast' | 'migration' | 'tokens'>('tenants');

  // Snapshots & Healing State
  const [snapshots, setSnapshots] = useState<GlobalDatabaseSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [showCreateSnapshotModal, setShowCreateSnapshotModal] = useState(false);
  const [snapshotReasonInput, setSnapshotReasonInput] = useState('');
  const [snapshotSearchQuery, setSnapshotSearchQuery] = useState('');
  const [snapshotToRestore, setSnapshotToRestore] = useState<GlobalDatabaseSnapshot | null>(null);
  const [isRestoringSnapshot, setIsRestoringSnapshot] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState<string | null>(null);
  const [isHealingDatabase, setIsHealingDatabase] = useState(false);
  const [healReport, setHealReport] = useState<{
    tenantsHealed: string[];
    usersHealed: string[];
    historyRescued: number;
    promptsRescued: number;
    message: string;
  } | null>(null);

  // Deep Scan & Recovery State
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [deepScanReport, setDeepScanReport] = useState<DeepScanRescueReport | null>(null);

  // Token Usage Telemetry State (Super Admin)
  const [tokenUsageList, setTokenUsageList] = useState<CabinetMonthlyTokenUsage[]>([]);
  const [isLoadingTokenUsage, setIsLoadingTokenUsage] = useState(false);
  const [isImportingPastTokens, setIsImportingPastTokens] = useState(false);
  const [retroImportReport, setRetroImportReport] = useState<RetroactiveImportResult | null>(null);
  const [selectedTokenMonth, setSelectedTokenMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [tokenUsageSearch, setTokenUsageSearch] = useState<string>('');
  const [expandedCabinetTokenId, setExpandedCabinetTokenId] = useState<string | null>(null);
  const [tokenSubTab, setTokenSubTab] = useState<'modules_overview' | 'cabinet_financial' | 'user_keys' | 'recent_logs'>('modules_overview');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<'all' | ExecutionModuleType>('all');
  const [recentLogs, setRecentLogs] = useState<LoggedExecution[]>([]);
  const [isLoadingRecentLogs, setIsLoadingRecentLogs] = useState(false);
  const [keyHealthFilter, setKeyHealthFilter] = useState<'all' | 'needs_attention' | 'rotated_today' | 'no_key' | 'healthy'>('all');
  const [copiedInstructionEmail, setCopiedInstructionEmail] = useState<string | null>(null);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string | null>(null);
  const [allInvites, setAllInvites] = useState<{email: string, tenantId: string, invitedAt: number}[]>([]);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [inviteToDelete, setInviteToDelete] = useState<string | null>(null);
  const [inspectMemberSearch, setInspectMemberSearch] = useState<string>('');

  // Tenants State
  const [tenants, setTenants] = useState<SaaSTenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState<'all' | TenantStatus>('all');
  
  // Create Tenant Modal / Form
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [isSubmittingTenant, setIsSubmittingTenant] = useState(false);
  const [userCustomizedSlug, setUserCustomizedSlug] = useState(false);
  const [newTenantId, setNewTenantId] = useState('');
  const [newTenantName, setNewTenantName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newTenantInitialUnit, setNewTenantInitialUnit] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState<TenantPlan>('magistrado');
  const [newTenantNotes, setNewTenantNotes] = useState('');
  const [createTenantError, setCreateTenantError] = useState<string | null>(null);

  // Edit Tenant Modal
  const [editingTenant, setEditingTenant] = useState<SaaSTenant | null>(null);
  const [editName, setEditName] = useState('');
  const [editOwnerEmail, setEditOwnerEmail] = useState('');
  const [editInitialUnit, setEditInitialUnit] = useState('');
  const [editPlan, setEditPlan] = useState<TenantPlan>('magistrado');
  const [editNotes, setEditNotes] = useState('');
  const [editMaxUsers, setEditMaxUsers] = useState<number>(10);

  // Suspend/Deactivate Tenant Modal
  const [suspendingTenant, setSuspendingTenant] = useState<SaaSTenant | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionTargetStatus, setSuspensionTargetStatus] = useState<TenantStatus>('suspended');

  // Tenant Members Inspection Drawer / Modal
  const [inspectingTenant, setInspectingTenant] = useState<SaaSTenant | null>(null);
  const [inspectingTenantUnits, setInspectingTenantUnits] = useState<any[]>([]);

  useEffect(() => {
    if (inspectingTenant) {
      const fetchUnits = async () => {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          const snap = await getDoc(doc(db, `gabinetes/${inspectingTenant.id}/settings`, 'units'));
          if (snap.exists()) {
            setInspectingTenantUnits(snap.data().units || []);
          } else {
            setInspectingTenantUnits([]);
          }
        } catch (e) {
          console.error(e);
          setInspectingTenantUnits([]);
        }
      };
      fetchUnits();
    } else {
      setInspectingTenantUnits([]);
    }
  }, [inspectingTenant]);

  // Global Users State
  const [globalUsers, setGlobalUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'judge' | 'user' | 'inactive'>('all');
  const [userTenantFilter, setUserTenantFilter] = useState<string>('all');

  // Change User Tenant Modal
  const [transferringUser, setTransferringUser] = useState<UserProfile | null>(null);
  const [targetTenantId, setTargetTenantId] = useState<string>('');
  const [isCreatingNewInTransfer, setIsCreatingNewInTransfer] = useState(false);
  const [newCabinetNameInTransfer, setNewCabinetNameInTransfer] = useState('');
  const [newCabinetIdInTransfer, setNewCabinetIdInTransfer] = useState('');
  const [newCabinetPlanInTransfer, setNewCabinetPlanInTransfer] = useState<TenantPlan>('magistrado');
  const [transferError, setTransferError] = useState<string | null>(null);

  // Delete Tenant Confirmation
  const [tenantToDelete, setTenantToDelete] = useState<string | null>(null);

  // Delete User Confirmation
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Global Broadcast State
  const [globalBroadcast, setGlobalBroadcast] = useState<SystemBroadcast>({
    message: '',
    type: 'info',
    active: false,
    createdAt: Date.now()
  });
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null);

  // Migration State (Legacy Backup)
  const [isMigrating, setIsMigrating] = useState(false);
  const [selectedMigrationTenantId, setSelectedMigrationTenantId] = useState("");
  const [migrationLog, setMigrationLog] = useState<string>('');

  // Notification / Toast
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const getInviteMessageText = (email: string) => {
    const currentUrl = "https://assessor-judicial.ai.studio";
    return `Olá!\n\nSeu acesso ao Gabinete Virtual do Assessor Judicial de IA foi liberado pela administração.\n\n` +
      `Para acessar o sistema:\n` +
      `1. Acesse o link: ${currentUrl}\n` +
      `2. Clique em "Entrar com conta Google" e selecione o e-mail: ${email}\n` +
      `3. Seu acesso já está pré-configurado e autorizado.\n\n` +
      `Atenciosamente,\nAdministração do Gabinete Judicial`;
  };

  const getGmailWebUrl = (email: string) => {
    const subject = encodeURIComponent("Convite de Acesso ao Gabinete Virtual - Assessor Judicial de IA");
    const body = encodeURIComponent(getInviteMessageText(email));
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;
  };

  const getMailtoUrl = (email: string) => {
    const subject = encodeURIComponent("Convite de Acesso ao Gabinete Virtual - Assessor Judicial de IA");
    const body = encodeURIComponent(getInviteMessageText(email));
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const getWhatsAppUrl = (email: string) => {
    const currentUrl = "https://assessor-judicial.ai.studio";
    const text = encodeURIComponent(
      `*Convite de Acesso ao Gabinete Virtual - Assessor Judicial de IA*\n\n` +
      `Olá! Seu acesso ao Gabinete Virtual foi liberado para o e-mail: *${email}*.\n\n` +
      `Para acessar:\n` +
      `1. Acesse: ${currentUrl}\n` +
      `2. Clique em "Entrar com conta Google" com a conta *${email}*.\n\n` +
      `Seu acesso já está pronto!`
    );
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  const handleCopyInvite = async (email: string) => {
    try {
      await navigator.clipboard.writeText(getInviteMessageText(email));
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 3000);
    } catch (err) {
      console.warn("Could not copy:", err);
    }
  };

  const handleRemoveInvite = async (email: string) => {
    try {
      await removeInvite(email);
      setAllInvites(prev => prev.filter(inv => inv.email !== email));
      setInviteToDelete(null);
    } catch (err) {
      console.error("Erro ao remover convite:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  const showSuccessToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 4000);
  };

  const showErrorToast = (msg: string) => {
    setActionErrorMsg(msg);
    setTimeout(() => {
      setActionErrorMsg(null);
    }, 6000);
  };

  const loadAllData = async () => {
    setIsLoadingTenants(true);
    setIsLoadingUsers(true);
    setIsLoadingSnapshots(true);
    try {
      const [tenantsList, usersList, broadcast, invitesList, snapshotsList, tokensList] = await Promise.all([
        getAllTenantsWithMetrics(),
        getAllGlobalUsers(),
        getGlobalSaaSBroadcast(),
        getPendingInvites('ALL'),
        getGlobalDatabaseSnapshots(),
        getAllCabinetMonthlyUsage(selectedTokenMonth)
      ]);
      setTenants(tenantsList);
      setGlobalUsers(usersList);
      setAllInvites(invitesList);
      setSnapshots(snapshotsList);
      setTokenUsageList(tokensList);
      if (broadcast) {
        setGlobalBroadcast(broadcast);
      }
    } catch (e) {
      console.error("Error loading SaaS data:", e);
    } finally {
      setIsLoadingTenants(false);
      setIsLoadingUsers(false);
      setIsLoadingSnapshots(false);
    }
  };

  const loadTokenUsageOnly = async (month?: string) => {
    setIsLoadingTokenUsage(true);
    setIsLoadingRecentLogs(true);
    try {
      const targetM = month || selectedTokenMonth;
      const [res, logs] = await Promise.all([
        getAllCabinetMonthlyUsage(targetM),
        getAllTenantsUsageLogs(150)
      ]);
      setTokenUsageList(res);
      setRecentLogs(logs);
    } catch (err) {
      console.warn("Erro ao recarregar telemetria de tokens:", err);
    } finally {
      setIsLoadingTokenUsage(false);
      setIsLoadingRecentLogs(false);
    }
  };

  const handleImportPastTokens = async () => {
    setIsImportingPastTokens(true);
    setRetroImportReport(null);
    try {
      const res = await importPastTokenUsageHistory();
      setRetroImportReport(res);
      setActionSuccessMsg(`Importação retroativa concluída com sucesso! ${res.totalRecordsProcessed} minutas e execuções consolidadas, totalizando ${res.totalTokensImported.toLocaleString('pt-BR')} tokens distribuídos em ${res.cabinetsUpdated} gabinetes.`);
      await loadTokenUsageOnly(selectedTokenMonth);
    } catch (err) {
      console.error("Erro na importação retroativa:", err);
      setActionErrorMsg(`Falha na importação retroativa: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsImportingPastTokens(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tokens') {
      loadTokenUsageOnly(selectedTokenMonth);
    }
  }, [activeTab, selectedTokenMonth]);

  // ==========================================
  // TELEMETRIA DE CHAVES & POOL DOS USUÁRIOS (BYOK & NATIVE)
  // ==========================================
  const userKeysTelemetryData = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const tenantMap = new Map(tenants.map(t => [t.id, t.name || t.id]));

    // 1. Mapear todos os usuários de globalUsers
    const userMap = new Map<string, any>();
    globalUsers.forEach(u => {
      const em = (u.email || u.uid || '').toLowerCase().trim();
      if (em) userMap.set(em, u);
    });

    // 2. Incorporar usuários adicionais presentes em tokenUsageList (mesmo que não estejam na coleção users)
    tokenUsageList.forEach(cab => {
      if (cab.users) {
        Object.entries(cab.users).forEach(([k, uData]: [string, any]) => {
          const em = (uData.userEmail || k).toLowerCase().trim();
          if (em && !userMap.has(em)) {
            userMap.set(em, {
              uid: em,
              email: em,
              name: uData.userName || em.split('@')[0],
              role: 'user',
              tenantId: cab.tenantId,
              isActive: true,
              keyTelemetry: {
                poolSize: uData.poolSize || 1,
                activeKeyLabel: uData.activeKeyLabel || 'Chave 1',
                activeKeySnippet: uData.activeKeySnippet || '',
                rotationsCount: uData.rotationsCount || 0,
                dailyRequests: uData.dailyRequests || 0,
                dailyDate: uData.dailyDate || todayStr,
                lastRotationAt: uData.lastRotationAt,
                lastRotationReason: uData.lastRotationReason,
                lastUsedAt: uData.lastUsedAt || 0
              }
            });
          }
        });
      }
    });

    const allUsers = Array.from(userMap.values());

    return allUsers.map(user => {
      const email = (user.email || user.uid || '').toLowerCase().trim();
      const sanitizedEmailKey = email.replace(/[^a-zA-Z0-9_-]/g, '_');
      const cabinetName = tenantMap.get(user.tenantId || '') || user.tenantId || 'Gabinete Padrão';
      const isNative = Boolean(user.canUseNativeKey);

      // Quantidade de chaves no pool
      const poolCount = isNative
        ? 1
        : (user.customApiKeys && user.customApiKeys.length > 0
            ? user.customApiKeys.length
            : (user.keyTelemetry?.poolSize !== undefined
                ? user.keyTelemetry.poolSize
                : (user.customApiKey ? 1 : 0)));

      // Encontrar uso registrado no mês atual nos gabinetes com busca flexível
      let statsInMonth: any = null;
      for (const cab of tokenUsageList) {
        if (!cab.users) continue;
        if (cab.users[sanitizedEmailKey]) {
          statsInMonth = cab.users[sanitizedEmailKey];
          break;
        }
        for (const [k, uVal] of Object.entries(cab.users)) {
          const valEmail = (uVal as any)?.userEmail || k;
          if (valEmail && (valEmail.toLowerCase().trim() === email || k.toLowerCase() === sanitizedEmailKey)) {
            statsInMonth = uVal;
            break;
          }
        }
        if (statsInMonth) break;
      }

      const activeLabel = isNative
        ? 'Chave Corporativa Oficial'
        : (user.keyTelemetry?.activeKeyLabel || (user.customApiKeys && user.customApiKeys[0]?.label) || (poolCount > 0 ? 'Chave 1' : 'Nenhuma chave'));

      const activeSnippet = isNative
        ? 'NATIVA'
        : (user.keyTelemetry?.activeKeySnippet || (user.customApiKey ? `...${user.customApiKey.slice(-4)}` : ''));

      const dailyRequests = user.keyTelemetry?.dailyDate === todayStr
        ? (user.keyTelemetry.dailyRequests || 0)
        : (statsInMonth?.dailyDate === todayStr ? (statsInMonth.dailyRequests || 0) : 0);

      const rotationsCount = Math.max(
        user.keyTelemetry?.rotationsCount || 0,
        statsInMonth?.rotationsCount || 0
      );

      const lastRotationAt = user.keyTelemetry?.lastRotationAt || statsInMonth?.lastRotationAt;
      const lastRotationReason = user.keyTelemetry?.lastRotationReason || statsInMonth?.lastRotationReason;

      const rotatedToday = Boolean(
        lastRotationAt &&
        new Date(lastRotationAt).toISOString().slice(0, 10) === todayStr
      );

      const totalMonthRequests = statsInMonth?.requestCount || user.keyTelemetry?.totalRequests || 0;
      const totalMonthTokens = statsInMonth?.totalTokens || user.keyTelemetry?.totalTokens || 0;
      const lastUsedAt = user.keyTelemetry?.lastUsedAt || statsInMonth?.lastUsedAt || 0;

      // Status de Saúde da cota / pool: se rotacionou hoje ou tem trocas registradas, destaca a troca 429
      let healthStatus: 'native' | 'no_key' | 'single_key' | 'rotated_today' | 'healthy' = 'healthy';
      if (isNative) {
        healthStatus = 'native';
      } else if (poolCount === 0) {
        healthStatus = 'no_key';
      } else if (rotatedToday || rotationsCount > 0) {
        healthStatus = 'rotated_today';
      } else if (poolCount === 1) {
        healthStatus = 'single_key';
      } else {
        healthStatus = 'healthy';
      }

      return {
        user,
        email,
        name: user.name || email.split('@')[0],
        cabinetName,
        tenantId: user.tenantId,
        isNative,
        poolCount,
        activeLabel,
        activeSnippet,
        dailyRequests,
        rotationsCount,
        lastRotationAt,
        lastRotationReason,
        rotatedToday,
        totalMonthRequests,
        totalMonthTokens,
        lastUsedAt,
        healthStatus
      };
    });
  }, [globalUsers, tenants, tokenUsageList]);

  const filteredUserKeys = useMemo(() => {
    return userKeysTelemetryData.filter(item => {
      // Busca por texto
      if (tokenUsageSearch.trim()) {
        const q = tokenUsageSearch.toLowerCase();
        const match = item.name.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.cabinetName.toLowerCase().includes(q) ||
          item.activeLabel.toLowerCase().includes(q);
        if (!match) return false;
      }
      // Filtro de saúde
      if (keyHealthFilter === 'needs_attention') {
        return item.healthStatus === 'single_key' || item.healthStatus === 'no_key';
      }
      if (keyHealthFilter === 'rotated_today') {
        return item.rotatedToday || item.rotationsCount > 0;
      }
      if (keyHealthFilter === 'no_key') {
        return item.healthStatus === 'no_key';
      }
      if (keyHealthFilter === 'healthy') {
        return item.healthStatus === 'healthy' || item.healthStatus === 'native';
      }
      return true;
    }).sort((a, b) => {
      // Usuários que precisam de atenção primeiro
      if (a.healthStatus === 'no_key' && b.healthStatus !== 'no_key') return -1;
      if (b.healthStatus === 'no_key' && a.healthStatus !== 'no_key') return 1;
      if (a.healthStatus === 'single_key' && b.healthStatus === 'healthy') return -1;
      if (b.healthStatus === 'single_key' && a.healthStatus === 'healthy') return 1;
      if (a.rotatedToday && !b.rotatedToday) return -1;
      if (b.rotatedToday && !a.rotatedToday) return 1;
      return (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
    });
  }, [userKeysTelemetryData, tokenUsageSearch, keyHealthFilter]);

  // Estatísticas Agregadas por Módulo / Ferramenta (Minutas, Audiências, Lupa do Magistrado, Chat, etc.)
  const globalModuleStats = useMemo(() => {
    const stats: Record<ExecutionModuleType, {
      totalTokens: number;
      promptTokens: number;
      candidatesTokens: number;
      requestCount: number;
      costBrl: number;
    }> = {
      minuta: { totalTokens: 0, promptTokens: 0, candidatesTokens: 0, requestCount: 0, costBrl: 0 },
      audiencia: { totalTokens: 0, promptTokens: 0, candidatesTokens: 0, requestCount: 0, costBrl: 0 },
      lupa_magistrado: { totalTokens: 0, promptTokens: 0, candidatesTokens: 0, requestCount: 0, costBrl: 0 },
      chat_refino: { totalTokens: 0, promptTokens: 0, candidatesTokens: 0, requestCount: 0, costBrl: 0 },
      outros: { totalTokens: 0, promptTokens: 0, candidatesTokens: 0, requestCount: 0, costBrl: 0 },
    };

    tokenUsageList.forEach(item => {
      if (item.modules) {
        Object.entries(item.modules).forEach(([k, v]) => {
          const mod = k as ExecutionModuleType;
          if (stats[mod] && v) {
            stats[mod].totalTokens += v.totalTokens || 0;
            stats[mod].promptTokens += v.promptTokens || 0;
            stats[mod].candidatesTokens += v.candidatesTokens || 0;
            stats[mod].requestCount += v.requestCount || 0;
            stats[mod].costBrl = Number(((stats[mod].costBrl || 0) + (v.costBrl || 0)).toFixed(4));
          }
        });
      }
    });

    // Se houver tokens globais que não constam em modules (registros antigos não categorizados),
    // somar a diferença em 'minuta' para consistência visual perfeita
    const totalGlobalTokens = tokenUsageList.reduce((acc, curr) => acc + (curr.totalTokens || 0), 0);
    const sumCategorized = Object.values(stats).reduce((acc, s) => acc + s.totalTokens, 0);
    if (sumCategorized < totalGlobalTokens) {
      const diff = totalGlobalTokens - sumCategorized;
      const diffCost = calculateTokenCostBRL(Math.round(diff * 0.7), Math.round(diff * 0.3), diff).brlTotal;
      stats.minuta.totalTokens += diff;
      stats.minuta.promptTokens += Math.round(diff * 0.7);
      stats.minuta.candidatesTokens += Math.round(diff * 0.3);
      stats.minuta.costBrl = Number(((stats.minuta.costBrl || 0) + diffCost).toFixed(4));
      stats.minuta.requestCount += 1;
    }

    return stats;
  }, [tokenUsageList]);

  const filteredRecentLogs = useMemo(() => {
    return recentLogs.filter(l => {
      if (selectedModuleFilter !== 'all' && l.module !== selectedModuleFilter) return false;
      if (tokenUsageSearch.trim()) {
        const q = tokenUsageSearch.toLowerCase();
        const match = (l.processNumber || '').toLowerCase().includes(q) ||
          (l.label || '').toLowerCase().includes(q) ||
          (l.userName || '').toLowerCase().includes(q) ||
          (l.userEmail || '').toLowerCase().includes(q) ||
          (l.tenantId || '').toLowerCase().includes(q) ||
          (l.keyLabel || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [recentLogs, selectedModuleFilter, tokenUsageSearch]);

  const handleCopyWhatsAppInstruction = (item: typeof userKeysTelemetryData[0]) => {
    let msg = "";
    const firstName = item.name.split(' ')[0] || "Prezado(a)";
    if (item.healthStatus === 'no_key') {
      msg = `Olá ${firstName}!\n\nIdentificamos no painel de administração que seu acesso ao Assessor Judicial está ativo, porém sua Chave de IA gratuita do Google ainda não foi configurada.\n\nPara liberar a geração de minutas com a IA do Google:\n1. Acesse o Assessor Judicial;\n2. Clique no ícone de Chave de IA (ou no menu Configurações);\n3. Cole sua chave gratuita obtida no Google AI Studio (a.istudio/api-key).\n\nQualquer dúvida sobre a emissão da chave, avise aqui!`;
    } else if (item.healthStatus === 'single_key') {
      msg = `Olá ${firstName}!\n\nNotamos no monitoramento do gabinete que você possui 1 chave gratuita do Google AI Studio cadastrada no Assessor Judicial.\n\n💡 Dica importante: O Google AI Studio possui um teto temporário de requisições por minuto e diárias (Erro 429). Para evitar interrupções no meio da redação de uma minuta, adicione uma 2ª chave gratuita no menu Configurações > Chaves de IA.\n\nCom 2 chaves cadastradas, o sistema comuta automaticamente caso uma cota seja atingida, sem travar seu trabalho!`;
    } else if (item.rotatedToday || item.healthStatus === 'rotated_today') {
      msg = `Olá ${firstName}!\n\nO sistema do Assessor Judicial realizou com sucesso a rotação automática para a sua chave reserva hoje devido ao atingimento do limite temporário de requisições da chave anterior (Erro 429).\n\nSeu trabalho segue ininterrupto e sem falhas!`;
    } else {
      msg = `Olá ${firstName}!\n\nSeu pool de chaves de IA no Assessor Judicial está operando com excelência (${item.poolCount} chaves ativas). Conte conosco para qualquer apoio!`;
    }

    navigator.clipboard.writeText(msg);
    setCopiedInstructionEmail(item.email);
    toast.success("Mensagem de instrução copiada para a área de transferência!");
    setTimeout(() => setCopiedInstructionEmail(null), 3000);
  };

  // ==========================================
  // TENANT HANDLERS
  // ==========================================

  const generateSlugFromName = (name: string): string => {
    const clean = name
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 32);
    return clean ? (clean.startsWith('gab_') ? clean : `gab_${clean}`) : '';
  };

  const handleNameChange = (name: string) => {
    setNewTenantName(name);
    if (!userCustomizedSlug || !newTenantId) {
      setNewTenantId(generateSlugFromName(name));
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateTenantError(null);

    let formattedId = newTenantId.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    if (!formattedId && newTenantName.trim()) {
      formattedId = generateSlugFromName(newTenantName.trim());
    }

    const formattedEmail = newOwnerEmail.trim().toLowerCase();

    if (!formattedId || !newTenantName.trim() || !formattedEmail) {
      setCreateTenantError("Preencha todos os campos obrigatórios (Nome, ID e E-mail do Administrador Titular).");
      return;
    }

    if (!formattedEmail.endsWith('@gmail.com')) {
      setCreateTenantError("Por favor, utilize uma conta Google válida (@gmail.com).");
      return;
    }

    if (tenants.some(t => t.id === formattedId)) {
      setCreateTenantError(`O ID de partição "${formattedId}" já está em uso por outro gabinete. Escolha outro identificador.`);
      return;
    }

    setIsSubmittingTenant(true);

    try {
      // Safety Snapshot before provisioning new tenant (non-blocking if warning)
      try {
        await autoPrePermissionChangeSnapshot(`Criação do Gabinete "${newTenantName.trim()}" (${formattedId})`);
      } catch (snapErr) {
        console.warn("Aviso ao gerar snapshot pré-criação:", snapErr);
      }

      const tenantData: SaaSTenant = {
        id: formattedId,
        name: newTenantName.trim(),
        ownerEmail: formattedEmail,
        createdAt: Date.now(),
        status: 'active',
        plan: newTenantPlan,
        notes: newTenantNotes.trim(),
        maxUsers: newTenantPlan === 'enterprise' ? 50 : (newTenantPlan === 'pro' ? 20 : 10)
      };

      // 1. Cadastrar documento do Gabinete na coleção 'tenants'
      await setDoc(doc(db, 'tenants', tenantData.id), cleanForFirestore(tenantData));
      
      // 2. Criar o documento raiz de configurações do perfil do gabinete
      await setDoc(doc(db, 'gabinetes', tenantData.id, 'settings', 'profile'), cleanForFirestore({
        name: tenantData.name,
        ownerEmail: tenantData.ownerEmail,
        createdAt: tenantData.createdAt,
        plan: tenantData.plan,
        notes: tenantData.notes || ''
      }));

      // 3. Provisionar Lotação / Vara inicial para o novo gabinete
      const unitLabel = newTenantInitialUnit.trim()
        ? newTenantInitialUnit.trim()
        : (newTenantNotes.trim() || `1ª Vara Judicial / ${tenantData.name}`);

      const initialUnits: JudicialUnit[] = [
        {
          id: `vara_${tenantData.id.replace(/^gab_/, '') || 'principal'}`,
          name: unitLabel,
          tenantId: tenantData.id,
          tenantName: tenantData.name
        }
      ];

      await setDoc(doc(db, 'gabinetes', tenantData.id, 'settings', 'units'), cleanForFirestore({
        units: initialUnits,
        updatedAt: new Date().toISOString()
      }));

      // 4. Registrar convite no banco para que no primeiro login o titular seja automaticamente alocado
      await setDoc(doc(db, 'invites', formattedEmail), cleanForFirestore({
        email: formattedEmail,
        tenantId: tenantData.id,
        role: 'admin',
        invitedAt: Date.now()
      }), { merge: true });

      // 5. Se o titular já existe no sistema, migrá-lo como admin e magistrado deste gabinete
      const existingUser = globalUsers.find(u => (u.email || '').toLowerCase() === formattedEmail);
      if (existingUser) {
        await transferUserToCabinet(existingUser.uid, tenantData.id, formattedEmail);
        await updateUserRole(existingUser.uid, 'admin');
        await updateUserJudgeStatus(existingUser.uid, true, `Magistrado(a) - ${tenantData.name}`);
      }

      setNewTenantId('');
      setNewTenantName('');
      setNewOwnerEmail('');
      setNewTenantInitialUnit('');
      setNewTenantNotes('');
      setUserCustomizedSlug(false);
      setIsCreatingTenant(false);
      
      showSuccessToast(`Gabinete "${tenantData.name}" provisionado com sucesso!`);
      await loadAllData();
    } catch (err: any) {
      console.error("Erro ao criar gabinete:", err);
      setCreateTenantError("Erro ao criar gabinete: " + (err.message || String(err)));
    } finally {
      setIsSubmittingTenant(false);
    }
  };

  const handleOpenEditTenant = (tenant: SaaSTenant) => {
    setEditingTenant(tenant);
    setEditName(tenant.name || '');
    setEditOwnerEmail(tenant.ownerEmail || '');
    setEditPlan(tenant.plan || 'magistrado');
    setEditNotes(tenant.notes || '');
    setEditMaxUsers(tenant.maxUsers || 10);
    setEditInitialUnit(tenant.primaryUnitName || tenant.notes || '');
  };

  const handleSaveEditTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    // Safety Snapshot
    await autoPrePermissionChangeSnapshot(`Edição de dados do Gabinete "${editingTenant.name}" (${editingTenant.id})`);

    try {
      await updateTenantDetails(editingTenant.id, {
        name: editName.trim(),
        ownerEmail: editOwnerEmail.trim().toLowerCase(),
        plan: editPlan,
        notes: editNotes.trim(),
        maxUsers: Number(editMaxUsers) || 10
      });

      if (editInitialUnit.trim()) {
        await updateCabinetPrimaryUnit(editingTenant.id, editInitialUnit.trim(), editName.trim());
      }

      setEditingTenant(null);
      showSuccessToast(`Dados do gabinete "${editName}" atualizados com sucesso!`);
      loadAllData();
    } catch (err: any) {
      showErrorToast("Erro ao salvar alterações: " + (err.message || String(err)));
    }
  };

  const handleToggleTenantStatus = async (tenant: SaaSTenant, targetStatus: TenantStatus, reason?: string) => {
    // Safety Snapshot
    await autoPrePermissionChangeSnapshot(`Alteração de status do Gabinete "${tenant.name}" para ${targetStatus.toUpperCase()}`);

    try {
      await updateTenantStatus(tenant.id, targetStatus, reason);
      setSuspendingTenant(null);
      setSuspensionReason('');
      showSuccessToast(
        targetStatus === 'active' 
          ? `Gabinete "${tenant.name}" reativado com sucesso!`
          : `Gabinete "${tenant.name}" alterado para status: ${targetStatus.toUpperCase()}.`
      );
      loadAllData();
    } catch (err: any) {
      showErrorToast("Erro ao alterar status: " + (err.message || String(err)));
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    const t = tenants.find(item => item.id === tenantId);
    // Safety Snapshot
    await autoPrePermissionChangeSnapshot(`Exclusão do Gabinete "${t?.name || tenantId}"`);

    try {
      await deleteDoc(doc(db, 'tenants', tenantId));
      setTenants(prev => prev.filter(t => t.id !== tenantId));
      setTenantToDelete(null);
      showSuccessToast("Gabinete excluído do cadastro com sucesso.");
      loadAllData();
    } catch (err: any) {
      showErrorToast("Erro ao excluir gabinete: " + (err.message || String(err)));
    }
  };

  // ==========================================
  // USER HANDLERS
  // ==========================================

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.trim() || !inspectingTenant) return;
    const cleanEmail = inviteEmail.trim().toLowerCase();
    
    if (!cleanEmail.endsWith('@gmail.com')) {
      setInviteFeedback({
        type: 'error',
        message: 'Por favor, convide apenas contas @gmail.com.'
      });
      return;
    }

    // Check if already in list for this tenant
    const existing = globalUsers.find(u => {
      const uTenant = u.tenantId || 'gabinete_default';
      const isMatch = isPrimaryCabinet(inspectingTenant.id) ? isPrimaryCabinet(uTenant) : uTenant === inspectingTenant.id;
      return (u.email || '').toLowerCase() === cleanEmail && isMatch;
    });

    if (existing && existing.isActive !== false) {
      setInviteFeedback({
        type: 'error',
        message: `O e-mail "${cleanEmail}" já é membro ativo deste gabinete.`
      });
      return;
    }

    setInviting(true);
    setInviteFeedback(null);
    try {
      await inviteUserToTenant(cleanEmail, inspectingTenant.id);
      setLastInvitedEmail(cleanEmail);
      setInviteEmail("");
      setInviteFeedback({
        type: 'success',
        message: `Convite registrado com sucesso para "${cleanEmail}"!`
      });
      await loadAllData();
    } catch (err: any) {
      setInviteFeedback({
        type: 'error',
        message: "Erro ao convidar usuário: " + (err.message || String(err))
      });
    } finally {
      setInviting(false);
    }
  };

  const handleTransferUser = async () => {
    if (!transferringUser) return;
    setTransferError(null);

    let finalTenantId = targetTenantId;
    let finalCabinetName = '';

    try {
      if (isCreatingNewInTransfer) {
        const formattedId = newCabinetIdInTransfer.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const formattedName = newCabinetNameInTransfer.trim();

        if (!formattedId || !formattedName) {
          setTransferError("Preencha o nome e o ID do novo gabinete.");
          return;
        }

        if (tenants.some(t => t.id === formattedId)) {
          setTransferError(`O ID "${formattedId}" já está em uso por outro gabinete.`);
          return;
        }

        const newTenantData: SaaSTenant = {
          id: formattedId,
          name: formattedName,
          ownerEmail: transferringUser.email.toLowerCase(),
          createdAt: Date.now(),
          status: 'active',
          plan: newCabinetPlanInTransfer,
          notes: `Criado na transferência de ${transferringUser.email}`,
          maxUsers: newCabinetPlanInTransfer === 'enterprise' ? 50 : (newCabinetPlanInTransfer === 'pro' ? 20 : 10)
        };

        await setDoc(doc(db, 'tenants', formattedId), newTenantData);
        await setDoc(doc(db, 'gabinetes', formattedId, 'settings', 'profile'), {
          name: formattedName,
          ownerEmail: transferringUser.email.toLowerCase(),
          createdAt: Date.now(),
          plan: newCabinetPlanInTransfer
        });

        finalTenantId = formattedId;
        finalCabinetName = formattedName;
      } else {
        if (!finalTenantId) {
          setTransferError("Selecione o gabinete de destino.");
          return;
        }
        finalCabinetName = tenants.find(t => t.id === finalTenantId)?.name || finalTenantId;
      }

      // Safety Snapshot
      await autoPrePermissionChangeSnapshot(`Transferência do usuário ${transferringUser.email} para "${finalCabinetName}"`);

      await transferUserToCabinet(transferringUser.uid, finalTenantId, transferringUser.email);
      showSuccessToast(`Usuário ${transferringUser.email} transferido para "${finalCabinetName}" com sucesso!`);
      
      setTransferringUser(null);
      setTargetTenantId('');
      setIsCreatingNewInTransfer(false);
      setNewCabinetNameInTransfer('');
      setNewCabinetIdInTransfer('');
      setTransferError(null);
      loadAllData();
    } catch (err: any) {
      setTransferError("Erro ao transferir usuário: " + (err.message || String(err)));
    }
  };

  const handleRequestDeleteUser = (user: UserProfile) => {
    const isMaster = user.email.toLowerCase() === 'fabriciocunha.adv@gmail.com';
    if (isMaster) {
      showErrorToast("Você não pode excluir o Administrador Master do sistema.");
      return;
    }
    setUserToDelete(user);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const isMaster = userToDelete.email.toLowerCase() === 'fabriciocunha.adv@gmail.com';
    if (isMaster) {
      showErrorToast("Você não pode excluir o Administrador Master do sistema.");
      setUserToDelete(null);
      return;
    }

    setIsDeletingUser(true);
    try {
      // Safety Snapshot
      await autoPrePermissionChangeSnapshot(`Exclusão permanente do usuário "${userToDelete.name || userToDelete.email}" (${userToDelete.uid})`);

      await deleteUserPermanently(userToDelete.uid, userToDelete.email);
      // Immediately filter out from globalUsers in UI
      setGlobalUsers(prev => prev.filter(u => u.uid !== userToDelete.uid && (u.email || '').toLowerCase() !== userToDelete.email.toLowerCase()));
      showSuccessToast(`Usuário "${userToDelete.name || userToDelete.email}" excluído permanentemente do sistema.`);
      setUserToDelete(null);
      await loadAllData();
    } catch (err: any) {
      showErrorToast("Erro ao excluir usuário: " + (err.message || String(err)));
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleToggleUserStatus = async (user: UserProfile) => {
    const newStatus = !(user.isActive !== false);
    const userEmail = (user.email || '').toLowerCase().trim();

    // 1. Optimistic UI update
    setGlobalUsers(prev => prev.map(u => (u.uid === user.uid || (u.email && u.email.toLowerCase().trim() === userEmail)) ? { ...u, isActive: newStatus } : u));

    // 2. Safety Snapshot in background
    autoPrePermissionChangeSnapshot(`Alteração de status do usuário ${user.email} para ${newStatus ? 'ATIVO' : 'DESATIVADO'}`).catch(() => {});

    try {
      await updateUserStatus(user.uid, newStatus, user.email);
      showSuccessToast(`Usuário ${user.email} ${newStatus ? 'ativado' : 'desativado'} com sucesso.`);
      await loadAllData();
    } catch (err: any) {
      showErrorToast("Erro ao alterar status do usuário: " + (err.message || String(err)));
      await loadAllData();
    }
  };

  const handleSetUserRole = async (user: UserProfile, newRole: UserRole) => {
    const userEmail = (user.email || '').toLowerCase().trim();

    // 1. Optimistic UI update
    setGlobalUsers(prev => prev.map(u => (u.uid === user.uid || (u.email && u.email.toLowerCase().trim() === userEmail)) ? { ...u, role: newRole } : u));

    // 2. Safety Snapshot in background
    autoPrePermissionChangeSnapshot(`Alteração de função do usuário ${user.email} para ${newRole === 'admin' ? 'Administrador' : 'Assessor'}`).catch(() => {});

    try {
      await updateUserRole(user.uid, newRole, user.email);
      showSuccessToast(`Função de ${user.email} alterada para: ${newRole === 'admin' ? 'Administrador' : 'Assessor'}.`);
      await loadAllData();
    } catch (err: any) {
      showErrorToast("Erro ao alterar função: " + (err.message || String(err)));
      await loadAllData();
    }
  };

  const handleToggleUserRole = async (user: UserProfile) => {
    const newRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
    await handleSetUserRole(user, newRole);
  };

  const handleToggleJudgeStatus = async (user: UserProfile) => {
    const newJudge = !user.isJudge;
    const userEmail = (user.email || '').toLowerCase().trim();

    // 1. Optimistic UI update
    setGlobalUsers(prev => prev.map(u => (u.uid === user.uid || (u.email && u.email.toLowerCase().trim() === userEmail)) ? { ...u, isJudge: newJudge } : u));

    // 2. Safety Snapshot in background
    autoPrePermissionChangeSnapshot(`Alteração de status de magistrado do usuário ${user.email} para ${newJudge ? 'Juiz Titular' : 'Assessor'}`).catch(() => {});

    try {
      await updateUserJudgeStatus(user.uid, newJudge, newJudge ? 'Magistrado Titular' : undefined, user.email);
      showSuccessToast(`Status de Magistrado de ${user.email}: ${newJudge ? 'Marcado como Juiz' : 'Assessor'}.`);
      await loadAllData();
    } catch (err: any) {
      showErrorToast("Erro ao atualizar status de juiz: " + (err.message || String(err)));
      await loadAllData();
    }
  };

  const handleToggleNativeKey = async (user: UserProfile) => {
    const newAccess = !user.canUseNativeKey;
    const userEmail = (user.email || '').toLowerCase().trim();

    // 1. Optimistic UI update
    setGlobalUsers(prev => prev.map(u => (u.uid === user.uid || (u.email && u.email.toLowerCase().trim() === userEmail)) ? { ...u, canUseNativeKey: newAccess } : u));

    // 2. Safety Snapshot in background
    autoPrePermissionChangeSnapshot(`Alteração de permissão da chave IA nativa para ${user.email} (${newAccess ? 'LIBERADO' : 'BLOQUEADO'})`).catch(() => {});

    try {
      await updateUserNativeKeyAccess(user.uid, newAccess, user.email);
      showSuccessToast(`Acesso à Chave IA Nativa para ${user.email}: ${newAccess ? 'LIBERADO' : 'BLOQUEADO'}.`);
      await loadAllData();
    } catch (err: any) {
      showErrorToast("Erro ao atualizar acesso à chave nativa: " + (err.message || String(err)));
      await loadAllData();
    }
  };

  const handleToggleUserUnits = async (user: UserProfile, newUnits: string[]) => {
    const userEmail = (user.email || '').toLowerCase().trim();

    // 1. Optimistic UI update
    setGlobalUsers(prev => prev.map(u => (u.uid === user.uid || (u.email && u.email.toLowerCase().trim() === userEmail)) ? { ...u, allowedUnits: newUnits } : u));

    // 2. Safety Snapshot in background
    autoPrePermissionChangeSnapshot(`Alteração de lotações/unidades liberadas para ${user.email}`).catch(() => {});

    try {
      await updateUserUnits(user.uid, newUnits, user.email);
      showSuccessToast(`Unidades de ${user.email} atualizadas com sucesso.`);
      await loadAllData();
    } catch (err: any) {
      showErrorToast("Erro ao atualizar unidades: " + (err.message || String(err)));
      await loadAllData();
    }
  };

  // ==========================================
  // SNAPSHOT & AUTO-CURA HANDLERS
  // ==========================================

  const handleCreateManualSnapshot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const reason = snapshotReasonInput.trim() || 'Snapshot Manual de Segurança (Super Admin)';
    setIsCreatingSnapshot(true);
    try {
      const snap = await createGlobalDatabaseSnapshot(reason, "manual");
      if (snap) {
        showSuccessToast(`Ponto de Restauração "${snap.reason}" criado com sucesso!`);
        setShowCreateSnapshotModal(false);
        setSnapshotReasonInput('');
        await loadAllData();
      } else {
        showErrorToast("Não foi possível gerar o snapshot global.");
      }
    } catch (err: any) {
      showErrorToast("Erro ao criar snapshot: " + (err.message || String(err)));
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (snapshot: GlobalDatabaseSnapshot) => {
    setIsRestoringSnapshot(true);
    try {
      const res = await restoreGlobalDatabaseSnapshot(snapshot);
      showSuccessToast(`Restauração Concluída! ${res.restoredTenants} gabinetes, ${res.restoredUsers} usuários, ${res.restoredHistories} históricos e ${res.restoredPrompts} prompts restaurados com sucesso.`);
      setSnapshotToRestore(null);
      await loadAllData();
    } catch (err: any) {
      showErrorToast("Erro ao restaurar snapshot: " + (err.message || String(err)));
    } finally {
      setIsRestoringSnapshot(false);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    try {
      await deleteGlobalDatabaseSnapshot(snapshotId);
      setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
      setSnapshotToDelete(null);
      showSuccessToast("Snapshot excluído com sucesso.");
    } catch (err: any) {
      showErrorToast("Erro ao excluir snapshot: " + (err.message || String(err)));
    }
  };

  const handleDownloadSnapshotJson = async (snapshot: GlobalDatabaseSnapshot) => {
    try {
      const fullSnapshot = (await fetchFullGlobalDatabaseSnapshot(snapshot)) || snapshot;
      const jsonStr = JSON.stringify(fullSnapshot, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeDate = new Date(snapshot.timestamp).toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `snapshot_assessor_judicial_${safeDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccessToast("Download do arquivo de Snapshot JSON iniciado!");
    } catch (err: any) {
      showErrorToast("Erro ao baixar snapshot: " + (err.message || String(err)));
    }
  };

  const handleImportSnapshotJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed: GlobalDatabaseSnapshot = JSON.parse(text);
      if (!parsed.data || !parsed.id) {
        throw new Error("Arquivo JSON não contém uma estrutura válida de Snapshot do Assessor Judicial.");
      }

      const res = await restoreGlobalDatabaseSnapshot(parsed);
      showSuccessToast(`Snapshot "${parsed.reason || parsed.id}" importado e restaurado com sucesso! (${res.restoredTenants} gabinetes, ${res.restoredUsers} usuários restaurados)`);
      await loadAllData();
    } catch (err: any) {
      showErrorToast("Erro ao importar arquivo de snapshot: " + (err.message || String(err)));
    } finally {
      e.target.value = '';
    }
  };

  const handleRunAutoHeal = async () => {
    setIsHealingDatabase(true);
    setHealReport(null);
    try {
      const report = await restoreAndHealDatabaseEntities();
      setHealReport(report);
      showSuccessToast("Auto-Cura e Restauração de Gabinetes concluída com sucesso!");
      await loadAllData();
    } catch (err: any) {
      showErrorToast("Erro ao executar auto-cura: " + (err.message || String(err)));
    } finally {
      setIsHealingDatabase(false);
    }
  };

  const handleRunDeepScan = async () => {
    setIsDeepScanning(true);
    setDeepScanReport(null);
    try {
      const report = await deepScanAndRescueAllCabinetData();
      setDeepScanReport(report);
      showSuccessToast("Varredura Profunda e Resgate de Cadastros concluída com sucesso!");
      await loadAllData();
    } catch (err: any) {
      showErrorToast("Erro ao executar varredura profunda: " + (err.message || String(err)));
    } finally {
      setIsDeepScanning(false);
    }
  };

  // ==========================================
  // BROADCAST HANDLER
  // ==========================================

  const handleSaveBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBroadcast(true);
    setBroadcastFeedback(null);
    try {
      const payload: SystemBroadcast = {
        ...globalBroadcast,
        createdAt: Date.now()
      };

      // If activating broadcast, automatically create a backup snapshot
      if (globalBroadcast.active && globalBroadcast.message?.trim()) {
        try {
          await createCabinetBackupSnapshot("broadcast", {
            message: globalBroadcast.message.trim(),
            type: globalBroadcast.type,
          });
        } catch (backupErr) {
          console.warn("Falha no snapshot automático durante transmissão global:", backupErr);
        }
      }

      await saveGlobalSaaSBroadcast(payload);
      setBroadcastFeedback("Comunicado global atualizado e backup de segurança do gabinete salvo com sucesso!");
      showSuccessToast("Comunicado Global transmitido e Backup Automático gerado!");
    } catch (err: any) {
      setBroadcastFeedback("Erro ao salvar comunicado: " + err.message);
    } finally {
      setIsSavingBroadcast(false);
    }
  };

  // ==========================================
  // MODO DE ATUALIZAÇÃO DO SISTEMA (1-CLIQUE)
  // ==========================================

  const isMaintenanceModeActive = Boolean(
    globalBroadcast.active && (globalBroadcast.type === 'maintenance' || globalBroadcast.type === 'update')
  );

  const handleToggleMaintenanceMode = async () => {
    setIsSavingBroadcast(true);
    try {
      if (isMaintenanceModeActive) {
        // Concluir atualização / Desativar modo
        const updated: SystemBroadcast = {
          ...globalBroadcast,
          active: false,
          type: 'info',
          message: '',
          createdAt: Date.now()
        };
        try {
          await saveGlobalSaaSBroadcast(updated);
        } catch (saveErr) {
          console.warn("Notice: broadcast firestore update error handled:", saveErr);
        }
        setGlobalBroadcast(updated);
        try {
          localStorage.setItem('agaia_global_broadcast', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('agaia_broadcast_changed', { detail: updated }));
        } catch {}
        setBroadcastFeedback("Modo de Atualização finalizado com sucesso! O aviso de instabilidade foi desativado em todos os gabinetes.");
        showSuccessToast("Atualização concluída! Sistema operando normalmente em todos os gabinetes.");
      } else {
        // Ativar modo de atualização
        const updated: SystemBroadcast = {
          message: "⚠️ Sistema em Modo de Atualização: O administrador está realizando melhorias técnicas. Pode ocorrer instabilidade ou lentidão momentânea nas operações. O salvamento contínuo dos seus dados e rascunhos está garantido.",
          type: "maintenance",
          active: true,
          createdAt: Date.now()
        };
        try {
          await createCabinetBackupSnapshot("broadcast", {
            message: updated.message,
            type: updated.type
          });
        } catch (snapErr) {
          console.warn("Falha no snapshot pré-atualização:", snapErr);
        }
        await saveGlobalSaaSBroadcast(updated);
        setGlobalBroadcast(updated);
        setBroadcastFeedback("Modo de Atualização ATIVADO! Todos os gabinetes foram alertados sobre possíveis instabilidades temporárias.");
        showSuccessToast("Modo de Atualização ATIVADO! Usuários de todos os gabinetes notificados.");
      }
    } catch (err: any) {
      showErrorToast("Erro ao alternar modo de atualização: " + (err?.message || err));
    } finally {
      setIsSavingBroadcast(false);
    }
  };


  // ==========================================
  // MIGRATION HANDLER (LEGACY)
  // ==========================================

  const handleMigrateLegacyData = async () => {
    if (tenants.length === 0) {
      setMigrationLog('❌ Crie um gabinete primeiro!');
      return;
    }
    const targetTenant = selectedMigrationTenantId;
    if (!targetTenant) {
      setMigrationLog("❌ Selecione o gabinete de destino primeiro!");
      return;
    }

    setIsMigrating(true);
    setMigrationLog('Iniciando migração...\n');

    try {
      // 1. Migrar Histórico
      setMigrationLog(prev => prev + 'Buscando histórico legado...\n');
      const histSnap = await getDocs(collection(db, 'history'));
      let histCount = 0;
      for (const d of histSnap.docs) {
        const data = d.data();
        if (!data.unitId) {
          data.unitId = 'montes_claros';
        }
        data.tenant = targetTenant;
        await setDoc(doc(db, `gabinetes/${targetTenant}/history`, d.id), data);
        histCount++;
      }
      setMigrationLog(prev => prev + `✔️ Históricos migrados: ${histCount}\n`);

      // 2. Migrar Prompts
      setMigrationLog(prev => prev + 'Buscando prompts legados...\n');
      const promptSnap = await getDocs(collection(db, 'prompts'));
      let promptCount = 0;
      for (const d of promptSnap.docs) {
        const data = d.data();
        data.tenant = targetTenant;
        await setDoc(doc(db, `gabinetes/${targetTenant}/prompts`, d.id), data);
        promptCount++;
      }
      setMigrationLog(prev => prev + `✔️ Prompts migrados: ${promptCount}\n`);

      // 3. Migrar Teses
      setMigrationLog(prev => prev + 'Buscando teses legadas...\n');
      const tesesSnap = await getDocs(collection(db, 'teses'));
      let tesesCount = 0;
      for (const d of tesesSnap.docs) {
        const data = d.data();
        data.tenant = targetTenant;
        await setDoc(doc(db, `gabinetes/${targetTenant}/teses`, d.id), data);
        tesesCount++;
      }
      setMigrationLog(prev => prev + `✔️ Teses migradas: ${tesesCount}\n`);

      setMigrationLog(prev => prev + '\n🎉 Migração concluída com sucesso! Recarregue a aplicação para ver os dados no novo gabinete.');
      loadAllData();
    } catch (err: any) {
      setMigrationLog(prev => prev + `\n❌ Erro na migração: ${err.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  // ==========================================
  // COMPUTED / FILTERED DATA
  // ==========================================

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const matchesSearch = 
        t.name.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(tenantSearchQuery.toLowerCase()) ||
        t.ownerEmail.toLowerCase().includes(tenantSearchQuery.toLowerCase());
      
      const matchesStatus = tenantStatusFilter === 'all' || (t.status || 'active') === tenantStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tenants, tenantSearchQuery, tenantStatusFilter]);

  const filteredUsers = useMemo(() => {
    return globalUsers.filter(u => {
      const matchesSearch = 
        (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.tenantId || '').toLowerCase().includes(userSearchQuery.toLowerCase());

      const isUserActive = u.isActive !== false;
      let matchesRole = true;
      if (userRoleFilter === 'admin') matchesRole = u.role === 'admin';
      else if (userRoleFilter === 'judge') matchesRole = Boolean(u.isJudge);
      else if (userRoleFilter === 'user') matchesRole = u.role === 'user' && !u.isJudge;
      else if (userRoleFilter === 'inactive') matchesRole = !isUserActive;

      const matchesTenant = userTenantFilter === 'all' || (u.tenantId || 'gabinete_default') === userTenantFilter;

      return matchesSearch && matchesRole && matchesTenant;
    });
  }, [globalUsers, userSearchQuery, userRoleFilter, userTenantFilter]);

  const filteredSnapshots = useMemo(() => {
    if (!snapshotSearchQuery.trim()) return snapshots;
    const q = snapshotSearchQuery.toLowerCase();
    return snapshots.filter(s => 
      s.reason?.toLowerCase().includes(q) ||
      s.id?.toLowerCase().includes(q) ||
      s.authorEmail?.toLowerCase().includes(q) ||
      s.triggeredBy?.toLowerCase().includes(q)
    );
  }, [snapshots, snapshotSearchQuery]);

  // Overall Global SaaS Stats
  const globalStats = useMemo(() => {
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => (t.status || 'active') === 'active').length;
    const suspendedTenants = tenants.filter(t => t.status === 'suspended').length;
    const totalUsers = globalUsers.length;
    const activeUsers = globalUsers.filter(u => u.isActive !== false).length;
    const totalHistory = tenants.reduce((acc, t) => acc + (t.historyCount || 0), 0);
    const totalPrompts = tenants.reduce((acc, t) => acc + (t.promptsCount || 0), 0);
    return { totalTenants, activeTenants, suspendedTenants, totalUsers, activeUsers, totalHistory, totalPrompts };
  }, [tenants, globalUsers]);

  // Paginação: Gabinetes Contratantes
  const [tenantPage, setTenantPage] = useState(1);
  const tenantsPerPage = 6;
  const totalTenantPages = Math.max(1, Math.ceil(filteredTenants.length / tenantsPerPage));
  const paginatedTenants = useMemo(() => {
    const start = (tenantPage - 1) * tenantsPerPage;
    return filteredTenants.slice(start, start + tenantsPerPage);
  }, [filteredTenants, tenantPage, tenantsPerPage]);

  useEffect(() => {
    setTenantPage(1);
  }, [tenantSearchQuery, tenantStatusFilter]);

  // Paginação: Usuários Globais
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 10;
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, userPage, usersPerPage]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearchQuery, userRoleFilter, userTenantFilter]);

  // Paginação: Snapshots de Segurança
  const [snapshotPage, setSnapshotPage] = useState(1);
  const snapshotsPerPage = 8;
  const totalSnapshotPages = Math.max(1, Math.ceil(filteredSnapshots.length / snapshotsPerPage));
  const paginatedSnapshots = useMemo(() => {
    const start = (snapshotPage - 1) * snapshotsPerPage;
    return filteredSnapshots.slice(start, start + snapshotsPerPage);
  }, [filteredSnapshots, snapshotPage, snapshotsPerPage]);

  useEffect(() => {
    setSnapshotPage(1);
  }, [snapshotSearchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-1.5 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl sm:rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col h-[98vh] sm:h-[92vh] overflow-hidden text-slate-200">
        
        {/* Top Header Responsivo */}
        <div className="p-3 sm:p-5 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 shrink-0">
          <div className="flex items-center justify-between w-full sm:w-auto min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-800 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/30 shrink-0">
                <Server className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-sm sm:text-lg font-black text-white tracking-tight truncate">
                    Painel Super Admin SaaS
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-black uppercase tracking-wider shrink-0">
                    Enterprise
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[220px] sm:max-w-none">
                  Governança Multi-Tenant, Inquilinos e Acessos Globais
                </p>
              </div>
            </div>

            {/* Ações Mobile Rápidas (Recarregar & Fechar) */}
            <div className="flex items-center gap-1 sm:hidden shrink-0 ml-2">
              <button 
                onClick={loadAllData} 
                title="Recarregar Dados"
                className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800 border border-slate-800 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTenants || isLoadingUsers ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
              <button 
                onClick={onClose} 
                title="Fechar"
                className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800 border border-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Botões de Ação na barra do cabeçalho */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-1 sm:pt-0 border-t border-slate-850 sm:border-0 flex-wrap">
            {/* Botão de 1-Clique: Modo de Atualização do Sistema */}
            <button
              type="button"
              onClick={handleToggleMaintenanceMode}
              disabled={isSavingBroadcast}
              className={`px-3 py-1.5 text-xs font-bold transition rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap ${
                isMaintenanceModeActive
                  ? "text-white bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:from-red-500 hover:to-orange-500 border border-red-300 animate-pulse shadow-md shadow-red-900/40"
                  : "text-amber-200 bg-amber-950/70 hover:bg-amber-900/90 border border-amber-500/50"
              }`}
              title={
                isMaintenanceModeActive
                  ? "O sistema está em MODO DE ATUALIZAÇÃO (aviso no ar para todos os gabinetes). Clique para concluir a atualização e desativar o aviso."
                  : "Clique para ativar o MODO DE ATUALIZAÇÃO e avisar todos os usuários sobre possíveis instabilidades enquanto você atualiza."
              }
            >
              {isSavingBroadcast ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isMaintenanceModeActive ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isMaintenanceModeActive ? "Concluir Atualização" : "Modo de Atualização"}</span>
            </button>

            {onOpenTicketsModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenTicketsModal();
                }}
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 transition rounded-xl border border-amber-500/40 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
                title="Abrir Central de Chamados & Feedback dos Gabinetes"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Chamados & Demandas</span>
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2">
              <button 
                onClick={loadAllData} 
                title="Recarregar Dados"
                className="p-2 text-slate-400 hover:text-white transition rounded-xl hover:bg-slate-800 border border-slate-800 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingTenants || isLoadingUsers ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
              <button 
                onClick={onClose} 
                className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition rounded-xl hover:bg-slate-800 border border-slate-800 cursor-pointer"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>

        {/* Global Success Notification Toast */}
        {actionSuccessMsg && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-4 sm:px-5 py-2 flex items-center justify-between text-xs text-emerald-200 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">✕</button>
          </div>
        )}

        {/* Global Error Notification Toast */}
        {actionErrorMsg && (
          <div className="bg-rose-950/95 border-b border-rose-500/50 px-4 sm:px-5 py-2 flex items-center justify-between text-xs text-rose-200 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{actionErrorMsg}</span>
            </div>
            <button onClick={() => setActionErrorMsg(null)} className="text-rose-400 hover:text-rose-200 cursor-pointer">✕</button>
          </div>
        )}

        {/* Metrics Banner: Carrossel touch horizontal no mobile, grid no desktop */}
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2 p-2.5 sm:p-4 bg-slate-950/60 border-b border-slate-800 text-xs shrink-0 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 min-w-[130px] sm:min-w-0 shrink-0 sm:shrink">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Building className="w-3 h-3 text-indigo-400" /> Gabinetes
            </p>
            <p className="text-base font-black text-white mt-0.5">{globalStats.totalTenants}</p>
            <p className="text-[9px] text-emerald-400 font-semibold mt-0.5 truncate">{globalStats.activeTenants} Ativos • {globalStats.suspendedTenants} Suspensos</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 min-w-[130px] sm:min-w-0 shrink-0 sm:shrink">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-400" /> Usuários Globais
            </p>
            <p className="text-base font-black text-white mt-0.5">{globalStats.totalUsers}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">{globalStats.activeUsers} Ativos</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 min-w-[130px] sm:min-w-0 shrink-0 sm:shrink">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3 text-amber-400" /> Minutas / Atos
            </p>
            <p className="text-base font-black text-white mt-0.5">{globalStats.totalHistory}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Processos Analisados</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 min-w-[130px] sm:min-w-0 shrink-0 sm:shrink">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" /> Prompts Criados
            </p>
            <p className="text-base font-black text-white mt-0.5">{globalStats.totalPrompts}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">No Ecossistema</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 min-w-[130px] sm:min-w-0 shrink-0 sm:shrink">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" /> Modelo SaaS
            </p>
            <p className="text-base font-black text-white mt-0.5">Multi-Tenant</p>
            <p className="text-[9px] text-cyan-400 mt-0.5">Particionado</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 min-w-[130px] sm:min-w-0 shrink-0 sm:shrink">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Megaphone className="w-3 h-3 text-rose-400" /> Comunicado
            </p>
            <p className="text-base font-black text-white mt-0.5">{globalBroadcast.active ? 'Transmitindo' : 'Inativo'}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Banner Global</p>
          </div>
        </div>

        {/* Tab Navigation com labels responsivas e scroll horizontal limpo */}
        <div className="px-2.5 sm:px-5 border-b border-slate-800 bg-slate-950 flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'tenants'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">Gabinetes ({tenants.length})</span>
            <span className="hidden sm:inline">Gabinetes Contratantes ({tenants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">Usuários ({globalUsers.length})</span>
            <span className="hidden sm:inline">Usuários Globais do SaaS ({globalUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('snapshots')}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'snapshots'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-emerald-400" />
            <span className="sm:hidden">Snapshots ({snapshots.length})</span>
            <span className="hidden sm:inline">Snapshots & Segurança ({snapshots.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'broadcast'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Comunicado</span>
          </button>

          <button
            onClick={() => setActiveTab('migration')}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'migration'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">Migração</span>
            <span className="hidden sm:inline">Migração de Banco Legado</span>
          </button>

          <button
            onClick={() => setActiveTab('tokens')}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
              activeTab === 'tokens'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-amber-400" />
            <span className="sm:hidden">Uso de Tokens</span>
            <span className="hidden sm:inline">Uso da Chave Nativa (Tokens)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ============================================================== */}
          {/* TAB 1: GABINETES                                                */}
          {/* ============================================================== */}
          {activeTab === 'tenants' && (
            <div className="space-y-6">
              
              {/* Actions & Filters Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={tenantSearchQuery}
                      onChange={e => setTenantSearchQuery(e.target.value)}
                      placeholder="Buscar por nome do juiz, ID ou e-mail titular..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <select
                    value={tenantStatusFilter}
                    onChange={e => setTenantStatusFilter(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="active">🟢 Apenas Ativos</option>
                    <option value="suspended">🔴 Apenas Suspensos</option>
                    <option value="trial">🔵 Em Avaliação (Trial)</option>
                    <option value="maintenance">🟠 Em Manutenção</option>
                  </select>
                </div>

                <button
                  onClick={() => setIsCreatingTenant(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  <Plus className="w-4 h-4" /> NOVO GABINETE
                </button>
              </div>

              {/* Create Tenant Form / Card (Collapsible) */}
              {isCreatingTenant && (
                <div className="bg-slate-950 border border-indigo-500/50 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-3 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-indigo-400" />
                      Cadastrar Novo Gabinete Inquilino
                    </h3>
                    <button onClick={() => setIsCreatingTenant(false)} className="text-slate-400 hover:text-white text-xs">✕ Fechar</button>
                  </div>

                  {createTenantError && (
                    <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{createTenantError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateTenant} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Nome do Gabinete / Juiz Titular *
                      </label>
                      <input 
                        required 
                        value={newTenantName} 
                        onChange={e => handleNameChange(e.target.value)} 
                        type="text" 
                        placeholder="ex: Dr. Carlos Eduardo Soares" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500" 
                      />
                      <p className="text-[9px] text-slate-500 mt-1">Nome de exibição do gabinete</p>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        ID Único do Gabinete (slug) *
                      </label>
                      <input 
                        required 
                        value={newTenantId} 
                        onChange={e => {
                          setNewTenantId(e.target.value);
                          setUserCustomizedSlug(true);
                        }} 
                        type="text" 
                        placeholder="ex: gab_dr_carlos" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500 font-mono" 
                      />
                      <p className="text-[9px] text-slate-500 mt-1">Identificador da partição no Firestore (gerado auto)</p>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        E-mail do Administrador Titular * (@gmail.com)
                      </label>
                      <input 
                        required 
                        value={newOwnerEmail} 
                        onChange={e => setNewOwnerEmail(e.target.value)} 
                        type="email" 
                        placeholder="magistrado@gmail.com" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500" 
                      />
                      <p className="text-[9px] text-slate-500 mt-1">Conta Google que administrará o gabinete</p>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        🏛️ Comarca / Lotação Inicial *
                      </label>
                      <input 
                        value={newTenantInitialUnit} 
                        onChange={e => setNewTenantInitialUnit(e.target.value)} 
                        type="text" 
                        placeholder="ex: Palmeiras de Goiás" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500" 
                      />
                      <p className="text-[9px] text-slate-500 mt-1">Nome da comarca / vara judicial vinculada ao gabinete</p>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Plano de Contratação
                      </label>
                      <select 
                        value={newTenantPlan} 
                        onChange={e => setNewTenantPlan(e.target.value as TenantPlan)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500"
                      >
                        <option value="magistrado">Plano Magistrado Pro (Padrão)</option>
                        <option value="enterprise">Plano Enterprise (Ilimitado / Tribunal)</option>
                        <option value="trial">Plano Trial / Avaliação (15 dias)</option>
                        <option value="pro">Plano Básico</option>
                      </select>
                      <p className="text-[9px] text-slate-500 mt-1">Nível de recursos e usuários</p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Notas Administrativas & Contratuais
                      </label>
                      <input 
                        value={newTenantNotes} 
                        onChange={e => setNewTenantNotes(e.target.value)} 
                        type="text" 
                        placeholder="ex: Contrato Anual #2026/04 - 1ª Vara Cível de Anápolis" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500" 
                      />
                      <p className="text-[9px] text-slate-500 mt-1">Identificação da comarca/vara e observações</p>
                    </div>

                    <div className="sm:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        disabled={isSubmittingTenant}
                        onClick={() => setIsCreatingTenant(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingTenant}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                      >
                        {isSubmittingTenant ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Provisionando...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" /> Salvar e Provisionar Gabinete
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tenants Grid */}
              {isLoadingTenants ? (
                <div className="text-center py-16">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-xs text-slate-400">Carregando dados dos gabinetes...</p>
                </div>
              ) : filteredTenants.length === 0 ? (
                <div className="text-center py-16 bg-slate-950/50 rounded-2xl border border-slate-800">
                  <Building className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-300">Nenhum gabinete encontrado</p>
                  <p className="text-xs text-slate-500 mt-1">Ajuste os filtros de busca ou cadastre um novo gabinete.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {paginatedTenants.map(t => {
                      const status = t.status || 'active';
                      const isSuspended = status === 'suspended' || status === 'maintenance';
                      
                      return (
                        <div 
                          key={t.id} 
                          className={`bg-slate-950 border rounded-2xl p-4 sm:p-5 space-y-3.5 sm:space-y-4 transition hover:border-slate-700 ${
                            isSuspended ? 'border-amber-900/60 bg-amber-950/10' : 'border-slate-800'
                          }`}
                        >
                          {/* Cabinet Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-sm sm:text-base text-white tracking-tight break-words">{t.name}</h4>
                                
                                {/* Status Badge */}
                                {status === 'active' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black uppercase shrink-0">
                                    🟢 Ativo
                                  </span>
                                )}
                                {status === 'suspended' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 font-black uppercase shrink-0">
                                    🔴 Suspenso
                                  </span>
                                )}
                                {status === 'trial' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-black uppercase shrink-0">
                                    🔵 Avaliação
                                  </span>
                                )}
                                {status === 'maintenance' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black uppercase shrink-0">
                                    🟠 Manutenção
                                  </span>
                                )}

                                {/* Plan Badge */}
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase shrink-0">
                                  {t.plan === 'enterprise' ? 'Enterprise' : (t.plan === 'trial' ? 'Trial' : 'Pro')}
                                </span>
                              </div>

                              <p className="text-xs text-slate-400 font-mono break-all">
                                ID da Partição: <span className="text-indigo-400 font-bold">{t.id}</span>
                              </p>
                            </div>

                            {/* Quick Action: Edit */}
                            <button
                              onClick={() => handleOpenEditTenant(t)}
                              title="Editar Dados do Gabinete"
                              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition shrink-0 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Owner & Notes */}
                          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800/80 space-y-2 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-300 gap-0.5 sm:gap-2">
                              <span className="text-slate-500 text-[11px] shrink-0">Titular Responsável:</span>
                              <span className="font-semibold text-slate-200 break-all text-left sm:text-right">{t.ownerEmail}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-300 gap-0.5 sm:gap-2 pt-1 border-t border-slate-800">
                              <span className="text-slate-500 text-[11px] shrink-0">🏛️ Comarca / Lotação:</span>
                              <span className="font-semibold text-emerald-300 text-[11px] break-words text-left sm:text-right">{t.primaryUnitName || t.notes || '1ª Vara Judicial'}</span>
                            </div>
                            {t.notes && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-300 gap-0.5 sm:gap-2 pt-1 border-t border-slate-800">
                                <span className="text-slate-500 text-[11px] shrink-0">Anotação / Contrato:</span>
                                <span className="text-slate-400 text-[11px] italic break-words text-left sm:text-right">{t.notes}</span>
                              </div>
                            )}
                            {t.suspendedReason && isSuspended && (
                              <div className="p-2 bg-red-950/50 border border-red-900/50 rounded-lg text-[11px] text-red-300 mt-2">
                                <span className="font-bold">Motivo da suspensão:</span> {t.suspendedReason}
                              </div>
                            )}
                          </div>

                          {/* Metrics Bar */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                              <p className="text-[10px] text-slate-500 font-bold uppercase">Membros</p>
                              <p className="text-sm font-black text-indigo-400 mt-0.5">{t.usersCount || 0}</p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                              <p className="text-[10px] text-slate-500 font-bold uppercase">Minutas</p>
                              <p className="text-sm font-black text-emerald-400 mt-0.5">{t.historyCount || 0}</p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                              <p className="text-[10px] text-slate-500 font-bold uppercase">Prompts</p>
                              <p className="text-sm font-black text-purple-400 mt-0.5">{t.promptsCount || 0}</p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                              <p className="text-[10px] text-slate-500 font-bold uppercase">Paradigmas</p>
                              <p className="text-sm font-black text-amber-400 mt-0.5">{t.paradigmsCount || 0}</p>
                            </div>
                          </div>

                          {/* Actions Footer */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-800/80">
                            
                            {/* Left Actions: Inspect Members */}
                            <button
                              onClick={() => setInspectingTenant(t)}
                              className="w-full sm:w-auto px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span>Ver Membros ({t.usersCount || 0})</span>
                            </button>

                            {/* Right Actions: Status Toggle & Delete */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                              {status === 'active' ? (
                                <button
                                  onClick={() => {
                                    setSuspendingTenant(t);
                                    setSuspensionTargetStatus('suspended');
                                  }}
                                  className="flex-1 sm:flex-none px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                                >
                                  <PowerOff className="w-3.5 h-3.5 shrink-0" />
                                  <span>Suspender</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleTenantStatus(t, 'active')}
                                  className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                                >
                                  <Power className="w-3.5 h-3.5 shrink-0" />
                                  <span>Reativar</span>
                                </button>
                              )}

                              {tenantToDelete === t.id ? (
                                <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/50 p-1 rounded-xl shrink-0">
                                  <span className="text-[10px] text-red-300 px-1 font-bold">Excluir?</span>
                                  <button
                                    onClick={() => handleDeleteTenant(t.id)}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                  >
                                    Sim
                                  </button>
                                  <button
                                    onClick={() => setTenantToDelete(null)}
                                    className="px-2 py-1 bg-slate-800 text-slate-300 rounded-lg text-[10px] cursor-pointer"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setTenantToDelete(t.id)}
                                  title="Excluir Gabinete Permanentemente"
                                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition shrink-0 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Paginação de Gabinetes */}
                  {filteredTenants.length > tenantsPerPage && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800 bg-slate-950/60 px-4 py-3 rounded-2xl">
                      <div className="text-xs text-slate-400 text-center sm:text-left">
                        Mostrando <strong className="text-white">{(tenantPage - 1) * tenantsPerPage + 1}</strong> a <strong className="text-white">{Math.min(tenantPage * tenantsPerPage, filteredTenants.length)}</strong> de <strong className="text-white">{filteredTenants.length}</strong> gabinetes
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setTenantPage(p => Math.max(1, p - 1))}
                          disabled={tenantPage === 1}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none text-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Anterior</span>
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalTenantPages }, (_, i) => i + 1).map(p => (
                            <button
                              key={p}
                              onClick={() => setTenantPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                                p === tenantPage
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setTenantPage(p => Math.min(totalTenantPages, p + 1))}
                          disabled={tenantPage === totalTenantPages}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none text-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <span className="hidden sm:inline">Próxima</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: USUÁRIOS GLOBAIS                                         */}
          {/* ============================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-5">
              
              {/* Users Search & Filter Header */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={e => setUserSearchQuery(e.target.value)}
                      placeholder="Buscar por nome, e-mail..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <select
                    value={userRoleFilter}
                    onChange={e => setUserRoleFilter(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">Todas as Funções</option>
                    <option value="judge">👑 Apenas Magistrados</option>
                    <option value="admin">🛡️ Apenas Administradores</option>
                    <option value="user">👥 Apenas Assessores</option>
                    <option value="inactive">⛔ Apenas Desativados</option>
                  </select>

                  <select
                    value={userTenantFilter}
                    onChange={e => setUserTenantFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">Todos os Gabinetes</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Users Table / List */}
              {isLoadingUsers ? (
                <div className="text-center py-16">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-xs text-slate-400">Carregando usuários do sistema...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-16 bg-slate-950/50 rounded-2xl border border-slate-800">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-300">Nenhum usuário encontrado</p>
                  <p className="text-xs text-slate-500 mt-1">Ajuste os filtros de busca.</p>
                </div>
              ) : (
                <>
                  {/* Mobile Users View (Cards) */}
                  <div className="md:hidden space-y-3">
                    {paginatedUsers.map(u => {
                      const isUserActive = u.isActive !== false;
                      const isUserPrimary = isPrimaryCabinet(u.tenantId);
                      const userTenant = tenants.find(t => 
                        t.id === (u.tenantId || 'gabinete_default') ||
                        (isUserPrimary && (t.id === 'gab_rafael_machado' || isPrimaryCabinet(t.id)))
                      );
                      const tenantName = userTenant?.name || (isUserPrimary ? 'Dr. Rafael Machado' : u.tenantId || 'Gabinete');
                      const displayTenantId = userTenant?.id || u.tenantId || 'gab_rafael_machado';

                      return (
                        <div key={u.uid} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 transition">
                          {/* User Header */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-9 h-9 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                                {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm text-slate-200 truncate">{u.name || 'Sem nome'}</p>
                                <p className="text-[11px] text-slate-400 font-mono break-all">{u.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition shrink-0 flex items-center gap-1 ${
                                isUserActive 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                  : 'bg-red-500/10 text-red-400 border-red-500/30'
                              }`}
                            >
                              {isUserActive ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                              {isUserActive ? 'Ativo' : 'Inativo'}
                            </button>
                          </div>

                          {/* Info Tags */}
                          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-slate-500 text-[10px] font-bold uppercase">Gabinete:</span>
                              <span className="font-semibold text-slate-200 break-words">{tenantName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">ID: {displayTenantId}</span>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
                              <div className="flex flex-wrap items-center gap-1">
                                {u.isJudge && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                                    <Crown className="w-3 h-3" /> Magistrado
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.role === 'admin' 
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}>
                                  {u.role === 'admin' ? 'Administrador' : 'Assessor'}
                                </span>
                              </div>
                              <button
                                onClick={() => handleToggleNativeKey(u)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${
                                  u.canUseNativeKey
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {u.canUseNativeKey ? '🟢 IA Liberada' : '⚪ Própria/Bloq'}
                              </button>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-slate-800">
                            <button
                              onClick={() => {
                                setTransferringUser(u);
                                setTransferError(null);
                                setIsCreatingNewInTransfer(false);
                                setNewCabinetNameInTransfer('');
                                setNewCabinetIdInTransfer('');
                                const otherTenant = tenants.find(t => t.id !== (u.tenantId || 'gabinete_default'));
                                setTargetTenantId(otherTenant?.id || tenants[0]?.id || 'gab_rafael_machado');
                              }}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition flex items-center gap-1 cursor-pointer"
                            >
                              <Building className="w-3 h-3 text-indigo-400" />
                              Mudar Gabinete
                            </button>
                            <button
                              onClick={() => handleToggleUserRole(u)}
                              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition cursor-pointer"
                            >
                              {u.role === 'admin' ? 'Tornar Assessor' : 'Tornar Admin'}
                            </button>
                            <button
                              onClick={() => handleToggleJudgeStatus(u)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                u.isJudge 
                                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/40' 
                                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                              }`}
                              title="Alternar se é Juiz Titular"
                            >
                              <Crown className="w-3.5 h-3.5" />
                            </button>
                            {u.email.toLowerCase() !== 'fabriciocunha.adv@gmail.com' && (
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteUser(u)}
                                className="p-1.5 bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-700 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
                                title="Excluir Usuário"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Users View (Table) */}
                  <div className="hidden md:block bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="p-3.5">Usuário</th>
                            <th className="p-3.5">Gabinete Vinculado</th>
                            <th className="p-3.5">Função & Perfil</th>
                            <th className="p-3.5">Chave Nativa IA</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5 text-right">Ações de Gestão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {paginatedUsers.map(u => {
                            const isUserActive = u.isActive !== false;
                            const isUserPrimary = isPrimaryCabinet(u.tenantId);
                            const userTenant = tenants.find(t => 
                              t.id === (u.tenantId || 'gabinete_default') ||
                              (isUserPrimary && (t.id === 'gab_rafael_machado' || isPrimaryCabinet(t.id)))
                            );
                            const tenantName = userTenant?.name || (isUserPrimary ? 'Dr. Rafael Machado' : u.tenantId || 'Gabinete');
                            const displayTenantId = userTenant?.id || u.tenantId || 'gab_rafael_machado';

                            return (
                              <tr key={u.uid} className="hover:bg-slate-900/50 transition">
                                
                                {/* Name & Email */}
                                <td className="p-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                                      {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-200">{u.name || 'Sem nome'}</p>
                                      <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                                    </div>
                                  </div>
                                </td>

                                {/* Cabinet */}
                                <td className="p-3.5">
                                  <div className="space-y-0.5">
                                    <p className="font-semibold text-slate-300">{tenantName}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">ID: {displayTenantId}</p>
                                  </div>
                                </td>

                                {/* Roles */}
                                <td className="p-3.5">
                                  <div className="flex flex-wrap gap-1">
                                    {u.isJudge && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                                        <Crown className="w-3 h-3" /> Magistrado
                                      </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      u.role === 'admin' 
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                                    }`}>
                                      {u.role === 'admin' ? 'Administrador' : 'Assessor'}
                                    </span>
                                  </div>
                                </td>

                                {/* Native Key */}
                                <td className="p-3.5">
                                  <button
                                    onClick={() => handleToggleNativeKey(u)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                                      u.canUseNativeKey
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                    }`}
                                  >
                                    {u.canUseNativeKey ? '🟢 Liberada' : '⚪ Própria / Bloq'}
                                  </button>
                                </td>

                                {/* Status */}
                                <td className="p-3.5">
                                  <button
                                    onClick={() => handleToggleUserStatus(u)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                                      isUserActive 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                                        : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                                    }`}
                                  >
                                    {isUserActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    {isUserActive ? 'Ativo' : 'Desativado'}
                                  </button>
                                </td>

                                {/* Actions */}
                                <td className="p-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    
                                    {/* Transfer Tenant Button */}
                                    <button
                                      onClick={() => {
                                        setTransferringUser(u);
                                        setTransferError(null);
                                        setIsCreatingNewInTransfer(false);
                                        setNewCabinetNameInTransfer('');
                                        setNewCabinetIdInTransfer('');
                                        const otherTenant = tenants.find(t => t.id !== (u.tenantId || 'gabinete_default'));
                                        setTargetTenantId(otherTenant?.id || tenants[0]?.id || 'gab_rafael_machado');
                                      }}
                                      title="Mudar Gabinete do Usuário"
                                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <Building className="w-3 h-3 text-indigo-400" />
                                      Mudar Gabinete
                                    </button>

                                    {/* Toggle Role */}
                                    <button
                                      onClick={() => handleToggleUserRole(u)}
                                      title="Alternar entre Admin e Assessor"
                                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition cursor-pointer"
                                    >
                                      {u.role === 'admin' ? 'Tornar Assessor' : 'Tornar Admin'}
                                    </button>

                                    {/* Toggle Judge */}
                                    <button
                                      onClick={() => handleToggleJudgeStatus(u)}
                                      title="Alternar se é Magistrado Titular"
                                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                        u.isJudge 
                                          ? 'bg-amber-950/40 text-amber-300 border-amber-500/40' 
                                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                      }`}
                                    >
                                      <Crown className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Delete User Permanently */}
                                    {u.email.toLowerCase() !== 'fabriciocunha.adv@gmail.com' && (
                                      <button
                                        type="button"
                                        onClick={() => handleRequestDeleteUser(u)}
                                        title="Excluir Usuário Permanentemente do Sistema"
                                        className="p-1.5 bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-700 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>

                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Paginação de Usuários */}
                  {filteredUsers.length > usersPerPage && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800 bg-slate-950/60 px-4 py-3 rounded-2xl">
                      <div className="text-xs text-slate-400 text-center sm:text-left">
                        Mostrando <strong className="text-white">{(userPage - 1) * usersPerPage + 1}</strong> a <strong className="text-white">{Math.min(userPage * usersPerPage, filteredUsers.length)}</strong> de <strong className="text-white">{filteredUsers.length}</strong> usuários
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setUserPage(p => Math.max(1, p - 1))}
                          disabled={userPage === 1}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none text-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Anterior</span>
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalUserPages }, (_, i) => i + 1).map(p => (
                            <button
                              key={p}
                              onClick={() => setUserPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                                p === userPage
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                          disabled={userPage === totalUserPages}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none text-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <span className="hidden sm:inline">Próxima</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: COMUNICADO GLOBAL (SAAS BROADCAST)                       */}
          {/* ============================================================== */}
          {activeTab === 'broadcast' && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* Card de Controle Rápido: Modo de Atualização do Sistema */}
              <div className={`rounded-2xl p-5 border transition-all ${
                isMaintenanceModeActive
                  ? "bg-gradient-to-r from-red-950/80 via-slate-900 to-orange-950/70 border-red-500/60 shadow-lg shadow-red-950/50"
                  : "bg-slate-950 border-amber-500/30"
              }`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isMaintenanceModeActive
                        ? "bg-red-900/60 text-red-200 border-red-400 animate-pulse"
                        : "bg-amber-900/40 text-amber-400 border-amber-500/40"
                    }`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white">
                          Modo de Atualização do Sistema
                        </h3>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isMaintenanceModeActive
                            ? "bg-red-500 text-white animate-pulse"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {isMaintenanceModeActive ? "🔴 Modo Ativo no Ar" : "⚪ Sistema Normal"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Coloca um banner de aviso em tempo real para todos os usuários e gabinetes, informando que o administrador está aplicando atualizações e que pode ocorrer instabilidade momentânea, assegurando que o salvamento automático contínuo de dados permanece 100% protegido.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleMaintenanceMode}
                    disabled={isSavingBroadcast}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shrink-0 shadow-md ${
                      isMaintenanceModeActive
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400 shadow-emerald-950"
                        : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border border-amber-400 shadow-amber-950"
                    }`}
                  >
                    {isSavingBroadcast ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : isMaintenanceModeActive ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-200" />
                    )}
                    <span>{isMaintenanceModeActive ? "Concluir Atualização" : "Ativar Modo de Atualização"}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-900/50 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Transmissão de Comunicado Global (SaaS Broadcast)</h3>
                    <p className="text-xs text-slate-400">
                      Este aviso será exibido no topo da tela para TODOS os usuários de TODOS os gabinetes.
                    </p>
                  </div>
                </div>

                {broadcastFeedback && (
                  <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{broadcastFeedback}</span>
                  </div>
                )}

                <form onSubmit={handleSaveBroadcast} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Mensagem do Comunicado *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={globalBroadcast.message}
                      onChange={e => setGlobalBroadcast({ ...globalBroadcast, message: e.target.value })}
                      placeholder="ex: 🚀 Atualização: Novo módulo de Auditoria de Minutas (Função Ouro) disponível em todos os gabinetes!"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Tipo de Aviso
                      </label>
                      <select
                        value={globalBroadcast.type}
                        onChange={e => setGlobalBroadcast({ ...globalBroadcast, type: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500"
                      >
                        <option value="info">🔵 Informação Geral (Info)</option>
                        <option value="update">🚀 Novidade / Atualização de Recursos</option>
                        <option value="warning">⚠️ Aviso / Atenção</option>
                        <option value="maintenance">🟠 Manutenção Programada</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Status de Exibição
                      </label>
                      <div className="flex items-center gap-3 pt-1.5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={globalBroadcast.active}
                            onChange={e => setGlobalBroadcast({ ...globalBroadcast, active: e.target.checked })}
                            className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                          />
                          <span className={globalBroadcast.active ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                            {globalBroadcast.active ? '🟢 Banner Ativo no Ar' : '⚪ Desativado (Oculto)'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pré-visualização do Banner:</p>
                    <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                      globalBroadcast.type === 'update' ? 'bg-indigo-950/80 border-indigo-500/40 text-indigo-200' :
                      globalBroadcast.type === 'warning' ? 'bg-amber-950/80 border-amber-500/40 text-amber-200' :
                      globalBroadcast.type === 'maintenance' ? 'bg-orange-950/80 border-orange-500/40 text-orange-200' :
                      'bg-blue-950/80 border-blue-500/40 text-blue-200'
                    }`}>
                      <Megaphone className="w-4 h-4 shrink-0" />
                      <p className="flex-1 font-medium">{globalBroadcast.message || 'Digite uma mensagem acima para pré-visualizar...'}</p>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full uppercase font-bold">Aviso SaaS</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={isSavingBroadcast}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                    >
                      {isSavingBroadcast ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Salvar e Transmitir Comunicado
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: MIGRAÇÃO & BACKUP PILOTO                                */}
          {/* ============================================================== */}
          {activeTab === 'migration' && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-6 space-y-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-rose-200">Migração de Dados (Backup do Banco Legado)</h3>
                    <p className="text-xs text-rose-300/80 leading-relaxed">
                      Durante a transição para a arquitetura SaaS Multi-Tenant particionada, os dados anteriores (histórico, prompts e teses) 
                      podem ser transferidos para qualquer novo gabinete cadastrado.
                    </p>
                    <p className="text-xs text-rose-300/80 font-bold mt-1">
                      Todos os históricos legados serão vinculados automaticamente à comarca/vara selecionada.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2 border-t border-rose-900/30">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Selecione o Gabinete de Destino:
                  </label>
                  <select 
                    value={selectedMigrationTenantId} 
                    onChange={e => setSelectedMigrationTenantId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white max-w-md focus:border-indigo-500"
                  >
                    <option value="">-- Selecione o Gabinete de Destino --</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                    ))}
                  </select>

                  <button 
                    onClick={handleMigrateLegacyData}
                    disabled={isMigrating || !selectedMigrationTenantId}
                    className="self-start px-6 py-2.5 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-rose-900/30 disabled:opacity-50"
                  >
                    {isMigrating ? <Server className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                    {isMigrating ? 'MIGRANDO DADOS...' : 'MIGRAR DADOS LEGADOS AGORA'}
                  </button>
                  
                  {migrationLog && (
                    <pre className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-[11px] font-mono text-emerald-400 whitespace-pre-wrap max-h-48 overflow-y-auto mt-2">
                      {migrationLog}
                    </pre>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: SNAPSHOTS & SEGURANÇA                                   */}
          {/* ============================================================== */}
          {activeTab === 'snapshots' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <h2 className="text-base font-black text-white">
                        Mecanismo de Snapshots & Pontos de Restauração de Segurança
                      </h2>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Pontos de restauração salvam o estado completo do ecossistema SaaS (gabinetes, usuários, permissões, lotações, teses, minutas e prompts). 
                      Snapshots automáticos são criados <strong>antes de qualquer alteração crítica de permissões</strong> (como criação, suspensão ou exclusão de gabinetes e papéis de usuário), além de suporte a criação manual e exportação/importação offline.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleRunDeepScan}
                      disabled={isDeepScanning}
                      className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
                      title="Realiza varredura profunda no Firestore e snapshots para resgatar teses, modelos paradigmas, guias PROJUDI e prompts salvos nos devidos gabinetes"
                    >
                      {isDeepScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4 text-emerald-200" />}
                      <span>{isDeepScanning ? "Varrendo e Resgatando..." : "Varredura & Resgate de Cadastros (Teses/Modelos/PROJUDI)"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCreateSnapshotModal(true)}
                      disabled={isCreatingSnapshot}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>{isCreatingSnapshot ? "Capturando..." : "Criar Snapshot Manual"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRunAutoHeal}
                      disabled={isHealingDatabase}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-950/50 cursor-pointer disabled:opacity-50"
                      title="Restaura os gabinetes de Rafael Machado e Júlia Vianna, recompõe perfis de magistrados e recupera minutas históricas órfãs"
                    >
                      {isHealingDatabase ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                      <span>{isHealingDatabase ? "Executando Auto-Cura..." : "Auto-Cura de Gabinetes (Júlia/Rafael)"}</span>
                    </button>

                    <label className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md">
                      <Download className="w-4 h-4 text-sky-400 rotate-180" />
                      <span>Importar JSON</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportSnapshotJson}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Deep Scan Report Feedback Banner */}
              {deepScanReport && (
                <div className="bg-emerald-950/70 border border-emerald-500/50 rounded-2xl p-5 text-xs text-emerald-200 space-y-3 animate-in fade-in shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-bold text-sm text-emerald-300">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-black text-white text-sm">Varredura Profunda & Resgate de Cadastros Concluída</h4>
                        <p className="text-[11px] text-emerald-300/80 font-normal">Todos os cadastros foram identificados e consolidados em suas partições com backup seguro arquivado.</p>
                      </div>
                    </div>
                    <button onClick={() => setDeepScanReport(null)} className="p-1.5 hover:bg-slate-800 rounded-lg text-emerald-400 hover:text-white text-xs">✕</button>
                  </div>

                  <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-emerald-900/40">{deepScanReport.message}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Teses Resgatadas</span>
                      <span className="text-base font-black text-emerald-400">{deepScanReport.rescuedTesesCount}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Modelos Paradigmas</span>
                      <span className="text-base font-black text-emerald-400">{deepScanReport.rescuedParadigmsCount}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Guias PROJUDI</span>
                      <span className="text-base font-black text-emerald-400">{deepScanReport.rescuedProjudiGuidesCount}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Prompts Resgatados</span>
                      <span className="text-base font-black text-emerald-400">{deepScanReport.rescuedPromptsCount}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Históricos Minutas</span>
                      <span className="text-base font-black text-emerald-400">{deepScanReport.rescuedHistoriesCount}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Unidades & Lotações</span>
                      <span className="text-base font-black text-emerald-400">{deepScanReport.rescuedUnitsCount}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-900/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-300">Backup Pré-Varredura:</span>
                      <code className="px-2 py-0.5 rounded bg-slate-950 font-mono text-emerald-300 text-[10px]">{deepScanReport.snapshotBeforeId}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-300">Snapshot Pós-Varredura:</span>
                      <code className="px-2 py-0.5 rounded bg-slate-950 font-mono text-emerald-300 text-[10px]">{deepScanReport.snapshotAfterId}</code>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-Cura Report Feedback Banner */}
              {healReport && (
                <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-2xl p-4 text-xs text-emerald-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Relatório de Auto-Cura e Reconciliação Executado</span>
                    </div>
                    <button onClick={() => setHealReport(null)} className="text-emerald-400 hover:text-white text-xs">✕</button>
                  </div>
                  <p className="text-slate-300">{healReport.message}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Gabinetes Restaurados</span>
                      <span className="text-emerald-400 font-bold">{healReport.tenantsHealed.length} ({healReport.tenantsHealed.join(', ')})</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Usuários Reconciliados</span>
                      <span className="text-emerald-400 font-bold">{healReport.usersHealed.length}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Minutas Resgatadas</span>
                      <span className="text-emerald-400 font-bold">{healReport.historyRescued}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-emerald-800/40">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Prompts Resgatados</span>
                      <span className="text-emerald-400 font-bold">{healReport.promptsRescued}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Snapshots Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={snapshotSearchQuery}
                    onChange={e => setSnapshotSearchQuery(e.target.value)}
                    placeholder="Filtrar por motivo, autor ou trigger..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  {snapshotSearchQuery && (
                    <button
                      onClick={() => setSnapshotSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Total de Pontos de Restauração: <strong className="text-white">{filteredSnapshots.length}</strong></span>
                  <button
                    onClick={loadAllData}
                    disabled={isLoadingSnapshots}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
                    title="Atualizar lista"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSnapshots ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Snapshots List */}
              {isLoadingSnapshots ? (
                <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span>Carregando pontos de restauração...</span>
                </div>
              ) : filteredSnapshots.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Nenhum snapshot encontrado</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {snapshotSearchQuery
                      ? "Nenhum ponto de restauração corresponde aos termos da pesquisa."
                      : "Clique no botão 'Criar Snapshot Manual' acima para gerar o primeiro ponto de restauração seguro do sistema."}
                  </p>
                  {!snapshotSearchQuery && (
                    <button
                      onClick={() => setShowCreateSnapshotModal(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-2"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Criar Primeiro Ponto de Restauração</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedSnapshots.map((snap) => {
                    const formattedDate = new Date(snap.timestamp).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });

                    const triggerLabels: Record<string, { label: string, color: string }> = {
                      pre_permission_change: { label: 'Pré-Permissão', color: 'bg-amber-950/80 border-amber-800 text-amber-300' },
                      manual: { label: 'Manual', color: 'bg-indigo-950/80 border-indigo-800 text-indigo-300' },
                      auto_heal: { label: 'Auto-Cura', color: 'bg-emerald-950/80 border-emerald-800 text-emerald-300' },
                      migration: { label: 'Migração', color: 'bg-purple-950/80 border-purple-800 text-purple-300' },
                      broadcast: { label: 'Transmissão', color: 'bg-sky-950/80 border-sky-800 text-sky-300' }
                    };

                    const triggerInfo = triggerLabels[snap.triggeredBy || 'manual'] || triggerLabels.manual;

                    return (
                      <div
                        key={snap.id}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${triggerInfo.color}`}>
                              {triggerInfo.label}
                            </span>
                            <span className="text-xs font-bold text-white break-words">
                              {snap.reason || "Ponto de Restauração"}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {formattedDate}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                            <span>Autor:</span>
                            <span className="text-slate-200 font-medium">{snap.authorName || snap.authorEmail || 'Super Admin'}</span>
                            <span className="text-slate-600">•</span>
                            <span className="font-mono text-slate-500 text-[10px] break-all">ID: {snap.id}</span>
                          </div>

                          {/* Summary Badges */}
                          {snap.summary && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1">
                                <Building className="w-3 h-3 text-indigo-400" />
                                <strong>{snap.summary.tenantsCount}</strong> gabinetes
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1">
                                <Users className="w-3 h-3 text-emerald-400" />
                                <strong>{snap.summary.usersCount}</strong> usuários
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1">
                                <FileText className="w-3 h-3 text-amber-400" />
                                <strong>{snap.summary.totalHistoriesCount}</strong> minutas
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-purple-400" />
                                <strong>{snap.summary.totalPromptsCount}</strong> prompts
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1">
                                <Scale className="w-3 h-3 text-cyan-400" />
                                <strong>{snap.summary.totalTesesCount}</strong> teses
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <button
                            type="button"
                            onClick={() => setSnapshotToRestore(snap)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-950/40 cursor-pointer"
                            title="Restaurar todo o banco para este ponto"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restaurar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadSnapshotJson(snap)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center justify-center cursor-pointer"
                            title="Baixar JSON deste snapshot"
                          >
                            <Download className="w-4 h-4 text-sky-400" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSnapshotToDelete(snap.id)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition flex items-center justify-center cursor-pointer"
                            title="Excluir este snapshot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Paginação de Snapshots */}
                  {filteredSnapshots.length > snapshotsPerPage && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800 bg-slate-900/60 px-4 py-3 rounded-2xl">
                      <div className="text-xs text-slate-400 text-center sm:text-left">
                        Mostrando <strong className="text-white">{(snapshotPage - 1) * snapshotsPerPage + 1}</strong> a <strong className="text-white">{Math.min(snapshotPage * snapshotsPerPage, filteredSnapshots.length)}</strong> de <strong className="text-white">{filteredSnapshots.length}</strong> snapshots
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSnapshotPage(p => Math.max(1, p - 1))}
                          disabled={snapshotPage === 1}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none text-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Anterior</span>
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalSnapshotPages }, (_, i) => i + 1).map(p => (
                            <button
                              key={p}
                              onClick={() => setSnapshotPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                                p === snapshotPage
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setSnapshotPage(p => Math.min(totalSnapshotPages, p + 1))}
                          disabled={snapshotPage === totalSnapshotPages}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none text-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <span className="hidden sm:inline">Próxima</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: USO DA CHAVE NATIVA (TOKENS)                             */}
          {/* ============================================================== */}
          {activeTab === 'tokens' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        <Zap className="w-5 h-5" />
                      </div>
                      <h2 className="text-base font-black text-white">
                        Telemetria & Gestão de Cota de Chaves (IA)
                      </h2>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Monitore o consumo das <strong>chaves gratuitas do Google AI Studio (BYOK)</strong>, a saúde do pool de contingência para failover 429 de cada assessor, e a volumetria de tokens da <strong>Chave Nativa Corporativa</strong> rateada por Gabinete e Usuário.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Mês de Competência:</span>
                      <input
                        type="month"
                        value={selectedTokenMonth}
                        onChange={(e) => setSelectedTokenMonth(e.target.value)}
                        className="bg-transparent text-xs text-amber-400 font-bold focus:outline-none cursor-pointer"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => loadTokenUsageOnly(selectedTokenMonth)}
                      disabled={isLoadingTokenUsage || isImportingPastTokens}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Atualizar dados de telemetria"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTokenUsage ? 'animate-spin' : ''}`} />
                      <span>Atualizar</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleImportPastTokens}
                      disabled={isImportingPastTokens || isLoadingTokenUsage}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md shadow-amber-950/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Importar e consolidar retroativamente o histórico de minutas e análises para este painel"
                    >
                      {isImportingPastTokens ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Importando...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Importar Histórico Retroativo</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Resumo Geral de Consumo & Rateio por Funcionalidade (Visível em todas as sub-abas) */}
              {(() => {
                const totalGlobalTokens = tokenUsageList.reduce((acc, curr) => acc + (curr.totalTokens || 0), 0);
                const totalGlobalPrompt = tokenUsageList.reduce((acc, curr) => acc + (curr.promptTokens || 0), 0);
                const totalGlobalCandidates = tokenUsageList.reduce((acc, curr) => acc + (curr.candidatesTokens || 0), 0);
                const totalGlobalRequests = tokenUsageList.reduce((acc, curr) => acc + (curr.requestCount || 0), 0);
                const totalGlobalCost = calculateTokenCostBRL(totalGlobalPrompt, totalGlobalCandidates, totalGlobalTokens);

                const mMin = globalModuleStats.minuta;
                const mAudi = globalModuleStats.audiencia;
                const mLupa = globalModuleStats.lupa_magistrado;
                const mChat = globalModuleStats.chat_refino;
                const mOut = globalModuleStats.outros;

                const pctMin = totalGlobalTokens > 0 ? Math.round((mMin.totalTokens / totalGlobalTokens) * 100) : 0;
                const pctAudi = totalGlobalTokens > 0 ? Math.round((mAudi.totalTokens / totalGlobalTokens) * 100) : 0;
                const pctLupa = totalGlobalTokens > 0 ? Math.round((mLupa.totalTokens / totalGlobalTokens) * 100) : 0;
                const pctChat = totalGlobalTokens > 0 ? Math.round((mChat.totalTokens / totalGlobalTokens) * 100) : 0;
                const pctOut = totalGlobalTokens > 0 ? Math.max(0, 100 - (pctMin + pctAudi + pctLupa + pctChat)) : 0;

                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
                    {/* Top Totals Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Geral Tokens</span>
                        <p className="text-lg font-black text-amber-400 mt-1 font-mono">
                          {totalGlobalTokens.toLocaleString('pt-BR')}
                        </p>
                        <span className="text-[9px] text-slate-500 mt-0.5 block">Competência: {selectedTokenMonth}</span>
                      </div>

                      <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5 bg-gradient-to-br from-emerald-950/20 to-slate-950">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Custo Total (R$)</span>
                          <Coins className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <p className="text-lg font-black text-emerald-400 mt-1 font-mono">
                          {totalGlobalCost.formattedBrl}
                        </p>
                        <span className="text-[9px] text-slate-400 mt-0.5 block">~${totalGlobalCost.usdTotal.toFixed(2)} USD</span>
                      </div>

                      <div 
                        onClick={() => { setTokenSubTab('modules_overview'); setSelectedModuleFilter('minuta'); }}
                        className="bg-slate-950/80 border border-amber-500/30 hover:border-amber-400/60 rounded-xl p-3.5 cursor-pointer transition"
                        title="Ver estatísticas de Minutas"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Minutas</span>
                          <span className="text-[10px] font-bold text-amber-400 font-mono">{pctMin}%</span>
                        </div>
                        <p className="text-base font-black text-white mt-1 font-mono">
                          {mMin.totalTokens.toLocaleString('pt-BR')}
                        </p>
                        <span className="text-[9px] text-amber-300/80 mt-0.5 block font-mono">R$ {mMin.costBrl.toFixed(2)} • {mMin.requestCount} req</span>
                      </div>

                      <div 
                        onClick={() => { setTokenSubTab('modules_overview'); setSelectedModuleFilter('audiencia'); }}
                        className="bg-slate-950/80 border border-cyan-500/30 hover:border-cyan-400/60 rounded-xl p-3.5 cursor-pointer transition"
                        title="Ver estatísticas de Audiências"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Audiências</span>
                          <span className="text-[10px] font-bold text-cyan-400 font-mono">{pctAudi}%</span>
                        </div>
                        <p className="text-base font-black text-white mt-1 font-mono">
                          {mAudi.totalTokens.toLocaleString('pt-BR')}
                        </p>
                        <span className="text-[9px] text-cyan-300/80 mt-0.5 block font-mono">R$ {mAudi.costBrl.toFixed(2)} • {mAudi.requestCount} req</span>
                      </div>

                      <div 
                        onClick={() => { setTokenSubTab('modules_overview'); setSelectedModuleFilter('lupa_magistrado'); }}
                        className="bg-slate-950/80 border border-purple-500/30 hover:border-purple-400/60 rounded-xl p-3.5 cursor-pointer transition"
                        title="Ver estatísticas da Lupa do Magistrado"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">Lupa Magistrado</span>
                          <span className="text-[10px] font-bold text-purple-400 font-mono">{pctLupa}%</span>
                        </div>
                        <p className="text-base font-black text-white mt-1 font-mono">
                          {mLupa.totalTokens.toLocaleString('pt-BR')}
                        </p>
                        <span className="text-[9px] text-purple-300/80 mt-0.5 block font-mono">R$ {mLupa.costBrl.toFixed(2)} • {mLupa.requestCount} req</span>
                      </div>

                      <div 
                        onClick={() => { setTokenSubTab('modules_overview'); setSelectedModuleFilter('chat_refino'); }}
                        className="bg-slate-950/80 border border-emerald-500/30 hover:border-emerald-400/60 rounded-xl p-3.5 cursor-pointer transition"
                        title="Ver estatísticas do Chat & Refino"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Chat & Refino</span>
                          <span className="text-[10px] font-bold text-emerald-400 font-mono">{pctChat}%</span>
                        </div>
                        <p className="text-base font-black text-white mt-1 font-mono">
                          {mChat.totalTokens.toLocaleString('pt-BR')}
                        </p>
                        <span className="text-[9px] text-emerald-300/80 mt-0.5 block font-mono">R$ {mChat.costBrl.toFixed(2)} • {mChat.requestCount} req</span>
                      </div>
                    </div>

                    {/* Proportional Distribution Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                          <PieChart className="w-3.5 h-3.5 text-amber-400" />
                          Rateio Visual do Consumo por Funcionalidade
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {totalGlobalRequests.toLocaleString('pt-BR')} requisições processadas na IA
                        </span>
                      </div>

                      <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                        {pctMin > 0 && <div style={{ width: `${pctMin}%` }} className="bg-amber-400 h-full transition-all duration-500" title={`Minutas: ${pctMin}%`} />}
                        {pctAudi > 0 && <div style={{ width: `${pctAudi}%` }} className="bg-cyan-400 h-full transition-all duration-500" title={`Audiência: ${pctAudi}%`} />}
                        {pctLupa > 0 && <div style={{ width: `${pctLupa}%` }} className="bg-purple-400 h-full transition-all duration-500" title={`Lupa: ${pctLupa}%`} />}
                        {pctChat > 0 && <div style={{ width: `${pctChat}%` }} className="bg-emerald-400 h-full transition-all duration-500" title={`Chat: ${pctChat}%`} />}
                        {pctOut > 0 && <div style={{ width: `${pctOut}%` }} className="bg-slate-600 h-full transition-all duration-500" title={`Outros: ${pctOut}%`} />}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                          <span>Minutas: <strong className="text-white font-mono">{pctMin}%</strong> (R$ {mMin.costBrl.toFixed(2)})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                          <span>Mesa de Audiência: <strong className="text-white font-mono">{pctAudi}%</strong> (R$ {mAudi.costBrl.toFixed(2)})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                          <span>Lupa do Magistrado: <strong className="text-white font-mono">{pctLupa}%</strong> (R$ {mLupa.costBrl.toFixed(2)})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                          <span>Chat & Refino: <strong className="text-white font-mono">{pctChat}%</strong> (R$ {mChat.costBrl.toFixed(2)})</span>
                        </div>
                        {pctOut > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
                            <span>Outros: <strong className="text-white font-mono">{pctOut}%</strong> (R$ {mOut.costBrl.toFixed(2)})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Sub-Tabs Switcher */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTokenSubTab('modules_overview')}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      tokenSubTab === 'modules_overview'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Consumo por Funcionalidade</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-amber-950/50 text-amber-300 border border-amber-500/30">
                      Detalhado
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTokenSubTab('cabinet_financial')}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      tokenSubTab === 'cabinet_financial'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Faturamento & Gabinetes</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      tokenSubTab === 'cabinet_financial' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {tokenUsageList.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTokenSubTab('user_keys')}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      tokenSubTab === 'user_keys'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Key className="w-4 h-4" />
                    <span>Monitor de Chaves & Assessores</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      tokenSubTab === 'user_keys' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {userKeysTelemetryData.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTokenSubTab('recent_logs')}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      tokenSubTab === 'recent_logs'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    <span>Log de Operações em Tempo Real</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      tokenSubTab === 'recent_logs' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {recentLogs.length}
                    </span>
                  </button>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-2 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Telemetria em tempo real</span>
                </div>
              </div>

              {/* ============================================================== */}
              {/* SUBTAB 0: CONSUMO POR FUNCIONALIDADE (MINUTAS, AUDIÊNCIA, LUPA)*/}
              {/* ============================================================== */}
              {tokenSubTab === 'modules_overview' && (
                <div className="space-y-6">
                  {/* Module Filter Pills */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-amber-400" />
                        Filtrar Módulo:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedModuleFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          selectedModuleFilter === 'all'
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        Todos os Módulos
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedModuleFilter('minuta')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          selectedModuleFilter === 'minuta'
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Minutas Judiciais</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedModuleFilter('audiencia')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          selectedModuleFilter === 'audiencia'
                            ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        <span>Mesa de Audiência</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedModuleFilter('lupa_magistrado')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          selectedModuleFilter === 'lupa_magistrado'
                            ? 'bg-purple-500 text-slate-950 font-black shadow-md shadow-purple-500/20'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lupa do Magistrado</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedModuleFilter('chat_refino')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          selectedModuleFilter === 'chat_refino'
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat & Refino</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTokenSubTab('recent_logs')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Activity className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ver Log de Execuções</span>
                      </button>
                    </div>
                  </div>

                  {/* Detailed Module Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Minutas Judiciais */}
                    <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono">
                            {globalModuleStats.minuta.requestCount} execuções
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                            Minutas Judiciais
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            Sentenças cíveis e criminais, decisões interlocutórias e despachos de expediente gerados pelos assessores.
                          </p>
                        </div>

                        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Tokens Totais:</span>
                            <span className="font-mono font-black text-amber-400">
                              {globalModuleStats.minuta.totalTokens.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Custo Financeiro:</span>
                            <span className="font-mono font-black text-emerald-400">
                              R$ {globalModuleStats.minuta.costBrl.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                            <span className="text-slate-500 text-[11px]">Prompt / Saída:</span>
                            <span className="font-mono text-[11px] text-slate-300">
                              <span className="text-indigo-400">{(globalModuleStats.minuta.promptTokens || 0).toLocaleString('pt-BR')}</span> / <span className="text-emerald-400">{(globalModuleStats.minuta.candidatesTokens || 0).toLocaleString('pt-BR')}</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 text-[11px]">Média por Minuta:</span>
                            <span className="font-mono text-[11px] text-amber-300">
                              {globalModuleStats.minuta.requestCount > 0 ? Math.round(globalModuleStats.minuta.totalTokens / globalModuleStats.minuta.requestCount).toLocaleString('pt-BR') : 0} tokens
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-2 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => { setSelectedModuleFilter('minuta'); setTokenSubTab('recent_logs'); }}
                          className="w-full py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Ver Logs de Minutas</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Mesa de Audiência */}
                    <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                            <Gavel className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono">
                            {globalModuleStats.audiencia.requestCount} execuções
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                            Mesa de Audiência
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            Roteiros instrutórios, perguntas para partes/testemunhas, deliberações imediatas e atas da audiência.
                          </p>
                        </div>

                        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Tokens Totais:</span>
                            <span className="font-mono font-black text-cyan-400">
                              {globalModuleStats.audiencia.totalTokens.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Custo Financeiro:</span>
                            <span className="font-mono font-black text-emerald-400">
                              R$ {globalModuleStats.audiencia.costBrl.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                            <span className="text-slate-500 text-[11px]">Prompt / Saída:</span>
                            <span className="font-mono text-[11px] text-slate-300">
                              <span className="text-indigo-400">{(globalModuleStats.audiencia.promptTokens || 0).toLocaleString('pt-BR')}</span> / <span className="text-emerald-400">{(globalModuleStats.audiencia.candidatesTokens || 0).toLocaleString('pt-BR')}</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 text-[11px]">Média por Sessão:</span>
                            <span className="font-mono text-[11px] text-cyan-300">
                              {globalModuleStats.audiencia.requestCount > 0 ? Math.round(globalModuleStats.audiencia.totalTokens / globalModuleStats.audiencia.requestCount).toLocaleString('pt-BR') : 0} tokens
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-2 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => { setSelectedModuleFilter('audiencia'); setTokenSubTab('recent_logs'); }}
                          className="w-full py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Ver Logs de Audiência</span>
                        </button>
                      </div>
                    </div>

                    {/* 3. Lupa do Magistrado */}
                    <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                            <Eye className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono">
                            {globalModuleStats.lupa_magistrado.requestCount} auditorias
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                            Lupa do Magistrado
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            Auditoria forense em minutas de sentenças, conferência de contradições, teses vinculantes e integridade.
                          </p>
                        </div>

                        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Tokens Totais:</span>
                            <span className="font-mono font-black text-purple-400">
                              {globalModuleStats.lupa_magistrado.totalTokens.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Custo Financeiro:</span>
                            <span className="font-mono font-black text-emerald-400">
                              R$ {globalModuleStats.lupa_magistrado.costBrl.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                            <span className="text-slate-500 text-[11px]">Prompt / Saída:</span>
                            <span className="font-mono text-[11px] text-slate-300">
                              <span className="text-indigo-400">{(globalModuleStats.lupa_magistrado.promptTokens || 0).toLocaleString('pt-BR')}</span> / <span className="text-emerald-400">{(globalModuleStats.lupa_magistrado.candidatesTokens || 0).toLocaleString('pt-BR')}</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 text-[11px]">Média por Auditoria:</span>
                            <span className="font-mono text-[11px] text-purple-300">
                              {globalModuleStats.lupa_magistrado.requestCount > 0 ? Math.round(globalModuleStats.lupa_magistrado.totalTokens / globalModuleStats.lupa_magistrado.requestCount).toLocaleString('pt-BR') : 0} tokens
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-2 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => { setSelectedModuleFilter('lupa_magistrado'); setTokenSubTab('recent_logs'); }}
                          className="w-full py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Ver Logs da Lupa</span>
                        </button>
                      </div>
                    </div>

                    {/* 4. Chat & Refino Jurídico */}
                    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                            {globalModuleStats.chat_refino.requestCount} consultas
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                            Chat & Refino Jurídico
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            Polimento de parágrafos, consultas de jurisprudência e comandos interativos de refino com o Assistente AGAIA.
                          </p>
                        </div>

                        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Tokens Totais:</span>
                            <span className="font-mono font-black text-emerald-400">
                              {globalModuleStats.chat_refino.totalTokens.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Custo Financeiro:</span>
                            <span className="font-mono font-black text-emerald-400">
                              R$ {globalModuleStats.chat_refino.costBrl.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                            <span className="text-slate-500 text-[11px]">Prompt / Saída:</span>
                            <span className="font-mono text-[11px] text-slate-300">
                              <span className="text-indigo-400">{(globalModuleStats.chat_refino.promptTokens || 0).toLocaleString('pt-BR')}</span> / <span className="text-emerald-400">{(globalModuleStats.chat_refino.candidatesTokens || 0).toLocaleString('pt-BR')}</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 text-[11px]">Média por Consulta:</span>
                            <span className="font-mono text-[11px] text-emerald-300">
                              {globalModuleStats.chat_refino.requestCount > 0 ? Math.round(globalModuleStats.chat_refino.totalTokens / globalModuleStats.chat_refino.requestCount).toLocaleString('pt-BR') : 0} tokens
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-2 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => { setSelectedModuleFilter('chat_refino'); setTokenSubTab('recent_logs'); }}
                          className="w-full py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Ver Logs de Chat</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Matriz Comparativa: Gabinete x Funcionalidade */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-400" />
                          Matriz de Consumo: Gabinetes x Funcionalidades de IA
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Comparativo detalhado de tokens e custos gerados em cada módulo por cada gabinete cadastrado.
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {tokenUsageList.length} gabinetes no mês
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/50">
                            <th className="py-3 px-3">Gabinete / Vara</th>
                            <th className="py-3 px-3 text-amber-400">📝 Minutas</th>
                            <th className="py-3 px-3 text-cyan-400">⚖️ Audiência</th>
                            <th className="py-3 px-3 text-purple-400">🔍 Lupa Magistrado</th>
                            <th className="py-3 px-3 text-emerald-400">💬 Chat & Refino</th>
                            <th className="py-3 px-3 text-right text-white">Total Gabinete</th>
                            <th className="py-3 px-3 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {tokenUsageList.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-6 text-slate-500 italic">
                                Nenhum consumo registrado para a competência {selectedTokenMonth}.
                              </td>
                            </tr>
                          ) : (
                            tokenUsageList.map(cab => {
                              const cabMin = cab.modules?.minuta;
                              const cabAudi = cab.modules?.audiencia;
                              const cabLupa = cab.modules?.lupa_magistrado;
                              const cabChat = cab.modules?.chat_refino;
                              const cabCost = calculateTokenCostBRL(cab.promptTokens, cab.candidatesTokens, cab.totalTokens);

                              return (
                                <tr key={cab.tenantId} className="hover:bg-slate-800/40 transition">
                                  <td className="py-3 px-3">
                                    <div className="font-bold text-white">{cab.tenantName || cab.tenantId}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">{cab.tenantId}</div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="font-mono font-bold text-amber-300">
                                      {(cabMin?.totalTokens || 0).toLocaleString('pt-BR')}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      R$ {(cabMin?.costBrl || 0).toFixed(2)} ({cabMin?.requestCount || 0} req)
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="font-mono font-bold text-cyan-300">
                                      {(cabAudi?.totalTokens || 0).toLocaleString('pt-BR')}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      R$ {(cabAudi?.costBrl || 0).toFixed(2)} ({cabAudi?.requestCount || 0} req)
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="font-mono font-bold text-purple-300">
                                      {(cabLupa?.totalTokens || 0).toLocaleString('pt-BR')}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      R$ {(cabLupa?.costBrl || 0).toFixed(2)} ({cabLupa?.requestCount || 0} req)
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="font-mono font-bold text-emerald-300">
                                      {(cabChat?.totalTokens || 0).toLocaleString('pt-BR')}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      R$ {(cabChat?.costBrl || 0).toFixed(2)} ({cabChat?.requestCount || 0} req)
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <div className="font-mono font-bold text-emerald-400">
                                      {cabCost.formattedBrl}
                                    </div>
                                    <div className="text-[10px] text-amber-300 font-mono">
                                      {(cab.totalTokens || 0).toLocaleString('pt-BR')} tokens
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedCabinetTokenId(cab.tenantId);
                                        setTokenSubTab('cabinet_financial');
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition border border-slate-700 cursor-pointer"
                                      title="Abrir detalhamento financeiro deste gabinete"
                                    >
                                      Ver Gabinete
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* SUBTAB 1: MONITOR DE CHAVES E POOL DOS ASSESSORES (BYOK)       */}
              {/* ============================================================== */}
              {tokenSubTab === 'user_keys' && (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total de Assessores</span>
                      </div>
                      <p className="text-xl font-black text-white mt-1.5">
                        {userKeysTelemetryData.length}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Usuários monitorados</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chaves Gratuitas (AI Studio)</span>
                      </div>
                      <p className="text-xl font-black text-emerald-400 mt-1.5">
                        {userKeysTelemetryData.filter(u => !u.isNative && u.poolCount > 0).length}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Assessores com chaves próprias</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-cyan-400" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rotações 429 Registradas</span>
                      </div>
                      <p className="text-xl font-black text-cyan-400 mt-1.5">
                        {userKeysTelemetryData.reduce((acc, u) => acc + u.rotationsCount, 0)}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Trocas automáticas por cota</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Requerem Orientação</span>
                      </div>
                      <p className="text-xl font-black text-amber-400 mt-1.5">
                        {userKeysTelemetryData.filter(u => u.healthStatus === 'single_key' || u.healthStatus === 'no_key').length}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">1 chave só ou sem chave</span>
                    </div>
                  </div>

                  {/* Informational Guidance Callout */}
                  <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                        <Info className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 text-xs">
                        <h4 className="font-bold text-white flex items-center gap-2">
                          <span>Como funciona o monitoramento de cotas do Google AI Studio</span>
                          <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-950 text-cyan-300 rounded border border-cyan-800">
                            1.500 req/dia por chave
                          </span>
                        </h4>
                        <p className="text-slate-300 leading-relaxed">
                          O Google AI Studio oferece cotas gratuitas generosas (~1.500 requisições diárias e 15 req/min). 
                          Quando um assessor cadastra <strong>2 ou mais chaves</strong>, o sistema ativa o failover automático contra erro 429 sem travar as minutas.
                          Use o botão <strong className="text-emerald-400">"Instruir Assessor"</strong> ao lado de cada usuário para enviar instruções personalizadas com 1 clique!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={tokenUsageSearch}
                        onChange={e => setTokenUsageSearch(e.target.value)}
                        placeholder="Buscar por assessor, e-mail, gabinete ou chave..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                      />
                      {tokenUsageSearch && (
                        <button
                          onClick={() => setTokenUsageSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setKeyHealthFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          keyHealthFilter === 'all'
                            ? 'bg-slate-700 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        Todos ({userKeysTelemetryData.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setKeyHealthFilter('needs_attention')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          keyHealthFilter === 'needs_attention'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-900 text-amber-400 hover:bg-slate-800 border border-amber-500/30'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Requer Atenção ({userKeysTelemetryData.filter(u => u.healthStatus === 'single_key' || u.healthStatus === 'no_key').length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setKeyHealthFilter('rotated_today')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          keyHealthFilter === 'rotated_today'
                            ? 'bg-cyan-500 text-slate-950 font-black'
                            : 'bg-slate-900 text-cyan-400 hover:bg-slate-800 border border-cyan-500/30'
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Trocas 429 ({userKeysTelemetryData.filter(u => u.rotationsCount > 0).length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setKeyHealthFilter('no_key')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          keyHealthFilter === 'no_key'
                            ? 'bg-rose-500 text-white font-black'
                            : 'bg-slate-900 text-rose-400 hover:bg-slate-800 border border-rose-500/30'
                        }`}
                      >
                        <span>Sem Chave ({userKeysTelemetryData.filter(u => u.healthStatus === 'no_key').length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setKeyHealthFilter('healthy')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          keyHealthFilter === 'healthy'
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-emerald-500/30'
                        }`}
                      >
                        <span>Pool Seguro ({userKeysTelemetryData.filter(u => u.healthStatus === 'healthy' || u.healthStatus === 'native').length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Users Cards List */}
                  {filteredUserKeys.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
                      <Key className="w-8 h-8 mx-auto text-slate-600" />
                      <h4 className="text-sm font-bold text-white">Nenhum assessor encontrado para este filtro</h4>
                      <p className="text-xs text-slate-500">Tente ajustar a busca ou o filtro de saúde das chaves.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredUserKeys.map(item => {
                        const dailyPercent = Math.min(100, Math.round((item.dailyRequests / 1500) * 100));
                        const isCopied = copiedInstructionEmail === item.email;

                        return (
                          <div
                            key={item.email || item.user.uid}
                            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4.5 transition shadow-md"
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              {/* Left: User Info */}
                              <div className="flex items-start gap-3.5">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                                  item.healthStatus === 'no_key'
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                    : item.healthStatus === 'single_key'
                                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                      : item.healthStatus === 'rotated_today'
                                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                }`}>
                                  {item.name.charAt(0).toUpperCase()}
                                </div>

                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-bold text-white">{item.name}</h4>
                                    <span className="text-[11px] text-slate-400 font-mono">({item.email})</span>
                                    
                                    {/* Cabinet Badge */}
                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-950 border border-slate-800 text-slate-300">
                                      🏢 {item.cabinetName}
                                    </span>
                                  </div>

                                  {/* Status Diagnostics Badges */}
                                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    {item.healthStatus === 'native' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center gap-1">
                                        <Building className="w-3 h-3" />
                                        Chave Nativa Corporativa (Faturada)
                                      </span>
                                    )}

                                    {item.healthStatus === 'no_key' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Sem Chave Cadastrada (Bloqueado p/ IA)
                                      </span>
                                    )}

                                    {item.healthStatus === 'single_key' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Apenas 1 Chave (Sem Reserva para Failover 429)
                                      </span>
                                    )}

                                    {item.healthStatus === 'rotated_today' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center gap-1">
                                        <RotateCcw className="w-3 h-3 animate-spin" />
                                        {item.rotationsCount > 0 ? `${item.rotationsCount} troca${item.rotationsCount > 1 ? 's' : ''} por cota 429 (Failover Ativo)` : 'Rotacionou Hoje por Cota (Failover Ativo)'}
                                      </span>
                                    )}

                                    {item.rotationsCount > 0 && item.healthStatus !== 'rotated_today' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center gap-1">
                                        <RotateCcw className="w-3 h-3" />
                                        {item.rotationsCount} troca{item.rotationsCount > 1 ? 's' : ''} 429 registradas
                                      </span>
                                    )}

                                    {item.healthStatus === 'healthy' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Pool Seguro ({item.poolCount} chaves cadastradas)
                                      </span>
                                    )}

                                    {/* Active Key Info */}
                                    <span className="text-[11px] text-slate-400 font-mono">
                                      Ativa: <strong className="text-slate-200">{item.activeLabel}</strong> {item.activeSnippet && <span className="text-slate-500">({item.activeSnippet})</span>}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Metrics & Action */}
                              <div className="flex flex-wrap lg:flex-nowrap items-center gap-5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                                {/* Daily Usage Gauge */}
                                <div className="space-y-1 min-w-[130px]">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-400 font-bold uppercase">Cota Hoje:</span>
                                    <span className={`font-mono font-bold ${
                                      dailyPercent > 80 ? 'text-rose-400' : dailyPercent > 50 ? 'text-amber-400' : 'text-emerald-400'
                                    }`}>
                                      {item.dailyRequests} / 1.500 req
                                    </span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-300 rounded-full ${
                                        dailyPercent > 80 ? 'bg-rose-500' : dailyPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${Math.max(4, dailyPercent)}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-slate-500 block text-right">
                                    {dailyPercent}% do teto AI Studio
                                  </span>
                                </div>

                                {/* Rotations Stats */}
                                <div className="text-right min-w-[100px]">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Trocas 429</span>
                                  <span className="text-sm font-black font-mono text-cyan-400">
                                    {item.rotationsCount} {item.rotationsCount === 1 ? 'troca' : 'trocas'}
                                  </span>
                                  {item.lastRotationAt ? (
                                    <span className="text-[9px] text-slate-500 block">
                                      Última: {new Date(item.lastRotationAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {new Date(item.lastRotationAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-500 block">Nenhuma falha</span>
                                  )}
                                </div>

                                {/* Month Volume */}
                                <div className="text-right min-w-[100px] hidden sm:block">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Mês ({selectedTokenMonth})</span>
                                  <span className="text-sm font-black font-mono text-white">
                                    {item.totalMonthRequests.toLocaleString('pt-BR')} req
                                  </span>
                                  <span className="text-[9px] text-slate-500 block font-mono">
                                    {item.totalMonthTokens.toLocaleString('pt-BR')} tokens
                                  </span>
                                </div>

                                {/* WhatsApp Instruction Action */}
                                <button
                                  type="button"
                                  onClick={() => handleCopyWhatsAppInstruction(item)}
                                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                    isCopied
                                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                  }`}
                                  title="Copiar mensagem personalizada com instruções prontas para enviar ao assessor"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <SendHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Instruir Assessor</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* SUBTAB 2: FATURAMENTO & TOKENS POR GABINETE (CHAVE NATIVA)     */}
              {/* ============================================================== */}
              {tokenSubTab === 'cabinet_financial' && (
                <div className="space-y-6">

              {/* Status Banner when retroactive import completes */}
              {retroImportReport && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-300">
                        Histórico Retroativo Consolidado com Sucesso!
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {retroImportReport.totalRecordsProcessed} minutas e execuções processadas | {retroImportReport.totalTokensImported.toLocaleString('pt-BR')} tokens consolidados em {retroImportReport.cabinetsUpdated} gabinetes.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRetroImportReport(null)}
                    className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Notice for retro import if no data registered yet */}
              {tokenUsageList.reduce((acc, curr) => acc + (curr.totalTokens || 0), 0) === 0 && !isImportingPastTokens && !retroImportReport && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-300">
                        Histórico de uso anterior pronto para consolidação
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                        Este painel exibe dados a partir da telemetria agregada por mês. Para trazer todas as minutas e análises já produzidas pelos usuários dos gabinetes para a telemetria, clique em <strong>"Importar Histórico Retroativo"</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleImportPastTokens}
                    disabled={isImportingPastTokens || isLoadingTokenUsage}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shrink-0 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Importar Agora</span>
                  </button>
                </div>
              )}

              {/* Aggregated Totals Banner */}
              {(() => {
                const totalGlobalTokens = tokenUsageList.reduce((acc, curr) => acc + (curr.totalTokens || 0), 0);
                const totalGlobalPrompt = tokenUsageList.reduce((acc, curr) => acc + (curr.promptTokens || 0), 0);
                const totalGlobalCandidates = tokenUsageList.reduce((acc, curr) => acc + (curr.candidatesTokens || 0), 0);
                const totalGlobalRequests = tokenUsageList.reduce((acc, curr) => acc + (curr.requestCount || 0), 0);
                const activeCabinetsCount = tokenUsageList.filter(t => (t.totalTokens || 0) > 0).length;
                const totalGlobalCost = calculateTokenCostBRL(totalGlobalPrompt, totalGlobalCandidates, totalGlobalTokens);

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total de Tokens (Mês)</span>
                      <p className="text-xl font-black text-amber-400 mt-1 font-mono">
                        {totalGlobalTokens.toLocaleString('pt-BR')}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Tokens faturados na chave nativa</span>
                    </div>

                    <div className="bg-slate-900 border border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 to-slate-900 rounded-2xl p-4 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Custo Estimado (Total R$)</span>
                        <Coins className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <p className="text-xl font-black text-emerald-400 mt-1 font-mono">
                        {totalGlobalCost.formattedBrl}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        ~${totalGlobalCost.usdTotal.toFixed(2)} USD • Gemini Flash
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Requisições à IA</span>
                      <p className="text-xl font-black text-white mt-1 font-mono">
                        {totalGlobalRequests.toLocaleString('pt-BR')}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Chamadas nativas executadas</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Divisão Prompt / Saída</span>
                      <div className="flex items-center gap-2 mt-1 text-xs font-mono">
                        <span className="text-indigo-400 font-bold" title="Prompt (Entrada)">
                          P: {totalGlobalPrompt.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-slate-600">/</span>
                        <span className="text-emerald-400 font-bold" title="Candidatos (Saída)">
                          S: {totalGlobalCandidates.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Entrada vs. Resposta gerada</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Gabinetes Consumidores</span>
                      <p className="text-xl font-black text-emerald-400 mt-1">
                        {activeCabinetsCount} <span className="text-xs font-normal text-slate-400">de {tenants.length}</span>
                      </p>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Com consumo em {selectedTokenMonth}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tokenUsageSearch}
                    onChange={e => setTokenUsageSearch(e.target.value)}
                    placeholder="Filtrar por nome do gabinete, ID ou usuário..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                  {tokenUsageSearch && (
                    <button
                      onClick={() => setTokenUsageSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>Competência ativa: <strong className="text-amber-400">{selectedTokenMonth}</strong></span>
                </div>
              </div>

              {/* Token Usage by Cabinet List */}
              {isLoadingTokenUsage ? (
                <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  <span>Calculando telemetria de consumo de tokens...</span>
                </div>
              ) : tokenUsageList.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Nenhum consumo registrado em {selectedTokenMonth}</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Não há registros de requisições utilizando a chave nativa para este mês de competência ou os usuários utilizaram chaves de API próprias (BYOK).
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tokenUsageList
                    .filter(usage => {
                      if (!tokenUsageSearch.trim()) return true;
                      const q = tokenUsageSearch.toLowerCase();
                      const matchCabinet = (usage.tenantName || '').toLowerCase().includes(q) || usage.tenantId.toLowerCase().includes(q);
                      const matchUser = Object.values(usage.users || {}).some(u => 
                        (u.userEmail || '').toLowerCase().includes(q) || (u.userName || '').toLowerCase().includes(q)
                      );
                      return matchCabinet || matchUser;
                    })
                    .sort((a, b) => (b.totalTokens || 0) - (a.totalTokens || 0))
                    .map(usage => {
                      const isExpanded = expandedCabinetTokenId === usage.tenantId;
                      const usersArray = Object.values(usage.users || {}).sort((a, b) => (b.totalTokens || 0) - (a.totalTokens || 0));
                      const lastUsedDate = usage.lastUsedAt 
                        ? new Date(usage.lastUsedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : 'Nunca';
                      const cabinetCost = calculateTokenCostBRL(usage.promptTokens, usage.candidatesTokens, usage.totalTokens);

                      return (
                        <div
                          key={usage.tenantId}
                          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition shadow-md overflow-hidden"
                        >
                          {/* Cabinet Header Row */}
                          <div 
                            onClick={() => setExpandedCabinetTokenId(isExpanded ? null : usage.tenantId)}
                            className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-slate-900 hover:bg-slate-800/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                <Building className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-white">
                                    {usage.tenantName || usage.tenantId}
                                  </h4>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                                    {usage.tenantId}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                                  <span>Último uso: <strong className="text-slate-300">{lastUsedDate}</strong></span>
                                  <span>•</span>
                                  <span>{usersArray.length} {usersArray.length === 1 ? 'usuário ativo' : 'usuários ativos'}</span>
                                </div>

                                {usage.modules && (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                    {usage.modules.minuta && usage.modules.minuta.totalTokens > 0 && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono">
                                        📝 Minutas: {usage.modules.minuta.totalTokens.toLocaleString('pt-BR')} (R$ {usage.modules.minuta.costBrl?.toFixed(2) || '0,00'})
                                      </span>
                                    )}
                                    {usage.modules.audiencia && usage.modules.audiencia.totalTokens > 0 && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono">
                                        ⚖️ Audiência: {usage.modules.audiencia.totalTokens.toLocaleString('pt-BR')} (R$ {usage.modules.audiencia.costBrl?.toFixed(2) || '0,00'})
                                      </span>
                                    )}
                                    {usage.modules.lupa_magistrado && usage.modules.lupa_magistrado.totalTokens > 0 && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono">
                                        🔍 Lupa: {usage.modules.lupa_magistrado.totalTokens.toLocaleString('pt-BR')} (R$ {usage.modules.lupa_magistrado.costBrl?.toFixed(2) || '0,00'})
                                      </span>
                                    )}
                                    {usage.modules.chat_refino && usage.modules.chat_refino.totalTokens > 0 && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono">
                                        💬 Chat: {usage.modules.chat_refino.totalTokens.toLocaleString('pt-BR')} (R$ {usage.modules.chat_refino.costBrl?.toFixed(2) || '0,00'})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Cabinet Totals */}
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right">
                                <span className="text-[10px] text-emerald-400 font-bold uppercase block">Custo (R$)</span>
                                <span className="text-sm font-black text-emerald-400 font-mono">
                                  {cabinetCost.formattedBrl}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total de Tokens</span>
                                <span className="text-sm font-black text-amber-400 font-mono">
                                  {(usage.totalTokens || 0).toLocaleString('pt-BR')}
                                </span>
                              </div>

                              <div className="text-right hidden sm:block">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Requisições</span>
                                <span className="text-sm font-black text-white font-mono">
                                  {(usage.requestCount || 0).toLocaleString('pt-BR')}
                                </span>
                              </div>

                              <div className="text-right hidden md:block">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Prompt / Saída</span>
                                <span className="text-xs text-slate-300 font-mono">
                                  <span className="text-indigo-400">{(usage.promptTokens || 0).toLocaleString('pt-BR')}</span> / <span className="text-emerald-400">{(usage.candidatesTokens || 0).toLocaleString('pt-BR')}</span>
                                </span>
                              </div>

                              <div className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                          </div>

                          {/* Expanded User-by-User Breakdown */}
                          {isExpanded && (
                            <div className="border-t border-slate-800/80 bg-slate-950/60 p-4 space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                                  Detalhamento por Usuário do Gabinete
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Total de {usersArray.length} {usersArray.length === 1 ? 'membro com consumo' : 'membros com consumo'}
                                </span>
                              </div>

                              {usersArray.length === 0 ? (
                                <p className="text-xs text-slate-500 italic py-2">Nenhum detalhamento individual registrado.</p>
                              ) : (
                                <div className="space-y-2">
                                  {usersArray.map(u => {
                                    const userPercent = usage.totalTokens > 0 
                                      ? Math.round(((u.totalTokens || 0) / usage.totalTokens) * 100)
                                      : 0;
                                    const uLastDate = u.lastUsedAt 
                                      ? new Date(u.lastUsedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                      : 'Recente';
                                    const userCost = calculateTokenCostBRL(u.promptTokens, u.candidatesTokens, u.totalTokens);

                                    return (
                                      <div 
                                        key={u.userEmail || u.userName}
                                        className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                                            {(u.userName || u.userEmail || 'U').charAt(0).toUpperCase()}
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-bold text-white">{u.userName || u.userEmail}</span>
                                              {u.userName && u.userEmail && (
                                                <span className="text-[11px] text-slate-400 font-mono">({u.userEmail})</span>
                                              )}
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">
                                              Última requisição: {uLastDate}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-4 shrink-0 pl-10 sm:pl-0">
                                          <div className="text-right">
                                            <span className="text-[9px] text-emerald-400 uppercase block font-semibold">Custo (R$)</span>
                                            <span className="font-mono font-bold text-emerald-400">
                                              {userCost.formattedBrl}
                                            </span>
                                            <span className="text-[9px] text-slate-500 block">({userPercent}% do gabinete)</span>
                                          </div>

                                          <div className="text-right">
                                            <span className="text-[9px] text-slate-500 uppercase block font-semibold">Tokens</span>
                                            <span className="font-mono font-bold text-amber-300">
                                              {(u.totalTokens || 0).toLocaleString('pt-BR')}
                                            </span>
                                          </div>

                                          <div className="text-right">
                                            <span className="text-[9px] text-slate-500 uppercase block font-semibold">Requisições</span>
                                            <span className="font-mono text-slate-300">
                                              {(u.requestCount || 0).toLocaleString('pt-BR')}
                                            </span>
                                          </div>

                                          <div className="text-right hidden sm:block">
                                            <span className="text-[9px] text-slate-500 uppercase block font-semibold">Prompt / Saída</span>
                                            <span className="font-mono text-[11px] text-slate-400">
                                              <span className="text-indigo-400">{(u.promptTokens || 0).toLocaleString('pt-BR')}</span> / <span className="text-emerald-400">{(u.candidatesTokens || 0).toLocaleString('pt-BR')}</span>
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
                </div>
              )}

              {/* ============================================================== */}
              {/* SUBTAB 3: LOG DE OPERAÇÕES EM TEMPO REAL                       */}
              {/* ============================================================== */}
              {tokenSubTab === 'recent_logs' && (
                <div className="space-y-6">
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-amber-400" />
                        Módulo:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedModuleFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          selectedModuleFilter === 'all'
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        Todos ({recentLogs.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedModuleFilter('minuta')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          selectedModuleFilter === 'minuta'
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <FileText className="w-3 h-3" />
                        <span>Minutas ({recentLogs.filter(l => l.module === 'minuta').length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedModuleFilter('audiencia')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          selectedModuleFilter === 'audiencia'
                            ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Gavel className="w-3 h-3" />
                        <span>Audiência ({recentLogs.filter(l => l.module === 'audiencia').length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedModuleFilter('lupa_magistrado')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          selectedModuleFilter === 'lupa_magistrado'
                            ? 'bg-purple-500 text-slate-950 font-black shadow-md shadow-purple-500/20'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Lupa ({recentLogs.filter(l => l.module === 'lupa_magistrado').length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedModuleFilter('chat_refino')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          selectedModuleFilter === 'chat_refino'
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Chat ({recentLogs.filter(l => l.module === 'chat_refino').length})</span>
                      </button>
                    </div>

                    <div className="relative min-w-[240px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar por processo, usuário, gabinete..."
                        value={tokenUsageSearch}
                        onChange={e => setTokenUsageSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Logs Table */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/60">
                            <th className="py-3 px-3.5">Horário / Data</th>
                            <th className="py-3 px-3.5">Módulo / Ferramenta</th>
                            <th className="py-3 px-3.5">Operação / Processo</th>
                            <th className="py-3 px-3.5">Assessor / Gabinete</th>
                            <th className="py-3 px-3.5">Chave de IA Utilizada</th>
                            <th className="py-3 px-3.5 text-right">Tokens Consumidos</th>
                            <th className="py-3 px-3.5 text-right text-emerald-400">Custo Estimado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {isLoadingRecentLogs ? (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-slate-400">
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                                Carregando histórico de execuções...
                              </td>
                            </tr>
                          ) : filteredRecentLogs.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-slate-500 italic">
                                Nenhuma execução recente encontrada com os filtros selecionados.
                              </td>
                            </tr>
                          ) : (
                            filteredRecentLogs.map(log => {
                              const moduleBadge = (() => {
                                switch (log.module) {
                                  case 'minuta':
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-sans font-bold text-[10px]">
                                        <FileText className="w-3 h-3" /> Minuta
                                      </span>
                                    );
                                  case 'audiencia':
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-sans font-bold text-[10px]">
                                        <Gavel className="w-3 h-3" /> Audiência
                                      </span>
                                    );
                                  case 'lupa_magistrado':
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 font-sans font-bold text-[10px]">
                                        <Eye className="w-3 h-3" /> Lupa
                                      </span>
                                    );
                                  case 'chat_refino':
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-sans font-bold text-[10px]">
                                        <MessageSquare className="w-3 h-3" /> Chat
                                      </span>
                                    );
                                  default:
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-sans font-bold text-[10px]">
                                        <Zap className="w-3 h-3" /> IA
                                      </span>
                                    );
                                }
                              })();

                              return (
                                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                                  <td className="py-2.5 px-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                                    {log.timestamp || (log.timeMs ? new Date(log.timeMs).toLocaleTimeString() : 'Recente')}
                                  </td>
                                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                                    {moduleBadge}
                                  </td>
                                  <td className="py-2.5 px-3.5 font-sans">
                                    <div className="font-bold text-white text-xs">{log.label || 'Operação IA'}</div>
                                    {log.processNumber && (
                                      <div className="text-[10px] text-slate-400 font-mono">{log.processNumber}</div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3.5 font-sans">
                                    <div className="font-medium text-slate-200 text-xs">{log.userName || log.userEmail || 'Assessor'}</div>
                                    <div className="text-[10px] text-slate-500">{log.tenantId || 'gabinete'}</div>
                                  </td>
                                  <td className="py-2.5 px-3.5 font-sans">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                                      log.keyType === 'byok'
                                        ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                    }`}>
                                      {log.keyLabel || (log.keyType === 'byok' ? 'Pool BYOK (Gratuita)' : 'Chave Nativa')}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right">
                                    <div className="font-bold text-amber-300">
                                      {(log.totalTokens || (log.promptTokens + (log.outputTokens || 0))).toLocaleString('pt-BR')}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      {log.promptTokens} in / {log.outputTokens || 0} out
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right font-bold text-emerald-400">
                                    R$ {(log.costBrl || 0).toFixed(4)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ============================================================== */}
      {/* MODAL: EDIT GABINETE                                            */}
      {/* ============================================================== */}
      {editingTenant && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                Editar Dados do Gabinete ({editingTenant.id})
              </h3>
              <button onClick={() => setEditingTenant(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            <form onSubmit={handleSaveEditTenant} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Nome do Gabinete / Juiz Titular
                </label>
                <input
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  type="text"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  E-mail Titular (@gmail.com)
                </label>
                <input
                  required
                  value={editOwnerEmail}
                  onChange={e => setEditOwnerEmail(e.target.value)}
                  type="email"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  🏛️ Comarca / Lotação Principal (Vara / Unidade Judiciária)
                </label>
                <input
                  value={editInitialUnit}
                  onChange={e => setEditInitialUnit(e.target.value)}
                  type="text"
                  placeholder="ex: Palmeiras de Goiás ou 1ª Vara Cível de Palmeiras de Goiás"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500"
                />
                <p className="text-[9px] text-slate-500 mt-1">Nome da unidade judiciária / comarca exibida no cabeçalho e minutas</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Plano de Licença
                  </label>
                  <select
                    value={editPlan}
                    onChange={e => setEditPlan(e.target.value as TenantPlan)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500"
                  >
                    <option value="magistrado">Magistrado Pro</option>
                    <option value="enterprise">Enterprise (Tribunal)</option>
                    <option value="trial">Trial / Avaliação</option>
                    <option value="pro">Básico</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Limite Máximo de Membros
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={editMaxUsers}
                    onChange={e => setEditMaxUsers(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Notas / Observações Administrativas
                </label>
                <input
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  type="text"
                  placeholder="ex: Renovação semestral em Dezembro"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SUSPEND / CHANGE GABINETE STATUS                         */}
      {/* ============================================================== */}
      {suspendingTenant && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-white">Alterar Status do Gabinete</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Você está prestes a alterar o status de acesso para o gabinete <span className="font-bold text-white">"{suspendingTenant.name}"</span>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Novo Status
                </label>
                <select
                  value={suspensionTargetStatus}
                  onChange={e => setSuspensionTargetStatus(e.target.value as TenantStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-amber-500"
                >
                  <option value="suspended">🔴 Suspenso (Bloqueia acesso de todos os membros)</option>
                  <option value="maintenance">🟠 Em Manutenção Técnica</option>
                  <option value="trial">🔵 Em Avaliação (Trial)</option>
                  <option value="active">🟢 Ativo e Liberado</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Mensagem / Motivo para exibição aos usuários
                </label>
                <textarea
                  rows={3}
                  value={suspensionReason}
                  onChange={e => setSuspensionReason(e.target.value)}
                  placeholder="ex: Gabinete em manutenção técnica ou renovação de licença."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSuspendingTenant(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleToggleTenantStatus(suspendingTenant, suspensionTargetStatus, suspensionReason)}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-bold"
              >
                Confirmar Alteração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TRANSFER USER TO ANOTHER GABINETE                       */}
      {/* ============================================================== */}
      {transferringUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-indigo-400">
                <Building className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold text-white">Transferir Usuário de Gabinete</h3>
              </div>
              <button
                onClick={() => {
                  setTransferringUser(null);
                  setTransferError(null);
                }}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {/* Informações do Usuário e Gabinete Atual */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Usuário:</span>
                <span className="font-bold text-indigo-300">{transferringUser.name || 'Sem nome'} ({transferringUser.email})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Gabinete Atual:</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 font-mono text-[11px]">
                  {tenants.find(t => t.id === (transferringUser.tenantId || 'gabinete_default'))?.name || (isPrimaryCabinet(transferringUser.tenantId) ? 'Dr. Rafael Machado' : transferringUser.tenantId || 'Dr. Rafael Machado')}
                </span>
              </div>
            </div>

            {transferError && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            {/* Modo de Seleção: Existente vs Novo */}
            <div className="space-y-3">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingNewInTransfer(false)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    !isCreatingNewInTransfer ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Gabinete Existente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNewInTransfer(true);
                    if (!newCabinetNameInTransfer) {
                      setNewCabinetNameInTransfer('Gabinete ');
                      setNewCabinetIdInTransfer('gab_');
                    }
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    isCreatingNewInTransfer ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar Novo Gabinete
                </button>
              </div>

              {!isCreatingNewInTransfer ? (
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    Selecione o Gabinete de Destino:
                  </label>
                  <select
                    value={targetTenantId}
                    onChange={e => setTargetTenantId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500"
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} (ID: {t.id}) - {globalUsers.filter(u => (u.tenantId || 'gabinete_default') === t.id).length} membro(s)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Nome do Novo Gabinete:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Gabinete Dra. Ana Paula (Vara Cível)"
                      value={newCabinetNameInTransfer}
                      onChange={e => {
                        const val = e.target.value;
                        setNewCabinetNameInTransfer(val);
                        const autoId = 'gab_' + val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
                        setNewCabinetIdInTransfer(autoId);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        ID da Partição:
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: gab_dra_ana"
                        value={newCabinetIdInTransfer}
                        onChange={e => setNewCabinetIdInTransfer(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-indigo-300 font-mono focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Plano:
                      </label>
                      <select
                        value={newCabinetPlanInTransfer}
                        onChange={e => setNewCabinetPlanInTransfer(e.target.value as TenantPlan)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:border-indigo-500"
                      >
                        <option value="magistrado">Magistrado (Até 10)</option>
                        <option value="pro">Profissional (Até 20)</option>
                        <option value="enterprise">Enterprise (Até 50)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTransferringUser(null);
                  setTransferError(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleTransferUser}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
              >
                <Check className="w-3.5 h-3.5" />
                Efetivar Transferência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: INSPECT GABINETE MEMBERS                                */}
      {/* ============================================================== */}
      {inspectingTenant && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-6 max-w-2xl w-full flex flex-col max-h-[80vh] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Membros Vinculados: {inspectingTenant.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">ID: {inspectingTenant.id}</p>
              </div>
              <button onClick={() => setInspectingTenant(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            {/* Formulario de Convidar Novo Membro */}
            <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20">
              <div className="flex items-center gap-2 mb-1.5 text-indigo-300 font-bold text-sm">
                <UserPlus className="w-4 h-4" />
                <span>Convidar ou Liberar Novo Membro</span>
              </div>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Digite o e-mail (<strong>@gmail.com</strong>) para liberar o acesso ou vincular o membro imediatamente a este gabinete.
              </p>
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="ex: assessor@gmail.com"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm shrink-0 cursor-pointer"
                >
                  {inviting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Vinculando...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Liberar Acesso</span>
                    </>
                  )}
                </button>
              </form>
              {inviteFeedback && (
                <div className={`mt-2.5 p-3 rounded-xl text-xs space-y-2.5 ${
                  inviteFeedback.type === 'success' 
                    ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/50 border border-rose-800 text-rose-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {inviteFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span className="font-semibold">{inviteFeedback.message}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {globalUsers
                .filter(u => {
                  const uTenant = u.tenantId || 'gabinete_default';
                  if (isPrimaryCabinet(inspectingTenant.id)) {
                    return isPrimaryCabinet(uTenant);
                  }
                  return uTenant === inspectingTenant.id;
                })
                .map(u => {
                  const isSelf = u.email === 'fabriciocunha.adv@gmail.com';
                  return (
                  <div key={u.uid} className="flex flex-col p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold">
                          {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{u.name || 'Sem nome'}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Native Key */}
                        <button
                          onClick={() => handleToggleNativeKey(u)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            u.canUseNativeKey
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                          }`}
                          title="Alternar acesso à Chave Nativa"
                        >
                          {u.canUseNativeKey ? 'Nativa: Sim' : 'Nativa: Não'}
                        </button>
                        
                        {/* Judge Toggle */}
                        <button
                          onClick={() => handleToggleJudgeStatus(u)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            u.isJudge 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                          }`}
                          title="Alternar status de Magistrado"
                        >
                          👑 {u.isJudge ? 'Juiz' : 'Assessor'}
                        </button>

                        {/* Role Select */}
                        {!isSelf && (
                          <select
                            value={u.role}
                            onChange={(e) => {
                              const newRole = e.target.value as UserRole;
                              if (newRole !== u.role) {
                                handleSetUserRole(u, newRole);
                              }
                            }}
                            className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded p-1 font-bold cursor-pointer outline-none"
                          >
                            <option value="user">Assessor</option>
                            <option value="admin">Administrador</option>
                          </select>
                        )}
                        {isSelf && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-bold">Admin</span>
                        )}

                        {/* Status Toggle */}
                        {!isSelf && (
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                              u.isActive !== false
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-900/50 hover:bg-emerald-900'
                                : 'bg-rose-950 text-rose-400 border-rose-900/50 hover:bg-rose-900'
                            }`}
                          >
                            {u.isActive !== false ? 'Ativo' : 'Desativado'}
                          </button>
                        )}

                        {/* Delete User */}
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteUser(u)}
                            title="Excluir Usuário"
                            className="p-1 bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-700 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Units Block */}
                    <div className="w-full pt-3 border-t border-slate-800">
                      <label className="text-[10px] font-bold text-slate-500 mb-2 block uppercase tracking-wider">
                        Unidades Liberadas
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {inspectingTenantUnits.length === 0 ? (
                          <span className="text-[10px] text-slate-500 italic">Nenhuma unidade cadastrada neste gabinete.</span>
                        ) : (
                          inspectingTenantUnits.map(unit => {
                            const isAllowed = u.allowedUnits ? u.allowedUnits.includes(unit.id) : true;
                            return (
                              <label key={unit.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] border cursor-pointer transition-colors ${isAllowed ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300 font-medium' : 'bg-slate-900 border-slate-700 text-slate-500 hover:bg-slate-800'}`}>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={isAllowed}
                                  onChange={(e) => {
                                    let newUnits = u.allowedUnits ? [...u.allowedUnits] : inspectingTenantUnits.map(au => au.id);
                                    if (e.target.checked) {
                                      if (!newUnits.includes(unit.id)) newUnits.push(unit.id);
                                    } else {
                                      newUnits = newUnits.filter(id => id !== unit.id);
                                    }
                                    handleToggleUserUnits(u, newUnits);
                                  }}
                                />
                                {isAllowed && <CheckCircle2 className="w-2.5 h-2.5 text-indigo-400" />}
                                <span>{unit.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )})}
                
              {allInvites
                .filter(inv => {
                  if (isPrimaryCabinet(inspectingTenant.id)) {
                    return isPrimaryCabinet(inv.tenantId);
                  }
                  return inv.tenantId === inspectingTenant.id;
                })
                .map(inv => (
                  <div key={inv.email} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-xl border border-dashed border-indigo-500/40 bg-indigo-950/20 gap-3">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-900/60 text-indigo-300 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">Convite Registrado</span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-950/80 border border-amber-800 text-amber-400 text-[9px] font-bold uppercase tracking-wider">
                            <Bell className="w-2.5 h-2.5" />
                            <span>Aguardando Login</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{inv.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 justify-end">
                      <a
                        href={getGmailWebUrl(inv.email)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[10px] font-bold inline-flex items-center gap-1 transition"
                        title="Abrir no Gmail"
                      >
                        <Mail className="w-3 h-3 text-red-500" />
                        <span>Gmail</span>
                      </a>
                      <a
                        href={getMailtoUrl(inv.email)}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[10px] font-bold inline-flex items-center gap-1 transition"
                        title="E-mail Padrão"
                      >
                        <Send className="w-3 h-3 text-blue-500" />
                        <span>E-mail</span>
                      </a>
                      <a
                        href={getWhatsAppUrl(inv.email)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[10px] font-bold inline-flex items-center gap-1 transition"
                        title="WhatsApp"
                      >
                        <Share2 className="w-3 h-3 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyInvite(inv.email)}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                        title="Copiar Texto"
                      >
                        {copiedEmail === inv.email ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-indigo-400" />
                            <span>Copiar Texto</span>
                          </>
                        )}
                      </button>

                      {inviteToDelete === inv.email ? (
                        <div className="flex items-center gap-1 ml-1">
                          <span className="text-[9px] text-rose-500 font-medium">Revogar?</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInvite(inv.email)}
                            className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 text-[10px] font-bold"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setInviteToDelete(null)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[10px] font-bold"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setInviteToDelete(inv.email)}
                          className="p-1 rounded text-rose-500 hover:text-white border border-rose-900/50 hover:border-transparent hover:bg-rose-600 transition flex items-center justify-center ml-1 cursor-pointer"
                          title="Revogar convite"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              {globalUsers.filter(u => {
                const uTenant = u.tenantId || 'gabinete_default';
                if (isPrimaryCabinet(inspectingTenant.id)) {
                  return isPrimaryCabinet(uTenant);
                }
                return uTenant === inspectingTenant.id;
              }).length === 0 && allInvites.filter(inv => {
                  if (isPrimaryCabinet(inspectingTenant.id)) {
                    return isPrimaryCabinet(inv.tenantId);
                  }
                  return inv.tenantId === inspectingTenant.id;
              }).length === 0 && (
                <p className="text-xs text-slate-500 py-6 text-center">Nenhum membro ou convite vinculado a este gabinete no momento.</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectingTenant(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DELETE USER CONFIRMATION                                */}
      {/* ============================================================== */}
      {userToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir Usuário Permanentemente</h3>
                <p className="text-[11px] text-rose-400">Governança Super Admin SaaS</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
              <p className="text-slate-300">
                Tem certeza de que deseja excluir permanentemente o seguinte usuário do sistema?
              </p>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60 text-xs">
                <p className="font-bold text-indigo-300 text-sm">{userToDelete.name || 'Sem nome'}</p>
                <p className="text-slate-300 font-mono mt-0.5">{userToDelete.email}</p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <span>Gabinete:</span>
                  <span className="font-semibold text-slate-200">
                    {tenants.find(t => t.id === (userToDelete.tenantId || 'gabinete_default'))?.name || userToDelete.tenantId || 'Gabinete Principal'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ⚠️ O registro será removido da base de dados Firestore (<code className="text-purple-300">users</code>) e quaisquer convites pendentes serão cancelados.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-900/30 cursor-pointer disabled:opacity-50"
              >
                {isDeletingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeletingUser ? "Excluindo..." : "Confirmar Exclusão"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREATE MANUAL SNAPSHOT                                  */}
      {/* ============================================================== */}
      {showCreateSnapshotModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center gap-3 text-emerald-400 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Criar Ponto de Restauração Manual</h3>
                <p className="text-[11px] text-emerald-400">Snapshot de Segurança do Ecossistema SaaS</p>
              </div>
            </div>

            <form onSubmit={handleCreateManualSnapshot} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Motivo ou Descrição do Ponto de Restauração:
                </label>
                <input
                  type="text"
                  required
                  value={snapshotReasonInput}
                  onChange={e => setSnapshotReasonInput(e.target.value)}
                  placeholder="Ex: Antes de reestruturar permissões de magistrados..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Sugestões Rápidas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Antes de ajustes de permissões",
                    "Ponto de Controle Semanal",
                    "Pré-Reestruturação de Gabinetes",
                    "Backup Seguro do Sistema"
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSnapshotReasonInput(preset)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium border border-slate-700 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
                ℹ️ Todos os gabinetes, usuários, configurações, lotações de magistrados, teses, histórico de minutas e prompts serão capturados e salvos no Firestore e em redundância local.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isCreatingSnapshot}
                  onClick={() => setShowCreateSnapshotModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSnapshot}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingSnapshot ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  <span>{isCreatingSnapshot ? "Capturando..." : "Gerar Snapshot"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RESTORE SNAPSHOT CONFIRMATION                           */}
      {/* ============================================================== */}
      {snapshotToRestore && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center gap-3 text-indigo-400 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Restaurar Ponto de Segurança</h3>
                <p className="text-[11px] text-indigo-400">Restauração Transacional de Dados</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Você está prestes a restaurar todo o ecossistema SaaS para o estado capturado no ponto abaixo:
              </p>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{snapshotToRestore.reason}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-bold uppercase">
                    {snapshotToRestore.triggeredBy || 'manual'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Data de Captura: <strong className="text-slate-200">{new Date(snapshotToRestore.timestamp).toLocaleString('pt-BR')}</strong>
                </p>
                <p className="text-[11px] text-slate-400">
                  Autor: <strong className="text-slate-200">{snapshotToRestore.authorName || snapshotToRestore.authorEmail || 'Super Admin'}</strong>
                </p>

                {snapshotToRestore.summary && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                    <div className="p-2 bg-slate-900 rounded-lg text-center">
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Gabinetes</span>
                      <span className="text-indigo-400 font-bold text-sm">{snapshotToRestore.summary.tenantsCount}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg text-center">
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Usuários</span>
                      <span className="text-emerald-400 font-bold text-sm">{snapshotToRestore.summary.usersCount}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg text-center">
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Minutas</span>
                      <span className="text-amber-400 font-bold text-sm">{snapshotToRestore.summary.totalHistoriesCount}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção:</strong> Os gabinetes, perfis de usuários, permissões, lotações, teses e prompts serão reconciliados com os valores exatos deste snapshot. Um snapshot automático do estado atual será tirado antes da execução para máxima segurança.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isRestoringSnapshot}
                onClick={() => setSnapshotToRestore(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRestoringSnapshot}
                onClick={() => handleRestoreSnapshot(snapshotToRestore)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-950/40 cursor-pointer disabled:opacity-50"
              >
                {isRestoringSnapshot ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>{isRestoringSnapshot ? "Restaurando Dados..." : "Confirmar Restauração"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DELETE SNAPSHOT CONFIRMATION                            */}
      {/* ============================================================== */}
      {snapshotToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir Ponto de Restauração</h3>
                <p className="text-[11px] text-rose-400">Limpeza de Histórico de Snapshots</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza de que deseja excluir este ponto de restauração? Esta operação não pode ser desfeita.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSnapshotToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSnapshot(snapshotToDelete)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-900/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
