import React, { useState, useRef, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { 
  Bell, 
  CheckCheck, 
  ChevronRight, 
  Clock, 
  Hammer, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  AlertCircle, 
  MessageSquare, 
  ArrowUpRight,
  HelpCircle,
  FolderOpen,
  Check,
  Inbox
} from "lucide-react";
import { SupportTicket, TicketStatus } from "../types";
import { markAllTicketsAsRead, markTicketAsRead, getUnreadTicketsCount } from "../utils/ticketsDb";
import { useAuth } from "../lib/AuthContext";

interface NotificationBellProps {
  tickets: SupportTicket[];
  onOpenTicketsModal: (ticketId?: string) => void;
  className?: string;
  isMobileDrawer?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  tickets,
  onOpenTicketsModal,
  className = "",
  isMobileDrawer = false,
}) => {
  const { user, userProfile, isSuperAdmin, isAdmin, isJudge } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"pendentes" | "todos">("pendentes");
  const [optimisticReadIds, setOptimisticReadIds] = useState<Set<string>>(new Set());
  const popoverRef = useRef<HTMLDivElement>(null);

  // Filter tickets visible to this user and apply optimistic reads
  const visibleTickets = useMemo(() => {
    const currentUid = userProfile?.uid || user?.uid;
    const currentEmail = userProfile?.email || user?.email;

    return tickets
      .filter((t) => {
        if (isSuperAdmin) return true;
        if (isAdmin || isJudge) return true;
        return (
          (Boolean(currentUid) && t.createdByUid === currentUid) ||
          (Boolean(currentEmail) && t.createdByEmail?.toLowerCase() === currentEmail?.toLowerCase())
        );
      })
      .map((t) => {
        if (optimisticReadIds.has(t.id)) {
          return {
            ...t,
            [isSuperAdmin ? "isReadBySuperAdmin" : "isReadByTenant"]: true,
          };
        }
        return t;
      });
  }, [tickets, isSuperAdmin, isAdmin, isJudge, userProfile, user, optimisticReadIds]);

  // Compute unread count based on role and user ownership
  const unreadCount = useMemo(() => {
    return getUnreadTicketsCount(visibleTickets, {
      isSuperAdmin: Boolean(isSuperAdmin),
      isAdmin: Boolean(isAdmin),
      isJudge: Boolean(isJudge),
      userId: userProfile?.uid || user?.uid,
      userEmail: userProfile?.email || user?.email || undefined,
    });
  }, [visibleTickets, isSuperAdmin, isAdmin, isJudge, userProfile, user]);

  // Filter unread tickets specifically
  const unreadTickets = useMemo(() => {
    return visibleTickets.filter((t) => {
      const isUnread = isSuperAdmin ? t.isReadBySuperAdmin === false : t.isReadByTenant === false;
      return isUnread;
    });
  }, [visibleTickets, isSuperAdmin]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const allIds = new Set(visibleTickets.map((t) => t.id));
      setOptimisticReadIds((prev) => new Set([...prev, ...allIds]));
      
      await markAllTicketsAsRead(
        visibleTickets,
        Boolean(isSuperAdmin),
        userProfile?.tenantId,
        userProfile?.uid || user?.uid
      );
      toast.success("Todas as notificações foram marcadas como lidas.");
    } catch (err) {
      console.warn("Could not mark all as read:", err);
    }
  };

  const handleMarkSingleRead = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    try {
      setOptimisticReadIds((prev) => new Set([...prev, ticketId]));
      await markTicketAsRead(
        ticketId,
        Boolean(isSuperAdmin),
        userProfile?.tenantId,
        userProfile?.uid || user?.uid
      );
      toast.success("Notificação marcada como lida.");
    } catch (err) {
      console.warn("Could not mark ticket as read:", err);
    }
  };

  const handleSelectTicket = async (ticketId: string) => {
    try {
      setOptimisticReadIds((prev) => new Set([...prev, ticketId]));
      await markTicketAsRead(
        ticketId,
        Boolean(isSuperAdmin),
        userProfile?.tenantId,
        userProfile?.uid || user?.uid
      );
    } catch {}
    setIsOpen(false);
    onOpenTicketsModal(ticketId);
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case "aguardando":
        return {
          label: "Aguardando",
          color: "bg-amber-500/20 border-amber-500/40 text-amber-300",
          icon: <Clock className="w-3 h-3 text-amber-400 shrink-0" />,
        };
      case "em_analise":
        return {
          label: "Em Análise",
          color: "bg-blue-500/20 border-blue-500/40 text-blue-300",
          icon: <AlertCircle className="w-3 h-3 text-blue-400 shrink-0" />,
        };
      case "em_construcao":
        return {
          label: "Em Construção",
          color: "bg-purple-500/20 border-purple-500/40 text-purple-300",
          icon: <Hammer className="w-3 h-3 text-purple-400 shrink-0" />,
        };
      case "concluido":
        return {
          label: "Solucionado",
          color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />,
        };
      case "nao_provido":
        return {
          label: "Não Provido",
          color: "bg-rose-500/20 border-rose-500/40 text-rose-300",
          icon: <XCircle className="w-3 h-3 text-rose-400 shrink-0" />,
        };
      default:
        return {
          label: "Arquivado",
          color: "bg-slate-500/20 border-slate-500/40 text-slate-300",
          icon: <FolderOpen className="w-3 h-3 text-slate-400 shrink-0" />,
        };
    }
  };

  const displayedTickets = activeTab === "pendentes" ? unreadTickets : visibleTickets.slice(0, 10);

  if (isMobileDrawer) {
    return (
      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="w-4 h-4 text-amber-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-slate-200">Central de Chamados</span>
          </div>
          <button
            onClick={() => onOpenTicketsModal()}
            className="text-[10px] text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            Abrir Central
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {unreadTickets.length === 0 ? (
          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 py-1">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            Tudo lido! Nenhuma notificação pendente.
          </p>
        ) : (
          <div className="space-y-1.5">
            {unreadTickets.slice(0, 3).map((t) => {
              const badge = getStatusBadge(t.status);
              return (
                <div
                  key={t.id}
                  onClick={() => onOpenTicketsModal(t.id)}
                  className="p-2 rounded-xl text-left border transition cursor-pointer flex items-center justify-between gap-2 bg-slate-850 border-amber-500/40 hover:border-amber-400"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-200 truncate">{t.title}</p>
                    <span className="text-[9px] text-slate-400">{t.tenantName || "Gabinete"}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border flex items-center gap-1 shrink-0 ${badge.color}`}>
                    {badge.icon}
                    <span>{badge.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Botão Sininho */}
      <button
        id="btn-header-notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center justify-center w-8 h-[30px] rounded-lg border transition cursor-pointer shadow-2xs ${
          unreadCount > 0
            ? "bg-amber-500/15 border-amber-400/60 text-amber-300 hover:bg-amber-500/25 hover:border-amber-300 shadow-amber-500/20"
            : "bg-slate-800/90 border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white"
        }`}
        title={
          unreadCount > 0
            ? `${unreadCount} recado(s) e chamados com atualizações`
            : "Central de Chamados, Melhorias & Notificações"
        }
        aria-label="Notificações e Chamados"
      >
        <Bell className={`w-3.5 h-3.5 ${unreadCount > 0 ? "text-amber-400 animate-wiggle" : ""}`} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black flex items-center justify-center shadow-md border-2 border-slate-900 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="fixed left-3 right-3 sm:left-auto sm:right-0 top-14 sm:top-full mt-2 w-auto sm:w-[400px] max-w-md sm:max-w-none bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden z-50 text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-black/50">
          
          {/* Header do Popover */}
          <div className="p-3 bg-gradient-to-r from-slate-950 to-slate-900 border-b border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Central de Chamados & Recados</h4>
                  <p className="text-[10px] text-slate-400">
                    {unreadCount > 0 ? `${unreadCount} pendência(s) não lida(s)` : "Tudo em dia e lido"}
                  </p>
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 px-2 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  title="Marcar todos como lidos"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Ler todos</span>
                </button>
              )}
            </div>

            {/* Abas: Não Lidos vs Todos */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
              <button
                onClick={() => setActiveTab("pendentes")}
                className={`flex-1 py-1 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "pendentes"
                    ? "bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                <span>🔔 Não Lidos</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("todos")}
                className={`flex-1 py-1 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "todos"
                    ? "bg-slate-800 border border-slate-700 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                <span>📋 Todos ({visibleTickets.length})</span>
              </button>
            </div>
          </div>

          {/* Lista de Chamados */}
          <div className="max-h-[320px] overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-800/40">
            {displayedTickets.length === 0 ? (
              <div className="p-6 text-center space-y-2.5">
                {activeTab === "pendentes" ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">Tudo em dia!</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Nenhum chamado pendente de leitura no momento.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("todos")}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                    >
                      Ver histórico completo de chamados
                    </button>
                  </>
                ) : (
                  <>
                    <Inbox className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">Nenhum chamado registrado.</p>
                    <p className="text-[11px] text-slate-500">
                      Use a Central para solicitar melhorias, teses ou relatar ajustes.
                    </p>
                  </>
                )}
              </div>
            ) : (
              displayedTickets.map((t) => {
                const badge = getStatusBadge(t.status);
                const isUnread = isSuperAdmin ? t.isReadBySuperAdmin === false : t.isReadByTenant === false;

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t.id)}
                    className={`p-2.5 rounded-xl text-left transition cursor-pointer flex flex-col gap-1.5 group ${
                      isUnread
                        ? "bg-slate-800/90 border border-amber-500/40 hover:border-amber-400/80 shadow-xs"
                        : "hover:bg-slate-800/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-ping" />
                        )}
                        <span className="text-xs font-bold text-slate-100 truncate">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border flex items-center gap-1 ${badge.color}`}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                        {isUnread && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkSingleRead(e, t.id)}
                            title="Marcar este chamado como lido"
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-300 hover:bg-slate-700/80 transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {t.description && (
                      <p className="text-[11px] text-slate-300 line-clamp-1">{t.description}</p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span className="truncate max-w-[180px]">
                        {isSuperAdmin ? `🏢 ${t.tenantName || "Gabinete"}` : `👤 ${t.createdByName || "Solicitante"}`}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {t.messages && t.messages.length > 0 && (
                          <span className="flex items-center gap-0.5 text-indigo-300">
                            <MessageSquare className="w-2.5 h-2.5" />
                            {t.messages.length}
                          </span>
                        )}
                        <span>{new Date(t.updatedAt || t.createdAt).toLocaleDateString("pt-BR")}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé com Ação Principal */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenTicketsModal();
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <span>Abrir Central de Chamados & Feedback</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
