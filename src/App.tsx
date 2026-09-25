import React, { useState, useEffect, useMemo } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { PromptSelectorAndEditor } from "./components/PromptSelectorAndEditor";
import { SystemTour } from "./components/SystemTour";
import { PromptManagerModal } from "./components/PromptManagerModal";
import { PdfUploadZone } from "./components/PdfUploadZone";
import { KnowledgeBasePanel } from "./components/KnowledgeBasePanel";
import { MinuteViewer } from "./components/MinuteViewer";
import { HistoryModal } from "./components/HistoryModal";
import { ApiCreditsModal } from "./components/ApiCreditsModal";
import { CabinetTesesModal } from "./components/CabinetTesesModal";
import { CabinetCalendarModal } from "./components/CabinetCalendarModal";
import { ParadigmSelector } from "./components/ParadigmSelector";
import { ProjudiGuideModal } from "./components/ProjudiGuideModal";
import { SystemManualModal } from "./components/SystemManualModal";
import { SuperAdminPanel } from "./components/SuperAdminPanel";
import { PresentationModal } from "./components/PresentationModal";
import { UserManagerModal } from "./components/UserManagerModal";
import { UnitManagerModal } from "./components/UnitManagerModal";
import { BindingPrecedentsModal } from "./components/BindingPrecedentsModal";
import { XRayModal } from "./components/XRayModal";
import { FloatingGuide } from "./components/FloatingGuide";
import { SystemBroadcastBanner } from "./components/SystemBroadcastBanner";
import { MinuteAuditorModal } from "./components/MinuteAuditorModal";
import { ApiKeyBanner } from "./components/ApiKeyBanner";
import { ApiKeyConfigModal } from "./components/ApiKeyConfigModal";
import { ProcessUnitSelector } from "./components/ProcessUnitSelector";
import { ExtensionModal } from "./components/ExtensionModal";
import { ExtensionImportModal } from "./components/ExtensionImportModal";
import { AssessorWorkflowGuideModal } from "./components/AssessorWorkflowGuideModal";
import { InitialPetitionPanel } from "./components/InitialPetitionPanel";
import { SupportTicketsModal } from "./components/SupportTicketsModal";
import { HearingWorkbenchModal } from "./components/HearingWorkbenchModal";
import { Toaster, toast } from 'react-hot-toast';
import { extractTextFromPdf } from "./utils/pdfExtractor";
import { getApiHeaders, checkUserAiAccess, checkResponseForRotatedKey } from "./utils/apiKeyManager";
import {
  CustomPrompt,
  UploadedPdf,
  GenerationResult,
  MinuteData,
  ProcessInfo,
  CabinetTesesData,
  ProjudiGuideData,
  ChatMessage,
  ProcessDossier,
  SupportTicket,
} from "./types";
import { subscribeToTickets, getLocalTickets, isTicketModuleEnabled } from "./utils/ticketsDb";
import { SavedKnowledgeDoc, getKnowledgeDocs } from "./utils/knowledgeDb";
import { saveToHistory, getHistory, deleteFromHistory, isCorruptedHistoryItem, SavedAnalysis } from "./utils/historyDb";
import { findDossierForProcess, getProcessActsSummaryForPrompt } from "./utils/dossierUtils";
import { ProcessTimelineModal } from "./components/ProcessTimelineModal";
import { LegislativeLookupModal } from "./components/LegislativeLookupModal";
import { getCabinetTeses } from "./utils/tesesDb";
import { getJudgeParadigms, syncParadigmsWithDb, saveJudgeParadigms, mergeAndSaveJudgeParadigms } from "./utils/judgeParadigmsDb";
import { detectMatchingParadigms, ParadigmMatchResult } from "./utils/paradigmMatcher";
import { getProjudiGuide } from "./utils/projudiGuideDb";
import { getLocalCachedPrompts, saveLocalCachedPrompts, syncPromptsWithDb, mergePromptsSafely } from "./utils/promptsDb";
import { getIsGroundingEnabled } from "./utils/bindingPrecedents";
import { saveSessionDraft, getSessionDraft, clearSessionDraft } from "./utils/sessionDraft";
import { recordApiExecution } from "./utils/apiUsageTracker";
import { DEFAULT_CABINET_TESES } from "./data/defaultTeses";
import { DEFAULT_PROJUDI_GUIDE } from "./data/defaultProjudiGuide";
import { isPrimaryCabinet, globalTenantId, subscribeToPrompts } from "./lib/firestoreUtils";
import { SAMPLE_CASES } from "./data/sampleCases";
import {
  Sparkles,
  AlertTriangle,
  FileUp,
  FileText,
  Info,
  CheckCircle2,
  Scale,
  Brain,
  BrainCircuit,
  Rocket,
  Sliders,
  FolderOpen,
  MessageCircle,
  HelpCircle,
  RotateCcw,
  Zap,
  ClipboardList,
  Layers,
  GitCommit,
  Crown,
  Gavel,
  ShieldCheck,
  Award,
  Building,
  Lock,
  Mail,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Compass,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import { useAuth } from "./lib/AuthContext";
import { getPromptsFromDb, savePromptToDb, deletePromptFromDb, subscribeToCabinetTeses, subscribeToProjudiGuide, subscribeToJudgeParadigms } from "./lib/firestoreUtils";


const EMPTY_PROMPT: CustomPrompt = {
  id: "empty",
  title: "Nenhum Prompt",
  category: "civel",
  privacy: "privado",
  scope: "judicial",
  promptText: "Nenhum prompt disponível. Vá em 'Gerenciar Prompts' para criar um novo.",
  isDefault: false
};

export default function App() {
  const { 
    user, 
    userProfile, 
    loading: authLoading, 
    signIn, 
    signOut, 
    activeUnit, 
    allowedUnits, 
    activeTenantId,
    isAdmin, 
    isJudge, 
    isSuperAdmin,
    isDeactivated, 
    isUnauthorized,
    isTenantSuspended,
    tenantSuspensionReason,
    tenantName,
    authError, 
    clearAuthError,
    recheckInvite
  } = useAuth();
  
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);
  const [isCheckingInvite, setIsCheckingInvite] = useState(false);
  const [hasCopiedEmail, setHasCopiedEmail] = useState(false);

  // Prompts state with resilient multi-tier persistence and local cache
  const [prompts, setPrompts] = useState<CustomPrompt[]>(() => {
    const initial = getLocalCachedPrompts().filter(p => p.id !== "prompt-padrao" && p.title !== "Prompt Padrão");
    return initial;
  });
  const [activePrompt, setActivePrompt] = useState<CustomPrompt>(() => {
    const initial = getLocalCachedPrompts().filter(p => p.id !== "prompt-padrao" && p.title !== "Prompt Padrão");
    return initial[0] || EMPTY_PROMPT;
  });

  // Sync prompts from central server on auth change, tenant change or unit change
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const fetchSharedPrompts = async () => {
      // Don't fetch until the user profile (and thus globalTenantId) is loaded
      if (!userProfile) return;
      
      // Proactively purge legacy synthetic prompt-padrao from database if present
      deletePromptFromDb("prompt-padrao").catch(() => {});

      try {
        const synchronized = await syncPromptsWithDb();
        const validPrompts = synchronized.filter(p => p.id !== "prompt-padrao" && p.title !== "Prompt Padrão");
        if (validPrompts.length > 0) {
          setPrompts(validPrompts);
          setActivePrompt((prev) => {
            const matched = validPrompts.find((p) => p.id === prev.id && p.id !== "prompt-padrao");
            return matched || validPrompts[0];
          });
        } else if (validPrompts.length === 0) {
          setPrompts([]);
          setActivePrompt(EMPTY_PROMPT);
        }
      } catch (err) {
        console.warn("Could not sync shared prompts from server:", err);
      }

      // Subscribe to realtime prompt changes across all devices/sessions
      unsubscribe = subscribeToPrompts((remotePrompts) => {
        if (Array.isArray(remotePrompts) && remotePrompts.length > 0) {
          const local = getLocalCachedPrompts().filter(p => p.id !== "prompt-padrao" && p.title !== "Prompt Padrão");
          const merged = mergePromptsSafely(remotePrompts, local, []).filter(p => p.id !== "prompt-padrao" && p.title !== "Prompt Padrão");
          setPrompts(merged);
          saveLocalCachedPrompts(merged);
          setActivePrompt((prev) => {
            const matched = merged.find((p) => p.id === prev.id && p.id !== "prompt-padrao");
            return matched || merged[0] || EMPTY_PROMPT;
          });
        }
      });
    };

    fetchSharedPrompts();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeTenantId, userProfile?.tenantId]);

  // Scope & Automatic Options matching user workflow
  const [actingArea, setActingArea] = useState<"judicial" | "administrativa">("judicial");
  const [consultJurisprudence, setConsultJurisprudence] = useState<boolean>(true);
  const [includeExpandedContext, setIncludeExpandedContext] = useState<boolean>(true);

  // PDF & Text inputs
  const [inputMode, setInputMode] = useState<"pdf" | "text">("pdf");
  const [pdfFiles, setPdfFiles] = useState<UploadedPdf[]>([]);
  const [activeKnowledgeDocsCount, setActiveKnowledgeDocsCount] = useState<number>(0);
  const [processNumber, setProcessNumber] = useState<string>("");
  const [processNumber2ndGrau, setProcessNumber2ndGrau] = useState<string>("");
  const [processText, setProcessText] = useState<string>("");

  // Process Execution State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [currentChatMessages, setCurrentChatMessages] = useState<ChatMessage[]>([]);

  // UI Panels & Modals
  const [isFormCollapsed, setIsFormCollapsed] = useState<boolean>(false);
  const [isPromptManagerOpen, setIsPromptManagerOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState<boolean>(false);
  const [isXRayModalOpen, setIsXRayModalOpen] = useState<boolean>(false);
  const [isTesesModalOpen, setIsTesesModalOpen] = useState<boolean>(false);
  const [initialParadigmDraft, setInitialParadigmDraft] = useState<{
    text: string;
    processNumber?: string;
    category?: string;
    title?: string;
  } | null>(null);
  const [isProjudiGuideModalOpen, setIsProjudiGuideModalOpen] = useState<boolean>(false);
  const [isBindingPrecedentsModalOpen, setIsBindingPrecedentsModalOpen] = useState<boolean>(false);
  const [isLegislativeModalOpen, setIsLegislativeModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isAssessorWorkflowGuideOpen, setIsAssessorWorkflowGuideOpen] = useState<boolean>(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);
  const [isMinuteAuditorOpen, setIsMinuteAuditorOpen] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [apiKeyModalMessage, setApiKeyModalMessage] = useState<string>("");
  const [isGuideVisible, setIsGuideVisible] = useState<boolean>(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [isSuperAdminPanelOpen, setIsSuperAdminPanelOpen] = useState<boolean>(false);
  const [isUnitManagerModalOpen, setIsUnitManagerModalOpen] = useState<boolean>(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);
  const [isHearingWorkbenchModalOpen, setIsHearingWorkbenchModalOpen] = useState<boolean>(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState<boolean>(false);
  const [isPetitionPanelOpen, setIsPetitionPanelOpen] = useState<boolean>(false);
  const [isTicketsModalOpen, setIsTicketsModalOpen] = useState<boolean>(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>(undefined);
  const [tickets, setTickets] = useState<SupportTicket[]>(() => getLocalTickets());
  const [isExtensionImportModalOpen, setIsExtensionImportModalOpen] = useState<boolean>(false);
  const [extensionImportData, setExtensionImportData] = useState<{ processNumber: string; documents: any[] } | null>(null);
  const [sessionTokens, setSessionTokens] = useState<number>(0);
  const [isLegalDrawerOpen, setIsLegalDrawerOpen] = useState<boolean>(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const [showInstructionsBanner, setShowInstructionsBanner] = useState<boolean>(true);
  const [historyList, setHistoryList] = useState<SavedAnalysis[]>([]);
  const [activeTimelineDossier, setActiveTimelineDossier] = useState<ProcessDossier | null>(null);
  const [autoExecutePending, setAutoExecutePending] = useState<boolean>(false);
  const [selectedActType, setSelectedActType] = useState<"auto" | "sentenca" | "decisao" | "despacho">("auto");

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const auto = urlParams.get('auto');
      const proc = urlParams.get('proc');
      
      if (proc) {
        setProcessNumber(decodeURIComponent(proc));
      }
      
      // Clean up URL without reloading
      if (auto || proc) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch(e) { 
      console.error(e); 
    }
  }, []);

  const isExpertModeEnabled = true;

  // Listen to open-api-key-modal event
  useEffect(() => {
    const handleOpenApiKeyModal = (e: any) => {
      setApiKeyModalMessage(e?.detail?.message || "");
      setIsApiKeyModalOpen(true);
    };
    window.addEventListener("open-api-key-modal", handleOpenApiKeyModal);
    return () => window.removeEventListener("open-api-key-modal", handleOpenApiKeyModal);
  }, []);

  // Listen to Data Restore Events (Auto-refresh prompt and cabinet state)
  useEffect(() => {
    const handleDataRestored = async () => {
      try {
        const synchronized = await syncPromptsWithDb();
        if (Array.isArray(synchronized) && synchronized.length > 0) {
          setPrompts(synchronized);
          setActivePrompt((prev) => {
            const matched = synchronized.find((p) => p.id === prev.id);
            return matched || synchronized[0];
          });
        }
      } catch (err) {
        console.warn("Could not sync prompts on restore event:", err);
      }
    };

    window.addEventListener("assessor_data_restored", handleDataRestored);
    window.addEventListener("assessor_prompts_updated", handleDataRestored);
    return () => {
      window.removeEventListener("assessor_data_restored", handleDataRestored);
      window.removeEventListener("assessor_prompts_updated", handleDataRestored);
    };
  }, []);

  // Listen to Extension Import Messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ASSESSOR_EXT_DATA' && event.data?.payload) {
        setExtensionImportData(event.data.payload);
        setIsExtensionImportModalOpen(true);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleExtensionImport = (importedPdfs: UploadedPdf[]) => {
    if (extensionImportData?.processNumber) {
        setProcessNumber(extensionImportData.processNumber);
    }
    
    // Add to existing files
    setPdfFiles(prev => [...prev, ...importedPdfs]);
    
    // If not analyzing yet, set context ready
    if (!isLoading && importedPdfs.length > 0) {
       toast.success("Documentos inseridos no contexto.");
    }
  };

  // Sync history list for dossier grouping & memory injection
  useEffect(() => {
    const fetchHistory = () => {
      getHistory().then(setHistoryList).catch(() => {});
    };
    fetchHistory();
    const timer = setInterval(fetchHistory, 10000);
    return () => clearInterval(timer);
  }, [generationResult, isHistoryModalOpen, activeUnit?.id]);

  // Detected process dossier for active input (finds all previously authored acts for this process)
  const activeProcessDossier = useMemo(() => {
    const candidate = processNumber || generationResult?.minute?.processNumber || "";
    if (candidate && candidate.length >= 4) {
      return findDossierForProcess(candidate, historyList);
    }
    // Also try to detect matching CNJ from uploaded PDF text or processText
    const allText = [processText, ...pdfFiles.map((p) => p.extractedText || "")].join(" ");
    if (allText.length > 50) {
      for (const item of historyList) {
        if (item.processNumber && item.processNumber.length > 7 && allText.includes(item.processNumber)) {
          return findDossierForProcess(item.processNumber, historyList);
        }
      }
    }
    return null;
  }, [processNumber, generationResult, processText, pdfFiles, historyList]);

  // Cabinet Teses (Global System-Wide Injected Understanding)
  const [tesesData, setTesesData] = useState<CabinetTesesData>({
    text: DEFAULT_CABINET_TESES,
    isEnabled: true,
    title: "Caderno de Teses Vinculantes do Gabinete",
  });

  // Judge Paradigm Models (Identical case mirroring)
  const [isParadigmEnabled, setIsParadigmEnabled] = useState<boolean>(false);
  const [selectedParadigmId, setSelectedParadigmId] = useState<string | null>(null);
  const [customParadigmText, setCustomParadigmText] = useState<string>("");
  const [dismissedParadigmId, setDismissedParadigmId] = useState<string | null>(null);

  // Automatic matching of judge paradigms based on uploaded PDF text, file names, and process context
  const detectedParadigmMatches = useMemo(() => {
    const combinedContext = [
      ...pdfFiles.map((p) => `${p.name} ${p.extractedText || ""}`),
      processText || "",
    ].join(" ");

    if (!combinedContext.trim() && !processNumber && pdfFiles.length === 0) return [];

    const allParadigms = getJudgeParadigms();
    return detectMatchingParadigms(combinedContext, allParadigms, processNumber);
  }, [pdfFiles, processText, processNumber]);

  const topDetectedParadigmMatch = useMemo(() => {
    if (detectedParadigmMatches.length === 0) return null;
    const top = detectedParadigmMatches[0];
    if (top.paradigm.id === dismissedParadigmId) return null;
    return top;
  }, [detectedParadigmMatches, dismissedParadigmId]);

  // Projudi Guide Data
  const [projudiGuideData, setProjudiGuideData] = useState<ProjudiGuideData>({
    text: DEFAULT_PROJUDI_GUIDE,
    title: "Guia Rápido de Lançamentos no PROJUDI",
  });

  // Load active knowledge docs count for UI indicator
  useEffect(() => {
    const loadCount = async () => {
      try {
        const docs = await getKnowledgeDocs();
        setActiveKnowledgeDocsCount(docs.filter(d => d.isActive).length);
      } catch (err) {
        console.warn("Could not load knowledge docs count:", err);
      }
    };
    loadCount();
  }, [activeTenantId, userProfile?.tenantId, activeUnit?.id]);

  // Load and Subscribe to Cabinet Teses from server / DB in realtime
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const initTeses = async () => {
      try {
        const loaded = await getCabinetTeses();
        if (loaded && typeof loaded.text === "string") {
          setTesesData(loaded);
        } else {
          setTesesData({
            text: isPrimaryCabinet(globalTenantId) ? DEFAULT_CABINET_TESES : "",
            isEnabled: true,
            title: "Caderno de Teses Vinculantes do Gabinete",
          });
        }
      } catch (err) {
        console.warn("Could not load cabinet teses:", err);
      }
      unsubscribe = subscribeToCabinetTeses((liveData) => {
        if (liveData && typeof liveData.text === "string") {
          setTesesData(liveData);
        }
      });
    };
    initTeses();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeTenantId, userProfile?.tenantId, activeUnit?.id]);

  // Load and Subscribe to Projudi Guide from server / DB in realtime
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const initProjudi = async () => {
      try {
        const loaded = await getProjudiGuide();
        if (loaded && typeof loaded.text === "string") {
          setProjudiGuideData(loaded);
        } else {
          setProjudiGuideData({
            text: isPrimaryCabinet(globalTenantId) ? DEFAULT_PROJUDI_GUIDE : "",
            title: "Guia Rápido de Lançamentos no PROJUDI",
          });
        }
      } catch (err) {
        console.warn("Could not load Projudi guide:", err);
      }
      unsubscribe = subscribeToProjudiGuide((liveData) => {
        if (liveData && typeof liveData.text === "string") {
          setProjudiGuideData(liveData);
        }
      });
    };
    initProjudi();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeTenantId, userProfile?.tenantId, activeUnit?.id]);

  // Sync and Subscribe to Judge Paradigms in realtime
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const initParadigms = async () => {
      try {
        await syncParadigmsWithDb();
      } catch (err) {
        console.warn("Could not sync judge paradigms with DB:", err);
      }
      unsubscribe = subscribeToJudgeParadigms((remoteList) => {
        if (Array.isArray(remoteList) && remoteList.length > 0) {
          mergeAndSaveJudgeParadigms(remoteList, false);
        }
      });
    };
    initParadigms();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeTenantId, userProfile?.tenantId, activeUnit?.id]);

  // Sync and Subscribe to Support Tickets in realtime with user privacy & cabinet isolation
  useEffect(() => {
    if (!user || isUnauthorized || isDeactivated) return;
    
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = subscribeToTickets(
        (updatedTickets) => {
          setTickets(updatedTickets);
        },
        {
          tenantId: activeTenantId || userProfile?.tenantId,
          userId: userProfile?.uid || user?.uid,
          userEmail: userProfile?.email || user?.email || undefined,
          isSuperAdmin: Boolean(isSuperAdmin),
          isAdmin: Boolean(isAdmin),
          isJudge: Boolean(isJudge),
        }
      );
    } catch (err) {
      console.warn("Could not subscribe to tickets:", err);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid, user?.email, userProfile?.tenantId, activeTenantId, isSuperAdmin, isAdmin, isJudge, isUnauthorized, isDeactivated]);

  // Auto-detect unit/comarca mention in process text or PDFs
  const detectedUnitName = useMemo(() => {
    const textToScan = [
      ...pdfFiles.map((p) => p.extractedText || ""),
      processText,
    ].join(" ").slice(0, 10000);

    if (!textToScan.trim() || !allowedUnits || allowedUnits.length === 0) return null;

    for (const unit of allowedUnits) {
      const parts = unit.name.split("/").map((s) => s.trim().toLowerCase());
      const comarca = parts[0];
      if (comarca && comarca.length >= 4 && textToScan.toLowerCase().includes(comarca)) {
        return unit.name;
      }
    }
    return null;
  }, [pdfFiles, processText, allowedUnits]);

  // Save prompts to localStorage with rolling backup
  useEffect(() => {
    saveLocalCachedPrompts(prompts);
  }, [prompts]);

  // Auto-restore session draft on mount if available and current state is empty
  useEffect(() => {
    try {
      const draft = getSessionDraft();
      if (draft) {
        if (draft.processNumber) setProcessNumber(draft.processNumber);
        if (draft.processNumber2ndGrau) setProcessNumber2ndGrau(draft.processNumber2ndGrau);
        if (draft.processText) setProcessText(draft.processText);
        if (draft.actingArea) setActingArea(draft.actingArea);
        if (draft.generationResult) setGenerationResult(draft.generationResult);
        if (draft.currentAnalysisId) setCurrentAnalysisId(draft.currentAnalysisId);
        if (draft.chatMessages && draft.chatMessages.length > 0) setCurrentChatMessages(draft.chatMessages);
      }
    } catch (e) {
      console.warn("Could not restore session draft:", e);
    }
  }, []);

  // Auto-save session draft on change (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveSessionDraft({
        savedAt: Date.now(),
        processNumber,
        processNumber2ndGrau,
        processText,
        actingArea,
        activePromptId: activePrompt.id,
        uploadedPdfNames: pdfFiles.map((p) => p.name),
        generationResult,
        currentAnalysisId,
        chatMessages: currentChatMessages,
      });
    }, 800);
    return () => clearTimeout(timeout);
  }, [
    processNumber,
    processNumber2ndGrau,
    processText,
    actingArea,
    activePrompt.id,
    pdfFiles,
    generationResult,
    currentAnalysisId,
    currentChatMessages,
  ]);

  const handleAddPdf = (newPdf: UploadedPdf) => {
    setInputMode("pdf");
    setPdfFiles((prev) => [...prev, newPdf]);
    setErrorMessage(null);
    setDismissedParadigmId(null);
    // Se havia uma análise anterior na tela, limpa o resultado anterior e rascunho para não misturar com o novo PDF
    if (generationResult) {
      setGenerationResult(null);
      setCurrentAnalysisId(null);
      setCurrentChatMessages([]);
      clearSessionDraft();
    }
  };

  const handleUpdatePdf = (updated: UploadedPdf) => {
    setPdfFiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setErrorMessage(null);
  };

  const handleRemovePdf = (id: string) => {
    setPdfFiles((prev) => prev.filter((p) => p.id !== id));
    setDismissedParadigmId(null);
  };

  const handleClearPdfs = () => {
    setPdfFiles([]);
    setDismissedParadigmId(null);
    if (generationResult) {
      setGenerationResult(null);
      setCurrentAnalysisId(null);
      setCurrentChatMessages([]);
      clearSessionDraft();
    }
  };

  const handleClearAllProcess = () => {
    clearSessionDraft();
    setPdfFiles([]);
    setProcessText("");
    setProcessNumber("");
    setProcessNumber2ndGrau("");
    setDismissedParadigmId(null);
    setGenerationResult(null);
    setCurrentAnalysisId(null);
    setCurrentChatMessages([]);
    setErrorMessage(null);
    setIsFormCollapsed(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteCurrentMinute = async () => {
    if (currentAnalysisId) {
      try {
        await deleteFromHistory(currentAnalysisId);
      } catch (err) {
        console.warn("Could not delete current analysis from history:", err);
      }
    }
    handleClearAllProcess();
  };

  const handleSelectPrompt = (prompt: CustomPrompt) => {
    setActivePrompt(prompt);
  };

  const handleUpdateActivePromptText = (newText: string) => {
    if (!isAdmin) return; // Segurança extra
    const updated = {
      ...activePrompt,
      promptText: newText,
      updatedAt: new Date().toISOString(),
    };
    setActivePrompt(updated);
    setPrompts((prev) => {
      const next = prev.map((p) => (p.id === updated.id ? updated : p));
      saveLocalCachedPrompts(next);
      return next;
    });
    savePromptToDb(updated).catch(e => console.warn("Failed to sync updated prompt to server:", e));
  };

  const handleSaveCustomPrompt = (newPrompt: CustomPrompt) => {
    setPrompts((prev) => {
      const exists = prev.some((p) => p.id === newPrompt.id);
      const next = exists
        ? prev.map((p) => (p.id === newPrompt.id ? newPrompt : p))
        : [newPrompt, ...prev];
      saveLocalCachedPrompts(next);
      return next;
    });
    setActivePrompt(newPrompt);
    savePromptToDb(newPrompt).catch(e => console.warn("Failed to sync custom prompt to server:", e));
  };

  const handleDeleteCustomPrompt = (id: string) => {
    const promptToDelete = prompts.find(p => p.id === id);
    if (!promptToDelete) return;
    
    const nextPrompts = prompts.filter((p) => p.id !== id);
    setPrompts(nextPrompts);
    saveLocalCachedPrompts(nextPrompts);
    if (activePrompt.id === id) {
      setActivePrompt(nextPrompts[0] || EMPTY_PROMPT);
    }
    
    // Always use soft-delete for synchronization to ensure it's removed from all users' local caches
    savePromptToDb({ ...promptToDelete, isDeleted: true, updatedAt: new Date().toISOString() }).catch(e => console.warn("Failed to mark prompt as deleted:", e));
  };

  const handleResetPromptToDefault = () => {
    const original = prompts.find((p) => p.id === activePrompt.id);
    if (original) {
      handleUpdateActivePromptText(original.promptText);
    }
  };

  const handleSelectSampleCase = (sample: (typeof SAMPLE_CASES)[0]) => {
    setInputMode("text");
    setProcessText(sample.processText);
    setProcessNumber(sample.processInfo.processNumber || "");
    setErrorMessage(null);
    setDismissedParadigmId(null);
  };

  const handleExecutePrompt = async () => {
    const access = checkUserAiAccess(userProfile, user?.email);
    if (!access.canExecute) {
      setApiKeyModalMessage(access.message);
      setIsApiKeyModalOpen(true);
      setErrorMessage(access.message);
      return;
    }

    const effectivePdfFiles = pdfFiles && pdfFiles.length > 0 ? pdfFiles : [];
    const effectiveText = processText ? processText.trim() : "";
    const hasPromptDirectives = Boolean(activePrompt && activePrompt.promptText && activePrompt.promptText.trim().length > 0);

    if (effectivePdfFiles.length === 0 && !effectiveText && !hasPromptDirectives) {
      setErrorMessage("Por favor, anexe o PDF dos autos, insira o texto processual ou selecione um prompt com diretrizes para executar.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep("Lendo os autos processuais e aplicando as diretrizes do prompt selecionado...");

    // Blindagem de fidelidade fática com re-extração automática e suporte multimodal
    if (inputMode === "pdf" && effectivePdfFiles.length > 0 && !effectiveText) {
      let totalChars = effectivePdfFiles.reduce((acc, p) => acc + (p.extractedText?.trim().length || 0), 0);
      let hasBase64 = effectivePdfFiles.some((p) => Boolean(p.base64 && p.base64.length > 0));

      // Se o arquivo foi anexado com 0 caracteres, tenta re-extrair agora via blob em memória
      if (totalChars === 0) {
        setLoadingStep("Reexaminando e extraindo camadas de texto dos arquivos anexados...");
        let extractedAny = false;
        for (const p of effectivePdfFiles) {
          if ((!p.extractedText || p.extractedText.trim().length === 0) && p.previewUrl) {
            try {
              const blobRes = await fetch(p.previewUrl);
              const blob = await blobRes.blob();
              const fileObj = new File([blob], p.name, { type: "application/pdf" });
              const reRes = await extractTextFromPdf(fileObj);
              if (reRes && reRes.text && reRes.text.trim().length > 0) {
                p.extractedText = reRes.text;
                p.pageCount = reRes.pageCount;
                extractedAny = true;
              }
            } catch (reErr) {
              console.warn("Tentativa de re-extração do PDF falhou:", reErr);
            }
          }
        }
        if (extractedAny) {
          setPdfFiles([...effectivePdfFiles]);
          totalChars = effectivePdfFiles.reduce((acc, p) => acc + (p.extractedText?.trim().length || 0), 0);
        }
      }

      // Se for PDF escaneado (imagens sem texto OCR) de até 25MB, gera base64 para leitura visual da IA
      if (totalChars === 0 && !hasBase64) {
        for (const p of effectivePdfFiles) {
          if (!p.base64 && p.previewUrl && (p.size || 0) < 25 * 1024 * 1024) {
            try {
              setLoadingStep("Preparando autos escaneados para leitura visual direta pela IA...");
              const blobRes = await fetch(p.previewUrl);
              const blob = await blobRes.blob();
              const b64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const res = (e.target?.result as string) || "";
                  resolve(res.includes("base64,") ? res.split("base64,")[1] : res);
                };
                reader.onerror = () => resolve("");
                reader.readAsDataURL(blob);
              });
              if (b64) {
                p.base64 = b64;
                hasBase64 = true;
              }
            } catch (bErr) {
              console.warn("Falha ao gerar base64 multimodal:", bErr);
            }
          }
        }
      }

      totalChars = effectivePdfFiles.reduce((acc, p) => acc + (p.extractedText?.trim().length || 0), 0);
      hasBase64 = effectivePdfFiles.some((p) => Boolean(p.base64 && p.base64.length > 0));

      if (totalChars === 0 && !hasBase64) {
        setIsLoading(false);
        setErrorMessage(
          "Atenção: Não foi possível extrair o texto dos arquivos PDF anexados (0 caracteres encontrados). " +
          "O arquivo anexado consiste em imagens escaneadas sem camada OCR de texto e excede o limite para envio visual direto. " +
          "Para garantir a fidelidade às partes e ao tipo de ação do caso concreto, cole o teor da petição inicial na aba 'Digitar / Colar Texto' ou anexe um PDF com camada de texto pesquisável."
        );
        return;
      }
    }

    const steps = [
      `Aplicando diretrizes do prompt "${activePrompt.title}"...`,
      "Mapeando peças dos autos, petições, contestações e certidões...",
      "Confrontando alegações com IDs/Eventos probatórios e Enunciados do FONAJE...",
      "Calculando atualização monetária (Lei 14.905/2024 / IPCA) e Provimento 165/2024...",
      "Estruturando Relatório Processual Fiel e Fundamentação Jurídica...",
      "Redigindo comandos do Dispositivo com fecho oficial do Gabinete...",
      "Compilando e finalizando minuta estruturada do Juizado...",
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      setLoadingStep(steps[stepIndex % steps.length]);
      stepIndex++;
    }, 1800);

    try {
      const allParadigms = getJudgeParadigms();
      const activeParadigm = selectedParadigmId ? allParadigms.find((p) => p.id === selectedParadigmId) : null;
      const effectiveParadigmText = (isParadigmEnabled || Boolean(customParadigmText?.trim()) || Boolean(selectedParadigmId))
        ? (activeParadigm?.fullText || customParadigmText || "")
        : "";
      const effectiveParadigmTitle = (isParadigmEnabled || Boolean(customParadigmText?.trim()) || Boolean(selectedParadigmId))
        ? (activeParadigm?.title || (customParadigmText ? "Minuta Paradigma Injetada" : "Minuta Paradigma do Juiz"))
        : "";

      // Memory of prior judicial acts in this same process (Dossiê Processual)
      const processActsSummary = activeProcessDossier
        ? getProcessActsSummaryForPrompt(activeProcessDossier)
        : "";

      // Implementando um AbortController com timeout prolongado (24 horas)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000 * 60 * 60 * 24); // 24 horas

      // Fetch active knowledge base docs dynamically right before generation
      const activeKnowledgeDocs = (await getKnowledgeDocs()).filter(d => d.isActive);

      // Garantir que as Teses do Gabinete sejam sempre buscadas da fonte mais recente (DB e Cache)
      const freshTeses = await getCabinetTeses().catch(() => tesesData);
      const effectiveTesesText = (freshTeses && freshTeses.isEnabled !== false && typeof freshTeses.text === "string" && freshTeses.text.trim())
        ? freshTeses.text.trim()
        : (tesesData && tesesData.isEnabled !== false && typeof tesesData.text === "string" ? tesesData.text.trim() : "");

      // Blindagem de envio: remove base64 pesado se o texto já estiver extraído, evitando quedas de rede
      const sanitizedPdfFiles = effectivePdfFiles.map((p) => {
        if (p.extractedText && p.extractedText.trim().length > 30) {
          const { base64: _, ...cleanPdf } = p;
          return cleanPdf;
        }
        return p;
      });

      let response: Response | null = null;
      const requestPayload = JSON.stringify({
        processText: effectiveText,
        pdfFiles: sanitizedPdfFiles,
        knowledgePdfs: activeKnowledgeDocs,
        customPromptText: activePrompt.promptText,
        cabinetTesesText: effectiveTesesText,
        isTesesEnabled: Boolean(effectiveTesesText),
        paradigmModelText: effectiveParadigmText,
        paradigmModelTitle: effectiveParadigmTitle,
        isParadigmEnabled: Boolean(effectiveParadigmText && effectiveParadigmText.trim()),
        proceduralPhase: activePrompt.proceduralPhaseHint || "conhecimento",
        actType: "auto",
        processActsSummary,
        isExpertModeEnabled,
        isGroundingEnabled: getIsGroundingEnabled(),
        processInfo: {
          processNumber: processNumber || "Extrair automaticamente dos autos",
          comarca: activeUnit?.name ? `Comarca de ${activeUnit.name.split('/')[0].trim()} - TJGO` : "Juizado Especial Cível e Criminal da Comarca de Mineiros - TJGO",
          vara: activeUnit?.name ? (activeUnit.name.split('/')[1]?.trim() || activeUnit.name) : "Juizado Especial Cível e Criminal",
          juiz: "Juiz(a) de Direito",
          autor: "",
          reu: "",
          valorCausa: "",
          assunto: activePrompt.title,
        },
        specificInstructions: "",
      });

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await fetch("/api/generate-minute", {
            method: "POST",
            headers: getApiHeaders(),
            signal: controller.signal,
            body: requestPayload,
          });
          break;
        } catch (fetchErr: any) {
          if (attempt === 1 && (fetchErr?.message?.includes("Failed to fetch") || fetchErr?.message?.includes("NetworkError") || fetchErr?.name === "TypeError")) {
            console.log("[Assessor Judicial] Conexão com servidor oscilou. Reconectando em 1.5s...");
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          throw fetchErr;
        }
      }

      if (!response) {
        throw new Error("A conexão com a inteligência jurídica foi interrompida momentaneamente pela rede. Por favor, clique em 'Tentar Novamente'.");
      }

      clearTimeout(timeoutId);
      clearInterval(interval);

      let responseText = "";
      try {
        responseText = await response.text();
      } catch (readErr: any) {
        throw new Error("A conexão com o servidor foi interrompida momentaneamente pela rede. Por favor, clique em 'Tentar Novamente'.");
      }

      if (!response.ok) {
        let errorMsg = "Falha ao processar o processo com o prompt.";
        try {
          const errorData = JSON.parse(responseText.trim());
          if (errorData?.error) {
            errorMsg = errorData.error;
          }
        } catch {
          if (response.status === 413) {
            errorMsg = "O arquivo PDF enviado excede o limite suportado para envio direto. Tente enviar arquivos menores ou compactados.";
          } else if (response.status === 504 || response.status === 502) {
            errorMsg = "O processamento dos autos demorou mais que o esperado pelo servidor. Clique em 'Tentar Novamente'.";
          } else if (responseText && responseText.trim().length > 0 && responseText.length < 300 && !responseText.includes("<!DOCTYPE") && !responseText.includes("<html")) {
            errorMsg = responseText.trim();
          } else {
            errorMsg = `Erro na comunicação com o servidor (${response.status}: ${response.statusText}).`;
          }
        }
        throw new Error(errorMsg);
      }

      let rawData: any;
      try {
        const trimmed = responseText.trim();
        const jsonStart = trimmed.indexOf('{');
        const jsonEnd = trimmed.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart) {
          rawData = JSON.parse(trimmed.substring(jsonStart, jsonEnd + 1));
        } else {
          rawData = JSON.parse(trimmed);
        }
      } catch (parseErr: any) {
        console.log("[Assessor Judicial] Resposta recebida requer ajuste de estrutura:", parseErr?.message || parseErr);
        const lowerResponse = (responseText || "").toLowerCase();
        if (lowerResponse.includes("resource_exhausted") || lowerResponse.includes("quota exceeded") || lowerResponse.includes("credits are depleted") || lowerResponse.includes("429")) {
          throw new Error("Limite de requisições ou cota da chave de inteligência artificial atingido no Google Gemini (Quota / Rate Limit). Aguarde 1 minuto ou configure outra chave nas configurações.");
        } else if (lowerResponse.includes("503") || lowerResponse.includes("high demand") || lowerResponse.includes("unavailable") || lowerResponse.includes("overloaded")) {
          throw new Error("Os servidores do Google Gemini estão enfrentando um pico temporário de alta demanda (503/Overloaded). Aguarde alguns segundos e clique em 'Tentar Novamente'.");
        }
        throw new Error("A conexão com a inteligência jurídica foi interrompida momentaneamente pela rede durante a leitura dos autos. Por favor, clique em 'Tentar Novamente'.");
      }

      // Check for transparent API key rotation
      checkResponseForRotatedKey(rawData);
      checkResponseForRotatedKey(response);

      // Strict validation: if server returned an error payload or flagged error
      if (rawData?.error || rawData?.isError) {
        let cleanMsg = rawData.error;
        try {
          const parsedErr = typeof rawData.error === "string" ? JSON.parse(rawData.error) : rawData.error;
          if (parsedErr?.error?.message) {
            cleanMsg = parsedErr.error.message;
          }
        } catch {}
        throw new Error(cleanMsg || "Erro retornado pela inteligência artificial ao gerar a minuta.");
      }

      if (!rawData || !rawData.minute) {
        throw new Error("A inteligência jurídica não gerou uma minuta válida a partir dos autos. Por favor, tente novamente.");
      }

      const firstGeneratedMinute: MinuteData = rawData.minute ? JSON.parse(JSON.stringify(rawData.minute)) : null;
      const indicacaoTpuCnj = rawData.indicacaoTpuCnj || rawData.minute?.indicacaoTpuCnj || rawData.auditAnalysis?.indicacaoTpuCnj;
      if (firstGeneratedMinute && indicacaoTpuCnj && !firstGeneratedMinute.indicacaoTpuCnj) {
        firstGeneratedMinute.indicacaoTpuCnj = indicacaoTpuCnj;
      }
      const data: GenerationResult = {
        ...rawData,
        indicacaoTpuCnj,
        cadernoTesesApplied: effectiveTesesText ? {
          active: true,
          thesesSnippet: effectiveTesesText.slice(0, 300),
          fullText: effectiveTesesText,
        } : rawData.cadernoTesesApplied,
        originalMinute: rawData.originalMinute || firstGeneratedMinute,
        paradigmUsed: effectiveParadigmText ? {
          id: selectedParadigmId || undefined,
          title: effectiveParadigmTitle,
          decisionType: activeParadigm?.decisionType,
          fullText: effectiveParadigmText,
        } : rawData.paradigmUsed,
      };
      setGenerationResult(data);

      const effectiveProcessNum = (data.minute?.processNumber && !data.minute.processNumber.toLowerCase().includes("extrair") && !data.minute.processNumber.toLowerCase().includes("não informado"))
        ? data.minute.processNumber
        : (processNumber && !processNumber.toLowerCase().includes("extrair") ? processNumber : (data.minute?.processNumber || "Sem Número"));

      if (effectiveProcessNum && effectiveProcessNum !== "Sem Número" && (!processNumber || processNumber.toLowerCase().includes("extrair"))) {
        setProcessNumber(effectiveProcessNum);
      }

      if (data.usage?.totalTokenCount) {
        setSessionTokens((prev) => prev + data.usage!.totalTokenCount!);
        recordApiExecution({
          label: `Minuta: ${activePrompt.title}`,
          processNumber: effectiveProcessNum,
          model: data.modelUsed || "Gemini 3.8 Flash",
          promptTokens: data.usage.promptTokenCount,
          outputTokens: data.usage.candidatesTokenCount,
          totalTokens: data.usage.totalTokenCount,
          module: 'minuta',
        }).catch((e) => console.warn("Failed to record api execution:", e));
      }

      // Save to History (matching server ID if provided) with logged-in user metadata
      const newAnalysisId = (data as any).analysisId || crypto.randomUUID();
      setCurrentAnalysisId(newAnalysisId);
      setCurrentChatMessages([]);

      const analysisToSave: SavedAnalysis = {
        id: newAnalysisId,
        unitId: activeUnit?.id || "montes_claros",
        promptTitle: activePrompt.title,
        promptId: activePrompt.id,
        promptCategory: activePrompt.category || "civel",
        promptScope: activePrompt.scope || "judicial",
        date: Date.now(),
        processNumber: effectiveProcessNum,
        result: {
          ...data,
          minute: data.minute ? {
            ...data.minute,
            judicialUnit: activeUnit?.name || data.minute.judicialUnit,
            comarca: activeUnit?.name ? `Comarca de ${activeUnit.name.split('/')[0].trim()} - TJGO` : data.minute.comarca,
            vara: activeUnit?.name ? (activeUnit.name.split('/')[1]?.trim() || activeUnit.name) : data.minute.vara,
          } : data.minute,
        },
        originalMinute: data.originalMinute || firstGeneratedMinute,
        processTextContext: effectiveText || (effectivePdfFiles.length > 0 ? `[PDFs anexados: ${effectivePdfFiles.map(p => p.name).join(", ")}]` : ""),
        createdBy: user?.uid || "anonymous",
        creatorName: user?.displayName || user?.email?.split("@")[0] || "Assessor",
        creatorEmail: user?.email || "",
        chatMessages: [],
      };
      await saveToHistory(analysisToSave);

    } catch (err: any) {
      clearInterval(interval);
      const isNetworkDisconnection = 
        err?.name === 'TypeError' ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('fetch failed') ||
        err?.name === 'AbortError' ||
        err?.message?.includes('AbortError');

      if (isNetworkDisconnection) {
        console.log("[Assessor Judicial] Interrupção momentânea de rede na execução:", err?.message || err);
      } else {
        console.log("[Assessor Judicial] Aviso registrado na execução:", err?.message || err);
      }
      if (err.name === 'AbortError' || err.message?.includes('AbortError')) {
        setErrorMessage("O processamento demorou mais que o esperado (limite de 24 horas). Tente enviar um arquivo PDF menor ou dividido.");
      } else {
        let errorMsg = err.message || "Ocorreu um erro ao comunicar com a inteligência jurídica do gabinete.";
        
        // Tradução amigável de erros de rede, parse de JSON interrompido ou stream truncado
        if (
          errorMsg.includes("JSON.parse") ||
          errorMsg.includes("unexpected end of data") ||
          errorMsg.includes("Unexpected end of JSON") ||
          errorMsg.includes("Unexpected token") ||
          errorMsg.includes("is not valid JSON") ||
          errorMsg.includes("Failed to fetch") ||
          errorMsg.includes("NetworkError") ||
          errorMsg.includes("network error") ||
          errorMsg.includes("Load failed") ||
          errorMsg.includes("fetch failed")
        ) {
          errorMsg = "A conexão com a inteligência jurídica foi interrompida momentaneamente pela rede durante o envio do processo. Por favor, clique em 'Tentar Novamente'.";
        } else if (
          errorMsg.includes("high demand") ||
          errorMsg.includes("503") ||
          errorMsg.includes("experiencing high demand") ||
          errorMsg.includes("UNAVAILABLE")
        ) {
          errorMsg = "Os servidores de inteligência artificial do Google estão enfrentando um pico temporário de alta demanda global. Por favor, aguarde alguns instantes e clique em 'Tentar Novamente'.";
        }

        setErrorMessage(errorMsg);
        
        if (
          errorMsg.includes("Erro 429") ||
          errorMsg.includes("Limite de requisições") ||
          errorMsg.includes("RESOURCE_EXHAUSTED") ||
          errorMsg.includes("créditos") ||
          errorMsg.includes("prepayment") ||
          errorMsg.includes("billing")
        ) {
           window.dispatchEvent(new CustomEvent("open-api-key-modal", { detail: { message: errorMsg } }));
        }
      }
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  useEffect(() => {
    if (autoExecutePending) {
      const hasContent = (inputMode === "pdf" && pdfFiles.length > 0) || (inputMode === "text" && processText.trim());
      if (hasContent && !isLoading) {
        setAutoExecutePending(false);
        handleExecutePrompt();
      }
    }
  }, [autoExecutePending, inputMode, pdfFiles, processText, isLoading]);

  const handleUpdateMinute = (newMinute: MinuteData) => {
    if (!newMinute) return;
    setGenerationResult((prev) => {
      if (!prev) return null;
      const current = prev.minute;
      const originalMinute = prev.originalMinute || (current ? JSON.parse(JSON.stringify(current)) : undefined);
      const mergedRelatorio = (newMinute.relatorio && newMinute.relatorio.trim().length > 0)
        ? newMinute.relatorio.trim()
        : (current?.relatorio || "");
      const mergedFundamentacao = (newMinute.fundamentacao && newMinute.fundamentacao.trim().length > 0)
        ? newMinute.fundamentacao.trim()
        : (current?.fundamentacao || "");
      const mergedDispositivo = (newMinute.dispositivo && newMinute.dispositivo.trim().length > 0)
        ? newMinute.dispositivo.trim()
        : (current?.dispositivo || "");
      const mergedTitle = newMinute.title?.trim() || current?.title || "SENTENÇA";
      const mergedHeader = newMinute.header?.trim() || current?.header || "PODER JUDICIÁRIO • TRIBUNAL DE JUSTIÇA DO ESTADO DE GOIÁS";
      const mergedProcessNumber = newMinute.processNumber?.trim() || current?.processNumber || processNumber || "Autos do Processo";
      const mergedJudicialUnit = newMinute.judicialUnit?.trim() || current?.judicialUnit || "";
      const mergedParties = {
        author: newMinute.parties?.author?.trim() || current?.parties?.author || "Parte Autora",
        defendant: newMinute.parties?.defendant?.trim() || current?.parties?.defendant || "Parte Ré",
      };
      const mergedClosing = newMinute.closing?.trim() || current?.closing || "Mineiros - GO, data da assinatura digital.\n\nJuiz(a) de Direito";

      const mergedFullFormattedText = [
        mergedHeader,
        `PROCESSO Nº: ${mergedProcessNumber}`,
        `REQUERENTE: ${mergedParties.author}`,
        `REQUERIDO: ${mergedParties.defendant}`,
        "",
        mergedTitle,
        "",
        "I. RELATÓRIO",
        mergedRelatorio,
        "",
        "II. FUNDAMENTAÇÃO",
        mergedFundamentacao,
        "",
        "III. DISPOSITIVO",
        mergedDispositivo,
        "",
        mergedClosing,
      ].join("\n\n");

      const mergedMinute: MinuteData = {
        title: mergedTitle,
        header: mergedHeader,
        processNumber: mergedProcessNumber,
        judicialUnit: mergedJudicialUnit,
        parties: mergedParties,
        relatorio: mergedRelatorio,
        fundamentacao: mergedFundamentacao,
        dispositivo: mergedDispositivo,
        closing: mergedClosing,
        fullFormattedText: mergedFullFormattedText,
      };

      const updatedResult: GenerationResult = {
        ...prev,
        originalMinute,
        minute: mergedMinute,
      };

      return updatedResult;
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] text-slate-900 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 font-sans selection:bg-amber-500 selection:text-slate-950">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative">
          {/* Noble top accent border */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500" />
          
          <div className="p-8 text-center space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-500/20 via-slate-800 to-emerald-950/40 border border-amber-400/40 rounded-2xl flex items-center justify-center shadow-xl transform -rotate-3 transition hover:rotate-0">
                <Scale className="w-10 h-10 text-amber-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1 rounded-full shadow-md">
                <Crown className="w-3.5 h-3.5" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-400/50 text-amber-300 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                <Crown className="w-3 h-3 text-amber-300" />
                <span>Gabinete Judicial & Assessoria Inteligente</span>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Assessor Judicial</h1>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                Ambiente de alta governança jurídica. Acesso integrado para Magistrados(as) Titulares e Assessores com auditoria de minutas e clonagem de paradigmas.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-xl text-left text-xs text-red-200 space-y-1">
                <div className="flex items-center justify-between font-bold text-red-300">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Aviso de Acesso</span>
                  </div>
                  <button onClick={clearAuthError} className="text-red-400 hover:text-red-200 text-xs cursor-pointer">✕</button>
                </div>
                <p className="text-[11px] text-red-300 leading-snug">{authError}</p>
              </div>
            )}

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-left space-y-2 text-[11px] text-slate-300">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Perfil Premium do Magistrado & Equipe</span>
              </div>
              <p className="text-slate-400 text-[10px] leading-snug">
                Identificação nobre de magistrados, auditoria analítica de minutas (Função Ouro) e isolamento institucional de regras decisórias.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => signIn('google')}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer border border-slate-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-sm">Entrar com conta Google</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500 mt-4 block">
              Acesso seguro e autenticado. Dados processados em conformidade institucional.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
        <div className="max-w-lg w-full bg-slate-900 border border-purple-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto bg-purple-900/30 border border-purple-500/50 rounded-2xl flex items-center justify-center text-purple-400">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] font-black uppercase tracking-wider">
              <span>Acesso Restrito — Convite Necessário</span>
            </div>
            <h2 className="text-xl font-bold text-white">Aguardando Convite do Gabinete</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              O Assessor Judicial de IA é uma plataforma de acesso restrito a gabinetes autorizados. Novos usuários não são cadastrados automaticamente e necessitam de convite liberado pelo Administrador.
            </p>
          </div>

          {/* Card com o e-mail do usuário */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">Seu e-mail conectado:</span>
              <button
                type="button"
                onClick={() => {
                  if (user?.email) {
                    navigator.clipboard.writeText(user.email);
                    setHasCopiedEmail(true);
                    setTimeout(() => setHasCopiedEmail(false), 3000);
                  }
                }}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                {hasCopiedEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{hasCopiedEmail ? "Copiado!" : "Copiar E-mail"}</span>
              </button>
            </div>
            <p className="text-xs font-mono font-bold text-purple-300 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 break-all">
              {user?.email}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              💡 <strong>Como proceder:</strong> Informe o e-mail acima ao Juiz Titular ou Administrador do Gabinete para que ele cadastre o seu convite no painel de membros.
            </p>
          </div>

          {/* Botões de ação */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={async () => {
                setIsCheckingInvite(true);
                try {
                  await recheckInvite();
                } finally {
                  setIsCheckingInvite(false);
                }
              }}
              disabled={isCheckingInvite}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingInvite ? 'animate-spin' : ''}`} />
              <span>{isCheckingInvite ? "Verificando liberação..." : "Já Recebi o Convite (Verificar Acesso)"}</span>
            </button>

            <a
              href={`mailto:fabriciocunha.adv@gmail.com?subject=${encodeURIComponent("Solicitação de Acesso ao Gabinete Virtual")}&body=${encodeURIComponent(`Olá,\n\nSolicito a inclusão/convite de acesso ao Gabinete Virtual para o e-mail: ${user?.email || ''}.\n\nAtenciosamente,`)}`}
              className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 border border-slate-700/60"
            >
              <Mail className="w-3.5 h-3.5 text-purple-400" />
              <span>Solicitar Acesso ao Administrador</span>
            </a>

            <button
              onClick={signOut}
              className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Sair / Trocar de Conta Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isDeactivated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 mx-auto bg-red-900/30 border border-red-500/50 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Acesso Temporariamente Desativado</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              O seu usuário ({user.email}) foi temporariamente desativado pelo Administrador do Gabinete. Para restabelecer o acesso, solicite a reativação à equipe de administração.
            </p>
          </div>
          <button
            onClick={signOut}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition cursor-pointer border border-slate-700"
          >
            Sair / Entrar com outra conta
          </button>
        </div>
      </div>
    );
  }

  if (isTenantSuspended) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 mx-auto bg-amber-900/30 border border-amber-500/50 rounded-2xl flex items-center justify-center text-amber-400">
            <Building className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
              <span>{tenantName || "Gabinete Judicial"}</span>
            </div>
            <h2 className="text-xl font-bold text-white">Acesso do Gabinete Suspenso</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {tenantSuspensionReason || "O acesso a este gabinete judicial foi temporariamente suspenso pela administração SaaS. Entre em contato com a gestão do sistema para regularização."}
            </p>
          </div>
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-left text-[11px] text-slate-400">
            <p><span className="text-slate-300 font-semibold">Usuário autenticado:</span> {user.email}</p>
            <p className="text-[10px] text-slate-500 mt-1">Caso precise de suporte, contate o administrador SaaS.</p>
          </div>
          <button
            onClick={signOut}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition cursor-pointer border border-slate-700"
          >
            Sair / Entrar com outra conta
          </button>
        </div>
      </div>
    );
  }


  const determineActiveModal = () => {
    if (isHistoryModalOpen) return 'history';
    if (isTesesModalOpen) return 'teses';
    if (isPromptManagerOpen) return 'prompts';
    if (isProjudiGuideModalOpen) return 'projudi';
    if (isBindingPrecedentsModalOpen) return 'precedents';
    if (isManualModalOpen) return 'manual';
    return 'none';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f3f4f6] text-slate-900 font-sans selection:bg-slate-200">
      <Toaster position="bottom-right" containerStyle={{ zIndex: 99999 }} toastOptions={{ duration: 4000, style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }} />
      <SystemTour 
        runAppTour={!generationResult && !isHistoryModalOpen && !isPromptManagerOpen && !isTesesModalOpen && !isManualModalOpen} 
        runResultTour={!!generationResult && !isHistoryModalOpen && !isPromptManagerOpen && !isTesesModalOpen && !isManualModalOpen} 
        runHistoryTour={isHistoryModalOpen}
        runPromptTour={isPromptManagerOpen}
        runTesesTour={isTesesModalOpen}
      />
      
      <Sidebar
        onGoHome={handleClearAllProcess}
        onOpenMinuteAuditor={() => setIsMinuteAuditorOpen(true)}
        onOpenPresentation={() => setIsPresentationOpen(true)}
        onOpenXRay={() => setIsXRayModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenTeses={() => setIsTesesModalOpen(true)}
        onOpenBindingPrecedents={() => setIsBindingPrecedentsModalOpen(true)}
        onOpenLegislativeLookup={() => setIsLegislativeModalOpen(true)}
        onOpenProjudiGuide={() => setIsProjudiGuideModalOpen(true)}
        onOpenCalendar={() => setIsCalendarModalOpen(true)}
        onOpenHearingWorkbench={() => setIsHearingWorkbenchModalOpen(true)}
        onOpenPromptManager={() => setIsPromptManagerOpen(true)}
        tesesCount={(tesesData.text.match(/^\s*\d+\.\s+[^\n]+/gm) || []).length}
        isJudge={isJudge}
        isSuperAdmin={isSuperAdmin}
      />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden relative">
        {/* Official Header */}
      <Header
        onOpenPromptManager={() => setIsPromptManagerOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenCredits={() => setIsCreditsModalOpen(true)}
        onOpenApiKeyConfig={() => setIsApiKeyModalOpen(true)}
        onOpenXRay={() => setIsXRayModalOpen(true)}
        onOpenTeses={() => setIsTesesModalOpen(true)}
        onOpenBindingPrecedents={() => setIsBindingPrecedentsModalOpen(true)}
        onOpenLegislativeLookup={() => setIsLegislativeModalOpen(true)}
        onOpenProjudiGuide={() => setIsProjudiGuideModalOpen(true)}
        onOpenCalendar={() => setIsCalendarModalOpen(true)}
        onOpenHearingWorkbench={() => setIsHearingWorkbenchModalOpen(true)}
        onOpenManual={() => setIsManualModalOpen(true)}
        onOpenPresentation={() => setIsPresentationOpen(true)}
        onOpenMinuteAuditor={() => setIsMinuteAuditorOpen(true)}
        onToggleGuide={() => setIsGuideVisible(prev => !prev)}
        isGuideVisible={isGuideVisible}
        onOpenSuperAdmin={() => setIsSuperAdminPanelOpen(true)}
        onOpenUserManager={() => setIsUserModalOpen(true)}
        onOpenPetitionPanel={() => setIsPetitionPanelOpen(true)}
        onOpenUnitManager={() => setIsUnitManagerModalOpen(true)}
        onOpenExtension={() => setIsExtensionModalOpen(true)}
        onOpenTicketsModal={(ticketId) => {
          setSelectedTicketId(ticketId);
          setIsTicketsModalOpen(true);
        }}
        tickets={tickets}
        sessionTokens={sessionTokens}
        onGoHome={handleClearAllProcess}
        activePromptTitle={activePrompt.title}
        activePromptType={activePrompt.actTypeHint}
        tesesCount={(tesesData.text.match(/^\s*\d+\.\s+[^\n]+/gm) || []).length}
        isTesesActive={tesesData.isEnabled}
      />

      {/* Real-time Multi-user Broadcast Banner */}
      <SystemBroadcastBanner
        onManualSaveDraft={() =>
          saveSessionDraft({
            savedAt: Date.now(),
            processNumber,
            processNumber2ndGrau,
            processText,
            actingArea,
            activePromptId: activePrompt.id,
            uploadedPdfNames: pdfFiles.map((p) => p.name),
            generationResult,
            currentAnalysisId,
            chatMessages: currentChatMessages,
          })
        }
      />

      {/* Mode Toggle Banner */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-5 mt-3 sm:mt-4 mb-2 flex justify-center sm:justify-end">
        <div className="bg-white border border-slate-200 rounded-full p-1 flex items-center shadow-xs relative overflow-hidden w-full max-w-[320px] sm:w-auto" title="Alterne entre o Modo Simplificado e o Modo Avançado">
          <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-in-out" style={{ width: '50%', transform: isAdvancedMode ? 'translateX(100%)' : 'translateX(0)', backgroundColor: isAdvancedMode ? '#1e293b' : '#4f46e5' }}></div>
          <button
            onClick={() => setIsAdvancedMode(false)}
            className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-colors z-10 flex-1 sm:w-36 text-center ${!isAdvancedMode ? "text-white" : "text-slate-500 hover:text-slate-700"}`}
          >
            Modo Simplificado
          </button>
          <button
            onClick={() => setIsAdvancedMode(true)}
            className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-colors z-10 flex-1 sm:w-36 text-center ${isAdvancedMode ? "text-white" : "text-slate-500 hover:text-slate-700"}`}
          >
            Modo Avançado
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5 space-y-4">
        {/* Noble Magistrado Premium Welcome & Actions Banner */}
        {isJudge && (
          <div className="p-3.5 bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/80 border-2 border-amber-400/80 rounded-2xl shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0 ring-2 ring-amber-300">
                <Crown className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 shadow-2xs">
                    Magistrado Titular • Cargo Nobre
                  </span>
                  <span className="text-xs text-amber-200/90 font-medium flex items-center gap-1">
                    <Scale className="w-3 h-3 text-amber-400" />
                    {activeUnit.name}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-white mt-0.5">
                  Sessão Oficial do Magistrado: {userProfile?.name || user?.displayName || "Exmo(a). Juiz(a)"}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
              {(isSuperAdmin || isJudge) && (
                <button
                  type="button"
                  id="btn-magistrado-banner-minute-auditor"
                  onClick={() => setIsMinuteAuditorOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-md border border-yellow-200 whitespace-nowrap"
                  title="Auditar as minutas elaboradas pelos assessores cruzando com os autos (Lupa do Magistrado & Auditoria Ouro)"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Lupa do Juiz (Auditoria Ouro)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsCalendarModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white font-black text-xs transition cursor-pointer shadow-md border border-amber-300/60 whitespace-nowrap"
                title="Visualizar Pautas de Audiências e Agenda Oficial da Vara"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>Agenda & Pautas</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTesesModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold text-xs transition cursor-pointer border border-amber-400/40 whitespace-nowrap"
                title="Acessar Teses Normativas e Modelos Paradigmas do Juiz"
              >
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                <span>Teses & Paradigmas</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Alert with Quick Retry */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-rose-950">Aviso do Sistema:</strong>
                <p className="mt-0.5 leading-relaxed text-rose-900">{errorMessage}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={handleExecutePrompt}
                disabled={isLoading}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tentar Novamente</span>
              </button>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-700 hover:text-rose-950 font-bold px-2 py-1"
                title="Fechar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Loading Progress Card */}
        {isLoading && (
          <div className="p-5 bg-white border border-emerald-400 rounded-xl shadow-md flex flex-col items-center justify-center text-center space-y-2.5 animate-pulse">
            <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Executando Prompt Automático no Processo
              </h3>
              <p className="text-xs font-medium text-slate-700 font-mono">{loadingStep}</p>
              <p className="text-[11px] text-slate-400">
                Auditoria automática com confronto fático-probatório e regras do TJGO.
              </p>
            </div>
          </div>
        )}

        {/* Main Grid: Left Panel (Inputs & Prompts) vs Right Panel (Resultado & Análise) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Instructions, Area, Prompts & PDF */}
          {!isFormCollapsed && (
            <div className="lg:col-span-6 space-y-4">
              {/* Prompts Management & Selection */}
              <div id="tour-prompt-selector"><PromptSelectorAndEditor
                prompts={prompts}
                activePrompt={activePrompt}
                onSelectPrompt={handleSelectPrompt}
                onUpdateActivePromptText={handleUpdateActivePromptText}
                onOpenPromptManager={() => setIsPromptManagerOpen(true)}
                onResetPromptToDefault={handleResetPromptToDefault}
                isAdmin={isAdmin}
              />
              </div>

              {/* Paradigm Selector (Casos Idênticos / Modelos do Juiz) */}
              {isAdvancedMode && (
                <ParadigmSelector
                  isParadigmEnabled={isParadigmEnabled}
                  setIsParadigmEnabled={setIsParadigmEnabled}
                  selectedParadigmId={selectedParadigmId}
                  setSelectedParadigmId={setSelectedParadigmId}
                  customParadigmText={customParadigmText}
                  setCustomParadigmText={setCustomParadigmText}
                  onOpenCabinetModal={() => setIsTesesModalOpen(true)}
                  detectedMatch={topDetectedParadigmMatch}
                  detectedMatches={detectedParadigmMatches}
                  onApplySuggestedParadigm={(match) => {
                    setIsParadigmEnabled(true);
                    setSelectedParadigmId(match.paradigm.id);
                    setCustomParadigmText(match.paradigm.fullText);
                    setAutoExecutePending(true);
                  }}
                  onDismissSuggestion={() => {
                    if (topDetectedParadigmMatch) {
                      setDismissedParadigmId(topDetectedParadigmMatch.paradigm.id);
                    }
                  }}
                />
              )}

              {/* PDF Ingestion Zone & Mode Switcher */}
              <div id="tour-input-panel" className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
                {/* Lotação / Unidade Judiciária dos Autos com Cadastro Rápido */}
                <ProcessUnitSelector
                  onOpenUnitManager={() => setIsUnitManagerModalOpen(true)}
                  detectedUnitName={detectedUnitName}
                />

                {/* Banner Informativo de Controle & Co-Piloto do Assessor */}
                {isAdvancedMode && (
                  <div
                    id="tour-assessor-guide-banner"
                    className="p-3 bg-gradient-to-r from-emerald-50/90 via-slate-50 to-indigo-50/40 border border-emerald-200/90 rounded-xl shadow-2xs flex items-center justify-between gap-3 transition hover:border-emerald-300"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-700 shrink-0">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                          <span>Controle Total da Decisão (Sem 'Caixa-Preta')</span>
                          <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            Co-Piloto
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-600 truncate">
                          Prefere guiar a IA, orientar teses do Dizer o Direito e doutrina antes de redigir a minuta?
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAssessorWorkflowGuideOpen(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer"
                      title="Ver orientações de controle da IA para o assessor"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                      <span>Como Funciona</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileUp className="w-4 h-4 text-emerald-600" />
                    Entrada dos Autos do Processo:
                  </span>
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      onClick={() => setInputMode("pdf")}
                      className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                        inputMode === "pdf"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => setInputMode("text")}
                      className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                        inputMode === "text"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Texto / Casos
                    </button>
                  </div>
                </div>

                {inputMode === "pdf" ? (
                  <PdfUploadZone
                    pdfFiles={pdfFiles}
                    onAddPdf={handleAddPdf}
                    onUpdatePdf={handleUpdatePdf}
                    onRemovePdf={handleRemovePdf}
                    onClearAll={handleClearPdfs}
                    onOpenAssessorGuide={() => setIsAssessorWorkflowGuideOpen(true)}
                  />
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                        Casos Modelo TJGO:
                      </span>
                      {SAMPLE_CASES.slice(0, 4).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectSampleCase(c)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-50 hover:border-slate-300 border border-slate-200 text-[11px] text-slate-700 transition cursor-pointer"
                        >
                          {c.title}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={6}
                      value={processText}
                      onChange={(e) => setProcessText(e.target.value)}
                      placeholder="Cole aqui o texto das peças, certidões ou eventos do Projudi..."
                      className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {/* Knowledge Base Persistent Zone */}
                {isAdvancedMode && activeKnowledgeDocsCount > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-slate-700" />
                      <div className="text-[11px] leading-tight">
                        <span className="font-bold text-slate-900">Base de Conhecimento do Gabinete (Nuvem):</span> Ativa e injetando {activeKnowledgeDocsCount} documento(s) paramétrico(s) na análise atual.
                      </div>
                    </div>
                  </div>
                )}

                {/* Binding Precedents Active Search Indicator */}
                {isAdvancedMode && (
                  <div 
                    onClick={() => setIsBindingPrecedentsModalOpen(true)}
                    className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200 text-teal-900 flex items-center justify-between gap-2 cursor-pointer transition shadow-2xs group"
                    title="Clique para pesquisar ou injetar súmulas e teses vinculantes específicas"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <div className="text-[11px] leading-tight">
                        <span className="font-bold text-teal-950">Consulta Externa Vinculante Ativa:</span> Súmulas e Teses (STF • STJ • TNU) consultadas automaticamente nas execuções.
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 group-hover:text-teal-900 bg-teal-200/60 px-2 py-0.5 rounded-md whitespace-nowrap">
                      Consultar Repositório →
                    </span>
                  </div>
                )}
                
                {/* Big Action Execution Button + Clear Button */}
                <div className="pt-1 flex items-center gap-2">
                  <button
                    id="tour-execute-btn"
                    onClick={handleExecutePrompt}
                    disabled={isLoading || (inputMode === "pdf" ? (pdfFiles.length === 0 && !activePrompt?.promptText?.trim()) : (!processText.trim() && !activePrompt?.promptText?.trim()))}
                    title="Clique aqui para enviar os dados para a inteligência artificial gerar a peça jurídica"
                    className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 transition cursor-pointer relative overflow-hidden ${
                      isLoading || (inputMode === "pdf" ? (pdfFiles.length === 0 && !activePrompt?.promptText?.trim()) : (!processText.trim() && !activePrompt?.promptText?.trim()))
                        ? "bg-slate-400 cursor-not-allowed opacity-75"
                        : "bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] group"
                    }`}
                  >
                    {!isLoading && (inputMode === "pdf" ? pdfFiles.length > 0 : !!processText.trim()) && (
                      <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] skew-x-12" />
                    )}
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processando e elaborando minuta judicial...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>
                          {inputMode === "pdf" && pdfFiles.length > 0
                            ? `Gerar Minuta no PDF (${pdfFiles.length})`
                            : "Gerar Minuta Judicial"}
                        </span>
                      </>
                    )}
                  </button>

                  {(pdfFiles.length > 0 || processText.trim() || processNumber || generationResult) && (
                    <button
                      onClick={handleClearAllProcess}
                      disabled={isLoading}
                      className="py-3 px-3.5 bg-slate-100 hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-600 hover:text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Limpar todos os campos e PDF para analisar novo processo"
                    >
                      <RotateCcw className="w-4 h-4 text-rose-500" />
                      <span className="hidden sm:inline">Limpar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* RIGHT COLUMN: Resultado & Análise + Assessor Judicial */}
          <div className={`${isFormCollapsed ? "lg:col-span-12" : "lg:col-span-6"} space-y-4`}>
            <MinuteViewer
              result={generationResult}
              onUpdateMinute={handleUpdateMinute}
              originalProcessText={
                inputMode === "pdf"
                  ? `[PDFs anexados: ${pdfFiles.map((p) => p.name).join(", ")}]`
                  : processText
              }
              isFormCollapsed={isFormCollapsed}
              onToggleCollapseForm={() => setIsFormCollapsed(!isFormCollapsed)}
              onClearProcess={handleClearAllProcess}
              onGoHome={handleClearAllProcess}
              onOpenXRay={() => setIsXRayModalOpen(true)}
              onAddSessionTokens={(tokens) => setSessionTokens((prev) => prev + tokens)}
              customPromptText={activePrompt.promptText}
              cabinetTesesText={tesesData.isEnabled ? tesesData.text : ""}
              isTesesEnabled={tesesData.isEnabled}
              paradigmModelText={
                isParadigmEnabled
                  ? (selectedParadigmId
                      ? getJudgeParadigms().find((p) => p.id === selectedParadigmId)?.fullText || customParadigmText
                      : customParadigmText)
                  : ""
              }
              paradigmModelTitle={
                isParadigmEnabled
                  ? (selectedParadigmId
                      ? getJudgeParadigms().find((p) => p.id === selectedParadigmId)?.title || "Minuta Paradigma"
                      : "Minuta Paradigma")
                  : ""
              }
              isParadigmEnabled={isParadigmEnabled}
              currentAnalysisId={currentAnalysisId}
              initialChatMessages={currentChatMessages}
              onChatMessagesUpdated={(messages, updatedMinute) => {
                setCurrentChatMessages(messages);
                if (updatedMinute) {
                  handleUpdateMinute(updatedMinute);
                }
              }}
              onInjectTextAsParadigm={(snippet, procNum, cat) => {
                setInitialParadigmDraft({
                  text: snippet,
                  processNumber: procNum || processNumber || "",
                  category: cat || activePrompt.title || "Direito do Consumidor",
                });
                setIsTesesModalOpen(true);
              }}
              onDeleteMinute={handleDeleteCurrentMinute}
            />
          </div>
        </div>
      </main>

      {/* Clean Footer for Assessor Fabrício */}
      <footer className="bg-[#0f1724] text-slate-400 text-xs py-3 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPromptManagerOpen(true)}
              className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Gerenciador de Prompts do Fabrício"
            >
              <Rocket className="w-3.5 h-3.5 text-slate-400" />
              <span>Gerenciar Meus Prompts</span>
            </button>
            <button
              onClick={() => setIsTesesModalOpen(true)}
              className="px-2.5 py-1 rounded-md bg-amber-950/70 border border-amber-500/40 text-amber-300 hover:text-amber-200 hover:bg-amber-900/60 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Teses e Entendimentos do Gabinete"
            >
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Teses do Gabinete</span>
            </button>
            <button
              onClick={() => setIsProjudiGuideModalOpen(true)}
              className="px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-500/40 text-blue-300 hover:text-blue-200 hover:bg-blue-900/60 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Guia Rápido de Lançamentos no PROJUDI"
            >
              <ClipboardList className="w-3.5 h-3.5 text-blue-400" />
              <span>Guia PROJUDI</span>
            </button>
            <span className="text-[11px] text-slate-500">
              Assessor Judicial • Sistema de Análise e Minutas Judiciais
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-800"></span>
            <span>Ambiente Privado de Trabalho</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PromptManagerModal
        isOpen={isPromptManagerOpen}
        onClose={() => setIsPromptManagerOpen(false)}
        prompts={prompts}
        onSavePrompt={handleSaveCustomPrompt}
        onDeletePrompt={handleDeleteCustomPrompt}
        onSelectPrompt={handleSelectPrompt}
        onBulkUpdatePrompts={setPrompts}
        currentPromptId={activePrompt.id}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onGoHome={handleClearAllProcess}
        onLoadAnalysis={(analysis) => {
          try {
            if (isCorruptedHistoryItem(analysis)) {
              if (analysis.id) {
                deleteFromHistory(analysis.id).catch(console.warn);
              }
              alert("Este registro continha erro de processamento e foi removido do histórico.");
              return;
            }

            const loadedResult = analysis.result ? {
              ...analysis.result,
              originalMinute: analysis.result.originalMinute || analysis.originalMinute || analysis.result.minute,
            } : null;
            
            // Defend against corrupted or null results in history causing a React render crash
            if (!loadedResult || !loadedResult.minute || (loadedResult as any).error) {
              console.warn("Corrupted history data, missing minute:", analysis);
              if (analysis.id) {
                deleteFromHistory(analysis.id).catch(console.warn);
              }
              alert("Este registro do histórico continha dados incompletos e foi limpo automaticamente.");
              return;
            }
            
            setGenerationResult(loadedResult);
            setProcessNumber(analysis.processNumber || loadedResult.minute?.processNumber || "");
            setProcessText(analysis.processTextContext || "");
            setCurrentAnalysisId(analysis.id);
            setCurrentChatMessages(Array.isArray(analysis.chatMessages) ? analysis.chatMessages : []);
            const matchingPrompt = prompts.find((p) => p.title === analysis.promptTitle || p.id === analysis.promptId);
            if (matchingPrompt) setActivePrompt(matchingPrompt);
            setIsFormCollapsed(true); // Auto-collapse form to show the minute immediately
          } catch (e) {
            console.error("Crash prevented while loading history:", e);
            alert("Ocorreu um erro ao tentar carregar esta minuta do histórico. Os dados podem estar incompatíveis.");
          }
        }}
      />

      <XRayModal
        isOpen={isXRayModalOpen}
        onClose={() => setIsXRayModalOpen(false)}
        stats={{
          pdfCount: pdfFiles.length,
          hasProcessText: Boolean(processText.trim()),
          activePromptTitle: activePrompt.title,
          isTesesEnabled: tesesData.isEnabled,
          paradigmTitle: isParadigmEnabled && (selectedParadigmId || customParadigmText)
            ? (selectedParadigmId ? getJudgeParadigms().find(p => p.id === selectedParadigmId)?.title || "Minuta Paradigma" : "Minuta Paradigma Personalizada")
            : null
        }}
      />

      <ApiCreditsModal
        isOpen={isCreditsModalOpen}
        onClose={() => setIsCreditsModalOpen(false)}
        onOpenApiKeyConfig={() => {
          setIsCreditsModalOpen(false);
          setIsApiKeyModalOpen(true);
        }}
        currentUsage={generationResult?.usage}
        sessionTotalTokens={sessionTokens}
      />

      <ApiKeyConfigModal
        isOpen={isApiKeyModalOpen}
        onClose={() => {
          setIsApiKeyModalOpen(false);
          setApiKeyModalMessage("");
        }}
        initialMessage={apiKeyModalMessage}
        onOpenUserManager={() => setIsUserModalOpen(true)}
      />

      <CabinetTesesModal
        isOpen={isTesesModalOpen}
        onClose={() => {
          setIsTesesModalOpen(false);
          setInitialParadigmDraft(null);
        }}
        tesesData={tesesData}
        onTesesUpdated={setTesesData}
        onInjectDirectParadigm={(text, title, modelId) => {
          if (modelId) {
            setSelectedParadigmId(modelId);
            setCustomParadigmText(text);
          } else {
            setSelectedParadigmId(null);
            setCustomParadigmText(text);
          }
          setIsParadigmEnabled(true);
          setIsTesesModalOpen(false);
        }}
        initialParadigmDraft={initialParadigmDraft}
        onClearInitialDraft={() => setInitialParadigmDraft(null)}
      />

      <ProjudiGuideModal
        isOpen={isProjudiGuideModalOpen}
        onClose={() => setIsProjudiGuideModalOpen(false)}
        guideData={projudiGuideData}
        onGuideUpdated={setProjudiGuideData}
      />

      <BindingPrecedentsModal
        isOpen={isBindingPrecedentsModalOpen}
        onClose={() => setIsBindingPrecedentsModalOpen(false)}
        isSuperAdmin={isSuperAdmin}
      />

      <LegislativeLookupModal
        isOpen={isLegislativeModalOpen}
        onClose={() => setIsLegislativeModalOpen(false)}
        processContext={processText}
        onInsertClause={(clauseText) => {
          if (generationResult && generationResult.minute) {
            const currentDisp = generationResult.minute.dispositivo || "";
            handleUpdateMinute({
              ...generationResult.minute,
              dispositivo: currentDisp ? `${currentDisp}\n\n${clauseText}` : clauseText,
            });
            toast.success("Cláusula inserida no dispositivo da minuta com sucesso!");
          } else {
            navigator.clipboard.writeText(clauseText);
            toast.success("Cláusula copiada para a área de transferência!");
          }
        }}
      />

      <PresentationModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
      />

      <MinuteAuditorModal
        isOpen={(isSuperAdmin || isJudge) && isMinuteAuditorOpen}
        onClose={() => setIsMinuteAuditorOpen(false)}
        initialProcessText={processText}
        initialPdfs={pdfFiles}
        prompts={prompts}
        activePrompt={activePrompt}
      />

      <SystemManualModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />
      <AssessorWorkflowGuideModal
        isOpen={isAssessorWorkflowGuideOpen}
        onClose={() => setIsAssessorWorkflowGuideOpen(false)}
        onOpenTeses={() => setIsTesesModalOpen(true)}
        onOpenPrompts={() => setIsPromptManagerOpen(true)}
        onOpenParadigms={() => {
          const el = document.getElementById("tour-paradigm-selector");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <UserManagerModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />
      <SuperAdminPanel
        isOpen={isSuperAdminPanelOpen}
        onClose={() => setIsSuperAdminPanelOpen(false)}
        onOpenTicketsModal={() => {
          setSelectedTicketId(undefined);
          setIsTicketsModalOpen(true);
        }}
      />

      <SupportTicketsModal
        isOpen={isTicketsModalOpen}
        onClose={() => {
          setIsTicketsModalOpen(false);
          setSelectedTicketId(undefined);
        }}
        tickets={tickets}
        initialSelectedTicketId={selectedTicketId}
      />

      <UnitManagerModal
        isOpen={isUnitManagerModalOpen}
        onClose={() => setIsUnitManagerModalOpen(false)}
      />

      <CabinetCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
      />

      <HearingWorkbenchModal
        isOpen={isHearingWorkbenchModalOpen}
        onClose={() => setIsHearingWorkbenchModalOpen(false)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
      />

      <ExtensionModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
      />

      <ExtensionImportModal
        isOpen={isExtensionImportModalOpen}
        onClose={() => {
          setIsExtensionImportModalOpen(false);
          setExtensionImportData(null);
        }}
        processNumber={extensionImportData?.processNumber || ''}
        documents={extensionImportData?.documents || []}
        onImport={handleExtensionImport}
      />

      <InitialPetitionPanel
        isOpen={isSuperAdmin && isPetitionPanelOpen}
        onClose={() => setIsPetitionPanelOpen(false)}
        currentUserEmail={user?.email || userProfile?.email || ""}
      />
      <FloatingGuide
        onOpenSuperAdmin={() => setIsSuperAdminPanelOpen(true)} 
        onOpenUserManager={() => setIsUserModalOpen(true)}
        onOpenPetitionPanel={() => setIsPetitionPanelOpen(true)}
        isLoading={isLoading}
        loadingStep={loadingStep}
        pdfCount={pdfFiles.length}
        activeModal={determineActiveModal()}
        hasResult={!!generationResult}
        isVisible={isGuideVisible}
        onClose={() => setIsGuideVisible(false)}
        onOpenApiKeyConfig={() => setIsApiKeyModalOpen(true)}
      />
    </div>
    </div>
  );
}
