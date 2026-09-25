import React, { useState, useEffect } from "react";
import { 
  X, 
  Users, 
  Shield, 
  ShieldAlert, 
  CheckCircle2, 
  User, 
  Radio, 
  Bell, 
  Megaphone, 
  Send, 
  AlertTriangle, 
  Key, 
  Zap, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Scale, 
  Award,
  UserPlus,
  UserCheck,
  UserX,
  UserMinus,
  Mail,
  Plus,
  Trash2,
  Power,
  RefreshCw,
  Download,
  Database,
  History,
  RotateCcw,
  Copy,
  ExternalLink,
  Share2,
  SendHorizontal,
  Check,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { UserProfile, UserRole, SystemBroadcast, CabinetBackupSnapshot } from "../types";
import { 
  getAllUsers, 
  updateUserRole, 
  updateUserUnits, 
  updateUserNativeKeyAccess, 
  updateUserJudgeStatus, 
  updateUserStatus,
  removeUserFromTenant,
  deleteUserPermanently,
  getSystemBroadcastFromDb, 
  saveSystemBroadcastToDb, 
  inviteUserToTenant, getPendingInvites, removeInvite,
  createCabinetBackupSnapshot,
  getCabinetBackupSnapshots,
  fetchFullCabinetBackupSnapshot,
  restoreCabinetBackupSnapshot,
  deleteCabinetBackupSnapshot
} from "../lib/firestoreUtils";
import { useAuth } from "../lib/AuthContext";
import { getMaskedApiKey } from "../utils/apiKeyManager";

interface UserManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagerModal: React.FC<UserManagerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"users" | "broadcast" | "backups">("users");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pendingInvites, setPendingInvites] = useState<{email: string, tenantId: string, invitedAt: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  
  // Broadcast state
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<"info" | "warning" | "update" | "maintenance">("update");
  const [isBroadcastActive, setIsBroadcastActive] = useState(false);
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);
  const [latestCreatedBackup, setLatestCreatedBackup] = useState<CabinetBackupSnapshot | null>(null);
  
  // Backups state
  const [backups, setBackups] = useState<CabinetBackupSnapshot[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [isRestoringBackupId, setIsRestoringBackupId] = useState<string | null>(null);
  const [isDeletingBackupId, setIsDeletingBackupId] = useState<string | null>(null);
  const [backupActionFeedback, setBackupActionFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [backupToDelete, setBackupToDelete] = useState<CabinetBackupSnapshot | null>(null);
  const [backupToRestore, setBackupToRestore] = useState<CabinetBackupSnapshot | null>(null);
  const [userToToggleAccess, setUserToToggleAccess] = useState<{uid: string, currentIsActive: boolean, userEmail: string} | null>(null);

  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [inviteToDelete, setInviteToDelete] = useState<string | null>(null);
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Pagination states
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 5;
  const [backupPage, setBackupPage] = useState(1);
  const backupsPerPage = 5;

  const totalUserPages = Math.ceil(users.length / usersPerPage) || 1;
  const paginatedUsers = users.slice((userPage - 1) * usersPerPage, userPage * usersPerPage);

  const totalBackupPages = Math.ceil(backups.length / backupsPerPage) || 1;
  const paginatedBackups = backups.slice((backupPage - 1) * backupsPerPage, backupPage * backupsPerPage);

  const { userProfile, allowedUnits } = useAuth();

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

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadBroadcast();
      loadBackups();
      setInviteFeedback(null);
      setBackupActionFeedback(null);
    }
  }, [isOpen]);

  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const data = await getCabinetBackupSnapshots();
      setBackups(data);
    } catch (err) {
      console.warn("Could not load backups:", err);
    } finally {
      setLoadingBackups(false);
    }
  };


  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      const invitesData = await getPendingInvites();
      setUsers(data);
      setPendingInvites(invitesData.filter(inv => !data.some(u => (u.email || '').toLowerCase() === inv.email.toLowerCase())));
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBroadcast = async () => {
    try {
      const current = await getSystemBroadcastFromDb();
      if (current) {
        setBroadcastMessage(current.message || "");
        setBroadcastType(current.type || "update");
        setIsBroadcastActive(Boolean(current.active));
      }
    } catch (err) {
      console.warn("Could not load current broadcast:", err);
    }
  };

  const handleUnitsChange = async (uid: string, units: string[]) => {
    setSaving(uid);
    try {
      await updateUserUnits(uid, units);
      setUsers(users.map(u => u.uid === uid ? { ...u, allowedUnits: units } : u));
    } catch (err) {
      console.error("Erro ao atualizar unidades:", err);
      alert("Erro ao atualizar unidades");
    } finally {
      setSaving(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.trim()) return;
    const cleanEmail = inviteEmail.trim().toLowerCase();
    
    if (!cleanEmail.endsWith('@gmail.com')) {
      setInviteFeedback({
        type: 'error',
        message: 'Por favor, convide apenas contas @gmail.com. Outros provedores não são suportados no momento.'
      });
      return;
    }

    // Check if already in list
    const existing = users.find(u => (u.email || '').toLowerCase() === cleanEmail);
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
      await inviteUserToTenant(cleanEmail);
      setLastInvitedEmail(cleanEmail);
      setInviteEmail("");
      setInviteFeedback({
        type: 'success',
        message: `Convite registrado com sucesso para "${cleanEmail}"! O acesso ao gabinete foi liberado.`
      });
      await loadUsers();
    } catch (err: any) {
      setInviteFeedback({
        type: 'error',
        message: "Erro ao convidar usuário: " + (err.message || String(err))
      });
    } finally {
      setInviting(false);
    }
  };

  const confirmToggleActive = async () => {
    if (!userToToggleAccess) return;
    const { uid, currentIsActive, userEmail } = userToToggleAccess;
    const nextStatus = !currentIsActive;
    setUserToToggleAccess(null);
    setSaving(uid);
    try {
      await updateUserStatus(uid, nextStatus, userEmail);
      setUsers(prev => prev.map(u => (u.uid === uid || (u.email && u.email.toLowerCase() === userEmail?.toLowerCase())) ? { ...u, isActive: nextStatus } : u));
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      alert("Erro ao alterar o status do usuário.");
    } finally {
      setSaving(null);
    }
  };

  const handleToggleActive = async (uid: string, currentIsActive: boolean, userEmail: string) => {
    if (uid === userProfile?.uid) {
      alert("Você não pode desativar seu próprio usuário.");
      return;
    }
    setUserToToggleAccess({ uid, currentIsActive, userEmail });
  };

  const handleRemoveUser = async (uid: string, userEmail: string, userName: string) => {
    if (uid === userProfile?.uid) {
      alert("Você não pode remover seu próprio usuário.");
      return;
    }
    setSaving(uid);
    try {
      await deleteUserPermanently(uid, userEmail);
      setUsers(prev => prev.filter(u => u.uid !== uid));
      setUserToDelete(null);
      setInviteFeedback({
        type: 'success',
        message: `Usuário "${userEmail}" foi excluído e desvinculado permanentemente do gabinete.`
      });
      await loadUsers();
    } catch (err) {
      console.error("Erro ao remover usuário:", err);
      alert("Erro ao desvincular usuário do gabinete.");
    } finally {
      setSaving(null);
    }
  };

  const handleRemoveInvite = async (email: string) => {
    try {
      await removeInvite(email);
      setPendingInvites(prev => prev.filter(inv => inv.email !== email));
      setInviteToDelete(null);
    } catch (err) {
      console.error("Erro ao revogar convite:", err);
      alert("Erro ao revogar convite.");
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (uid === userProfile?.uid) {
      alert("Você não pode alterar seu próprio nível de acesso.");
      return;
    }
    const targetUser = users.find(u => u.uid === uid);
    setSaving(uid);
    try {
      await updateUserRole(uid, newRole, targetUser?.email);
      setUsers(prev => prev.map(u => (u.uid === uid || (u.email && targetUser?.email && u.email.toLowerCase() === targetUser.email.toLowerCase())) ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Erro ao atualizar função:", err);
      alert("Erro ao atualizar o nível de acesso.");
    } finally {
      setSaving(null);
    }
  };

  const handleToggleNativeKey = async (uid: string, currentVal: boolean) => {
    if (userProfile?.email !== 'fabriciocunha.adv@gmail.com') {
      alert("Apenas o Administrador Principal (fabriciocunha.adv@gmail.com) pode liberar ou bloquear o uso da Chave Nativa do sistema.");
      return;
    }
    const targetUser = users.find(u => u.uid === uid);
    setSaving(uid);
    try {
      const nextVal = !currentVal;
      await updateUserNativeKeyAccess(uid, nextVal, targetUser?.email);
      setUsers(prev => prev.map(u => (u.uid === uid || (u.email && targetUser?.email && u.email.toLowerCase() === targetUser.email.toLowerCase())) ? { ...u, canUseNativeKey: nextVal } : u));
    } catch (err) {
      console.error("Erro ao atualizar acesso à chave nativa:", err);
      alert("Erro ao atualizar liberação da chave nativa.");
    } finally {
      setSaving(null);
    }
  };

  const handleToggleJudge = async (uid: string, currentIsJudge: boolean) => {
    const targetUser = users.find(u => u.uid === uid);
    setSaving(uid);
    try {
      const nextVal = !currentIsJudge;
      await updateUserJudgeStatus(uid, nextVal, undefined, targetUser?.email);
      setUsers(prev => prev.map(u => (u.uid === uid || (u.email && targetUser?.email && u.email.toLowerCase() === targetUser.email.toLowerCase())) ? { ...u, isJudge: nextVal } : u));
    } catch (err) {
      console.error("Erro ao atualizar status de magistrado:", err);
      alert("Erro ao atualizar identificação do magistrado.");
    } finally {
      setSaving(null);
    }
  };

  const handleSaveBroadcast = async (activate: boolean) => {
    setIsSavingBroadcast(true);
    try {
      const now = Date.now();
      const messageClean = broadcastMessage.trim();
      const payload: SystemBroadcast = {
        message: messageClean,
        type: broadcastType,
        active: activate,
        createdAt: now,
      };

      // 1. If activating/transmitting broadcast, execute automatic snapshot of all cabinet data
      if (activate && messageClean) {
        try {
          const snapshot = await createCabinetBackupSnapshot("broadcast", {
            message: messageClean,
            type: broadcastType,
          });
          if (snapshot) {
            setLatestCreatedBackup(snapshot);
            setBackups(prev => [snapshot, ...prev]);
          }
        } catch (backupErr) {
          console.warn("Falha silenciosa no snapshot automático (continuando transmissão):", backupErr);
        }
      }

      await saveSystemBroadcastToDb(payload);
      setIsBroadcastActive(activate);
      setBroadcastSuccess(
        activate 
          ? "Aviso transmitido aos usuários e Backup Automático do Gabinete gerado com sucesso no Banco de Dados!" 
          : "Aviso desativado."
      );
      setTimeout(() => setBroadcastSuccess(null), 6000);
    } catch (err) {
      console.error("Erro ao salvar comunicado:", err);
      alert("Erro ao salvar comunicado.");
    } finally {
      setIsSavingBroadcast(false);
    }
  };

  const handleManualBackup = async () => {
    setLoadingBackups(true);
    setBackupActionFeedback(null);
    try {
      const snapshot = await createCabinetBackupSnapshot("manual");
      if (snapshot) {
        setLatestCreatedBackup(snapshot);
        setBackups(prev => [snapshot, ...prev]);
        setBackupActionFeedback({
          type: "success",
          message: "Snapshot manual do gabinete salvo com sucesso no Firestore!"
        });
      }
    } catch (err: any) {
      setBackupActionFeedback({
        type: "error",
        message: "Erro ao gerar backup manual: " + (err?.message || "Desconhecido")
      });
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleDownloadBackup = async (backup: CabinetBackupSnapshot) => {
    try {
      const fullBackup = (await fetchFullCabinetBackupSnapshot(backup)) || backup;
      const dateStr = new Date(backup.timestamp).toISOString().replace(/[:.]/g, "-");
      const filename = `backup_gabinete_${backup.tenantId}_${dateStr}.json`;
      const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erro ao baixar arquivo de backup.");
    }
  };

  const confirmRestoreBackup = async () => {
    if (!backupToRestore) return;
    const backup = backupToRestore;
    setBackupToRestore(null);
    const formattedDate = new Date(backup.timestamp).toLocaleString("pt-BR");
    setIsRestoringBackupId(backup.id);
    setBackupActionFeedback(null);
    try {
      const summary = await restoreCabinetBackupSnapshot(backup);
      setBackupActionFeedback({
        type: "success",
        message: `Ponto de backup de ${formattedDate} restaurado com sucesso! (${summary.restoredTeses} Teses, ${summary.restoredParadigms} Paradigmas, ${summary.restoredPrompts} Prompts, ${summary.restoredProjudi} PROJUDI e ${summary.restoredUnits} Lotações sincronizados no banco e na interface).`
      });
    } catch (err: any) {
      console.error("Erro ao restaurar backup:", err);
      setBackupActionFeedback({
        type: "error",
        message: "Erro ao restaurar dados: " + (err?.message || "Falha desconhecida")
      });
    } finally {
      setIsRestoringBackupId(null);
    }
  };

  const handleRestoreBackup = (backup: CabinetBackupSnapshot) => {
    setBackupToRestore(backup);
  };

  const confirmDeleteBackup = async () => {
    if (!backupToDelete) return;
    const backup = backupToDelete;
    setBackupToDelete(null);
    const formattedDate = new Date(backup.timestamp).toLocaleString("pt-BR");
    setIsDeletingBackupId(backup.id);
    setBackupActionFeedback(null);
    try {
      await deleteCabinetBackupSnapshot(backup.id);
      setBackups(prev => prev.filter(b => b.id !== backup.id));
      setBackupActionFeedback({
        type: "success",
        message: `Ponto de backup de ${formattedDate} foi excluído permanentemente.`
      });
    } catch (err: any) {
      console.error("Erro ao excluir backup:", err);
      setBackupActionFeedback({
        type: "error",
        message: "Erro ao excluir backup: " + (err?.message || "Falha desconhecida")
      });
    } finally {
      setIsDeletingBackupId(null);
    }
  };

  const handleDeleteBackup = (backup: CabinetBackupSnapshot) => {
    setBackupToDelete(backup);
  };



  const setUpdatePreset = () => {
    setBroadcastMessage("📢 Atenção Gabinete: O sistema está sendo republicado com novas melhorias em 2 minutos. Todo o seu trabalho e minutas em andamento estão salvos automaticamente.");
    setBroadcastType("update");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col h-[98vh] sm:h-auto max-h-[98vh] sm:max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-slate-800 dark:text-white">Administração do Gabinete</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Controle de acessos, convites de assessores, comunicados e permissões</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-white dark:bg-slate-800 rounded-full transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900 px-3 sm:px-5 pt-2 gap-2 overflow-x-auto scrollbar-none whitespace-nowrap shrink-0">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 flex items-center gap-2 ${
              activeTab === "users"
                ? "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-600"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Membros da Equipe ({users.length + pendingInvites.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("broadcast")}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 flex items-center gap-2 ${
              activeTab === "broadcast"
                ? "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-600"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent"
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Avisos & Alerta de Atualização</span>
            {isBroadcastActive && (
              <span className="w-2 h-2 rounded-full bg-slate-800 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => { setActiveTab("backups"); loadBackups(); }}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 flex items-center gap-2 ${
              activeTab === "backups"
                ? "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-600"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Snapshots & Backups ({backups.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {broadcastSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{broadcastSuccess}</span>
            </div>
          )}

          {backupActionFeedback && (
            <div className={`mb-4 p-3 border text-xs rounded-xl flex items-center gap-2 ${
              backupActionFeedback.type === 'success'
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            }`}>
              {backupActionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{backupActionFeedback.message}</span>
            </div>
          )}


          {activeTab === "users" && (
            <div className="space-y-4">
              {/* Formulário de Convidar / Vincular Novo Membro */}
              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/60 dark:bg-purple-950/30">
                <div className="flex items-center gap-2 mb-1.5 text-purple-950 dark:text-purple-200 font-bold text-sm">
                  <UserPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Convidar ou Liberar Novo Membro da Equipe</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                  Digite o e-mail do assessor, estagiário ou juiz (<strong>Obrigatório: @gmail.com</strong>). Se ele já possuir conta no sistema, será <strong>vinculado imediatamente</strong> a este gabinete; caso contrário, terá o acesso liberado assim que fizer login via Google com este e-mail.
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
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm shrink-0 cursor-pointer"
                  >
                    {inviting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Vinculando...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Liberar / Convidar</span>
                      </>
                    )}
                  </button>
                </form>

                {inviteFeedback && (
                  <div className={`mt-2.5 p-3 rounded-xl text-xs space-y-2.5 ${
                    inviteFeedback.type === 'success' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {inviteFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span className="font-semibold">{inviteFeedback.message}</span>
                    </div>

                    {inviteFeedback.type === 'success' && lastInvitedEmail && (
                      <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1">
                          <SendHorizontal className="w-3.5 h-3.5" />
                          <span>Notificar o Convidado:</span>
                        </span>

                        <a
                          href={getGmailWebUrl(lastInvitedEmail)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-800 dark:text-slate-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[11px] font-bold inline-flex items-center gap-1.5 transition shadow-xs"
                        >
                          <Mail className="w-3 h-3 text-red-500" />
                          <span>Abrir no Gmail</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                        </a>

                        <a
                          href={getMailtoUrl(lastInvitedEmail)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-800 dark:text-slate-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[11px] font-bold inline-flex items-center gap-1.5 transition shadow-xs"
                        >
                          <Send className="w-3 h-3 text-blue-500" />
                          <span>Meu Cliente de E-mail (Outlook/Thunderbird)</span>
                        </a>

                        <a
                          href={getWhatsAppUrl(lastInvitedEmail)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-800 dark:text-slate-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[11px] font-bold inline-flex items-center gap-1.5 transition shadow-xs"
                        >
                          <Share2 className="w-3 h-3 text-emerald-600" />
                          <span>Enviar WhatsApp</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleCopyInvite(lastInvitedEmail)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-800 dark:text-slate-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[11px] font-bold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          {copiedEmail === lastInvitedEmail ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 dark:text-emerald-300">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-purple-600" />
                              <span>Copiar Texto Pronto</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1">
                    <div className="flex items-center gap-2">
                      <span>Membros vinculados a este gabinete judicial:</span>
                      <button 
                        onClick={loadUsers} 
                        className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        title="Atualizar lista"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Atualizar</span>
                      </button>
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {users.length} {users.length === 1 ? 'membro ativo' : 'membros ativos'}
                      {pendingInvites.length > 0 && ` (+${pendingInvites.length} ${pendingInvites.length === 1 ? 'convite pendente' : 'convites pendentes'})`}
                    </span>
                  </div>

                  {paginatedUsers.map(u => {
                    const isSelf = u.uid === userProfile?.uid;
                    const isActive = u.isActive !== false;

                    return (
                      <div 
                        key={u.uid} 
                        className={`flex flex-col items-start justify-between p-4 rounded-xl border transition ${
                          !isActive
                            ? "bg-slate-100/80 dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 opacity-75"
                            : u.isJudge
                              ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-700/60 shadow-xs"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              !isActive
                                ? "bg-slate-300 dark:bg-slate-800 text-slate-500"
                                : u.isJudge
                                  ? "bg-amber-500 text-slate-950 ring-2 ring-amber-300 dark:ring-amber-600"
                                  : "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                            }`}>
                              {u.isJudge ? <Scale className="w-5 h-5" /> : <User className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{u.name}</p>
                                
                                {isSelf && (
                                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-300 dark:border-purple-800">
                                    Você
                                  </span>
                                )}

                                {u.isJudge && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-200/90 dark:bg-amber-900/60 border border-amber-400 dark:border-amber-600 text-slate-950 dark:text-amber-200 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                    <Scale className="w-3 h-3 text-slate-950 dark:text-amber-300" />
                                    <span>Juiz(a) do Gabinete</span>
                                  </span>
                                )}

                                {!isActive ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                                    <UserX className="w-3 h-3" />
                                    <span>Acesso Desativado</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                                    <UserCheck className="w-3 h-3" />
                                    <span>Ativo</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 break-all">{u.email}</p>
                            </div>
                          </div>
                          
                          {/* Ações Rápidas: Ativar/Desativar, Juiz, Perfil e Remover */}
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                            {/* Botão de Marcador do Juiz / Magistrado para o ADM */}
                            <button
                              type="button"
                              disabled={saving === u.uid || !isActive}
                              onClick={() => handleToggleJudge(u.uid, Boolean(u.isJudge))}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-2xs ${
                                u.isJudge
                                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 font-black"
                                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-amber-50 dark:hover:bg-slate-800"
                              } disabled:opacity-40`}
                              title={
                                u.isJudge
                                  ? "Usuário identificado como o Juiz / Magistrado do Gabinete. Clique para desmarcar."
                                  : "Clique para marcar este usuário como o Juiz / Magistrado do Gabinete"
                              }
                            >
                              <Scale className={`w-3.5 h-3.5 ${u.isJudge ? "text-slate-950" : "text-amber-600"}`} />
                              <span>{u.isJudge ? "Juiz Ativo" : "Marcar como Juiz"}</span>
                            </button>

                            {/* Seletor de Papel (Usuário vs Administrador) */}
                            <select
                              value={u.role}
                              disabled={saving === u.uid || isSelf || !isActive}
                              onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs rounded-lg p-2 disabled:opacity-50 font-semibold cursor-pointer"
                            >
                              <option value="user">Usuário (Padrão)</option>
                              <option value="admin">Administrador</option>
                            </select>

                            {/* Botão de Ativar / Desativar Usuário */}
                            {!isSelf && (
                              <button
                                type="button"
                                disabled={saving === u.uid}
                                onClick={() => handleToggleActive(u.uid, isActive, u.email)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-2xs ${
                                  isActive
                                    ? "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700"
                                    : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                                }`}
                                title={isActive ? "Clique para desativar e bloquear o acesso deste usuário" : "Clique para reativar o acesso deste usuário"}
                              >
                                {isActive ? (
                                  <>
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>Desativar</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Ativar</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Botão de Remover / Desvincular do Gabinete */}
                            {!isSelf && (
                              userToDelete === u.uid ? (
                                <div className="flex items-center gap-1.5 ml-2">
                                  <span className="text-[10px] text-rose-500 font-medium">Desvincular?</span>
                                  <button
                                    type="button"
                                    disabled={saving === u.uid}
                                    onClick={() => handleRemoveUser(u.uid, u.email, u.name)}
                                    className="px-2 py-1 rounded text-white bg-rose-500 hover:bg-rose-600 transition text-[10px] font-bold"
                                  >
                                    Sim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setUserToDelete(null)}
                                    className="px-2 py-1 rounded text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition text-[10px] font-bold"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={saving === u.uid}
                                  onClick={() => setUserToDelete(u.uid)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition border border-transparent hover:border-rose-300 dark:hover:border-rose-800"
                                  title="Desvincular e remover do gabinete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {(u.customApiKey && u.customApiKey.trim().length > 10) || (u.customApiKeys && u.customApiKeys.length > 0) ? (
                          <div className="w-full mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <div className="flex items-center gap-1 text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Chave Própria Configurada (Privada do Usuário)</span>
                            </div>
                          </div>
                        ) : null}

                        {/* Units Assignment section */}
                        <div className="w-full mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2 block uppercase tracking-wider">
                            Unidades Liberadas
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {allowedUnits.map(unit => {
                              const isAllowed = u.allowedUnits ? u.allowedUnits.includes(unit.id) : true;
                              return (
                                <label key={unit.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border cursor-pointer transition-colors ${isAllowed ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 font-medium' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'} ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>
                                  <input 
                                    type="checkbox"
                                    className="hidden"
                                    checked={isAllowed}
                                    disabled={saving === u.uid || !isActive}
                                    onChange={(e) => {
                                      let newUnits = u.allowedUnits ? [...u.allowedUnits] : allowedUnits.map(au => au.id);
                                      if (e.target.checked) {
                                        if (!newUnits.includes(unit.id)) newUnits.push(unit.id);
                                      } else {
                                        newUnits = newUnits.filter(id => id !== unit.id);
                                      }
                                      handleUnitsChange(u.uid, newUnits);
                                    }}
                                  />
                                  {isAllowed && <CheckCircle2 className="w-3 h-3 text-purple-600" />}
                                  <span>{unit.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {pendingInvites.map(inv => (
                    <div key={inv.email} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 transition hover:bg-purple-50/70 dark:hover:bg-purple-950/40 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Convite Registrado</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                              <Bell className="w-3 h-3" />
                              <span>Aguardando 1º Login</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-0.5">{inv.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <a
                          href={getGmailWebUrl(inv.email)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs"
                          title="Abrir no Gmail Web com mensagem pronta"
                        >
                          <Mail className="w-3.5 h-3.5 text-red-500" />
                          <span>Gmail</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                        </a>

                        <a
                          href={getMailtoUrl(inv.email)}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs"
                          title="Enviar pelo seu programa de e-mail padrão (Outlook, Thunderbird, Mail)"
                        >
                          <Send className="w-3.5 h-3.5 text-blue-500" />
                          <span>E-mail</span>
                        </a>

                        <a
                          href={getWhatsAppUrl(inv.email)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs"
                          title="Enviar convite via WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleCopyInvite(inv.email)}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                          title="Copiar texto explicativo com link de acesso"
                        >
                          {copiedEmail === inv.email ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 dark:text-emerald-300">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-purple-600" />
                              <span>Copiar Texto</span>
                            </>
                          )}
                        </button>

                        {inviteToDelete === inv.email ? (
                          <div className="flex items-center gap-1.5 ml-1">
                            <span className="text-[10px] text-rose-500 font-medium">Revogar?</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveInvite(inv.email)}
                              className="px-2.5 py-1.5 rounded-lg text-white bg-rose-500 hover:bg-rose-600 transition flex items-center gap-1 text-xs font-bold"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setInviteToDelete(null)}
                              className="px-2.5 py-1.5 rounded-lg text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center gap-1 text-xs font-bold"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setInviteToDelete(inv.email)}
                            className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:text-white border border-rose-200 hover:border-transparent hover:bg-rose-500 dark:border-rose-900/50 transition flex items-center gap-1.5 text-xs font-bold ml-1 cursor-pointer"
                            title="Revogar convite e bloquear acesso deste e-mail"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revogar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {users.length > usersPerPage && (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs">
                      <span className="text-slate-500 text-[11px] sm:text-xs">
                        Mostrando <span className="font-bold text-slate-700 dark:text-slate-300">{(userPage - 1) * usersPerPage + 1}</span> a <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(userPage * usersPerPage, users.length)}</span> de <span className="font-bold text-slate-700 dark:text-slate-300">{users.length}</span> membros
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={userPage <= 1}
                          onClick={() => setUserPage(p => Math.max(p - 1, 1))}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Página Anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2 font-bold text-xs text-slate-700 dark:text-slate-300">
                          {userPage} / {totalUserPages}
                        </span>
                        <button
                          type="button"
                          disabled={userPage >= totalUserPages}
                          onClick={() => setUserPage(p => Math.min(p + 1, totalUserPages))}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Próxima Página"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {users.length === 0 && pendingInvites.length === 0 && (
                    <p className="text-center text-slate-500 py-10">Nenhum usuário encontrado.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "broadcast" && (
            <div className="space-y-4">
              <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-xl">
                <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-bold text-sm mb-1">
                  <Megaphone className="w-4 h-4 text-purple-600" />
                  <span>Transmitir Comunicado / Alerta de Republicação</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Envie uma mensagem instantânea em tempo real para todos os assessores conectados. O banner aparecerá no topo da tela de todos os usuários imediatamente.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mensagem do Comunicado
                  </label>
                  <button
                    onClick={setUpdatePreset}
                    className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 font-semibold hover:underline"
                  >
                    Usar modelo de "Republicação do Sistema"
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Ex: Atenção equipe: Nova versão sendo implantada. Seus rascunhos estão salvos automaticamente."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Tipo do Alerta
                    </label>
                    <select
                      value={broadcastType}
                      onChange={(e) => setBroadcastType(e.target.value as any)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                    >
                      <option value="update">🚀 Atualização de Versão / Republicação</option>
                      <option value="warning">⚠️ Aviso Importante</option>
                      <option value="info">ℹ️ Comunicado do Gabinete</option>
                      <option value="maintenance">🔧 Manutenção Programada</option>
                    </select>
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => handleSaveBroadcast(true)}
                      disabled={isSavingBroadcast || !broadcastMessage.trim()}
                      className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isBroadcastActive ? "Atualizar Alerta Ativo" : "Transmitir Alerta"}</span>
                    </button>

                    {isBroadcastActive && (
                      <button
                        onClick={() => handleSaveBroadcast(false)}
                        disabled={isSavingBroadcast}
                        className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition"
                        title="Desativar banner para os usuários"
                      >
                        Encerrar
                      </button>
                    )}
                  </div>
                </div>

                {isBroadcastActive && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>O banner de comunicado está <strong>ATIVO</strong> e visível para todos os usuários agora.</span>
                  </div>
                )}

                {/* Auto Backup Info Card */}
                <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-start gap-3">
                  <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-emerald-900 dark:text-emerald-200">
                      Backup Automático de Segurança Integrado
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      Sempre que você clica em <strong>Transmitir Alerta</strong>, o sistema executa um <strong>snapshot automático integral</strong> de todas as Teses, Guias PROJUDI, Minutas Paradigmas, Prompts, Lotações e Calendário do Gabinete e salva com data/hora no Firestore.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "backups" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm">
                    <History className="w-4 h-4 text-purple-600" />
                    <span>Histórico de Snapshots & Backups do Gabinete</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Backups gerados automaticamente nas transmissões de alerta de republicação ou manualmente.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={loadBackups}
                    disabled={loadingBackups}
                    className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg text-slate-600 dark:text-slate-300 transition"
                    title="Atualizar lista"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={handleManualBackup}
                    disabled={loadingBackups}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Criar Snapshot Manual Agora</span>
                  </button>
                </div>
              </div>

              {loadingBackups ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="text-xs">Carregando snapshots salvos...</span>
                </div>
              ) : backups.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                  <Database className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nenhum snapshot registrado ainda</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Transmita um comunicado aos usuários ou clique em "Criar Snapshot Manual Agora" para gerar o primeiro ponto de restauração.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedBackups.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-purple-300 dark:hover:border-purple-800 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            b.triggeredBy === 'broadcast'
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          }`}>
                            {b.triggeredBy === 'broadcast' ? '📡 Auto: Alerta de Republicação' : '💾 Manual'}
                          </span>

                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {new Date(b.timestamp).toLocaleString("pt-BR")}
                          </span>

                          <span className="text-[11px] text-slate-500 dark:text-slate-400 break-all">
                            por {b.authorName} ({b.authorEmail})
                          </span>
                        </div>

                        {b.broadcastMessage && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-1">
                            "{b.broadcastMessage}"
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            ⚖️ {b.summary?.tesesCount || 0} Teses
                          </span>
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            📘 {b.summary?.projudiGuideCount || 0} PROJUDI
                          </span>
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            ⚡ {b.summary?.paradigmsCount || 0} Paradigmas
                          </span>
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            ✨ {b.summary?.promptsCount || 0} Prompts
                          </span>
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            🏛️ {b.summary?.unitsCount || 0} Lotações
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
                        <button
                          onClick={() => handleDownloadBackup(b)}
                          className="flex-1 sm:flex-none px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Exportar JSON para máquina local"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar JSON</span>
                        </button>

                        <button
                          onClick={() => handleRestoreBackup(b)}
                          disabled={isRestoringBackupId === b.id || isDeletingBackupId === b.id}
                          className="flex-1 sm:flex-none px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          title="Restaurar este ponto no banco de dados"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${isRestoringBackupId === b.id ? 'animate-spin' : ''}`} />
                          <span>{isRestoringBackupId === b.id ? 'Restaurando...' : 'Aplicar'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteBackup(b)}
                          disabled={isDeletingBackupId === b.id || isRestoringBackupId === b.id}
                          className="p-1.5 border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 disabled:opacity-50 rounded-lg transition flex items-center justify-center cursor-pointer"
                          title="Descartar / Excluir permanentemente este backup"
                        >
                          {isDeletingBackupId === b.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}

                  {backups.length > backupsPerPage && (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs mt-3">
                      <span className="text-slate-500 text-[11px] sm:text-xs">
                        Mostrando <span className="font-bold text-slate-700 dark:text-slate-300">{(backupPage - 1) * backupsPerPage + 1}</span> a <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(backupPage * backupsPerPage, backups.length)}</span> de <span className="font-bold text-slate-700 dark:text-slate-300">{backups.length}</span> snapshots
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={backupPage <= 1}
                          onClick={() => setBackupPage(p => Math.max(p - 1, 1))}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Página Anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2 font-bold text-xs text-slate-700 dark:text-slate-300">
                          {backupPage} / {totalBackupPages}
                        </span>
                        <button
                          type="button"
                          disabled={backupPage >= totalBackupPages}
                          onClick={() => setBackupPage(p => Math.min(p + 1, totalBackupPages))}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Próxima Página"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toggle Access Confirmation Modal */}
      {userToToggleAccess && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${!userToToggleAccess.currentIsActive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {!userToToggleAccess.currentIsActive ? 'Ativar Acesso' : 'Desativar Acesso'}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Deseja realmente {!userToToggleAccess.currentIsActive ? 'ATIVAR' : 'DESATIVAR'} o acesso de <strong>{userToToggleAccess.userEmail}</strong> a este gabinete?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setUserToToggleAccess(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmToggleActive}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg transition cursor-pointer shadow-sm ${!userToToggleAccess.currentIsActive ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-200'}`}
              >
                {!userToToggleAccess.currentIsActive ? 'Sim, Ativar' : 'Sim, Desativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Confirmation Modal */}
      {backupToRestore && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Restaurar Backup</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Tem certeza que deseja RESTAURAR este ponto de backup de <strong>{new Date(backupToRestore.timestamp).toLocaleString("pt-BR")}</strong>?
                </p>
                <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                  <p className="text-[10px] text-slate-500 flex justify-between"><span>Teses em comarcas:</span> <strong>{backupToRestore.summary.tesesCount}</strong></p>
                  <p className="text-[10px] text-slate-500 flex justify-between"><span>Guias do PROJUDI:</span> <strong>{backupToRestore.summary.projudiGuideCount}</strong></p>
                  <p className="text-[10px] text-slate-500 flex justify-between"><span>Modelos paradigmas:</span> <strong>{backupToRestore.summary.paradigmsCount}</strong></p>
                  <p className="text-[10px] text-slate-500 flex justify-between"><span>Prompts personalizados:</span> <strong>{backupToRestore.summary.promptsCount}</strong></p>
                  <p className="text-[10px] text-slate-500 flex justify-between"><span>Lotações / Varas:</span> <strong>{backupToRestore.summary.unitsCount}</strong></p>
                </div>
                <p className="text-[10px] text-amber-600 mt-2 font-medium">Nenhum dado externo será apagado. Deseja prosseguir?</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setBackupToRestore(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmRestoreBackup}
                className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition cursor-pointer shadow-sm shadow-amber-200"
              >
                Restaurar Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Backup Confirmation Modal */}
      {backupToDelete && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Descartar Backup</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Tem certeza que deseja DESCARTAR / EXCLUIR permanentemente este ponto de backup de <strong>{new Date(backupToDelete.timestamp).toLocaleString("pt-BR")}</strong>?
                </p>
                <p className="text-[10px] text-rose-600 mt-2 font-bold">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setBackupToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteBackup}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition cursor-pointer shadow-sm shadow-rose-200"
              >
                Excluir Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


