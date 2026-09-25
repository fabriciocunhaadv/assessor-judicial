import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Plus,
  Search,
  Filter,
  Clock,
  Hammer,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  Sparkles,
  AlertTriangle,
  FileText,
  Building2,
  User,
  ShieldCheck,
  Tag,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  Layers,
  HelpCircle,
  ThumbsUp,
  FolderOpen,
  Power,
  RotateCcw,
  Check,
  Crown,
  Trash2,
  Lock,
  Globe
} from "lucide-react";
import { 
  SupportTicket, 
  TicketStatus, 
  TicketType, 
  TicketPriority, 
  TicketMessage,
  TicketStatusHistoryItem
} from "../types";
import { 
  createTicket, 
  updateTicketStatus, 
  addTicketMessage, 
  deleteTicket, 
  exportTicketsJson, 
  isTicketModuleEnabled, 
  setTicketModuleEnabled,
  markTicketAsRead
} from "../utils/ticketsDb";
import { useAuth } from "../lib/AuthContext";
import { toast } from "react-hot-toast";

interface SupportTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: SupportTicket[];
  initialSelectedTicketId?: string | null;
}

export const SupportTicketsModal: React.FC<SupportTicketsModalProps> = ({
  isOpen,
  onClose,
  tickets,
  initialSelectedTicketId,
}) => {
  const { user, userProfile, isSuperAdmin, isAdmin, isJudge, activeTenantId, tenantName, activeUnit } = useAuth();

  // Navigation / View state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialSelectedTicketId || null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [activeTab, setActiveTab] = useState<"todos" | "aguardando" | "em_construcao" | "concluido" | "nao_provido">("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<"all_cabinet" | "my_tickets" | "global_saas">("all_cabinet");
  const [ticketsPage, setTicketsPage] = useState(1);
  const ticketsPerPage = 6;

  // Module enabled flag
  const [moduleEnabled, setModuleEnabled] = useState<boolean>(() => isTicketModuleEnabled());

  // Form State for New Ticket
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<TicketType>("melhoria_sugestao");
  const [newPriority, setNewPriority] = useState<TicketPriority>("media");
  const [newModule, setNewModule] = useState("Minutas & IA");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply state
  const [replyContent, setReplyContent] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Super Admin / Management Decision Form State
  const [decisionStatus, setDecisionStatus] = useState<TicketStatus>("em_analise");
  const [decisionComment, setDecisionComment] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<SupportTicket>>>({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (initialSelectedTicketId) {
      setSelectedTicketId(initialSelectedTicketId);
    }
  }, [initialSelectedTicketId]);

  const currentUid = userProfile?.uid || user?.uid;
  const currentEmail = userProfile?.email || user?.email;
  const isRegularAssessor = !isSuperAdmin && !isAdmin && !isJudge;

  // Merge tickets with local optimistic overrides
  const effectiveTickets = useMemo(() => {
    return tickets.map((t) => {
      const override = localOverrides[t.id];
      if (override) {
        return { ...t, ...override };
      }
      return t;
    });
  }, [tickets, localOverrides]);

  // Tickets available according to role and active scope
  const scopedTickets = useMemo(() => {
    return effectiveTickets.filter((ticket) => {
      const isOwner =
        (Boolean(currentUid) && ticket.createdByUid === currentUid) ||
        (Boolean(currentEmail) && ticket.createdByEmail?.toLowerCase() === currentEmail?.toLowerCase());

      if (isRegularAssessor) {
        // Standard assessor can ONLY view their own tickets
        return isOwner;
      }

      if (isAdmin || isJudge) {
        if (scopeFilter === "my_tickets") {
          return isOwner;
        }
        // Otherwise all tickets from this cabinet
        return !ticket.tenantId || ticket.tenantId === activeTenantId;
      }

      if (isSuperAdmin) {
        if (scopeFilter === "my_tickets") {
          return isOwner;
        }
        if (scopeFilter === "all_cabinet") {
          return !ticket.tenantId || ticket.tenantId === activeTenantId;
        }
        return true; // global SaaS
      }

      return isOwner;
    });
  }, [effectiveTickets, currentUid, currentEmail, isRegularAssessor, isAdmin, isJudge, isSuperAdmin, scopeFilter, activeTenantId]);

  const currentTicket = scopedTickets.find((t) => t.id === selectedTicketId) || null;

  // Sync decision status with current ticket
  useEffect(() => {
    if (currentTicket) {
      setDecisionStatus(currentTicket.status);
    }
  }, [currentTicket?.id, currentTicket?.status]);

  // Mark ticket as read when viewed in modal
  useEffect(() => {
    if (isOpen && selectedTicketId && currentTicket) {
      markTicketAsRead(
        selectedTicketId,
        Boolean(isSuperAdmin),
        currentTicket.tenantId,
        currentUid
      ).catch(() => {});
    }
  }, [isOpen, selectedTicketId, isSuperAdmin, currentUid, currentTicket?.tenantId]);

  // Early return if not open - AFTER ALL HOOKS
  if (!isOpen) return null;

  // Filtered tickets list
  const filteredTickets = scopedTickets.filter((ticket) => {
    // Status tab filter
    if (activeTab === "aguardando" && ticket.status !== "aguardando") return false;
    if (activeTab === "em_construcao" && ticket.status !== "em_construcao" && ticket.status !== "em_analise") return false;
    if (activeTab === "concluido" && ticket.status !== "concluido") return false;
    if (activeTab === "nao_provido" && ticket.status !== "nao_provido") return false;

    // Type filter
    if (typeFilter !== "all" && ticket.type !== typeFilter) return false;

    // Priority filter
    if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ticket.title.toLowerCase().includes(q);
      const matchDesc = ticket.description.toLowerCase().includes(q);
      const matchCreator = ticket.createdByName?.toLowerCase().includes(q);
      const matchTenant = ticket.tenantName?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCreator && !matchTenant) return false;
    }

    return true;
  });

  // Metrics
  const metrics = {
    total: scopedTickets.length,
    aguardando: scopedTickets.filter((t) => t.status === "aguardando").length,
    emConstrucao: scopedTickets.filter((t) => t.status === "em_construcao" || t.status === "em_analise").length,
    concluido: scopedTickets.filter((t) => t.status === "concluido").length,
    naoProvido: scopedTickets.filter((t) => t.status === "nao_provido").length,
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      toast.error("Por favor, preencha o título e a descrição do chamado.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newTicket: SupportTicket = {
        id: ticketId,
        tenantId: activeTenantId || "gabinete_default",
        tenantName: tenantName || "Gabinete Principal",
        unitId: activeUnit?.id || "default",
        unitName: activeUnit?.name || "Lotação Ativa",
        title: newTitle.trim(),
        description: newDescription.trim(),
        type: newType,
        priority: newPriority,
        status: "aguardando",
        systemModule: newModule,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdByUid: userProfile?.uid || user?.uid || "anon",
        createdByName: userProfile?.name || user?.displayName || "Usuário",
        createdByEmail: user?.email || "",
        createdByRole: isJudge ? "Magistrado" : isSuperAdmin ? "Super ADM" : isAdmin ? "Administrador" : "Assessor",
        messages: [],
        statusHistory: [
          {
            status: "aguardando",
            changedBy: userProfile?.uid || "anon",
            changedByName: userProfile?.name || "Usuário",
            changedAt: Date.now(),
            comment: "Chamado aberto na Central de Solicitações.",
          },
        ],
        isReadByTenant: true,
        isReadBySuperAdmin: false,
      };

      await createTicket(newTicket);
      setLocalOverrides((prev) => ({
        ...prev,
        [ticketId]: newTicket,
      }));
      toast.success("Chamado registrado com sucesso! A equipe de desenvolvimento foi notificada.");
      setNewTitle("");
      setNewDescription("");
      setIsCreatingTicket(false);
      setSelectedTicketId(ticketId);
    } catch (err: any) {
      toast.error("Erro ao registrar chamado: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicketId || !replyContent.trim()) return;

    setIsSendingReply(true);
    try {
      const message: TicketMessage = {
        id: `msg_${Date.now()}`,
        authorUid: userProfile?.uid || user?.uid || "anon",
        authorName: userProfile?.name || user?.displayName || "Usuário",
        authorEmail: user?.email || "",
        authorRole: isSuperAdmin ? "Engenharia / Super Admin" : isJudge ? "Magistrado" : isAdmin ? "Administrador" : "Assessor",
        content: replyContent.trim(),
        createdAt: Date.now(),
        isSuperAdminReply: !!isSuperAdmin,
      };

      // Optimistically update messages
      setLocalOverrides((prev) => {
        const existingMessages = currentTicket?.messages || [];
        return {
          ...prev,
          [selectedTicketId]: {
            ...(prev[selectedTicketId] || {}),
            messages: [...existingMessages, message],
            updatedAt: Date.now(),
          },
        };
      });

      await addTicketMessage(selectedTicketId, message, !!isSuperAdmin, currentTicket?.tenantId);
      setReplyContent("");
      toast.success("Mensagem enviada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar mensagem: " + err.message);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleApplyStatusChange = async (targetStatus?: TicketStatus) => {
    if (!selectedTicketId) return;
    const finalStatus = targetStatus || decisionStatus;

    setIsUpdatingStatus(true);
    try {
      const historyItem: TicketStatusHistoryItem = {
        status: finalStatus,
        changedBy: userProfile?.uid || "admin",
        changedByName: userProfile?.name || (isJudge ? "Magistrado" : isSuperAdmin ? "Super ADM" : "Administrador"),
        changedAt: Date.now(),
        comment: decisionComment.trim() || undefined,
      };

      // Optimistic override for instant UI update
      setLocalOverrides((prev) => {
        const existingHistory = currentTicket?.statusHistory || [];
        return {
          ...prev,
          [selectedTicketId]: {
            ...(prev[selectedTicketId] || {}),
            status: finalStatus,
            statusHistory: [...existingHistory, historyItem],
            resolutionFeedback: decisionComment.trim() || currentTicket?.resolutionFeedback,
            updatedAt: Date.now(),
          },
        };
      });

      await updateTicketStatus(
        selectedTicketId,
        finalStatus,
        userProfile,
        decisionComment.trim() || undefined,
        currentTicket?.tenantId
      );
      setDecisionStatus(finalStatus);
      toast.success(`Situação do chamado alterada para: ${getStatusBadge(finalStatus).label}`);
      setDecisionComment("");
    } catch (err: any) {
      toast.error("Erro ao atualizar status: " + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleToggleModule = (checked: boolean) => {
    setModuleEnabled(checked);
    setTicketModuleEnabled(checked);
    toast.success(checked ? "Módulo Central de Chamados ATIVADO." : "Módulo Central de Chamados DESATIVADO.");
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await deleteTicket(ticketId, activeTenantId, currentUid, Boolean(isSuperAdmin));
      toast.success("Chamado excluído com sucesso.");
      if (selectedTicketId === ticketId) {
        setSelectedTicketId(null);
      }
      setIsConfirmingDelete(false);
    } catch (err: any) {
      toast.error("Erro ao excluir chamado: " + err.message);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case "aguardando":
        return {
          label: "Aguardando",
          color: "bg-amber-500/20 border-amber-500/50 text-amber-300",
          icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
        };
      case "em_analise":
        return {
          label: "Em Análise",
          color: "bg-blue-500/20 border-blue-500/50 text-blue-300",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-blue-400" />,
        };
      case "em_construcao":
        return {
          label: "Em Construção",
          color: "bg-purple-500/20 border-purple-500/50 text-purple-300",
          icon: <Hammer className="w-3.5 h-3.5 text-purple-400" />,
        };
      case "concluido":
        return {
          label: "Solucionado / Provido",
          color: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case "nao_provido":
        return {
          label: "Não Provido / Indeferido",
          color: "bg-rose-500/20 border-rose-500/50 text-rose-300",
          icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
        };
      default:
        return {
          label: "Arquivado",
          color: "bg-slate-500/20 border-slate-500/50 text-slate-300",
          icon: <FolderOpen className="w-3.5 h-3.5 text-slate-400" />,
        };
    }
  };

  const getTypeBadge = (type: TicketType) => {
    switch (type) {
      case "melhoria_sugestao":
        return { label: "Melhoria / Sugestão", color: "text-purple-400 bg-purple-950/60 border-purple-800/60" };
      case "reporte_erro":
        return { label: "Reporte de Erro", color: "text-rose-400 bg-rose-950/60 border-rose-800/60" };
      case "ajuste_tese_prompt":
        return { label: "Nova Tese / Prompt", color: "text-amber-400 bg-amber-950/60 border-amber-800/60" };
      case "duvida_suporte":
        return { label: "Dúvida / Suporte", color: "text-blue-400 bg-blue-950/60 border-blue-800/60" };
      case "elogio_feedback":
        return { label: "Elogio / Feedback", color: "text-emerald-400 bg-emerald-950/60 border-emerald-800/60" };
      default:
        return { label: "Outros", color: "text-slate-400 bg-slate-800 border-slate-700" };
    }
  };

  const isDetailOrCreatingActiveOnMobile = Boolean(selectedTicketId || isCreatingTicket);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-0 sm:p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-0 sm:border border-slate-800 rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-6xl h-full sm:h-[92vh] max-h-[100dvh] sm:max-h-[92vh] flex flex-col overflow-hidden text-slate-200">
        
        {/* Top Header */}
        <div className="p-3 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-bold text-white tracking-wide truncate">
                  Central de Chamados & Feedback
                </h2>
                <span className="hidden xs:inline-block px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono text-[9px] sm:text-[10px] font-bold">
                  SaaS Ticket Engine
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block truncate">
                Canal oficial direto entre os Gabinetes e a Engenharia do Sistema.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Modular toggle */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">Módulo:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={moduleEnabled}
                  onChange={(e) => handleToggleModule(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
              <span className={`text-[10px] font-bold ${moduleEnabled ? "text-emerald-400" : "text-slate-500"}`}>
                {moduleEnabled ? "Ativo" : "Inativo"}
              </span>
            </div>

            <button
              onClick={() => exportTicketsJson(tickets)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
              title="Exportar Backup dos Chamados (JSON)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 sm:p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition cursor-pointer border border-slate-700 hover:border-rose-500/40"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Access Scope & Privacy Banner - Hidden on mobile when viewing details to save vertical space */}
        {isRegularAssessor ? (
          <div className={`px-4 py-2 bg-emerald-950/40 border-b border-emerald-500/30 flex-wrap items-center justify-between gap-2 text-xs text-emerald-300 shrink-0 ${
            isDetailOrCreatingActiveOnMobile ? "hidden md:flex" : "flex"
          }`}>
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                <strong>Acesso Restrito ao Usuário:</strong> Você está visualizando exclusivamente os seus próprios chamados.
              </span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold text-emerald-200">
              {user?.email}
            </span>
          </div>
        ) : (
          <div className={`px-3 sm:px-5 py-2 bg-slate-950/90 border-b border-slate-800 flex-wrap items-center justify-between gap-2 text-xs shrink-0 ${
            isDetailOrCreatingActiveOnMobile ? "hidden md:flex" : "flex"
          }`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 font-semibold text-[11px] mr-1">Visão:</span>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => { setScopeFilter("global_saas"); setSelectedTicketId(null); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    scopeFilter === "global_saas"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Global SaaS</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => { setScopeFilter("all_cabinet"); setSelectedTicketId(null); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  scopeFilter === "all_cabinet"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gabinete ({tenantName || "Ativo"})</span>
              </button>
              <button
                type="button"
                onClick={() => { setScopeFilter("my_tickets"); setSelectedTicketId(null); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  scopeFilter === "my_tickets"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Meus Chamados</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{user?.email}</span>
            </div>
          </div>
        )}

        {/* Dashboard Metrics Strip - Hidden on mobile when viewing details to keep full height */}
        <div className={`overflow-x-auto sm:grid sm:grid-cols-5 gap-2 p-2 sm:px-5 bg-slate-950/60 border-b border-slate-800/80 text-xs shrink-0 no-scrollbar ${
          isDetailOrCreatingActiveOnMobile ? "hidden md:grid" : "flex"
        }`}>
          <button
            onClick={() => { setActiveTab("todos"); setSelectedTicketId(null); setIsCreatingTicket(false); }}
            className={`p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer min-w-[120px] sm:min-w-0 shrink-0 sm:shrink ${
              activeTab === "todos"
                ? "bg-slate-800 border-slate-600 text-white shadow-sm"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Geral</span>
            <span className="text-base sm:text-lg font-black text-white">{metrics.total}</span>
          </button>

          <button
            onClick={() => { setActiveTab("aguardando"); setSelectedTicketId(null); setIsCreatingTicket(false); }}
            className={`p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer min-w-[120px] sm:min-w-0 shrink-0 sm:shrink ${
              activeTab === "aguardando"
                ? "bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-sm"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Aguardando
            </span>
            <span className="text-base sm:text-lg font-black text-amber-300">{metrics.aguardando}</span>
          </button>

          <button
            onClick={() => { setActiveTab("em_construcao"); setSelectedTicketId(null); setIsCreatingTicket(false); }}
            className={`p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer min-w-[130px] sm:min-w-0 shrink-0 sm:shrink ${
              activeTab === "em_construcao"
                ? "bg-purple-950/40 border-purple-500/50 text-purple-200 shadow-sm"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
              <Hammer className="w-3 h-3" /> Em Construção
            </span>
            <span className="text-base sm:text-lg font-black text-purple-300">{metrics.emConstrucao}</span>
          </button>

          <button
            onClick={() => { setActiveTab("concluido"); setSelectedTicketId(null); setIsCreatingTicket(false); }}
            className={`p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer min-w-[130px] sm:min-w-0 shrink-0 sm:shrink ${
              activeTab === "concluido"
                ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-sm"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Solucionados
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-300">{metrics.concluido}</span>
          </button>

          <button
            onClick={() => { setActiveTab("nao_provido"); setSelectedTicketId(null); setIsCreatingTicket(false); }}
            className={`p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer min-w-[130px] sm:min-w-0 shrink-0 sm:shrink ${
              activeTab === "nao_provido"
                ? "bg-rose-950/40 border-rose-500/50 text-rose-200 shadow-sm"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Não Providos
            </span>
            <span className="text-base sm:text-lg font-black text-rose-300">{metrics.naoProvido}</span>
          </button>
        </div>

        {/* Main Body (Split Layout: List on Left, Detail/Form on Right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Left Column: Tickets List & Filters */}
          <div className={`w-full md:w-5/12 lg:w-4/12 border-r border-slate-800 flex flex-col bg-slate-950/30 min-h-0 ${
            isCreatingTicket || selectedTicketId ? "hidden md:flex" : "flex"
          }`}>
            
            {/* Search & Actions Bar */}
            <div className="p-3 border-b border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar chamados..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <button
                  onClick={() => {
                    setIsCreatingTicket(true);
                    setSelectedTicketId(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo</span>
                </button>
              </div>

              {/* Type & Priority Dropdown Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-1 outline-none focus:border-slate-700 cursor-pointer"
                >
                  <option value="all">Todas as Categorias</option>
                  <option value="melhoria_sugestao">Melhoria / Sugestão</option>
                  <option value="reporte_erro">Reporte de Erro</option>
                  <option value="ajuste_tese_prompt">Nova Tese / Prompt</option>
                  <option value="duvida_suporte">Dúvida / Suporte</option>
                  <option value="elogio_feedback">Elogio / Feedback</option>
                  <option value="outro">Outros</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-1 outline-none focus:border-slate-700 cursor-pointer"
                >
                  <option value="all">Prioridades</option>
                  <option value="critica">🔴 Crítica</option>
                  <option value="alta">🟠 Alta</option>
                  <option value="media">🟡 Média</option>
                  <option value="baixa">⚪ Baixa</option>
                </select>
              </div>
            </div>

            {/* Ticket Cards List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredTickets.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <FolderOpen className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">Nenhum chamado encontrado.</p>
                  <p className="text-[11px] text-slate-500">
                    Ajuste os filtros ou clique em <strong>Novo</strong> para registrar uma sugestão ou reporte.
                  </p>
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const isSelected = selectedTicketId === ticket.id;
                  const statusBadge = getStatusBadge(ticket.status);
                  const typeBadge = getTypeBadge(ticket.type);
                  const isUnread = isSuperAdmin ? !ticket.isReadBySuperAdmin : !ticket.isReadByTenant;

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicketId(ticket.id);
                        setIsCreatingTicket(false);
                        markTicketAsRead(ticket.id, !!isSuperAdmin);
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1.5 ${
                        isSelected
                          ? "bg-slate-800 border-emerald-500/70 shadow-md ring-1 ring-emerald-500/30"
                          : isUnread
                            ? "bg-slate-900/90 border-amber-500/40 hover:border-amber-400"
                            : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-ping" />
                          )}
                          <h4 className={`text-xs font-bold truncate ${isSelected ? "text-emerald-300" : "text-white"}`}>
                            {ticket.title}
                          </h4>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border flex items-center gap-1 shrink-0 ${statusBadge.color}`}>
                          {statusBadge.icon}
                          <span>{statusBadge.label}</span>
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {ticket.description}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/50">
                        <span className={`px-1.5 py-0.2 rounded border font-semibold ${typeBadge.color}`}>
                          {typeBadge.label}
                        </span>

                        <div className="flex items-center gap-2">
                          {ticket.messages && ticket.messages.length > 0 && (
                            <span className="flex items-center gap-1 text-indigo-300 font-semibold">
                              <MessageSquare className="w-3 h-3" />
                              {ticket.messages.length}
                            </span>
                          )}
                          <span>{new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>

                      {isSuperAdmin && (
                        <div className="text-[9px] text-slate-400 font-mono truncate">
                          🏢 {ticket.tenantName || ticket.tenantId} • 👤 {ticket.createdByName} ({ticket.createdByRole})
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Detail View OR Creation Form */}
          <div className={`flex-1 flex flex-col bg-slate-900 overflow-y-auto min-h-0 ${
            !isCreatingTicket && !selectedTicketId ? "hidden md:flex" : "flex"
          }`}>
            
            {/* View A: Create New Ticket Form */}
            {isCreatingTicket ? (
              <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-5 animate-in fade-in">
                {/* Mobile Back Button */}
                <div className="md:hidden pb-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingTicket(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-slate-700 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar para Lista de Chamados</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      Abrir Novo Chamado ou Sugestão
                    </h3>
                    <p className="text-xs text-slate-400">
                      Descreva melhorias desejadas, correções, solicitações de teses ou feedbacks para a equipe de IA.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreatingTicket(false)}
                    className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                </div>

                <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
                  {/* Categoria & Prioridade */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Categoria da Solicitação *
                      </label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as TicketType)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 outline-none focus:border-emerald-500"
                      >
                        <option value="melhoria_sugestao">💡 Melhoria / Nova Funcionalidade</option>
                        <option value="reporte_erro">⚠️ Reporte de Erro / Bug</option>
                        <option value="ajuste_tese_prompt">⚖️ Solicitação de Nova Tese / Prompt</option>
                        <option value="duvida_suporte">❓ Dúvida de Operação / Suporte</option>
                        <option value="elogio_feedback">⭐ Elogio / Feedback Positivo</option>
                        <option value="outro">📋 Outro Assunto</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Nível de Prioridade
                      </label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 outline-none focus:border-emerald-500"
                      >
                        <option value="baixa">⚪ Baixa (Desejável)</option>
                        <option value="media">🟡 Média (Padrão)</option>
                        <option value="alta">🟠 Alta (Importante)</option>
                        <option value="critica">🔴 Crítica (Impede o Trabalho)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Módulo do Sistema
                      </label>
                      <select
                        value={newModule}
                        onChange={(e) => setNewModule(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 outline-none focus:border-emerald-500"
                      >
                        <option value="Minutas & IA">Minutas & Redação da IA</option>
                        <option value="Extrator de PDFs">Extrator de PDFs dos Autos</option>
                        <option value="Teses & Paradigmas">Caderno de Teses & Paradigmas</option>
                        <option value="PROJUDI">Guia & Extensão PROJUDI</option>
                        <option value="Legislação & Juros">Pesquisa Legislativa & Consectários</option>
                        <option value="Auditoria Ouro">Bancada de Tripla Conferência</option>
                        <option value="Agenda & Pautas">Agenda Oficial do Magistrado</option>
                        <option value="Gestão de Usuários">Gestão da Equipe & Gabinetes</option>
                        <option value="Geral">Interface Geral do Sistema</option>
                      </select>
                    </div>
                  </div>

                  {/* Título */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Título do Chamado (Resumo Objetivo) *
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Ex: Adicionar opção de fixação de honorários por equidade nas sentenças cíveis"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 text-xs"
                      required
                    />
                  </div>

                  {/* Descrição Detalhada */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Detalhamento da Necessidade ou Descrição do Erro *
                    </label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Descreva detalhadamente o que precisa ser ajustado ou implementado, indicando se possível a regra jurídica, o comportamento esperado ou os passos para reproduzir o caso..."
                      rows={6}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 text-xs leading-relaxed"
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingTicket(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Registrando...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar Chamado para Análise</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : currentTicket ? (
              /* View B: Detail View of Selected Ticket */
              <div className="flex-1 flex flex-col min-h-0 h-full">
                
                {/* Detail Header */}
                <div className="p-3 sm:p-5 bg-slate-950/90 border-b border-slate-800 space-y-2.5 shrink-0">
                  {/* Mobile Back Button */}
                  <div className="md:hidden">
                    <button
                      type="button"
                      onClick={() => setSelectedTicketId(null)}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 active:bg-slate-700 text-emerald-400 font-bold text-xs border border-slate-700 shadow-sm transition cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar para Lista de Chamados</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-xs ${getStatusBadge(currentTicket.status).color}`}>
                        {getStatusBadge(currentTicket.status).icon}
                        <span>{getStatusBadge(currentTicket.status).label}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${getTypeBadge(currentTicket.type).color}`}>
                        {getTypeBadge(currentTicket.type).label}
                      </span>
                      {currentTicket.systemModule && (
                        <span className="px-2 py-0.5 rounded-lg text-xs bg-slate-800/90 border border-slate-700 text-slate-300">
                          📦 {currentTicket.systemModule}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-[10px] sm:text-[11px] text-slate-400">
                        {new Date(currentTicket.createdAt).toLocaleString("pt-BR")}
                      </div>
                      {(isSuperAdmin || (isAdmin && (!currentTicket.tenantId || currentTicket.tenantId === activeTenantId)) || ((currentTicket.createdByUid === currentUid || currentTicket.createdByEmail?.toLowerCase() === currentEmail?.toLowerCase()) && currentTicket.status === "aguardando")) && (
                        isConfirmingDelete ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-rose-400 font-medium hidden sm:inline mr-1">Tem certeza?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTicket(currentTicket.id)}
                              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition cursor-pointer"
                            >
                              Sim, excluir
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsConfirmingDelete(false)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsConfirmingDelete(true)}
                            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900/80 active:bg-rose-900 text-rose-300 border border-rose-800/60 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Excluir Chamado"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span className="hidden sm:inline">Excluir</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-lg font-bold text-white leading-snug">
                      {currentTicket.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-400 mt-1">
                      <span>
                        👤 Solicitante: <strong className="text-slate-200">{currentTicket.createdByName}</strong> ({currentTicket.createdByRole})
                      </span>
                      <span>•</span>
                      <span>
                        🏢 Gabinete: <strong className="text-slate-200">{currentTicket.tenantName || currentTicket.tenantId}</strong>
                      </span>
                      {currentTicket.unitName && (
                        <>
                          <span>•</span>
                          <span>Lotação: <strong className="text-slate-200">{currentTicket.unitName}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content & Messages Area (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 min-h-0 overscroll-contain">
                  
                  {/* Descrição Original */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      Descrição Detalhada do Chamado
                    </span>
                    <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {currentTicket.description}
                    </p>
                  </div>

                  {/* Resolução / Parecer Oficial (se concluído ou não provido) */}
                  {currentTicket.resolutionFeedback && (
                    <div className={`p-3.5 sm:p-4 rounded-xl border space-y-1.5 ${
                      currentTicket.status === "concluido"
                        ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                        : "bg-rose-950/30 border-rose-500/40 text-rose-200"
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        {currentTicket.status === "concluido" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <span>Parecer Oficial da Engenharia: {currentTicket.status === "concluido" ? "Solução Entregue" : "Justificativa de Indeferimento"}</span>
                      </span>
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                        {currentTicket.resolutionFeedback}
                      </p>
                      {currentTicket.resolvedBy && (
                        <p className="text-[10px] opacity-75 pt-1">
                          Parecer emitido por: {currentTicket.resolvedBy} em {currentTicket.resolvedAt ? new Date(currentTicket.resolvedAt).toLocaleString("pt-BR") : "recentemente"}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Linha do Tempo & Histórico de Status */}
                  {currentTicket.statusHistory && currentTicket.statusHistory.length > 0 && (
                    <div className="p-3 sm:p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        Evolução e Linha do Tempo do Chamado
                      </span>
                      <div className="space-y-1.5">
                        {currentTicket.statusHistory.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-200">
                                {getStatusBadge(item.status).label}
                              </span>
                              <span className="text-slate-400 text-[10px] ml-2">
                                por {item.changedByName} em {new Date(item.changedAt).toLocaleString("pt-BR")}
                              </span>
                              {item.comment && (
                                <p className="text-[11px] text-slate-300 italic">"{item.comment}"</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mensagens & Chat em Tempo Real */}
                  <div className="space-y-2.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                      Interações & Respostas ({currentTicket.messages?.length || 0})
                    </span>

                    {(!currentTicket.messages || currentTicket.messages.length === 0) ? (
                      <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl border border-slate-800">
                        Nenhuma mensagem adicional. Use o campo abaixo para responder ou esclarecer dúvidas.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {currentTicket.messages.map((msg) => {
                          const isEng = msg.isSuperAdminReply;
                          return (
                            <div
                              key={msg.id}
                              className={`p-3 rounded-xl border space-y-1 ${
                                isEng
                                  ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-100"
                                  : "bg-slate-950 border-slate-800 text-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 text-[10px]">
                                <div className="flex items-center gap-1.5 font-bold">
                                  {isEng ? (
                                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                                  ) : (
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                  <span className={isEng ? "text-indigo-300" : "text-slate-200"}>
                                    {msg.authorName}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700">
                                    {msg.authorRole}
                                  </span>
                                </div>
                                <span className="text-slate-500">
                                  {new Date(msg.createdAt).toLocaleString("pt-BR")}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed pl-5">
                                {msg.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Painel de Gestão e Alteração de Status (Super Admin e Administradores) */}
                  {(isSuperAdmin || isAdmin || isJudge) && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-3 mt-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-indigo-400" />
                          {isSuperAdmin ? "Gestão de Situação (Engenharia / Super Admin)" : "Gestão do Gabinete (Situação do Chamado)"}
                        </span>
                        <span className="text-[10px] text-indigo-400/80 font-mono">
                          Status Atual: <strong>{getStatusBadge(currentTicket.status).label}</strong>
                        </span>
                      </div>

                      {/* Chips Rápidos de Seleção de Status */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                          Selecione a Nova Situação:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {[
                            { id: "aguardando", label: "🟡 Aguardando", color: "border-amber-500/40 hover:bg-amber-950/40" },
                            { id: "em_analise", label: "🔵 Em Análise", color: "border-blue-500/40 hover:bg-blue-950/40" },
                            { id: "em_construcao", label: "🟣 Em Construção", color: "border-purple-500/40 hover:bg-purple-950/40" },
                            { id: "concluido", label: "🟢 Solucionado", color: "border-emerald-500/40 hover:bg-emerald-950/40" },
                            { id: "nao_provido", label: "🔴 Não Provido", color: "border-rose-500/40 hover:bg-rose-950/40" },
                            { id: "arquivado", label: "⚪ Arquivado", color: "border-slate-500/40 hover:bg-slate-800/40" },
                          ].map((chip) => {
                            const isSelected = decisionStatus === chip.id;
                            return (
                              <button
                                key={chip.id}
                                type="button"
                                onClick={() => setDecisionStatus(chip.id as TicketStatus)}
                                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer min-h-[40px] flex items-center justify-center ${
                                  isSelected
                                    ? "bg-indigo-600 text-white border-indigo-400 shadow-sm ring-2 ring-indigo-400/50"
                                    : `bg-slate-950/80 text-slate-300 ${chip.color}`
                                }`}
                              >
                                <span>{chip.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Parecer / Justificativa / Comentário (Opcional):
                        </label>
                        <input
                          type="text"
                          value={decisionComment}
                          onChange={(e) => setDecisionComment(e.target.value)}
                          placeholder="Ex: Implementado na versão de hoje / Ajustado conforme solicitado..."
                          className="w-full bg-slate-950 border border-indigo-700/60 rounded-xl p-2.5 text-slate-100 placeholder-slate-500 text-xs outline-none focus:border-indigo-400"
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleApplyStatusChange()}
                          disabled={isUpdatingStatus}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 active:from-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isUpdatingStatus ? "Salvando Alteração..." : "Salvar Alteração de Situação"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* Detail Footer: Message Reply Input */}
                <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0 pb-6 sm:pb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      placeholder={
                        isSuperAdmin
                          ? "Escreva uma resposta da Engenharia..."
                          : "Adicione mais detalhes ou responda à equipe..."
                      }
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 sm:py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 transition min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyContent.trim()}
                      className="flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50 cursor-pointer shrink-0 min-h-[44px]"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSendingReply ? "Enviando..." : "Responder"}</span>
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              /* View C: Empty State (No ticket selected) */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Nenhum chamado selecionado</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Selecione um chamado na lista à esquerda para acompanhar o status e as respostas, ou clique no botão abaixo para abrir uma nova solicitação.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreatingTicket(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Abrir Novo Chamado</span>
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
