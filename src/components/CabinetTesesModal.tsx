import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Scale,
  Save,
  RotateCcw,
  CheckCircle2,
  Plus,
  BookOpen,
  Copy,
  Check,
  Download,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  FileText,
  Search,
  Filter,
  Trash2,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Bookmark,
  Gavel,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  FileUp,
  FilePlus,
  Layers,
  Loader2,
  CheckSquare,
  Square,
  CheckCheck,
  FileCheck,
  HelpCircle,
  RefreshCw,
  ArrowRight,
  Scissors,
  Zap,
  Eye,
  Code,
  Brush,
  SlidersHorizontal,
  Database,
  Target,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CabinetTesesData, SuggestedCabinetThesis, CabinetThesesScanResult } from "../types";
import { KnowledgeBasePanel } from "./KnowledgeBasePanel";
import { saveCabinetTeses, resetCabinetTeses } from "../utils/tesesDb";
import { getHistory } from "../utils/historyDb";
import { getActiveUnitId, globalTenantId, saveParadigmsToDb } from "../lib/firestoreUtils";
import {
  JudgeParadigmModel,
  DEFAULT_JUDGE_PARADIGMS,
} from "../data/defaultParadigms";
import {
  getJudgeParadigms,
  saveJudgeParadigms,
  addJudgeParadigm,
  updateJudgeParadigm,
  deleteJudgeParadigm,
  resetJudgeParadigmsToDefault,
  PARADIGMS_UPDATE_EVENT,
  syncParadigmsWithDb,
} from "../utils/judgeParadigmsDb";
import { useAuth } from "../lib/AuthContext";
import { extractTextFromPdf } from "../utils/pdfExtractor";
import {
  cleanJudicialPdfText,
  cleanDocumentHeaders,
  extractJudicialActionName,
} from "../utils/judicialTextCleaner";
import { getApiHeaders } from "../utils/apiKeyManager";
import {
  analyzeModelCadernoStatus,
  checkDuplicateBeforeInjection,
  CadernoMatchResult,
  DuplicateCheckResult,
} from "../utils/tesesDuplicationHelper";

/**
 * Função utilitária para destacar visualmente trecho selecionado em nós React do Markdown
 */
function highlightSelectedTextInNodes(node: React.ReactNode, search: string): React.ReactNode {
  if (!search || search.trim().length < 3) return node;
  const cleanSearch = search.trim();

  if (typeof node === "string") {
    const lowerNode = node.toLowerCase();
    const lowerSearch = cleanSearch.toLowerCase();
    const idx = lowerNode.indexOf(lowerSearch);

    // Correspondência exata na string
    if (idx !== -1) {
      const before = node.substring(0, idx);
      const match = node.substring(idx, idx + cleanSearch.length);
      const after = node.substring(idx + cleanSearch.length);

      return (
        <>
          {before}
          <mark className="bg-amber-300 dark:bg-amber-400 text-slate-950 font-bold px-1 py-0.5 rounded-sm ring-2 ring-amber-500 shadow-xs selection-highlight-marker inline">
            {match}
          </mark>
          {highlightSelectedTextInNodes(after, cleanSearch)}
        </>
      );
    }

    // Se a busca for um bloco longo e o nó atual for um segmento contido nela
    if (cleanSearch.length > 25 && node.trim().length > 12 && lowerSearch.includes(lowerNode.trim())) {
      return (
        <mark className="bg-amber-200 dark:bg-amber-400/90 text-slate-950 font-semibold px-1 py-0.5 rounded-sm ring-1 ring-amber-400 shadow-2xs selection-highlight-marker inline">
          {node}
        </mark>
      );
    }

    return node;
  }

  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <React.Fragment key={i}>
        {highlightSelectedTextInNodes(child, cleanSearch)}
      </React.Fragment>
    ));
  }

  if (React.isValidElement(node) && (node.props as any)?.children) {
    const element = node as React.ReactElement<any>;
    return React.cloneElement(
      element,
      element.props,
      highlightSelectedTextInNodes(element.props.children, cleanSearch)
    );
  }

  return node;
}

export interface MappedCandidate {
  id: string;
  title: string;
  category: string;
  decisionType: JudgeParadigmModel["decisionType"];
  processNumber?: string;
  summary?: string;
  thesisSnippet?: string;
  fullText: string;
  keyHighlights?: string[];
  status?: "pending" | "saved_paradigm" | "injected_caderno" | "both" | "discarded";
  sourceFileName?: string;
}

interface CabinetTesesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tesesData: CabinetTesesData;
  onTesesUpdated: (data: CabinetTesesData) => void;
  onInjectDirectParadigm?: (text: string, title?: string, modelId?: string) => void;
  initialParadigmDraft?: {
    text: string;
    processNumber?: string;
    category?: string;
    title?: string;
  } | null;
  onClearInitialDraft?: () => void;
}

const DECISION_TYPE_CONFIG: Record<
  JudgeParadigmModel["decisionType"],
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  procedencia: {
    label: "Procedência Total",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
    icon: "✅",
  },
  improcedencia: {
    label: "Improcedência",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-300",
    icon: "❌",
  },
  parcial_procedencia: {
    label: "Parcial Procedência",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
    icon: "⚖️",
  },
  extincao_sem_merito: {
    label: "Extinção sem Resolução do Mérito",
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-300",
    icon: "🚫",
  },
  tutela_deferida: {
    label: "Tutela de Urgência Deferida",
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-300",
    icon: "⚡",
  },
  tutela_indeferida: {
    label: "Tutela de Urgência Indeferida",
    bg: "bg-orange-50",
    text: "text-orange-800",
    border: "border-orange-300",
    icon: "🛑",
  },
  despacho_interlocutoria: {
    label: "Despacho / Decisão Interlocutória",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-300",
    icon: "📄",
  },
};

export const CabinetTesesModal: React.FC<CabinetTesesModalProps> = ({
  isOpen,
  onClose,
  tesesData,
  onTesesUpdated,
  onInjectDirectParadigm,
  initialParadigmDraft,
  onClearInitialDraft,
}) => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"caderno" | "modelos_paradigmas" | "importar_pdf" | "varredura_automatica" | "base_conhecimento">("caderno");
  
  // Tab 1: Caderno de Teses
  const [text, setText] = useState(tesesData.text || "");
  const [isEnabled, setIsEnabled] = useState(tesesData.isEnabled !== false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedCaderno, setCopiedCaderno] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Tab 4: Varredura Automática e Mineração Inteligente do Gabinete (IA)
  const [suggestedTheses, setSuggestedTheses] = useState<SuggestedCabinetThesis[]>([]);
  const [isScanningTheses, setIsScanningTheses] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanStats, setScanStats] = useState<CabinetThesesScanResult["minedStats"] | null>(null);
  const [selectedSuggestedIds, setSelectedSuggestedIds] = useState<Set<string>>(new Set());
  const [expandedSuggestedId, setExpandedSuggestedId] = useState<string | null>(null);
  const [searchSuggestedQuery, setSearchSuggestedQuery] = useState("");
  const [filterSuggestedCategory, setFilterSuggestedCategory] = useState("all");
  const [filterSuggestedDecisionType, setFilterSuggestedDecisionType] = useState("all");
  const [showOnlyInedite, setShowOnlyInedite] = useState(true);

  // Editor Modal para Tese Sugerida antes de Injetar
  const [editingSuggestedThesis, setEditingSuggestedThesis] = useState<SuggestedCabinetThesis | null>(null);
  const [editSuggestedTitle, setEditSuggestedTitle] = useState("");
  const [editSuggestedCategory, setEditSuggestedCategory] = useState("Direito do Consumidor");
  const [editSuggestedDecisionType, setEditSuggestedDecisionType] = useState<JudgeParadigmModel["decisionType"]>("procedencia");
  const [editSuggestedHypothesis, setEditSuggestedHypothesis] = useState("");
  const [editSuggestedProbative, setEditSuggestedProbative] = useState("");
  const [editSuggestedLimits, setEditSuggestedLimits] = useState("");
  const [editSuggestedConsectarios, setEditSuggestedConsectarios] = useState("");
  const [editSuggestedBlock, setEditSuggestedBlock] = useState("");
  const [isEditSuggestedOpen, setIsEditSuggestedOpen] = useState(false);

  // Tab 2: Modelos Paradigmas do Juiz
  const [paradigms, setParadigms] = useState<JudgeParadigmModel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDecisionType, setFilterDecisionType] = useState<string>("all");
  const [expandedParadigmId, setExpandedParadigmId] = useState<string | null>(null);
  const [copiedParadigmId, setCopiedParadigmId] = useState<string | null>(null);
  const [injectedParadigmId, setInjectedParadigmId] = useState<string | null>(null);
  const [viewingInjectedSnippet, setViewingInjectedSnippet] = useState<{
    modelTitle: string;
    matchType: "total" | "partial" | "none";
    snippet: string;
    label: string;
  } | null>(null);

  // Tab 3: Importar PDF & Mapeamento Inteligente com IA
  const [importedFiles, setImportedFiles] = useState<
    { name: string; size: number; pageCount?: number; text: string }[]
  >([]);
  const [pastedRawText, setPastedRawText] = useState("");
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [extractProgress, setExtractProgress] = useState("");
  const [isMappingAi, setIsMappingAi] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [extractionMode, setExtractionMode] = useState<"exhaustive" | "single_block">("exhaustive");
  const [customFocus, setCustomFocus] = useState("");
  const [lastInteractedCandidateId, setLastInteractedCandidateId] = useState<string | null>(null);
  const [recentActionLabel, setRecentActionLabel] = useState<string | null>(null);
  const [extractedCandidates, setExtractedCandidates] = useState<MappedCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [candidateFeedback, setCandidateFeedback] = useState<string | null>(null);
  const [filterCandidateType, setFilterCandidateType] = useState<string>("all");
  const [searchCandidateQuery, setSearchCandidateQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Full Text Viewer & Interactive Selection in Tab 3
  const [selectedFileTab, setSelectedFileTab] = useState<number>(-1); // -1: all combined / text, >=0: individual file
  const [isFullTextViewerOpen, setIsFullTextViewerOpen] = useState(true);
  const [viewerFormatMode, setViewerFormatMode] = useState<"formatted" | "raw">("formatted");
  const [selectedTextExcerpt, setSelectedTextExcerpt] = useState("");
  const [copiedFullText, setCopiedFullText] = useState(false);
  const [copiedExcerpt, setCopiedExcerpt] = useState(false);
  const fullTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sub-modal: Seletor Interativo de Trechos para o Caderno de Teses
  const [injectSelectorModel, setInjectSelectorModel] = useState<JudgeParadigmModel | MappedCandidate | null>(null);
  const [injectIncludeTitle, setInjectIncludeTitle] = useState(true);
  const [injectIncludeSummary, setInjectIncludeSummary] = useState(true);
  const [injectIncludeHighlights, setInjectIncludeHighlights] = useState(true);
  const [injectIncludeFundamentacao, setInjectIncludeFundamentacao] = useState(true);
  const [injectIncludeDispositivo, setInjectIncludeDispositivo] = useState(false);
  const [injectCustomExcerpt, setInjectCustomExcerpt] = useState("");
  const [injectActivePreset, setInjectActivePreset] = useState<"fundamentacao" | "resumo" | "completo" | "custom">("fundamentacao");
  const [injectEditablePreview, setInjectEditablePreview] = useState("");

  // Form Modal for New / Edit Paradigm / Injeção Direta
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingParadigm, setEditingParadigm] = useState<JudgeParadigmModel | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Direito do Consumidor");
  const [formDecisionType, setFormDecisionType] = useState<JudgeParadigmModel["decisionType"]>("procedencia");
  const [formProcessNumber, setFormProcessNumber] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formFullText, setFormFullText] = useState("");
  const [formDestination, setFormDestination] = useState<"caderno" | "paradigma" | "ambos">("ambos");
  const [toastNotification, setToastNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const draftHandledRef = useRef<string | null>(null);

  const [paradigmToDelete, setParadigmToDelete] = useState<{id: string, title: string} | null>(null);
  const [batchDiscardConfirm, setBatchDiscardConfirm] = useState(false);

  // Pagination states
  const [paradigmsPage, setParadigmsPage] = useState(1);
  const paradigmsPerPage = 6;
  const [suggestedPage, setSuggestedPage] = useState(1);
  const suggestedPerPage = 6;
  const [candidatesPage, setCandidatesPage] = useState(1);
  const candidatesPerPage = 6;

  useEffect(() => {
    setParadigmsPage(1);
  }, [searchQuery, filterDecisionType]);

  useEffect(() => {
    setSuggestedPage(1);
  }, [searchSuggestedQuery, filterSuggestedCategory, filterSuggestedDecisionType, showOnlyInedite]);

  useEffect(() => {
    setCandidatesPage(1);
  }, [searchCandidateQuery, filterCandidateType]);

  // Escuta atualizações de modelos em tempo real entre abas e componentes
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<JudgeParadigmModel[]>;
      if (custom.detail && Array.isArray(custom.detail)) {
        setParadigms(custom.detail);
      } else {
        setParadigms(getJudgeParadigms());
      }
    };
    window.addEventListener(PARADIGMS_UPDATE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(PARADIGMS_UPDATE_EVENT, handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      draftHandledRef.current = null;
      return;
    }

    setText(tesesData.text || "");
    setIsEnabled(tesesData.isEnabled !== false);
    setSaveSuccess(false);
    setParadigms(getJudgeParadigms());

    // Sincroniza em segundo plano com o Firestore ao abrir a modal
    syncParadigmsWithDb().then((synced) => {
      if (Array.isArray(synced)) {
        setParadigms(synced);
      }
    }).catch(console.warn);

    if (
      initialParadigmDraft &&
      initialParadigmDraft.text &&
      draftHandledRef.current !== initialParadigmDraft.text
    ) {
      draftHandledRef.current = initialParadigmDraft.text;
      setEditingParadigm(null);
      setFormFullText(initialParadigmDraft.text);
      setFormProcessNumber(initialParadigmDraft.processNumber || "");
      setFormCategory(initialParadigmDraft.category || "Direito do Consumidor");
      setFormDestination("ambos");
      
      // Auto derive a reasonable initial title and decision type
      const textSample = initialParadigmDraft.text.toLowerCase();
      let guessedType: JudgeParadigmModel["decisionType"] = "procedencia";
      if (textSample.includes("improcedente") || textSample.includes("improcedência") || textSample.includes("julgo improcedente")) {
        guessedType = "improcedencia";
      } else if (textSample.includes("parcialmente procedente") || textSample.includes("parcial procedência")) {
        guessedType = "parcial_procedencia";
      } else if (textSample.includes("extin") || textSample.includes("sem resolução") || textSample.includes("art. 485")) {
        guessedType = "extincao_sem_merito";
      } else if (textSample.includes("tutela") && (textSample.includes("defiro") || textSample.includes("concedo"))) {
        guessedType = "tutela_deferida";
      } else if (textSample.includes("tutela") && (textSample.includes("indefiro") || textSample.includes("rejeito"))) {
        guessedType = "tutela_indeferida";
      } else if (textSample.includes("despacho") || textSample.includes("intime-se") || textSample.includes("cite-se")) {
        guessedType = "despacho_interlocutoria";
      }

      setFormDecisionType(guessedType);
      
      // First sentence as title candidate
      const firstLine = initialParadigmDraft.text.split("\n")[0].trim().replace(/^[-*•\d.)\s]+/, "");
      const derivedTitle = initialParadigmDraft.title || (firstLine.length > 5 && firstLine.length < 90 ? firstLine : `Paradigma ${initialParadigmDraft.processNumber ? `(Autos ${initialParadigmDraft.processNumber})` : ""}`);
      setFormTitle(derivedTitle);

      // Summary candidate
      const summaryCandidate = initialParadigmDraft.text.slice(0, 180).trim().replace(/\n+/g, " ") + "...";
      setFormSummary(summaryCandidate);

      setIsFormOpen(true);
    }
  }, [isOpen, tesesData, initialParadigmDraft]);

  if (!isOpen) return null;

  // Count estimated number of topics/theses
  const detectedTopics = (text.match(/^\s*\d+\.\s+[^\n]+/gm) || []).length;
  const detectedHypotheses = (text.match(/^\s*\d+\.\d+\.\s*Hip[oó]tese/gim) || []).length;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await saveCabinetTeses({
        text,
        isEnabled,
      });
      onTesesUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar teses:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    try {
      const updated = await saveCabinetTeses({
        text,
        isEnabled: nextState,
      });
      onTesesUpdated(updated);
    } catch (err) {
      console.error("Erro ao alternar status das teses:", err);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      const defaultData = await resetCabinetTeses();
      setText(defaultData.text);
      setIsEnabled(defaultData.isEnabled);
      onTesesUpdated(defaultData);
      setShowConfirmReset(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao restaurar teses:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertTemplate = () => {
    const nextNumber = detectedTopics + 1;
    const templateBlock = `\n\n${nextNumber}. [NOVO TEMA OU MATÉRIA DO JUIZADO]

${nextNumber}.1. Hipótese:
   - Quando [fatos comprovados nos autos], aplicar [conclusão jurídica / acolhimento ou rejeição].

${nextNumber}.2. Prova necessária:
   - Verificar [documento, extrato, contrato assinado, ID ou evento específico].

${nextNumber}.3. Exceções:
   - Não aplicar quando [distinção relevante ou hipótese fática diferenciada].

${nextNumber}.4. Fundamentação e origem:
   - [decisão/jurisprudência pacificada do juízo, Súmula ou precedente aplicável].
`;
    setText((prev) => prev.trimEnd() + templateBlock);
  };

  // Paradigm Actions
  const handleOpenNewParadigmForm = () => {
    setEditingParadigm(null);
    setFormTitle("");
    setFormCategory("Direito do Consumidor");
    setFormDecisionType("procedencia");
    setFormProcessNumber("");
    setFormSummary("");
    setFormFullText("");
    setFormDestination("paradigma");
    setIsFormOpen(true);
  };

  const handleOpenEditParadigmForm = (model: JudgeParadigmModel) => {
    setEditingParadigm(model);
    setFormTitle(model.title);
    setFormCategory(model.category);
    setFormDecisionType(model.decisionType);
    setFormProcessNumber(model.processNumber || "");
    setFormSummary(model.summary || "");
    setFormFullText(model.fullText);
    setFormDestination("paradigma");
    setIsFormOpen(true);
  };

  const handleSaveParadigmForm = async () => {
    if (!formTitle.trim() || !formFullText.trim()) {
      alert("Por favor, preencha o Título/Tema e o Texto Integral da Decisão.");
      return;
    }

    setIsSaving(true);
    try {
      let savedInCaderno = false;
      let savedInParadigm = false;

      // 1. Injeção Direta no Caderno de Teses
      if (formDestination === "caderno" || formDestination === "ambos") {
        const cleanText = formFullText.trim();
        const nextNum = detectedTopics + 1;
        const topicTitle = formTitle.trim().toUpperCase();
        const refProcess = formProcessNumber.trim() ? ` (Autos ref. nº ${formProcessNumber.trim()})` : "";
        const summaryBlock = formSummary.trim() || `Diretriz fixada pelo juízo na matéria: ${formCategory}.`;

        const newTeseBlock = `\n\n${nextNum}. [TESE DO GABINETE: ${topicTitle}]${refProcess}

${nextNum}.1. Hipótese e Síntese:
   - ${summaryBlock}

${nextNum}.2. Fundamentação e Diretriz Decisória:
${cleanText}
`;
        const updatedFullText = text.trimEnd() + newTeseBlock;
        setText(updatedFullText);

        const updatedData = await saveCabinetTeses({
          text: updatedFullText,
          isEnabled: true,
        });
        onTesesUpdated(updatedData);
        savedInCaderno = true;
      }

      // 2. Registro na Biblioteca de Modelos Paradigmas
      if (formDestination === "paradigma" || formDestination === "ambos") {
        if (editingParadigm) {
          const updated = updateJudgeParadigm(editingParadigm.id, {
            title: formTitle.trim(),
            category: formCategory.trim(),
            decisionType: formDecisionType,
            processNumber: formProcessNumber.trim() || undefined,
            summary: formSummary.trim() || undefined,
            fullText: formFullText.trim(),
          });
          setParadigms(updated);
          await saveParadigmsToDb(updated);
        } else {
          addJudgeParadigm({
            title: formTitle.trim(),
            category: formCategory.trim(),
            decisionType: formDecisionType,
            processNumber: formProcessNumber.trim() || undefined,
            summary: formSummary.trim() || undefined,
            fullText: formFullText.trim(),
            createdByName: "Gabinete",
          });
          const allCurrent = getJudgeParadigms();
          setParadigms(allCurrent);
          await saveParadigmsToDb(allCurrent);
        }
        savedInParadigm = true;
      }

      setIsFormOpen(false);
      if (onClearInitialDraft) {
        onClearInitialDraft();
      }

      // Feedback e navegação para a aba correta com Toast persistente
      if (savedInCaderno && savedInParadigm) {
        setActiveTab("caderno");
        setToastNotification({
          message: "✨ Sucesso! Conteúdo injetado no Caderno de Teses e arquivado na Biblioteca de Modelos Paradigmas!",
          type: "success",
        });
      } else if (savedInCaderno) {
        setActiveTab("caderno");
        setToastNotification({
          message: "📖 Tese normativa injetada com sucesso no Caderno de Teses do Gabinete!",
          type: "success",
        });
      } else {
        setActiveTab("modelos_paradigmas");
        setToastNotification({
          message: "⚖️ Decisão registrada com sucesso na Biblioteca de Modelos Paradigmas!",
          type: "success",
        });
      }

      setTimeout(() => {
        setToastNotification(null);
      }, 5000);

    } catch (err) {
      console.error("Erro ao salvar tese/modelo:", err);
      alert("Ocorreu um erro ao salvar o conteúdo. Por favor, tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteParadigm = (id: string, title: string) => {
    setParadigmToDelete({ id, title });
  };

  const confirmDeleteParadigm = () => {
    if (paradigmToDelete) {
      const updated = deleteJudgeParadigm(paradigmToDelete.id);
      setParadigms(updated);
      saveParadigmsToDb(updated).catch(console.warn);
      setParadigmToDelete(null);
    }
  };

  const handlePurgeDefaultParadigms = async () => {
    if (window.confirm("Deseja remover todos os modelos de decisão padrão inseridos automaticamente pelo sistema? Modelos personalizados que você mesmo criou serão mantidos intactos.")) {
      const userOnly = paradigms.filter(
        (p) => !p.isDefault && !(p.id && p.id.startsWith("paradigm-") && !isNaN(Number(p.id.replace("paradigm-", ""))))
      );
      setParadigms(userOnly);
      await saveJudgeParadigms(userOnly, true);
      await saveParadigmsToDb(userOnly);
      setToastNotification({
        message: "🗑️ Modelos padrão do sistema removidos com sucesso!",
        type: "success"
      });
    }
  };

  const handleCopyParadigm = async (model: JudgeParadigmModel) => {
    try {
      await navigator.clipboard.writeText(model.fullText);
      setCopiedParadigmId(model.id);
      setTimeout(() => setCopiedParadigmId(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const formatFullCadernoEntry = (
    item: {
      title: string;
      category?: string;
      decisionType?: string;
      processNumber?: string;
      summary?: string;
      thesisSnippet?: string;
      fullText?: string;
      keyHighlights?: string[];
    },
    topicNumber: number
  ): string => {
    const typeLabel = (item.decisionType && DECISION_TYPE_CONFIG[item.decisionType]?.label) || item.decisionType || "DECISÃO";

    // Se já houver um thesisSnippet estruturado, usamos como ponto de partida
    if (item.thesisSnippet && item.thesisSnippet.trim().length > 40) {
      let snippet = item.thesisSnippet.trim();
      // Se o fullText tiver tabelas, artigos ou fundamentação detalhada não contida no snippet resumido, anexamos a fundamentação integral
      if (item.fullText && item.fullText.trim().length > 80 && !snippet.toLowerCase().includes(item.fullText.slice(0, 50).toLowerCase())) {
        snippet += `\n\n${topicNumber}.4. Fundamentação, Parâmetros e Texto Integral:\n${item.fullText.trim()}`;
      }
      return `\n\n${snippet}\n`;
    }

    // Construção completa garantindo que NENHUM texto seja omitido ou truncado
    const parts: string[] = [];
    parts.push(`\n\n${topicNumber}. ${item.title.toUpperCase()} (${typeLabel.toUpperCase()})`);
    
    parts.push(`\n${topicNumber}.1. Hipótese Fática e Objeto:`);
    parts.push(`   - ${item.summary || "Orientação e tese jurídica consolidada no gabinete."}`);
    if (item.processNumber) {
      parts.push(`   - Autos de Referência: ${item.processNumber}`);
    }
    if (item.category) {
      parts.push(`   - Matéria: ${item.category}`);
    }

    if (item.keyHighlights && item.keyHighlights.length > 0) {
      parts.push(`\n${topicNumber}.2. Parâmetros e Critérios Probatórios:`);
      item.keyHighlights.forEach((kh) => parts.push(`   - ${kh}`));
    }

    if (item.fullText && item.fullText.trim()) {
      parts.push(`\n${topicNumber}.3. Fundamentação e Texto Integral:`);
      parts.push(item.fullText.trim());
    }

    return parts.join("\n") + "\n";
  };

  const parseModelSections = (text: string) => {
    if (!text) return { relatorio: "", fundamentacao: "", dispositivo: "" };
    const normalized = text.replace(/\r\n/g, "\n");

    const relatorioRegex = /(?:(?:^|\n)\s*(?:1\.\s*|I\s*[-–—:]\s*|)(?:RELATÓRIO|RELATORIO)[\s\S]*?)(?=(?:^|\n)\s*(?:2\.\s*|II\s*[-–—:]\s*|)(?:FUNDAMENTAÇÃO|FUNDAMENTACAO|DECIDO|VOTO|PASSO A DECIDIR)|(?:^|\n)\s*(?:3\.\s*|III\s*[-–—:]\s*|)(?:DISPOSITIVO|POSTO ISSO|ANTE O EXPOSTO|$))/i;
    const fundamentacaoRegex = /(?:(?:^|\n)\s*(?:2\.\s*|II\s*[-–—:]\s*|)(?:FUNDAMENTAÇÃO|FUNDAMENTACAO|DECIDO|VOTO|PASSO A DECIDIR)[\s\S]*?)(?=(?:^|\n)\s*(?:3\.\s*|III\s*[-–—:]\s*|)(?:DISPOSITIVO|POSTO ISSO|ANTE O EXPOSTO|$))/i;
    const dispositivoRegex = /(?:(?:^|\n)\s*(?:3\.\s*|III\s*[-–—:]\s*|)(?:DISPOSITIVO|POSTO ISSO|ANTE O EXPOSTO)[\s\S]*$)/i;

    const relMatch = normalized.match(relatorioRegex);
    const fundMatch = normalized.match(fundamentacaoRegex);
    const dispMatch = normalized.match(dispositivoRegex);

    let fundamentacao = fundMatch ? fundMatch[0].trim() : "";
    let dispositivo = dispMatch ? dispMatch[0].trim() : "";
    let relatorio = relMatch ? relMatch[0].trim() : "";

    if (!fundamentacao && !dispositivo && !relatorio) {
      fundamentacao = normalized.trim();
    }

    return { relatorio, fundamentacao, dispositivo };
  };

  const checkIsModelInCaderno = (model: JudgeParadigmModel | MappedCandidate): boolean => {
    if (!text) return false;
    const modelTitle = model.title?.toUpperCase().trim();
    if (modelTitle && text.toUpperCase().includes(modelTitle)) return true;
    
    if (model.summary && model.summary.trim().length > 20) {
      if (text.toLowerCase().includes(model.summary.trim().toLowerCase().substring(0, 100))) return true;
    }
    return false;
  };

  const buildInjectionText = (
    model: JudgeParadigmModel | MappedCandidate,
    includeTitle: boolean,
    includeSummary: boolean,
    includeHighlights: boolean,
    includeFundamentacao: boolean,
    includeDispositivo: boolean,
    customExcerpt: string,
    topicNumber: number
  ) => {
    const parts: string[] = [];
    const typeBadge = DECISION_TYPE_CONFIG[model.decisionType]?.label || model.decisionType;

    if (includeTitle) {
      parts.push(`\n\n---`);
      parts.push(`\n${topicNumber}. ${model.title.toUpperCase()} (${typeBadge.toUpperCase()})`);
      if (model.category) {
        parts.push(`Área: ${model.category}${model.processNumber ? ` | Processo Ref.: ${model.processNumber}` : ""}`);
      }
    }

    if (includeSummary && model.summary && model.summary.trim()) {
      parts.push(`\n${topicNumber}.1. Diretriz e Tese do Gabinete:`);
      parts.push(model.summary.trim());
    }

    if (includeHighlights && model.keyHighlights && model.keyHighlights.length > 0) {
      parts.push(`\n${topicNumber}.2. Parâmetros e Critérios Probatórios:`);
      model.keyHighlights.forEach((kh) => parts.push(`   - ${kh}`));
    }

    if (includeFundamentacao) {
      const parsed = parseModelSections(model.fullText);
      const textToUse = customExcerpt?.trim() || parsed.fundamentacao || model.fullText.trim();
      if (textToUse) {
        parts.push(`\n${topicNumber}.3. Fundamentação e Raciocínio Jurídico Vinculante:`);
        parts.push(textToUse);
      }
    }

    if (includeDispositivo) {
      const parsed = parseModelSections(model.fullText);
      if (parsed.dispositivo) {
        parts.push(`\n${topicNumber}.4. Dispositivo / Conclusão Padrão:`);
        parts.push(parsed.dispositivo);
      }
    }

    return parts.join("\n") + "\n";
  };

  const handleOpenInjectSelector = (model: JudgeParadigmModel | MappedCandidate) => {
    const nextNumber = detectedTopics + 1;
    const parsed = parseModelSections(model.fullText);
    const defaultFund = parsed.fundamentacao || model.fullText || "";

    setInjectSelectorModel(model);
    setInjectIncludeTitle(true);
    setInjectIncludeSummary(!!(model.summary && model.summary.trim()));
    setInjectIncludeHighlights(!!(model.keyHighlights && model.keyHighlights.length > 0));
    setInjectIncludeFundamentacao(true);
    setInjectIncludeDispositivo(false);
    setInjectCustomExcerpt(defaultFund);
    setInjectActivePreset("fundamentacao");

    const initialText = buildInjectionText(
      model,
      true,
      !!(model.summary && model.summary.trim()),
      !!(model.keyHighlights && model.keyHighlights.length > 0),
      true,
      false,
      defaultFund,
      nextNumber
    );
    setInjectEditablePreview(initialText);
  };

  const handleApplyPreset = (preset: "fundamentacao" | "resumo" | "completo" | "custom") => {
    if (!injectSelectorModel) return;
    const nextNumber = detectedTopics + 1;
    const parsed = parseModelSections(injectSelectorModel.fullText);
    const defaultFund = parsed.fundamentacao || injectSelectorModel.fullText || "";

    let newIncludeTitle = true;
    let newIncludeSummary = !!(injectSelectorModel.summary && injectSelectorModel.summary.trim());
    let newIncludeHighlights = !!(injectSelectorModel.keyHighlights && injectSelectorModel.keyHighlights.length > 0);
    let newIncludeFundamentacao = true;
    let newIncludeDispositivo = false;
    let newExcerpt = injectCustomExcerpt || defaultFund;

    if (preset === "resumo") {
      newIncludeFundamentacao = false;
      newIncludeDispositivo = false;
    } else if (preset === "fundamentacao") {
      newIncludeFundamentacao = true;
      newIncludeDispositivo = false;
    } else if (preset === "completo") {
      newIncludeFundamentacao = true;
      newIncludeDispositivo = true;
      newExcerpt = injectSelectorModel.fullText || "";
    }

    setInjectActivePreset(preset);
    setInjectIncludeTitle(newIncludeTitle);
    setInjectIncludeSummary(newIncludeSummary);
    setInjectIncludeHighlights(newIncludeHighlights);
    setInjectIncludeFundamentacao(newIncludeFundamentacao);
    setInjectIncludeDispositivo(newIncludeDispositivo);
    setInjectCustomExcerpt(newExcerpt);

    const updatedText = buildInjectionText(
      injectSelectorModel,
      newIncludeTitle,
      newIncludeSummary,
      newIncludeHighlights,
      newIncludeFundamentacao,
      newIncludeDispositivo,
      newExcerpt,
      nextNumber
    );
    setInjectEditablePreview(updatedText);
  };

  const handleUpdateInjectionOptions = (updates: {
    includeTitle?: boolean;
    includeSummary?: boolean;
    includeHighlights?: boolean;
    includeFundamentacao?: boolean;
    includeDispositivo?: boolean;
    customExcerpt?: string;
  }) => {
    if (!injectSelectorModel) return;
    const nextNumber = detectedTopics + 1;

    const newTitle = updates.includeTitle !== undefined ? updates.includeTitle : injectIncludeTitle;
    const newSummary = updates.includeSummary !== undefined ? updates.includeSummary : injectIncludeSummary;
    const newHighlights = updates.includeHighlights !== undefined ? updates.includeHighlights : injectIncludeHighlights;
    const newFund = updates.includeFundamentacao !== undefined ? updates.includeFundamentacao : injectIncludeFundamentacao;
    const newDisp = updates.includeDispositivo !== undefined ? updates.includeDispositivo : injectIncludeDispositivo;
    const newExcerpt = updates.customExcerpt !== undefined ? updates.customExcerpt : injectCustomExcerpt;

    if (updates.includeTitle !== undefined) setInjectIncludeTitle(updates.includeTitle);
    if (updates.includeSummary !== undefined) setInjectIncludeSummary(updates.includeSummary);
    if (updates.includeHighlights !== undefined) setInjectIncludeHighlights(updates.includeHighlights);
    if (updates.includeFundamentacao !== undefined) setInjectIncludeFundamentacao(updates.includeFundamentacao);
    if (updates.includeDispositivo !== undefined) setInjectIncludeDispositivo(updates.includeDispositivo);
    if (updates.customExcerpt !== undefined) setInjectCustomExcerpt(updates.customExcerpt);
    setInjectActivePreset("custom");

    const updatedText = buildInjectionText(
      injectSelectorModel,
      newTitle,
      newSummary,
      newHighlights,
      newFund,
      newDisp,
      newExcerpt,
      nextNumber
    );
    setInjectEditablePreview(updatedText);
  };

  const handleConfirmInjectionIntoCaderno = () => {
    if (!injectEditablePreview.trim()) return;

    setText((prev) => prev.trimEnd() + injectEditablePreview);

    if (injectSelectorModel) {
      setInjectedParadigmId(injectSelectorModel.id);
      if ("status" in injectSelectorModel) {
        setExtractedCandidates((prev) =>
          prev.map((c) =>
            c.id === injectSelectorModel.id
              ? { ...c, status: c.status === "saved_paradigm" ? "both" : "injected_caderno" }
              : c
          )
        );
      }
    }

    const title = injectSelectorModel?.title || "Trecho do Modelo";
    setInjectSelectorModel(null);
    setActiveTab("caderno");
    setCandidateFeedback(`⚡ Trecho selecionado de "${title}" injetado com sucesso no Caderno de Teses!`);
    setTimeout(() => {
      setInjectedParadigmId(null);
      setCandidateFeedback(null);
    }, 4000);
  };

  const handleInjectParadigmIntoCaderno = (model: JudgeParadigmModel) => {
    handleOpenInjectSelector(model);
  };

  // --- Handlers for TAB 3: Import PDF & AI Mapping ---
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsExtractingPdf(true);
    setMappingError(null);

    const newExtracted: { name: string; size: number; pageCount?: number; text: string }[] = [];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setExtractProgress(`Lendo arquivo ${i + 1} de ${fileArray.length}: ${file.name}...`);

        try {
          if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            const result = await extractTextFromPdf(file);
            if (result.text && result.text.trim().length > 0) {
              newExtracted.push({
                name: file.name,
                size: file.size,
                pageCount: result.pageCount,
                text: result.text,
              });
            } else {
              setMappingError(`Não foi possível extrair o texto de "${file.name}". O arquivo pode estar protegido por senha ou sem camada de texto. Você também pode colar o texto diretamente no campo abaixo.`);
            }
          } else {
            // Text or other document formats
            const text = await file.text();
            if (text.trim().length > 0) {
              newExtracted.push({
                name: file.name,
                size: file.size,
                text: text,
              });
            }
          }
        } catch (err: any) {
          console.error(`Erro ao processar arquivo ${file.name}:`, err);
          setMappingError(`Erro ao ler "${file.name}": ${err.message || "Falha na leitura"}`);
        }
      }

      if (newExtracted.length > 0) {
        setImportedFiles((prev) => [...prev, ...newExtracted]);
      }
    } catch (globalErr: any) {
      console.error("Erro global no processamento de arquivos:", globalErr);
      setMappingError(`Erro inesperado ao processar arquivos: ${globalErr.message || "Erro desconhecido"}`);
    } finally {
      setIsExtractingPdf(false);
      setExtractProgress("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImportedFile = (index: number) => {
    setImportedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRunAiMapping = async () => {
    const allFileTexts = importedFiles.map((f) => `=== DOCUMENTO: ${f.name} ===\n${f.text}`).join("\n\n");
    const fullCombinedText = [allFileTexts, pastedRawText.trim()].filter(Boolean).join("\n\n=== TEXTO ADICIONAL / MANUAL ===\n\n");

    if (!fullCombinedText || fullCombinedText.trim().length === 0) {
      setMappingError("Por favor, anexe pelo menos um arquivo PDF/documento ou cole o texto da decisão.");
      return;
    }

    setIsMappingAi(true);
    setMappingError(null);

    try {
      const response = await fetch("/api/map-decision-documents", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          documentsText: fullCombinedText,
          fileNames: importedFiles.map((f) => f.name),
          extractionMode: extractionMode,
          customFocus: customFocus.trim() || undefined,
        }),
      });

      if (!response.ok) {
        let errStr = `Erro do servidor HTTP ${response.status}`;
        try {
          const errText = await response.text();
          const errJson = JSON.parse(errText);
          if (errJson?.error) errStr = errJson.error;
        } catch {}
        throw new Error(errStr);
      }

      let data;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("A conexão com o servidor foi interrompida ou a IA retornou um formato inválido.");
      }
      const models: any[] = data.models || [];

      if (models.length === 0) {
        setMappingError("A IA analisou os documentos mas não encontrou decisões judiciais ou teses mapeáveis. Verifique se o conteúdo contém fundamentação jurídica.");
      } else {
        const candidates: MappedCandidate[] = models.map((m, idx) => ({
          id: `cand_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          title: m.title || `Modelo Paradigma ${idx + 1}`,
          category: m.category || "Direito Cível",
          decisionType: m.decisionType || "procedencia",
          processNumber: m.processNumber || undefined,
          summary: m.summary || undefined,
          thesisSnippet: m.thesisSnippet || undefined,
          fullText: m.fullText || "",
          keyHighlights: m.keyHighlights || [],
          status: "pending",
        }));

        setExtractedCandidates((prev) => [...candidates, ...prev]);
        setCandidateFeedback(`🎉 Mapeamento concluído com sucesso! ${candidates.length} tese(s) e modelo(s) individualizado(s) prontos para triagem.`);
        setTimeout(() => setCandidateFeedback(null), 5000);
      }
    } catch (err: any) {
      console.error("Erro no mapeamento com IA:", err);
      const errorMsg = err.message || "Erro ao conectar com o serviço de mapeamento por IA.";
      setMappingError(errorMsg);
      if (errorMsg.includes("Erro 429") || errorMsg.includes("Limite de requisições") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
         window.dispatchEvent(new CustomEvent("open-api-key-modal", { detail: { message: errorMsg } }));
      }
    } finally {
      setIsMappingAi(false);
    }
  };

  const handleSaveCandidateAsParadigm = (candidate: MappedCandidate) => {
    addJudgeParadigm({
      title: candidate.title,
      category: candidate.category,
      decisionType: candidate.decisionType,
      processNumber: candidate.processNumber,
      summary: candidate.summary,
      fullText: candidate.fullText,
      createdByName: "Mapeamento IA",
    });

    setParadigms(getJudgeParadigms());

    setExtractedCandidates((prev) =>
      prev.map((c) =>
        c.id === candidate.id
          ? { ...c, status: c.status === "injected_caderno" ? "both" : "saved_paradigm" }
          : c
      )
    );

    setLastInteractedCandidateId(candidate.id);
    setRecentActionLabel(`Salvo nos Modelos do Juiz: "${candidate.title}"`);
    setCandidateFeedback(`✅ Modelo "${candidate.title}" salvo com destaque na Biblioteca do Juiz!`);
    setTimeout(() => {
      setCandidateFeedback(null);
      setRecentActionLabel(null);
    }, 4000);
  };

  const handleInjectCandidateIntoCaderno = (candidate: MappedCandidate) => {
    handleOpenInjectSelector(candidate);
  };

  const handleSaveCandidateBoth = (candidate: MappedCandidate) => {
    handleSaveCandidateAsParadigm(candidate);
    handleInjectCandidateIntoCaderno(candidate);
    setExtractedCandidates((prev) =>
      prev.map((c) => (c.id === candidate.id ? { ...c, status: "both" } : c))
    );
    setLastInteractedCandidateId(candidate.id);
    setRecentActionLabel(`Salvo em Ambos: "${candidate.title}"`);
    setCandidateFeedback(`🌟 Modelo salvo na Biblioteca do Juiz E tese injetada no Caderno simultaneamente!`);
    setTimeout(() => {
      setCandidateFeedback(null);
      setRecentActionLabel(null);
    }, 4500);
  };

  const handleDiscardCandidate = (id: string) => {
    setExtractedCandidates((prev) => prev.filter((c) => c.id !== id));
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleOpenEditCandidate = (candidate: MappedCandidate) => {
    setEditingParadigm(null);
    setFormTitle(candidate.title);
    setFormCategory(candidate.category);
    setFormDecisionType(candidate.decisionType);
    setFormProcessNumber(candidate.processNumber || "");
    setFormSummary(candidate.summary || "");
    setFormFullText(candidate.fullText);
    setIsFormOpen(true);
  };

  const handleToggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllCandidates = () => {
    if (selectedCandidateIds.size === filteredCandidates.length) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(filteredCandidates.map((c) => c.id)));
    }
  };

  const handleBatchSaveSelectedParadigms = () => {
    const selected = extractedCandidates.filter((c) => selectedCandidateIds.has(c.id));
    if (selected.length === 0) return;

    selected.forEach((cand) => {
      addJudgeParadigm({
        title: cand.title,
        category: cand.category,
        decisionType: cand.decisionType,
        processNumber: cand.processNumber,
        summary: cand.summary,
        fullText: cand.fullText,
        createdByName: "Mapeamento IA (Lote)",
      });
    });

    setParadigms(getJudgeParadigms());
    setExtractedCandidates((prev) =>
      prev.map((c) =>
        selectedCandidateIds.has(c.id)
          ? { ...c, status: c.status === "injected_caderno" ? "both" : "saved_paradigm" }
          : c
      )
    );

    setSelectedCandidateIds(new Set());
    setCandidateFeedback(`⚖️ ${selected.length} modelo(s) salvo(s) com sucesso na Biblioteca do Juiz!`);
    setTimeout(() => setCandidateFeedback(null), 4000);
  };

  const handleBatchInjectSelectedCaderno = () => {
    const selected = extractedCandidates.filter((c) => selectedCandidateIds.has(c.id));
    if (selected.length === 0) return;

    let appendedText = "";
    let currentTopicNum = detectedTopics;

    selected.forEach((cand) => {
      currentTopicNum++;
      const block = formatFullCadernoEntry(cand, currentTopicNum);
      appendedText += block;
    });

    setText((prev) => prev.trimEnd() + appendedText);
    setExtractedCandidates((prev) =>
      prev.map((c) =>
        selectedCandidateIds.has(c.id)
          ? { ...c, status: c.status === "saved_paradigm" ? "both" : "injected_caderno" }
          : c
      )
    );

    setSelectedCandidateIds(new Set());
    setCandidateFeedback(`⚡ ${selected.length} tese(s) com texto integral injetada(s) no Caderno de Teses!`);
    setTimeout(() => setCandidateFeedback(null), 4000);
  };

  const handleBatchDiscardSelected = () => {
    const count = selectedCandidateIds.size;
    if (count === 0) return;
    setBatchDiscardConfirm(true);
  };

  const confirmBatchDiscard = () => {
    setExtractedCandidates((prev) => prev.filter((c) => !selectedCandidateIds.has(c.id)));
    setSelectedCandidateIds(new Set());
    setBatchDiscardConfirm(false);
  };

  // --- TAB 4: VARREDURA AUTOMÁTICA E MINERAÇÃO INTELIGENTE DO GABINETE ---
  const handleRunCabinetThesesScan = async () => {
    setIsScanningTheses(true);
    setScanError(null);
    setScanProgress("Coletando histórico de minutas e modelos de decisão do gabinete ativo...");

    try {
      const historyItems = await getHistory();
      const currentParadigms = getJudgeParadigms();
      const activeUnit = getActiveUnitId() || "montes_claros";

      setScanProgress(`Minerando ${historyItems.length} minutas salvas e ${currentParadigms.length} modelos com IA...`);

      const response = await fetch("/api/scan-cabinet-theses", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          historyItems,
          judgeParadigms: currentParadigms,
          existingCadernoText: text,
          unitName: activeUnit,
          cabinetName: globalTenantId === "fabricio" ? "Gabinete Principal" : `Gabinete ${globalTenantId}`,
        }),
      });

      if (!response.ok) {
        let errStr = `Erro HTTP ${response.status}`;
        try {
          const errText = await response.text();
          const errObj = JSON.parse(errText);
          if (errObj?.error) errStr = errObj.error;
        } catch {}
        throw new Error(errStr);
      }

      let data: CabinetThesesScanResult;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("O servidor retornou um formato inválido.");
      }
      const rawTheses = data.suggestedTheses || [];

      // Dupla verificação no cliente: validação de desduplicação contra o estado 'text' atual em tempo real
      const processedTheses: SuggestedCabinetThesis[] = rawTheses.map((t) => {
        const dupCheck = checkDuplicateBeforeInjection(t.fullSuggestedBlock || t.title, text);
        const isDup = t.isDuplicate || dupCheck.hasDuplicateRisk;
        return {
          ...t,
          isDuplicate: isDup,
          duplicateReason: t.duplicateReason || dupCheck.warningMessage || (isDup ? "Sobreposição com matéria já constante no Caderno" : ""),
          duplicateOverlapRatio: dupCheck.duplicateType === "exact" ? 1.0 : (dupCheck.duplicateType === "high_overlap" ? 0.7 : 0.0),
          status: t.status || "pending",
        };
      });

      setSuggestedTheses(processedTheses);
      setScanStats(data.minedStats || {
        totalHistoryAnalyzed: historyItems.length,
        totalParadigmsAnalyzed: currentParadigms.length,
        totalThesesDiscovered: processedTheses.length,
        totalInediteTheses: processedTheses.filter((x) => !x.isDuplicate).length,
        totalDuplicateFiltered: processedTheses.filter((x) => x.isDuplicate).length,
      });

      const inediteCount = processedTheses.filter((x) => !x.isDuplicate).length;
      setCandidateFeedback(`✨ Varredura concluída com sucesso! ${inediteCount} nova(s) tese(s) inédita(s) sugerida(s) para o seu gabinete.`);
      setTimeout(() => setCandidateFeedback(null), 5000);
    } catch (err: any) {
      console.error("Erro na varredura de teses do gabinete:", err);
      const errorMsg = err.message || "Falha ao processar varredura do banco de dados.";
      setScanError(errorMsg);
      if (errorMsg.includes("Erro 429") || errorMsg.includes("Limite de requisições") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
         window.dispatchEvent(new CustomEvent("open-api-key-modal", { detail: { message: errorMsg } }));
      }
    } finally {
      setIsScanningTheses(false);
      setScanProgress("");
    }
  };

  const handleInjectSuggestedThesisIntoCaderno = (thesis: SuggestedCabinetThesis) => {
    const nextNumber = detectedTopics + 1;
    const typeLabel = (DECISION_TYPE_CONFIG[thesis.decisionType]?.label || thesis.decisionType).toUpperCase();
    
    let block = `\n\n${nextNumber}. ${thesis.title.toUpperCase()} (${typeLabel})\n\n`;
    block += `${nextNumber}.1. Hipótese Fática e Objeto:\n   - ${thesis.hypothesis}\n\n`;
    block += `${nextNumber}.2. Critérios Probatórios e Ônus da Prova:\n   - ${thesis.probativeStandard}\n\n`;
    if (thesis.consequencesAndLimits) {
      block += `${nextNumber}.3. Parâmetros e Consequências:\n   - ${thesis.consequencesAndLimits}\n\n`;
    }
    if (thesis.consectariosAndPrecedents) {
      block += `${nextNumber}.4. Consectários e Precedentes:\n   - ${thesis.consectariosAndPrecedents}\n`;
    }

    setText((prev) => prev.trimEnd() + block);
    setSuggestedTheses((prev) =>
      prev.map((t) => (t.id === thesis.id ? { ...t, status: t.status === "saved_paradigm" ? "both" : "injected" } : t))
    );
    setCandidateFeedback(`⚡ Tese "${thesis.title}" injetada no Caderno de Teses sob o nº ${nextNumber}!`);
    setTimeout(() => setCandidateFeedback(null), 4000);
  };

  const handleSaveSuggestedAsParadigm = (thesis: SuggestedCabinetThesis) => {
    const fullTextBody = `${thesis.title.toUpperCase()}\n\n[HIPÓTESE FÁTICA]\n${thesis.hypothesis}\n\n[CRITÉRIOS PROBATÓRIOS]\n${thesis.probativeStandard}\n\n${thesis.consequencesAndLimits ? `[PARÂMETROS E LIMITES]\n${thesis.consequencesAndLimits}\n\n` : ""}${thesis.consectariosAndPrecedents ? `[CONSECTÁRIOS LEGAIS E PRECEDENTES]\n${thesis.consectariosAndPrecedents}` : ""}`;

    addJudgeParadigm({
      title: thesis.title,
      category: thesis.category,
      decisionType: thesis.decisionType,
      summary: thesis.hypothesis.slice(0, 200) + "...",
      fullText: fullTextBody,
      processNumber: "",
    });

    setParadigms(getJudgeParadigms());
    setSuggestedTheses((prev) =>
      prev.map((t) => (t.id === thesis.id ? { ...t, status: t.status === "injected" ? "both" : "saved_paradigm" } : t))
    );
    setCandidateFeedback(`💾 Tese "${thesis.title}" cadastrada nos Modelos de Decisões do Juiz!`);
    setTimeout(() => setCandidateFeedback(null), 4000);
  };

  const handleSaveSuggestedBoth = (thesis: SuggestedCabinetThesis) => {
    handleInjectSuggestedThesisIntoCaderno(thesis);
    handleSaveSuggestedAsParadigm(thesis);
    setSuggestedTheses((prev) =>
      prev.map((t) => (t.id === thesis.id ? { ...t, status: "both" } : t))
    );
  };

  const handleDiscardSuggestedThesis = (id: string) => {
    setSuggestedTheses((prev) => prev.filter((t) => t.id !== id));
    setSelectedSuggestedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleOpenEditSuggested = (thesis: SuggestedCabinetThesis) => {
    setEditingSuggestedThesis(thesis);
    setEditSuggestedTitle(thesis.title);
    setEditSuggestedCategory(thesis.category);
    setEditSuggestedDecisionType(thesis.decisionType);
    setEditSuggestedHypothesis(thesis.hypothesis);
    setEditSuggestedProbative(thesis.probativeStandard);
    setEditSuggestedLimits(thesis.consequencesAndLimits || "");
    setEditSuggestedConsectarios(thesis.consectariosAndPrecedents || "");
    setEditSuggestedBlock(thesis.fullSuggestedBlock || "");
    setIsEditSuggestedOpen(true);
  };

  const handleSaveEditSuggested = () => {
    if (!editingSuggestedThesis) return;
    const updated: SuggestedCabinetThesis = {
      ...editingSuggestedThesis,
      title: editSuggestedTitle,
      category: editSuggestedCategory,
      decisionType: editSuggestedDecisionType,
      hypothesis: editSuggestedHypothesis,
      probativeStandard: editSuggestedProbative,
      consequencesAndLimits: editSuggestedLimits,
      consectariosAndPrecedents: editSuggestedConsectarios,
      fullSuggestedBlock: editSuggestedBlock,
    };

    setSuggestedTheses((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setIsEditSuggestedOpen(false);
    setEditingSuggestedThesis(null);
  };

  const handleBatchInjectSelectedSuggested = () => {
    const selected = suggestedTheses.filter((t) => selectedSuggestedIds.has(t.id));
    if (selected.length === 0) return;

    let currentNum = detectedTopics;
    let appended = "";

    selected.forEach((thesis) => {
      currentNum++;
      const typeLabel = (DECISION_TYPE_CONFIG[thesis.decisionType]?.label || thesis.decisionType).toUpperCase();
      let block = `\n\n${currentNum}. ${thesis.title.toUpperCase()} (${typeLabel})\n\n`;
      block += `${currentNum}.1. Hipótese Fática e Objeto:\n   - ${thesis.hypothesis}\n\n`;
      block += `${currentNum}.2. Critérios Probatórios e Ônus da Prova:\n   - ${thesis.probativeStandard}\n\n`;
      if (thesis.consequencesAndLimits) {
        block += `${currentNum}.3. Parâmetros e Consequências:\n   - ${thesis.consequencesAndLimits}\n\n`;
      }
      if (thesis.consectariosAndPrecedents) {
        block += `${currentNum}.4. Consectários e Precedentes:\n   - ${thesis.consectariosAndPrecedents}\n`;
      }
      appended += block;
    });

    setText((prev) => prev.trimEnd() + appended);
    setSuggestedTheses((prev) =>
      prev.map((t) =>
        selectedSuggestedIds.has(t.id) ? { ...t, status: t.status === "saved_paradigm" ? "both" : "injected" } : t
      )
    );
    setSelectedSuggestedIds(new Set());
    setCandidateFeedback(`⚡ ${selected.length} tese(s) sugerida(s) inserida(s) com sucesso no Caderno de Teses!`);
    setTimeout(() => setCandidateFeedback(null), 4000);
  };

  const handleBatchSaveSelectedSuggestedParadigms = () => {
    const selected = suggestedTheses.filter((t) => selectedSuggestedIds.has(t.id));
    if (selected.length === 0) return;

    selected.forEach((thesis) => {
      const fullTextBody = `${thesis.title.toUpperCase()}\n\n[HIPÓTESE FÁTICA]\n${thesis.hypothesis}\n\n[CRITÉRIOS PROBATÓRIOS]\n${thesis.probativeStandard}\n\n${thesis.consequencesAndLimits ? `[PARÂMETROS E LIMITES]\n${thesis.consequencesAndLimits}\n\n` : ""}${thesis.consectariosAndPrecedents ? `[CONSECTÁRIOS LEGAIS E PRECEDENTES]\n${thesis.consectariosAndPrecedents}` : ""}`;

      addJudgeParadigm({
        title: thesis.title,
        category: thesis.category,
        decisionType: thesis.decisionType,
        summary: thesis.hypothesis.slice(0, 200) + "...",
        fullText: fullTextBody,
        processNumber: "",
      });
    });

    setParadigms(getJudgeParadigms());
    setSuggestedTheses((prev) =>
      prev.map((t) =>
        selectedSuggestedIds.has(t.id) ? { ...t, status: t.status === "injected" ? "both" : "saved_paradigm" } : t
      )
    );
    setSelectedSuggestedIds(new Set());
    setCandidateFeedback(`💾 ${selected.length} tese(s) cadastrada(s) como Modelos de Decisões do Juiz!`);
    setTimeout(() => setCandidateFeedback(null), 4000);
  };

  const handleBatchDiscardSelectedSuggested = () => {
    setSuggestedTheses((prev) => prev.filter((t) => !selectedSuggestedIds.has(t.id)));
    setSelectedSuggestedIds(new Set());
  };

  const handleSelectAllSuggested = () => {
    const filtered = getFilteredSuggestedTheses();
    if (selectedSuggestedIds.size === filtered.length && filtered.length > 0) {
      setSelectedSuggestedIds(new Set());
    } else {
      setSelectedSuggestedIds(new Set(filtered.map((t) => t.id)));
    }
  };

  const getFilteredSuggestedTheses = () => {
    return suggestedTheses.filter((t) => {
      if (showOnlyInedite && t.isDuplicate) return false;
      if (filterSuggestedCategory !== "all" && t.category !== filterSuggestedCategory) return false;
      if (filterSuggestedDecisionType !== "all" && t.decisionType !== filterSuggestedDecisionType) return false;
      if (searchSuggestedQuery.trim()) {
        const q = searchSuggestedQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchHypothesis = t.hypothesis.toLowerCase().includes(q);
        const matchCategory = t.category.toLowerCase().includes(q);
        const matchProb = t.probativeStandard.toLowerCase().includes(q);
        if (!matchTitle && !matchHypothesis && !matchCategory && !matchProb) return false;
      }
      return true;
    });
  };

  // Helper: Retrieve active full text depending on selected tab (single file vs combined)
  const getActiveViewText = (): string => {
    if (selectedFileTab >= 0 && importedFiles[selectedFileTab]) {
      return importedFiles[selectedFileTab].text;
    }
    const allFileTexts = importedFiles.map((f) => `=== DOCUMENTO: ${f.name} ===\n${f.text}`).join("\n\n");
    return [allFileTexts, pastedRawText.trim()].filter(Boolean).join("\n\n=== TEXTO ADICIONAL / MANUAL ===\n\n");
  };

  const handleOpenSaveTextAsParadigm = (rawText: string, defaultTitle?: string, processNum?: string) => {
    // 1. Limpar cabeçalhos artificiais "=== DOCUMENTO: ... ==="
    let cleanText = cleanDocumentHeaders(rawText || "").trim();
    if (!cleanText) return;
    setEditingParadigm(null);
    setFormFullText(cleanText);

    // Auto extrair número do processo
    const procRegex = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/;
    const foundProc = processNum || (cleanText.match(procRegex) ? cleanText.match(procRegex)![0] : "");
    setFormProcessNumber(foundProc);

    // 2. Extração Inteligente do Nome da Ação Judicial (do trecho ou do documento ativo)
    const activeFullDoc = getActiveViewText();
    const actionFromSnippet = extractJudicialActionName(cleanText);
    const actionFromDoc = extractJudicialActionName(activeFullDoc);
    const detectedAction = actionFromSnippet || actionFromDoc;

    const textSample = (cleanText + " " + activeFullDoc.slice(0, 1000)).toLowerCase();
    let guessedType: JudgeParadigmModel["decisionType"] = "procedencia";
    if (textSample.includes("improcedente") || textSample.includes("improcedência") || textSample.includes("julgo improcedente")) {
      guessedType = "improcedencia";
    } else if (textSample.includes("parcialmente procedente") || textSample.includes("parcial procedência")) {
      guessedType = "parcial_procedencia";
    } else if (textSample.includes("extin") || textSample.includes("sem resolução") || textSample.includes("art. 485")) {
      guessedType = "extincao_sem_merito";
    } else if (textSample.includes("tutela") && (textSample.includes("defiro") || textSample.includes("concedo"))) {
      guessedType = "tutela_deferida";
    } else if (textSample.includes("tutela") && (textSample.includes("indefiro") || textSample.includes("rejeito"))) {
      guessedType = "tutela_indeferida";
    } else if (textSample.includes("despacho") || textSample.includes("intime-se") || textSample.includes("cite-se")) {
      guessedType = "despacho_interlocutoria";
    }
    setFormDecisionType(guessedType);

    let guessedCategory = "Direito do Consumidor";
    if (textSample.includes("banco") || textSample.includes("empréstimo") || textSample.includes("rmc") || textSample.includes("rcc") || textSample.includes("tarifa") || textSample.includes("instituição financeira")) {
      guessedCategory = "Direito Bancário";
    } else if (textSample.includes("fazenda") || textSample.includes("estado de goiás") || textSample.includes("município") || textSample.includes("tributário") || textSample.includes("insalubridade") || textSample.includes("servidor público") || textSample.includes("tempo de serviço") || textSample.includes("adicional")) {
      guessedCategory = "Fazenda Pública";
    } else if (textSample.includes("família") || textSample.includes("alimentos") || textSample.includes("divórcio") || textSample.includes("guarda")) {
      guessedCategory = "Direito de Família";
    } else if (textSample.includes("crime") || textSample.includes("penal") || textSample.includes("delito")) {
      guessedCategory = "Direito Criminal";
    } else if (textSample.includes("processual") || textSample.includes("competência") || textSample.includes("emenda")) {
      guessedCategory = "Processual Civil";
    }
    setFormCategory(guessedCategory);

    // Definir título priorizando o NOME DA AÇÃO real (ex: "AÇÃO DE COBRANÇA DE DIFERENÇAS...")
    let derivedTitle = "";
    if (detectedAction) {
      derivedTitle = detectedAction;
    } else if (defaultTitle && !defaultTitle.includes("=== DOCUMENTO") && !defaultTitle.startsWith("DOCUMENTO:") && !defaultTitle.toLowerCase().endsWith(".pdf")) {
      derivedTitle = defaultTitle;
    } else {
      const firstMeaningfulLine = cleanText.split("\n")
        .map((l) => l.trim().replace(/^[*_#\s-]+/, "").replace(/[*_#\s-]+$/, ""))
        .filter((l) => l.length > 5 && !l.toLowerCase().includes("poder judiciário") && !l.toLowerCase().includes("tribunal de justiça") && !l.startsWith("==="))[0] || "";
      derivedTitle = firstMeaningfulLine.slice(0, 110) || `Decisão Paradigma ${foundProc ? `(${foundProc})` : ""}`;
    }
    setFormTitle(derivedTitle);

    // Resumo limpo sem ruídos
    const cleanSummaryText = cleanText
      .replace(/^===+\s*DOCUMENTO:[^=]+===+\s*/i, "")
      .replace(/^PODER JUDICI[AÁ]RIO[^\n]*\n?/i, "")
      .replace(/^Tribunal de Justi[cç]a[^\n]*\n?/i, "")
      .replace(/^\*\*SENTEN[CÇ]A\*\*\s*/i, "")
      .trim();
    const summaryCandidate = cleanSummaryText.slice(0, 240).trim().replace(/\n+/g, " ") + "...";
    setFormSummary(summaryCandidate);

    setIsFormOpen(true);
  };

  const handleInjectRawTextIntoCaderno = (rawText: string, label?: string) => {
    const cleanText = cleanDocumentHeaders(rawText || "").trim();
    if (!cleanText) return;

    // Check for exact substring match (case insensitive) to prevent duplicates
    if (text.toLowerCase().includes(cleanText.toLowerCase())) {
      setCandidateFeedback(`⚠️ Atenção: Este trecho (ou texto idêntico) já consta inserido no Caderno de Teses atual! Injeção cancelada para evitar duplicidade.`);
      setTimeout(() => setCandidateFeedback(null), 5000);
      return;
    }

    const detectedAction = extractJudicialActionName(cleanText) || extractJudicialActionName(getActiveViewText());
    const nextNumber = detectedTopics + 1;
    const blockTitle = detectedAction || label || "NOVO ENTENDIMENTO DO GABINETE";
    const newTeseBlock = `\n\n${nextNumber}. [TESE PARADIGMA: ${blockTitle.toUpperCase()}]

${nextNumber}.1. Hipótese e Síntese:
   - Entendimento fixado pelo magistrado em decisão de referência.

${nextNumber}.2. Fundamentação e Texto Integral:
${cleanText}
`;
    setText((prev) => prev.trimEnd() + newTeseBlock);
    setCandidateFeedback(`⚡ Trecho do texto/decisão injetado com sucesso no Caderno de Teses!`);
    setTimeout(() => setCandidateFeedback(null), 4000);
  };

  const handleFullTextSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start !== undefined && end !== undefined && start !== end) {
      const selected = target.value.substring(start, end).trim();
      if (selected.length > 3) {
        setSelectedTextExcerpt(selected);
      }
    }
  };

  const handleFormattedMouseUp = () => {
    const selection = window.getSelection();
    if (selection) {
      const selected = selection.toString().trim();
      if (selected.length > 3) {
        setSelectedTextExcerpt(selected);
      }
    }
  };

  const handleExpandSelectionToParagraph = () => {
    if (!selectedTextExcerpt) return;
    const fullText = getActiveViewText();
    const paragraphs = fullText.split(/\n\n+/);
    for (const p of paragraphs) {
      const cleanP = p.trim();
      if (cleanP.includes(selectedTextExcerpt) || selectedTextExcerpt.includes(cleanP.slice(0, Math.min(50, cleanP.length)))) {
        setSelectedTextExcerpt(cleanP);
        setCandidateFeedback("↔️ Seleção expandida para o parágrafo completo!");
        setTimeout(() => setCandidateFeedback(null), 3000);
        return;
      }
    }
    setCandidateFeedback("ℹ️ O trecho já abrange o parágrafo ou está isolado.");
    setTimeout(() => setCandidateFeedback(null), 2500);
  };

  const handleExpandSurroundingSentences = () => {
    if (!selectedTextExcerpt) return;
    const fullText = getActiveViewText();
    const idx = fullText.indexOf(selectedTextExcerpt);
    if (idx === -1) {
      setCandidateFeedback("ℹ️ Você pode editar e estender o texto diretamente na caixa de ajuste abaixo.");
      setTimeout(() => setCandidateFeedback(null), 2500);
      return;
    }

    // Expandir para o início da frase/parágrafo anterior
    const before = fullText.slice(0, idx);
    const lastDelimBefore = Math.max(before.lastIndexOf(". "), before.lastIndexOf(".\n"), before.lastIndexOf("\n\n"));
    const newStart = lastDelimBefore !== -1 ? lastDelimBefore + 2 : 0;

    // Expandir para o final da frase/parágrafo seguinte
    const after = fullText.slice(idx + selectedTextExcerpt.length);
    const nextDelimAfter = after.search(/\.\s|\.\n|\n\n/);
    const newEnd = nextDelimAfter !== -1 ? idx + selectedTextExcerpt.length + nextDelimAfter + 1 : fullText.length;

    const expanded = fullText.slice(newStart, newEnd).trim();
    if (expanded && expanded !== selectedTextExcerpt) {
      setSelectedTextExcerpt(expanded);
      setCandidateFeedback("🔍 Seleção expandida com o contexto ao redor!");
      setTimeout(() => setCandidateFeedback(null), 3000);
    }
  };

  const handleTrimSelection = () => {
    if (!selectedTextExcerpt) return;
    const trimmed = selectedTextExcerpt
      .replace(/^["'“”‘’«»>\s-]+/, "")
      .replace(/["'“”‘’«»\s-]+$/, "")
      .trim();
    setSelectedTextExcerpt(trimmed);
    setCandidateFeedback("✂️ Bordas e aspas aparadas com sucesso!");
    setTimeout(() => setCandidateFeedback(null), 2500);
  };

  const handleCleanCurrentText = () => {
    if (selectedFileTab >= 0 && importedFiles[selectedFileTab]) {
      const cleaned = cleanJudicialPdfText(importedFiles[selectedFileTab].text);
      setImportedFiles((prev) =>
        prev.map((f, i) => (i === selectedFileTab ? { ...f, text: cleaned } : f))
      );
    } else {
      if (pastedRawText.trim()) {
        setPastedRawText(cleanJudicialPdfText(pastedRawText));
      }
      setImportedFiles((prev) =>
        prev.map((f) => ({ ...f, text: cleanJudicialPdfText(f.text) }))
      );
    }
    setCandidateFeedback("🧹 Assinaturas laterais, rodapés e cabeçalhos removidos com sucesso! Texto normalizado e contínuo.");
    setTimeout(() => setCandidateFeedback(null), 4000);
  };

  // Filtered Candidates in Tab 3
  const filteredCandidates = extractedCandidates.filter((cand) => {
    const matchesSearch =
      searchCandidateQuery.trim() === "" ||
      cand.title.toLowerCase().includes(searchCandidateQuery.toLowerCase()) ||
      (cand.summary && cand.summary.toLowerCase().includes(searchCandidateQuery.toLowerCase())) ||
      (cand.processNumber && cand.processNumber.includes(searchCandidateQuery)) ||
      cand.category.toLowerCase().includes(searchCandidateQuery.toLowerCase()) ||
      cand.fullText.toLowerCase().includes(searchCandidateQuery.toLowerCase());

    const matchesType =
      filterCandidateType === "all" || cand.decisionType === filterCandidateType;

    return matchesSearch && matchesType;
  });

  // Filtered Paradigms in Tab 2
  const filteredParadigms = paradigms.filter((item) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.processNumber && item.processNumber.includes(searchQuery)) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fullText.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      filterDecisionType === "all" || item.decisionType === filterDecisionType;

    return matchesSearch && matchesType;
  });

  const totalParadigmPages = Math.ceil(filteredParadigms.length / paradigmsPerPage) || 1;
  const paginatedParadigms = filteredParadigms.slice(
    (paradigmsPage - 1) * paradigmsPerPage,
    paradigmsPage * paradigmsPerPage
  );

  const filteredSuggestedTheses = getFilteredSuggestedTheses();
  const totalSuggestedPages = Math.ceil(filteredSuggestedTheses.length / suggestedPerPage) || 1;
  const paginatedSuggestedTheses = filteredSuggestedTheses.slice(
    (suggestedPage - 1) * suggestedPerPage,
    suggestedPage * suggestedPerPage
  );

  const totalCandidatePages = Math.ceil(filteredCandidates.length / candidatesPerPage) || 1;
  const paginatedCandidates = filteredCandidates.slice(
    (candidatesPage - 1) * candidatesPerPage,
    candidatesPage * candidatesPerPage
  );

  return (
    <div className="fixed inset-0 z-50 bg-amber-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 w-full max-w-5xl h-[98vh] sm:h-auto max-h-[98vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-3 sm:p-5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-amber-900/50 rounded-xl border border-amber-400/30 shrink-0">
              <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold">Caderno de Teses & Modelos do Gabinete</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-100 text-[10px] font-bold uppercase tracking-wider border border-amber-300/30">
                  TJGO • Diretrizes Oficiais
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-100/90 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Diretrizes normativas e modelos autênticos de decisões do Magistrado injetados na IA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-amber-800/60 rounded-lg text-amber-200 hover:text-white transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div id="tour-teses-tabs" className="bg-amber-100 px-3 sm:px-4 pt-2 border-b border-amber-200 flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-amber-300 scrollbar-track-transparent shrink-0">
          <div className="flex items-center gap-1 shrink-0">
            <button
              id="tour-teses-caderno-tab"
              onClick={() => setActiveTab("caderno")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer border-t shrink-0 border-x ${
                activeTab === "caderno"
                  ? "bg-white text-amber-900 border-amber-200 shadow-2xs -mb-px"
                  : "bg-transparent text-amber-600 hover:text-amber-900 border-transparent"
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>Teses Normativas</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                {detectedTopics} teses
              </span>
            </button>

            <button
              id="tour-teses-modelos-tab"
              onClick={() => setActiveTab("modelos_paradigmas")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer border-t shrink-0 border-x ${
                activeTab === "modelos_paradigmas"
                  ? "bg-white text-amber-900 border-amber-200 shadow-2xs -mb-px"
                  : "bg-transparent text-amber-600 hover:text-amber-900 border-transparent"
              }`}
            >
              <Gavel className="w-4 h-4 text-amber-600" />
              <span>⚖️ Modelos de Decisões</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {paradigms.length} modelos
              </span>
            </button>

            <button
              id="tour-teses-pdf-tab"
              onClick={() => setActiveTab("importar_pdf")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer border-t shrink-0 border-x ${
                activeTab === "importar_pdf"
                  ? "bg-white text-amber-900 border-amber-200 shadow-2xs -mb-px"
                  : "bg-transparent text-amber-600 hover:text-amber-900 border-transparent"
              }`}
            >
              <FileUp className="w-4 h-4 text-amber-600" />
              <span>📑 Mapear PDFs (IA)</span>
              {extractedCandidates.length > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {extractedCandidates.length}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold">
                  Novo
                </span>
              )}
            </button>

            <button
              id="tour-teses-varredura-tab"
              onClick={() => {
                setActiveTab("varredura_automatica");
                if (suggestedTheses.length === 0 && !isScanningTheses) {
                  handleRunCabinetThesesScan();
                }
              }}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer border-t shrink-0 border-x ${
                activeTab === "varredura_automatica"
                  ? "bg-white text-indigo-900 border-amber-200 shadow-2xs -mb-px"
                  : "bg-transparent text-amber-600 hover:text-amber-900 border-transparent"
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>✨ Varredura Automática</span>
              {suggestedTheses.length > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-bold animate-in zoom-in-50">
                  {suggestedTheses.filter((t) => !t.isDuplicate).length} inéditas
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                  IA
                </span>
              )}
            </button>
            <button
              id="tour-teses-base-conhecimento-tab"
              onClick={() => setActiveTab("base_conhecimento")}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-2 cursor-pointer border-t shrink-0 border-x ${
                activeTab === "base_conhecimento"
                  ? "bg-white text-amber-900 border-amber-200 shadow-2xs -mb-px"
                  : "bg-transparent text-amber-600 hover:text-amber-900 border-transparent"
              }`}
            >
              <Database className="w-4 h-4 text-amber-600" />
              <span>Base de Conhecimento</span>
            </button>
          </div>

          {activeTab === "caderno" && (
            <div className="flex items-center gap-2 pb-2">
              <button
                onClick={handleToggle}
                className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer border ${
                  isEnabled
                    ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                    : "bg-amber-200 text-amber-600 border-amber-300 hover:bg-amber-300"
                }`}
                title="Ativa ou desativa a injeção destas teses no prompt de geração de minutas da IA"
              >
                {isEnabled ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-amber-900" />
                    <span>Injeção Ativa na IA</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-amber-400" />
                    <span>Injeção Desativada</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Toast Notification Visual Feedback */}
        {toastNotification && (
          <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-semibold shadow-md animate-in slide-in-from-top-2 duration-200 shrink-0 z-30">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
              <span>{toastNotification.message}</span>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="p-1 hover:bg-emerald-700 rounded text-emerald-100 hover:text-white transition cursor-pointer"
              title="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-amber-50">
          {/* TAB 1: CADERNO DE TESES */}
          {activeTab === "caderno" && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Informative Banner */}
              <div className="p-3.5 bg-amber-50/90 border-2 border-amber-400/80 rounded-xl flex items-start justify-between gap-3 text-xs text-amber-950 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <BookOpen className="w-24 h-24 text-amber-900" />
                </div>
                <div className="flex items-start gap-2.5 relative z-10">
                  <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="font-bold text-[13px] text-amber-900">Como funciona o Teses Normativas (Regras Universais):</p>
                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      <strong>🚨 ATENÇÃO:</strong> As diretrizes, regras e teses deste caderno são <strong>INJETADAS OBRIGATORIAMENTE EM TODAS AS ANÁLISES E MINUTAS</strong> geradas pelo sistema, independentemente de qualquer ação do usuário. 
                      Utilize este caderno <strong>apenas</strong> para regras gerais, comandos padronizados de formatação do juízo, teses jurídicas pacificadas (ex: dano moral, regras de citação, parâmetros de custas) e instruções que devem ser observadas <strong>sempre</strong>. 
                      Para modelos de sentenças específicas que dependem de similaridade de fatos, utilize a aba de <strong>Modelos Paradigmas do Juiz</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
                  <span className="px-2 py-1 bg-amber-200/80 rounded text-[11px] font-bold text-amber-900">
                    {detectedTopics} Tópicos / {detectedHypotheses} Hipóteses
                  </span>
                </div>
              </div>

              {/* Editor */}
              <div className="bg-white rounded-xl border border-amber-200 shadow-xs overflow-hidden">
                <div className="p-2.5 bg-amber-100 border-b border-amber-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-bold text-amber-700">Editor de Teses e Hipóteses do Juízo</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveTab("varredura_automatica");
                        if (suggestedTheses.length === 0 && !isScanningTheses) {
                          handleRunCabinetThesesScan();
                        }
                      }}
                      className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                      title="Escanear decisões salvas e modelos do gabinete para sugerir novas teses automaticamente"
                    >
                      <Sparkles className="w-3 h-3 text-amber-200" />
                      <span>✨ Sugerir Teses com IA (Varredura)</span>
                    </button>

                    <button
                      onClick={handleInsertTemplate}
                      className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-amber-300 text-amber-700 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Inserir estrutura padronizada de novo tema/hipótese"
                    >
                      <Plus className="w-3 h-3 text-amber-900" />
                      <span>Inserir Novo Lançamento</span>
                    </button>

                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(text);
                        setCopiedCaderno(true);
                        setTimeout(() => setCopiedCaderno(false), 2000);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-amber-300 text-amber-700 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedCaderno ? <Check className="w-3 h-3 text-amber-900" /> : <Copy className="w-3 h-3 text-amber-500" />}
                      <span>{copiedCaderno ? "Copiado!" : "Copiar Tudo"}</span>
                    </button>
                  </div>
                </div>

                <textarea
                  rows={20}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Insira aqui as teses jurídicas e entendimentos pacificados do gabinete..."
                  className="w-full p-4 text-xs font-mono bg-white text-amber-900 border-0 focus:ring-0 focus:outline-none leading-relaxed resize-y"
                />
              </div>

              {/* Reset Option for Admin */}
              {isAdmin && (
                <div className="pt-2 flex items-center justify-between text-xs text-amber-500">
                  {showConfirmReset ? (
                    <div className="flex items-center gap-2 bg-rose-50 p-2 rounded-lg border border-rose-200">
                      <span className="text-rose-800 font-semibold text-[11px]">
                        Restaurar para as teses padrões originais do sistema?
                      </span>
                      <button
                        onClick={handleReset}
                        className="px-2 py-0.5 bg-rose-600 text-white font-bold rounded text-[10px] hover:bg-rose-500 cursor-pointer"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setShowConfirmReset(false)}
                        className="px-2 py-0.5 bg-amber-200 text-amber-700 rounded text-[10px] hover:bg-amber-300 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowConfirmReset(true)}
                      className="text-rose-600 hover:text-rose-800 flex items-center gap-1 transition cursor-pointer font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restaurar teses padrão do sistema</span>
                    </button>
                  )}

                  <span>Caderno compartilhado com toda a equipe do gabinete</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MODELOS PARADIGMAS DO JUIZ */}
          {activeTab === "modelos_paradigmas" && (
            <div className="space-y-4 max-w-5xl mx-auto">
              {/* Header card with action */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100/60 border-2 border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-1/4 p-2 opacity-5 pointer-events-none">
                  <Gavel className="w-24 h-24 text-amber-900" />
                </div>
                <div className="space-y-1.5 relative z-10 max-w-3xl">
                  <h3 className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                    <Gavel className="w-4 h-4 text-amber-700" />
                    Biblioteca de Modelos Paradigmas do Magistrado (Sob Demanda)
                  </h3>
                  <p className="text-amber-900/90 text-[11px] leading-relaxed">
                    <strong>📌 CASOS ESPECÍFICOS:</strong> Diferente do <em>Teses Normativas</em> (que é injetado em todas as minutas), os <strong>Modelos Paradigmas</strong> funcionam <strong>sob demanda</strong>. 
                    Salve aqui decisões autênticas, sentenças procedentes/improcedentes, extinções e tutelas. 
                    Na tela principal, vincule o paradigma correspondente diretamente no seletor de modelos. Se desejar transformar partes ou fundamentações deste modelo em tese permanente, utilize o botão <strong>Injetar no Caderno</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto flex-shrink-0 relative z-10">
                  {paradigms.some(p => p.isDefault || (p.id && p.id.startsWith("paradigm-") && !isNaN(Number(p.id.replace("paradigm-", ""))))) && (
                    <button
                      type="button"
                      onClick={handlePurgeDefaultParadigms}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs text-xs"
                      title="Excluir todos os modelos padrão do sistema que foram inseridos automaticamente"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Limpar Modelos Padrão ({paradigms.filter(p => p.isDefault || (p.id && p.id.startsWith("paradigm-") && !isNaN(Number(p.id.replace("paradigm-", ""))))).length})</span>
                    </button>
                  )}

                  <button
                    onClick={handleOpenNewParadigmForm}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Novo Modelo</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por tema, nº de processo, matéria ou palavras no texto..."
                    className="w-full pl-8 pr-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2 text-amber-400 hover:text-amber-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-3.5 h-3.5 text-amber-500" />
                  <select
                    value={filterDecisionType}
                    onChange={(e) => setFilterDecisionType(e.target.value)}
                    className="p-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="all">Todos os Tipos ({paradigms.length})</option>
                    <option value="procedencia">Procedência Total</option>
                    <option value="improcedencia">Improcedência</option>
                    <option value="parcial_procedencia">Parcial Procedência</option>
                    <option value="extincao_sem_merito">Extinção sem Resolução</option>
                    <option value="tutela_deferida">Tutela Deferida</option>
                    <option value="tutela_indeferida">Tutela Indeferida</option>
                    <option value="despacho_interlocutoria">Despachos / Interlocutórias</option>
                  </select>
                </div>
              </div>

              {/* List of Paradigm Models */}
              {filteredParadigms.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-amber-200 space-y-2">
                  <Bookmark className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="font-bold text-amber-700 text-sm">Nenhum modelo paradigma encontrado</p>
                  <p className="text-xs text-amber-500 max-w-md mx-auto">
                    Tente limpar o filtro de busca ou cadastre um novo modelo com o botão "Cadastrar Novo Modelo".
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedParadigms.map((model) => {
                    const cfg = DECISION_TYPE_CONFIG[model.decisionType] || {
                      label: model.decisionType,
                      bg: "bg-amber-50",
                      text: "text-amber-800",
                      border: "border-amber-300",
                      icon: "📄",
                    };
                    const isExpanded = expandedParadigmId === model.id;
                    const isCopied = copiedParadigmId === model.id;
                    const isInjected = injectedParadigmId === model.id || checkIsModelInCaderno(model);

                    return (
                      <div
                        key={model.id}
                        className={`bg-white rounded-xl border transition shadow-2xs overflow-hidden ${
                          isExpanded ? "border-amber-400 ring-1 ring-amber-300" : "border-amber-200 hover:border-amber-300"
                        }`}
                      >
                        {/* Paradigm Card Header */}
                        <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${cfg.bg} ${cfg.text} ${cfg.border}`}
                              >
                                <span>{cfg.icon}</span>
                                <span>{cfg.label}</span>
                              </span>

                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                                {model.category}
                              </span>

                              {model.processNumber && (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-mono font-bold flex items-center gap-1">
                                  <span>Autos nº:</span>
                                  <span>{model.processNumber}</span>
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-amber-900 text-sm">
                              {model.title}
                            </h4>

                            {model.summary && (
                              <p className="text-xs text-amber-600 line-clamp-2 leading-relaxed">
                                {model.summary}
                              </p>
                            )}
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0 self-start sm:self-center">
                            {onInjectDirectParadigm && (
                              <button
                                type="button"
                                onClick={() => onInjectDirectParadigm(model.fullText, model.title, model.id)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition cursor-pointer border shadow-2xs bg-amber-400 hover:bg-amber-300 text-slate-900 border-amber-500"
                                title="Injetar este modelo de decisão diretamente no Gerador de Minutas como Paradigma do Juiz"
                              >
                                <Zap className="w-3.5 h-3.5 fill-slate-900" />
                                <span>⚡ Injetar no Prompt</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleCopyParadigm(model)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition cursor-pointer border ${
                                isCopied
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-400"
                                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                              }`}
                              title="Copiar texto integral para a área de transferência"
                            >
                              {isCopied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-emerald-700" />}
                              <span>{isCopied ? "✓ Copiado!" : "Copiar Texto"}</span>
                            </button>

                            <button
                              onClick={() => handleInjectParadigmIntoCaderno(model)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition cursor-pointer border ${
                                isInjected
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-400"
                                  : "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300"
                              }`}
                              title="Selecionar trechos deste modelo para injetar no Caderno Normativo"
                            >
                              {isInjected ? <Check className="w-3 h-3 text-white" /> : <Sparkles className="w-3 h-3 text-blue-700" />}
                              <span>{isInjected ? "✓ Injetado no Caderno!" : "Injetar no Caderno"}</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditParadigmForm(model)}
                              className="p-1 text-amber-500 hover:text-amber-800 hover:bg-amber-100 rounded transition cursor-pointer"
                              title="Editar Modelo"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteParadigm(model.id, model.title)}
                              className="p-1 text-rose-500 hover:text-rose-800 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="Excluir Modelo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() =>
                                setExpandedParadigmId(isExpanded ? null : model.id)
                              }
                              className="p-1 text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded transition cursor-pointer"
                              title={isExpanded ? "Ocultar texto integral" : "Ver texto integral"}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Full Text View if expanded */}
                        {isExpanded && (
                          <div className="p-4 bg-amber-900 text-amber-100 border-t border-amber-700 text-xs font-mono space-y-2 max-h-96 overflow-y-auto">
                            <div className="flex items-center justify-between text-amber-400 text-[10px] pb-1 border-b border-amber-800">
                              <span>TEXTO INTEGRAL DO MODELO PARADIGMA</span>
                              <span>{model.fullText.length.toLocaleString()} caracteres</span>
                            </div>
                            <pre className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                              {model.fullText}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredParadigms.length > paradigmsPerPage && (
                    <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between text-xs shadow-2xs">
                      <span className="text-amber-800 text-[11px] sm:text-xs">
                        Mostrando <span className="font-bold">{(paradigmsPage - 1) * paradigmsPerPage + 1}</span> a <span className="font-bold">{Math.min(paradigmsPage * paradigmsPerPage, filteredParadigms.length)}</span> de <span className="font-bold">{filteredParadigms.length}</span> modelos
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={paradigmsPage <= 1}
                          onClick={() => setParadigmsPage((p) => Math.max(p - 1, 1))}
                          className="p-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Página Anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2 font-bold text-xs text-amber-900">
                          {paradigmsPage} / {totalParadigmPages}
                        </span>
                        <button
                          type="button"
                          disabled={paradigmsPage >= totalParadigmPages}
                          onClick={() => setParadigmsPage((p) => Math.min(p + 1, totalParadigmPages))}
                          className="p-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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

          {/* TAB 3: IMPORTAR PDF & MAPEAMENTO INTELIGENTE COM IA */}
          {activeTab === "importar_pdf" && (
            <div className="space-y-4 max-w-5xl mx-auto">
              {/* Header Info */}
              <div className="p-4 bg-gradient-to-r from-blue-50 via-amber-50 to-amber-100/50 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <h3 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Mapeamento & Extração Inteligente de Decisões e Teses (IA)
                  </h3>
                  <p className="text-amber-700 text-[11px] leading-relaxed">
                    Envie PDFs de <strong>sentenças, decisões, despachos ou jurisprudências</strong>. A IA lê o texto, extrai os atos, identifica o ramo do direito, formula a tese normativa e gera o modelo estruturado para você <strong>injetar no Caderno</strong> ou <strong>salvar na Biblioteca de Modelos do Juiz</strong>.
                  </p>
                </div>
              </div>

              {/* Feedback / Error notifications */}
              {candidateFeedback && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-900 flex-shrink-0" />
                    <span>{candidateFeedback}</span>
                  </div>
                  <button
                    onClick={() => setCandidateFeedback(null)}
                    className="text-amber-700 hover:text-amber-900 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              {mappingError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{mappingError}</span>
                  </div>
                  <button
                    onClick={() => setMappingError(null)}
                    className="text-rose-700 hover:text-rose-900 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Upload & Direct Input Section */}
              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <UploadCloud className="w-4 h-4 text-amber-600" />
                    <span>1. Anexar Arquivos PDF / Documentos ou Colar Texto</span>
                  </div>

                  {importedFiles.length > 0 && (
                    <button
                      onClick={() => setImportedFiles([])}
                      className="text-amber-500 hover:text-rose-600 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpar todos os arquivos ({importedFiles.length})</span>
                    </button>
                  )}
                </div>

                {/* Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFileUpload(e.dataTransfer.files);
                    }
                  }}
                  className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50/70 transition rounded-xl p-5 text-center cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.doc,.docx,.md"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files);
                      }
                    }}
                  />

                  <div className="p-3 bg-amber-100/80 text-amber-700 rounded-full">
                    <FileUp className="w-6 h-6" />
                  </div>

                  <div>
                    <p className="font-bold text-amber-800 text-xs">
                      Clique para selecionar ou arraste arquivos PDF aqui
                    </p>
                    <p className="text-[11px] text-amber-500 mt-0.5">
                      Suporte a múltiplos arquivos PDF (decisões, sentenças, jurisprudências) e TXT
                    </p>
                  </div>
                </div>

                {/* Extraction progress indicator */}
                {isExtractingPdf && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs font-semibold text-blue-900 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>{extractProgress || "Extraindo texto dos arquivos PDF..."}</span>
                  </div>
                )}

                {/* Error Banner */}
                {mappingError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start justify-between gap-2 text-xs text-rose-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{mappingError}</span>
                    </div>
                    <button
                      onClick={() => setMappingError(null)}
                      className="text-rose-400 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                      title="Fechar aviso"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Attached Files List */}
                {importedFiles.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-bold text-amber-700 text-[11px] uppercase tracking-wider">
                      Arquivos Carregados para Processamento ({importedFiles.length}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {importedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-amber-800 text-xs truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[10px] text-amber-500">
                                {(file.size / 1024).toFixed(1)} KB
                                {file.pageCount ? ` • ${file.pageCount} pág(s)` : ""} •{" "}
                                {file.text.length.toLocaleString()} caracteres
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveImportedFile(idx)}
                            className="p-1 text-amber-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Remover arquivo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Text Pasting Area */}
                <div className="space-y-1 pt-1">
                  <label className="block font-bold text-amber-800 text-xs">
                    Ou Cole o Texto da Decisão / Sentença / Compêndio de Teses Diretamente:
                  </label>
                  <textarea
                    rows={4}
                    value={pastedRawText}
                    onChange={(e) => setPastedRawText(e.target.value)}
                    placeholder="Cole aqui o texto integral de uma ou mais decisões judiciais, sentenças com múltiplos capítulos, acórdãos ou coletâneas de teses..."
                    className="w-full p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono text-xs leading-relaxed"
                  />
                </div>

                {/* Interactive Full Text Viewer, Selector & Fast Action Bar */}
                {(importedFiles.length > 0 || pastedRawText.trim().length > 0) && (
                  <div className="p-4 bg-white rounded-xl border-2 border-amber-300 shadow-sm space-y-3">
                    {/* Header with Mode Switcher & Expand/Collapse */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                          📄
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-amber-950 flex items-center gap-2">
                            <span>Visualizador do Texto Integral (Formatação Contínua)</span>
                            <span className="text-[10px] font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {getActiveViewText().length.toLocaleString()} caracteres
                            </span>
                          </h4>
                          <p className="text-[11px] text-amber-700">
                            Texto corrido sem quebras artificiais de página, com negritos preservados e livre de assinaturas laterais/cabeçalhos
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-amber-100/70 p-0.5 rounded-lg border border-amber-200">
                          <button
                            type="button"
                            onClick={() => setViewerFormatMode("formatted")}
                            className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                              viewerFormatMode === "formatted"
                                ? "bg-white text-amber-950 shadow-2xs"
                                : "text-amber-800 hover:text-amber-950"
                            }`}
                            title="Exibir texto formatado com negritos, tópicos e estilo original do PDF"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-700" />
                            <span>Formatado (PDF)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewerFormatMode("raw")}
                            className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                              viewerFormatMode === "raw"
                                ? "bg-white text-amber-950 shadow-2xs"
                                : "text-amber-800 hover:text-amber-950"
                            }`}
                            title="Exibir código Markdown / texto puro"
                          >
                            <Code className="w-3.5 h-3.5 text-amber-700" />
                            <span>Texto Puro</span>
                          </button>
                        </div>

                        {/* Clean signatures & headers button */}
                        <button
                          type="button"
                          onClick={handleCleanCurrentText}
                          className="px-2 py-1 rounded-lg text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200/80 transition cursor-pointer flex items-center gap-1 border border-amber-300 shadow-2xs"
                          title="Remover automaticamente marcas d'água laterais de assinatura digital, números de folha e cabeçalhos de tribunal"
                        >
                          <Brush className="w-3.5 h-3.5 text-amber-800" />
                          <span>🧹 Limpar Assinaturas/Rodapés</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsFullTextViewerOpen(!isFullTextViewerOpen)}
                          className="text-xs font-bold text-amber-800 hover:text-amber-950 px-2 py-1 rounded hover:bg-amber-100/60 transition cursor-pointer flex items-center gap-1"
                        >
                          {isFullTextViewerOpen ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>Recolher Leitor</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>Expandir Leitor</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* File selector tabs if multiple imported files */}
                    {importedFiles.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setSelectedFileTab(-1)}
                          className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition cursor-pointer border ${
                            selectedFileTab === -1
                              ? "bg-amber-700 text-white border-amber-700 shadow-2xs"
                              : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                          }`}
                        >
                          Todos os Documentos ({importedFiles.length})
                        </button>
                        {importedFiles.map((file, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedFileTab(idx)}
                            className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition cursor-pointer border max-w-[180px] truncate ${
                              selectedFileTab === idx
                                ? "bg-amber-700 text-white border-amber-700 shadow-2xs"
                                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                            }`}
                            title={file.name}
                          >
                            {file.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Global Actions on Whole Text */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg">
                      <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                        <span>Ações Rápidas para Todo o Texto do Documento:</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {onInjectDirectParadigm && (
                          <button
                            type="button"
                            onClick={() => {
                              const activeText = getActiveViewText();
                              const fileName = selectedFileTab >= 0 && importedFiles[selectedFileTab] ? importedFiles[selectedFileTab].name : undefined;
                              onInjectDirectParadigm(activeText, fileName ? `Modelo: ${fileName.replace(/\.pdf$/i, "")}` : "Texto Integral Importado");
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 transition cursor-pointer flex items-center gap-1.5 shadow-2xs border border-amber-500"
                            title="Injetar todo o texto diretamente no Prompt Principal como Minuta Paradigma (Espelho de Formatação e Entendimento)"
                          >
                            <Zap className="w-3.5 h-3.5 fill-slate-900" />
                            <span>⚡ Injetar no Prompt (Espelho do Juiz)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const activeText = getActiveViewText();
                            const fileName = selectedFileTab >= 0 && importedFiles[selectedFileTab] ? importedFiles[selectedFileTab].name : undefined;
                            handleOpenSaveTextAsParadigm(activeText, fileName ? `Modelo: ${fileName.replace(/\.pdf$/i, "")}` : undefined);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          title="Salvar todo o texto deste documento como um modelo na biblioteca do juiz"
                        >
                          <Gavel className="w-3.5 h-3.5 text-amber-400" />
                          <span>Salvar Todo o Texto como Modelo do Juiz</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const activeText = getActiveViewText();
                            const fileName = selectedFileTab >= 0 && importedFiles[selectedFileTab] ? importedFiles[selectedFileTab].name : undefined;
                            handleInjectRawTextIntoCaderno(activeText, fileName ? `DOCUMENTO: ${fileName}` : undefined);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-700 hover:bg-blue-600 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          title="Injetar todo o texto deste documento diretamente no Caderno de Teses"
                        >
                          <Zap className="w-3.5 h-3.5 text-yellow-300" />
                          <span>Injetar Todo o Texto no Caderno</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(getActiveViewText());
                            setCopiedFullText(true);
                            setTimeout(() => setCopiedFullText(false), 2000);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-white border border-amber-300 hover:bg-amber-100/50 transition cursor-pointer flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedFullText ? "Copiado!" : "Copiar Tudo"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Text Viewport with Formatted & Raw Modes with Selection Listener */}
                    {isFullTextViewerOpen && (
                      <div className="space-y-2">
                        {viewerFormatMode === "formatted" ? (
                          <div className="relative">
                            <div
                              onMouseUp={handleFormattedMouseUp}
                              className="w-full p-4.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg max-h-96 overflow-y-auto leading-relaxed shadow-xs select-text cursor-text text-slate-900 dark:text-slate-100 text-sm font-sans selection:bg-amber-400 selection:text-slate-950"
                            >
                              <div className="prose prose-sm max-w-none text-slate-900 dark:text-slate-100 font-sans leading-relaxed">
                                <ReactMarkdown
                                  components={{
                                    h1: ({ node, children, ...props }) => (
                                      <h1 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mt-3 mb-1.5" {...props}>
                                        {highlightSelectedTextInNodes(children, selectedTextExcerpt)}
                                      </h1>
                                    ),
                                    h2: ({ node, children, ...props }) => (
                                      <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide mt-2.5 mb-1" {...props}>
                                        {highlightSelectedTextInNodes(children, selectedTextExcerpt)}
                                      </h2>
                                    ),
                                    h3: ({ node, children, ...props }) => (
                                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mt-2 mb-1" {...props}>
                                        {highlightSelectedTextInNodes(children, selectedTextExcerpt)}
                                      </h3>
                                    ),
                                    strong: ({ node, children, ...props }) => (
                                      <strong className="font-bold text-slate-950 dark:text-white" {...props}>
                                        {highlightSelectedTextInNodes(children, selectedTextExcerpt)}
                                      </strong>
                                    ),
                                    p: ({ node, children, ...props }) => (
                                      <p className="mb-2 text-justify text-xs text-slate-800 dark:text-slate-200 leading-relaxed" {...props}>
                                        {highlightSelectedTextInNodes(children, selectedTextExcerpt)}
                                      </p>
                                    ),
                                    blockquote: ({ node, children, ...props }) => (
                                      <blockquote className="border-l-2 border-slate-300 pl-3 my-2 text-slate-700 dark:text-slate-300 italic text-xs" {...props}>
                                        {highlightSelectedTextInNodes(children, selectedTextExcerpt)}
                                      </blockquote>
                                    ),
                                    ul: ({ node, children, ...props }) => (
                                      <ul className="list-disc pl-5 my-1.5 space-y-1 text-xs text-slate-800 dark:text-slate-200" {...props}>
                                        {highlightSelectedTextInNodes(children, selectedTextExcerpt)}
                                      </ul>
                                    ),
                                    ol: ({ node, children, ...props }) => (
                                      <ol className="list-decimal pl-5 my-1.5 space-y-1 text-xs text-slate-800 dark:text-slate-200" {...props}>
                                        {highlightSelectedTextInNodes(children, selectedTextExcerpt)}
                                      </ol>
                                    )
                                  }}
                                >
                                  {getActiveViewText()}
                                </ReactMarkdown>
                              </div>
                            </div>
                            <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] text-slate-600 bg-white/95 dark:bg-slate-800/95 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 shadow-2xs font-sans">
                              ✨ Texto contínuo e formatado • Selecione qualquer trecho para destacar e salvar
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <textarea
                              ref={fullTextareaRef}
                              rows={8}
                              readOnly
                              value={getActiveViewText()}
                              onSelect={handleFullTextSelect}
                              onMouseUp={handleFullTextSelect}
                              onKeyUp={handleFullTextSelect}
                              placeholder="Texto dos arquivos..."
                              className="w-full p-3 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-700 leading-relaxed shadow-inner select-text cursor-text selection:bg-amber-400 selection:text-slate-950"
                            />
                            <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] text-slate-500 bg-white/95 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                              💡 Selecione qualquer parte do texto acima com o mouse
                            </div>
                          </div>
                        )}

                        {/* Dynamic Studio when Text Selection is Active */}
                        {selectedTextExcerpt && (
                          <div className="p-3.5 bg-gradient-to-r from-amber-50 to-yellow-50/80 border-2 border-amber-500 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150 shadow-md">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping"></span>
                                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                  <Scissors className="w-4 h-4 text-amber-700" />
                                  Trecho Selecionado e Marcado no Texto
                                </span>
                                <span className="text-[11px] font-medium text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-300">
                                  {selectedTextExcerpt.length.toLocaleString()} caracteres • {selectedTextExcerpt.trim().split(/\s+/).filter(Boolean).length} palavras
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={handleExpandSelectionToParagraph}
                                  className="px-2.5 py-1 rounded-md bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold transition cursor-pointer border border-amber-300 shadow-2xs flex items-center gap-1"
                                  title="Expandir para o parágrafo completo onde o trecho está inserido"
                                >
                                  <span>↔️ Parágrafo Inteiro</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={handleExpandSurroundingSentences}
                                  className="px-2.5 py-1 rounded-md bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold transition cursor-pointer border border-amber-300 shadow-2xs flex items-center gap-1"
                                  title="Expandir para abranger as frases imediatamente antes e depois"
                                >
                                  <span>🔍 + Frases ao Redor</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={handleTrimSelection}
                                  className="px-2.5 py-1 rounded-md bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold transition cursor-pointer border border-amber-300 shadow-2xs flex items-center gap-1"
                                  title="Remover aspas, hífens ou espaços extras das bordas"
                                >
                                  <span>✂️ Aparar Bordas</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSelectedTextExcerpt("")}
                                  className="text-amber-800 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition cursor-pointer ml-1"
                                  title="Desmarcar / Limpar seleção"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Editable text area for fine-tuning the selection */}
                            <div className="space-y-1">
                              <textarea
                                value={selectedTextExcerpt}
                                onChange={(e) => setSelectedTextExcerpt(e.target.value)}
                                rows={3}
                                placeholder="Você pode digitar, ajustar ou recortar o trecho selecionado aqui..."
                                className="w-full p-2.5 font-sans text-xs text-slate-900 bg-white border-2 border-amber-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 leading-relaxed shadow-inner"
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              {onInjectDirectParadigm && (
                                <button
                                  type="button"
                                  onClick={() => onInjectDirectParadigm(selectedTextExcerpt, "Recorte de Decisão Selecionado")}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 transition cursor-pointer flex items-center gap-1.5 shadow-2xs border border-amber-500"
                                  title="Injetar este trecho selecionado diretamente no Prompt como Paradigma de Decisão"
                                >
                                  <Zap className="w-3.5 h-3.5 fill-slate-900" />
                                  <span>⚡ Injetar Parte no Prompt (Espelho)</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenSaveTextAsParadigm(selectedTextExcerpt, "Recorte de Decisão Paradigma")}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              >
                                <Gavel className="w-3.5 h-3.5 text-amber-400" />
                                <span>Salvar Parte Selecionada como Modelo do Juiz</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleInjectRawTextIntoCaderno(selectedTextExcerpt, "TRECHO DE DECISÃO SELECIONADO")}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-700 hover:bg-blue-600 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              >
                                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                                <span>Injetar Parte Selecionada no Caderno</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setPastedRawText(selectedTextExcerpt);
                                  setExtractionMode("exhaustive");
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 transition cursor-pointer flex items-center gap-1.5 border border-amber-400"
                                title="Submeter apenas este trecho ao Mapeamento IA"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                                <span>Mapear Só Esse Trecho com IA</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedTextExcerpt);
                                  setCopiedExcerpt(true);
                                  setTimeout(() => setCopiedExcerpt(false), 2000);
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copiedExcerpt ? "Copiado!" : "Copiar Trecho"}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Extraction Mode & AI Directives */}
                <div className="p-3 bg-gradient-to-r from-amber-50 to-amber-100/60 rounded-xl border border-amber-200 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Modo de Mapeamento da IA:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExtractionMode("exhaustive")}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer border flex items-center gap-1.5 ${
                          extractionMode === "exhaustive"
                            ? "bg-amber-700 text-white border-amber-700 shadow-xs ring-2 ring-amber-400"
                            : "bg-white text-amber-800 border-amber-300 hover:bg-amber-50"
                        }`}
                      >
                        <span>🌟</span>
                        <span>Mapeamento Exaustivo Multi-Teses</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExtractionMode("single_block")}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer border flex items-center gap-1.5 ${
                          extractionMode === "single_block"
                            ? "bg-amber-700 text-white border-amber-700 shadow-xs ring-2 ring-amber-400"
                            : "bg-white text-amber-800 border-amber-300 hover:bg-amber-50"
                        }`}
                      >
                        <span>📄</span>
                        <span>Decisão em Bloco Único</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    {extractionMode === "exhaustive" ? (
                      <span>
                        <strong>Modo Exaustivo Ativado:</strong> A IA varre todas as páginas e tópicos do documento para extrair <em>todas as preliminares, teses de mérito, dano moral, juros, devolução e pedidos autônomos</em> em itens individualizados prontos para triagem.
                      </span>
                    ) : (
                      <span>
                        <strong>Modo Bloco Único:</strong> A IA preservará a decisão integral como um único modelo padrão estruturado.
                      </span>
                    )}
                  </p>

                  <div className="pt-1">
                    <input
                      type="text"
                      value={customFocus}
                      onChange={(e) => setCustomFocus(e.target.value)}
                      placeholder="Diretriz ou foco adicional da extração (opcional, ex: 'Extrair todas as preliminares e dano moral', 'Focar em direito bancário')..."
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-amber-900 placeholder:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Mapping Action Trigger */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="text-amber-700 text-[11px]">
                    {importedFiles.length > 0 || pastedRawText.trim() ? (
                      <span className="text-amber-800 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Pronto para processar {importedFiles.length} arquivo(s) + texto ({extractionMode === "exhaustive" ? "Multi-Teses Exaustivo" : "Bloco Único"})
                      </span>
                    ) : (
                      <span>Adicione pelo menos um PDF ou texto para iniciar a extração</span>
                    )}
                  </div>

                  <button
                    onClick={handleRunAiMapping}
                    disabled={isMappingAi || isExtractingPdf || (importedFiles.length === 0 && !pastedRawText.trim())}
                    className={`px-4 py-2 font-bold text-white rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                      isMappingAi || isExtractingPdf || (importedFiles.length === 0 && !pastedRawText.trim())
                        ? "bg-amber-400 cursor-not-allowed"
                        : "bg-amber-600 hover:bg-amber-500"
                    }`}
                  >
                    {isMappingAi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Mapeando com IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-200" />
                        <span>2. Iniciar Mapeamento e Extração com IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Triage & Management of Extracted Candidates */}
              {extractedCandidates.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
                    <div>
                      <h4 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-600" />
                        Modelos & Teses Mapeados pela IA ({filteredCandidates.length} de {extractedCandidates.length})
                      </h4>
                      <p className="text-xs text-amber-600">
                        Revise os itens abaixo. Escolha se deseja <strong>salvar nos Modelos do Juiz</strong>, <strong>injetar no Caderno de Teses</strong> ou <strong>salvar em ambos</strong>.
                      </p>
                    </div>

                    {/* Batch Actions */}
                    {selectedCandidateIds.size > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap bg-white p-1.5 rounded-lg border border-amber-300 shadow-xs">
                        <span className="text-[11px] font-bold text-amber-900 px-1">
                          {selectedCandidateIds.size} selecionado(s):
                        </span>
                        <button
                          onClick={handleBatchSaveSelectedParadigms}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                          title="Salvar selecionados nos Modelos do Juiz"
                        >
                          <Gavel className="w-3 h-3" />
                          <span>Salvar no Juiz</span>
                        </button>
                        <button
                          onClick={handleBatchInjectSelectedCaderno}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                          title="Injetar selecionados no Caderno de Teses"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Injetar no Caderno</span>
                        </button>
                        <button
                          onClick={handleBatchDiscardSelected}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Descartar</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Filters & Search for Candidates */}
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={handleSelectAllCandidates}
                        className="px-2 py-1 text-amber-700 hover:bg-amber-100 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-amber-300"
                        title="Selecionar todos os itens da lista filtrada"
                      >
                        {selectedCandidateIds.size === filteredCandidates.length && filteredCandidates.length > 0 ? (
                          <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>Todos ({filteredCandidates.length})</span>
                      </button>

                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-2" />
                        <input
                          type="text"
                          value={searchCandidateQuery}
                          onChange={(e) => setSearchCandidateQuery(e.target.value)}
                          placeholder="Filtrar por título, resumo, processo ou matéria..."
                          className="w-full pl-7 pr-3 py-1 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-amber-500" />
                      <select
                        value={filterCandidateType}
                        onChange={(e) => setFilterCandidateType(e.target.value)}
                        className="p-1 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="all">Todos os Tipos ({extractedCandidates.length})</option>
                        <option value="procedencia">Procedência</option>
                        <option value="improcedencia">Improcedência</option>
                        <option value="parcial_procedencia">Parcial Procedência</option>
                        <option value="extincao_sem_merito">Extinção sem Resolução</option>
                        <option value="tutela_deferida">Tutela Deferida</option>
                        <option value="tutela_indeferida">Tutela Indeferida</option>
                        <option value="despacho_interlocutoria">Despacho / Interlocutória</option>
                      </select>
                    </div>
                  </div>

                  {/* Candidate Cards */}
                  <div className="space-y-3">
                    {paginatedCandidates.map((cand) => {
                      const cfg = DECISION_TYPE_CONFIG[cand.decisionType] || {
                        label: cand.decisionType,
                        bg: "bg-amber-50",
                        text: "text-amber-800",
                        border: "border-amber-300",
                        icon: "📄",
                      };
                      const isSelected = selectedCandidateIds.has(cand.id);
                      const isExpanded = expandedCandidateId === cand.id;
                      const isJustInteracted = lastInteractedCandidateId === cand.id;

                      // Card border & background styling depending on status
                      let cardStyle = "border-amber-200 bg-white hover:border-amber-300";
                      if (cand.status === "saved_paradigm") {
                        cardStyle = "border-l-4 border-l-emerald-600 bg-emerald-50/40 border-emerald-300 shadow-sm ring-1 ring-emerald-200/60";
                      } else if (cand.status === "injected_caderno") {
                        cardStyle = "border-l-4 border-l-blue-600 bg-blue-50/40 border-blue-300 shadow-sm ring-1 ring-blue-200/60";
                      } else if (cand.status === "both") {
                        cardStyle = "border-l-4 border-l-purple-600 bg-purple-50/40 border-purple-300 shadow-sm ring-1 ring-purple-200/60";
                      }

                      if (isSelected) {
                        cardStyle += " ring-2 ring-amber-400";
                      }

                      return (
                        <div
                          key={cand.id}
                          className={`rounded-xl border transition duration-150 shadow-2xs overflow-hidden ${cardStyle} ${
                            isJustInteracted ? "scale-[1.005]" : ""
                          }`}
                        >
                          <div className="p-3.5 flex flex-col md:flex-row md:items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <button
                                onClick={() => handleToggleSelectCandidate(cand.id)}
                                className="mt-0.5 text-amber-400 hover:text-amber-600 cursor-pointer flex-shrink-0"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-amber-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-amber-400" />
                                )}
                              </button>

                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${cfg.bg} ${cfg.text} ${cfg.border}`}
                                  >
                                    <span>{cfg.icon}</span>
                                    <span>{cfg.label}</span>
                                  </span>

                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                                    {cand.category}
                                  </span>

                                  {cand.processNumber && (
                                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-mono font-bold">
                                      Autos: {cand.processNumber}
                                    </span>
                                  )}

                                  {/* Prominent status badges */}
                                  {cand.status === "saved_paradigm" && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1 border border-emerald-300 shadow-2xs animate-in fade-in">
                                      <Check className="w-3 h-3 text-emerald-700" />
                                      Salvo no Juiz
                                    </span>
                                  )}
                                  {cand.status === "injected_caderno" && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center gap-1 border border-blue-300 shadow-2xs animate-in fade-in">
                                      <Sparkles className="w-3 h-3 text-blue-700" />
                                      Injetado no Caderno
                                    </span>
                                  )}
                                  {cand.status === "both" && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold flex items-center gap-1 border border-purple-300 shadow-2xs animate-in fade-in">
                                      <CheckCheck className="w-3 h-3 text-purple-700" />
                                      Salvo no Juiz & Injetado no Caderno
                                    </span>
                                  )}
                                </div>

                                <h4 className="font-bold text-amber-900 text-sm">{cand.title}</h4>

                                {cand.summary && (
                                  <p className="text-xs text-amber-700 leading-relaxed">
                                    {cand.summary}
                                  </p>
                                )}

                                {/* Key Highlights */}
                                {cand.keyHighlights && cand.keyHighlights.length > 0 && (
                                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                    {cand.keyHighlights.map((hl, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium"
                                      >
                                        • {hl}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions on candidate */}
                            <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0 self-start md:self-center">
                              {onInjectDirectParadigm && (
                                <button
                                  onClick={() => onInjectDirectParadigm(cand.fullText, cand.title)}
                                  className="px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition cursor-pointer border shadow-2xs bg-amber-400 hover:bg-amber-300 text-slate-900 border-amber-500"
                                  title="Injetar esta decisão diretamente no Prompt Principal como Caso Idêntico (Espelho de Formatação e Entendimento)"
                                >
                                  <Zap className="w-3.5 h-3.5 fill-slate-900" />
                                  <span>⚡ Injetar no Prompt</span>
                                </button>
                              )}

                              {/* Option 1: Salvar no Juiz */}
                              <button
                                onClick={() => handleSaveCandidateAsParadigm(cand)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition cursor-pointer border shadow-2xs ${
                                  cand.status === "saved_paradigm" || cand.status === "both"
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 ring-2 ring-emerald-400/60"
                                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 hover:border-emerald-500"
                                }`}
                                title="Salvar na Biblioteca de Modelos Paradigmas do Juiz"
                              >
                                {cand.status === "saved_paradigm" || cand.status === "both" ? (
                                  <Check className="w-3.5 h-3.5 text-white" />
                                ) : (
                                  <Gavel className="w-3.5 h-3.5 text-emerald-700" />
                                )}
                                <span>
                                  {cand.status === "saved_paradigm" || cand.status === "both"
                                    ? "✓ Salvo no Juiz!"
                                    : "Salvar no Juiz"}
                                </span>
                              </button>

                              {/* Option 2: Injetar no Caderno */}
                              <button
                                onClick={() => handleInjectCandidateIntoCaderno(cand)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition cursor-pointer border shadow-2xs ${
                                  cand.status === "injected_caderno" || cand.status === "both" || checkIsModelInCaderno(cand)
                                    ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 ring-2 ring-blue-400/60"
                                    : "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300 hover:border-blue-500"
                                }`}
                                title="Injetar como tese normativa no Caderno de Teses"
                              >
                                {cand.status === "injected_caderno" || cand.status === "both" || checkIsModelInCaderno(cand) ? (
                                  <Check className="w-3.5 h-3.5 text-white" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                                )}
                                <span>
                                  {cand.status === "injected_caderno" || cand.status === "both" || checkIsModelInCaderno(cand)
                                    ? "✓ Injetado no Caderno!"
                                    : "Injetar no Caderno"}
                                </span>
                              </button>

                              {/* Option 3: Salvar em Ambos */}
                              <button
                                onClick={() => handleSaveCandidateBoth(cand)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition cursor-pointer border shadow-2xs ${
                                  cand.status === "both"
                                    ? "bg-purple-700 hover:bg-purple-800 text-white border-purple-700 ring-2 ring-purple-400/60"
                                    : "bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300 hover:border-purple-500"
                                }`}
                                title="Salvar como Modelo do Juiz e Injetar no Caderno simultaneamente"
                              >
                                <CheckCheck className={`w-3.5 h-3.5 ${cand.status === "both" ? "text-white" : "text-purple-700"}`} />
                                <span>
                                  {cand.status === "both" ? "✓ Salvo em Ambos!" : "Salvar em Ambos"}
                                </span>
                              </button>

                              <button
                                onClick={() => handleOpenEditCandidate(cand)}
                                className="p-1 text-amber-500 hover:text-amber-800 hover:bg-amber-100 rounded transition cursor-pointer"
                                title="Editar dados antes de salvar"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDiscardCandidate(cand.id)}
                                className="p-1 text-rose-500 hover:text-rose-800 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="Descartar da lista"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setExpandedCandidateId(isExpanded ? null : cand.id)}
                                className="p-1 text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded transition cursor-pointer"
                                title={isExpanded ? "Ocultar detalhes" : "Ver texto integral e enunciado"}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Full Text & Thesis Preview */}
                          {isExpanded && (
                            <div className="p-4 bg-amber-900 text-amber-100 border-t border-amber-700 text-xs font-mono space-y-3 max-h-96 overflow-y-auto">
                              {cand.thesisSnippet && (
                                <div className="space-y-1">
                                  <div className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    <span>ENUNCIADO PROPOSTO PARA O CADERNO DE TESES:</span>
                                  </div>
                                  <pre className="whitespace-pre-wrap font-sans text-xs bg-amber-800/80 p-2.5 rounded-lg border border-amber-700 text-amber-200">
                                    {cand.thesisSnippet}
                                  </pre>
                                </div>
                              )}

                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-amber-400 text-[10px] pb-1 border-b border-amber-800">
                                  <span>TEXTO INTEGRAL EXTRAÍDO DA DECISÃO</span>
                                  <span>{cand.fullText.length.toLocaleString()} caracteres</span>
                                </div>
                                <pre className="whitespace-pre-wrap leading-relaxed font-sans text-xs text-amber-200">
                                  {cand.fullText}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {filteredCandidates.length > candidatesPerPage && (
                    <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between text-xs shadow-2xs">
                      <span className="text-amber-800 text-[11px] sm:text-xs">
                        Mostrando <span className="font-bold">{(candidatesPage - 1) * candidatesPerPage + 1}</span> a <span className="font-bold">{Math.min(candidatesPage * candidatesPerPage, filteredCandidates.length)}</span> de <span className="font-bold">{filteredCandidates.length}</span> decisões
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={candidatesPage <= 1}
                          onClick={() => setCandidatesPage((p) => Math.max(p - 1, 1))}
                          className="p-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Página Anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2 font-bold text-xs text-amber-900">
                          {candidatesPage} / {totalCandidatePages}
                        </span>
                        <button
                          type="button"
                          disabled={candidatesPage >= totalCandidatePages}
                          onClick={() => setCandidatesPage((p) => Math.min(p + 1, totalCandidatePages))}
                          className="p-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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

          {/* Tab 4: Varredura Automática & Mineração Inteligente do Gabinete */}
          {activeTab === "varredura_automatica" && (
            <div className="space-y-4">
              {/* Header Card */}
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50 p-4 rounded-xl border border-indigo-200 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-indigo-950 text-sm">
                        Varredura & Expansão Automática do Caderno de Teses
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] border border-indigo-200">
                        IA Inteligente & Multitenant
                      </span>
                    </div>
                    <p className="text-xs text-indigo-900/80 leading-relaxed">
                      A IA realiza uma varredura profunda no banco de decisões e histórico de minutas deste gabinete, respeitando as permissões da unidade ativa. Identifica padrões decisórios recorrentes e sugere verbetes estruturados, <strong>com proteção absoluta contra duplicação de matérias já existentes</strong>.
                    </p>
                  </div>

                  <button
                    onClick={handleRunCabinetThesesScan}
                    disabled={isScanningTheses}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
                      isScanningTheses
                        ? "bg-indigo-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-98"
                    }`}
                  >
                    {isScanningTheses ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Varrendo Gabinete...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 text-indigo-200" />
                        <span>Executar Nova Varredura</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Progress bar */}
                {isScanningTheses && (
                  <div className="mt-3.5 pt-3 border-t border-indigo-200/80 space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs text-indigo-900 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        {scanProgress}
                      </span>
                      <span className="text-[11px] text-indigo-600 font-mono">IA Gemini 3.7 Flash</span>
                    </div>
                    <div className="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full w-full animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Scan Error */}
                {scanError && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{scanError}</span>
                    </div>
                    <button
                      onClick={handleRunCabinetThesesScan}
                      className="px-2.5 py-1 bg-rose-600 text-white rounded font-bold hover:bg-rose-700 transition text-[11px]"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                )}

                {/* Feedback Toast */}
                {candidateFeedback && (
                  <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{candidateFeedback}</span>
                  </div>
                )}
              </div>

              {/* Stats Metrics Cards */}
              {scanStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span>Minutas Analisadas</span>
                    </div>
                    <div className="text-lg font-extrabold text-slate-800">
                      {scanStats.totalHistoryAnalyzed}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Gavel className="w-3.5 h-3.5 text-amber-500" />
                      <span>Modelos Analisados</span>
                    </div>
                    <div className="text-lg font-extrabold text-slate-800">
                      {scanStats.totalParadigmsAnalyzed}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-0.5 bg-emerald-50/40">
                    <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Teses Inéditas Sugeridas</span>
                    </div>
                    <div className="text-lg font-extrabold text-emerald-800">
                      {suggestedTheses.filter((t) => !t.isDuplicate).length}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs space-y-0.5 bg-amber-50/40">
                    <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Duplicidades Bloqueadas</span>
                    </div>
                    <div className="text-lg font-extrabold text-amber-800">
                      {suggestedTheses.filter((t) => t.isDuplicate).length}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {suggestedTheses.length === 0 && !isScanningTheses && (
                <div className="bg-white border-2 border-dashed border-indigo-200 rounded-2xl p-8 text-center space-y-4">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Nenhuma tese minerada no momento
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Clique no botão abaixo para que a IA faça a varredura nas decisões salvas e modelos deste gabinete e sugira novas teses automaticamente.
                    </p>
                  </div>
                  <button
                    onClick={handleRunCabinetThesesScan}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Iniciar Varredura Automática Agora</span>
                  </button>
                </div>
              )}

              {/* Filters & Actions Bar */}
              {suggestedTheses.length > 0 && (
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <button
                        onClick={handleSelectAllSuggested}
                        className="px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-300 transition"
                      >
                        {selectedSuggestedIds.size === getFilteredSuggestedTheses().length && getFilteredSuggestedTheses().length > 0 ? (
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>Selecionar ({getFilteredSuggestedTheses().length})</span>
                      </button>

                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={searchSuggestedQuery}
                          onChange={(e) => setSearchSuggestedQuery(e.target.value)}
                          placeholder="Buscar tese por palavra-chave, tema ou critério..."
                          className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={filterSuggestedCategory}
                        onChange={(e) => setFilterSuggestedCategory(e.target.value)}
                        className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">Todas as Matérias</option>
                        {Array.from(new Set(suggestedTheses.map((t) => t.category))).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      <select
                        value={filterSuggestedDecisionType}
                        onChange={(e) => setFilterSuggestedDecisionType(e.target.value)}
                        className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">Todos os Tipos</option>
                        <option value="procedencia">Procedência</option>
                        <option value="improcedencia">Improcedência</option>
                        <option value="parcial_procedencia">Parcial</option>
                        <option value="extincao_sem_merito">Extinção</option>
                        <option value="tutela_deferida">Tutela Deferida</option>
                        <option value="tutela_indeferida">Tutela Indeferida</option>
                      </select>

                      <button
                        onClick={() => setShowOnlyInedite(!showOnlyInedite)}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border ${
                          showOnlyInedite
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-slate-100 text-slate-600 border-slate-300"
                        }`}
                        title="Ocultar matérias que já constam no Caderno de Teses"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Apenas Inéditas</span>
                      </button>
                    </div>
                  </div>

                  {/* Batch Action Toolbar */}
                  {selectedSuggestedIds.size > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl flex items-center justify-between gap-2 flex-wrap animate-in fade-in">
                      <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <CheckCheck className="w-4 h-4 text-indigo-600" />
                        <span>{selectedSuggestedIds.size} tese(s) selecionada(s):</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleBatchInjectSelectedSuggested}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                          title="Inserir todas as teses selecionadas sequencialmente no Caderno"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                          <span>Inserir no Caderno de Teses</span>
                        </button>

                        <button
                          onClick={handleBatchSaveSelectedSuggestedParadigms}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                          title="Salvar todas as teses selecionadas como modelos de decisão do Juiz"
                        >
                          <Gavel className="w-3.5 h-3.5 text-amber-200" />
                          <span>Salvar nos Modelos do Juiz</span>
                        </button>

                        <button
                          onClick={handleBatchDiscardSelectedSuggested}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Descartar</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Suggested Thesis Cards */}
                  <div className="space-y-3">
                    {paginatedSuggestedTheses.map((thesis, idx) => {
                      const isSelected = selectedSuggestedIds.has(thesis.id);
                      const isExpanded = expandedSuggestedId === thesis.id;
                      const typeConfig = DECISION_TYPE_CONFIG[thesis.decisionType] || {
                        label: thesis.decisionType,
                        bg: "bg-slate-100 text-slate-800 border-slate-300",
                      };

                      return (
                        <div
                          key={thesis.id}
                          className={`bg-white rounded-xl border transition shadow-xs overflow-hidden ${
                            isSelected
                              ? "border-indigo-500 ring-2 ring-indigo-500/20"
                              : thesis.isDuplicate
                              ? "border-amber-200 bg-amber-50/20"
                              : "border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          {/* Card Header */}
                          <div className="p-3.5 flex items-start justify-between gap-3 border-b border-slate-100">
                            <div className="flex items-start gap-2.5 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedSuggestedIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(thesis.id)) next.delete(thesis.id);
                                    else next.add(thesis.id);
                                    return next;
                                  });
                                }}
                                className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                              />

                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeConfig.bg}`}>
                                    {typeConfig.label}
                                  </span>

                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                                    {thesis.category}
                                  </span>

                                  {/* Inédita vs Duplicada Badge */}
                                  {thesis.isDuplicate ? (
                                    <span
                                      className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 flex items-center gap-1"
                                      title={thesis.duplicateReason}
                                    >
                                      <AlertCircle className="w-3 h-3 text-amber-600" />
                                      <span>Sobreposição no Caderno</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>✅ Inédita (Apta para o Caderno)</span>
                                    </span>
                                  )}

                                  {/* Injected / Saved Status */}
                                  {thesis.status === "injected" && (
                                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
                                      ⚡ Injetada no Caderno
                                    </span>
                                  )}
                                  {thesis.status === "saved_paradigm" && (
                                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                                      💾 Salva nos Modelos
                                    </span>
                                  )}
                                  {thesis.status === "both" && (
                                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 text-[10px] font-bold border border-purple-300">
                                      ✨ Caderno & Modelos
                                    </span>
                                  )}
                                </div>

                                <h4 className="font-bold text-slate-900 text-sm leading-snug">
                                  {thesis.title}
                                </h4>
                              </div>
                            </div>

                            {/* Card Header Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleOpenEditSuggested(thesis)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Editar ou personalizar tese antes de salvar"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDiscardSuggestedThesis(thesis.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Descartar esta sugestão"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setExpandedSuggestedId(isExpanded ? null : thesis.id)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title={isExpanded ? "Recolher detalhes" : "Expandir enunciado formatado"}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Card Content Grid */}
                          <div className="p-3.5 space-y-2.5 text-xs text-slate-700 bg-slate-50/50">
                            {thesis.isDuplicate && thesis.duplicateReason && (
                              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span><strong>Aviso de Duplicidade:</strong> {thesis.duplicateReason}</span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <span className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-indigo-600" />
                                  1. Hipótese Fática & Objeto:
                                </span>
                                <p className="text-slate-600 leading-relaxed">
                                  {thesis.hypothesis}
                                </p>
                              </div>

                              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                                <span className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  2. Critérios Probatórios & Ônus:
                                </span>
                                <p className="text-slate-600 leading-relaxed">
                                  {thesis.probativeStandard}
                                </p>
                              </div>
                            </div>

                            {(thesis.consequencesAndLimits || thesis.consectariosAndPrecedents) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {thesis.consequencesAndLimits && (
                                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                                    <span className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                                      <Scale className="w-3 h-3 text-amber-600" />
                                      3. Parâmetros & Consequências:
                                    </span>
                                    <p className="text-slate-600 leading-relaxed">
                                      {thesis.consequencesAndLimits}
                                    </p>
                                  </div>
                                )}

                                {thesis.consectariosAndPrecedents && (
                                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                                    <span className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                                      <BookOpen className="w-3 h-3 text-purple-600" />
                                      4. Consectários & Precedentes:
                                    </span>
                                    <p className="text-slate-600 leading-relaxed">
                                      {thesis.consectariosAndPrecedents}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Source note */}
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                              <Sparkles className="w-3 h-3 text-indigo-500" />
                              <span>Origem da Mineração: <strong>{thesis.sourceSummary}</strong></span>
                            </div>
                          </div>

                          {/* Expanded Full Block */}
                          {isExpanded && (
                            <div className="p-4 bg-slate-900 text-slate-100 border-t border-slate-800 text-xs font-mono space-y-2">
                              <div className="text-amber-400 font-bold text-[11px] flex items-center justify-between">
                                <span>ENUNCIADO FORMATADO COMPLETO:</span>
                                <span className="text-[10px] text-slate-400">Padrão Caderno de Teses</span>
                              </div>
                              <pre className="whitespace-pre-wrap font-sans text-xs bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-slate-200 leading-relaxed">
                                {thesis.fullSuggestedBlock || `${thesis.title}\n\n.1. Hipótese:\n${thesis.hypothesis}\n\n.2. Provas:\n${thesis.probativeStandard}\n\n.3. Parâmetros:\n${thesis.consequencesAndLimits}\n\n.4. Consectários:\n${thesis.consectariosAndPrecedents}`}
                              </pre>
                            </div>
                          )}

                          {/* Card Footer Actions */}
                          <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                            <button
                              onClick={() => handleOpenEditSuggested(thesis)}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Ajustar Texto</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSaveSuggestedAsParadigm(thesis)}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                                title="Salvar nos Modelos de Decisões do Juiz"
                              >
                                <Gavel className="w-3.5 h-3.5 text-amber-700" />
                                <span>Salvar no Juiz</span>
                              </button>

                              <button
                                onClick={() => handleInjectSuggestedThesisIntoCaderno(thesis)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-98"
                                title="Inserir formatado no Caderno de Teses"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                                <span>⚡ Inserir no Caderno de Teses</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredSuggestedTheses.length > suggestedPerPage && (
                    <div className="p-3 bg-white rounded-xl border border-indigo-200 flex items-center justify-between text-xs shadow-2xs">
                      <span className="text-indigo-900 text-[11px] sm:text-xs">
                        Mostrando <span className="font-bold">{(suggestedPage - 1) * suggestedPerPage + 1}</span> a <span className="font-bold">{Math.min(suggestedPage * suggestedPerPage, filteredSuggestedTheses.length)}</span> de <span className="font-bold">{filteredSuggestedTheses.length}</span> teses
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={suggestedPage <= 1}
                          onClick={() => setSuggestedPage((p) => Math.max(p - 1, 1))}
                          className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Página Anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2 font-bold text-xs text-indigo-950">
                          {suggestedPage} / {totalSuggestedPages}
                        </span>
                        <button
                          type="button"
                          disabled={suggestedPage >= totalSuggestedPages}
                          onClick={() => setSuggestedPage((p) => Math.min(p + 1, totalSuggestedPages))}
                          className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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

          {/* Tab 5: Base de Conhecimento */}
          {activeTab === "base_conhecimento" && (
            <div className="space-y-4">
              <KnowledgeBasePanel />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-white border-t border-amber-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-2 py-1 rounded border border-amber-200 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-amber-900" />
                Caderno de Teses atualizado com sucesso!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 font-semibold text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition cursor-pointer"
            >
              Fechar
            </button>

            {activeTab === "caderno" && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-4 py-2 font-bold text-white rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                  isSaving ? "bg-amber-400 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-500"
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Salvando..." : "Salvar Alterações no Caderno"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Form: Cadastrar / Editar Modelo Paradigma / Injeção Direta */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-amber-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Form Header */}
            <div className="p-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-amber-200" />
                <h3 className="font-bold text-sm">
                  {editingParadigm
                    ? "Editar Modelo / Tese do Gabinete"
                    : formDestination === "caderno"
                    ? "Injetar Diretamente no Caderno de Teses (Aba 1)"
                    : formDestination === "paradigma"
                    ? "Cadastrar na Biblioteca de Modelos Paradigmas (Aba 2)"
                    : "Cadastrar no Caderno de Teses & Modelos Paradigmas"}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-amber-200 hover:text-white p-1"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Seletor Claro de Destino */}
            <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100/60 border-b border-amber-200">
              <label className="block font-bold text-amber-900 text-xs mb-2 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-700" />
                <span>Escolha onde deseja salvar esta decisão/tese:</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Opção 1: Apenas Caderno de Teses */}
                <button
                  type="button"
                  onClick={() => setFormDestination("caderno")}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                    formDestination === "caderno"
                      ? "bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400"
                      : "bg-white text-slate-800 border-amber-200 hover:bg-amber-50/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <BookOpen className={`w-3.5 h-3.5 ${formDestination === "caderno" ? "text-amber-100" : "text-amber-600"}`} />
                      Caderno de Teses
                    </span>
                    {formDestination === "caderno" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <p className={`text-[10px] leading-tight ${formDestination === "caderno" ? "text-amber-100" : "text-slate-500"}`}>
                    Injeta como tese vinculante permanente (Aba 1: obrigatória em todas as minutas).
                  </p>
                </button>

                {/* Opção 2: Apenas Modelo Paradigma */}
                <button
                  type="button"
                  onClick={() => setFormDestination("paradigma")}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                    formDestination === "paradigma"
                      ? "bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400"
                      : "bg-white text-slate-800 border-amber-200 hover:bg-amber-50/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Gavel className={`w-3.5 h-3.5 ${formDestination === "paradigma" ? "text-amber-100" : "text-amber-600"}`} />
                      Modelo Paradigma
                    </span>
                    {formDestination === "paradigma" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <p className={`text-[10px] leading-tight ${formDestination === "paradigma" ? "text-amber-100" : "text-slate-500"}`}>
                    Salva na biblioteca de decisões (Aba 2: para uso como espelho estrutural do magistrado).
                  </p>
                </button>

                {/* Opção 3: Ambos */}
                <button
                  type="button"
                  onClick={() => setFormDestination("ambos")}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                    formDestination === "ambos"
                      ? "bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400"
                      : "bg-white text-slate-800 border-amber-200 hover:bg-amber-50/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className={`w-3.5 h-3.5 ${formDestination === "ambos" ? "text-amber-100" : "text-amber-600"}`} />
                      Em Ambos (Recomendado)
                    </span>
                    {formDestination === "ambos" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <p className={`text-[10px] leading-tight ${formDestination === "ambos" ? "text-amber-100" : "text-slate-500"}`}>
                    Injeta no Caderno de Teses e também arquiva como Modelo de Decisão.
                  </p>
                </button>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-amber-800 mb-1">
                    Título / Tema da Decisão ou Tese: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Cartão RMC - Improcedência por Saque Comprovado"
                    className="w-full p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-amber-800 mb-1">
                    Tipo de Decisão / Ato: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formDecisionType}
                    onChange={(e) =>
                      setFormDecisionType(e.target.value as JudgeParadigmModel["decisionType"])
                    }
                    className="w-full p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 focus:bg-white focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="procedencia">✅ Procedência Total</option>
                    <option value="improcedencia">❌ Improcedência</option>
                    <option value="parcial_procedencia">⚖️ Parcial Procedência</option>
                    <option value="extincao_sem_merito">🚫 Extinção sem Resolução</option>
                    <option value="tutela_deferida">⚡ Tutela Deferida</option>
                    <option value="tutela_indeferida">🛑 Tutela Indeferida</option>
                    <option value="despacho_interlocutoria">📄 Despacho / Interlocutória</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-amber-800 mb-1">
                    Matéria / Ramo do Direito:
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Ex: Direito do Consumidor, Bancário, Fazenda"
                    className="w-full p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-amber-800 mb-1">
                    Número do Processo de Referência (Opcional):
                  </label>
                  <input
                    type="text"
                    value={formProcessNumber}
                    onChange={(e) => setFormProcessNumber(e.target.value)}
                    placeholder="Ex: 5123456-78.2024.8.09.0105"
                    className="w-full p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-amber-800 mb-1">
                    Resumo / Síntese da Diretriz (Opcional):
                  </label>
                  <input
                    type="text"
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    placeholder="Ex: Improcedência quando o banco anexa comprovante de TED e faturas de uso."
                    className="w-full p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-amber-800 mb-1">
                    Texto Integral do Modelo / Decisão: <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={10}
                    value={formFullText}
                    onChange={(e) => setFormFullText(e.target.value)}
                    placeholder="Cole aqui o texto completo da sentença, relatório, fundamentação e dispositivo da decisão..."
                    className="w-full p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="p-3.5 bg-amber-50 border-t border-amber-200 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3 py-1.5 font-semibold text-amber-600 hover:text-amber-900 hover:bg-amber-200 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveParadigmForm}
                className="px-4 py-2 font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>
                      {formDestination === "caderno"
                        ? "Injetar no Caderno de Teses"
                        : formDestination === "paradigma"
                        ? "Salvar Modelo Paradigma"
                        : "Salvar no Caderno & Modelo"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SELETOR INTERATIVO DE PARTES PARA INJEÇÃO NO CADERNO */}
      {injectSelectorModel && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-amber-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-100" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
                    Selecionar Partes para Injetar no Caderno de Teses
                  </h3>
                  <p className="text-amber-100 text-xs truncate">
                    Modelo: <strong>{injectSelectorModel.title}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInjectSelectorModel(null)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition cursor-pointer flex-shrink-0 text-white"
                title="Fechar seletor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkIsModelInCaderno(injectSelectorModel) && (
              <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <p className="text-xs text-rose-800 font-medium leading-tight">
                  <strong className="text-rose-900 uppercase tracking-wide">Atenção:</strong> Já existe um texto muito similar a este modelo ativo no seu Caderno de Teses. Injetá-lo novamente poderá gerar redundância.
                </p>
              </div>
            )}

            {/* Subheader info & Presets */}
            <div className="p-3.5 bg-amber-50/90 border-b border-amber-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
                  Atalhos Rápidos de Extração:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("fundamentacao")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer border ${
                      injectActivePreset === "fundamentacao"
                        ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                        : "bg-white text-amber-800 border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    ⚖️ Apenas Fundamentação / Raciocínio (Recomendado)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("resumo")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer border ${
                      injectActivePreset === "resumo"
                        ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                        : "bg-white text-amber-800 border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    📌 Apenas Resumo & Diretriz
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("completo")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer border ${
                      injectActivePreset === "completo"
                        ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                        : "bg-white text-amber-800 border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    📄 Modelo Completo (com Dispositivo)
                  </button>
                </div>
              </div>
            </div>

            {/* Body: Split view (Options / Excerpt & Preview) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Checkbox Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {/* 1. Titulo e Cabecalho */}
                <label className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl flex items-start gap-2 cursor-pointer hover:bg-amber-100/50 transition">
                  <input
                    type="checkbox"
                    checked={injectIncludeTitle}
                    onChange={(e) => handleUpdateInjectionOptions({ includeTitle: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-amber-950 block">Título do Tópico</span>
                    <span className="text-[11px] text-amber-700/80">Identificação e área jurídica da tese.</span>
                  </div>
                </label>

                {/* 2. Resumo / Diretriz */}
                <label className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl flex items-start gap-2 cursor-pointer hover:bg-amber-100/50 transition">
                  <input
                    type="checkbox"
                    checked={injectIncludeSummary}
                    onChange={(e) => handleUpdateInjectionOptions({ includeSummary: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-amber-950 block">Resumo / Tese Resumida</span>
                    <span className="text-[11px] text-amber-700/80">Síntese da orientação do magistrado.</span>
                  </div>
                </label>

                {/* 3. Destaques Probatórios */}
                <label className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl flex items-start gap-2 cursor-pointer hover:bg-amber-100/50 transition">
                  <input
                    type="checkbox"
                    checked={injectIncludeHighlights}
                    onChange={(e) => handleUpdateInjectionOptions({ includeHighlights: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-amber-950 block">Critérios Probatórios</span>
                    <span className="text-[11px] text-amber-700/80">Destaques e parâmetros de instrução.</span>
                  </div>
                </label>

                {/* 4. Fundamentação */}
                <label className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl flex items-start gap-2 cursor-pointer hover:bg-amber-100/50 transition">
                  <input
                    type="checkbox"
                    checked={injectIncludeFundamentacao}
                    onChange={(e) => handleUpdateInjectionOptions({ includeFundamentacao: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-amber-950 block">Fundamentação Jurídica</span>
                    <span className="text-[11px] text-amber-700/80">Raciocínio legal, jurisprudência e teses.</span>
                  </div>
                </label>

                {/* 5. Dispositivo */}
                <label className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl flex items-start gap-2 cursor-pointer hover:bg-amber-100/50 transition sm:col-span-2 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={injectIncludeDispositivo}
                    onChange={(e) => handleUpdateInjectionOptions({ includeDispositivo: e.target.checked })}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-amber-950 block">Dispositivo / Conclusão</span>
                    <span className="text-[11px] text-amber-700/80">Parte dispositiva final da decisão (opcional).</span>
                  </div>
                </label>
              </div>

              {/* Trecho / Texto Específico Selecionável */}
              {injectIncludeFundamentacao && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-amber-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-700" />
                      Trecho da Fundamentação a ser Injetado (você pode editar ou recortar livremente):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const parsed = parseModelSections(injectSelectorModel.fullText);
                        handleUpdateInjectionOptions({ customExcerpt: parsed.fundamentacao || injectSelectorModel.fullText });
                      }}
                      className="text-[11px] text-amber-700 hover:text-amber-900 underline cursor-pointer"
                    >
                      Restaurar Fundamentação Detectada
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={injectCustomExcerpt}
                    onChange={(e) => handleUpdateInjectionOptions({ customExcerpt: e.target.value })}
                    placeholder="Selecione ou edite aqui apenas a parte da fundamentação jurídica que deseja transformar em tese..."
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-amber-950 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none leading-relaxed"
                  />
                </div>
              )}

              {/* Visualizador / Editor Final do Bloco que entrará no Caderno */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-900 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                    Pré-visualização do Bloco a ser Injetado no Caderno Normativo:
                  </label>
                  <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                    Editável diretamente abaixo
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={injectEditablePreview}
                  onChange={(e) => setInjectEditablePreview(e.target.value)}
                  placeholder="Pré-visualização do texto que será acrescentado ao final do seu Teses Normativas..."
                  className="w-full p-3 bg-amber-50/50 border-2 border-amber-300 rounded-xl text-amber-950 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-3.5 bg-amber-50 border-t border-amber-200 flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => setInjectSelectorModel(null)}
                className="px-3 py-1.5 font-semibold text-amber-700 hover:text-amber-950 hover:bg-amber-200/60 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmInjectionIntoCaderno}
                  disabled={!injectEditablePreview.trim()}
                  className="px-4 py-2 font-bold text-white bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  <span>⚡ Confirmar e Injetar no Caderno de Teses</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Paradigm Confirmation Modal */}
      {paradigmToDelete && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Excluir Modelo</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Tem certeza que deseja excluir o modelo paradigma <strong>"{paradigmToDelete.title}"</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setParadigmToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteParadigm}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition cursor-pointer shadow-sm shadow-rose-200"
              >
                Excluir Modelo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Discard Confirmation Modal */}
      {batchDiscardConfirm && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Descartar Modelos</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Deseja realmente descartar os <strong>{selectedCandidateIds.size}</strong> modelos selecionados? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setBatchDiscardConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmBatchDiscard}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition cursor-pointer shadow-sm shadow-rose-200"
              >
                Descartar Selecionados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar e Ajustar Tese Sugerida antes de Injetar */}
      {isEditSuggestedOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-indigo-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-200" />
                <h3 className="font-bold text-sm">
                  Personalizar Tese Minerada com IA
                </h3>
              </div>
              <button
                onClick={() => setIsEditSuggestedOpen(false)}
                className="text-indigo-200 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">
                    Título / Tema da Tese:
                  </label>
                  <input
                    type="text"
                    value={editSuggestedTitle}
                    onChange={(e) => setEditSuggestedTitle(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Tipo de Decisão:
                  </label>
                  <select
                    value={editSuggestedDecisionType}
                    onChange={(e) =>
                      setEditSuggestedDecisionType(e.target.value as JudgeParadigmModel["decisionType"])
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="procedencia">✅ Procedência Total</option>
                    <option value="improcedencia">❌ Improcedência</option>
                    <option value="parcial_procedencia">⚖️ Parcial Procedência</option>
                    <option value="extincao_sem_merito">🚫 Extinção sem Resolução</option>
                    <option value="tutela_deferida">⚡ Tutela Deferida</option>
                    <option value="tutela_indeferida">🛑 Tutela Indeferida</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Matéria / Ramo:
                  </label>
                  <input
                    type="text"
                    value={editSuggestedCategory}
                    onChange={(e) => setEditSuggestedCategory(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  1. Hipótese Fática e Objeto:
                </label>
                <textarea
                  rows={2}
                  value={editSuggestedHypothesis}
                  onChange={(e) => setEditSuggestedHypothesis(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  2. Critérios Probatórios e Ônus da Prova:
                </label>
                <textarea
                  rows={2}
                  value={editSuggestedProbative}
                  onChange={(e) => setEditSuggestedProbative(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    3. Parâmetros e Consequências:
                  </label>
                  <textarea
                    rows={2}
                    value={editSuggestedLimits}
                    onChange={(e) => setEditSuggestedLimits(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    4. Consectários e Precedentes:
                  </label>
                  <textarea
                    rows={2}
                    value={editSuggestedConsectarios}
                    onChange={(e) => setEditSuggestedConsectarios(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setIsEditSuggestedOpen(false)}
                className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditSuggested}
                className="px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition cursor-pointer shadow-xs"
              >
                Salvar Ajustes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
