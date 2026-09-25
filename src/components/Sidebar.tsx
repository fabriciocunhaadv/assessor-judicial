import React, { useState } from "react";
import {
  Home, ShieldCheck, UserCheck, Activity, History, Scale,
  Sparkles, BookOpen, ClipboardList, Calendar, Gavel, SlidersHorizontal,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";

// Props will mirror the relevant ones from Header
interface SidebarProps {
  onGoHome?: () => void;
  onOpenMinuteAuditor?: () => void;
  onOpenPresentation?: () => void;
  onOpenXRay?: () => void;
  onOpenHistory?: () => void;
  onOpenTeses?: () => void;
  onOpenBindingPrecedents?: () => void;
  onOpenLegislativeLookup?: () => void;
  onOpenProjudiGuide?: () => void;
  onOpenCalendar?: () => void;
  onOpenHearingWorkbench?: () => void;
  onOpenPromptManager?: () => void;
  tesesCount?: number;
  isJudge?: boolean;
  isSuperAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onGoHome, onOpenMinuteAuditor, onOpenPresentation, onOpenXRay, onOpenHistory,
  onOpenTeses, onOpenBindingPrecedents, onOpenLegislativeLookup, onOpenProjudiGuide,
  onOpenCalendar, onOpenHearingWorkbench, onOpenPromptManager,
  tesesCount = 0, isJudge, isSuperAdmin
}) => {
  const { isJudge: authIsJudge, isSuperAdmin: authIsSuperAdmin } = useAuth();
  const effectiveIsSuperAdmin = isSuperAdmin ?? authIsSuperAdmin;
  const effectiveIsJudge = isJudge ?? authIsJudge;
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <div className={`transition-all duration-300 ease-in-out border-r border-slate-300/30 dark:border-slate-800 bg-white dark:bg-[#0b111a] flex flex-col h-screen ${isCollapsed ? 'w-16' : 'w-64'} shrink-0 z-40 hidden md:flex relative`}>
      {/* Collapse Toggle */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full p-1 shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-50"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" /> : <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
      </button>

      <div className="p-4 flex flex-col gap-6 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pt-6">
        
        {/* GRUPO 1: AÇÕES PRINCIPAIS */}
        <div className="flex flex-col gap-1.5">
          {!isCollapsed && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-2 mb-1">Ações Principais</span>}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className={`flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              title="Nova Análise"
            >
              <Home className="w-4 h-4 text-emerald-500" />
              {!isCollapsed && <span>Nova Análise</span>}
            </button>
          )}

          {(effectiveIsSuperAdmin || effectiveIsJudge) && onOpenMinuteAuditor && (
            <button
              id="btn-sidebar-minute-auditor"
              onClick={onOpenMinuteAuditor}
              className={`flex items-center gap-2.5 px-3 h-10 rounded-xl bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/20 hover:from-amber-200 hover:to-amber-100 dark:hover:from-amber-900/60 dark:hover:to-amber-800/40 text-amber-900 dark:text-amber-100 font-bold text-xs transition cursor-pointer border border-amber-200 dark:border-amber-500/30 ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              title="Auditoria Ouro (Lupa do Magistrado & Auditor de Minutas)"
            >
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              {!isCollapsed && <span>Auditoria Ouro</span>}
            </button>
          )}

          {onOpenPresentation && (
            <button
              onClick={onOpenPresentation}
              className={`flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              title="Conheça o Assessor"
            >
              <UserCheck className="w-4 h-4 text-purple-500" />
              {!isCollapsed && <span>Conheça o Assessor</span>}
            </button>
          )}

          {onOpenXRay && (
            <button
              onClick={onOpenXRay}
              className={`flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              title="Raio-X da Lotação"
            >
              <Activity className="w-4 h-4 text-blue-500" />
              {!isCollapsed && <span>Raio-X da Lotação</span>}
            </button>
          )}

          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className={`flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              title="Histórico Local"
            >
              <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              {!isCollapsed && <span>Histórico Local</span>}
            </button>
          )}
        </div>

        {/* Separator */}
        <div className="w-full h-px bg-slate-200 dark:bg-slate-800/80 my-2" />

        {/* GRUPO 2: REPOSITÓRIO JURÍDICO & PRECEDENTES */}
        <div className="flex flex-col gap-1.5">
          {!isCollapsed && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-2 mb-1">Repositório Jurídico</span>}
          
          {onOpenTeses && (
            <button
              onClick={onOpenTeses}
              className={`flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              title="Teses & Modelos"
            >
              <Scale className="w-4 h-4 text-amber-500" />
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Teses & Modelos</span>
                  {tesesCount > 0 && (
                    <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {tesesCount}
                    </span>
                  )}
                </div>
              )}
            </button>
          )}

          {onOpenBindingPrecedents && (
            <button
              id="btn-sidebar-binding-precedents"
              onClick={onOpenBindingPrecedents}
              className={`flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              title="Súmulas & Informativos TJGO"
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              {!isCollapsed && <span>Súmulas & TJGO</span>}
            </button>
          )}

          {onOpenLegislativeLookup && (
            <button
              onClick={onOpenLegislativeLookup}
              className={`flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              title="Legislação & Juros"
            >
              <BookOpen className="w-4 h-4 text-indigo-500" />
              {!isCollapsed && <span>Legislação & Juros</span>}
            </button>
          )}

          {onOpenProjudiGuide && (
            <button
              onClick={onOpenProjudiGuide}
              className={`flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              title="PROJUDI"
            >
              <ClipboardList className="w-4 h-4 text-blue-500" />
              {!isCollapsed && <span>PROJUDI</span>}
            </button>
          )}

          {onOpenCalendar && (
            <button
              onClick={onOpenCalendar}
              className={`flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              title="Agenda"
            >
              <Calendar className="w-4 h-4 text-amber-500" />
              {!isCollapsed && <span>Agenda</span>}
            </button>
          )}

          {onOpenHearingWorkbench && (
            <button
              onClick={onOpenHearingWorkbench}
              className={`flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              title="Audiências"
            >
              <Gavel className="w-4 h-4 text-amber-600 dark:text-amber-500" />
              {!isCollapsed && <span>Audiências</span>}
            </button>
          )}

          {onOpenPromptManager && (
            <button
              onClick={onOpenPromptManager}
              className={`flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              title="Prompts"
            >
              <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
              {!isCollapsed && <span>Prompts</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
