import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  FileText,
  Calendar,
  Hash,
  Trash2,
  ArrowRight,
  Home,
  Users,
  RefreshCw,
  AlertTriangle,
  Download,
  Upload,
  CheckCircle2,
  Layers,
  Scale,
  MessageSquare,
  User,
  Clock,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  GitCommit,
  Tag,
  Sliders,
  Edit3,
  MapPin,
  Building2,
  Plus,
  Loader2,
} from "lucide-react";
import {
  SavedAnalysis,
  getHistory,
  deleteFromHistory,
  deleteDossierFromHistory,
  exportHistoryJson,
  importHistoryFromJson,
  isCorruptedHistoryItem,
} from "../utils/historyDb";
import { auth } from "../lib/firebase";
import { getUserProfile } from "../lib/firestoreUtils";
import { UserProfile, ProcessDossier } from "../types";
import { useAuth } from "../lib/AuthContext";
import { groupAnalysesIntoDossiers } from "../utils/dossierUtils";
import { detectPromptCategory } from "../utils/promptCategoryHelper";
import { ProcessTimelineModal } from "./ProcessTimelineModal";
import { EditProcessUnitModal } from "./EditProcessUnitModal";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadAnalysis: (analysis: SavedAnalysis) => void;
  onGoHome?: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onLoadAnalysis,
  onGoHome,
}) => {
  const { allowedUnits, isAdmin, activeUnit } = useAuth();
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [actFilter, setActFilter] = useState<"todos" | "sentenca" | "decisao" | "despacho">("todos");
  const [categoryFilter, setCategoryFilter] = useState<"todos" | "civel" | "fazenda" | "criminal" | "familia" | "infancia" | "outros">("todos");
  const [scopeFilter, setScopeFilter] = useState<"todos" | "meus">("todos");
  const [viewMode, setViewMode] = useState<"dossiers" | "flat">("dossiers");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SavedAnalysis | null>(null);
  const [dossierToDelete, setDossierToDelete] = useState<ProcessDossier | null>(null);
  const [editingUnitProcess, setEditingUnitProcess] = useState<{
    processNumber: string;
    currentUnit?: string;
    currentUnitId?: string;
    currentCategory?: string;
    analysisId?: string;
  } | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTimelineDossier, setActiveTimelineDossier] = useState<ProcessDossier | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actFilter, categoryFilter, scopeFilter, viewMode]);

  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    if (isOpen) {
      if (auth.currentUser) {
        getUserProfile(auth.currentUser.uid).then(setUserProfile).catch(() => {});
      }
      loadHistory();
      const timer = setInterval(() => {
        getHistory().then((data) => {
          setHistory(data);
        }).catch(() => {});
      }, 8000);
      return () => clearInterval(timer);
    }
  }, [isOpen, activeUnit?.id]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await getHistory();
      setHistory(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDelete = (item: SavedAnalysis, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(item);
  };

  const handleOpenDeleteDossier = (dossier: ProcessDossier, e: React.MouseEvent) => {
    e.stopPropagation();
    setDossierToDelete(dossier);
  };

  const handleDirectDeleteAnalysis = async (item: SavedAnalysis) => {
    if (!item) return;
    const id = item.id;
    setHistory((prev) => prev.filter((it) => it.id !== id));
    
    // If timeline is open, update its internal dossier view immediately
    if (activeTimelineDossier) {
      const remainingAnalyses = activeTimelineDossier.analyses.filter((a) => a.id !== id);
      if (remainingAnalyses.length === 0) {
        setActiveTimelineDossier(null);
      } else {
        setActiveTimelineDossier({
          ...activeTimelineDossier,
          analyses: remainingAnalyses,
          totalActs: remainingAnalyses.length,
          lastDate: remainingAnalyses[remainingAnalyses.length - 1]?.date || activeTimelineDossier.lastDate,
        });
      }
    }

    try {
      await deleteFromHistory(id);
      showFeedback(`Ato judicial "${item.result?.minute?.title || item.promptTitle}" excluído com sucesso.`);
    } catch (err: any) {
      showFeedback(`Erro ao remover análise: ${err.message}`);
      loadHistory();
    }
  };

  const handleDirectDeleteDossier = async (dossier: ProcessDossier) => {
    if (!dossier) return;
    const ids = dossier.analyses.map((a) => a.id);
    setHistory((prev) => prev.filter((item) => !ids.includes(item.id)));
    if (activeTimelineDossier?.id === dossier.id) {
      setActiveTimelineDossier(null);
    }
    try {
      await deleteDossierFromHistory(dossier.processNumber);
      for (const id of ids) {
        await deleteFromHistory(id);
      }
      showFeedback(`Evolução cronológica do processo ${dossier.processNumber} (${ids.length} atos) excluída com sucesso de todos os dispositivos.`);
    } catch (err: any) {
      showFeedback(`Erro ao remover dossiê: ${err.message}`);
      loadHistory();
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    const target = itemToDelete;
    setIsDeleting(true);
    try {
      await handleDirectDeleteAnalysis(target);
      setItemToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteDossier = async () => {
    if (!dossierToDelete || isDeleting) return;
    const target = dossierToDelete;
    setIsDeleting(true);
    try {
      await handleDirectDeleteDossier(target);
      setDossierToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleExport = () => {
    if (history.length === 0) return;
    exportHistoryJson(history);
    showFeedback(`Backup de ${history.length} análise(s) baixado com sucesso!`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const count = await importHistoryFromJson(text);
      await loadHistory();
      showFeedback(`${count} análise(s) restaurada(s) e mescladas com sucesso!`);
    } catch (err: any) {
      showFeedback(`Falha ao importar backup: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtragem dos registros
  const filteredHistory = history.filter((item) => {
    if (!item || !item.id || isCorruptedHistoryItem(item)) return false;
    const term = searchTerm.toLowerCase();
    const matchesTerm =
      (item.promptTitle || item.result?.minute?.title || "").toLowerCase().includes(term) ||
      (item.processNumber && item.processNumber.toLowerCase().includes(term)) ||
      (item.creatorName && item.creatorName.toLowerCase().includes(term)) ||
      (item.creatorEmail && item.creatorEmail.toLowerCase().includes(term)) ||
      (item.result?.minute?.parties?.author && item.result.minute.parties.author.toLowerCase().includes(term)) ||
      (item.result?.minute?.parties?.defendant && item.result.minute.parties.defendant.toLowerCase().includes(term));

    if (!matchesTerm) return false;

    if (scopeFilter === "meus") {
      if (currentUid && item.createdBy !== currentUid) return false;
    }

    if (categoryFilter !== "todos") {
      const detected = detectPromptCategory(item);
      if (detected.category !== categoryFilter) return false;
    }

    if (actFilter === "todos") return true;
    const titleUpper = (item.result?.minute?.title || item.promptTitle || "").toUpperCase();
    if (actFilter === "sentenca") return titleUpper.includes("SENTENÇA") || titleUpper.includes("SENTENCA");
    if (actFilter === "decisao") return titleUpper.includes("DECISÃO") || titleUpper.includes("DECISAO");
    if (actFilter === "despacho") return titleUpper.includes("DESPACHO");
    return true;
  });

  // Agrupamento em dossiês unificados por processo (sem duplicação!)
  const processDossiers = groupAnalysesIntoDossiers(filteredHistory);

  const currentTotal = viewMode === "dossiers" ? processDossiers.length : filteredHistory.length;
  const totalPages = Math.ceil(currentTotal / itemsPerPage) || 1;
  const paginatedDossiers = processDossiers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedFlat = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-4xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border-0 sm:border border-slate-200 relative">
        
        {/* Header */}
        <div className="px-3.5 py-3 sm:px-5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-2xs shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">Histórico & Dossiês</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold flex items-center gap-1 border border-emerald-200 whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span className="hidden sm:inline">Banco Conectado</span>
                  <span className="sm:hidden">Online</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 sm:line-clamp-none mt-0.5">
                Processos unificados por número único com linha do tempo de atos do gabinete.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
            {onGoHome && (
              <button
                onClick={() => {
                  onClose();
                  onGoHome();
                }}
                className="hidden sm:flex px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs items-center gap-1.5 transition cursor-pointer border border-slate-200"
                title="Ir para a Página Inicial"
              >
                <Home className="w-3.5 h-3.5 text-slate-900" />
                <span>Página Inicial</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert if present */}
        {feedbackMessage && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs font-semibold text-slate-900 flex items-center gap-2 animate-in fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" />
            <span className="truncate">{feedbackMessage}</span>
          </div>
        )}

        {/* Action & Filter Bar */}
        <div className="p-2.5 sm:p-4 border-b border-slate-100 bg-white flex flex-col gap-2 sm:gap-3 shrink-0">
          
          {/* Row 1: Search + Utility Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Search Input */}
            <div id="tour-history-search" className="relative flex-1">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar processo, partes, assunto ou assessor..."
                className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            {/* Utility Buttons: Refresh, Export, Import */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={loadHistory}
                disabled={isLoading}
                className="p-1.5 sm:p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                title="Atualizar lista do histórico"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
              </button>

              <button
                onClick={handleExport}
                disabled={history.length === 0}
                className="p-1.5 sm:px-2.5 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                title="Fazer download de backup do histórico (.json)"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden md:inline">Baixar</span>
              </button>

              <label
                className="p-1.5 sm:px-2.5 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                title="Restaurar / importar histórico de um arquivo .json"
              >
                <Upload className="w-3.5 h-3.5 text-slate-900" />
                <span className="hidden md:inline">Importar</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Row 2: View Mode Toggle & Scope Filter (side-by-side or scrollable on mobile) */}
          <div className="flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {/* View Mode Toggle: Agrupado por Processo (Dossiês) vs Atos Isolados */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 text-xs shrink-0">
              <button
                onClick={() => setViewMode("dossiers")}
                className={`px-2 sm:px-3 py-1 rounded-lg font-bold text-[11px] sm:text-xs transition cursor-pointer flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  viewMode === "dossiers"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Agrupa todos os atos do mesmo processo em um único cartão com linha do tempo"
              >
                <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Dossiês ({processDossiers.length})</span>
              </button>
              <button
                onClick={() => setViewMode("flat")}
                className={`px-2 sm:px-3 py-1 rounded-lg font-bold text-[11px] sm:text-xs transition cursor-pointer flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  viewMode === "flat"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Exibe a lista plana de todos os atos individuais"
              >
                <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Atos Isolados ({filteredHistory.length})</span>
              </button>
            </div>

            {/* Scope Filter: Gabinete vs Meus */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 text-xs shrink-0">
              <button
                onClick={() => setScopeFilter("todos")}
                className={`px-2 sm:px-3 py-1 rounded-lg font-bold text-[11px] sm:text-xs transition cursor-pointer flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  scopeFilter === "todos"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Gabinete</span>
              </button>
              <button
                onClick={() => setScopeFilter("meus")}
                className={`px-2 sm:px-3 py-1 rounded-lg font-bold text-[11px] sm:text-xs transition cursor-pointer flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                  scopeFilter === "meus"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Minhas</span>
              </button>
            </div>
          </div>

          {/* Filter Pills: Tipos de Atos & Áreas/Competências */}
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-100">
            {/* Row 1: Act Types */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-xs py-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-500" />
                Ato:
              </span>
              {(["todos", "sentenca", "decisao", "despacho"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActFilter(type)}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-bold text-[10px] sm:text-[11px] capitalize transition cursor-pointer whitespace-nowrap shrink-0 ${
                    actFilter === type
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {type === "todos" ? "Todos os Atos" : type === "sentenca" ? "Sentenças" : type === "decisao" ? "Decisões" : "Despachos"}
                </button>
              ))}
            </div>

            {/* Row 2: Category / Competence Filter */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-xs py-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-500" />
                Vara:
              </span>
              {[
                { id: "todos", label: "Todas as Varas" },
                { id: "civel", label: "Cível & JEC" },
                { id: "fazenda", label: "Fazenda Pública" },
                { id: "criminal", label: "Criminal" },
                { id: "familia", label: "Família" },
                { id: "infancia", label: "Infância" },
                { id: "outros", label: "Outros" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id as any)}
                  className={`px-2 py-0.5 rounded-lg font-semibold text-[10px] transition cursor-pointer whitespace-nowrap shrink-0 ${
                    categoryFilter === cat.id
                      ? "bg-slate-800 text-white font-bold shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-slate-50/70">
          
          {/* Empty State */}
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center space-y-3 bg-white rounded-2xl border border-dashed border-slate-200 p-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Layers className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {history.length === 0 ? "Nenhum processo salvo no histórico" : "Nenhum resultado para os filtros atuais"}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {history.length === 0
                    ? "Quando você elaborar minutas para um processo, o sistema criará o dossiê unificado automaticamente aqui."
                    : "Tente limpar os termos de busca ou alterar os filtros."}
                </p>
              </div>
            </div>
          ) : viewMode === "dossiers" ? (
            
            /* VIEW MODE 1: UNIFIED PROCESS DOSSIERS (ZERO DUPLICATES) */
            <div id="tour-history-list" className="grid grid-cols-1 gap-3">
              {paginatedDossiers.map((dossier) => {
                const latestAct = dossier.analyses[dossier.analyses.length - 1];
                const canDelete = isAdmin || dossier.analyses.some(a => currentUid && a.createdBy === currentUid);
                const hasMultipleActs = dossier.totalActs > 1;

                return (
                  <div
                    key={dossier.id}
                    className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-md transition flex flex-col justify-between space-y-2 sm:space-y-3 group"
                  >
                    <div>
                      {/* Top Header of the Dossier Card */}
                      <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-1">
                        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1 font-mono text-[11px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-900 px-2 py-0.5 rounded-md">
                            <Hash className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span className="truncate max-w-[140px] sm:max-w-[200px]">{dossier.processNumber}</span>
                            <button
                              onClick={(e) => handleCopy(dossier.processNumber, dossier.id, e)}
                              className="text-indigo-400 hover:text-indigo-700 ml-0.5"
                              title="Copiar número do processo"
                            >
                              {copiedId === dossier.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>

                          {latestAct && (() => {
                            const cat = detectPromptCategory(latestAct);
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingUnitProcess({
                                    processNumber: dossier.processNumber,
                                    currentUnit: dossier.judicialUnit || latestAct?.result?.minute?.judicialUnit,
                                    currentUnitId: dossier.unitId || latestAct?.unitId,
                                    currentCategory: cat.category,
                                  });
                                }}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 hover:brightness-95 transition cursor-pointer ${cat.badgeColor}`}
                                title={`Vara: ${cat.label} (Clique para alterar a Vara/Competência)`}
                              >
                                <Tag className="w-3 h-3" />
                                <span>{cat.label}</span>
                                <Edit3 className="w-2.5 h-2.5 opacity-70 ml-0.5" />
                              </button>
                            );
                          })()}

                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 border ${
                            hasMultipleActs
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            <GitCommit className="w-3 h-3 shrink-0" />
                            <span>{dossier.totalActs} {dossier.totalActs === 1 ? "Ato" : "Atos"}</span>
                          </span>

                          {dossier.paradigmsUsed.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold flex items-center gap-1" title={`Paradigma do Juiz: ${dossier.paradigmsUsed.map(p => p.title).join(", ")}`}>
                              <Scale className="w-3 h-3 text-amber-700 shrink-0" />
                              <span>{dossier.paradigmsUsed.length} Paradigma(s)</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleOpenDeleteDossier(dossier, e)}
                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
                          title="Excluir dossiê do processo do histórico"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>

                      {/* Parties */}
                      <p className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                        {dossier.parties?.author || "Parte Autora"} <span className="text-indigo-600 font-semibold">vs</span> {dossier.parties?.defendant || "Parte Ré"}
                      </p>

                      {/* Judicial Unit / Comarca Badge */}
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {dossier.judicialUnit || latestAct?.result?.minute?.judicialUnit ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold shadow-2xs">
                            <span className="text-slate-900 text-xs">📍</span>
                            <span className="truncate max-w-[260px]">
                              {dossier.judicialUnit || latestAct?.result?.minute?.judicialUnit}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const cat = latestAct ? detectPromptCategory(latestAct) : undefined;
                                setEditingUnitProcess({
                                  processNumber: dossier.processNumber,
                                  currentUnit: dossier.judicialUnit || latestAct?.result?.minute?.judicialUnit || "",
                                  currentUnitId: dossier.unitId || latestAct?.unitId || "montes_claros",
                                  currentCategory: cat?.category,
                                });
                              }}
                              className="ml-1 text-indigo-700 hover:text-indigo-900 p-0.5 rounded hover:bg-indigo-50 transition cursor-pointer flex items-center gap-0.5 text-[10px] font-extrabold"
                              title="Alterar Vara / Unidade / Comarca deste Processo"
                            >
                              <Edit3 className="w-3 h-3 text-indigo-600" />
                              <span className="hidden sm:inline">Mudar Vara/Lotação</span>
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold">
                            <span className="text-amber-600 text-xs">📍</span>
                            <span>Sem Comarca/Vara</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const cat = latestAct ? detectPromptCategory(latestAct) : undefined;
                                setEditingUnitProcess({
                                  processNumber: dossier.processNumber,
                                  currentUnit: "",
                                  currentUnitId: "montes_claros",
                                  currentCategory: cat?.category,
                                });
                              }}
                              className="ml-1 px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Cadastrar Unidade / Vara para este Processo"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Definir Vara/Comarca</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Prompt Utilizado */}
                      {latestAct && (
                        <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-center gap-2 text-xs">
                          <Sliders className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Prompt:</span>
                            <span className="text-xs font-bold text-indigo-950 truncate">
                              {latestAct.promptTitle || latestAct.result?.minute?.title || "Análise Judicial Padrão"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* List of distinct Act Types included in this dossier */}
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        {dossier.actTypes.map((actType, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium"
                          >
                            {actType}
                          </span>
                        ))}
                      </div>

                      {/* Mini Stepper Preview if Multiple Acts */}
                      {hasMultipleActs && (
                        <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span>Evolução Cronológica</span>
                            <span>{dossier.analyses.length} Minutas no Dossiê</span>
                          </div>
                          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                            {dossier.analyses.map((act, actIdx) => (
                              <button
                                key={act.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onLoadAnalysis(act);
                                  onClose();
                                }}
                                className="px-2 py-0.5 rounded bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-[10px] font-semibold text-slate-700 hover:text-indigo-700 whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0"
                                title={`Carregar Ato #${actIdx + 1}: ${act.result?.minute?.title || act.promptTitle}`}
                              >
                                <span>#{actIdx + 1}</span>
                                <span className="truncate max-w-[80px]">{act.result?.minute?.title || act.promptTitle}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions & Dates */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>Último ato: {new Date(dossier.lastDate).toLocaleDateString()} {new Date(dossier.lastDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {dossier.creators.join(", ")}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap sm:flex-nowrap">
                        <button
                          onClick={() => setActiveTimelineDossier(dossier)}
                          className="flex-1 sm:flex-initial justify-center px-2.5 sm:px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                          title="Ver linha do tempo completa e todos os atos do processo"
                        >
                          <GitCommit className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Linha do Tempo ({dossier.totalActs})</span>
                        </button>

                        <button
                          onClick={() => {
                            if (latestAct) {
                              onLoadAnalysis(latestAct);
                              onClose();
                            }
                          }}
                          className="flex-1 sm:flex-initial justify-center px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer whitespace-nowrap"
                          title="Carregar a última minuta elaborada deste processo"
                        >
                          <span>Carregar Minuta</span>
                          <ArrowRight className="w-3 h-3 shrink-0" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          ) : (

            /* VIEW MODE 2: FLAT LIST OF ALL ACTS */
            <div id="tour-history-flat-list" className="grid grid-cols-1 gap-3">
              {paginatedFlat.map((item) => {
                const parties = item.result?.minute?.parties;
                const actTitle = item.result?.minute?.title || item.promptTitle || "MINUTA JUDICIAL";
                const isMine = currentUid && item.createdBy === currentUid;
                const canDelete = isAdmin || isMine;
                const hasChat = item.chatMessages && item.chatMessages.length > 0;
                
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onLoadAnalysis(item);
                      onClose();
                    }}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono text-[10px] font-bold">
                            {actTitle}
                          </span>
                          {(() => {
                            const cat = detectPromptCategory(item);
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingUnitProcess({
                                    processNumber: item.processNumber || item.result?.minute?.processNumber || "Processo s/ nº",
                                    currentUnit: item.result?.minute?.judicialUnit || "",
                                    currentUnitId: item.unitId || "montes_claros",
                                    currentCategory: cat.category,
                                    analysisId: item.id,
                                  });
                                }}
                                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 hover:brightness-95 transition cursor-pointer ${cat.badgeColor}`}
                                title={`Vara: ${cat.label} (Clique para alterar Vara/Lotação)`}
                              >
                                <Tag className="w-2.5 h-2.5" />
                                <span>{cat.label}</span>
                                <Edit3 className="w-2 h-2 opacity-70 ml-0.5" />
                              </button>
                            );
                          })()}
                          {item.result?.paradigmUsed && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold flex items-center gap-1">
                              <Scale className="w-3 h-3 text-amber-700" />
                              <span>Paradigma</span>
                            </span>
                          )}
                          {hasChat && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-800 border border-slate-200 text-[10px] font-bold flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-slate-900" />
                              <span>Chat ({item.chatMessages?.length})</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleOpenDelete(item, e)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
                          title="Excluir do histórico"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-indigo-700 transition line-clamp-2">
                        {Boolean(item.promptTitle?.includes('[SENTENÇA DO MUTIRÃO PREVIDENCIÁRIO]')) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-600 border border-orange-500/30 mr-1.5 inline-block font-bold">
                            SENTENÇA DO MUTIRÃO PREVIDENCIÁRIO
                          </span>
                        )}
                        {(item.promptTitle || item.result?.minute?.title || "Ato Judicial").replace('[SENTENÇA DO MUTIRÃO PREVIDENCIÁRIO]', '').trim()}
                      </h3>

                      {parties && (parties.author || parties.defendant) && (
                        <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-1">
                          <strong className="text-slate-700">{parties.author || "Autor"}</strong> vs <strong className="text-slate-700">{parties.defendant || "Réu"}</strong>
                        </p>
                      )}

                      {/* Judicial Unit / Comarca Tag */}
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {item.result?.minute?.judicialUnit ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold">
                            <span className="text-slate-900">📍</span>
                            <span className="truncate max-w-[220px]">{item.result.minute.judicialUnit}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const cat = detectPromptCategory(item);
                                setEditingUnitProcess({
                                  processNumber: item.processNumber || item.result?.minute?.processNumber || "Processo s/ nº",
                                  currentUnit: item.result?.minute?.judicialUnit || "",
                                  currentUnitId: item.unitId || "montes_claros",
                                  currentCategory: cat.category,
                                  analysisId: item.id,
                                });
                              }}
                              className="ml-0.5 text-indigo-700 hover:text-indigo-900 p-0.5 rounded hover:bg-indigo-50 transition cursor-pointer"
                              title="Alterar Vara / Unidade deste Ato"
                            >
                              <Edit3 className="w-2.5 h-2.5 text-indigo-600" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-medium">
                            <span className="text-amber-600">📍</span>
                            <span>Sem Comarca</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const cat = detectPromptCategory(item);
                                setEditingUnitProcess({
                                  processNumber: item.processNumber || item.result?.minute?.processNumber || "Processo s/ nº",
                                  currentUnit: "",
                                  currentUnitId: "montes_claros",
                                  currentCategory: cat.category,
                                  analysisId: item.id,
                                });
                              }}
                              className="ml-1 text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer text-[9px]"
                            >
                              + Definir Vara/Lotação
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                          <Hash className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[150px]">{item.processNumber || "Processo s/ nº"}</span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">
                            {item.creatorName || item.creatorEmail?.split("@")[0] || "Gabinete"}
                          </span>
                          {isMine && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1 rounded font-bold">
                              Você
                            </span>
                          )}
                        </div>

                        <div className="flex items-center text-[11px] font-bold text-indigo-600 gap-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition">
                          <span>Carregar Minuta</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Pagination Bar */}
        {currentTotal > itemsPerPage && (
          <div className="px-3 sm:px-5 py-1.5 sm:py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
            <span className="text-slate-500 text-[10px] sm:text-xs">
              <span className="font-bold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, currentTotal)}</span> de <span className="font-bold text-slate-700">{currentTotal}</span> {viewMode === "dossiers" ? "processos" : "atos"}
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                className="p-1 sm:p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Página Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <span className="px-1.5 sm:px-2 font-bold text-[11px] sm:text-xs text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                className="p-1 sm:p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Próxima Página"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-3 sm:px-5 py-2 sm:py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 shrink-0">
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium text-center sm:text-left">
            <strong>{processDossiers.length}</strong> processo(s) • <strong>{history.length}</strong> ato(s) no Firestore
          </span>
          {onGoHome && (
            <button
              onClick={() => {
                onClose();
                onGoHome();
              }}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Voltar para Página Inicial</span>
            </button>
          )}
        </div>

        {/* Timeline Modal for a specific process */}
        {activeTimelineDossier && (
          <ProcessTimelineModal
            isOpen={Boolean(activeTimelineDossier)}
            onClose={() => setActiveTimelineDossier(null)}
            dossier={activeTimelineDossier}
            onLoadAnalysis={(analysis) => {
              onLoadAnalysis(analysis);
              setActiveTimelineDossier(null);
              onClose();
            }}
            onDeleteAnalysis={(analysis) => {
              handleDirectDeleteAnalysis(analysis);
            }}
            onDeleteDossier={(dossier) => {
              handleDirectDeleteDossier(dossier);
            }}
            isAdmin={isAdmin}
          />
        )}

        {/* In-App Confirmation Modal for Deleting Single Item */}
        {itemToDelete && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Excluir esta Análise?</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Deseja remover <strong>{itemToDelete.promptTitle || itemToDelete.result?.minute?.title || "este ato"}</strong> ({itemToDelete.processNumber || "Processo"}) do histórico do banco de dados?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setItemToDelete(null)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Sim, Excluir</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* In-App Confirmation Modal for Deleting Entire Dossier / Chronological Evolution */}
        {dossierToDelete && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-70 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Excluir Toda a Evolução Cronológica?</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Deseja excluir definitivamente toda a cadeia de atos vinculados do processo <strong>{dossierToDelete.processNumber}</strong> (total de <strong>{dossierToDelete.totalActs} ato(s)</strong>) do histórico?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setDossierToDelete(null)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteDossier}
                  disabled={isDeleting}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Sim, Excluir Evolução</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Alteração de Vara e Lotação do Processo */}
        {editingUnitProcess && (
          <EditProcessUnitModal
            isOpen={!!editingUnitProcess}
            onClose={() => setEditingUnitProcess(null)}
            processNumber={editingUnitProcess.processNumber}
            currentJudicialUnit={editingUnitProcess.currentUnit}
            currentUnitId={editingUnitProcess.currentUnitId}
            currentCategory={editingUnitProcess.currentCategory}
            analysisId={editingUnitProcess.analysisId}
            allowedUnits={allowedUnits}
            onUnitUpdated={async (updated) => {
              showFeedback(`Vara e Lotação do processo ${editingUnitProcess.processNumber} atualizadas com sucesso!`);
              await loadHistory();
            }}
          />
        )}

      </div>
    </div>
  );
};
