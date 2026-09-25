import React, { useState, useEffect, useMemo } from "react";
import ReactMarkdown from 'react-markdown';
import {
  ShieldCheck,
  X,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Scale,
  Sparkles,
  Search,
  MessageSquare,
  FileCheck2,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Zap,
  Info,
  Edit3,
  Trash2,
  Download,
  UploadCloud,
  Layers,
  BrainCircuit,
  BookmarkPlus,
  Clock,
  User,
  Filter,
  ExternalLink,
  ChevronRight,
  Database,
  Save,
  CheckSquare,
  Activity,
  Award,
  History,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FolderSync,
  GitFork,
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  CheckCheck,
} from "lucide-react";
import {
  AssessorDraftAuditResult,
  UploadedPdf,
  AuditedProcessRecord,
  CustomPrompt,
} from "../types";
import { extractTextFromPdf } from "../utils/pdfExtractor";
import {
  getAudits,
  saveAudit,
  updateAudit,
  deleteAudit,
  clearAllAudits,
  exportAuditsJson,
  importAuditsFromJson,
  subscribeToAudits,
} from "../utils/auditDb";
import { getCabinetTeses, saveCabinetTeses } from "../utils/tesesDb";
import { getParadigmsFromDb, saveParadigmsToDb } from "../lib/firestoreUtils";
import { JudgeParadigmModel } from "../data/defaultParadigms";
import { getApiHeaders, checkUserAiAccess, requestOpenApiKeyModal } from "../utils/apiKeyManager";
import { recordApiExecution } from "../utils/apiUsageTracker";
import { useAuth } from "../lib/AuthContext";
import { TripleConferenceBench } from "./TripleConferenceBench";
import { PdfViewerPane } from "./PdfViewerPane";

export interface ProcessDossierGroup {
  normalizedProcessNumber: string;
  displayProcessNumber: string;
  assessorName: string;
  totalVersions: number;
  latestRecord: AuditedProcessRecord;
  oldestRecord: AuditedProcessRecord;
  records: AuditedProcessRecord[];
  initialScore: number;
  latestScore: number;
  scoreDelta: number;
  hasImprovement: boolean;
}

interface MinuteAuditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProcessText?: string;
  initialPdfs?: UploadedPdf[];
  prompts?: CustomPrompt[];
  activePrompt?: CustomPrompt;
}

export const MinuteAuditorModal: React.FC<MinuteAuditorModalProps> = ({
  isOpen,
  onClose,
  initialProcessText = "",
  initialPdfs = [],
  prompts = [],
  activePrompt: initialActivePrompt,
}) => {
  const { user, userProfile } = useAuth();
  
  const [selectedPrompt, setSelectedPrompt] = useState<CustomPrompt | null>(initialActivePrompt || (prompts.length > 0 ? prompts[0] : null));
  const [systemGeneratedMinute, setSystemGeneratedMinute] = useState<string>("");
  const [isGeneratingIdealMinute, setIsGeneratingIdealMinute] = useState<boolean>(false);
  // Main Navigation Tabs: "bench" (Bancada de Tripla Conferência), "analysis" (Resultado & Análise), "new" (Nova Auditoria), "list" (Processos Auditados), "editor" (Visualizar/Editar Minuta)
  const [mainTab, setMainTab] = useState<"bench" | "analysis" | "new" | "list" | "editor">("bench");

  // Input states
  const [draftText, setDraftText] = useState<string>("");
  const [processNumberInput, setProcessNumberInput] = useState<string>("");
  const [assessorNameInput, setAssessorNameInput] = useState<string>("");
  const [processText, setProcessText] = useState<string>(initialProcessText || "");
  const [pdfFiles, setPdfFiles] = useState<UploadedPdf[]>(initialPdfs || []);
  const [inputMode, setInputMode] = useState<"pdf" | "text">("pdf");
  const [specificInstructions, setSpecificInstructions] = useState<string>("");

  // Execution states
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditStep, setAuditStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active / Selected Audit Record
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AssessorDraftAuditResult | null>(null);
  const [activeAnalysisSubTab, setActiveAnalysisSubTab] = useState<
    "congruence" | "evidentiary" | "procedural" | "feedback" | "correction" | "comparison" | "synopsis"
  >("congruence");
  const [comparisonDraftView, setComparisonDraftView] = useState<"current" | "previous" | "sideBySide">("current");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Audited Processes List & Persistence State
  const [auditedRecords, setAuditedRecords] = useState<AuditedProcessRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterVerdict, setFilterVerdict] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Record<string, boolean>>({});

  // Editing state for selected audited process
  const [editingDraftText, setEditingDraftText] = useState<string>("");
  const [editingJudgeNotes, setEditingJudgeNotes] = useState<string>("");
  const [editingStatus, setEditingStatus] = useState<
    "pendente_correcao" | "corrigido" | "aprovado" | "arquivado"
  >("pendente_correcao");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Re-audit Flow state (Lançar Minuta Corrigida sem novo PDF)
  const [isReAuditModalOpen, setIsReAuditModalOpen] = useState<boolean>(false);
  const [reAuditSourceRecord, setReAuditSourceRecord] = useState<AuditedProcessRecord | null>(null);
  const [reAuditProcNum, setReAuditProcNum] = useState<string>("");
  const [reAuditAssessor, setReAuditAssessor] = useState<string>("");
  const [reAuditDraftText, setReAuditDraftText] = useState<string>("");
  const [reAuditNotes, setReAuditNotes] = useState<string>("");
  const [reAuditProcessText, setReAuditProcessText] = useState<string>("");
  const [reAuditPdfs, setReAuditPdfs] = useState<UploadedPdf[]>([]);
  const [isUploadingReAuditPdf, setIsUploadingReAuditPdf] = useState<boolean>(false);
  const [showAutosEditorInReAudit, setShowAutosEditorInReAudit] = useState<boolean>(false);
  const [isReAuditing, setIsReAuditing] = useState<boolean>(false);
  const [reAuditStep, setReAuditStep] = useState<string>("");
  const [reAuditErrorMessage, setReAuditErrorMessage] = useState<string | null>(null);

  // Sub-Modals: Raio-X & Salvar Tese
  const [isXRayOpen, setIsXRayOpen] = useState<boolean>(false);
  const [isSaveTeseOpen, setIsSaveTeseOpen] = useState<boolean>(false);
  const [teseTitle, setTeseTitle] = useState<string>("");
  const [teseCategory, setTeseCategory] = useState<string>("Geral");
  const [teseContent, setTeseContent] = useState<string>("");
  const [teseTarget, setTeseTarget] = useState<"caderno" | "paradigma">("caderno");
  const [isSavingTese, setIsSavingTese] = useState<boolean>(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ type: 'record' | 'group' | 'all'; id?: string; group?: ProcessDossierGroup } | null>(null);

  // Load audits from DB on open or sync event
  const loadAuditsList = async () => {
    setIsLoadingRecords(true);
    try {
      const list = await getAudits();
      setAuditedRecords(list);
    } catch (err) {
      console.warn("Erro ao carregar lista de auditorias:", err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialProcessText) {
        setProcessText((prev) => prev || initialProcessText);
      }
      if (initialPdfs && initialPdfs.length > 0) {
        setPdfFiles((prev) => (prev.length === 0 ? initialPdfs : prev));
      }
      loadAuditsList();

      // Real-time Firestore subscription for live updates
      const unsub = subscribeToAudits((updatedList) => {
        if (updatedList) {
          setAuditedRecords(updatedList);
        }
      });

      return () => {
        unsub();
      };
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleResetNewAudit = () => {
    setDraftText("");
    setProcessNumberInput("");
    setAssessorNameInput("");
    setProcessText("");
    setPdfFiles([]);
    setSpecificInstructions("");
    setAuditResult(null);
    setCurrentAuditId(null);
    setErrorMessage(null);
    showToast("Formulário de auditoria limpo com sucesso.");
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) continue;

      try {
        const extraction = await extractTextFromPdf(file);
        const newPdf: UploadedPdf = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          mimeType: "application/pdf",
          extractedText: extraction.text,
          pageCount: extraction.pageCount,
          isExtracting: false,
        };
        setPdfFiles((prev) => [...prev, newPdf]);
      } catch (err) {
        console.error("Erro ao extrair PDF no auditor:", err);
      }
    }
  };

  const handleReAuditPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingReAuditPdf(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) continue;

        const extraction = await extractTextFromPdf(file);
        const newPdf: UploadedPdf = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          mimeType: "application/pdf",
          extractedText: extraction.text,
          pageCount: extraction.pageCount,
          isExtracting: false,
        };
        setReAuditPdfs((prev) => [...prev, newPdf]);

        // Auto-extract process number if current is generic
        if (!reAuditProcNum || reAuditProcNum === "Processo Judicial" || reAuditProcNum === "Processo dos Autos") {
          const detected = extractProcessNumberFromText(file.name, [extraction.text]);
          if (detected) setReAuditProcNum(detected);
        }
      }
      showToast("PDF anexado com sucesso para a reauditoria!");
    } catch (err) {
      console.error("Erro ao extrair PDF na reauditoria:", err);
      setReAuditErrorMessage("Erro ao extrair texto do PDF anexado.");
    } finally {
      setIsUploadingReAuditPdf(false);
    }
  };

  const handleRemovePdf = (id: string) => {
    setPdfFiles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleRemoveReAuditPdf = (id: string) => {
    setReAuditPdfs((prev) => prev.filter((p) => p.id !== id));
  };

  const extractProcessNumberFromText = (text?: string, extraTexts: (string | undefined)[] = []): string => {
    const combined = [text, ...extraTexts].filter(Boolean).join("\n");
    if (!combined || combined.trim().length === 0) return "";

    // 1. Padrão CNJ com pontuação e traço: 0000000-00.0000.0.00.0000
    const matchCnj = combined.match(/\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/);
    if (matchCnj) return matchCnj[0];

    // 2. Padrão CNJ com variações de pontos e traços
    const matchCnjVar = combined.match(/\b\d{7}[-.\s]\d{2}[-.\s]\d{4}[-.\s]\d[-.\s]\d{2}[-.\s]\d{4}\b/);
    if (matchCnjVar) {
      const clean = matchCnjVar[0].replace(/\s+/g, "");
      const digits = clean.replace(/\D/g, "");
      if (digits.length === 20) {
        return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
      }
    }

    // 3. Padrão com rótulos explícitos (PROCESSO Nº, AUTOS Nº, PROC., AÇÃO Nº, FEITO Nº, etc.)
    const matchLabel = combined.match(/(?:PROCESSO|AUTOS|PROC\.?|AÇÃO|CNJ|FEITO|REGISTRO)\s*(?:Nº|N|NUMERO|N°|:)?\s*([0-9.\-/]{7,32})/i);
    if (matchLabel && matchLabel[1].trim().length >= 6) {
      return matchLabel[1].trim().replace(/[.,;:]+$/, "");
    }

    // 4. Sequência de 20 dígitos ininterruptos
    const match20 = combined.match(/\b\d{20}\b/);
    if (match20) {
      const d = match20[0];
      return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
    }

    // 5. Padrão antigo de processo com ano
    const matchOld = combined.match(/\b\d{4,7}[-./]\d{2,4}[-./]\d{3,6}\b/);
    if (matchOld) return matchOld[0];

    return "";
  };

  const normalizeProcessNumber = (raw?: string): string => {
    if (!raw) return "sem-numero";
    return raw.replace(/[^0-9a-zA-Z]/g, "").toLowerCase() || "sem-numero";
  };

  // Grouped process dossiers (Unifying records by process lineage, parentAuditId or process number)
  const groupedProcessRecords: ProcessDossierGroup[] = useMemo(() => {
    const familyMap = new Map<string, AuditedProcessRecord[]>();

    // Helper to find root family key for a record
    const getFamilyKey = (r: AuditedProcessRecord): string => {
      // 1. If explicit parent exists, use parent
      if (r.parentAuditId && r.parentAuditId.trim().length > 0) {
        return `parent-${r.parentAuditId.trim()}`;
      }
      // 2. If it has a non-generic process number, use normalized number
      const norm = normalizeProcessNumber(r.processNumber);
      if (
        norm !== "semnumero" &&
        norm !== "processodosautos" &&
        norm !== "processojudicial" &&
        norm !== "processotjgo"
      ) {
        return `proc-${norm}`;
      }
      // 3. Fallback to record ID
      return `id-${r.id}`;
    };

    // First pass: group by family key
    for (const record of auditedRecords) {
      const key = getFamilyKey(record);
      if (!familyMap.has(key)) {
        familyMap.set(key, []);
      }
      familyMap.get(key)!.push(record);
    }

    // Second pass: merge families that share the same real process number
    const mergedMap = new Map<string, AuditedProcessRecord[]>();

    familyMap.forEach((records) => {
      // Check if any record in this group has a real CNJ/specific process number
      const realNumRecord = records.find((r) => {
        const n = normalizeProcessNumber(r.processNumber);
        return (
          n !== "semnumero" &&
          n !== "processodosautos" &&
          n !== "processojudicial" &&
          n !== "processotjgo"
        );
      });

      let finalKey = "";
      if (realNumRecord) {
        finalKey = `proc-${normalizeProcessNumber(realNumRecord.processNumber)}`;
      } else {
        // Find root ancestor
        const rootRecord = records.find((r) => !r.parentAuditId) || records[0];
        finalKey = `root-${rootRecord?.id || records[0]?.id || "unknown"}`;
      }

      if (!mergedMap.has(finalKey)) {
        mergedMap.set(finalKey, []);
      }
      mergedMap.get(finalKey)!.push(...records);
    });

    const groups: ProcessDossierGroup[] = [];

    mergedMap.forEach((rawRecords) => {
      // Deduplicate by record ID
      const uniqueRecordsMap = new Map<string, AuditedProcessRecord>();
      rawRecords.forEach((r) => uniqueRecordsMap.set(r.id, r));
      const records = Array.from(uniqueRecordsMap.values());

      // Sort records descending by version / date (latest first)
      const sorted = [...records].sort((a, b) => {
        const vA = a.version || 1;
        const vB = b.version || 1;
        if (vB !== vA) return vB - vA;
        return (b.date || 0) - (a.date || 0);
      });

      const latest = sorted[0];
      const oldest = sorted[sorted.length - 1];
      const initialScore = oldest.score || 0;
      const latestScore = latest.score || 0;
      const scoreDelta = latestScore - initialScore;

      // Choose the best display process number among all records in the family
      const bestDisplayNum =
        sorted.find((r) => {
          const raw = r.processNumber || "";
          return (
            raw &&
            raw !== "Processo dos Autos" &&
            raw !== "Processo Judicial" &&
            raw !== "Processo TJGO" &&
            /\d{4,}/.test(raw)
          );
        })?.processNumber ||
        latest.processNumber ||
        "Processo Judicial";

      const normKey = normalizeProcessNumber(bestDisplayNum);

      groups.push({
        normalizedProcessNumber: normKey,
        displayProcessNumber: bestDisplayNum,
        assessorName: latest.assessorName || oldest.assessorName || "Assessor(a)",
        totalVersions: sorted.length,
        latestRecord: latest,
        oldestRecord: oldest,
        records: sorted,
        initialScore,
        latestScore,
        scoreDelta,
        hasImprovement: scoreDelta > 0,
      });
    });

    // Sort groups by latest record date descending
    return groups.sort((a, b) => (b.latestRecord.date || 0) - (a.latestRecord.date || 0));
  }, [auditedRecords]);

  // Filtered groups based on search, verdict & status
  const filteredGroups = useMemo(() => {
    return groupedProcessRecords.filter((group) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        group.displayProcessNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.assessorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.records.some(
          (r) =>
            (r.auditResult?.summary || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.judgeNotes || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.correctionNotes || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.creatorName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.creatorEmail || "").toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesVerdict =
        filterVerdict === "all" ||
        (filterVerdict === "emerald" && group.latestScore >= 90) ||
        (filterVerdict === "amber" && group.latestScore >= 70 && group.latestScore < 90) ||
        (filterVerdict === "rose" && group.latestScore < 70);

      const matchesStatus =
        filterStatus === "all" ||
        group.latestRecord.status === filterStatus ||
        group.records.some((r) => r.status === filterStatus);

      return matchesSearch && matchesVerdict && matchesStatus;
    });
  }, [groupedProcessRecords, searchQuery, filterVerdict, filterStatus]);

  // Detect if current input matches an existing audited process in DB
  const existingGroupForCurrentInput = useMemo(() => {
    const currentNum = processNumberInput.trim() || extractProcessNumberFromText(draftText, [processText]);
    if (!currentNum || currentNum === "Processo dos Autos" || currentNum === "Processo Judicial") return null;
    const norm = normalizeProcessNumber(currentNum);
    return groupedProcessRecords.find((g) => g.normalizedProcessNumber === norm) || null;
  }, [processNumberInput, draftText, processText, groupedProcessRecords]);

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroupKeys((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handlePreloadExistingProcessAutos = (group: ProcessDossierGroup) => {
    const source = group.latestRecord;
    if (source.processText) {
      setProcessText(source.processText);
    }
    setProcessNumberInput(source.processNumber);
    setAssessorNameInput(source.assessorName || "");
    showToast(`Autos do processo ${source.processNumber} reaproveitados com sucesso para a nova auditoria!`);
  };

  // GERAÇÃO DA MINUTA GABARITO SOB DEMANDA (Poupando mais de 50% dos tokens na auditoria)
  const handleGenerateIdealMinuteOnDemand = async () => {
    if (isGeneratingIdealMinute) return;
    setIsGeneratingIdealMinute(true);
    showToast("Redigindo minuta gabarito oficial com IA...");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000 * 60 * 10);

      const targetText = processText.trim();
      const sanitizedPdfs = pdfFiles.map((p) => ({
        name: p.name,
        size: p.size,
        pageCount: p.pageCount,
        extractedText: p.extractedText,
      }));

      const detectedProcNum =
        processNumberInput.trim() ||
        extractProcessNumberFromText(draftText, [
          processText,
          ...pdfFiles.map((p) => p.name + "\n" + (p.extractedText || "")),
        ]) ||
        "0000000-00.0000.8.09.0000";

      const response = await fetch("/api/generate-minute", {
        method: "POST",
        headers: getApiHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          processText: targetText,
          pdfFiles: sanitizedPdfs,
          customPromptText: selectedPrompt?.promptText || "",
          actType: "sentenca",
          proceduralPhase: "conhecimento",
          processInfo: {
            processNumber: detectedProcNum,
          },
          specificInstructions: `[DIRETRIZ DE GABARITO DO MAGISTRADO]:
Redija a minuta de sentença definitiva suprindo as omissões e retificando os pontos identificados na auditoria:
${JSON.stringify(auditResult?.criticalAlerts || [])}
${specificInstructions}`
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        let minuteData: any = {};
        try {
          const responseText = await response.text();
          minuteData = JSON.parse(responseText);
        } catch (e) {
          console.warn("Parse error");
        }
        const idealText = minuteData.fullFormattedText || minuteData.minute?.fullFormattedText || minuteData.text;
        if (idealText) {
          setSystemGeneratedMinute(idealText);
          showToast("Minuta gabarito gerada com sucesso!");
          if (currentAuditId) {
            const localList = JSON.parse(localStorage.getItem("assessor_audits_db") || "[]");
            const existingIdx = localList.findIndex((item: any) => item.id === currentAuditId);
            if (existingIdx >= 0) {
              localList[existingIdx].auditResult.systemGeneratedMinute = idealText;
              localStorage.setItem("assessor_audits_db", JSON.stringify(localList));
            }
          }
        } else {
          showToast("Gabarito não retornado pelo modelo.");
        }
      } else {
        showToast("Falha na geração da minuta gabarito.");
      }
    } catch (err: any) {
      console.error("Erro na geração sob demanda:", err);
      showToast(err.message || "Erro na geração do gabarito.");
    } finally {
      setIsGeneratingIdealMinute(false);
    }
  };

  const handleExecuteAudit = async () => {
    const access = checkUserAiAccess(userProfile, user?.email);
    if (!access.canExecute) {
      requestOpenApiKeyModal(access.message);
      setErrorMessage(access.message);
      return;
    }

    if (!draftText.trim()) {
      setErrorMessage("Por favor, insira o texto da minuta elaborada pelo assessor.");
      return;
    }

    const hasPdfs = pdfFiles.length > 0;
    const hasText = processText.trim().length > 30;

    if (!hasPdfs && !hasText) {
      setErrorMessage("Por favor, anexe o PDF do processo ou insira o texto das peças e manifestações dos autos.");
      return;
    }

    setErrorMessage(null);
    setIsAuditing(true);
    setAuditStep("Lendo e confrontando peças processuais dos autos com a minuta...");

    const stepInterval = setInterval(() => {
      setAuditStep((curr) => {
        if (curr.includes("Lendo e confrontando"))
          return "Mapeando pedidos da inicial e teses de defesa (Princípio da Congruência)...";
        if (curr.includes("Mapeando pedidos"))
          return "Verificando se o assessor valorou todos os documentos e provas do PDF...";
        if (curr.includes("Verificando se o assessor"))
          return "Conferindo preliminares, réplica e riscos de nulidade citra petita...";
        return "Calculando pontuação e formulando feedback de orientação para o assessor...";
      });
    }, 1800);

    try {
      // Consolidate full process text (text box + all extracted texts from uploaded PDFs)
      const pdfsExtractedText = pdfFiles
        .filter((p) => p.extractedText && p.extractedText.trim().length > 0)
        .map((p) => `[=== DOCUMENTO/PEÇA DOS AUTOS: ${p.name} ===]\n${p.extractedText}`)
        .join("\n\n---\n\n");

      const fullProcessText = [processText.trim(), pdfsExtractedText].filter(Boolean).join("\n\n---\n\n");

      // 1. Corte Imediato da Duplicação de Autos: envia apenas metadados dos PDFs sem duplicar o texto
      const sanitizedPdfFiles = pdfFiles.map((p) => ({
        name: p.name,
        size: p.size,
        pageCount: p.pageCount,
      }));

      const response = await fetch("/api/audit-assessor-draft", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          draftText,
          processText: fullProcessText || processText,
          pdfFiles: sanitizedPdfFiles,
          specificInstructions,
          customPromptText: selectedPrompt?.promptText || "",
        }),
      });

      if (!response.ok) {
        let errStr = "Falha na requisição de auditoria.";
        try {
          const errText = await response.text();
          const errData = JSON.parse(errText);
          if (errData?.error) errStr = errData.error;
        } catch {}
        throw new Error(errStr);
      }

      let data: AssessorDraftAuditResult & { systemGeneratedMinute?: string };
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("O servidor retornou um formato inválido.");
      }
      setAuditResult(data);
      if (data.systemGeneratedMinute) {
        setSystemGeneratedMinute(data.systemGeneratedMinute);
      }

      // Derive process number and assessor name with multiple fallbacks
      const detectedProcNum =
        processNumberInput.trim() ||
        extractProcessNumberFromText(draftText, [
          processText,
          ...pdfFiles.map((p) => p.name + "\n" + (p.extractedText || "")),
        ]) ||
        "Processo TJGO";

      const detectedAssessor =
        assessorNameInput.trim() || "Assessor(a) do Gabinete";

      // Check existing versions for this process number to unify in history
      const existingGroup = groupedProcessRecords.find(
        (g) => g.normalizedProcessNumber === normalizeProcessNumber(detectedProcNum)
      );
      const nextVersion = existingGroup ? existingGroup.totalVersions + 1 : 1;
      const rootParentId = existingGroup ? existingGroup.oldestRecord.id : undefined;

      // AUTOMATIC PERSISTENCE: Save to Database & LocalStorage with full consolidated process text
      const newAuditRecord: AuditedProcessRecord = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        processNumber: detectedProcNum,
        assessorName: detectedAssessor,
        date: Date.now(),
        score: data.score,
        verdict: data.verdict,
        verdictColor: data.verdictColor,
        processText: fullProcessText || processText,
        assessorDraft: draftText,
        specificDirectives: specificInstructions,
        auditResult: data,
        judgeNotes: "",
        status: data.score >= 90 ? "aprovado" : (nextVersion > 1 ? "corrigido" : "pendente_correcao"),
        pdfFileNames: pdfFiles.map((p) => p.name),
        version: nextVersion,
        versionLabel: nextVersion > 1 ? `Versão ${nextVersion} (Minuta Corrigida)` : `Versão 1 (Original)`,
        parentAuditId: rootParentId,
      };

      await saveAudit(newAuditRecord);
      setCurrentAuditId(newAuditRecord.id);
      setEditingDraftText(draftText);
      setEditingJudgeNotes("");

      setEditingStatus(newAuditRecord.status);

      if (data.usage?.totalTokenCount) {
        recordApiExecution({
          label: `Auditoria: Lupa do Magistrado`,
          processNumber: detectedProcNum,
          model: data.modelUsed || "Gemini Flash",
          promptTokens: data.usage.promptTokenCount,
          outputTokens: data.usage.candidatesTokenCount,
          totalTokens: data.usage.totalTokenCount,
          module: 'lupa_magistrado',
        }).catch((e) => console.warn("Failed to record audit api execution:", e));
      }

      // Geração da minuta ideal em background para otimizar velocidade se não vier direto da auditoria
      const generateIdealMinuteAsync = async () => {
        if (data.systemGeneratedMinute && data.systemGeneratedMinute.trim().length > 50) {
          setSystemGeneratedMinute(data.systemGeneratedMinute);
          return;
        }

        try {
          setSystemGeneratedMinute("Gerando a minuta ideal utilizando a inteligência principal... por favor, aguarde.");
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1000 * 60 * 60 * 24); // 24 horas

          const response = await fetch("/api/generate-minute", {
            method: "POST",
            headers: getApiHeaders(),
            signal: controller.signal,
            body: JSON.stringify({
              processText: fullProcessText,
              pdfFiles: pdfFiles,
              customPromptText: selectedPrompt?.promptText || "",
              actType: "sentenca",
              proceduralPhase: "conhecimento",
              isExpertModeEnabled: true,
              processInfo: {
                processNumber: detectedProcNum,
              },
              specificInstructions: `[DIRETRIZ OBRIGATÓRIA DA AUDITORIA]:
Corrija a minuta do assessor e implemente rigorosamente o que falta, baseando-se nos apontamentos críticos de auditoria e omissões detectadas:
${JSON.stringify(data.criticalAlerts || [])}
${specificInstructions}`
            }),
          });
          clearTimeout(timeoutId);
          if (response.ok) {
             let minuteData: any = {};
             try {
                const responseText = await response.text();
                minuteData = JSON.parse(responseText);
             } catch (e) {
                console.warn("Parse error");
             }
             const idealText = minuteData.fullFormattedText || minuteData.minute?.fullFormattedText || minuteData.text;
             if (idealText) {
                setSystemGeneratedMinute(idealText);
                const localList = JSON.parse(localStorage.getItem("assessor_audits_db") || "[]");
                const existingIdx = localList.findIndex((item: any) => item.id === newAuditRecord.id);
                if (existingIdx >= 0) {
                   localList[existingIdx].auditResult.systemGeneratedMinute = idealText;
                   localStorage.setItem("assessor_audits_db", JSON.stringify(localList));
                }
             } else {
                setSystemGeneratedMinute(data.systemGeneratedMinute || "Minuta gabarito não gerada.");
             }
          } else {
             setSystemGeneratedMinute(data.systemGeneratedMinute || "Erro na geração da minuta ideal.");
          }
        } catch (err) {
          console.error(err);
          setSystemGeneratedMinute(data.systemGeneratedMinute || "Erro na geração da minuta ideal.");
        }
      };
      
      // generateIdealMinuteAsync(); // 2. Desativação da Segunda Chamada em Background: agora sob demanda via handleGenerateIdealMinuteOnDemand

      
      


      // Refresh records list
      loadAuditsList();

      // Switch to Analysis tab automatically
      setMainTab("analysis");
      showToast("Auditoria concluída e gravada com sucesso no banco de dados!");
    } catch (err: any) {
      console.error("Erro na auditoria do juiz:", err);
            const errorMsg = err.message || "Erro ao conectar com o serviço de auditoria.";
      setErrorMessage(errorMsg);
      if (errorMsg.includes("Erro 429") || errorMsg.includes("Limite de requisições") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
         window.dispatchEvent(new CustomEvent("open-api-key-modal", { detail: { message: errorMsg } }));
      }
    } finally {
      clearInterval(stepInterval);
      setIsAuditing(false);
      setAuditStep("");
    }
  };

  // Re-audit Flow: Open dialog to audit a corrected draft without re-uploading PDFs
  const handleStartReAudit = (record: AuditedProcessRecord) => {
    setReAuditSourceRecord(record);

    // 1. Process Number: Auto-heal if generic
    let initialProcNum = (record.processNumber || "").trim();
    if (
      !initialProcNum ||
      initialProcNum === "Processo dos Autos" ||
      initialProcNum === "Processo Judicial" ||
      initialProcNum === "Processo TJGO"
    ) {
      const detected = extractProcessNumberFromText(record.assessorDraft, [
        record.processText,
        ...(record.pdfFileNames || []),
      ]);
      if (detected) initialProcNum = detected;
    }
    setReAuditProcNum(initialProcNum || "Processo Judicial");
    setReAuditAssessor(record.assessorName || "Assessor(a) do Gabinete");
    setReAuditDraftText("");
    setReAuditNotes("");
    setReAuditErrorMessage(null);

    // 2. Discover Autos Process text across all available sources
    let foundAutos = (record.processText || "").trim();
    if (!foundAutos || foundAutos.length < 20) {
      const norm = normalizeProcessNumber(record.processNumber);
      const brother = auditedRecords.find(
        (r) => normalizeProcessNumber(r.processNumber) === norm && r.processText && r.processText.trim().length > 20
      );
      if (brother) {
        foundAutos = brother.processText.trim();
      } else if (processText && processText.trim().length > 20) {
        foundAutos = processText.trim();
      } else if (pdfFiles.some((p) => p.extractedText && p.extractedText.length > 20)) {
        foundAutos = pdfFiles
          .filter((p) => p.extractedText)
          .map((p) => `[=== PEÇA DOS AUTOS: ${p.name} ===]\n${p.extractedText}`)
          .join("\n\n---\n\n");
      }
    }

    setReAuditProcessText(foundAutos);
    setReAuditPdfs([]);
    setShowAutosEditorInReAudit(!foundAutos || foundAutos.length < 20);
    setIsReAuditModalOpen(true);
  };

  const handleExecuteReAudit = async () => {
    if (!reAuditDraftText.trim()) {
      setReAuditErrorMessage("Por favor, cole o texto da nova minuta corrigida pelo assessor.");
      return;
    }

    if (!reAuditSourceRecord) {
      setReAuditErrorMessage("Registro de auditoria de origem não encontrado.");
      return;
    }

    // Auto-detect process number from revised draft if still generic
    let finalProcNum = reAuditProcNum.trim();
    if (
      !finalProcNum ||
      finalProcNum === "Processo Judicial" ||
      finalProcNum === "Processo dos Autos" ||
      finalProcNum === "Processo TJGO"
    ) {
      const detected = extractProcessNumberFromText(reAuditDraftText, [
        reAuditProcessText,
        reAuditSourceRecord.processText,
        reAuditSourceRecord.assessorDraft,
        ...reAuditPdfs.map((p) => p.name + "\n" + (p.extractedText || "")),
      ]);
      if (detected) {
        finalProcNum = detected;
        setReAuditProcNum(detected);
      }
    }

    // Consolidate target process text
    const reAuditPdfsText = reAuditPdfs
      .filter((p) => p.extractedText && p.extractedText.trim().length > 0)
      .map((p) => `[=== DOCUMENTO ANEXADO NA REVISÃO: ${p.name} ===]\n${p.extractedText}`)
      .join("\n\n---\n\n");

    const targetProcessText = [
      reAuditProcessText.trim(),
      reAuditSourceRecord.processText?.trim(),
      processText.trim(),
      reAuditPdfsText,
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");

    if (!targetProcessText || targetProcessText.trim().length < 20) {
      setReAuditErrorMessage(
        "Os autos processuais estão vazios. Por favor, anexe o PDF do processo ou cole as peças na seção de autos abaixo para realizar o confronto probatório."
      );
      setShowAutosEditorInReAudit(true);
      return;
    }

    setReAuditErrorMessage(null);
    setIsReAuditing(true);
    setReAuditStep("Reauditando nova minuta corrigida contra os autos do processo...");

    try {
      const combinedInstructions = [
        reAuditSourceRecord.specificDirectives || "",
        reAuditNotes ? `[NOTAS DESTA CORREÇÃO DO ASSESSOR / DIRETRIZES DA REVISÃO]:\n${reAuditNotes}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      // 1. Corte Imediato da Duplicação de Autos: metadados dos PDFs sem o texto duplicado
      const sanitizedReAuditPdfs = reAuditPdfs.map((p) => ({
        name: p.name,
        size: p.size,
        pageCount: p.pageCount,
      }));

      const response = await fetch("/api/audit-assessor-draft", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          draftText: reAuditDraftText,
          processText: targetProcessText,
          pdfFiles: sanitizedReAuditPdfs,
          specificInstructions: combinedInstructions,
          previousAuditResult: reAuditSourceRecord.auditResult,
          previousDraft: reAuditSourceRecord.assessorDraft,
          assessorCorrectionNotes: reAuditNotes,
        }),
      });

      if (!response.ok) {
        let errStr = "Falha ao processar reauditoria da minuta.";
        try {
          const errText = await response.text();
          const errData = JSON.parse(errText);
          if (errData?.error) errStr = errData.error;
        } catch {}
        throw new Error(errStr);
      }

      let data: AssessorDraftAuditResult;
      try {
        const responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("O servidor retornou um formato inválido ao re-auditar.");
      }

      const rootParentId = reAuditSourceRecord.parentAuditId || reAuditSourceRecord.id;

      // Find matching group to calculate next version
      const existingGroup = groupedProcessRecords.find(
        (g) =>
          g.normalizedProcessNumber === normalizeProcessNumber(finalProcNum || reAuditProcNum) ||
          g.records.some((r) => r.id === rootParentId || r.parentAuditId === rootParentId)
      );
      const nextVersion = existingGroup ? existingGroup.totalVersions + 1 : (reAuditSourceRecord.version || 1) + 1;

      // If the source record had a generic process number and now we have a real CNJ number, update the source record in DB
      if (
        finalProcNum &&
        (reAuditSourceRecord.processNumber === "Processo dos Autos" ||
          reAuditSourceRecord.processNumber === "Processo Judicial" ||
          reAuditSourceRecord.processNumber === "Processo TJGO" ||
          !reAuditSourceRecord.parentAuditId)
      ) {
        try {
          await saveAudit({
            ...reAuditSourceRecord,
            processNumber: finalProcNum || reAuditSourceRecord.processNumber,
            parentAuditId: rootParentId,
          });
        } catch (updateErr) {
          console.warn("Não foi possível atualizar o registro pai com o número CNJ:", updateErr);
        }
      }

      const combinedPdfNames = Array.from(
        new Set([
          ...(reAuditSourceRecord.pdfFileNames || []),
          ...reAuditPdfs.map((p) => p.name),
        ])
      );

      const newAuditRecord: AuditedProcessRecord = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        processNumber: finalProcNum || reAuditProcNum || reAuditSourceRecord.processNumber,
        assessorName: reAuditAssessor || reAuditSourceRecord.assessorName,
        date: Date.now(),
        score: data.score,
        verdict: data.verdict,
        verdictColor: data.verdictColor,
        processText: targetProcessText,
        assessorDraft: reAuditDraftText,
        previousDraft: reAuditSourceRecord.assessorDraft,
        specificDirectives: combinedInstructions,
        auditResult: data,
        judgeNotes: reAuditNotes ? `Notas da correção: ${reAuditNotes}` : (reAuditSourceRecord.judgeNotes || ""),
        status: data.score >= 90 ? "aprovado" : "corrigido",
        pdfFileNames: combinedPdfNames,
        version: nextVersion,
        versionLabel: `Versão ${nextVersion} (Minuta Corrigida)`,
        parentAuditId: rootParentId,
        correctionNotes: reAuditNotes,
        isCorrectionOfId: reAuditSourceRecord.id,
      };

      await saveAudit(newAuditRecord);
      setCurrentAuditId(newAuditRecord.id);
      setAuditResult(data);
      setDraftText(reAuditDraftText);
      setProcessText(targetProcessText);
      setEditingDraftText(reAuditDraftText);
      setEditingJudgeNotes(newAuditRecord.judgeNotes || "");
      setEditingStatus(newAuditRecord.status);
      
      

      await loadAuditsList();
      setIsReAuditModalOpen(false);
      setMainTab("analysis");

      const scoreDiff = data.score - reAuditSourceRecord.score;
      const diffSign = scoreDiff >= 0 ? `+${scoreDiff}` : `${scoreDiff}`;
      showToast(
        `Reauditoria concluída com sucesso! Score evoluiu: ${reAuditSourceRecord.score} ➔ ${data.score} (${diffSign} pts)`
      );

      // Geração da minuta ideal em background para otimizar velocidade
      const generateIdealMinuteReAuditAsync = async (record: AuditedProcessRecord, auditData: AssessorDraftAuditResult) => {
        if (auditData.systemGeneratedMinute && auditData.systemGeneratedMinute.trim().length > 50) {
          setSystemGeneratedMinute(auditData.systemGeneratedMinute);
          return;
        }

        try {
          setSystemGeneratedMinute("Gerando a nova minuta ideal utilizando a inteligência principal... por favor, aguarde.");
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1000 * 60 * 60 * 24); // 24 horas

          const response = await fetch("/api/generate-minute", {
            method: "POST",
            headers: getApiHeaders(),
            signal: controller.signal,
            body: JSON.stringify({
              processText: targetProcessText,
              pdfFiles: reAuditPdfs,
              actType: "sentenca",
              proceduralPhase: "conhecimento",
              isExpertModeEnabled: true,
              processInfo: {
                processNumber: finalProcNum || reAuditProcNum,
              },
              specificInstructions: `[DIRETRIZ OBRIGATÓRIA DE REVISÃO DA MINUTA]:
Corrija a minuta do assessor baseando-se nos seguintes alertas remanescentes da reauditoria (o que ainda precisa ser sanado):
${JSON.stringify(auditData.criticalAlerts || [])}
${reAuditNotes}`
            }),
          });
          clearTimeout(timeoutId);
          if (response.ok) {
             let minuteData: any = {};
             try {
                const responseText = await response.text();
                minuteData = JSON.parse(responseText);
             } catch (e) {
                console.warn("Parse error");
             }
             const idealText = minuteData.fullFormattedText || minuteData.minute?.fullFormattedText || minuteData.text;
             if (idealText) {
                setSystemGeneratedMinute(idealText);
                const localList = JSON.parse(localStorage.getItem("assessor_audits_db") || "[]");
                const existingIdx = localList.findIndex((item: any) => item.id === record.id);
                if (existingIdx >= 0) {
                   localList[existingIdx].auditResult.systemGeneratedMinute = idealText;
                   localStorage.setItem("assessor_audits_db", JSON.stringify(localList));
                }
             } else {
                setSystemGeneratedMinute(auditData.systemGeneratedMinute || "Não foi possível gerar a minuta ideal.");
             }
          } else {
             setSystemGeneratedMinute(auditData.systemGeneratedMinute || "Erro na geração da minuta ideal.");
          }
        } catch (err) {
          console.error(err);
          setSystemGeneratedMinute(auditData.systemGeneratedMinute || "Erro na geração da minuta ideal.");
        }
      };

      // generateIdealMinuteReAuditAsync(newAuditRecord, data); // 2. Desativação da 2ª Chamada: gerado sob demanda
    } catch (err: any) {
      console.error("Erro na reauditoria:", err);
            const errorMsg = err.message || "Erro ao conectar com o serviço de auditoria.";
      setReAuditErrorMessage(errorMsg);
      if (errorMsg.includes("Erro 429") || errorMsg.includes("Limite de requisições") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
         window.dispatchEvent(new CustomEvent("open-api-key-modal", { detail: { message: errorMsg } }));
      }
    } finally {
      setIsReAuditing(false);
      setReAuditStep("");
    }
  };

  const handleSelectRecord = (record: AuditedProcessRecord, targetTab: "bench" | "analysis" = "bench") => {
    setCurrentAuditId(record.id);
    setAuditResult(record.auditResult);
    setDraftText(record.assessorDraft);
    setProcessText(record.processText || "");
    setEditingDraftText(record.assessorDraft);
    setEditingJudgeNotes(record.judgeNotes || "");
    setEditingStatus(record.status || "pendente_correcao");
    setProcessNumberInput(record.processNumber);
    setAssessorNameInput(record.assessorName);
    if (record.auditResult?.systemGeneratedMinute) {
      setSystemGeneratedMinute(record.auditResult.systemGeneratedMinute);
    }
    setMainTab(targetTab);
  };

  const handleOpenEditor = (record?: AuditedProcessRecord) => {
    const target = record || (currentAuditId ? auditedRecords.find((r) => r.id === currentAuditId) : null);
    if (target) {
      setCurrentAuditId(target.id);
      setEditingDraftText(target.assessorDraft);
      setEditingJudgeNotes(target.judgeNotes || "");
      setEditingStatus(target.status || "pendente_correcao");
      setAuditResult(target.auditResult);
    } else if (auditResult) {
      setEditingDraftText(draftText);
    }
    setMainTab("editor");
  };

  const handleSaveAuditEdits = async () => {
    if (!currentAuditId) {
      setErrorMessage("Nenhuma auditoria selecionada para salvar.");
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateAudit(currentAuditId, {
        assessorDraft: editingDraftText,
        judgeNotes: editingJudgeNotes,
        status: editingStatus,
      });

      // Update in-memory state
      setAuditedRecords((prev) =>
        prev.map((r) =>
          r.id === currentAuditId
            ? {
                ...r,
                assessorDraft: editingDraftText,
                judgeNotes: editingJudgeNotes,
                status: editingStatus,
                updatedAt: Date.now(),
              }
            : r
        )
      );

      setDraftText(editingDraftText);
      showToast("Alterações e anotações do Magistrado salvas com sucesso no banco de dados!");
    } catch (err: any) {
      setErrorMessage("Erro ao salvar alterações no banco: " + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleApproveDraft = async () => {
    if (!currentAuditId) {
      // If no audit saved yet, save it first
      setEditingStatus("aprovado");
      showToast("Minuta aprovada pelo Magistrado!");
      return;
    }
    try {
      await updateAudit(currentAuditId, {
        status: "aprovado",
        assessorDraft: editingDraftText || draftText,
        judgeNotes: editingJudgeNotes || "Homologada e aprovada pelo Magistrado.",
      });
      setEditingStatus("aprovado");
      setAuditedRecords((prev) =>
        prev.map((r) =>
          r.id === currentAuditId
            ? { ...r, status: "aprovado", updatedAt: Date.now() }
            : r
        )
      );
      showToast("Minuta homologada e aprovada com sucesso pelo Magistrado!");
    } catch (err: any) {
      setErrorMessage("Erro ao aprovar minuta: " + err.message);
    }
  };

  const handleRejectDraftWithFeedback = async (feedback: string) => {
    if (!currentAuditId) {
      setEditingStatus("pendente_correcao");
      showToast("Orientações registradas com sucesso!");
      return;
    }
    try {
      const updatedNotes = editingJudgeNotes
        ? `${editingJudgeNotes}\n\n[DEVOLUÇÃO]: ${feedback}`
        : `[DEVOLUÇÃO]: ${feedback}`;
      await updateAudit(currentAuditId, {
        status: "pendente_correcao",
        judgeNotes: updatedNotes,
      });
      setEditingStatus("pendente_correcao");
      setEditingJudgeNotes(updatedNotes);
      setAuditedRecords((prev) =>
        prev.map((r) =>
          r.id === currentAuditId
            ? { ...r, status: "pendente_correcao", judgeNotes: updatedNotes, updatedAt: Date.now() }
            : r
        )
      );
      showToast("Minuta devolvida ao assessor com apontamentos e parecer registrado!");
    } catch (err: any) {
      setErrorMessage("Erro ao registrar devolução: " + err.message);
    }
  };

  const handleDeleteRecord = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmTarget({ type: 'record', id });
  };
  const confirmDeleteRecord = async (id: string) => {
    try {
      await deleteAudit(id);
      setAuditedRecords((prev) => prev.filter((r) => r.id !== id));
      if (currentAuditId === id) {
        setCurrentAuditId(null);
        setAuditResult(null);
      }
      showToast("Versão da auditoria excluída com sucesso.");
    } catch (err) {
      console.error("Erro ao excluir auditoria:", err);
    }
  };

  const handleDeleteProcessGroup = async (group: ProcessDossierGroup, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmTarget({ type: 'group', group });
  };
  const confirmDeleteProcessGroup = async (group: ProcessDossierGroup) => {
    try {
      for (const rec of group.records) {
        await deleteAudit(rec.id);
      }
      setAuditedRecords((prev) => prev.filter((r) => !group.records.some((gr) => gr.id === r.id)));
      if (group.records.some((r) => r.id === currentAuditId)) {
        setCurrentAuditId(null);
        setAuditResult(null);
      }
      showToast(`Histórico completo do processo ${group.displayProcessNumber} excluído com sucesso.`);
    } catch (err) {
      console.error("Erro ao excluir histórico do processo:", err);
    }
  };

  const handleClearAllRecords = async () => {
    try {
      await clearAllAudits();
      setAuditedRecords([]);
      setCurrentAuditId(null);
      setAuditResult(null);
      showToast("Todo o histórico de processos auditados foi excluído.");
    } catch (err) {
      console.error("Erro ao limpar auditorias:", err);
    }
  };

  const handleOpenSaveTeseModal = (defaultText?: string, defaultTitle?: string) => {
    const fullDraft = (editingDraftText || draftText || "").trim();
    
    // Auto-detect category
    const textToCheck = (fullDraft + " " + (defaultTitle || "") + " " + (auditResult?.summary || "")).toLowerCase();
    let detectedCategory = "Direito do Consumidor";
    if (textToCheck.includes("inss") || textToCheck.includes("benefício") || textToCheck.includes("incapacidade") || textToCheck.includes("previdenciár") || textToCheck.includes("auxílio")) {
      detectedCategory = "Direito Previdenciário";
    } else if (textToCheck.includes("banco") || textToCheck.includes("empréstimo") || textToCheck.includes("rmc") || textToCheck.includes("rcc") || textToCheck.includes("cartão de crédito")) {
      detectedCategory = "Direito Bancário (RMC/RCC/Empréstimos)";
    } else if (textToCheck.includes("fazenda pública") || textToCheck.includes("município") || textToCheck.includes("estado") || textToCheck.includes("servidor")) {
      detectedCategory = "Fazenda Pública";
    } else if (textToCheck.includes("família") || textToCheck.includes("alimentos") || textToCheck.includes("guarda") || textToCheck.includes("divórcio")) {
      detectedCategory = "Direito de Família";
    }

    setTeseTitle(
      defaultTitle ||
        (auditResult ? `Tese: ${auditResult.congruence?.items?.[0]?.request || "Decisão do Gabinete"}`.slice(0, 60) : "Nova Tese do Gabinete")
    );
    setTeseCategory(detectedCategory);
    
    // Priority: Complete minuta draft text as requested by user
    setTeseContent(
      fullDraft ||
        defaultText ||
        auditResult?.suggestedCorrectionSnippet ||
        auditResult?.summary ||
        ""
    );
    setTeseTarget("paradigma");
    setIsSaveTeseOpen(true);
  };

  const handleSaveTeseSubmit = async () => {
    if (!teseContent.trim()) {
      alert("Por favor, insira o texto da fundamentação/tese.");
      return;
    }
    setIsSavingTese(true);
    try {
      if (teseTarget === "caderno") {
        const current = await getCabinetTeses();
        const separator = `\n\n══════════════════════════════════════════════════════════════════\n[TESE AUDITADA • ${teseTitle.toUpperCase()} • ${teseCategory.toUpperCase()}]\n══════════════════════════════════════════════════════════════════\n${teseContent.trim()}\n`;
        const newText = (current.text || "") + separator;
        await saveCabinetTeses({
          ...current,
          text: newText,
          isEnabled: true,
        });
        showToast("Tese adicionada com sucesso ao Caderno de Teses do Gabinete!");
      } else {
        const existingParadigms = (await getParadigmsFromDb()) || [];
        const newParadigm: JudgeParadigmModel = {
          id: `paradigm-${Date.now()}`,
          title: teseTitle.trim() || "Minuta Paradigma Auditada",
          category: teseCategory || "Geral",
          decisionType: "procedencia",
          fullText: teseContent.trim(),
          summary: `Tese extraída da Auditoria do Juiz (${new Date().toLocaleDateString("pt-BR")})`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await saveParadigmsToDb([newParadigm, ...existingParadigms]);
        showToast("Minuta Paradigma cadastrada com sucesso nas Minutas do Juiz!");
      }
      setIsSaveTeseOpen(false);
    } catch (err: any) {
      alert("Erro ao salvar tese: " + err.message);
    } finally {
      setIsSavingTese(false);
    }
  };

  const getVerdictBadgeClass = (verdictColor?: string) => {
    switch (verdictColor) {
      case "emerald":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
      case "amber":
        return "bg-amber-500/20 text-amber-300 border-amber-500/50";
      case "rose":
        return "bg-rose-500/20 text-rose-300 border-rose-500/50";
      case "indigo":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/50";
      default:
        return "bg-amber-500/20 text-amber-300 border-amber-500/50";
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "aprovado":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Aprovado
          </span>
        );
      case "corrigido":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
            <Check className="w-3 h-3" /> Minuta Corrigida
          </span>
        );
      case "arquivado":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-1">
            Arquivado
          </span>
        );
      case "pendente_correcao":
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Pendente de Correção
          </span>
        );
    }
  };

  // Filtered audited records
  const filteredRecords = useMemo(() => {
    return auditedRecords.filter((r) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        r.processNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.assessorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.auditResult?.summary || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.judgeNotes || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesVerdict =
        filterVerdict === "all" ||
        (filterVerdict === "emerald" && r.score >= 90) ||
        (filterVerdict === "amber" && r.score >= 70 && r.score < 90) ||
        (filterVerdict === "rose" && r.score < 70);

      const matchesStatus = filterStatus === "all" || r.status === filterStatus;

      return matchesSearch && matchesVerdict && matchesStatus;
    });
  }, [auditedRecords, searchQuery, filterVerdict, filterStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* MODAL HEADER: Gold Luxury Bar */}
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 px-5 py-3.5 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                  Lupa do Magistrado & Auditor de Minutas
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black tracking-wider uppercase shadow-xs">
                  FUNÇÃO DE OURO (JUIZ)
                </span>
              </div>
              <p className="text-xs text-amber-200/80 font-medium">
                Auditoria de conformidade fático-probatória, congruência de pedidos e gestão de minutas salvas no banco.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {auditResult && (
              <button
                onClick={() => setIsXRayOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/40 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Visualizar Raio-X de tokens e inferência da auditoria"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                <span>Raio-X</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Fechar auditoria"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOP LEVEL NAVIGATION TABS */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Botão de Destaque da Bancada de Tripla Conferência */}
            <button
              onClick={() => setMainTab("bench")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer border ${
                mainTab === "bench"
                  ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30"
                  : "bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/60"
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Bancada de Tripla Conferência</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                mainTab === "bench" ? "bg-slate-950 text-amber-300" : "bg-slate-950/80 text-amber-400"
              }`}>
                Juiz & PDF
              </span>
            </button>

            <button
              onClick={() => setMainTab("new")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                mainTab === "new"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Nova Auditoria</span>
            </button>

            <button
              onClick={() => setMainTab("list")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                mainTab === "list"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Processos Auditados</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                mainTab === "list" ? "bg-slate-950 text-amber-400" : "bg-slate-800 text-slate-300"
              }`}>
                {auditedRecords.length}
              </span>
            </button>

            {auditResult && (
              <>
                <button
                  onClick={() => setMainTab("analysis")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    mainTab === "analysis"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Resultado & Análise</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    auditResult.score >= 90 ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-300"
                  }`}>
                    {auditResult.score}/100
                  </span>
                </button>

                <button
                  onClick={() => handleOpenEditor()}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    mainTab === "editor"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Visualizar & Editar Minuta</span>
                </button>
              </>
            )}
          </div>

          {/* Quick Action Tools on Header */}
          {auditResult && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenSaveTeseModal()}
                className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Salvar fundamentação auditada no Caderno de Teses do Gabinete"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Salvar Tese</span>
              </button>

              <button
                onClick={() => handleCopyText(auditResult.assessorFeedbackMessage, "headerFeedback")}
                className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Copiar feedback pedagógico para envio ao assessor no WhatsApp"
              >
                {copiedSection === "headerFeedback" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{copiedSection === "headerFeedback" ? "Copiado!" : "WhatsApp"}</span>
              </button>
            </div>
          )}
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Toast / Success Message */}
          {successMessage && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 0: BANCADA DE TRIPLA CONFERÊNCIA (JUIZ, PDF, GABARITO & ASSESSOR)     */}
          {/* ========================================================================= */}
          {mainTab === "bench" && (
            <div className="space-y-4">
              {(!draftText && !processText && pdfFiles.length === 0 && !auditResult) ? (
                <div className="p-8 bg-slate-950/80 border border-slate-800 rounded-2xl text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mx-auto flex items-center justify-center">
                    <Scale className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className="text-base font-bold text-white">Nenhum processo carregado na bancada</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Selecione um processo auditado no histórico de processos ou inicie uma nova conferência com a minuta pré-analisada pelo assessor e o PDF dos autos.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setMainTab("new")}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Inserir Nova Pré-Análise / PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainTab("list")}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>Abrir do Histórico ({auditedRecords.length})</span>
                    </button>
                  </div>
                </div>
              ) : (
                <TripleConferenceBench
                  pdfFiles={pdfFiles}
                  processText={processText}
                  systemGeneratedMinute={systemGeneratedMinute || auditResult?.systemGeneratedMinute || ""}
                  assessorDraftText={editingDraftText || draftText}
                  auditResult={auditResult}
                  currentRecord={auditedRecords.find((r) => r.id === currentAuditId) || null}
                  onUpdateDraftText={(txt) => {
                    setEditingDraftText(txt);
                    setDraftText(txt);
                  }}
                  onSaveAuditEdits={handleSaveAuditEdits}
                  onApproveDraft={handleApproveDraft}
                  onRejectDraftWithFeedback={handleRejectDraftWithFeedback}
                  onOpenSaveTeseModal={handleOpenSaveTeseModal}
                  onStartReAudit={() => {
                    const rec = auditedRecords.find((r) => r.id === currentAuditId);
                    if (rec) handleStartReAudit(rec);
                  }}
                  onGenerateIdealMinute={handleGenerateIdealMinuteOnDemand}
                  isGeneratingIdealMinute={isGeneratingIdealMinute}
                  isSaving={isSavingEdit}
                />
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: NOVA AUDITORIA (FORMULÁRIO DE ENTRADA)                             */}
          {/* ========================================================================= */}
          {mainTab === "new" && (
            <div className="space-y-5">
              
              {/* Informative Header Banner with Quick Reset */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    Insira a minuta e os autos. O sistema executará o confronto fático-probatório estrito, checagem de congruência de pedidos e salvará o relatório no banco.
                  </span>
                </div>
                {(draftText || processText || pdfFiles.length > 0 || processNumberInput || assessorNameInput) && (
                  <button
                    type="button"
                    onClick={handleResetNewAudit}
                    className="px-2.5 py-1 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition flex items-center gap-1.5 shrink-0 self-end sm:self-auto cursor-pointer border border-slate-600"
                    title="Limpar formulário atual para novo processo"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Limpar Formulário</span>
                  </button>
                )}
              </div>

              {/* Prompt Selection for the Ideal System Minute Generation */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="px-3 py-2.5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Diretriz Padrão (Prompt)</h3>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-[11px] text-slate-400 mb-2">
                    Selecione a instrução de base para a inteligência artificial. O sistema vai usá-la para gerar a <strong>Minuta Ideal do Magistrado</strong> para comparação visual na etapa de edição, replicando a exata dinâmica da análise de processos.
                  </p>
                  <select
                    value={selectedPrompt?.id || ""}
                    onChange={(e) => {
                      const p = prompts.find(p => p.id === e.target.value);
                      if (p) setSelectedPrompt(p);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-amber-500"
                  >
                    {prompts.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Identification Inputs: Process Number & Assessor Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    Número do Processo (Opcional - detecta automático)
                  </label>
                  <input
                    type="text"
                    value={processNumberInput}
                    onChange={(e) => setProcessNumberInput(e.target.value)}
                    placeholder="Ex: 5012345-88.2026.8.09.0051"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    Nome do(a) Assessor(a) (Opcional)
                  </label>
                  <input
                    type="text"
                    value={assessorNameInput}
                    onChange={(e) => setAssessorNameInput(e.target.value)}
                    placeholder="Ex: Assessor Dr. João / Gabinete 1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* SMART BANNER: DETECTS IF THIS PROCESS ALREADY EXISTS IN DB TO REUSE AUTOS */}
              {existingGroupForCurrentInput && pdfFiles.length === 0 && processText.trim().length === 0 && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <FolderSync className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-300 font-bold block">
                        Processo já cadastrado no banco ({existingGroupForCurrentInput.totalVersions} {existingGroupForCurrentInput.totalVersions === 1 ? "versão gravada" : "versões gravadas"}):
                      </strong>
                      <span className="text-slate-300 text-[11px] leading-relaxed">
                        Encontramos os autos salvos de <strong>{existingGroupForCurrentInput.displayProcessNumber}</strong>. Deseja reaproveitar o acervo probatório sem precisar fazer upload de novo PDF?
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePreloadExistingProcessAutos(existingGroupForCurrentInput)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shrink-0 self-end sm:self-auto cursor-pointer shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-slate-950" />
                    <span>⚡ Reaproveitar Autos e Auditar como Nova Versão</span>
                  </button>
                </div>
              )}

              {/* DRAFT TEXT & PROCESS INPUT (SIDE BY SIDE ON DESKTOP) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* COLUMN 1: DRAFT FROM ASSESSOR */}
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-amber-400" />
                      1. Minuta Elaborada pelo Assessor (Texto)
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {draftText.length} caracteres
                    </span>
                  </div>

                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="Cole aqui o texto corrido da minuta judicial (relatório, fundamentação e dispositivo) que o assessor redigiu..."
                    className="w-full flex-1 min-h-[300px] p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 shadow-inner resize-y leading-relaxed"
                  />
                </div>

                {/* COLUMN 2: PROCESS RECORDS (PDF OR TEXT) */}
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      2. Autos do Processo (PDF Oficial ou Texto)
                    </label>

                    <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-700">
                      <button
                        onClick={() => setInputMode("pdf")}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                          inputMode === "pdf" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Upload PDF
                      </button>
                      <button
                        onClick={() => setInputMode("text")}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                          inputMode === "text" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Colar Texto
                      </button>
                    </div>
                  </div>

                  {inputMode === "pdf" ? (
                    <div className="flex-1 min-h-[300px] flex flex-col justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl p-6 hover:border-emerald-500/60 transition group cursor-pointer relative">
                        <input
                          type="file"
                          accept=".pdf"
                          multiple
                          onChange={handlePdfUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-emerald-400 transition mb-2" />
                        <span className="text-xs font-bold text-slate-200 text-center">
                          Clique ou arraste o PDF oficial dos autos
                        </span>
                        <span className="text-[11px] text-slate-400 text-center mt-1">
                          A IA lerá petições, contestações, réplicas, certidões e comprovantes probatórios.
                        </span>
                      </div>

                      {/* PDF Files List */}
                      {pdfFiles.length > 0 && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {pdfFiles.map((pdf) => (
                            <div
                              key={pdf.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate text-slate-200">{pdf.name}</span>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  ({pdf.pageCount || 1} págs)
                                </span>
                              </div>
                              <button
                                onClick={() => handleRemovePdf(pdf.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                title="Remover PDF"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={processText}
                      onChange={(e) => setProcessText(e.target.value)}
                      placeholder="Cole aqui o texto dos autos, inicial, contestação, manifestações e lista de eventos probatórios..."
                      className="w-full flex-1 min-h-[300px] p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 shadow-inner resize-y leading-relaxed"
                    />
                  )}
                </div>

              </div>

              {/* SPECIFIC INSTRUCTIONS / POINT OF ATTENTION FOR THE JUDGE */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  Diretriz ou Ponto de Atenção Específico do Juiz (Opcional)
                </label>
                <input
                  type="text"
                  value={specificInstructions}
                  onChange={(e) => setSpecificInstructions(e.target.value)}
                  placeholder="Ex: Verificar com rigor se o assessor observou a preliminar de ilegitimidade passiva e o comprovante de TED do evento 15..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetNewAudit}
                  disabled={isAuditing}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Limpar todos os campos, minuta, autos e PDFs para cadastrar uma nova auditoria"
                >
                  <Trash2 className="w-4 h-4 text-slate-400" />
                  <span>Limpar Tudo (Novo Cadastro)</span>
                </button>

                <button
                  onClick={handleExecuteAudit}
                  disabled={isAuditing}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black rounded-xl text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAuditing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>{auditStep || "Auditando minuta do assessor..."}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 text-slate-950" />
                      <span>Auditar Minuta com Rigor do Magistrado</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PROCESSOS AUDITADOS (HISTÓRICO & BANCO DE DADOS)                   */}
          {/* ========================================================================= */}
          {mainTab === "list" && (
            <div className="space-y-4">
              
              {/* Search & Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por processo, assessor, resumo da auditoria ou anotação do juiz..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Verdict Filter */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 text-xs">
                    <Filter className="w-3 h-3 text-slate-400 ml-1" />
                    <select
                      value={filterVerdict}
                      onChange={(e) => setFilterVerdict(e.target.value)}
                      className="bg-transparent text-slate-300 text-xs focus:outline-hidden cursor-pointer"
                    >
                      <option value="all">Todas as Notas</option>
                      <option value="emerald">90-100 (Aprovadas)</option>
                      <option value="amber">70-89 (Com Ressalvas)</option>
                      <option value="rose">&lt; 70 (Correção Obrigatória)</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 text-xs">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-transparent text-slate-300 text-xs focus:outline-hidden cursor-pointer"
                    >
                      <option value="all">Todos os Status</option>
                      <option value="pendente_correcao">Pendente de Correção</option>
                      <option value="corrigido">Minuta Corrigida</option>
                      <option value="aprovado">Aprovado</option>
                      <option value="arquivado">Arquivado</option>
                    </select>
                  </div>

                  {/* Export / Import */}
                  <button
                    onClick={() => exportAuditsJson(auditedRecords)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Exportar backup das auditorias em JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Exportar</span>
                  </button>

                  {auditedRecords.length > 0 && (
                    <button
                      onClick={async () => {
                        setDeleteConfirmTarget({ type: 'all' });
                      }}
                      className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Limpar histórico de auditorias"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Records List / Grid - UNIFIED PROCESS DOSSIERS */}
              {isLoadingRecords ? (
                <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  <span className="text-xs">Carregando processos auditados do banco de dados...</span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800">
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-500">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">Nenhum processo auditado encontrado</h4>
                  <p className="text-xs text-slate-500 max-w-md">
                    {searchQuery
                      ? "Nenhum resultado corresponde à busca informada."
                      : "Execute a primeira auditoria na aba 'Nova Auditoria' para que todas as revisões fiquem unificadas por processo e gravadas no banco de dados."}
                  </p>
                  <button
                    onClick={() => setMainTab("new")}
                    className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    Iniciar Nova Auditoria
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredGroups.map((group) => {
                    const latest = group.latestRecord;
                    const isSelected = currentAuditId === latest.id;
                    const isExpanded = !!expandedGroupKeys[group.normalizedProcessNumber];

                    return (
                      <div
                        key={group.normalizedProcessNumber}
                        className={`rounded-2xl border transition overflow-hidden ${
                          isSelected
                            ? "bg-slate-900/90 border-amber-500/60 shadow-lg shadow-amber-500/5"
                            : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {/* MAIN DOSSIER CARD */}
                        <div
                          onClick={() => handleSelectRecord(latest)}
                          className="p-4 sm:p-5 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-black text-white text-sm sm:text-base tracking-wide flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                                {group.displayProcessNumber}
                              </span>

                              {/* Version Count Badge */}
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-amber-300 border border-slate-700 flex items-center gap-1">
                                <GitFork className="w-3 h-3 text-amber-400" />
                                {group.totalVersions === 1
                                  ? "1 Versão (Original)"
                                  : `${group.totalVersions} Versões no Histórico`}
                              </span>

                              {/* Score Progression Badge (if multiple versions) */}
                              {group.totalVersions > 1 && (
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider flex items-center gap-1 border ${
                                    group.scoreDelta > 0
                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                      : group.scoreDelta === 0
                                      ? "bg-slate-800 text-slate-300 border-slate-700"
                                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                  }`}
                                  title={`Evolução da nota entre a versão inicial (${group.initialScore}) e a versão mais recente (${group.latestScore})`}
                                >
                                  <TrendingUp className="w-3 h-3" />
                                  <span>
                                    Score: {group.initialScore} ➔ {group.latestScore}
                                    {group.scoreDelta > 0 ? ` (+${group.scoreDelta} pts)` : ""}
                                  </span>
                                </span>
                              )}

                              {/* Latest Verdict Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getVerdictBadgeClass(
                                  latest.verdictColor
                                )}`}
                              >
                                {latest.verdict} ({latest.score}/100)
                              </span>

                              {/* Latest Status */}
                              {getStatusBadge(latest.status)}
                            </div>

                            {/* Meta information */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span className="flex items-center gap-1 text-slate-300">
                                <User className="w-3.5 h-3.5 text-amber-400" />
                                {group.assessorName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                Última revisão:{" "}
                                {new Date(latest.date).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {latest.pdfFileNames && latest.pdfFileNames.length > 0 && (
                                <span className="flex items-center gap-1 text-emerald-400">
                                  <FileText className="w-3.5 h-3.5" />
                                  {latest.pdfFileNames.length} PDF(s) anexados
                                </span>
                              )}
                            </div>

                            {/* Summary of latest audit */}
                            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                              {latest.auditResult?.summary || "Auditoria fático-probatória realizada com sucesso."}
                            </p>

                            {/* Notes from judge or correction notes */}
                            {latest.correctionNotes && (
                              <div className="text-[11px] text-cyan-200/90 bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-500/30 flex items-center gap-1.5 mt-1">
                                <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                                <span className="truncate">
                                  <strong>Notas da Correção:</strong> {latest.correctionNotes}
                                </span>
                              </div>
                            )}

                            {latest.judgeNotes && !latest.correctionNotes && (
                              <div className="text-[11px] text-amber-200/90 bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-500/30 flex items-center gap-1.5 mt-1">
                                <Edit3 className="w-3 h-3 text-amber-400 shrink-0" />
                                <span className="truncate">
                                  <strong>Anotação do Juiz:</strong> {latest.judgeNotes}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Actions on Dossier Card */}
                          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0 self-start lg:self-center">
                            
                            {/* Primary Button: Re-audit corrected draft */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartReAudit(latest);
                              }}
                              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                              title="Lançar nova minuta corrigida pelo assessor sem precisar reenviar os PDFs"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-white" />
                              <span>Lançar Minuta Corrigida</span>
                            </button>

                            {/* View Analysis */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRecord(latest);
                              }}
                              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer"
                              title="Abrir relatório analítico da auditoria mais recente"
                            >
                              <span>Ver Análise</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>

                            {/* Editor */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditor(latest);
                              }}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs transition cursor-pointer"
                              title="Visualizar e editar minuta no banco de dados"
                            >
                              <Edit3 className="w-4 h-4 text-slate-300" />
                            </button>

                            {/* WhatsApp */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(latest.auditResult?.assessorFeedbackMessage || "", `card-${latest.id}`);
                              }}
                              className="p-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs transition cursor-pointer"
                              title="Copiar mensagem para WhatsApp do assessor"
                            >
                              {copiedSection === `card-${latest.id}` ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <MessageSquare className="w-4 h-4" />
                              )}
                            </button>

                            {/* Toggle Version History Drawer */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroupExpansion(group.normalizedProcessNumber);
                              }}
                              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                                isExpanded
                                  ? "bg-slate-800 text-amber-400 border-amber-500/40"
                                  : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                              }`}
                              title="Visualizar histórico completo de versões desta auditoria"
                            >
                              <History className="w-3.5 h-3.5 text-amber-400" />
                              <span>{group.totalVersions}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Delete Group */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteProcessGroup(group, e)}
                              className="p-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-xl text-xs transition cursor-pointer"
                              title="Excluir todo o histórico deste processo do banco"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* EXPANDED TIMELINE: ALL VERSIONS FOR THIS PROCESS */}
                        {isExpanded && (
                          <div className="border-t border-slate-800 bg-slate-950/90 p-4 sm:p-5 space-y-3 animate-in fade-in">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <History className="w-4 h-4 text-amber-400" />
                                Histórico de Evolução & Versões do Processo {group.displayProcessNumber}
                              </h5>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Total: {group.records.length} versão(ões)
                              </span>
                            </div>

                            <div className="space-y-2.5">
                              {group.records.map((rec, idx) => {
                                const isCurrentActive = currentAuditId === rec.id;
                                const versionNum = rec.version || (group.records.length - idx);

                                return (
                                  <div
                                    key={rec.id}
                                    onClick={() => handleSelectRecord(rec)}
                                    className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                      isCurrentActive
                                        ? "bg-slate-800/90 border-amber-500/50"
                                        : "bg-slate-900/60 border-slate-800 hover:bg-slate-850 hover:border-slate-700"
                                    }`}
                                  >
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                                          Versão {versionNum} {idx === 0 ? "(Mais Recente)" : idx === group.records.length - 1 ? "(Original)" : "(Revisão)"}
                                        </span>

                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getVerdictBadgeClass(
                                            rec.verdictColor
                                          )}`}
                                        >
                                          {rec.verdict} ({rec.score}/100)
                                        </span>

                                        {getStatusBadge(rec.status)}

                                        <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto md:ml-0">
                                          <Clock className="w-3 h-3 text-slate-500" />
                                          {new Date(rec.date).toLocaleDateString("pt-BR", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>

                                      {rec.correctionNotes && (
                                        <p className="text-xs text-cyan-300/90 font-medium">
                                          <strong>Motivo / Nota da Correção:</strong> {rec.correctionNotes}
                                        </p>
                                      )}

                                      <p className="text-xs text-slate-400 line-clamp-2">
                                        {rec.auditResult?.summary || "Resumo da auditoria desta versão."}
                                      </p>
                                    </div>

                                    {/* Action Buttons for this specific version */}
                                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectRecord(rec);
                                        }}
                                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
                                      >
                                        Ver Análise
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditor(rec);
                                        }}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                                        title="Editar minuta desta versão"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyText(rec.auditResult?.assessorFeedbackMessage || "", `rec-${rec.id}`);
                                        }}
                                        className="p-1.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs"
                                        title="Copiar WhatsApp"
                                      >
                                        {copiedSection === `rec-${rec.id}` ? <Check className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteRecord(rec.id, e)}
                                        className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-lg text-xs"
                                        title="Excluir apenas esta versão"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: RESULTADO & ANÁLISE DETALHADA                                      */}
          {/* ========================================================================= */}
          {mainTab === "analysis" && auditResult && (
            <div className="space-y-6">
              
              {/* SCORE CARD & VERDICT BANNER */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-amber-500/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                
                {/* Score Gauge */}
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-2xl bg-slate-950 border-2 border-amber-500 flex flex-col items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                    <span className="text-2xl font-black text-white">{auditResult.score}</span>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">SCORE</span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border tracking-wider ${getVerdictBadgeClass(auditResult.verdictColor)}`}>
                        {auditResult.verdict}
                      </span>
                      {currentAuditId && (
                        getStatusBadge(auditedRecords.find((r) => r.id === currentAuditId)?.status)
                      )}
                      {auditResult.deduplicationStats && auditResult.deduplicationStats.duplicatesFound > 0 && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1" title={`${auditResult.deduplicationStats.duplicatesFound} documentos idênticos consolidados para economia de tokens sem perda de fatos.`}>
                          <Zap className="w-3 h-3 text-emerald-400" />
                          {auditResult.deduplicationStats.duplicatesFound} deduplicados (-{Math.round(auditResult.deduplicationStats.charsSaved / 4)} tokens)
                        </span>
                      )}
                      {auditResult.holisticSynopsis && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1" title="Sinopse Holística dos Autos em 5 pilares estruturada para embasamento da auditoria">
                          <BookOpen className="w-3 h-3 text-amber-400" />
                          Sinopse Holística (5 Pilares)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                      {auditResult.summary}
                    </p>
                  </div>
                </div>

                {/* Sub-Scores & Action Button */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                  <div className="grid grid-cols-3 gap-2 w-full sm:w-auto shrink-0">
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">Adstrição</span>
                      <span className="text-base font-black text-amber-400">{auditResult.congruence?.score || 0}%</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">Provas</span>
                      <span className="text-base font-black text-emerald-400">{auditResult.evidentiary?.score || 0}%</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">Rito</span>
                      <span className="text-base font-black text-indigo-400">{auditResult.procedural?.score || 0}%</span>
                    </div>
                  </div>

                  {currentAuditId && (
                    <button
                      type="button"
                      onClick={() => {
                        const rec = auditedRecords.find((r) => r.id === currentAuditId);
                        if (rec) handleStartReAudit(rec);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 shrink-0"
                      title="Lançar nova minuta corrigida pelo assessor para este mesmo processo"
                    >
                      <RefreshCw className="w-4 h-4 text-white" />
                      <span>Lançar Minuta Corrigida</span>
                    </button>
                  )}
                </div>

              </div>

              {/* COMPARISON BANNER IF RE-AUDITED OR COMPARISON AVAILABLE */}
              {(auditResult.comparison || (auditedRecords.find((r) => r.id === currentAuditId)?.version || 1) > 1) && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/80 via-indigo-950/60 to-slate-900 border border-blue-500/40 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                      <GitCompare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-blue-300">
                          Minuta Corrigida pelo Assessor
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-500/30 text-[10px] font-bold">
                          Versão {auditedRecords.find((r) => r.id === currentAuditId)?.version || "Revisada"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                        {auditResult.comparison?.executiveCorrectionSummary ||
                          "Esta auditoria compara a nova redação corrigida pelo assessor com a versão anterior do processo, avaliando o saneamento dos alertas e a segurança jurídica."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    {auditResult.comparison?.scoreDelta !== undefined && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Evolução do Score</span>
                        <span
                          className={`text-sm font-black flex items-center gap-1 ${
                            auditResult.comparison.scoreDelta >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {auditResult.comparison.scoreDelta >= 0 ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          {auditResult.comparison.previousScore} ➔ {auditResult.score} (
                          {auditResult.comparison.scoreDelta >= 0
                            ? `+${auditResult.comparison.scoreDelta}`
                            : auditResult.comparison.scoreDelta}{" "}
                          pts)
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveAnalysisSubTab("comparison")}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                      <span>Ver Comparativo Antes vs Depois</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CRITICAL ALERTS BANNER (IF ANY) */}
              {auditResult.criticalAlerts && auditResult.criticalAlerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    Alertas Críticos & Riscos de Nulidade
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {auditResult.criticalAlerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                          alert.type === "danger"
                            ? "bg-rose-950/50 border-rose-500/60 text-rose-200"
                            : alert.type === "warning"
                            ? "bg-amber-950/50 border-amber-500/60 text-amber-200"
                            : "bg-blue-950/50 border-blue-500/60 text-blue-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-white">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{alert.title}</span>
                        </div>
                        <p className="text-xs opacity-90 leading-relaxed">{alert.description}</p>
                        {alert.recommendation && (
                          <div className="pt-1 text-[11px] font-semibold text-amber-300">
                            <strong>Orientação ao Assessor:</strong> {alert.recommendation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ANALYSIS SUB-TABS */}
              <div className="border-b border-slate-800 flex flex-wrap gap-2">
                {/* Comparativo Antes vs Depois Tab Button (Highlight) */}
                {(auditResult.comparison || (auditedRecords.find((r) => r.id === currentAuditId)?.version || 1) > 1) && (
                  <button
                    onClick={() => setActiveAnalysisSubTab("comparison")}
                    className={`px-3.5 py-2 rounded-t-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                      activeAnalysisSubTab === "comparison"
                        ? "bg-slate-800 text-blue-400 border-t-2 border-blue-400 shadow-sm"
                        : "text-blue-300/90 hover:text-white bg-blue-950/40"
                    }`}
                  >
                    <GitCompare className="w-3.5 h-3.5 text-blue-400" />
                    <span>Evolução & Comparativo (Antes vs Depois)</span>
                    {auditResult.comparison?.scoreDelta !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                          auditResult.comparison.scoreDelta >= 0
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        }`}
                      >
                        {auditResult.comparison.scoreDelta >= 0
                          ? `+${auditResult.comparison.scoreDelta}`
                          : auditResult.comparison.scoreDelta}{" "}
                        pts
                      </span>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setActiveAnalysisSubTab("congruence")}
                  className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeAnalysisSubTab === "congruence"
                      ? "bg-slate-800 text-amber-400 border-t-2 border-amber-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>1. Pedidos & Adstrição (Congruência)</span>
                </button>

                <button
                  onClick={() => setActiveAnalysisSubTab("evidentiary")}
                  className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeAnalysisSubTab === "evidentiary"
                      ? "bg-slate-800 text-amber-400 border-t-2 border-amber-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>2. Choque Fático-Probatório (Provas)</span>
                </button>

                <button
                  onClick={() => setActiveAnalysisSubTab("procedural")}
                  className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeAnalysisSubTab === "procedural"
                      ? "bg-slate-800 text-amber-400 border-t-2 border-amber-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>3. Preliminares & Rito</span>
                </button>

                <button
                  onClick={() => setActiveAnalysisSubTab("feedback")}
                  className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeAnalysisSubTab === "feedback"
                      ? "bg-slate-800 text-emerald-400 border-t-2 border-emerald-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>4. Feedback para Assessor</span>
                </button>

                <button
                  onClick={() => setActiveAnalysisSubTab("correction")}
                  className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeAnalysisSubTab === "correction"
                      ? "bg-slate-800 text-amber-300 border-t-2 border-amber-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>5. Trecho Sugerido de Correção</span>
                </button>

                {auditResult.holisticSynopsis && (
                  <button
                    onClick={() => setActiveAnalysisSubTab("synopsis")}
                    className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeAnalysisSubTab === "synopsis"
                        ? "bg-slate-800 text-amber-300 border-t-2 border-amber-400 font-black shadow-xs"
                        : "text-amber-400/80 hover:text-amber-200 bg-amber-950/20"
                    }`}
                    title="Ver a Sinopse Holística dos Autos em 5 pilares estruturados sem omissões probatórias"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sinopse Holística (5 Pilares)</span>
                  </button>
                )}
              </div>

              {/* SUB-TAB: COMPARISON (ANTES VS DEPOIS) */}
              {activeAnalysisSubTab === "comparison" && (
                <div className="space-y-6">
                  {/* Top Score Comparison Summary Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-blue-500/40 shadow-xl space-y-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                          <GitCompare className="w-3.5 h-3.5" />
                          Painel Comparativo de Evolução da Minuta
                        </span>
                        <h3 className="text-base font-black text-white mt-1">
                          Auditoria de Confronto: Versão Anterior ➔ Minuta Corrigida
                        </h3>
                      </div>

                      {/* Score Comparison Display */}
                      <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <div className="text-center px-2">
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Nota Anterior</span>
                          <span className="text-lg font-black text-slate-300">
                            {auditResult.comparison?.previousScore ?? (auditedRecords.find((r) => r.id === currentAuditId)?.score ? "—" : "—")}
                          </span>
                        </div>

                        <ArrowRight className="w-5 h-5 text-blue-400 shrink-0" />

                        <div className="text-center px-2">
                          <span className="block text-[10px] text-emerald-400 font-bold uppercase">Nota Atual</span>
                          <span className="text-xl font-black text-emerald-300">{auditResult.score}</span>
                        </div>

                        {auditResult.comparison?.scoreDelta !== undefined && (
                          <div
                            className={`px-3 py-1 rounded-lg text-xs font-black border ${
                              auditResult.comparison.scoreDelta >= 0
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                            }`}
                          >
                            {auditResult.comparison.scoreDelta >= 0
                              ? `+${auditResult.comparison.scoreDelta}`
                              : auditResult.comparison.scoreDelta}{" "}
                            pontos
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Executive Summary for the Judge */}
                    {auditResult.comparison?.executiveCorrectionSummary && (
                      <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-1.5">
                        <span className="text-[11px] font-black uppercase text-blue-300 flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5" />
                          Síntese Executiva para o Magistrado:
                        </span>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {auditResult.comparison.executiveCorrectionSummary}
                        </p>
                      </div>
                    )}

                    {/* 3 Pillars Evolution Bars */}
                    {auditResult.comparison?.congruenceComparison && (
                      <div className="space-y-3 pt-2">
                        <span className="text-xs font-bold text-slate-300 block">
                          Evolução nos 3 Pilares Fundamentais:
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Pilar 1: Adstrição */}
                          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-200">1. Adstrição / Pedidos</span>
                              <span className="font-black text-amber-400">
                                {auditResult.comparison.congruenceComparison.previousScore}% ➔{" "}
                                {auditResult.comparison.congruenceComparison.newScore}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                              <div
                                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${auditResult.comparison.congruenceComparison.newScore}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {auditResult.comparison.congruenceComparison.evolutionNotes}
                            </p>
                          </div>

                          {/* Pilar 2: Provas */}
                          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-200">2. Confronto Probatório</span>
                              <span className="font-black text-emerald-400">
                                {auditResult.comparison.evidentiaryComparison.previousScore}% ➔{" "}
                                {auditResult.comparison.evidentiaryComparison.newScore}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${auditResult.comparison.evidentiaryComparison.newScore}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {auditResult.comparison.evidentiaryComparison.evolutionNotes}
                            </p>
                          </div>

                          {/* Pilar 3: Rito */}
                          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-200">3. Rito & Preliminares</span>
                              <span className="font-black text-indigo-400">
                                {auditResult.comparison.proceduralComparison.previousScore}% ➔{" "}
                                {auditResult.comparison.proceduralComparison.newScore}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                              <div
                                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${auditResult.comparison.proceduralComparison.newScore}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {auditResult.comparison.proceduralComparison.evolutionNotes}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status of Previous Alerts Resolution */}
                  {auditResult.comparison?.alertResolutions && auditResult.comparison.alertResolutions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                          <CheckCheck className="w-4 h-4 text-emerald-400" />
                          Status de Correção dos Alertas da Versão Anterior
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {auditResult.comparison.alertResolutions.filter((a) => a.status === "sanado").length} de{" "}
                          {auditResult.comparison.alertResolutions.length} alertas sanados
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {auditResult.comparison.alertResolutions.map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border text-xs space-y-2 transition ${
                              item.status === "sanado"
                                ? "bg-emerald-950/30 border-emerald-500/40"
                                : item.status === "parcialmente_sanado"
                                ? "bg-amber-950/30 border-amber-500/40"
                                : "bg-rose-950/30 border-rose-500/40"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {item.status === "sanado" ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : item.status === "parcialmente_sanado" ? (
                                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                )}
                                <span className="font-bold text-white text-xs">{item.originalAlertTitle}</span>
                              </div>

                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[11px] font-black border uppercase tracking-wider shrink-0 ${
                                  item.status === "sanado"
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    : item.status === "parcialmente_sanado"
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                }`}
                              >
                                {item.status === "sanado"
                                  ? "✅ Sanado"
                                  : item.status === "parcialmente_sanado"
                                  ? "⚠️ Parcialmente Sanado"
                                  : "❌ Não Corrigido"}
                              </span>
                            </div>

                            <p className="text-slate-300 text-xs leading-relaxed pl-6">
                              {item.explanation}
                            </p>

                            {item.persistingRiskNotes && (
                              <div className="pl-6 pt-1 text-[11px] text-rose-300 font-semibold">
                                <strong>Risco Remanescente:</strong> {item.persistingRiskNotes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comparative Drafts Text Viewer (Side-by-Side or Toggle) */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-400" />
                          Confronto Textual das Minutas
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Examine o texto da minuta original e da nova versão corrigida.
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700">
                        <button
                          type="button"
                          onClick={() => setComparisonDraftView("current")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            comparisonDraftView === "current"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Nova Minuta (Atual)
                        </button>
                        <button
                          type="button"
                          onClick={() => setComparisonDraftView("previous")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            comparisonDraftView === "previous"
                              ? "bg-slate-700 text-white shadow-xs"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Minuta Anterior
                        </button>
                        <button
                          type="button"
                          onClick={() => setComparisonDraftView("sideBySide")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            comparisonDraftView === "sideBySide"
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Lado a Lado
                        </button>
                      </div>
                    </div>

                    {/* Viewer Content */}
                    {comparisonDraftView === "current" && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase block">
                          Texto da Minuta Corrigida pelo Assessor (Versão Atual)
                        </span>
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                          {auditedRecords.find((r) => r.id === currentAuditId)?.assessorDraft || draftText}
                        </div>
                      </div>
                    )}

                    {comparisonDraftView === "previous" && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-amber-400 font-bold uppercase block">
                          Texto da Minuta Anterior (Versão Original)
                        </span>
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                          {auditedRecords.find((r) => r.id === currentAuditId)?.previousDraft ||
                            "Texto da versão anterior arquivado no processo de origem."}
                        </div>
                      </div>
                    )}

                    {comparisonDraftView === "sideBySide" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-amber-400 font-bold uppercase block">
                            Minuta Anterior (Original)
                          </span>
                          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                            {auditedRecords.find((r) => r.id === currentAuditId)?.previousDraft ||
                              "Texto da versão anterior arquivado no processo."}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[10px] text-emerald-400 font-bold uppercase block">
                            Nova Minuta Corrigida (Atual)
                          </span>
                          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                            {auditedRecords.find((r) => r.id === currentAuditId)?.assessorDraft || draftText}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 1: CONGRUENCE */}
              {activeAnalysisSubTab === "congruence" && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs text-slate-300">
                    <strong>Resumo da Adstrição:</strong> {auditResult.congruence?.summary}
                  </div>

                  <div className="space-y-2">
                    {auditResult.congruence?.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          item.risk === "citra_petita" || item.risk === "omission"
                            ? "bg-rose-950/40 border-rose-500/60"
                            : item.risk === "extra_petita"
                            ? "bg-amber-950/40 border-amber-500/60"
                            : "bg-slate-800/40 border-slate-700/70"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{item.request}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                              {item.source}
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed">{item.details}</p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[11px] font-black border ${
                              item.verdictInDraft?.includes("OMITIDO")
                                ? "bg-rose-950 text-rose-300 border-rose-500"
                                : "bg-slate-900 text-slate-200 border-slate-700"
                            }`}
                          >
                            {item.verdictInDraft}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: EVIDENTIARY */}
              {activeAnalysisSubTab === "evidentiary" && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs text-slate-300">
                    <strong>Resumo Probatório:</strong> {auditResult.evidentiary?.summary}
                  </div>

                  <div className="space-y-2">
                    {auditResult.evidentiary?.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          item.draftTreatment?.includes("Ignorado")
                            ? "bg-rose-950/40 border-rose-500/60"
                            : item.draftTreatment?.includes("Distorcido")
                            ? "bg-amber-950/40 border-amber-500/60"
                            : "bg-slate-800/40 border-slate-700/70"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{item.evidence}</span>
                            <span className="text-[10px] text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 font-mono">
                              {item.locationInPdf}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase">
                              [{item.party}]
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed">{item.observation}</p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[11px] font-black border ${
                              item.consideredInDraft
                                ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                                : "bg-rose-950 text-rose-300 border-rose-500/50"
                            }`}
                          >
                            {item.draftTreatment}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: PROCEDURAL */}
              {activeAnalysisSubTab === "procedural" && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs text-slate-300">
                    <strong>Resumo de Preliminares & Rito:</strong> {auditResult.procedural?.summary}
                  </div>

                  <div className="space-y-2">
                    {auditResult.procedural?.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-700/70 bg-slate-800/40 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div>
                          <span className="font-bold text-white text-xs">{item.topic}</span>
                          <p className="text-slate-300 mt-0.5 leading-relaxed">{item.notes}</p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                              item.status === "ok"
                                ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                                : item.status === "alerta"
                                ? "bg-amber-950 text-amber-300 border-amber-500/40"
                                : "bg-rose-950 text-rose-300 border-rose-500/40"
                            }`}
                          >
                            {item.addressedInDraft ? "Analisado" : "Não Apreciado"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB 4: FEEDBACK WHATSAPP */}
              {activeAnalysisSubTab === "feedback" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-300">
                      Mensagem técnica e pedagógica redigida pelo sistema para o Magistrado enviar diretamente ao Assessor:
                    </p>
                    <button
                      onClick={() => handleCopyText(auditResult.assessorFeedbackMessage, "feedbackTab")}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                      title="Copiar mensagem para colar no WhatsApp ou chat do assessor"
                    >
                      {copiedSection === "feedbackTab" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSection === "feedbackTab" ? "Copiado!" : "Copiar para WhatsApp"}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                    {auditResult.assessorFeedbackMessage}
                  </div>
                </div>
              )}

              {/* SUB-TAB 5: CORRECTION SNIPPET */}
              {activeAnalysisSubTab === "correction" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-300">
                      Trecho complementar sugerido pela IA para integrar à minuta e suprir os tópicos omissos:
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenSaveTeseModal(auditResult.suggestedCorrectionSnippet, "Tese Complementar")}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>Salvar como Tese</span>
                      </button>

                      <button
                        onClick={() => handleCopyText(auditResult.suggestedCorrectionSnippet, "correctionTab")}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        {copiedSection === "correctionTab" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSection === "correctionTab" ? "Copiado!" : "Copiar Trecho"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                    {auditResult.suggestedCorrectionSnippet}
                  </div>
                </div>
              )}

              {/* SUB-TAB 6: HOLISTIC SYNOPSIS */}
              {activeAnalysisSubTab === "synopsis" && auditResult.holisticSynopsis && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-950/30 rounded-xl border border-amber-500/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-amber-300">
                          Sinopse Holística Forense dos Autos (Integral em 5 Pilares)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Estruturação fática integral do processo consolidada para subsidiar a auditoria do magistrado sem supressão de provas ou pedidos.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyText(auditResult.holisticSynopsis || "", "synopsisTab")}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                    >
                      {copiedSection === "synopsisTab" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSection === "synopsisTab" ? "Copiado!" : "Copiar Sinopse"}</span>
                    </button>
                  </div>

                  <div
                    className="p-5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs leading-relaxed shadow-inner overflow-y-auto max-h-[600px] markdown-body"
                    style={{ "--color-fg-default": "#cbd5e1" } as React.CSSProperties}
                  >
                    <ReactMarkdown>{auditResult.holisticSynopsis}</ReactMarkdown>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: VISUALIZAR & EDITAR MINUTA (BANCO DE DADOS)                         */}
          {/* ========================================================================= */}
          {mainTab === "editor" && (
            <div className="space-y-4">
              
              {/* Header Editor Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Editor e Gestão da Minuta Auditada</h4>
                    <p className="text-[11px] text-slate-400">
                      Faça alterações diretas no texto da minuta, adicione anotações de gabinete e atualize o status.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Dropdown */}
                  <select
                    value={editingStatus}
                    onChange={(e: any) => setEditingStatus(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-300 font-bold focus:outline-hidden cursor-pointer"
                  >
                    <option value="pendente_correcao">Pendente de Correção</option>
                    <option value="corrigido">Minuta Corrigida</option>
                    <option value="aprovado">Aprovado pelo Juiz</option>
                    <option value="arquivado">Arquivado</option>
                  </select>

                  <button
                    onClick={() => handleOpenSaveTeseModal(editingDraftText, "Minuta Paradigma do Juiz")}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
                    title="Salvar esta minuta completa no acervo de paradigmas do juiz"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Salvar como Paradigma</span>
                  </button>

                  <button
                    onClick={handleSaveAuditEdits}
                    disabled={isSavingEdit}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Salvar no Banco</span>
                  </button>
                </div>
              </div>

              {/* Private Judge Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  Anotações e Despachos do Juiz (Salvas no Banco de Dados)
                </label>
                <input
                  type="text"
                  value={editingJudgeNotes}
                  onChange={(e) => setEditingJudgeNotes(e.target.value)}
                  placeholder="Ex: Assessor corrigiu o pedido de danos morais no dia 24/08. Pronto para assinatura."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Minuta Text Editor */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: Magistrate Ideal Minute (System Generated) */}
                  <div className="space-y-2 flex flex-col">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Minuta Ideal (Magistrado)
                      </label>
                      <button
                        onClick={() => handleCopyText(systemGeneratedMinute || auditResult?.systemGeneratedMinute || "", "systemMinute")}
                        className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1 cursor-pointer font-bold transition"
                      >
                        {copiedSection === "systemMinute" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSection === "systemMinute" ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                    
                    <div className="relative flex-1">
                      {systemGeneratedMinute || auditResult?.systemGeneratedMinute ? (
                        <div className="w-full h-full min-h-[420px] max-h-[600px] overflow-y-auto p-4 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 shadow-inner leading-relaxed markdown-body" style={{'--color-fg-default': '#cbd5e1'} as React.CSSProperties}>
                          <ReactMarkdown>
                            {systemGeneratedMinute || auditResult?.systemGeneratedMinute}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="w-full h-full min-h-[420px] p-6 rounded-xl bg-slate-900/80 border border-dashed border-slate-700 flex flex-col items-center justify-center text-center gap-3">
                          <Sparkles className="w-8 h-8 text-amber-400 opacity-60" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-300">Minuta Gabarito Sob Demanda</p>
                            <p className="text-[11px] text-slate-400 max-w-xs">
                              Para economizar tokens, a minuta gabarito pode ser gerada quando você desejar uma referência completa do magistrado.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleGenerateIdealMinuteOnDemand}
                            disabled={isGeneratingIdealMinute}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                          >
                            {isGeneratingIdealMinute ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Redigindo Gabarito...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>⚡ Gerar Minuta Gabarito com IA</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                        Referência
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Assessor's Draft (Editable) */}
                  <div className="space-y-2 flex flex-col">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        Minuta do Assessor (Em Edição)
                      </label>
                      <button
                        onClick={() => handleCopyText(editingDraftText, "editorText")}
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-bold transition"
                      >
                        {copiedSection === "editorText" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSection === "editorText" ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                    
                    <div className="relative flex-1">
                      <textarea
                        value={editingDraftText}
                        onChange={(e) => setEditingDraftText(e.target.value)}
                        className="w-full h-full min-h-[420px] p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 shadow-inner resize-y leading-relaxed"
                      />
                      <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                        Versão Final
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Módulo de Correição e Revisão Estrutural do Magistrado • Salvo em Nuvem</span>
          </div>

          <div className="flex items-center gap-2">
            {auditResult && mainTab !== "editor" && (
              <button
                onClick={() => handleOpenEditor()}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Minuta</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SUB-MODAL 1: RAIO-X DA AUDITORIA                                          */}
      {/* ========================================================================= */}
      {isXRayOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-950 text-indigo-400 rounded-lg">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Raio-X da Auditoria Judicial</h3>
                  <p className="text-[11px] text-slate-400">Rastreabilidade, Tokens e Motor Cognitivo Gemini</p>
                </div>
              </div>
              <button
                onClick={() => setIsXRayOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Modelo Cognitivo:</span>
                  <span className="font-bold text-indigo-300">{auditResult?.modelUsed || "Gemini 3.7 Flash"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tokens de Entrada (Prompt/PDFs):</span>
                  <span className="font-mono text-slate-200">{auditResult?.usage?.promptTokenCount?.toLocaleString() || "~ 8.500"} tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tokens de Resposta (Relatório):</span>
                  <span className="font-mono text-slate-200">{auditResult?.usage?.candidatesTokenCount?.toLocaleString() || "~ 1.950"} tokens</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1.5">
                  <span className="text-slate-300 font-bold">Total de Tokens Consumidos:</span>
                  <span className="font-mono font-bold text-amber-400">{auditResult?.usage?.totalTokenCount?.toLocaleString() || "~ 10.450"} tokens</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <span className="font-bold text-slate-200 block mb-1">Fontes Analisadas pelo Motor:</span>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Arquivos PDF dos Autos:</span>
                  <span className="text-slate-200 font-semibold">{pdfFiles.length} anexo(s)</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Texto dos Autos Processuais:</span>
                  <span className="text-slate-200 font-semibold">{processText.length.toLocaleString()} caracteres</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Extensão da Minuta do Assessor:</span>
                  <span className="text-slate-200 font-semibold">{draftText.length.toLocaleString()} caracteres</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Rastreabilidade e Segurança:
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  A inferência foi realizada em temperatura determinística (0.15), com verificação de adstrição aos pedidos (CPC arts. 141 e 492) e valoração fático-probatória estrita (CPC art. 371).
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsXRayOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs cursor-pointer"
              >
                Fechar Raio-X
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 2: SALVAR TESE NO CADERNO DE TESES / PARADIGMAS                 */}
      {/* ========================================================================= */}
      {isSaveTeseOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <BookmarkPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Salvar Tese no Gabinete</h3>
                  <p className="text-[11px] text-slate-400">Incorpore este entendimento jurídico ao acervo do Juiz</p>
                </div>
              </div>
              <button
                onClick={() => setIsSaveTeseOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Título / Tema da Tese</label>
                <input
                  type="text"
                  value={teseTitle}
                  onChange={(e) => setTeseTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Ramo / Categoria</label>
                  <select
                    value={teseCategory}
                    onChange={(e) => setTeseCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="Direito Previdenciário">Direito Previdenciário (INSS / Benefícios)</option>
                    <option value="Direito do Consumidor">Direito do Consumidor</option>
                    <option value="Direito Bancário (RMC/RCC/Empréstimos)">Direito Bancário (RMC/RCC/Empréstimos)</option>
                    <option value="Juizados Especiais Cíveis">Juizados Especiais Cíveis</option>
                    <option value="Fazenda Pública">Fazenda Pública</option>
                    <option value="Direito Civil Geral">Direito Civil Geral</option>
                    <option value="Processual Civil">Processual Civil</option>
                    <option value="Direito de Família">Direito de Família e Sucessões</option>
                    <option value="Direito Tributário">Direito Tributário</option>
                    <option value="Direito Administrativo">Direito Administrativo</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Destino no Gabinete</label>
                  <select
                    value={teseTarget}
                    onChange={(e: any) => setTeseTarget(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-amber-300 font-bold focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="paradigma">Minutas Paradigma do Juiz (Recomendado)</option>
                    <option value="caderno">Caderno de Teses do Gabinete</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Texto da Minuta / Fundamentação</span>
                    <span className="text-[10px] text-slate-400 font-normal">({teseContent.length.toLocaleString()} caracteres)</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTeseContent((editingDraftText || draftText || "").trim())}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                      title="Copiar e colar o texto integral da minuta auditada"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copiar Minuta Completa</span>
                    </button>

                    {auditResult?.suggestedCorrectionSnippet && (
                      <button
                        type="button"
                        onClick={() => setTeseContent(auditResult.suggestedCorrectionSnippet.trim())}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                        title="Usar apenas o trecho sugerido pela IA"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        <span>Usar Trecho Sugerido</span>
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={teseContent}
                  onChange={(e) => setTeseContent(e.target.value)}
                  placeholder="O texto completo da minuta ou fundamentação selecionada..."
                  className="w-full h-52 p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-hidden focus:border-amber-500 leading-relaxed shadow-inner"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsSaveTeseOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={handleSaveTeseSubmit}
                disabled={isSavingTese}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingTese ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Salvar Tese no Gabinete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 3: LANÇAR MINUTA CORRIGIDA (REAUDITORIA SEM REENVIAR PDF)       */}
      {/* ========================================================================= */}
      {isReAuditModalOpen && reAuditSourceRecord && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-blue-500/50 rounded-2xl w-full max-w-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-100 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-md shadow-blue-500/20">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">
                      Lançar Minuta Corrigida pelo Assessor
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-black uppercase">
                      Versão {(reAuditSourceRecord.version || 1) + 1}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    O sistema reauditará a minuta contra os autos já gravados de{" "}
                    <strong className="text-amber-300 font-mono">{reAuditProcNum}</strong> sem precisar reenviar os PDFs originais.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReAuditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error in ReAudit */}
            {reAuditErrorMessage && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{reAuditErrorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReAuditErrorMessage(null)}
                  className="text-rose-400 hover:text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Scrollable Form Content */}
            <div className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              
              {/* Context Summary Banner */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Processo Judicial</span>
                  <span className="text-xs font-mono font-bold text-white truncate block">{reAuditProcNum}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Assessor(a)</span>
                  <span className="text-xs font-bold text-slate-200 truncate block">{reAuditAssessor}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Score Versão Anterior</span>
                  <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getVerdictBadgeClass(reAuditSourceRecord.verdictColor)}`}>
                      {reAuditSourceRecord.score}/100 - {reAuditSourceRecord.verdict}
                    </span>
                  </span>
                </div>
              </div>

              {/* Previous Alerts Checklist (What the Assessor needed to fix) */}
              {reAuditSourceRecord.auditResult?.criticalAlerts && reAuditSourceRecord.auditResult.criticalAlerts.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Alertas Anteriores a Serem Sanados nesta Minuta:
                    </span>
                    <span className="text-[10px] text-amber-400/80 font-bold">
                      {reAuditSourceRecord.auditResult.criticalAlerts.length} alerta(s)
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {reAuditSourceRecord.auditResult.criticalAlerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] flex items-start gap-2"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-200">{alert.title}</span>
                          {alert.recommendation && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              <strong>Orientação:</strong> {alert.recommendation}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Identification Overrides */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    Número do Processo
                  </label>
                  <input
                    type="text"
                    value={reAuditProcNum}
                    onChange={(e) => setReAuditProcNum(e.target.value)}
                    placeholder="Ex: 5123456-78.2024.8.09.0051"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    Nome do(a) Assessor(a)
                  </label>
                  <input
                    type="text"
                    value={reAuditAssessor}
                    onChange={(e) => setReAuditAssessor(e.target.value)}
                    placeholder="Nome do(a) assessor(a) que redigiu a minuta"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Revised Draft Textarea (PRIMARY USER ACTION) */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-slate-200 font-bold flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-blue-400" />
                    Texto da Nova Minuta Corrigida pelo Assessor
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const clipText = await navigator.clipboard.readText();
                          if (clipText) {
                            setReAuditDraftText(clipText);
                            const detected = extractProcessNumberFromText(clipText);
                            if (detected && (!reAuditProcNum || reAuditProcNum === "Processo Judicial")) {
                              setReAuditProcNum(detected);
                            }
                          }
                        } catch {
                          // Fallback if clipboard permission is restricted
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-[11px] font-bold cursor-pointer transition flex items-center gap-1"
                      title="Colar texto da minuta da área de transferência"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Colar Minuta</span>
                    </button>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {reAuditDraftText.length} caracteres
                    </span>
                  </div>
                </div>

                <textarea
                  value={reAuditDraftText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReAuditDraftText(val);
                    // Live auto-heal process number if generic
                    if (!reAuditProcNum || reAuditProcNum === "Processo Judicial" || reAuditProcNum === "Processo dos Autos" || reAuditProcNum === "Processo TJGO") {
                      const detected = extractProcessNumberFromText(val);
                      if (detected) setReAuditProcNum(detected);
                    }
                  }}
                  placeholder="Cole aqui o texto corrido da nova minuta com as correções elaboradas pelo assessor..."
                  className="w-full h-56 p-3.5 rounded-xl bg-slate-950 border border-blue-500/40 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500 leading-relaxed shadow-inner"
                />
              </div>

              {/* What was changed / Correction Notes */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  O que foi corrigido nesta versão? (Opcional - direciona a análise comparativa)
                </label>
                <input
                  type="text"
                  value={reAuditNotes}
                  onChange={(e) => setReAuditNotes(e.target.value)}
                  placeholder="Ex: Sanada a omissão quanto ao evento 15; retificado o dispositivo para julgar improcedente o dano moral..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Autos Information & Optional Expansion */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-slate-200 text-xs">
                      Acervo Probatório dos Autos para Confronto:
                    </span>
                    {(reAuditProcessText.length > 20 || reAuditPdfs.length > 0) ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Autos Prontos do Processo Original
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Autos Preservados no Histórico
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAutosEditorInReAudit((prev) => !prev)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline font-bold cursor-pointer"
                  >
                    {showAutosEditorInReAudit ? "Ocultar Anexos" : "Ver / Adicionar Peças Complementares (Opcional)"}
                  </button>
                </div>

                {showAutosEditorInReAudit && (
                  <div className="space-y-3 pt-2 border-t border-slate-800 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between relative group hover:border-emerald-500/50 transition">
                        <input
                          type="file"
                          accept=".pdf"
                          multiple
                          onChange={handleReAuditPdfUpload}
                          disabled={isUploadingReAuditPdf}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="flex items-center gap-2 mb-1">
                          <UploadCloud className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-slate-200 text-xs">
                            {isUploadingReAuditPdf ? "Extraindo PDF..." : "Anexar PDF Complementar (Opcional)"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Utilize apenas se desejar juntar novos documentos probatórios ao processo.
                        </p>
                      </div>

                      {reAuditPdfs.length > 0 && (
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 block">PDFs Anexados:</span>
                          {reAuditPdfs.map((pdf) => (
                            <div key={pdf.id} className="flex items-center justify-between text-[11px] text-slate-200">
                              <span className="truncate">{pdf.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveReAuditPdf(pdf.id)}
                                className="text-rose-400 hover:text-rose-300 ml-2"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                        <span>Texto das Peças dos Autos</span>
                        <span className="text-slate-500 font-mono">{reAuditProcessText.length} caracteres</span>
                      </label>
                      <textarea
                        value={reAuditProcessText}
                        onChange={(e) => setReAuditProcessText(e.target.value)}
                        placeholder="Cole aqui peças complementares dos autos se necessário..."
                        className="w-full h-24 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Reassurance Note */}
              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-[11px] text-slate-300 flex items-center gap-2">
                <FolderSync className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  O sistema executará a análise comparativa determinística contra a versão anterior e os autos já salvos, atualizando os alertas sanados e a evolução de scores para o magistrado.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsReAuditModalOpen(false)}
                disabled={isReAuditing}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteReAudit}
                disabled={isReAuditing}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReAuditing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{reAuditStep || "Reauditando minuta..."}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-white" />
                    <span>⚡ Auditar Correções & Comparar Antes vs Depois</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">Confirmar Exclusão</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {deleteConfirmTarget.type === 'all' 
                    ? "Deseja excluir permanentemente TODO o histórico de auditorias? Esta ação não pode ser desfeita e afetará todo o gabinete."
                    : deleteConfirmTarget.type === 'group'
                    ? `Deseja excluir permanentemente todo o histórico do processo ${deleteConfirmTarget.group?.displayProcessNumber}? Esta ação não pode ser desfeita.`
                    : "Deseja excluir esta versão da auditoria? Esta ação não pode ser desfeita."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirmTarget.type === 'all') {
                    await handleClearAllRecords();
                  } else if (deleteConfirmTarget.type === 'group' && deleteConfirmTarget.group) {
                    await confirmDeleteProcessGroup(deleteConfirmTarget.group);
                  } else if (deleteConfirmTarget.type === 'record' && deleteConfirmTarget.id) {
                    await confirmDeleteRecord(deleteConfirmTarget.id);
                  }
                  setDeleteConfirmTarget(null);
                }}
                className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-lg shadow-rose-600/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
