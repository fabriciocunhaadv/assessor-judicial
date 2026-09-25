import React, { useState, useEffect } from "react";
import {
  Server,
  Bot,
  Gem,
  Scale,
  Sparkles,
  SlidersHorizontal,
  FileSpreadsheet,
  Home,
  BrainCircuit,
  ChevronRight,
  BookmarkCheck,
  BookOpen,
  LogOut,
  Users,
  Building2,
  ClipboardList,
  UserCheck,
  ShieldCheck,
  Key,
  Crown,
  Award,
  Gavel,
  Calendar,
  Puzzle,
  Hammer,
  Settings,
  MapPin,
  ChevronDown,
  Menu,
  FileText,
  X,
  MessageSquare,
  Bell
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { DEFAULT_UNITS, SupportTicket } from "../types";
import { getLocalUsageStats, ApiUsageStats } from "../utils/apiUsageTracker";
import { hasCustomApiKey, getMaskedApiKey } from "../utils/apiKeyManager";
import { NotificationBell } from "./NotificationBell";
import { isTicketModuleEnabled } from "../utils/ticketsDb";

interface HeaderProps {
  onOpenPromptManager?: () => void;
  onOpenHistory?: () => void;
  onOpenCredits?: () => void;
  onOpenApiKeyConfig?: () => void;
  onOpenXRay?: () => void;
  onOpenTeses?: () => void;
  onOpenBindingPrecedents?: () => void;
  onOpenLegislativeLookup?: () => void;
  onOpenProjudiGuide?: () => void;
  onOpenCalendar?: () => void;
  onOpenManual?: () => void;
  onOpenUserManager?: () => void;
  onOpenSuperAdmin?: () => void;
  onOpenUnitManager?: () => void;
  onOpenMinuteAuditor?: () => void;
  onOpenPetitionPanel?: () => void;
  onOpenTicketsModal?: (ticketId?: string) => void;
  tickets?: SupportTicket[];
  sessionTokens?: number;
  onClearAll?: () => void;
  onGoHome?: () => void;
  activePromptTitle?: string;
  activePromptType?: string;
  tesesCount?: number;
  isTesesActive?: boolean;
  onToggleGuide?: () => void;
  isGuideVisible?: boolean;
  onOpenPresentation?: () => void;
  onOpenExtension?: () => void;
  onOpenHearingWorkbench?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPromptManager,
  onOpenHistory,
  onOpenCredits,
  onOpenApiKeyConfig,
  onOpenXRay,
  onOpenTeses,
  onOpenBindingPrecedents,
  onOpenLegislativeLookup,
  onOpenProjudiGuide,
  onOpenCalendar,
  onOpenHearingWorkbench,
  onOpenManual,
  onOpenUserManager,
  onOpenSuperAdmin,
  onOpenUnitManager,
  onOpenMinuteAuditor,
  onOpenPetitionPanel,
  onOpenExtension,
  onOpenTicketsModal,
  tickets = [],
  sessionTokens = 0,
  onClearAll,
  onGoHome,
  activePromptTitle,
  activePromptType,
  tesesCount = 0,
  isTesesActive = false,
  onToggleGuide,
  isGuideVisible,
  onOpenPresentation,
}) => {
  const { 
    user, 
    userProfile, 
    signOut, 
    isAdmin, 
    isJudge, 
    isSuperAdmin, 
    activeUnit, 
    setActiveUnit, 
    allowedUnits,
    activeTenantId,
    allTenants,
    allUnitsForSuperAdmin,
    setSuperAdminActiveTenant
  } = useAuth();
  const currentUid = userProfile?.uid;
  const [stats, setStats] = useState<ApiUsageStats | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(() => hasCustomApiKey(currentUid));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const displayUnits = allowedUnits && allowedUnits.length > 0 ? allowedUnits : DEFAULT_UNITS;
  const currentUnitId = activeUnit?.id || displayUnits[0]?.id;

  const handleAction = (action?: () => void) => {
    setIsMobileMenuOpen(false);
    action?.();
  };

  useEffect(() => {
    const updateStats = () => {
      setStats(getLocalUsageStats());
    };
    const updateApiKey = () => {
      setHasApiKey(hasCustomApiKey(currentUid));
    };
    updateStats();
    updateApiKey();
    window.addEventListener('api-usage-updated', updateStats);
    window.addEventListener('api-key-updated', updateApiKey);
    return () => {
      window.removeEventListener('api-usage-updated', updateStats);
      window.removeEventListener('api-key-updated', updateApiKey);
    };
  }, [currentUid]);

  const rawUserName = userProfile?.name || user?.displayName || "Usuário";
  const userName = isJudge ? `Exmo(a). Dr(a). ${rawUserName.replace(/^Dr(a)?\.?\s*/i, '')}` : rawUserName;
  const userEmail = user?.email || "";
  const roleLabel = isJudge ? "Juiz Titular" : (isSuperAdmin ? "Super ADM" : (isAdmin ? "Administrador" : "Assessor"));

  return (
    <header className={`text-white border-b sticky top-0 z-30 shadow-md ${
      isJudge 
        ? "bg-gradient-to-r from-[#14120a] via-[#1f1a10] to-[#12161f] border-b-amber-500/40 border-t-2 border-t-amber-400 shadow-amber-950/20" 
        : "bg-gradient-to-r from-[#0b111a] via-[#111926] to-[#0d1420] border-slate-800"
    }`}>
      {/* Linha Superior: Logo + Botão Menu (Mobile) / Régua Completa (Desktop) */}
      <div className="w-full max-w-[1800px] mx-auto px-3 sm:px-5 py-2 flex items-center justify-between gap-2.5">
        
        {/* Logo / Branding (Fixo à esquerda) */}
        <div 
          onClick={onGoHome}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0 select-none pr-2" 
          title="Ir para o Início / Nova Análise"
        >
          <div className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shadow-xs transition duration-200 shrink-0 ${
            isJudge
              ? "bg-gradient-to-br from-amber-500/30 to-amber-600/10 border-amber-400/60 text-amber-300 group-hover:bg-amber-500/40 group-hover:border-amber-300"
              : "bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400 group-hover:bg-emerald-500/25 group-hover:border-emerald-400/60"
          }`}>
            {isJudge ? <Crown className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-300" /> : <Scale className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
          </div>
          <div className="flex flex-col shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className={`font-extrabold text-sm sm:text-base tracking-wide text-white font-sans flex items-center gap-1.5 transition ${
                isJudge ? "group-hover:text-amber-300" : "group-hover:text-emerald-300"
              }`}>
                Assessor Judicial
              </h1>
              {isJudge ? (
                <span className="px-1.5 sm:px-2 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-sans text-[8px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 sm:gap-1 shrink-0 shadow-2xs">
                  <Crown className="w-2.5 h-2.5 text-slate-950" />
                  MAGISTRADO
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-mono text-[8px] sm:text-[9px] font-bold flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ON
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-300 font-medium whitespace-nowrap flex items-center gap-1">
              {isJudge ? (
                <span className="text-amber-200 font-semibold flex items-center gap-1">
                  <Scale className="w-3 h-3 text-amber-300" />
                  Gabinete do Magistrado
                </span>
              ) : (
                "Inteligência Artificial Aplicada"
              )}
            </p>
          </div>
        </div>

        {/* BOTÃO COMPACTO DEDICADO: Menu para Mobile, Tablets e Notebooks Menores (< 1280px) */}
        <div className="flex xl:hidden items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenTicketsModal && (
            <NotificationBell
              tickets={tickets}
              onOpenTicketsModal={onOpenTicketsModal}
            />
          )}

          {activePromptTitle && (
            <div 
              onClick={onOpenPromptManager}
              className="hidden xs:flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[10px] text-emerald-300 max-w-[85px] sm:max-w-[120px] truncate cursor-pointer"
              title={`Prompt: ${activePromptTitle}`}
            >
              <BookmarkCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">{activePromptTitle}</span>
            </div>
          )}

          <button
            id="btn-header-mobile-menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer border ${
              isMobileMenuOpen
                ? "bg-rose-950/80 border-rose-500/50 text-rose-200"
                : isJudge
                  ? "bg-gradient-to-r from-amber-600 to-amber-700 border-amber-400/60 text-white hover:from-amber-500 hover:to-amber-600 shadow-amber-950/30"
                  : "bg-slate-800/90 border-slate-700 hover:bg-slate-700 text-slate-200 hover:text-white"
            }`}
            aria-label="Abrir Menu de Navegação"
          >
            {isMobileMenuOpen ? (
              <>
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-300" />
                <span>Fechar</span>
              </>
            ) : (
              <>
                <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                <span>Menu</span>
              </>
            )}
          </button>
        </div>

        {/* Régua Completa de Botões de Ação (Apenas Desktop Largo / Telas Grandes: xl:flex) */}
        <nav 
          aria-label="Barra de Ferramentas Principal"
          className="hidden xl:flex flex-wrap items-center gap-1.5 text-xs justify-end"
        >
          {/* Botões movidos para o Sidebar */}

          {/* GRUPO 3: GESTÃO & SUPORTE (Menu Dropdown) */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-[11px] transition cursor-pointer border border-slate-700 shadow-2xs whitespace-nowrap">
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Configurações</span>
              <ChevronDown className="w-3 h-3 text-slate-500 opacity-70 group-hover:rotate-180 transition-transform duration-200" />
            </button>

            <div className="absolute right-0 top-full pt-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="w-[210px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 ring-1 ring-black/50">
                
                {isSuperAdmin && onOpenSuperAdmin && (
                  <button
                    id="btn-header-superadmin"
                    onClick={onOpenSuperAdmin}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 font-bold text-xs transition cursor-pointer border border-indigo-500/20 text-left w-full"
                  >
                    <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>SaaS Admin</span>
                  </button>
                )}

                {isSuperAdmin && onOpenPetitionPanel && (
                  <button
                    id="btn-header-petition-module"
                    onClick={onOpenPetitionPanel}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-gradient-to-r from-indigo-950/90 to-purple-950/90 hover:from-indigo-900 hover:to-purple-900 text-indigo-200 font-bold text-xs transition cursor-pointer border border-indigo-500/30 text-left w-full shadow-sm"
                    title="Módulo Petição & Defesa 360° (Inicial, Contestação e Recursos - Exclusivo Super Admin)"
                  >
                    <div className="flex items-center gap-2">
                      <Scale className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Petição & Defesa 360°</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                      Super Admin
                    </span>
                  </button>
                )}
                {isAdmin && onOpenUserManager && (
                  <button
                    id="btn-header-user-manager"
                    onClick={onOpenUserManager}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-slate-100 font-semibold text-xs transition cursor-pointer text-left w-full"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Equipe e Acessos</span>
                  </button>
                )}

                {isAdmin && onOpenUnitManager && (
                  <button
                    onClick={onOpenUnitManager}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-slate-100 font-semibold text-xs transition cursor-pointer text-left w-full"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Lotações / Comarcas</span>
                  </button>
                )}

                {onOpenHearingWorkbench && (
                  <button
                    id="btn-header-hearing-workbench-tools"
                    onClick={onOpenHearingWorkbench}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-slate-100 font-semibold text-xs transition cursor-pointer text-left w-full"
                    title="Mesa de Audiências & Instrução Judicial"
                  >
                    <Gavel className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Mesa de Audiências</span>
                  </button>
                )}

                {(isSuperAdmin || isJudge) && onOpenMinuteAuditor && (
                  <button
                    id="btn-header-minute-auditor"
                    onClick={onOpenMinuteAuditor}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-gradient-to-r from-amber-950/80 to-amber-900/60 hover:from-amber-900 hover:to-amber-800 text-amber-200 font-bold text-xs transition cursor-pointer border border-amber-500/30 text-left w-full shadow-xs"
                    title="Lupa do Magistrado & Auditor de Minutas (Auditoria Ouro)"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Auditoria Ouro (Lupa)</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shrink-0">
                      Juiz
                    </span>
                  </button>
                )}

                {isSuperAdmin && onOpenExtension && (
                  <button
                    id="btn-header-extensao"
                    onClick={onOpenExtension}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-slate-100 font-semibold text-xs transition cursor-pointer text-left w-full group"
                    title="Extensão PROJUDI - Módulo em Construção"
                  >
                    <div className="flex items-center gap-2">
                      <Puzzle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Extensão PROJUDI</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                      <Hammer className="w-2.5 h-2.5 text-amber-400" />
                      Em Construção
                    </span>
                  </button>
                )}

                <div className="h-[1px] w-full bg-slate-800 my-0.5" />

                {onOpenApiKeyConfig && (
                  <button
                    id="btn-header-api-key"
                    onClick={onOpenApiKeyConfig}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-slate-100 font-semibold text-xs transition cursor-pointer text-left w-full relative"
                  >
                    <Key className={`w-3.5 h-3.5 shrink-0 ${hasApiKey ? "text-emerald-400" : "text-amber-400"}`} />
                    <span>Chave API Gemini</span>
                    <span className={`w-1.5 h-1.5 rounded-full absolute right-3 top-1/2 -translate-y-1/2 ${hasApiKey ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                  </button>
                )}

                {onOpenTicketsModal && (
                  <button
                    id="btn-header-chamados"
                    onClick={() => onOpenTicketsModal()}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-slate-100 font-semibold text-xs transition cursor-pointer text-left w-full"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Central de Chamados</span>
                    </div>
                    {tickets && tickets.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                        {tickets.length}
                      </span>
                    )}
                  </button>
                )}

                {onOpenManual && (
                  <button
                    id="btn-header-manual"
                    onClick={onOpenManual}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-slate-100 font-semibold text-xs transition cursor-pointer text-left w-full"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Manual de Uso</span>
                  </button>
                )}

                {onToggleGuide && (
                  <button
                    onClick={onToggleGuide}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-slate-100 font-semibold text-xs transition cursor-pointer text-left w-full"
                  >
                    <Bot className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Tutor IA: {isGuideVisible ? 'ON' : 'OFF'}</span>
                  </button>
                )}

              </div>
            </div>
          </div>

          {/* Sininho de Notificações & Recados no Desktop */}
          {onOpenTicketsModal && (
            <NotificationBell
              tickets={tickets}
              onOpenTicketsModal={onOpenTicketsModal}
            />
          )}
        </nav>
      </div>

      {/* Linha Inferior: Usuário / Lotação / Sair (Desktop xl:flex) */}
      <div className="hidden xl:flex bg-[#080d14]/95 px-3 sm:px-5 py-1.5 border-t border-slate-800/80 items-center justify-between gap-2 text-xs">
        
        {/* Esquerda: Lotação + Usuário Logado + Botão Sair */}
        <div className="flex items-center gap-2 flex-wrap">
          {user && (
            <>
              {/* Seletor de Lotação / Comarca (Com suporte Multi-Gabinete para Super Admin) */}
              {isSuperAdmin && allTenants && allTenants.length > 0 ? (
                <div className="flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-500/50 rounded-lg px-2 py-0.5 shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <select
                    value={`${activeTenantId}:::${currentUnitId}`}
                    onChange={(e) => {
                      const [tId, uId] = e.target.value.split(":::");
                      if (tId) setSuperAdminActiveTenant(tId, uId);
                    }}
                    id="tour-header-unit"
                    className="bg-transparent text-indigo-100 text-[11px] font-semibold outline-none cursor-pointer max-w-[240px] truncate"
                    title="Seletor Global de Gabinetes & Lotações (Super Admin)"
                  >
                    {allTenants.map((t) => {
                      const isCurrentTenant = t.id === activeTenantId;
                      const tUnits = isCurrentTenant ? displayUnits : allUnitsForSuperAdmin.filter(u => u.tenantId === t.id);
                      const unitsToShow = tUnits.length > 0 ? tUnits : (t.isPrimary ? DEFAULT_UNITS : []);
                      return (
                        <optgroup key={t.id} label={`🏢 ${t.name}${t.isPrimary ? ' (Principal)' : ''}`} className="bg-slate-900 text-indigo-200 font-bold">
                          {unitsToShow.map((u) => (
                            <option key={`${t.id}:::${u.id}`} value={`${t.id}:::${u.id}`} className="bg-slate-900 text-slate-100 font-normal">
                              {u.name}
                            </option>
                          ))}
                          {unitsToShow.length === 0 && (
                            <option value={`${t.id}:::default`} className="bg-slate-900 text-slate-400 italic font-normal">
                              (Sem lotações cadastradas)
                            </option>
                          )}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <select
                  value={currentUnitId}
                  onChange={(e) => {
                    const unitId = e.target.value;
                    const unit = displayUnits.find((u: any) => u.id === unitId);
                    if (unit) setActiveUnit(unit);
                  }}
                  id="tour-header-unit"
                  className="bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 text-[11px] rounded-md px-2 py-1 outline-none focus:border-emerald-500 cursor-pointer max-w-[200px] truncate shadow-2xs font-medium"
                  title="Lotação / Comarca Ativa"
                >
                  {displayUnits.map((u: any) => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                      {u.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Informações do Usuário Conectado */}
              <div 
                className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] transition shadow-xs ${
                  isJudge
                    ? "bg-gradient-to-r from-amber-950/80 via-amber-900/40 to-slate-900 border border-amber-400/70 text-amber-100 shadow-amber-950/30 ring-1 ring-amber-400/30"
                    : isSuperAdmin
                      ? "bg-indigo-950/70 border border-indigo-500/40 text-indigo-100"
                      : isAdmin
                        ? "bg-blue-950/70 border border-blue-500/40 text-blue-100"
                        : "bg-slate-800/70 border border-slate-700/70 text-slate-200"
                }`}
                title={`Usuário: ${userName} (${userEmail}) - Perfil: ${roleLabel}`}
              >
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={userName} 
                    className={`w-5 h-5 rounded-full object-cover shrink-0 ${
                      isJudge ? "border-2 border-amber-300 ring-1 ring-amber-500" : isSuperAdmin ? "border border-indigo-400" : isAdmin ? "border border-blue-400" : "border border-emerald-400/50"
                    }`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isJudge 
                      ? "bg-amber-500 text-slate-950 ring-1 ring-amber-300" 
                      : isSuperAdmin 
                        ? "bg-indigo-900 border border-indigo-500/50 text-indigo-200" 
                        : isAdmin 
                          ? "bg-blue-900 border border-blue-500/50 text-blue-200" 
                          : "bg-emerald-950 border border-emerald-500/40 text-emerald-400"
                  }`}>
                    {isJudge ? <Crown className="w-3 h-3" /> : isSuperAdmin ? <ShieldCheck className="w-3 h-3 text-indigo-300" /> : <UserCheck className="w-2.5 h-2.5" />}
                  </div>
                )}
                
                <span className={`font-bold truncate max-w-[130px] sm:max-w-[200px] ${
                  isJudge ? "text-amber-100" : "text-slate-100"
                }`}>
                  {userName}
                </span>

                {isJudge ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-2xs shrink-0 flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5 text-slate-950" />
                    JUIZ TITULAR
                  </span>
                ) : isSuperAdmin ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0 flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5 text-indigo-400" />
                    SUPER ADM
                  </span>
                ) : isAdmin ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0 flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5 text-blue-400" />
                    ADM
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                    ASSESSOR
                  </span>
                )}

                {userEmail && (
                  <span className={`text-[10px] font-mono hidden xl:inline truncate max-w-[180px] ${
                    isJudge ? "text-amber-300/70" : "text-slate-400"
                  }`}>
                    ({userEmail})
                  </span>
                )}
              </div>

              {/* Botão Sair */}
              <button
                onClick={signOut}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 font-bold text-[11px] transition cursor-pointer border border-slate-700 hover:border-rose-500/50 whitespace-nowrap shadow-2xs"
                title="Sair do sistema"
              >
                <LogOut className="w-3 h-3" />
                <span>Sair</span>
              </button>
            </>
          )}
        </div>

        {/* Direita: PROMPT ATIVO (Destacado e Clicável) */}
        {activePromptTitle && (
          <div 
            onClick={onOpenPromptManager}
            className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 hover:border-emerald-500/40 px-2.5 py-1 rounded-md cursor-pointer transition text-[11px] group max-w-full self-start md:self-auto"
            title="Clique para gerenciar ou trocar de prompt"
          >
            <div className="flex items-center gap-1 text-emerald-400 font-bold shrink-0">
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Prompt Ativo:</span>
            </div>
            <span className="text-slate-200 font-semibold truncate max-w-[220px] sm:max-w-[340px] group-hover:text-white">
              {activePromptTitle}
            </span>
            {activePromptType && (
              <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-[9px] uppercase tracking-wider shrink-0">
                {activePromptType}
              </span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-300 transition shrink-0 ml-0.5" />
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* PAINEL MOBILE / NOTEBOOK COMPACTO DEDICADO (Gaveta Completa)   */}
      {/* ============================================================== */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] xl:hidden flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-[88vw] max-w-sm sm:max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-200 animate-in slide-in-from-right duration-200">
            
            {/* Header da Gaveta Mobile */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
                  isJudge 
                    ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                    : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                }`}>
                  {isJudge ? <Crown className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Menu do Assessor</h2>
                  <p className="text-[10px] text-slate-400">Navegação e Gestão Mobile</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Rolável do Menu Mobile */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              
              {/* 1. SELETOR DE GABINETES & LOTAÇÃO COMPACTO NO TOPO */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    Gabinete & Lotação
                  </span>
                  {isSuperAdmin && (
                    <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700/60 text-indigo-300 text-[9px] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-indigo-400" />
                      Super Admin
                    </span>
                  )}
                </div>

                {isSuperAdmin && allTenants && allTenants.length > 0 ? (
                  <div className="space-y-2.5">
                    {/* Seletor de Gabinete */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                        🏢 Gabinete Selecionado:
                      </label>
                      <select
                        value={activeTenantId}
                        onChange={(e) => setSuperAdminActiveTenant(e.target.value)}
                        className="w-full bg-slate-900 border border-indigo-700/60 text-indigo-100 text-xs font-semibold rounded-xl p-2.5 outline-none focus:border-indigo-400 cursor-pointer shadow-inner"
                      >
                        {allTenants.map((t) => (
                          <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100">
                            {t.name} {t.isPrimary ? "(Principal)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Seletor de Lotação do Gabinete Selecionado */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        Lotação / Comarca:
                      </label>
                      <select
                        value={currentUnitId}
                        onChange={(e) => {
                          const unitId = e.target.value;
                          const unit = displayUnits.find((u: any) => u.id === unitId);
                          if (unit) setActiveUnit(unit);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold rounded-xl p-2.5 outline-none focus:border-emerald-500 cursor-pointer shadow-inner"
                      >
                        {displayUnits.map((u: any) => (
                          <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <select
                    value={currentUnitId}
                    onChange={(e) => {
                      const unitId = e.target.value;
                      const unit = displayUnits.find((u: any) => u.id === unitId);
                      if (unit) setActiveUnit(unit);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold rounded-xl p-2.5 outline-none focus:border-emerald-500 cursor-pointer shadow-inner"
                  >
                    {displayUnits.map((u: any) => (
                      <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                        {u.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Perfil do Usuário */}
                {user && (
                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={userName} 
                          className={`w-7 h-7 rounded-full object-cover shrink-0 ${
                            isJudge 
                              ? "border-2 border-amber-400 ring-1 ring-amber-500/40" 
                              : isSuperAdmin 
                                ? "border-2 border-indigo-400" 
                                : isAdmin 
                                  ? "border-2 border-blue-400" 
                                  : "border border-slate-700"
                          }`}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          isJudge 
                            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 ring-1 ring-amber-300" 
                            : isSuperAdmin 
                              ? "bg-indigo-900 border border-indigo-500/50 text-indigo-200" 
                              : isAdmin 
                                ? "bg-blue-900 border border-blue-500/50 text-blue-200" 
                                : "bg-slate-800 border border-slate-700 text-emerald-400"
                        }`}>
                          {isJudge ? <Crown className="w-3.5 h-3.5" /> : userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-white text-xs truncate max-w-[130px] sm:max-w-[180px]">{userName}</p>
                          {isJudge ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-xs flex items-center gap-0.5 shrink-0">
                              <Crown className="w-2.5 h-2.5 text-slate-950" />
                              Juiz Titular
                            </span>
                          ) : isSuperAdmin ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0 flex items-center gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5 text-indigo-400" />
                              Super ADM
                            </span>
                          ) : isAdmin ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0 flex items-center gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5 text-blue-400" />
                              ADM
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                              Assessor
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAction(signOut)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white text-[10px] font-bold border border-rose-800/50 flex items-center gap-1 transition shrink-0 cursor-pointer shadow-xs active:scale-95"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 2. PROMPT ATIVO NO MOBILE */}
              {activePromptTitle && (
                <div 
                  onClick={() => handleAction(onOpenPromptManager)}
                  className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between gap-2 cursor-pointer active:scale-98 transition"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase">
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      <span>Prompt Ativo</span>
                    </div>
                    <p className="font-bold text-white text-xs truncate">{activePromptTitle}</p>
                  </div>
                  {activePromptType && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-900/80 text-emerald-200 font-bold text-[9px] uppercase tracking-wider shrink-0 border border-emerald-500/30">
                      {activePromptType}
                    </span>
                  )}
                </div>
              )}

              {/* 3. SEÇÃO: AÇÕES PRINCIPAIS */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Ações do Processo
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {onGoHome && (
                    <button
                      onClick={() => handleAction(onGoHome)}
                      className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition"
                    >
                      <Home className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Nova Análise</span>
                    </button>
                  )}

                  {(isSuperAdmin || isJudge) && onOpenMinuteAuditor && (
                    <button
                      id="btn-header-minute-auditor-mobile"
                      onClick={() => handleAction(onOpenMinuteAuditor)}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 border border-amber-300 shadow-md shadow-amber-500/20 transition col-span-2"
                      title="Lupa do Magistrado & Auditor de Minutas (Auditoria Ouro)"
                    >
                      <ShieldCheck className="w-4 h-4 text-slate-950 shrink-0" />
                      <span>Auditoria Ouro (Lupa do Juiz)</span>
                    </button>
                  )}

                  {onOpenPresentation && (
                    <button
                      onClick={() => handleAction(onOpenPresentation)}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-violet-900/60 to-indigo-900/60 text-white font-bold text-xs flex items-center gap-2 border border-indigo-500/40 transition"
                    >
                      <Gem className="w-4 h-4 text-violet-300 shrink-0" />
                      <span>Apresentação</span>
                    </button>
                  )}

                  {onOpenXRay && (
                    <button
                      onClick={() => handleAction(onOpenXRay)}
                      className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-300 font-bold text-xs flex items-center gap-2 border border-slate-700 transition"
                    >
                      <BrainCircuit className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Raio-X</span>
                    </button>
                  )}

                  {onOpenHistory && (
                    <button
                      onClick={() => handleAction(onOpenHistory)}
                      className="p-2.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 font-bold text-xs flex items-center gap-2 border border-indigo-800/50 transition"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Histórico</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4. SEÇÃO: REPOSITÓRIO JURÍDICO & PRECEDENTES */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Repositório Jurídico
                </span>
                <div className="space-y-1.5">
                  {onOpenTeses && (
                    <button
                      onClick={() => handleAction(onOpenTeses)}
                      className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-between border border-slate-700 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <Scale className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Teses & Modelos Paradigma</span>
                      </div>
                      {tesesCount > 0 && (
                        <span className="bg-amber-950 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-600/40">
                          {tesesCount}
                        </span>
                      )}
                    </button>
                  )}

                  {onOpenBindingPrecedents && (
                    <button
                      id="btn-header-binding-precedents"
                      onClick={() => handleAction(onOpenBindingPrecedents)}
                      className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2.5 border border-slate-700 transition"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Súmulas, Teses & Informativos TJGO</span>
                    </button>
                  )}

                  {onOpenLegislativeLookup && (
                    <button
                      onClick={() => handleAction(onOpenLegislativeLookup)}
                      className="w-full p-2.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900 text-indigo-200 font-bold text-xs flex items-center gap-2.5 border border-indigo-700/50 transition"
                    >
                      <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Pesquisa Legislativa & Consectários</span>
                    </button>
                  )}

                  {onOpenProjudiGuide && (
                    <button
                      onClick={() => handleAction(onOpenProjudiGuide)}
                      className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2.5 border border-slate-700 transition"
                    >
                      <ClipboardList className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Guia de Lançamentos PROJUDI</span>
                    </button>
                  )}

                  {onOpenCalendar && (
                    <button
                      onClick={() => handleAction(onOpenCalendar)}
                      className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2.5 border border-slate-700 transition"
                    >
                      <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Agenda & Audiências do Gabinete</span>
                    </button>
                  )}

                  {onOpenHearingWorkbench && (
                    <button
                      onClick={() => handleAction(onOpenHearingWorkbench)}
                      className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2.5 border border-slate-700 transition"
                    >
                      <Gavel className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Mesa de Audiências</span>
                    </button>
                  )}

                  {onOpenPromptManager && (
                    <button
                      onClick={() => handleAction(onOpenPromptManager)}
                      className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2.5 border border-slate-700 transition"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Gerenciador de Prompts</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 5. SEÇÃO: GESTÃO & CONFIGURAÇÕES */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Gestão & Suporte
                </span>
                <div className="space-y-1.5">
                  {isSuperAdmin && onOpenSuperAdmin && (
                    <button
                      onClick={() => handleAction(onOpenSuperAdmin)}
                      className="w-full p-2.5 rounded-xl bg-gradient-to-r from-indigo-950 to-purple-950 hover:from-indigo-900 hover:to-purple-900 text-indigo-200 font-bold text-xs flex items-center gap-2.5 border border-indigo-500/40 transition"
                    >
                      <Server className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Painel Super Admin SaaS</span>
                    </button>
                  )}

                  {isSuperAdmin && onOpenPetitionPanel && (
                    <button
                      onClick={() => handleAction(onOpenPetitionPanel)}
                      className="w-full p-2.5 rounded-xl bg-gradient-to-r from-indigo-950 via-purple-950 to-indigo-900 hover:from-indigo-900 hover:to-purple-900 text-indigo-200 font-bold text-xs flex items-center justify-between border border-indigo-500/40 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <Scale className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>Módulo Petição & Defesa 360°</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                        Super Admin
                      </span>
                    </button>
                  )}
                  {isAdmin && onOpenUserManager && (
                    <button
                      onClick={() => handleAction(onOpenUserManager)}
                      className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2.5 border border-slate-700 transition"
                    >
                      <Users className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>Equipe & Permissões</span>
                    </button>
                  )}

                  {isAdmin && onOpenUnitManager && (
                    <button
                      onClick={() => handleAction(onOpenUnitManager)}
                      className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2.5 border border-slate-700 transition"
                    >
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Lotações / Comarcas</span>
                    </button>
                  )}

                  {isSuperAdmin && onOpenExtension && (
                    <button
                      onClick={() => handleAction(onOpenExtension)}
                      className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-between border border-slate-700 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <Puzzle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Extensão PROJUDI</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                        <Hammer className="w-2.5 h-2.5 text-amber-400" />
                        Módulo em Construção
                      </span>
                    </button>
                  )}

                  {onOpenApiKeyConfig && (
                    <button
                      onClick={() => handleAction(onOpenApiKeyConfig)}
                      className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-between border border-slate-700 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <Key className={`w-4 h-4 ${hasApiKey ? "text-emerald-400" : "text-amber-400"}`} />
                        <span>Chave API Gemini</span>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        hasApiKey ? "bg-emerald-950 text-emerald-300 border border-emerald-700/60" : "bg-amber-950 text-amber-300 border border-amber-700/60"
                      }`}>
                        {hasApiKey ? "ATIVA" : "GRÁTIS"}
                      </span>
                    </button>
                  )}

                  {onOpenTicketsModal && (
                    <button
                      onClick={() => handleAction(onOpenTicketsModal)}
                      className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-between border border-slate-700 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Central de Chamados & Feedback</span>
                      </div>
                      {tickets && tickets.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                          {tickets.length}
                        </span>
                      )}
                    </button>
                  )}

                  {onOpenManual && (
                    <button
                      onClick={() => handleAction(onOpenManual)}
                      className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2.5 border border-slate-700 transition"
                    >
                      <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Manual do Sistema & Guia</span>
                    </button>
                  )}

                  {onToggleGuide && (
                    <button
                      onClick={() => handleAction(onToggleGuide)}
                      className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-between border border-slate-700 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <Bot className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Tutor IA</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{isGuideVisible ? "ON" : "OFF"}</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Rodapé da Gaveta */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500">
              Assessor Judicial • Navegação Otimizada para Todos os Dispositivos
            </div>

          </div>
        </div>
      )}
    </header>
  );
};

