import React, { useState, useEffect, useMemo, useRef } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { PromptSelectorAndEditor } from "./components/PromptSelectorAndEditor";
import { SystemTour } from "./components/SystemTour";
import { PromptManagerModal } from "./components/PromptManagerModal";
import { PdfUploadZone } from "./components/PdfUploadZone";
import { useCoberturaLeitura } from "./components/useCoberturaLeitura";
import { GigantesPanel } from "./components/GigantesPanel";
import { PainelProgresso } from "./components/PainelProgresso";
import { GiganteDialog, EscolhaGigante } from "./components/GiganteDialog";
import { gerenteGigantes, ConfigGigante, LIMITE_PAGINAS_GIGANTE } from "./utils/gigantes/gerente";
import { AvisoExtensao } from "./components/AvisoExtensao";
import { arquivoDoPdf } from "./utils/gigantes/arquivoDoPdf";
import { descreverCorte, juntarComoServidor, CorteInfo } from "./utils/corteAutos";
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
import { SystemBroadcastBanner } from "./components/SystemBroadcastBanner";
import { MinuteAuditorModal } from "./components/MinuteAuditorModal";
import { ApiKeyBanner } from "./components/ApiKeyBanner";
import { ApiKeyConfigModal } from "./components/ApiKeyConfigModal";
import { ProcessUnitSelector } from "./components/ProcessUnitSelector";
import { ExtensionImportModal } from "./components/ExtensionImportModal";
import { useModoJanela } from "./utils/areaPrincipal";
import { AssessorWorkflowGuideModal } from "./components/AssessorWorkflowGuideModal";
import { InitialPetitionPanel } from "./components/InitialPetitionPanel";
import { SupportTicketsModal } from "./components/SupportTicketsModal";
import { HearingWorkbenchModal } from "./components/HearingWorkbenchModal";
import { LateralAgentDrawer } from "./components/LateralAgentDrawer";
import { TurboModuleModal } from "./components/TurboModuleModal";
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
import { definirSuperAdminHistorico } from "./lib/firestoreUtils";
import { registrarOperacao } from "./utils/monitorOperacao";
import { iniciarMedidor } from "./utils/medidorEnvio";
import { salvarPendente, lerPendente, limparPendente, consultarResultado, lerCorpo } from "./utils/analisePendente";
import { AvisoNovaVersao } from "./components/AvisoNovaVersao";
import { unirFontes } from "./utils/fontesConsultadas";
import { instalarEnvioDePrecedentes } from "./utils/precedentesNaAnalise";
import { sincronizarPrecedentes } from "./utils/precedentesDb";
import { detectarUnidadeDosAutos, unidadesParaAvisar } from "./utils/unidadeDosAutos";
import { avisarVencimentos, carregarConfigRetencao, iniciarRetencao } from "./utils/retencaoDb";
import { useConfigRetencao } from "./components/EtiquetaValidade";
import { assinarHistorico, buscarAtosDosProcessos, retomarHistoricoPendente, saveToHistory, getHistory, deleteFromHistory, isCorruptedHistoryItem, SavedAnalysis } from "./utils/historyDb";
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
import { extractJudicialMetadataFromText, JudicialExtractedMetadata } from "./utils/judicialMetadataExtractor";
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
  Search,
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
  const [extractedMetadata, setExtractedMetadata] = useState<JudicialExtractedMetadata | null>(null);
  const [activeKnowledgeDocsCount, setActiveKnowledgeDocsCount] = useState<number>(0);
  const [processNumber, setProcessNumber] = useState<string>("");
  // número do processo que ESTA execução deve usar: na esteira, o número que está nos autos enviados (o campo do app guarda o do processo anterior)
  const numeroEntradaRef = useRef<string | null>(null);
  const [processNumber2ndGrau, setProcessNumber2ndGrau] = useState<string>("");
  const [processText, setProcessText] = useState<string>("");

  // Process Execution State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const { resolver: resolverCoberturaLeitura, dialog: dialogCobertura } = useCoberturaLeitura();
  const coberturaEnvioRef = useRef<any>(null);
  const [progId, setProgId] = useState<string | null>(null);
  const [dlgGigante, setDlgGigante] = useState<{ paginas: number; tokens: number; corte: CorteInfo | null; resolver: (e: EscolhaGigante) => void } | null>(null);
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
  const modoJanela = useModoJanela(true);
  const [isPetitionPanelOpen, setIsPetitionPanelOpen] = useState<boolean>(false);
  const [isTicketsModalOpen, setIsTicketsModalOpen] = useState<boolean>(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>(undefined);
  const [tickets, setTickets] = useState<SupportTicket[]>(() => getLocalTickets());
  const [isExtensionImportModalOpen, setIsExtensionImportModalOpen] = useState<boolean>(false);
  const [extensionImportData, setExtensionImportData] = useState<{ processNumber: string; documents: any[] } | null>(null);
  const [sessionTokens, setSessionTokens] = useState<number>(0);
  const [isLegalDrawerOpen, setIsLegalDrawerOpen] = useState<boolean>(false);
  const [isLateralAgentOpen, setIsLateralAgentOpen] = useState<boolean>(false);
  const [auditorActiveProcessNumber, setAuditorActiveProcessNumber] = useState<string>("");
  const [auditorActiveCaseSummary, setAuditorActiveCaseSummary] = useState<string>("");
  const [auditorActiveMinuteSnippet, setAuditorActiveMinuteSnippet] = useState<string>("");
  const [auditorAuditScore, setAuditorAuditScore] = useState<number | undefined>(undefined);
  const [auditorAuditVerdict, setAuditorAuditVerdict] = useState<string | undefined>(undefined);
  const [auditorInitialQuery, setAuditorInitialQuery] = useState<string>("");
  const [isTwoStageExecution, setIsTwoStageExecution] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("agaia_two_stage_execution");
      return saved !== null ? saved === "true" : true; // Padrão: TRUE (Garante que a 1ª etapa seja devolvida primeiro para o magistrado validar)
    } catch {
      return true;
    }
  });
  const [isProceedingToStage2, setIsProceedingToStage2] = useState<boolean>(false);
  // recuperação da análise quando o navegador do celular fecha a página ou perde a conexão (a análise continua no servidor)
  const pendenteAtualRef = useRef<string | null>(null), conexaoPerdidaRef = useRef(false), recuperandoRef = useRef(false), ocupadoRef = useRef(false);
  const [isTurboModalOpen, setIsTurboModalOpen] = useState<boolean>(false);
  // Lupa, Mesa e Turbo abrem no corpo principal e nunca ao mesmo tempo: abrir um fecha os outros
  const abrirModuloPrincipal = (qual: "lupa" | "mesa" | "turbo") => {
    setIsMinuteAuditorOpen(qual === "lupa"); setIsHearingWorkbenchModalOpen(qual === "mesa"); setIsTurboModalOpen(qual === "turbo");
  };
  // ao abrir o sistema logado: reenvia ao Histórico o que ficou pendente no disco (aba recarregada/fechada no meio da gravação)
  useEffect(() => { if (user?.uid) { retomarHistoricoPendente(); iniciarMedidor(); void carregarConfigRetencao(); iniciarRetencao(); } }, [user?.uid]);
  // o super admin pode excluir a minuta de qualquer usuário no Histórico (os demais, só a própria)
  useEffect(() => { definirSuperAdminHistorico(!!isSuperAdmin); }, [isSuperAdmin]);
  // Só "Nova Análise" (barra lateral) fecha o módulo aberto e volta ao formulário; as demais opções da barra lateral não fecham nada
  const algumModuloAberto = isMinuteAuditorOpen || isHearingWorkbenchModalOpen || isTurboModalOpen;
  useEffect(() => {
    if (!algumModuloAberto) return;
    const aoClicar = (ev: MouseEvent) => {
      const alvo = ev.target as HTMLElement | null;
      if (!alvo?.closest?.("#sidebar-principal")) return;
      const botao = alvo.closest("button[title='Nova Análise']");
      if (!botao) return;
      setIsMinuteAuditorOpen(false); setIsHearingWorkbenchModalOpen(false); setIsTurboModalOpen(false);
    };
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, [algumModuloAberto]);
  const moduloAbertoNaJanela = modoJanela && (((isSuperAdmin || isJudge) && isMinuteAuditorOpen) || isHearingWorkbenchModalOpen || isTurboModalOpen);
  const [turboActiveMinute, setTurboActiveMinute] = useState<any>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const [showInstructionsBanner, setShowInstructionsBanner] = useState<boolean>(true);
  const [activeTimelineDossier, setActiveTimelineDossier] = useState<ProcessDossier | null>(null);
  const [autoExecutePending, setAutoExecutePending] = useState<boolean>(false);
  const [selectedActType, setSelectedActType] = useState<"auto" | "sentenca" | "decisao" | "despacho" | "embargos">("auto");

  useEffect(() => { try { document.documentElement.dataset.historicoSuporte = "1"; } catch { /* sem dataset */ } }, []);

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

  // Listas LEVES do Histórico (só o resumo de cada ato), sem puxar o gabinete inteiro:
  // (1) os atos do próprio usuário, ao vivo (alimenta os avisos de vencimento e a memória); (2) os atos dos processos que estão na tela, buscados pelo número.
  // A minuta completa só é baixada quando o ato é aberto.
  const [atosDoUsuario, setAtosDoUsuario] = useState<SavedAnalysis[]>([]);
  const [atosDosProcessos, setAtosDosProcessos] = useState<SavedAnalysis[]>([]);
  useEffect(() => {
    if (!user?.uid) return;
    return assinarHistorico(setAtosDoUsuario, { criador: user.uid });
  }, [user?.uid, activeUnit?.id]);
  const historyList = useMemo(() => {
    const m = new Map<string, SavedAnalysis>();
    for (const it of [...atosDosProcessos, ...atosDoUsuario]) if (it?.id) m.set(it.id, it);
    return [...m.values()];
  }, [atosDoUsuario, atosDosProcessos]);
  // avisa (uma vez por dia) das minutas do usuário que estão perto de vencer no Histórico
  const cfgRetencao = useConfigRetencao();
  useEffect(() => { if (user?.uid && historyList.length) avisarVencimentos(historyList, user.uid); }, [historyList, user?.uid, cfgRetencao.ativa, cfgRetencao.ativadaEm]);

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

  // números de processo presentes na tela (campo, minuta, texto, PDFs): só os atos desses processos são buscados no Histórico
  const cnjsNaTela = useMemo(() => {
    const achados = new Set<string>();
    const add = (t: string) => { for (const m of String(t || "").match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/g) || []) achados.add(m.replace(/\D/g, "")); };
    add(processNumber); add(generationResult?.minute?.processNumber || ""); add(processText);
    for (const p of pdfFiles) add((p.extractedText || "").slice(0, 20000));
    return [...achados].slice(0, 10).sort().join(",");
  }, [processNumber, generationResult, processText, pdfFiles]);
  useEffect(() => {
    if (!user?.uid || !cnjsNaTela) { setAtosDosProcessos([]); return; }
    let vivo = true;
    const t = setTimeout(() => { buscarAtosDosProcessos(cnjsNaTela.split(",")).then((l) => { if (vivo) setAtosDosProcessos(l); }); }, 800);
    return () => { vivo = false; clearTimeout(t); };
  }, [cnjsNaTela, user?.uid, activeUnit?.id]);

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

  // Súmulas/teses anexadas pelo gabinete: traz do banco (1 leitura mínima quando nada mudou) e passa a mandá-las junto das análises
  useEffect(() => { instalarEnvioDePrecedentes(); }, []);
  useEffect(() => { if (user?.uid && (activeTenantId || userProfile?.tenantId)) void sincronizarPrecedentes(); }, [user?.uid, activeTenantId, userProfile?.tenantId]);

  // Unidade(s) que os autos indicam (cabeçalho/nome da comarca); o aviso destacado deixa o usuário escolher a correta
  const unidadesSugeridas = useMemo(() => {
    const textToScan = [...pdfFiles.map((p) => p.extractedText || ""), processText].join(" ");
    return unidadesParaAvisar(detectarUnidadeDosAutos(textToScan, allowedUnits || []), activeUnit?.id);
  }, [pdfFiles, processText, allowedUnits, activeUnit?.id]);

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

    // Auto-extração e cadastro automático dos dados do processo a partir do PDF
    if (newPdf.extractedText && newPdf.extractedText.trim().length > 30) {
      try {
        const meta = extractJudicialMetadataFromText(newPdf.extractedText);
        setExtractedMetadata(meta);
        if (meta.processNumber) {
          setProcessNumber(meta.processNumber);
        }
      } catch (e) {
        console.warn("Erro ao extrair metadados automáticos do PDF:", e);
      }
    }
  };

  const handleUpdatePdf = (updated: UploadedPdf) => {
    setPdfFiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setErrorMessage(null);
    if (updated.extractedText && updated.extractedText.trim().length > 30) {
      try {
        const meta = extractJudicialMetadataFromText(updated.extractedText);
        setExtractedMetadata(meta);
        if (meta.processNumber) {
          setProcessNumber(meta.processNumber);
        }
      } catch (e) {
        console.warn("Erro ao extrair metadados automáticos do PDF:", e);
      }
    }
  };

  const handleRemovePdf = (id: string) => {
    setPdfFiles((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (remaining.length === 0) {
        setExtractedMetadata(null);
      }
      return remaining;
    });
    setDismissedParadigmId(null);
  };

  const handleClearPdfs = () => {
    setPdfFiles([]);
    setExtractedMetadata(null);
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
    setExtractedMetadata(null);
    setProcessText("");
    setProcessNumber("");
    setProcessNumber2ndGrau("");
    setDismissedParadigmId(null);
    setGenerationResult(null);
    setTurboActiveMinute(null);
    setCurrentAnalysisId(null);
    setCurrentChatMessages([]);
    setErrorMessage(null);
    setIsFormCollapsed(false);
    try {
      localStorage.removeItem("assessor_lateral_agent_messages");
    } catch (_) {}
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
    setTurboActiveMinute(null);
    handleClearAllProcess();
  };

  const handleAnalysisDeletedFromHistory = (deletedId: string, deletedProcessNumber?: string) => {
    const isMatchingCurrent = currentAnalysisId === deletedId ||
      (deletedProcessNumber && (
        processNumber === deletedProcessNumber ||
        turboActiveMinute?.processNumber === deletedProcessNumber ||
        generationResult?.minute?.processNumber === deletedProcessNumber
      ));

    if (isMatchingCurrent) {
      handleClearAllProcess();
    }
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

  // Processos gigantes: configuração usada pela leitura em lotes (mesmo prompt, ato e unidade da análise normal)
  const montarConfigGigante = (): ConfigGigante => {
    const par = selectedParadigmId ? getJudgeParadigms().find((p) => p.id === selectedParadigmId) : null;
    return {
      promptText: activePrompt?.promptText || "", promptTitle: activePrompt?.title || "", promptId: activePrompt?.id, promptCategory: activePrompt?.category, promptScope: activePrompt?.scope,
      actType: selectedActType !== "auto" ? selectedActType : (activePrompt?.actTypeHint || "auto"),
      unitId: activeUnit?.id, unitName: activeUnit?.name,
      paradigmText: isParadigmEnabled ? (par?.fullText || customParadigmText || "") : "", paradigmTitle: isParadigmEnabled ? (par?.title || "Minuta Paradigma") : "",
      processNumber: (numeroEntradaRef.current ?? processNumber) || extractedMetadata?.processNumber || "",
      userUid: user?.uid, userName: user?.displayName || user?.email?.split("@")[0] || "Assessor", userEmail: user?.email || "",
    };
  };

  // Falha passageira (503 / cota): manda o mesmo PDF/texto para a fila em segundo plano (que insiste sozinha) e libera o painel para outro processo
  const ehPassageiro = (m: string | null) => !!m && /alta demanda|503|Overloaded|cota|Quota|Rate Limit|interrompida momentaneamente|demorou mais que o esperado/i.test(m);
  const erroPassageiro = ehPassageiro(errorMessage);
  // silencioso = esteira da extensão: o trabalho entra na fila "Gigantes" e a extensão o acompanha por lá (mesmo protocolo dos processos gigantes)
  const enviarSegundoPlano = async (silencioso = false): Promise<boolean> => {
    const pdfsOk = inputMode === "pdf" ? pdfFiles : [];
    const texto = inputMode !== "pdf" ? processText.trim() : "";
    if (pdfsOk.length === 0 && !texto) { if (!silencioso) toast("Não há PDF nem texto no painel para enviar ao segundo plano.", { icon: "⚠️" }); return false; }
    const cfg = montarConfigGigante();
    try {
      if (pdfsOk.length > 0) await gerenteGigantes.iniciarComTextos(pdfsOk.map((p) => ({ nome: p.name, texto: p.extractedText || "", pageCount: p.pageCount || 0, semTexto: p.paginasSemTexto, naoLidas: p.paginasNaoLidas, arquivo: () => arquivoDoPdf(p) })), cfg);
      else await gerenteGigantes.iniciarComTextos([{ nome: cfg.processNumber && !/extrair/i.test(cfg.processNumber) ? `Autos ${cfg.processNumber}` : "Autos (texto colado)", texto, pageCount: Math.max(1, Math.ceil(texto.length / 3500)) }], cfg);
    } catch (e: any) { if (!silencioso) toast(`Não foi possível enviar ao segundo plano: ${e?.message || e}`, { icon: "⚠️" }); return false; }
    setErrorMessage(null);
    if (pdfsOk.length > 0) handleClearPdfs(); else setProcessText("");
    window.dispatchEvent(new CustomEvent("gigantes:abrir"));
    toast(silencioso ? "A IA do Google está instável: este processo foi para o segundo plano e será refeito sozinho. A esteira segue para o próximo." : "Enviado ao segundo plano: o sistema insiste sozinho até a IA responder e salva a minuta no Histórico. O painel está livre para outro processo.", { duration: 9000, icon: "🔁" });
    return true;
  };

  const handleExecutePrompt = async () => {
    const inicioOp = Date.now();
    // dados da operação para o Monitor de operação (quem rodou, com qual prompt, em qual unidade, de onde veio)
    const dadosOp = () => ({ modulo: "normal" as const, unitId: activeUnit?.id, unitName: activeUnit?.name, promptTitle: activePrompt?.title, promptCategory: activePrompt?.category, promptEhPadraoDaLista: prompts.filter((p) => p.id !== "prompt-padrao" && p.title !== "Prompt Padrão")[0]?.id === activePrompt?.id, duracaoMs: Date.now() - inicioOp });
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
    // esteira: o campo "número do processo" do app guarda o do processo ANTERIOR (e a IA misturava os dados). Aqui vale o número que está nos autos desta execução.
    numeroEntradaRef.current = null;
    try {
      if (document.documentElement.dataset.assessorAuto === "1") {
        const cnj = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
        const dosAutos = effectiveText.slice(0, 30000).match(cnj)?.[0] || effectivePdfFiles.map((p) => (p.extractedText || "").slice(0, 30000).match(cnj)?.[0]).find(Boolean) || "";
        numeroEntradaRef.current = dosAutos;
        setProcessNumber(dosAutos);
      }
    } catch { /* sem dataset */ }

    if (effectivePdfFiles.length === 0 && !effectiveText && !hasPromptDirectives) {
      setErrorMessage("Por favor, anexe o PDF dos autos, insira o texto processual ou selecione um prompt com diretrizes para executar.");
      return;
    }

    // Processo gigante: acima do limite da análise normal o final dos autos seria cortado; oferece a leitura em lotes em segundo plano
    if (inputMode === "pdf" && effectivePdfFiles.length > 0 && !effectiveText) {
      const chars = effectivePdfFiles.reduce((n, p) => n + (p.extractedText?.length || 0), 0);
      if (chars > 1_400_000) {
        const paginas = effectivePdfFiles.reduce((n, p) => n + (p.pageCount || 0), 0);
        const automatico = document.documentElement.dataset.assessorAuto === "1";
        const escolhaG = automatico ? (paginas > LIMITE_PAGINAS_GIGANTE ? "partes" : "lotes") : await new Promise<EscolhaGigante>((resolver) => setDlgGigante({ paginas, tokens: Math.round(chars / 3.2), corte: (() => { try { return descreverCorte(juntarComoServidor(effectivePdfFiles.map((p) => ({ nome: p.name, texto: p.extractedText || "", paginas: p.pageCount }))), 1_500_000); } catch { return null; } })(), resolver }));
        setDlgGigante(null);
        if (escolhaG === "cancelar") return;
        if (escolhaG === "limpar") {
          handleClearPdfs();
          toast("Anexos removidos. Anexe o PDF reduzido (até 3.000 páginas) e gere de novo.", { duration: 8000, icon: "🗑️" });
          return;
        }
        if (escolhaG === "partes") {
          const dados = effectivePdfFiles.map((p) => ({ nome: p.name, texto: p.extractedText || "", pageCount: p.pageCount || 0, semTexto: p.paginasSemTexto, naoLidas: p.paginasNaoLidas, arquivo: () => arquivoDoPdf(p) }));
          const ids = await gerenteGigantes.iniciarPartes(dados, { ...montarConfigGigante(), uniaoAutomatica: automatico });
          window.dispatchEvent(new CustomEvent("gigantes:abrir"));
          toast(`Processo dividido em ${ids.length} partes, lidas uma de cada vez em segundo plano. Cada parte gera uma minuta no Histórico.`, { duration: 10000, icon: "✂️" });
          return;
        }
        if (escolhaG === "lotes") {
          const idJob = await gerenteGigantes.iniciarComTextos(effectivePdfFiles.map((p) => ({ nome: p.name, texto: p.extractedText || "", pageCount: p.pageCount || 0, semTexto: p.paginasSemTexto, naoLidas: p.paginasNaoLidas, arquivo: () => arquivoDoPdf(p) })), montarConfigGigante());
          window.dispatchEvent(new CustomEvent("gigantes:abrir"));
          toast("Processo gigante enviado para a leitura em lotes, em segundo plano. Acompanhe pelo selo “Gigantes”.", { duration: 8000, icon: "📚" });
          void idJob;
          return;
        }
      }
    }

    // Texto colado/da esteira (a extensão envia o texto do PDF) com autos gigantes: mesma leitura em lotes em segundo plano (só no modo automático)
    if (inputMode !== "pdf" && effectiveText && effectiveText.length > 1_400_000 && document.documentElement.dataset.assessorAuto === "1") {
      let paginasTxt = 0; try { for (const m of effectiveText.matchAll(/\[Página (\d+)(?: de \d+)?\]/g)) paginasTxt = Math.max(paginasTxt, Number(m[1])); } catch { /* sem marcadores */ }
      if (!paginasTxt) paginasTxt = Math.ceil(effectiveText.length / 3500);
      const numTxt = numeroEntradaRef.current ?? processNumber; const dadosTxt = [{ nome: numTxt && !/extrair/i.test(numTxt) ? `Autos ${numTxt}` : "Autos (texto enviado pela esteira)", texto: effectiveText, pageCount: paginasTxt }];
      if (paginasTxt > LIMITE_PAGINAS_GIGANTE) await gerenteGigantes.iniciarPartes(dadosTxt, { ...montarConfigGigante(), uniaoAutomatica: true });
      else await gerenteGigantes.iniciarComTextos(dadosTxt, montarConfigGigante());
      window.dispatchEvent(new CustomEvent("gigantes:abrir"));
      toast("Autos gigantes recebidos como texto: leitura em lotes em segundo plano. Acompanhe pelo selo “Gigantes”.", { duration: 8000, icon: "📚" });
      return;
    }

    // esteira da extensão: não deixa o resultado do processo anterior na tela (a esteira o confundia com o do processo que está começando)
    try { if (document.documentElement.dataset.assessorAuto === "1" && generationResult) { setGenerationResult(null); setCurrentAnalysisId(null); setCurrentChatMessages([]); } } catch { /* sem dataset */ }
    setIsLoading(true);
    setErrorMessage(null);
    let coberturaImagens: any[] = [];
    coberturaEnvioRef.current = null;
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

    {
      const cob = await resolverCoberturaLeitura(effectivePdfFiles, setLoadingStep);
      setPdfFiles([...effectivePdfFiles]);
      if (cob.cancelado) {
        setIsLoading(false);
        return;
      }
      coberturaEnvioRef.current = cob.cobertura;
      coberturaImagens = cob.imagens;
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
        coberturaLeitura: coberturaEnvioRef.current,
        paginasImagens: coberturaImagens,
        knowledgePdfs: activeKnowledgeDocs,
        customPromptText: activePrompt.promptText,
        activePromptTitle: activePrompt.title || "",
        promptCategory: activePrompt.category || "",
        cabinetTesesText: effectiveTesesText,
        isTesesEnabled: Boolean(effectiveTesesText),
        paradigmModelText: effectiveParadigmText,
        paradigmModelTitle: effectiveParadigmTitle,
        isParadigmEnabled: Boolean(effectiveParadigmText && effectiveParadigmText.trim()),
        proceduralPhase: activePrompt.proceduralPhaseHint || (extractedMetadata?.hasSentencaProferida ? "recursal_ou_pos_sentenca" : "conhecimento"),
        actType: selectedActType !== "auto"
          ? selectedActType
          : (activePrompt.actTypeHint || (activePrompt.title?.toLowerCase().includes("embargo") ? "embargos" : "auto")),
        actSubtype: extractedMetadata?.pendingMatterDescription || "",
        processActsSummary,
        isExpertModeEnabled,
        isGroundingEnabled: getIsGroundingEnabled(),
        processInfo: {
          processNumber: (numeroEntradaRef.current ?? processNumber) || extractedMetadata?.processNumber || "Extrair automaticamente dos autos",
          comarca: activeUnit?.name ? `Comarca de ${activeUnit.name.split('/')[0].trim()} - TJGO` : (extractedMetadata?.judicialUnit || "Juizado Especial Cível e Criminal da Comarca de Mineiros - TJGO"),
          vara: activeUnit?.name ? (activeUnit.name.split('/')[1]?.trim() || activeUnit.name) : "Juizado Especial Cível e Criminal",
          juiz: "Juiz(a) de Direito",
          autor: extractedMetadata?.author || "",
          reu: extractedMetadata?.defendant || "",
          valorCausa: "",
          assunto: activePrompt.title,
        },
        specificInstructions: "",
        executionStage: isTwoStageExecution ? 1 : undefined,
      });

      const novoProg = (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `p-${Date.now()}`);
      setProgId(novoProg);
      pendenteAtualRef.current = novoProg; conexaoPerdidaRef.current = false;
      salvarPendente({ progId: novoProg, tipo: "analise", iniciadoEm: Date.now(), uid: user?.uid, promptTitle: activePrompt.title, promptId: activePrompt.id, promptCategory: activePrompt.category, promptScope: activePrompt.scope, unitId: activeUnit?.id, unitName: activeUnit?.name, processNumber, contexto: effectiveText ? "" : `[PDFs anexados: ${effectivePdfFiles.map((p) => p.name).join(", ")}]` });
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await fetch("/api/generate-minute", {
            method: "POST",
            headers: getApiHeaders({ "x-progresso-id": novoProg }),
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
        // Autocorreção e reparo de JSON em caso de truncamento ou quebras na conexão
        try {
          const trimmed = responseText.trim();
          const jsonStart = trimmed.indexOf('{');
          if (jsonStart !== -1) {
            let candidate = trimmed.substring(jsonStart).replace(/```json/gi, '').replace(/```/g, '').trim();
            candidate = candidate.replace(/(\}\s*){6,}$/, '}');
            let inString = false;
            let escaped = false;
            const stack: string[] = [];
            for (let i = 0; i < candidate.length; i++) {
              const ch = candidate[i];
              if (escaped) { escaped = false; continue; }
              if (ch === '\\') { escaped = true; continue; }
              if (ch === '"') { inString = !inString; continue; }
              if (!inString) {
                if (ch === '{' || ch === '[') stack.push(ch);
                else if (ch === '}' && stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
                else if (ch === ']' && stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
              }
            }
            if (inString) candidate += '"';
            while (stack.length > 0) {
              const open = stack.pop();
              candidate += (open === '{' ? '}' : ']');
            }
            candidate = candidate.replace(/,\s*([\}\]])/g, '$1');
            rawData = JSON.parse(candidate);
          }
        } catch (_) {}

        if (!rawData) {
          const lowerResponse = (responseText || "").toLowerCase();
          if (lowerResponse.includes("resource_exhausted") || lowerResponse.includes("quota exceeded") || lowerResponse.includes("credits are depleted") || lowerResponse.includes("429")) {
            throw new Error("Limite de requisições ou cota da chave de inteligência artificial atingido no Google Gemini (Quota / Rate Limit). Aguarde 1 minuto ou configure outra chave nas configurações.");
          } else if (lowerResponse.includes("503") || lowerResponse.includes("high demand") || lowerResponse.includes("unavailable") || lowerResponse.includes("overloaded")) {
            throw new Error("Os servidores do Google Gemini estão enfrentando um pico temporário de alta demanda (503/Overloaded). Aguarde alguns segundos e clique em 'Tentar Novamente'.");
          }
          throw new Error("A conexão com a inteligência jurídica foi interrompida momentaneamente pela rede durante a leitura dos autos. Por favor, clique em 'Tentar Novamente'.");
        }
      }

      // Check for transparent API key rotation
      checkResponseForRotatedKey(rawData);
      checkResponseForRotatedKey(response);

      // Autos grandes: mostra o que o sistema omitiu/abreviou para caber no limite da chave gratuita
      if (rawData?.autosReduzidos?.resumo) {
        console.log("[Assessor Judicial] Autos grandes reduzidos:", rawData.autosReduzidos);
        toast("Autos grandes: parte das páginas foi omitida/abreviada. Veja o aviso fixo no topo da minuta.", { duration: 10000, icon: "📄" });
      }

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
          usedKey: (data as any).rotatedKey,
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
      const gravado = await saveToHistory(analysisToSave);
      void registrarOperacao({ ...dadosOp(), processo: effectiveProcessNum, resultado: gravado.ok ? "ok" : "nao_gravado", erro: gravado.erro });
      // avisa a extensão (esteira) se o ato foi mesmo gravado no Histórico, para ela não seguir adiante antes disso nem dar o processo por salvo sem estar
      try { document.documentElement.dataset.historicoSalvo = JSON.stringify({ id: newAnalysisId, processo: effectiveProcessNum, ok: gravado.ok, erro: gravado.erro || "", t: Date.now() }); } catch { /* sem dataset */ }

    } catch (err: any) {
      clearInterval(interval);
      const isNetworkDisconnection = 
        err?.name === 'TypeError' ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('fetch failed') ||
        err?.name === 'AbortError' ||
        err?.message?.includes('AbortError');

      const conexaoPerdida = (err?.name !== 'AbortError') && (isNetworkDisconnection || /interrompida momentaneamente pela rede/.test(String(err?.message || "")));
      if (conexaoPerdida && lerPendente()?.progId === pendenteAtualRef.current) {
        // a análise segue no servidor: em vez de pedir para começar de novo, busca o resultado quando a conexão voltar
        conexaoPerdidaRef.current = true;
        toast("A conexão caiu, mas a análise continua no servidor. Vou buscar o resultado assim que a conexão voltar.", { icon: "🔄", duration: 8000 });
        return;
      }
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

        // esteira da extensão: falha passageira (503/cota) não trava a fila; vai para o segundo plano e a extensão segue para o próximo
        let automatico503 = false; try { automatico503 = document.documentElement.dataset.assessorAuto === "1"; } catch { /* sem dataset */ }
        if (automatico503 && ehPassageiro(errorMsg) && await enviarSegundoPlano(true)) { void registrarOperacao({ ...dadosOp(), processo: processNumber, resultado: "segundo_plano", erro: errorMsg }); return; }
        void registrarOperacao({ ...dadosOp(), processo: processNumber, resultado: "erro", erro: errorMsg });

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
      if (conexaoPerdidaRef.current) { conexaoPerdidaRef.current = false; setTimeout(() => { void recuperarPendente(true); }, 1500); }
      else if (pendenteAtualRef.current) limparPendente(pendenteAtualRef.current);
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

  ocupadoRef.current = isLoading || isProceedingToStage2;
  // Busca no servidor o resultado de uma análise que ficou pendente (página fechada pelo celular, conexão perdida...) e o mostra como se tivesse acabado de chegar.
  const recuperarPendente = async (forcar = false) => {
    const pend = lerPendente();
    if (!pend || recuperandoRef.current || (!forcar && ocupadoRef.current)) return;
    if (pend.uid && user?.uid && pend.uid !== user.uid) return;
    recuperandoRef.current = true;
    const tid = "retomada-analise", esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
    try {
      toast.loading("Retomando a análise que estava rodando no servidor…", { id: tid });
      const limite = Date.now() + 25 * 60_000;
      while (Date.now() < limite) {
        let r: any = null; try { r = await consultarResultado(pend.progId); } catch { r = null; }
        if (!r) { await esperar(5000); continue; }      // sem conexão ainda: tenta de novo
        if (r.desconhecido) { toast("A análise anterior não foi encontrada no servidor (ele pode ter sido reiniciado). Inicie de novo.", { id: tid, icon: "ℹ️", duration: 9000 }); limparPendente(pend.progId); return; }
        if (r.pronto) {
          limparPendente(pend.progId);
          let raw: any; try { raw = lerCorpo(r.body || ""); } catch { raw = null; }
          if (!raw || r.status !== 200 || raw.error || raw.isError) { toast.error(String(raw?.error || "A análise terminou com erro no servidor. Inicie de novo."), { id: tid, duration: 9000 }); return; }
          if (!raw.minute) { toast.error("O servidor não devolveu uma minuta válida. Inicie de novo.", { id: tid }); return; }
          if (pend.tipo === "etapa2") {
            setGenerationResult((prev) => ({ ...raw, autosReduzidos: raw.autosReduzidos || prev?.autosReduzidos, alertaInjecao: raw.alertaInjecao || prev?.alertaInjecao, fontesConsultadas: unirFontes(prev?.fontesConsultadas, raw.fontesConsultadas), coberturaLeitura: raw.coberturaLeitura || prev?.coberturaLeitura }));
            toast.success("2ª Etapa recuperada: a minuta definitiva ficou pronta no servidor.", { id: tid, duration: 8000 });
            return;
          }
          const primeira: MinuteData = JSON.parse(JSON.stringify(raw.minute));
          const indicacaoTpuCnj = raw.indicacaoTpuCnj || raw.minute?.indicacaoTpuCnj || raw.auditAnalysis?.indicacaoTpuCnj;
          if (indicacaoTpuCnj && !primeira.indicacaoTpuCnj) primeira.indicacaoTpuCnj = indicacaoTpuCnj;
          const data: GenerationResult = { ...raw, indicacaoTpuCnj, originalMinute: raw.originalMinute || primeira };
          setGenerationResult(data);
          const num = (data.minute?.processNumber && !/extrair|não informado/i.test(data.minute.processNumber)) ? data.minute.processNumber : (pend.processNumber && !/extrair/i.test(pend.processNumber) ? pend.processNumber : (data.minute?.processNumber || "Sem Número"));
          if (num && num !== "Sem Número") setProcessNumber(num);
          const id = (data as any).analysisId || crypto.randomUUID();
          setCurrentAnalysisId(id); setCurrentChatMessages([]);
          const gravado = await saveToHistory({
            id, unitId: pend.unitId || "montes_claros", promptTitle: pend.promptTitle || "Análise recuperada", promptId: pend.promptId, promptCategory: (pend.promptCategory as any) || "civel", promptScope: (pend.promptScope as any) || "judicial",
            date: Date.now(), processNumber: num,
            result: { ...data, minute: data.minute ? { ...data.minute, judicialUnit: pend.unitName || data.minute.judicialUnit } : data.minute },
            originalMinute: data.originalMinute || primeira, processTextContext: pend.contexto || "", createdBy: user?.uid || "anonymous",
            creatorName: user?.displayName || user?.email?.split("@")[0] || "Assessor", creatorEmail: user?.email || "", chatMessages: [],
          } as SavedAnalysis);
          toast.success(gravado.ok ? "Análise recuperada: a minuta ficou pronta enquanto você estava fora e já está no Histórico." : "Análise recuperada: a minuta está na tela, mas NÃO foi gravada no Histórico. Copie ou salve agora.", { id: tid, duration: 10000 });
          return;
        }
        toast.loading(`Retomando a análise no servidor… ${r.andamento?.texto || ""}${r.andamento?.decorridoSeg ? ` (${r.andamento.decorridoSeg}s)` : ""}`, { id: tid });
        await esperar(4000);
      }
      toast.error("A análise ainda não terminou no servidor. Abra o sistema de novo em alguns minutos.", { id: tid, duration: 9000 });
    } finally { recuperandoRef.current = false; }
  };
  useEffect(() => {
    if (!user?.uid) return;
    const tentar = () => { if (!document.hidden) void recuperarPendente(); };
    const t = setTimeout(tentar, 1500);
    document.addEventListener("visibilitychange", tentar); window.addEventListener("pageshow", tentar); window.addEventListener("online", tentar);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", tentar); window.removeEventListener("pageshow", tentar); window.removeEventListener("online", tentar); };
  }, [user?.uid]);

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
                {authError.includes("unauthorized-domain") && (
                  <div className="mt-2 pt-2 border-t border-red-500/30 text-[11px] text-slate-300 space-y-1.5">
                    <p className="font-semibold text-amber-300">Domínio para autorizar no Firebase Console:</p>
                    <div className="flex items-center gap-2 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-700 font-mono text-[10px] text-amber-200 break-all select-all">
                      <span className="truncate">{window.location.hostname}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.hostname);
                          toast.success("Domínio copiado para a área de transferência!");
                        }}
                        className="ml-auto px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-sans font-medium cursor-pointer shrink-0"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                )}
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

  const handleLoadAnalysis = (analysis: SavedAnalysis) => {
    try {
      if (isCorruptedHistoryItem(analysis)) {
        if (analysis.id) {
          deleteFromHistory(analysis.id, { sistema: true }).catch(console.warn);
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
          deleteFromHistory(analysis.id, { sistema: true }).catch(console.warn);
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
  };

  const handleLoadTurboMinute = (minute: any, procNum?: string, text?: string, promptSelected?: CustomPrompt) => {
    const effectiveProcessNum = minute.processNumber || procNum || "";
    const authorName = minute.parties?.author || minute.author || "Parte Autora";
    const defendantName = minute.parties?.defendant || minute.defendant || "Parte Ré";
    const judicialUnitName = minute.judicialUnit || activeUnit?.name || "Vara Única";

    const loadedResult: GenerationResult = {
      minute: {
        title: minute.title || "SENTENÇA",
        header: minute.header || `${judicialUnitName}\nPROCESSO Nº ${effectiveProcessNum}`,
        processNumber: effectiveProcessNum,
        judicialUnit: judicialUnitName,
        parties: {
          author: authorName,
          defendant: defendantName,
        },
        relatorio: minute.relatorio || "",
        fundamentacao: minute.fundamentacao || "",
        dispositivo: minute.dispositivo || "",
        fullFormattedText: minute.fullFormattedText || "",
        closing: minute.closing || "Publique-se. Registre-se. Intimem-se.",
        proceduralPhase: minute.proceduralPhase || "",
        priorDecisionsSummary: minute.priorDecisionsSummary || "",
        pendingMatter: minute.pendingMatter || "",
      },
      holisticSynopsis: `Processo nº ${effectiveProcessNum} | ${authorName} vs ${defendantName}\n${minute.relatorio || minute.fullFormattedText?.substring(0, 1500) || ""}`,
      auditAnalysis: {
        fatoVsProva: [],
        regularidadeDocumental: {} as any,
        competenciaCheck: {} as any,
        normasAplicadas: [],
        alertasProcessuais: [
          ...(minute.priorDecisionsSummary ? [`Decisões Anteriores: ${minute.priorDecisionsSummary}`] : []),
          ...(minute.pendingMatter ? [`Matéria Pendente: ${minute.pendingMatter}`] : [])
        ],
      },
    };
    setGenerationResult(loadedResult);
    if (effectiveProcessNum) setProcessNumber(effectiveProcessNum);
    if (text) setProcessText(text);
    if (promptSelected) setActivePrompt(promptSelected);
    setIsFormCollapsed(true);
  };

  const handleOpenCopilotFromTurbo = (minute?: any, procNum?: string, text?: string) => {
    if (minute) {
      setTurboActiveMinute(minute);
      handleLoadTurboMinute(minute, procNum, text);
    } else if (procNum) {
      setProcessNumber(procNum);
      if (text) setProcessText(text);
    }
    setIsLateralAgentOpen(true);
  };

  const handleOpenCopilotFromAuditor = (data: {
    processNumber?: string;
    caseSummary?: string;
    activeMinuteSnippet?: string;
    isAuditedProcess?: boolean;
    auditScore?: number;
    auditVerdict?: string;
    initialQuery?: string;
  }) => {
    if (data.processNumber) setAuditorActiveProcessNumber(data.processNumber);
    if (data.caseSummary) setAuditorActiveCaseSummary(data.caseSummary);
    if (data.activeMinuteSnippet) setAuditorActiveMinuteSnippet(data.activeMinuteSnippet);
    setAuditorAuditScore(data.auditScore);
    setAuditorAuditVerdict(data.auditVerdict);
    if (data.initialQuery) setAuditorInitialQuery(data.initialQuery);
    setIsLateralAgentOpen(true);
  };

  const handleProceedToStage2 = async () => {
    if (!generationResult?.canProceedToStage2) return;
    setIsProceedingToStage2(true);
    const progStage2 = (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `p2-${Date.now()}`);
    setProgId(progStage2);
    salvarPendente({ progId: progStage2, tipo: "etapa2", iniciadoEm: Date.now(), uid: user?.uid, processNumber });
    let perdeuConexao2 = false;
    const toastId = toast.loading("Executando 2ª Etapa: Juiz Revisor e Matriz Forense...");
    try {
      const stage1Snapshot = generationResult.stage1Snapshot || {
        processNumber: generationResult.minute?.processNumber,
        author: generationResult.minute?.parties?.author,
        defendant: generationResult.minute?.parties?.defendant,
        judicialUnit: generationResult.minute?.judicialUnit,
        actType: generationResult.minute?.title || (generationResult.minute as any)?.decisionType,
        relatorio: generationResult.minute?.relatorio,
        fundamentacao: generationResult.minute?.fundamentacao,
        dispositivo: generationResult.minute?.dispositivo,
        generatedAt: Date.now(),
      };

      const freshTeses = await getCabinetTeses().catch(() => tesesData);
      const effectiveTesesText = (freshTeses && freshTeses.isEnabled !== false && typeof freshTeses.text === "string" && freshTeses.text.trim())
        ? freshTeses.text.trim()
        : (tesesData && tesesData.isEnabled !== false && typeof tesesData.text === "string" ? tesesData.text.trim() : "");

      const payload = {
        executionStage: 2,
        stage1Snapshot,
        coberturaLeitura: coberturaEnvioRef.current,
        processText: (processText || "").trim(),
        pdfFiles: pdfFiles.map((p) => ({
          name: p.name,
          extractedText: p.extractedText || "",
        })),
        knowledgePdfs: [],
        customPromptText: activePrompt?.promptText || "",
        activePromptTitle: activePrompt?.title || "",
        promptCategory: activePrompt?.category || "",
        isTesesEnabled: Boolean(effectiveTesesText),
        cabinetTesesText: effectiveTesesText,
        isParadigmEnabled: isParadigmEnabled,
        paradigmModelText: isParadigmEnabled
          ? (selectedParadigmId
              ? getJudgeParadigms().find((p) => p.id === selectedParadigmId)?.fullText || customParadigmText
              : customParadigmText)
          : "",
        paradigmModelTitle: isParadigmEnabled
          ? (selectedParadigmId
              ? getJudgeParadigms().find((p) => p.id === selectedParadigmId)?.title || "Minuta Paradigma"
              : "Minuta Paradigma")
          : "",
        actType: selectedActType !== "auto" ? selectedActType : (activePrompt?.actTypeHint || "auto"),
        processInfo: {
          processNumber: processNumber || generationResult.minute?.processNumber || "Autos",
          comarca: activeUnit?.name ? `Comarca de ${activeUnit.name.split("/")[0].trim()} - TJGO` : "Comarca",
          vara: activeUnit?.name ? (activeUnit.name.split("/")[1]?.trim() || activeUnit.name) : "Vara Cível",
          juiz: "Juiz(a) de Direito",
        },
      };

      const res = await fetch("/api/generate-minute", {
        method: "POST",
        headers: getApiHeaders({ "x-progresso-id": progStage2 }),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Erro ao executar 2ª etapa.");
      }

      const completedResult: GenerationResult = await res.json();
      setGenerationResult((prev) => ({ ...completedResult, autosReduzidos: completedResult.autosReduzidos || prev?.autosReduzidos, alertaInjecao: completedResult.alertaInjecao || prev?.alertaInjecao, fontesConsultadas: unirFontes(prev?.fontesConsultadas, completedResult.fontesConsultadas), coberturaLeitura: completedResult.coberturaLeitura || prev?.coberturaLeitura }));
      toast.success("2ª Etapa concluída com sucesso! Minuta definitiva consolidada.", { id: toastId });
    } catch (err: any) {
      console.error("Erro na 2ª etapa:", err);
      if (err?.name === "TypeError" || /Failed to fetch|NetworkError|Load failed|network/i.test(String(err?.message || ""))) {
        perdeuConexao2 = true;
        toast("A conexão caiu, mas a 2ª etapa continua no servidor. Vou buscar o resultado assim que a conexão voltar.", { id: toastId, icon: "🔄", duration: 8000 });
      } else toast.error(err.message || "Erro na 2ª etapa da minuta.", { id: toastId });
    } finally {
      setIsProceedingToStage2(false);
      if (perdeuConexao2) setTimeout(() => { void recuperarPendente(true); }, 1500); else limparPendente(progStage2);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f3f4f6] text-slate-900 font-sans selection:bg-slate-200">
      <AvisoExtensao />
      <Toaster position="bottom-right" containerStyle={{ zIndex: 99999 }} toastOptions={{ duration: 4000, style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }} />
      <AvisoNovaVersao />
      <SystemTour 
        runAppTour={!generationResult && !isHistoryModalOpen && !isPromptManagerOpen && !isTesesModalOpen && !isManualModalOpen} 
        runResultTour={!!generationResult && !isHistoryModalOpen && !isPromptManagerOpen && !isTesesModalOpen && !isManualModalOpen} 
        runHistoryTour={isHistoryModalOpen}
        runPromptTour={isPromptManagerOpen}
        runTesesTour={isTesesModalOpen}
      />
      
      <Sidebar
        onGoHome={handleClearAllProcess}
        onOpenMinuteAuditor={() => abrirModuloPrincipal("lupa")}
        onOpenPresentation={() => setIsPresentationOpen(true)}
        onOpenXRay={() => setIsXRayModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenTeses={() => setIsTesesModalOpen(true)}
        onOpenBindingPrecedents={() => setIsBindingPrecedentsModalOpen(true)}
        onOpenLegislativeLookup={() => setIsLegislativeModalOpen(true)}
        onOpenProjudiGuide={() => setIsProjudiGuideModalOpen(true)}
        onOpenCalendar={() => setIsCalendarModalOpen(true)}
        onOpenHearingWorkbench={() => abrirModuloPrincipal("mesa")}
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
        onOpenHearingWorkbench={() => abrirModuloPrincipal("mesa")}
        onOpenManual={() => setIsManualModalOpen(true)}
        onOpenPresentation={() => setIsPresentationOpen(true)}
        onOpenMinuteAuditor={() => abrirModuloPrincipal("lupa")}
        onOpenLateralAgent={() => setIsLateralAgentOpen(true)}
        onOpenTurboModule={() => abrirModuloPrincipal("turbo")}
        onToggleGuide={() => setIsAssessorWorkflowGuideOpen(true)}
        isGuideVisible={isGuideVisible}
        onOpenSuperAdmin={() => setIsSuperAdminPanelOpen(true)}
        onOpenUserManager={() => setIsUserModalOpen(true)}
        onOpenPetitionPanel={() => setIsPetitionPanelOpen(true)}
        onOpenUnitManager={() => setIsUnitManagerModalOpen(true)}
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

      {/* Mode & View Layout Toggle Banner */}
      <div data-testid="barra-modos" className={`${moduloAbertoNaJanela ? "hidden " : ""}max-w-[1600px] mx-auto w-full px-3 sm:px-4 md:px-5 mt-2 sm:mt-3 mb-2 flex flex-col sm:flex-row items-center justify-between gap-2.5`}>
        {/* Notebook / View Layout Toggle */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full p-1 shadow-xs text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setIsFormCollapsed(false)}
            className={`px-3 py-1.5 rounded-full transition flex items-center gap-1.5 cursor-pointer ${
              !isFormCollapsed
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Exibir painel de entrada de autos e prompts"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Autos & Prompts</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFormCollapsed(true)}
            className={`px-3 py-1.5 rounded-full transition flex items-center gap-1.5 cursor-pointer ${
              isFormCollapsed
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Expandir visualização da Minuta Judicial em tela cheia"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Minuta (Tela Cheia)</span>
          </button>
        </div>

        {/* Mode Toggle Banner */}
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
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 md:p-5 space-y-4">
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
              {erroPassageiro && (
                <button
                  onClick={() => enviarSegundoPlano()}
                  disabled={isLoading}
                  title="Mantém o PDF/texto numa fila que tenta de novo sozinha e libera o painel para outro processo"
                  className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-800 border border-rose-400 font-bold rounded-lg transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>Tentar em segundo plano</span>
                </button>
              )}
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

        {dialogCobertura}
        {dlgGigante && <GiganteDialog paginas={dlgGigante.paginas} tokens={dlgGigante.tokens} corte={dlgGigante.corte} onEscolha={dlgGigante.resolver} />}

        {/* Loading Progress Card */}
        {(isLoading || isProceedingToStage2) && (
          <div className="sticky top-24 z-30 p-5 bg-white border border-emerald-400 rounded-xl shadow-lg flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <PainelProgresso
              ativo={isLoading || isProceedingToStage2}
              progId={progId}
              titulo={isProceedingToStage2 && !isLoading ? "2ª Etapa — Juiz Revisor" : "Executando prompt no processo"}
              fallbackTexto={loadingStep}
            />
          </div>
        )}

        {/* Main Grid: Left Panel (Inputs & Prompts) vs Right Panel (Resultado & Análise) */}
        <div className={`${moduloAbertoNaJanela ? "hidden " : ""}grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5 items-start`}>
          {/* LEFT COLUMN: Instructions, Area, Prompts & PDF */}
          {!isFormCollapsed && (
            <div className="xl:col-span-6 space-y-4">
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
                  unidadesSugeridas={unidadesSugeridas}
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

                {/* Seletor Interativo de Tipo de Minuta */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-indigo-600" />
                      Tipo de Minuta a Redigir:
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {selectedActType === "auto" ? "Detecta marcha e pendências dos autos" : "Fixado manualmente"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedActType("auto")}
                      className={`px-2 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1 ${
                        selectedActType === "auto"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700"
                      }`}
                      title="Analisa a ordem de coisas pendentes no PDF (Despacho, Decisão ou Sentença)"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Detectar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedActType("sentenca")}
                      className={`px-2 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1 ${
                        selectedActType === "sentenca"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700"
                      }`}
                      title="Redigir Sentença de Mérito ou Terminativa (art. 487/485 CPC)"
                    >
                      <Scale className="w-3 h-3" />
                      <span>Sentença</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedActType("decisao")}
                      className={`px-2 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1 ${
                        selectedActType === "decisao"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700"
                      }`}
                      title="Redigir Decisão Interlocutória (Tutela de urgência, liminar ou saneamento)"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Decisão</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedActType("despacho")}
                      className={`px-2 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1 ${
                        selectedActType === "despacho"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700"
                      }`}
                      title="Redigir Despacho de mero expediente, citação ou impulso oficial"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Despacho</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedActType("embargos")}
                      className={`col-span-2 sm:col-span-1 px-2 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1 ${
                        selectedActType === "embargos"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700"
                      }`}
                      title="Julgar Embargos de Declaração pendentes (art. 1.022 CPC)"
                    >
                      <Search className="w-3 h-3" />
                      <span>Embargos</span>
                    </button>
                  </div>
                </div>

                {inputMode === "pdf" ? (
                  <>
                    <PdfUploadZone
                      pdfFiles={pdfFiles}
                      onAddPdf={handleAddPdf}
                      onUpdatePdf={handleUpdatePdf}
                      onRemovePdf={handleRemovePdf}
                      onClearAll={handleClearPdfs}
                      onOpenAssessorGuide={() => setIsAssessorWorkflowGuideOpen(true)}
                    />
                    {pdfFiles.length > 0 && extractedMetadata && (
                      <div className="p-3 bg-emerald-50/90 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in duration-200">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Dados Cadastrados Automaticamente dos Autos (PDF):</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-emerald-100 dark:border-emerald-900/50 text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Processo nº:</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {extractedMetadata.processNumber || processNumber || "Identificado nos autos"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Promovente (Autor):</span>
                            <span className="font-semibold text-slate-900 dark:text-white truncate block" title={extractedMetadata.author}>
                              {extractedMetadata.author || "Identificado na inicial"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Promovido (Réu):</span>
                            <span className="font-semibold text-slate-900 dark:text-white truncate block" title={extractedMetadata.defendant}>
                              {extractedMetadata.defendant || "Identificado na petição inicial"}
                            </span>
                          </div>
                        </div>
                        {extractedMetadata.pendingMatterDescription && (
                          <div className="flex items-start gap-1.5 pt-1.5 border-t border-emerald-100 dark:border-emerald-900/50 text-[11px] text-emerald-900 dark:text-emerald-200">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">⚖️ Marcha Processual:</span>
                            <span>{extractedMetadata.pendingMatterDescription}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
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
                        <span className="font-bold text-teal-950">Consulta Externa Vinculante Ativa:</span> Súmulas e Teses (STF • STJ • TNU • TJGO), julgados anexados pelo gabinete e legislação oficial (Planalto) consultados automaticamente nas execuções; ao final, a minuta mostra o que foi consultado.
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 group-hover:text-teal-900 bg-teal-200/60 px-2 py-0.5 rounded-md whitespace-nowrap">
                      Consultar Repositório →
                    </span>
                  </div>
                )}
                
                {/* Opção de Execução em 2 Etapas com Parada Estratégica */}
                <div className="flex items-center justify-between px-1 py-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isTwoStageExecution}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsTwoStageExecution(checked);
                        try {
                          localStorage.setItem("agaia_two_stage_execution", String(checked));
                        } catch {}
                      }}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                    />
                    <span className="font-semibold flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Execução em 2 Etapas</span>
                      <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">(Pausa pedagógica: Fatos ➔ Juiz Revisor)</span>
                    </span>
                  </label>
                  {isTwoStageExecution && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                      2 Etapas Ativo
                    </span>
                  )}
                </div>

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
                          {isTwoStageExecution
                            ? (inputMode === "pdf" && pdfFiles.length > 0
                                ? `Gerar 1ª Etapa no PDF (${pdfFiles.length})`
                                : "Gerar Minuta - 1ª Etapa (Fatos & Relatório)")
                            : (inputMode === "pdf" && pdfFiles.length > 0
                                ? `Gerar Minuta Direta (${pdfFiles.length} PDFs)`
                                : "Gerar Minuta Judicial Completa")}
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
          <div className={`${isFormCollapsed ? "xl:col-span-12" : "xl:col-span-6"} space-y-4`}>
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
              onProceedToStage2={handleProceedToStage2}
              isProceedingToStage2={isProceedingToStage2}
            />
          </div>
        </div>

        {/* Lupa do Magistrado e Mesa de Audiência: dentro do corpo principal (ou flutuantes, se a preferência estiver desligada) */}
      <MinuteAuditorModal
        isOpen={(isSuperAdmin || isJudge) && isMinuteAuditorOpen}
        onClose={() => {
          setIsMinuteAuditorOpen(false);
          setAuditorActiveProcessNumber("");
          setAuditorActiveCaseSummary("");
          setAuditorActiveMinuteSnippet("");
          setAuditorAuditScore(undefined);
          setAuditorAuditVerdict(undefined);
          setAuditorInitialQuery("");
        }}
        initialProcessText={processText}
        initialPdfs={pdfFiles}
        prompts={prompts}
        activePrompt={activePrompt}
        onOpenCopilot={handleOpenCopilotFromAuditor}
      />
      <HearingWorkbenchModal
        isOpen={isHearingWorkbenchModalOpen}
        onClose={() => setIsHearingWorkbenchModalOpen(false)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
      />
      <TurboModuleModal
        isOpen={isTurboModalOpen}
        onClose={() => setIsTurboModalOpen(false)}
        onLoadMinuteToEditor={handleLoadTurboMinute}
        onOpenCopilot={handleOpenCopilotFromTurbo}
        onResetTurboProcess={() => setTurboActiveMinute(null)}
        activeUnitName={activeUnit?.name}
        activeUnitId={activeUnit?.id}
        prompts={prompts}
        activePrompt={activePrompt}
        user={user}
      />
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

      <GigantesPanel config={montarConfigGigante()} onVerHistorico={() => setIsHistoryModalOpen(true)} />
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onGoHome={handleClearAllProcess}
        onLoadAnalysis={handleLoadAnalysis}
        onDeleteAnalysis={handleAnalysisDeletedFromHistory}
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
      <LateralAgentDrawer
        isOpen={isLateralAgentOpen}
        onToggle={() => setIsLateralAgentOpen(prev => !prev)}
        onClose={() => {
          setIsLateralAgentOpen(false);
          setAuditorInitialQuery("");
        }}
        currentProcessNumber={
          auditorActiveProcessNumber ||
          turboActiveMinute?.processNumber ||
          generationResult?.minute?.processNumber ||
          processNumber ||
          (pdfFiles.length > 0 ? pdfFiles[0].name.replace(/\.pdf$/i, '') : undefined)
        }
        caseSummary={
          auditorActiveCaseSummary ||
          (turboActiveMinute
            ? `Processo nº ${turboActiveMinute.processNumber || ""} | ${turboActiveMinute.parties?.author || turboActiveMinute.author || "Parte Autora"} vs ${turboActiveMinute.parties?.defendant || turboActiveMinute.defendant || "Parte Ré"}\n${turboActiveMinute.relatorio || ""}`
            : (generationResult?.holisticSynopsis || generationResult?.minute?.relatorio || (processText ? processText.substring(0, 1500) : undefined)))
        }
        activeMinuteSnippet={
          auditorActiveMinuteSnippet ||
          (turboActiveMinute
            ? `Fundamentação: ${turboActiveMinute.fundamentacao || ""}\n\nDispositivo: ${turboActiveMinute.dispositivo || ""}`
            : (generationResult?.minute?.fundamentacao || generationResult?.minute?.dispositivo))
        }
        isAuditedProcess={Boolean(auditorActiveProcessNumber || auditorActiveCaseSummary)}
        auditScore={auditorAuditScore}
        auditVerdict={auditorAuditVerdict}
        initialQuery={auditorInitialQuery}
        onClearInitialQuery={() => setAuditorInitialQuery("")}
        onOpenApiKeyConfig={() => setIsApiKeyModalOpen(true)}
        onLoadAnalysis={handleLoadAnalysis}
        onUnlinkProcess={() => {
          setAuditorActiveProcessNumber("");
          setAuditorActiveCaseSummary("");
          setAuditorActiveMinuteSnippet("");
          setAuditorAuditScore(undefined);
          setAuditorAuditVerdict(undefined);
          setAuditorInitialQuery("");
          setTurboActiveMinute(null);
          setProcessNumber("");
          setProcessNumber2ndGrau("");
        }}
      />

    </div>
    </div>
  );
}
