import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  Copy,
  Check,
  Download,
  Printer,
  Sparkles,
  BrainCircuit,
  Edit3,
  Eye,
  FileCheck2,
  Scale,
  Calculator,
  RefreshCw,
  Send,
  AlertCircle,
  FileText,
  Minimize2,
  Maximize2,
  MessageSquare,
  Bot,
  Trash2,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  PlusCircle,
  ArrowRight,
  Home,
  Zap,
  Coins,
  ShieldCheck,
  Bookmark,
  History,
  Gavel,
  Save,
  Undo,
  FileEdit,
  Brain,
  Lightbulb,
  X,
  CornerDownLeft,
  Crown,
  BookOpen,
  ClipboardList,
  Clock,
  UserCheck,
} from "lucide-react";
import { GenerationResult, MinuteData, ApiUsageMetadata, ChatMessage, MinuteVersion } from "../types";
import { copyMinuteToClipboard, exportMinuteToDocx, printFormattedMinute } from "../utils/documentExport";
import { updateAnalysisChatAndMinute } from "../lib/firestoreUtils";
import { recordApiExecution } from "../utils/apiUsageTracker";
import { getCabinetTeses, saveCabinetTeses } from "../utils/tesesDb";
import { FatoVsProvaPanel } from "./FatoVsProvaPanel";
import { ComplianceChecklist } from "./ComplianceChecklist";
import { ConsectariosCalculator } from "./ConsectariosCalculator";
import { VersionCompareView } from "./VersionCompareView";
import { VersionHistoryView } from "./VersionHistoryView";
import { FloatingTextSelectionToolbar } from "./FloatingTextSelectionToolbar";
import { PreAuditCard } from "./PreAuditCard";
import { getApiHeaders, checkUserAiAccess, requestOpenApiKeyModal, checkResponseForRotatedKey } from "../utils/apiKeyManager";
import { useAuth } from "../lib/AuthContext";

interface MinuteViewerProps {
  result: GenerationResult | null;
  onUpdateMinute: (newMinute: MinuteData) => void;
  originalProcessText: string;
  isFormCollapsed: boolean;
  onToggleCollapseForm: () => void;
  onClearProcess?: () => void;
  onGoHome?: () => void;
  onOpenCredits?: () => void;
  onOpenXRay?: () => void;
  onAddSessionTokens?: (tokens: number) => void;
  customPromptText?: string;
  cabinetTesesText?: string;
  isTesesEnabled?: boolean;
  paradigmModelText?: string;
  paradigmModelTitle?: string;
  isParadigmEnabled?: boolean;
  currentAnalysisId?: string | null;
  initialChatMessages?: ChatMessage[];
  onChatMessagesUpdated?: (messages: ChatMessage[], updatedMinute?: MinuteData) => void;
  onInjectTextAsParadigm?: (text: string, processNumber?: string, category?: string) => void;
  onDeleteMinute?: () => void;
}

export const MinuteViewer: React.FC<MinuteViewerProps> = ({
  result,
  onUpdateMinute,
  originalProcessText,
  isFormCollapsed,
  onToggleCollapseForm,
  onClearProcess,
  onGoHome,
  onOpenCredits,
  onOpenXRay,
  onAddSessionTokens,
  customPromptText,
  cabinetTesesText,
  isTesesEnabled,
  paradigmModelText,
  paradigmModelTitle,
  isParadigmEnabled,
  currentAnalysisId,
  initialChatMessages = [],
  onChatMessagesUpdated,
  onInjectTextAsParadigm,
  onDeleteMinute,
}) => {
  const { user, userProfile, isJudge } = useAuth();
  const userName = userProfile?.name?.split(" ")[0] || user?.displayName?.split(" ")[0] || "Gabinete";
  const [activeTab, setActiveTab] = useState<
    "formatted" | "preAudit" | "original" | "compare" | "history" | "editor" | "projudi" | "fatoVsProva" | "compliance" | "calculator" | "synopsis"
  >("formatted");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingOriginalDocx, setIsExportingOriginalDocx] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [isChatInputExpanded, setIsChatInputExpanded] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [updateNotification, setUpdateNotification] = useState<string | null>(null);
  const [expandedMinuteMsgIds, setExpandedMinuteMsgIds] = useState<Record<string, boolean>>({});
  const [projudiSelection, setProjudiSelection] = useState<string>("");
  const [copiedTpuCode, setCopiedTpuCode] = useState(false);
  const [copiedTpuSummary, setCopiedTpuSummary] = useState(false);
  
  // Manual Editor state
  const [editTitle, setEditTitle] = useState("");
  const [editHeader, setEditHeader] = useState("");
  const [editProcessNumber, setEditProcessNumber] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editDefendant, setEditDefendant] = useState("");
  const [editRelatorio, setEditRelatorio] = useState("");
  const [editFundamentacao, setEditFundamentacao] = useState("");
  const [editDispositivo, setEditDispositivo] = useState("");
  const [editClosing, setEditClosing] = useState("");
  const [editFullText, setEditFullText] = useState("");
  const [editMode, setEditMode] = useState<"structured" | "raw">("structured");
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [manualSaveSuccess, setManualSaveSuccess] = useState(false);

  // Quick Edit Parties modal state
  const [isQuickEditPartiesOpen, setIsQuickEditPartiesOpen] = useState(false);
  const [quickProcessNumber, setQuickProcessNumber] = useState("");
  const [quickAuthor, setQuickAuthor] = useState("");
  const [quickDefendant, setQuickDefendant] = useState("");

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const topViewerRef = useRef<HTMLDivElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);
  const projudiTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTriggerInjectParadigm = (selectedSnippet: string) => {
    if (onInjectTextAsParadigm) {
      const procNum = minute.processNumber || result?.minute?.processNumber || "";
      const cat = "Direito do Consumidor";
      onInjectTextAsParadigm(selectedSnippet, procNum, cat);
    }
  };

  // Versions management
  const baseOriginalMinute = result?.originalMinute || result?.minute;
  const [versions, setVersions] = useState<MinuteVersion[]>(() => {
    if (Array.isArray(result?.versions) && result.versions.length > 0) {
      return result.versions;
    }
    if (baseOriginalMinute) {
      return [{
        id: "v-1-original",
        versionNumber: 1,
        label: "1º Modelo Original (Gerado por IA)",
        timestamp: Date.now(),
        minute: baseOriginalMinute,
        source: "generation",
        author: "Assessor Judicial AI",
      }];
    }
    return [];
  });

  // Keep versions in sync if result changes
  useEffect(() => {
    if (Array.isArray(result?.versions) && result.versions.length > 0) {
      setVersions(result.versions);
    } else if (result?.originalMinute || result?.minute) {
      const initMin = result.originalMinute || result.minute;
      setVersions([{
        id: "v-1-original",
        versionNumber: 1,
        label: "1º Modelo Original (Gerado por IA)",
        timestamp: Date.now() || Date.now(),
        minute: initMin,
        source: "generation",
        author: "Assessor Judicial AI",
      }]);
    }
  }, [result?.originalMinute, result?.minute, result?.versions]);

  // Sync initial chat messages when analysis changes
  useEffect(() => {
    if (initialChatMessages && initialChatMessages.length > 0) {
      setChatMessages(initialChatMessages);
    } else {
      setChatMessages([]);
    }
  }, [currentAnalysisId, initialChatMessages]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatSending]);

  // Sync editor buffer whenever activeTab becomes "editor" or minute changes
  useEffect(() => {
    if (activeTab === "editor" && result?.minute) {
      const min = result.minute;
      setEditTitle(min.title || "SENTENÇA");
      setEditHeader(min.header || "");
      setEditProcessNumber(min.processNumber || "");
      setEditAuthor(min.parties?.author || "");
      setEditDefendant(min.parties?.defendant || "");
      setEditRelatorio((min.relatorio || "").replace(/\\n/g, "\n"));
      setEditFundamentacao((min.fundamentacao || "").replace(/\\n/g, "\n"));
      setEditDispositivo((min.dispositivo || "").replace(/\\n/g, "\n"));
      setEditClosing((min.closing || "").replace(/\\n/g, "\n"));
      setEditFullText((min.fullFormattedText || "").replace(/\\n/g, "\n"));
      setManualSaveSuccess(false);
    }
  }, [activeTab, result?.minute]);

  const minute = result?.minute;
  const originalMinute = result?.originalMinute || result?.minute;

  // Indicação do Tipo de Movimentação TPU CNJ no Projudi
  const effectiveTpu = useMemo(() => {
    if (minute?.indicacaoTpuCnj) return minute.indicacaoTpuCnj;
    if (result?.indicacaoTpuCnj) return result.indicacaoTpuCnj;
    if (result?.auditAnalysis?.indicacaoTpuCnj) return result.auditAnalysis.indicacaoTpuCnj;

    // Heurística de classificação automática conforme dispositivo e título
    const title = (minute?.title || "").toLowerCase();
    const disp = (minute?.dispositivo || "").toLowerCase();

    if (title.includes("senten")) {
      if (disp.includes("parcial")) {
        return {
          codigoTpu: "221",
          descricaoMovimento: "Sentença - Julgamento com Resolução do Mérito - Procedência em Parte",
          tipoAto: "Sentença" as const,
          subtipoResultado: "Parcial Procedência",
          prazoSecretaria: "15 dias úteis (art. 1.003, § 5º, CPC / 10 dias úteis se Lei 9.099/95)",
          filaProjudi: "Aguardando Intimação da Sentença",
          observacoesLancamento: "Lançar código TPU 221 no PROJUDI. Intimar as partes para cumprimento ou recurso cabível."
        };
      }
      if (disp.includes("improcedente")) {
        return {
          codigoTpu: "220",
          descricaoMovimento: "Sentença - Julgamento com Resolução do Mérito - Improcedência",
          tipoAto: "Sentença" as const,
          subtipoResultado: "Improcedência",
          prazoSecretaria: "15 dias úteis (art. 1.003, § 5º, CPC / 10 dias úteis se Lei 9.099/95)",
          filaProjudi: "Aguardando Intimação da Sentença",
          observacoesLancamento: "Lançar código TPU 220 no PROJUDI. Intimar a parte autora."
        };
      }
      if (disp.includes("extin") || disp.includes("art. 485")) {
        return {
          codigoTpu: "22",
          descricaoMovimento: "Sentença - Extinção sem Resolução do Mérito (art. 485 CPC)",
          tipoAto: "Sentença" as const,
          subtipoResultado: "Extinção sem Resolução do Mérito",
          prazoSecretaria: "15 dias úteis",
          filaProjudi: "Aguardando Trânsito em Julgado / Intimação",
          observacoesLancamento: "Lançar código TPU 22 (ou 230). Verificar eventual condenação em custas."
        };
      }
      return {
        codigoTpu: "219",
        descricaoMovimento: "Sentença - Julgamento com Resolução do Mérito - Procedência",
        tipoAto: "Sentença" as const,
        subtipoResultado: "Procedência Total",
        prazoSecretaria: "15 dias úteis (art. 1.003, § 5º, CPC / 10 dias úteis se Lei 9.099/95)",
        filaProjudi: "Aguardando Intimação da Sentença",
        observacoesLancamento: "Lançar código TPU 219 no PROJUDI. Intimar partes e abrir prazo recursal."
      };
    }
    if (title.includes("decis")) {
      if (disp.includes("defiro") || disp.includes("concedo")) {
        return {
          codigoTpu: "25",
          descricaoMovimento: "Decisão - Concedida a Medida Liminar / Deferimento de Tutela Provisória",
          tipoAto: "Decisão Interlocutória" as const,
          subtipoResultado: "Tutela de Urgência Deferida",
          prazoSecretaria: "Cumprimento Imediato / Expedição de Notificação com Urgência",
          filaProjudi: "Urgência - Expedição de Mandado/Intimação",
          observacoesLancamento: "Lançar código TPU 25 no PROJUDI com prioridade."
        };
      }
      return {
        codigoTpu: "3",
        descricaoMovimento: "Decisão - Decisão Interlocutória",
        tipoAto: "Decisão Interlocutória" as const,
        subtipoResultado: "Interlocutória",
        prazoSecretaria: "15 dias úteis (Agravo de Instrumento)",
        filaProjudi: "Aguardando Cumprimento de Decisão",
        observacoesLancamento: "Lançar código TPU 3 no PROJUDI."
      };
    }
    return {
      codigoTpu: "11010",
      descricaoMovimento: "Despacho - Mero Expediente (art. 203, § 3º, CPC)",
      tipoAto: "Despacho" as const,
      subtipoResultado: "Mero Expediente / Impulso Oficial",
      prazoSecretaria: "5 dias úteis",
      filaProjudi: "Aguardando Cumprimento de Cartório",
      observacoesLancamento: "Lançar código TPU 11010 no PROJUDI."
    };
  }, [minute, result]);

  const displayProcessNumber = useMemo(() => {
    if (minute?.processNumber && !minute.processNumber.toLowerCase().includes("extrair") && !minute.processNumber.toLowerCase().includes("não informado")) {
      return minute.processNumber;
    }
    const rel = minute?.relatorio || minute?.fullFormattedText || "";
    const m = rel.match(/\b(\d{7}[-.]\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4})\b/);
    return m ? m[1] : (minute?.processNumber || "Autos do Processo");
  }, [minute?.processNumber, minute?.relatorio, minute?.fullFormattedText]);

  const isInvalidPartyText = (val?: string) => {
    if (!val || typeof val !== "string") return true;
    const lower = val.trim().toLowerCase();
    const normalized = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (lower.length < 3 || lower.length > 90) return true;
    if (
      lower.includes("parte autora") ||
      lower.includes("parte re") ||
      lower.includes("parte ré") ||
      lower.includes("partes devidamente") ||
      lower.includes("qualificad") ||
      lower === "autor" ||
      lower === "autora" ||
      lower === "réu" ||
      lower === "reu" ||
      lower === "ré" ||
      lower.includes("extrair") ||
      lower.includes("nao informado") ||
      lower.includes("não informado") ||
      lower.includes("autos do processo")
    ) {
      return true;
    }

    // Factual claims, relationship narratives, predicates (never valid party names)
    if (
      normalized.includes("manteve") ||
      normalized.includes("uniao afetiva") ||
      normalized.includes("uniao estavel") ||
      normalized.includes("com o requerido") ||
      normalized.includes("com a requerida") ||
      normalized.includes("com o reu") ||
      normalized.includes("com a re") ||
      normalized.includes("contra o requerido") ||
      normalized.includes("contra a requerida") ||
      normalized.includes("contra o reu") ||
      normalized.includes("contra a re") ||
      normalized.includes("em face do") ||
      normalized.includes("em face da") ||
      normalized.includes("acao de") ||
      normalized.includes("pedido de") ||
      normalized.includes("tutela de") ||
      normalized.includes("dissolucao de") ||
      normalized.includes("revisao de")
    ) {
      return true;
    }

    const narrativeVerbs = [
      "alega", "aduz", "sustenta", "afirma", "relata", "narra", "pretende",
      "pleiteia", "postula", "requer", "pugna", "ajuizou", "ingressou",
      "propos", "trata-se", "cuida-se", "visando", "discute-se"
    ];
    if (narrativeVerbs.some(v => normalized.includes(v))) {
      return true;
    }

    const proceduralNoise = [
      "designacao", "audiencia", "instrucao", "conciliacao", "julgamento",
      "despacho", "decisao", "sentenca", "certidao", "intimacao", "citacao",
      "contestacao", "impugnacao", "mandado", "peticao", "requerimento",
      "cumprimento", "execucao", "recurso", "apelacao", "agravo", "embargos",
      "movimentacao", "evento", "autos", "secretaria", "vara", "comarca",
      "procuracao", "conclusao", "arquivamento"
    ];
    if (proceduralNoise.some(term => normalized.includes(term))) {
      return true;
    }
    if (/^(a|o|as|os|da|do|das|dos|de|em|para|por)\s+(designa|solicita|requer|pede|realiza|marca|abre|julga|converte|alega|aduz|mant)/i.test(lower)) {
      return true;
    }
    return false;
  };

  const displayAuthor = useMemo(() => {
    if (!isInvalidPartyText(minute?.parties?.author)) {
      return minute!.parties.author.trim();
    }
    const rel = [minute?.relatorio, minute?.fullFormattedText, minute?.fundamentacao].filter(Boolean).join("\n");
    const m = rel.match(/(?:instaurad[oa]|propost[oa]|ajuizad[oa]|promovid[oa]|movid[oa])\s+por\s+([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:\s*,\s*(?:partes?\s+)?devidamente|\s*,\s*qualificad|\s+em\s+face|\s+contra|\s+desfavor)/i)
      || rel.match(/(?:polo\s+ativo|promovente|requerente|exequente)\s*[:\-]?\s*([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:[,\.\n]|\s+em\s+face|\s+contra)/i)
      || rel.match(/(?:autor(?:a)?)\s*:\s*([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:[,\.\n]|\s+em\s+face|\s+contra)/i);
    if (m && m[1] && !isInvalidPartyText(m[1].trim())) {
      return m[1].replace(/[\*\_]/g, "").trim();
    }
    return minute?.parties?.author && !isInvalidPartyText(minute.parties.author) ? minute.parties.author : "Parte Autora";
  }, [minute?.parties?.author, minute?.relatorio, minute?.fullFormattedText, minute?.fundamentacao]);

  const displayDefendant = useMemo(() => {
    if (!isInvalidPartyText(minute?.parties?.defendant)) {
      return minute!.parties.defendant.trim();
    }
    const rel = [minute?.relatorio, minute?.dispositivo, minute?.fullFormattedText, minute?.fundamentacao].filter(Boolean).join("\n");
    const m = rel.match(/(?:em\s+face\s+d[eao]s?|contra\s+(?:o|a)?|desfavor\s+d[eao]s?)\s+([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:\s*,\s*(?:partes?\s+)?devidamente|\s*,\s*qualificad|\s*,\s*tombad|\s*,\s*todos|[,\.\n]|\s+visando|\s+pretendendo)/i)
      || rel.match(/(?:polo\s+passivo|promovid[oa]|requerid[oa]|executad[oa])\s*[:\-]?\s*([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:[,\.\n]|\s*,\s*qualificad)/i)
      || rel.match(/(?:réu|ré)\s*:\s*([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:[,\.\n]|\s*,\s*qualificad)/i)
      || rel.match(/(?:condenar\s+(?:o|a)?\s+(?:requerid[oa]|promovid[oa]|demandad[oa]|executad[oa]|réu|ré)?\s*)([A-ZÁ-Ú\d][A-Za-zÁ-Úá-ú0-9\s\.\-\&\/]{3,70}?)(?:\s+(?:a|ao|para|em)\s+pagar|\s*,\s*a\s+pagar|[,\.\n])/i);
    if (m && m[1] && !isInvalidPartyText(m[1].trim())) {
      return m[1].replace(/[\*\_]/g, "").trim();
    }
    return minute?.parties?.defendant && !isInvalidPartyText(minute.parties.defendant) ? minute.parties.defendant : "Parte Ré";
  }, [minute?.parties?.defendant, minute?.relatorio, minute?.dispositivo, minute?.fullFormattedText, minute?.fundamentacao]);

  // If no result yet, display the "Aguardando Execução" empty state matching screenshot
  if (!result || !result.minute || !minute) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col h-full min-h-[600px]">
        {/* Header matching screenshot */}
        <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-800">Resultado & Análise</h3>
          </div>
          <div className="flex items-center gap-1.5 opacity-50 pointer-events-none text-xs">
            <button className="px-2.5 py-1 border border-emerald-200 rounded text-slate-600">
              Recolher formulário
            </button>
            <button className="px-2.5 py-1 border border-emerald-200 rounded text-slate-600">
              Editar
            </button>
            <button className="px-2.5 py-1 border border-emerald-200 rounded text-slate-600">
              Copiar
            </button>
            <button className="px-2.5 py-1 border border-emerald-200 rounded text-slate-600">
              Gerar PDF
            </button>
          </div>
        </div>

        {/* Empty State Body */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-50/50">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-slate-200 flex items-center justify-center text-slate-400">
            <Bot className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h4 className="font-bold text-slate-700 text-sm">Aguardando Execução</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Preencha os dados ou insira o PDF e execute o prompt para visualizar o relatório estruturado e a minuta aqui.
            </p>
          </div>
        </div>

        {/* Bottom Assistant Bar */}
        <div className="p-3 bg-emerald-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-700">Assistente do {userName}</span>
          </div>
          <span className="text-[11px] italic">Execute um processo para habilitar o chat e refino da minuta...</span>
        </div>
      </div>
    );
  }

  const isMinuteModified = Boolean(
    originalMinute && (
      minute.relatorio !== originalMinute.relatorio ||
      minute.fundamentacao !== originalMinute.fundamentacao ||
      minute.dispositivo !== originalMinute.dispositivo ||
      minute.title !== originalMinute.title
    )
  );

  const hasLinkedParadigm = Boolean(
    result?.paradigmUsed ||
    (isParadigmEnabled && paradigmModelText && paradigmModelText.trim().length > 0)
  );

  const handleCopy = async () => {
    const success = await copyMinuteToClipboard(minute);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyOriginal = async () => {
    if (!originalMinute) return;
    const success = await copyMinuteToClipboard(originalMinute);
    if (success) {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2500);
    }
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportMinuteToDocx(minute);
    } catch (err) {
      console.error("Error exporting DOCX:", err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportOriginalDocx = async () => {
    if (!originalMinute) return;
    setIsExportingOriginalDocx(true);
    try {
      await exportMinuteToDocx(originalMinute);
    } catch (err) {
      console.error("Error exporting original DOCX:", err);
    } finally {
      setIsExportingOriginalDocx(false);
    }
  };

  const handlePrint = () => {
    printFormattedMinute(minute);
  };

  const handlePrintOriginal = () => {
    if (!originalMinute) return;
    printFormattedMinute(originalMinute);
  };

  const handleRestoreOriginal = () => {
    if (!originalMinute) return;
    onUpdateMinute(originalMinute);
    setActiveTab("formatted");
    setUpdateNotification("Minuta restaurada para o 1º modelo original com sucesso!");
    if (topViewerRef.current) {
      topViewerRef.current.scrollIntoView({ behavior: "smooth" });
    }
    setTimeout(() => setUpdateNotification(null), 5000);
  };

  const handleSelectActiveMinute = (targetMinute: MinuteData, label: string) => {
    onUpdateMinute(targetMinute);
    setActiveTab("formatted");
    setUpdateNotification(`Minuta alterada para "${label}" com sucesso!`);
    if (topViewerRef.current) {
      topViewerRef.current.scrollIntoView({ behavior: "smooth" });
    }
    setTimeout(() => setUpdateNotification(null), 5000);
  };

  const handleDeleteVersion = async (versionId: string) => {
    const updated = versions.filter((v) => v.id !== versionId);
    setVersions(updated);
    if (result) {
      result.versions = updated;
    }
    if (currentAnalysisId) {
      try {
        await updateAnalysisChatAndMinute(currentAnalysisId, chatMessages, minute, updated);
      } catch (err) {
        console.warn("Error updating versions in db:", err);
      }
    }
    setUpdateNotification("Versão excluída do histórico cronológico.");
    setTimeout(() => setUpdateNotification(null), 4000);
  };

  const handleClearVersionHistory = async () => {
    const keptVersion: MinuteVersion = {
      id: `v-current-${Date.now()}`,
      versionNumber: 1,
      label: "Minuta Atual Consolidada",
      timestamp: Date.now(),
      minute: minute,
      source: "editor",
      author: "Assessor Judicial",
    };
    const updated = [keptVersion];
    setVersions(updated);
    if (result) {
      result.versions = updated;
    }
    if (currentAnalysisId) {
      try {
        await updateAnalysisChatAndMinute(currentAnalysisId, chatMessages, minute, updated);
      } catch (err) {
        console.warn("Error clearing versions in db:", err);
      }
    }
    setUpdateNotification("Histórico de versões limpo com sucesso!");
    setTimeout(() => setUpdateNotification(null), 4000);
  };

  const handleOpenQuickEditParties = () => {
    setQuickAuthor(
      minute?.parties?.author && !isInvalidPartyText(minute.parties.author)
        ? minute.parties.author
        : displayAuthor !== "Parte Autora"
          ? displayAuthor
          : (minute?.parties?.author || "")
    );
    setQuickDefendant(
      minute?.parties?.defendant && !isInvalidPartyText(minute.parties.defendant)
        ? minute.parties.defendant
        : displayDefendant !== "Parte Ré"
          ? displayDefendant
          : (minute?.parties?.defendant || "")
    );
    setQuickProcessNumber(
      minute?.processNumber && minute.processNumber !== "Autos do Processo"
        ? minute.processNumber
        : displayProcessNumber !== "Autos do Processo"
          ? displayProcessNumber
          : (minute?.processNumber || "")
    );
    setIsQuickEditPartiesOpen(true);
  };

  const handleSaveQuickEditParties = async () => {
    if (!result?.minute || !minute) return;
    const authorVal = quickAuthor.trim() || "Parte Autora";
    const defendantVal = quickDefendant.trim() || "Parte Ré";
    const procVal = quickProcessNumber.trim() || "Autos do Processo";

    const updatedMinute: MinuteData = {
      ...minute,
      processNumber: procVal,
      parties: {
        author: authorVal,
        defendant: defendantVal
      }
    };

    if (updatedMinute.fullFormattedText) {
      const rel = updatedMinute.relatorio || "";
      const fund = updatedMinute.fundamentacao || "";
      const disp = updatedMinute.dispositivo || "";
      const clos = updatedMinute.closing || "";
      updatedMinute.fullFormattedText = [
        updatedMinute.header ? updatedMinute.header.toUpperCase() : "",
        updatedMinute.title ? `\n\n${updatedMinute.title.toUpperCase()}\n` : "",
        `\nProcesso nº: ${procVal}`,
        `Promovente (Autor): ${authorVal}`,
        `Promovido (Réu): ${defendantVal}`,
        rel ? `\n\nI - RELATÓRIO\n${rel}` : "",
        fund ? `\n\nII - FUNDAMENTAÇÃO\n${fund}` : "",
        disp ? `\n\nIII - DISPOSITIVO\n${disp}` : "",
        clos ? `\n\n${clos}` : `\n\nDocumento assinado digitalmente.`
      ].filter(Boolean).join("\n");
    }

    onUpdateMinute(updatedMinute);

    const newVersion: MinuteVersion = {
      id: `v-${Date.now()}-parties`,
      versionNumber: versions.length + 1,
      label: `Ajuste de Dados das Partes #${versions.length + 1}`,
      timestamp: Date.now(),
      minute: updatedMinute,
      source: "editor",
      author: "Assessor Judicial",
      changeSummary: `Ajuste do Promovente (Autor) para "${authorVal}" e Promovido para "${defendantVal}"`
    };

    const updatedVersions = [newVersion, ...versions];
    setVersions(updatedVersions);

    if (currentAnalysisId) {
      try {
        await updateAnalysisChatAndMinute(currentAnalysisId, chatMessages, updatedMinute, updatedVersions);
      } catch (dbErr) {
        console.warn("Could not save updated parties to DB:", dbErr);
      }
    }

    setIsQuickEditPartiesOpen(false);
    setUpdateNotification("Dados do Promovente (Autor), Réu e Processo ajustados e salvos com sucesso!");
    setTimeout(() => setUpdateNotification(null), 4000);
  };

  const handleSaveManualEdit = async () => {
    if (!result?.minute) return;
    setIsSavingManual(true);
    try {
      let updatedMinute: MinuteData;
      if (editMode === "structured") {
        const finalProcNum = editProcessNumber.trim() || minute.processNumber || "Autos do Processo";
        const finalAuthor = editAuthor.trim() || minute.parties?.author || "Parte Autora";
        const finalDefendant = editDefendant.trim() || minute.parties?.defendant || "Parte Ré";

        const fullText = [
          editHeader ? editHeader.toUpperCase() : "",
          editTitle ? `\n\n${editTitle.toUpperCase()}\n` : "",
          finalProcNum ? `\nProcesso nº: ${finalProcNum}` : "",
          finalAuthor ? `Autor(a): ${finalAuthor}` : "",
          finalDefendant ? `Réu/Ré: ${finalDefendant}` : "",
          editRelatorio ? `\n\nI - RELATÓRIO\n${editRelatorio}` : "",
          editFundamentacao ? `\n\nII - FUNDAMENTAÇÃO\n${editFundamentacao}` : "",
          editDispositivo ? `\n\nIII - DISPOSITIVO\n${editDispositivo}` : "",
          editClosing ? `\n\n${editClosing}` : `\n\nDocumento assinado digitalmente.`
        ].filter(Boolean).join("\n");

        updatedMinute = {
          ...minute,
          title: editTitle.trim() || minute.title || "SENTENÇA",
          header: editHeader,
          processNumber: finalProcNum,
          parties: {
            author: finalAuthor,
            defendant: finalDefendant
          },
          relatorio: editRelatorio,
          fundamentacao: editFundamentacao,
          dispositivo: editDispositivo,
          closing: editClosing,
          fullFormattedText: fullText
        };
      } else {
        updatedMinute = {
          ...minute,
          title: editTitle.trim() || minute.title || "SENTENÇA",
          fullFormattedText: editFullText
        };
      }

      // Update in active state
      onUpdateMinute(updatedMinute);

      // Create new explicit version
      const newVersion: MinuteVersion = {
        id: `v-${Date.now()}-edit`,
        versionNumber: versions.length + 1,
        label: `Edição Manual Direta #${versions.length + 1}`,
        timestamp: Date.now(),
        minute: updatedMinute,
        source: "editor",
        author: "Assessor Judicial",
        changeSummary: "Edição manual direta de minuta"
      };

      const updatedVersions = [newVersion, ...versions];
      setVersions(updatedVersions);

      // Persist to central Firestore
      if (currentAnalysisId) {
        try {
          await updateAnalysisChatAndMinute(currentAnalysisId, chatMessages, updatedMinute, updatedVersions);
        } catch (dbErr) {
          console.warn("Could not save manual edit version to DB:", dbErr);
        }
      }

      setManualSaveSuccess(true);
      setUpdateNotification("✅ Edição manual salva com sucesso! A minuta foi atualizada e arquivada no histórico.");
      if (topViewerRef.current) {
        topViewerRef.current.scrollIntoView({ behavior: "smooth" });
      }
      setTimeout(() => {
        setManualSaveSuccess(false);
        setActiveTab("formatted");
      }, 700);
      setTimeout(() => setUpdateNotification(null), 6000);
    } catch (err) {
      console.error("Erro ao salvar edição manual:", err);
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleCancelManualEdit = () => {
    setActiveTab("formatted");
  };

  const handleClearChatOnly = () => {
    setChatMessages([]);
    if (currentAnalysisId) {
      updateAnalysisChatAndMinute(currentAnalysisId, []);
    }
    if (onChatMessagesUpdated) {
      onChatMessagesUpdated([]);
    }
  };

  const handleCopyMinuteDirectly = async (targetMinute: MinuteData, msgId?: string) => {
    const success = await copyMinuteToClipboard(targetMinute);
    if (success) {
      if (msgId) {
        setCopiedMsgId(msgId);
        setTimeout(() => setCopiedMsgId(null), 2500);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  const handleExportDocxDirectly = async (targetMinute: MinuteData) => {
    setIsExportingDocx(true);
    try {
      await exportMinuteToDocx(targetMinute);
    } catch (err) {
      console.error("Error exporting DOCX:", err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleScrollToMainMinute = () => {
    setActiveTab("formatted");
    if (topViewerRef.current) {
      topViewerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const toggleMinuteExpansion = (msgId: string) => {
    setExpandedMinuteMsgIds((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleSendChat = async (promptToUse?: string) => {
    const message = promptToUse || chatInput;
    if (!message.trim() || isChatSending) return;

    const access = checkUserAiAccess(userProfile, user?.email);
    if (!access.canExecute) {
      requestOpenApiKeyModal(access.message);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          sender: "user",
          text: message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        {
          id: `agaia-err-${Date.now()}`,
          sender: "agaia",
          text: `⚠️ **Acesso com Chave de API Obrigatória**: ${access.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setChatInput("");
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatSending(true);

    try {
      // RESUMO EXECUTIVO: consome ~85% menos tokens que reenviar todo o processo bruto em PDF
      const compactExecutiveSummary = (result as any)?.holisticSynopsis
        ? (result as any).holisticSynopsis.substring(0, 3500)
        : (originalProcessText && originalProcessText.trim().length > 30
            ? originalProcessText.trim().substring(0, 1200)
            : (minute.relatorio ? minute.relatorio.substring(0, 1200) : "Processo sob análise do gabinete."));

      const response = await fetch("/api/chat-agaia", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          message: message,
          conversationHistory: chatMessages.slice(-4),
          executiveSummary: compactExecutiveSummary,
          currentMinute: {
            title: minute.title,
            header: minute.header,
            processNumber: minute.processNumber,
            judicialUnit: minute.judicialUnit,
            parties: minute.parties,
            relatorio: minute.relatorio?.substring(0, 1200),
            fundamentacao: minute.fundamentacao,
            dispositivo: minute.dispositivo,
          },
          customPromptText: customPromptText ? customPromptText.substring(0, 400) : "",
          cabinetTesesText: isTesesEnabled && cabinetTesesText ? cabinetTesesText.substring(0, 600) : "",
          isTesesEnabled: isTesesEnabled,
          paradigmModelTitle: isParadigmEnabled ? paradigmModelTitle : undefined,
          isParadigmEnabled: isParadigmEnabled,
        }),
      });

      let responseText = "";
      try {
        responseText = await response.text();
      } catch (readErr: any) {
        throw new Error("A conexão com o servidor foi interrompida momentaneamente pela rede. Por favor, tente novamente.");
      }

      if (!response.ok) {
        let errMessage = "Erro na comunicação com o Assessor Judicial.";
        try {
          const errData = JSON.parse(responseText.trim());
          if (errData?.error) errMessage = errData.error;
        } catch {
          errMessage = `Erro do servidor (${response.status}: ${response.statusText})`;
        }
        throw new Error(errMessage);
      }

      let data: any;
      try {
        data = JSON.parse(responseText.trim());
      } catch (parseErr: any) {
        console.error("Erro ao interpretar resposta do chat:", parseErr, responseText);
        throw new Error("A conexão com o Assessor Judicial foi interrompida momentaneamente pela rede. Por favor, tente novamente.");
      }

      checkResponseForRotatedKey(data);
      checkResponseForRotatedKey(response);

      let minuteWasUpdated = false;
      const msgId = `agaia-${Date.now()}`;

      let nextVersionsList = versions;
      if (data.hasMinuteUpdate && data.updatedMinute) {
        onUpdateMinute(data.updatedMinute);
        minuteWasUpdated = true;
        setUpdateNotification("Minuta judicial reescrita e atualizada com sucesso pelo Assessor Judicial!");
        setExpandedMinuteMsgIds((prev) => ({ ...prev, [msgId]: true }));
        setTimeout(() => setUpdateNotification(null), 5000);

        const newVerNum = versions.length + 1;
        const newVersion: MinuteVersion = {
          id: `v-${Date.now()}`,
          versionNumber: newVerNum,
          label: `Versão ${newVerNum} (Refino do Assistente)`,
          timestamp: Date.now(),
          minute: data.updatedMinute,
          source: "chat",
          promptOrInstruction: message,
          author: "Assistente / Gabinete",
        };
        nextVersionsList = [...versions, newVersion];
        setVersions(nextVersionsList);
      }

      if (onAddSessionTokens && data.usage?.totalTokenCount) {
        onAddSessionTokens(data.usage.totalTokenCount);
        recordApiExecution({
          label: "Consulta Chat / Reescrita",
          processNumber: minute?.processNumber || "Processo TJGO",
          model: data.modelUsed || "Gemini 3.7 Flash",
          promptTokens: data.usage.promptTokenCount,
          outputTokens: data.usage.candidatesTokenCount,
          totalTokens: data.usage.totalTokenCount,
          module: 'chat_refino',
        }).catch((e) => console.warn("Could not record chat api execution:", e));
      }

      const replyMsg: ChatMessage = {
        id: msgId,
        sender: "agaia",
        text: data.reply || "Resposta processada com base nos autos.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        hasMinuteUpdate: minuteWasUpdated,
        updatedMinute: data.hasMinuteUpdate && data.updatedMinute ? data.updatedMinute : undefined,
        suggestedActions: data.suggestedActions || [],
        usage: data.usage,
      };

      const updatedHistory = [...chatMessages, userMsg, replyMsg];
      setChatMessages(updatedHistory);

      if (currentAnalysisId) {
        updateAnalysisChatAndMinute(
          currentAnalysisId,
          updatedHistory,
          data.hasMinuteUpdate && data.updatedMinute ? data.updatedMinute : undefined,
          data.hasMinuteUpdate && data.updatedMinute ? nextVersionsList : undefined
        );
      }
      if (onChatMessagesUpdated) {
        onChatMessagesUpdated(
          updatedHistory,
          data.hasMinuteUpdate && data.updatedMinute ? data.updatedMinute : undefined
        );
      }
    } catch (err: any) {
      let errMsg = err.message || "Erro de conexão";
      if (
        errMsg.includes("JSON.parse") ||
        errMsg.includes("unexpected end of data") ||
        errMsg.includes("Unexpected end of JSON") ||
        errMsg.includes("Unexpected token") ||
        errMsg.includes("is not valid JSON") ||
        errMsg.includes("Failed to fetch") ||
        errMsg.includes("NetworkError") ||
        errMsg.includes("network error")
      ) {
        errMsg = "A conexão com o Assessor Judicial foi interrompida momentaneamente pela rede. Por favor, reenvie sua mensagem.";
      }
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "agaia",
        text: "Desculpe, ocorreu uma falha ao consultar o Assessor Judicial: " + errMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
      if (errMsg.includes("Erro 429") || errMsg.includes("Limite de requisições") || errMsg.includes("RESOURCE_EXHAUSTED")) {
         window.dispatchEvent(new CustomEvent("open-api-key-modal", { detail: { message: errMsg } }));
      }
    } finally {
      setIsChatSending(false);
    }
  };

  return (
    <div ref={topViewerRef} className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
      {/* Toast Notification when Minute is Auto-Updated by Chat */}
      {updateNotification && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 flex items-center justify-between font-medium animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{updateNotification}</span>
          </div>
          <button
            onClick={() => setUpdateNotification(null)}
            className="text-emerald-200 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header with quick actions */}
      <div className="p-3.5 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-sm text-slate-800">Resultado & Análise</h3>
          <span className="px-2 py-0.5 rounded bg-emerald-50 text-slate-800 font-mono text-[10px] font-bold">
            {minute.title || "ATO JUDICIAL"}
          </span>
          {result?.deduplicationStats && result.deduplicationStats.duplicatesFound > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200" title={`${result.deduplicationStats.duplicatesFound} arquivos ou blocos duplicados nos autos foram deduplicados inteligentemente.`}>
              <Zap className="w-3 h-3 text-emerald-600" />
              <span>{result.deduplicationStats.duplicatesFound} docs deduplicados</span>
              <span className="text-emerald-700 font-mono font-bold">(-{Math.round(result.deduplicationStats.charsSaved / 4)} tokens)</span>
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div id="tour-result-actions" className="flex items-center flex-wrap gap-1.5 text-xs">
          {onInjectTextAsParadigm && !hasLinkedParadigm && (
            <button
              id="tour-save-tese"
              onClick={() => {
                const procNum = minute.processNumber || result?.minute?.processNumber || "";
                const fullText = (minute.fullFormattedText && minute.fullFormattedText.trim().length > 0)
                  ? minute.fullFormattedText
                  : [
                      minute.header,
                      minute.title,
                      minute.processNumber ? `Processo nº: ${minute.processNumber}` : '',
                      minute.parties?.author ? `Promovente (Autor): ${minute.parties.author}` : '',
                      minute.parties?.defendant ? `Promovido (Réu): ${minute.parties.defendant}` : '',
                      minute.relatorio ? `I - RELATÓRIO\n\n${minute.relatorio.replace(/\\\\n/g, '\\n')}` : '',
                      minute.fundamentacao ? `II - FUNDAMENTAÇÃO\n\n${minute.fundamentacao.replace(/\\\\n/g, '\\n')}` : '',
                      minute.dispositivo ? `III - DISPOSITIVO\n\n${minute.dispositivo.replace(/\\\\n/g, '\\n')}` : '',
                      minute.closing ? minute.closing.replace(/\\n/g, "\n") : ""
                    ].filter(Boolean).join('\n\n');
                onInjectTextAsParadigm(fullText, procNum, "Direito do Consumidor");
              }}
              className="px-2.5 py-1 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              title="Salvar esta minuta integral no Caderno de Teses e Modelos do Gabinete"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Salvar Tese</span>
            </button>
          )}
          {/* Raio-X da Minuta */}
          {onOpenXRay && (
            <button
              onClick={onOpenXRay}
              className="px-2.5 py-1 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              title="Verificar Parâmetros da Análise (Raio-X)"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
              <span>Raio-X da Minuta</span>
            </button>
          )}

          {onGoHome && (
            <button
              onClick={onGoHome}
              className="px-2.5 py-1 border border-emerald-200 bg-emerald-50 hover:bg-slate-200 text-slate-800 font-bold rounded flex items-center gap-1 transition cursor-pointer shadow-2xs"
              title="Voltar para a Página Inicial do Assessor Fabrício"
            >
              <Home className="w-3 h-3 text-emerald-600" />
              <span>Página Inicial</span>
            </button>
          )}

          <button
            onClick={onToggleCollapseForm}
            className={`px-2.5 py-1 border rounded font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
              isFormCollapsed
                ? "bg-emerald-50 border-emerald-200 text-slate-800 hover:bg-emerald-50"
                : "bg-emerald-50 border-emerald-200 text-slate-700 hover:bg-slate-200"
            }`}
            title={isFormCollapsed ? "Mostrar visualização compartilhada com a execução de prompts" : "Expandir minuta e ocultar formulário de prompts"}
          >
            {isFormCollapsed ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                <span className="text-xs">Mostrar visualização compartilhada com a execução de prompts</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="text-xs">Expandir minuta (ocultar prompts)</span>
              </>
            )}
          </button>

          <button
            onClick={() => setActiveTab("editor")}
            className={`px-2.5 py-1 border rounded font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
              activeTab === "editor"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "border-emerald-200 bg-white text-slate-700 hover:bg-emerald-50"
            }`}
            title="Editar manualmente o texto e salvar diretamente"
          >
            <Edit3 className="w-3 h-3 text-slate-800" />
            <span>Editar</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-2.5 py-1 border border-emerald-200 bg-white hover:bg-emerald-50 hover:border-slate-400 text-slate-800 font-semibold rounded flex items-center gap-1 transition cursor-pointer shadow-2xs"
            title="Copiar texto formatado para Projudi ou Word"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-600" />}
            <span>{copied ? "Copiado!" : "Copiar"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded flex items-center gap-1 transition cursor-pointer shadow-2xs"
            title="Gerar PDF / Imprimir"
          >
            <Printer className="w-3 h-3" />
            <span>Gerar PDF</span>
          </button>

          <button
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className="px-2.5 py-1 bg-blue-700 hover:bg-emerald-600 text-white font-semibold rounded flex items-center gap-1 transition cursor-pointer shadow-2xs"
            title="Baixar em formato Word (.docx)"
          >
            <Download className="w-3 h-3" />
            <span>{isExportingDocx ? "..." : "DOCX"}</span>
          </button>

          {onDeleteMinute && (
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-semibold rounded flex items-center gap-1 transition cursor-pointer shadow-2xs"
              title="Excluir esta minuta / ato do processo"
            >
              <Trash2 className="w-3 h-3 text-rose-600" />
              <span>Excluir</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Minute Deletion */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Excluir esta Minuta?</h3>
                <p className="text-xs text-slate-500">Esta ação removerá a minuta e seus dados associados.</p>
              </div>
            </div>
            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 font-mono">
              <p><strong>Processo:</strong> {minute.processNumber || result?.minute?.processNumber || "Processo s/ nº"}</p>
              <p><strong>Ato:</strong> {minute.title || "Minuta Judicial"}</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setIsConfirmingDelete(false);
                  if (onDeleteMinute) onDeleteMinute();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Parties & Process Modal */}
      {isQuickEditPartiesOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3 text-emerald-800">
                <div className="p-2.5 bg-emerald-100 rounded-xl shrink-0">
                  <UserCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ajustar Dados das Partes e dos Autos</h3>
                  <p className="text-xs text-slate-500">Corrija o nome do autor, réu e número do processo diretamente na minuta.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickEditPartiesOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 font-sans">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Número do Processo (CNJ):
                </label>
                <input
                  type="text"
                  value={quickProcessNumber}
                  onChange={(e) => setQuickProcessNumber(e.target.value)}
                  placeholder="Ex: 5001234-56.2024.8.09.0105"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Promovente (Parte Autora / Requerente):
                </label>
                <input
                  type="text"
                  value={quickAuthor}
                  onChange={(e) => setQuickAuthor(e.target.value)}
                  placeholder="Nome completo do(a) Autor(a)"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Insira o nome da pessoa física ou jurídica do polo ativo.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Promovido (Parte Ré / Requerida):
                </label>
                <input
                  type="text"
                  value={quickDefendant}
                  onChange={(e) => setQuickDefendant(e.target.value)}
                  placeholder="Nome completo da Parte Ré / Empresa"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsQuickEditPartiesOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveQuickEditParties}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Ajuste</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div id="tour-result-tabs" className="flex items-center border-b border-slate-200 bg-slate-50 px-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("formatted")}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "formatted"
              ? "border-emerald-600 text-slate-800 bg-white"
              : "border-transparent text-slate-600 hover:text-emerald-600"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Minuta do Ato</span>
          {isMinuteModified && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-50 text-slate-800 border border-emerald-200 font-semibold" title="Minuta com refinos ou edições">
              Refinada
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("preAudit")}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "preAudit"
              ? "border-emerald-600 text-emerald-950 bg-emerald-50/50 shadow-xs font-black"
              : "border-transparent text-slate-600 hover:text-emerald-600"
          }`}
          title="Ver o certificado e o diagnóstico completo de auditoria prévia da minuta contra os autos do PDF"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Pré-Auditoria dos Autos</span>
          {result?.auditAnalysis?.preAudit ? (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-600 text-white font-bold shadow-2xs">
              {result.auditAnalysis.preAudit.score}%
            </span>
          ) : result?.auditAnalysis ? (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-600 text-white font-bold shadow-2xs">
              100%
            </span>
          ) : null}
        </button>

        {result?.holisticSynopsis && (
          <button
            onClick={() => setActiveTab("synopsis")}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "synopsis"
                ? "border-amber-600 text-amber-950 bg-amber-50/70 font-black shadow-xs"
                : "border-transparent text-slate-600 hover:text-amber-600"
            }`}
            title="Visualizar a Sinopse Holística Forense dos autos em 5 pilares estruturados sem omissões fáticas"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Sinopse Holística dos Autos</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-200 text-amber-900 border border-amber-300 font-bold">
              5 Pilares
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("editor")}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "editor"
              ? "border-emerald-600 text-slate-800 bg-white shadow-xs"
              : "border-transparent text-slate-600 hover:text-emerald-600"
          }`}
          title="Editar manualmente o texto da minuta e salvar diretamente"
        >
          <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Editar Minuta</span>
        </button>

        <button
          onClick={() => setActiveTab("original")}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "original"
              ? "border-amber-600 text-amber-900 bg-white"
              : "border-transparent text-slate-600 hover:text-emerald-600"
          }`}
          title="Acessar o 1º modelo original gerado pela IA antes de quaisquer alterações no chat ou edições manuais"
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-600" />
          <span>1º Modelo Original</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-100 text-amber-800 border border-amber-300 font-bold">
            Base
          </span>
        </button>

        <button
          onClick={() => setActiveTab("compare")}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "compare"
              ? "border-indigo-600 text-indigo-900 bg-white"
              : "border-transparent text-slate-600 hover:text-emerald-600"
          }`}
          title="Comparar versões lado a lado com destaque de alterações"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Comparar Versões</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "history"
              ? "border-indigo-600 text-indigo-900 bg-white"
              : "border-transparent text-slate-600 hover:text-emerald-600"
          }`}
          title="Histórico cronológico de minutas e refinos salvos"
        >
          <History className="w-3.5 h-3.5 text-slate-600" />
          <span>Histórico</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">
            {versions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("fatoVsProva")}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "fatoVsProva"
              ? "border-emerald-600 text-slate-800 bg-white"
              : "border-transparent text-slate-600 hover:text-emerald-600"
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
          Fato vs. Prova
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
            {result.auditAnalysis?.fatoVsProva?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("compliance")}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "compliance"
              ? "border-emerald-600 text-slate-800 bg-white"
              : "border-transparent text-slate-600 hover:text-emerald-600"
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-emerald-600" />
          Checklist Processual
        </button>

        <button
          onClick={() => setActiveTab("calculator")}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "calculator"
              ? "border-emerald-600 text-slate-800 bg-white"
              : "border-transparent text-slate-600 hover:text-emerald-600"
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-purple-600" />
          Lei 14.905/2024
        </button>

        <button
          onClick={() => setActiveTab("projudi")}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "projudi"
              ? "border-emerald-600 text-slate-800 bg-white"
              : "border-transparent text-slate-600 hover:text-emerald-600"
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>Texto Projudi</span>
          {effectiveTpu && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-blue-100 text-blue-800 font-bold border border-blue-200">
              TPU {effectiveTpu.codigoTpu}
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <div ref={tabContentRef} className="p-5 overflow-y-auto max-h-[520px] relative">
        {!hasLinkedParadigm && (
          <FloatingTextSelectionToolbar
            containerRef={tabContentRef}
            onInjectAsParadigm={handleTriggerInjectParadigm}
          />
        )}
        {/* Tab 1: Formatted Document View */}
        {activeTab === "formatted" && (
          <div className="space-y-4">
            {/* Automatic Pre-Audit Security Seal & Certificate */}
            {result?.auditAnalysis && (
              <div className="max-w-4xl mx-auto">
                <PreAuditCard
                  preAudit={result.auditAnalysis.preAudit}
                  auditAnalysis={result.auditAnalysis}
                  onOpenAuditorModal={onOpenXRay}
                  compact={true}
                />
              </div>
            )}

            {result?.paradigmUsed && (
              <div className="max-w-4xl mx-auto px-3.5 py-2.5 bg-slate-900 text-white rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans shadow-xs">
                <div className="flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-300">Minuta com Paradigma Vinculado: </span>
                    <span className="text-slate-200">"{result.paradigmUsed.title}"</span>
                    <span className="text-[11px] text-slate-400 block sm:inline sm:ml-2">
                      (Entendimento, estilo e dispositivo espelhados do modelo do juiz)
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-bold border border-slate-700 uppercase shrink-0">
                  Caso Idêntico
                </span>
              </div>
            )}

            {result?.cadernoTesesApplied && (
              <div className="max-w-4xl mx-auto px-3.5 py-2.5 bg-emerald-950 text-white rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans shadow-xs border border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-300">Caderno de Teses do Gabinete Aplicado: </span>
                    <span className="text-slate-200">Diretrizes normativas, teses vinculantes e critérios probatórios do juiz aplicados com rigor na minuta.</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 text-[10px] font-bold border border-emerald-700 uppercase shrink-0">
                  Teses Vinculantes Ativas
                </span>
              </div>
            )}

            {isMinuteModified && (
              <div className="max-w-4xl mx-auto px-3.5 py-2.5 bg-emerald-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700 font-sans shadow-2xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" />
                  <span>Esta minuta foi refinada com o Assistente ou editada. O modelo original está salvo e protegido.</span>
                </div>
                <button
                  onClick={() => setActiveTab("original")}
                  className="text-amber-800 hover:text-amber-950 font-bold bg-amber-100/70 hover:bg-amber-200/80 px-2.5 py-1 rounded border border-amber-300 transition cursor-pointer self-start sm:self-auto flex items-center gap-1"
                  title="Acessar o 1º modelo original gerado"
                >
                  <Bookmark className="w-3 h-3 text-amber-700" />
                  <span>Ver 1º Modelo Original</span>
                </button>
              </div>
            )}

            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-10 border border-slate-200 rounded-lg shadow-2xs font-serif text-slate-900 text-xs sm:text-sm leading-relaxed space-y-5 select-text">
              {/* Judge Premium Seal Badge */}
              {isJudge && (
                <div className="flex items-center justify-between p-2.5 bg-amber-50/80 border border-amber-300 rounded-lg text-amber-950 font-sans text-xs">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold text-amber-950">Gabinete do Magistrado: </span>
                      <span className="text-amber-900 font-medium">Visualização oficial e chancela decisória</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-200 border border-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                    Magistrado Titular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b border-emerald-200">
                <p className="font-bold text-xs uppercase tracking-wider text-slate-600 font-sans">
                  PODER JUDICIÁRIO DO ESTADO DE GOIÁS
                </p>
                <p className="font-bold text-sm text-slate-900 font-sans">
                  {minute.header || "JUIZADO ESPECIAL CÍVEL E CRIMINAL DE MINEIROS - TJGO"}
                </p>
                <div className="pt-2">
                  <span className="inline-block font-sans font-bold text-sm tracking-widest text-slate-950 uppercase px-4 py-0.5 border-y-2 border-emerald-600">
                    {minute.title}
                  </span>
                </div>
              </div>

              {/* Meta Information Box */}
              <div id="tour-meta-parties-box" className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-sans text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                  <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Identificação dos Autos & Polos</span>
                  <button
                    type="button"
                    onClick={handleOpenQuickEditParties}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition cursor-pointer"
                    title="Ajustar ou corrigir manualmente o Nome do Promovente (Autor), Promovido (Réu) ou Número do Processo"
                  >
                    <Edit3 className="w-3 h-3 text-emerald-600" />
                    <span>Ajustar Dados do Autor / Partes</span>
                  </button>
                </div>
                <div>
                  <strong>Processo nº:</strong> <span className="font-mono ml-1 font-medium">{displayProcessNumber}</span>
                </div>
                <div>
                  <strong>Promovente (Autor):</strong> <span className="ml-1 font-semibold text-slate-900">{displayAuthor}</span>
                </div>
                <div>
                  <strong>Promovido (Réu):</strong> <span className="ml-1 font-medium text-slate-800">{displayDefendant}</span>
                </div>
                {effectiveTpu && (
                  <div className="pt-1.5 mt-1 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                    <span className="text-blue-900 font-medium flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span><strong>Movimentação TPU CNJ:</strong> {effectiveTpu.codigoTpu} - {effectiveTpu.descricaoMovimento}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold border border-blue-200 text-[10px]">
                      {effectiveTpu.subtipoResultado}
                    </span>
                  </div>
                )}
                {result?.cadernoTesesApplied && (
                  <div className="pt-1.5 mt-1 border-t border-slate-200 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-emerald-900 font-medium flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span><strong>Caderno de Teses do Gabinete:</strong> Diretrizes vinculantes aplicadas com rigor na decisão</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-200 text-[10px]">
                        {result.auditAnalysis?.tesesGabineteCheck?.resumoTeses?.length ? `${result.auditAnalysis.tesesGabineteCheck.resumoTeses.length} Teses Aplicadas` : "Teses Vinculadas"}
                      </span>
                    </div>
                    {Array.isArray(result.auditAnalysis?.tesesGabineteCheck?.resumoTeses) && result.auditAnalysis.tesesGabineteCheck.resumoTeses.length > 0 && (
                      <div className="bg-emerald-50/70 p-2 rounded border border-emerald-200/60 text-emerald-900 space-y-1">
                        <span className="font-semibold text-emerald-950 block text-[10px] uppercase tracking-wider">
                          Diretrizes do gabinete computadas na fundamentação:
                        </span>
                        {result.auditAnalysis.tesesGabineteCheck.resumoTeses.map((tese, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{tese}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 1: Relatório */}
              <div className="space-y-1.5">
                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  I - RELATÓRIO
                </h3>
                <div className="text-justify text-slate-800 leading-relaxed markdown-body bg-transparent"><ReactMarkdown>{(minute.relatorio || "Dispensado o relatório nos termos do art. 38 da Lei nº 9.099/95.").replace(/\\n/g, '\n')}</ReactMarkdown></div>
              </div>

              {/* Section 2: Fundamentação */}
              <div className="space-y-1.5 pt-2">
                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  II - FUNDAMENTAÇÃO
                </h3>
                <div className="text-justify text-slate-800 leading-relaxed markdown-body bg-transparent"><ReactMarkdown>{(minute.fundamentacao || "Fundamentação jurídica nos autos.").replace(/\\n/g, '\n')}</ReactMarkdown></div>
              </div>

              {/* Section 3: Dispositivo */}
              <div className="space-y-1.5 pt-2">
                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  III - DISPOSITIVO
                </h3>
                <div className="text-justify text-slate-900 leading-relaxed font-medium markdown-body bg-transparent"><ReactMarkdown>{(minute.dispositivo || "Dispositivo do ato judicial.").replace(/\\n/g, '\n')}</ReactMarkdown></div>
              </div>

              {/* Closing */}
              <div className="text-center pt-6 font-sans font-semibold text-xs text-slate-700 whitespace-pre-line">
                {(minute.closing || "Mineiros - GO, data da assinatura digital.\n\nJuiz(a) de Direito").replace(/\\n/g, "\n")}
              </div>
            </div>
          </div>
        )}

        {/* Tab Pre-Audit: Auditoria Prévia dos Autos */}
        {activeTab === "preAudit" && (
          <div className="max-w-4xl mx-auto space-y-4">
            <PreAuditCard
              preAudit={result?.auditAnalysis?.preAudit}
              auditAnalysis={result?.auditAnalysis}
              onOpenAuditorModal={onOpenXRay}
              compact={false}
            />
          </div>
        )}

        {/* Tab 2: 1º Modelo Original Gerado */}
        {activeTab === "original" && (
          <div className="space-y-4">
            {/* Informational & Action Header Card */}
            <div className="max-w-4xl mx-auto bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0 text-amber-800 mt-0.5">
                    <Bookmark className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-amber-950">
                        1º Modelo Original Gerado (Preservado)
                      </h4>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] font-bold">
                        Versão Base Inicial
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900/80 leading-relaxed mt-0.5">
                      Este é o primeiro modelo gerado pela IA antes de quaisquer alterações no Chat ou edições manuais. Você pode consultá-lo, copiá-lo, exportá-lo para Word ou restaurá-lo como a minuta ativa.
                    </p>
                  </div>
                </div>

                {/* Actions for Original Draft */}
                <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto flex-shrink-0">
                  <button
                    onClick={handleRestoreOriginal}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    title="Substituir a minuta atual por este modelo original para continuar trabalhando a partir dele"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar como Minuta Ativa</span>
                  </button>

                  <button
                    onClick={handleCopyOriginal}
                    className="px-2.5 py-1.5 bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-950 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    title="Copiar texto integral do modelo original"
                  >
                    {copiedOriginal ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-700" />}
                    <span>{copiedOriginal ? "Copiado!" : "Copiar Original"}</span>
                  </button>

                  <button
                    onClick={handleExportOriginalDocx}
                    disabled={isExportingOriginalDocx}
                    className="px-2.5 py-1.5 bg-blue-700 hover:bg-emerald-600 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    title="Baixar modelo original em DOCX (Word)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExportingOriginalDocx ? "..." : "DOCX"}</span>
                  </button>

                  <button
                    onClick={handlePrintOriginal}
                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    title="Imprimir ou salvar em PDF o modelo original"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Formatted View of Original Minute */}
            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-10 border border-slate-200 rounded-lg shadow-2xs font-serif text-slate-900 text-xs sm:text-sm leading-relaxed space-y-5 select-text">
              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b border-emerald-200">
                <p className="font-bold text-xs uppercase tracking-wider text-slate-600 font-sans">
                  PODER JUDICIÁRIO DO ESTADO DE GOIÁS
                </p>
                <p className="font-bold text-sm text-slate-900 font-sans">
                  {originalMinute.header || "JUIZADO ESPECIAL CÍVEL E CRIMINAL DE MINEIROS - TJGO"}
                </p>
                <div className="pt-2">
                  <span className="inline-block font-sans font-bold text-sm tracking-widest text-slate-950 uppercase px-4 py-0.5 border-y-2 border-emerald-600">
                    {originalMinute.title}
                  </span>
                </div>
              </div>

              {/* Meta Information Box */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 font-sans text-xs space-y-1">
                <div>
                  <strong>Processo nº:</strong> <span className="font-mono">{displayProcessNumber}</span>
                </div>
                <div>
                  <strong>Promovente (Autor):</strong> {displayAuthor}
                </div>
                <div>
                  <strong>Promovido (Réu):</strong> {displayDefendant}
                </div>
              </div>

              {/* Section 1: Relatório */}
              <div className="space-y-1.5">
                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  I - RELATÓRIO
                </h3>
                <div className="text-justify text-slate-800 leading-relaxed markdown-body bg-transparent"><ReactMarkdown>{(originalMinute.relatorio || "Dispensado o relatório nos termos do art. 38 da Lei nº 9.099/95.").replace(/\\n/g, '\n')}</ReactMarkdown></div>
              </div>

              {/* Section 2: Fundamentação */}
              <div className="space-y-1.5 pt-2">
                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  II - FUNDAMENTAÇÃO
                </h3>
                <div className="text-justify text-slate-800 leading-relaxed markdown-body bg-transparent"><ReactMarkdown>{(originalMinute.fundamentacao || "Fundamentação jurídica nos autos.").replace(/\\n/g, '\n')}</ReactMarkdown></div>
              </div>

              {/* Section 3: Dispositivo */}
              <div className="space-y-1.5 pt-2">
                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                  III - DISPOSITIVO
                </h3>
                <div className="text-justify text-slate-900 leading-relaxed font-medium markdown-body bg-transparent"><ReactMarkdown>{(originalMinute.dispositivo || "Dispositivo do ato judicial.").replace(/\\n/g, '\n')}</ReactMarkdown></div>
              </div>

              {/* Closing */}
              <div className="text-center pt-6 font-sans font-semibold text-xs text-slate-700 whitespace-pre-line">
                {(originalMinute.closing || "Mineiros - GO, data da assinatura digital.\n\nJuiz(a) de Direito").replace(/\\n/g, "\n")}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Comparador de Versões */}
        {activeTab === "compare" && (
          <VersionCompareView
            currentMinute={minute}
            originalMinute={originalMinute}
            versions={versions}
            onSelectActiveMinute={handleSelectActiveMinute}
          />
        )}

        {/* Tab: Histórico Cronológico de Versões */}
        {activeTab === "history" && (
          <VersionHistoryView
            currentMinute={minute}
            originalMinute={originalMinute}
            versions={versions}
            onSelectActiveMinute={handleSelectActiveMinute}
            onNavigateToCompare={() => setActiveTab("compare")}
            onDeleteVersion={handleDeleteVersion}
            onClearVersionHistory={handleClearVersionHistory}
          />
        )}

        {/* Tab 2: Live Direct Manual Editor */}
        {activeTab === "editor" && (
          <div className="space-y-4">
            {/* Editor Top Control Bar */}
            <div className="bg-emerald-600 text-white p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-slate-800/40 flex items-center justify-center text-slate-400">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs sm:text-sm text-white">Edição Manual da Minuta</h4>
                    <span className="px-2 py-0.2 rounded-full bg-emerald-600/90 border border-slate-800/40 text-emerald-200 font-mono text-[10px] font-bold">
                      Edição Direta
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200">
                    Faça seus ajustes livremente e clique em <b>Salvar</b> para gravar o novo modelo.
                  </p>
                </div>
              </div>

              {/* Mode Switcher & Action Buttons */}
              <div className="flex items-center flex-wrap gap-2">
                <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditMode("structured")}
                    className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                      editMode === "structured"
                        ? "bg-emerald-600 text-white shadow-xs font-bold"
                        : "text-emerald-200 hover:text-white"
                    }`}
                  >
                    Por Seções
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // If switching to raw mode, make sure full text is up to date
                      if (editMode === "structured") {
                        const fullText = [
                          editHeader ? editHeader.toUpperCase() : "",
                          editTitle ? `\n\n${editTitle.toUpperCase()}\n` : "",
                          editProcessNumber ? `\nProcesso nº: ${editProcessNumber}` : (minute.processNumber ? `\nProcesso nº: ${minute.processNumber}` : ""),
                          editAuthor ? `Autor(a): ${editAuthor}` : (minute.parties?.author ? `Autor(a): ${minute.parties.author}` : ""),
                          editDefendant ? `Réu/Ré: ${editDefendant}` : (minute.parties?.defendant ? `Réu/Ré: ${minute.parties.defendant}` : ""),
                          editRelatorio ? `\n\nI - RELATÓRIO\n${editRelatorio}` : "",
                          editFundamentacao ? `\n\nII - FUNDAMENTAÇÃO\n${editFundamentacao}` : "",
                          editDispositivo ? `\n\nIII - DISPOSITIVO\n${editDispositivo}` : "",
                          editClosing ? `\n\n${editClosing}` : `\n\nDocumento assinado digitalmente.`
                        ].filter(Boolean).join("\n");
                        setEditFullText(fullText);
                      }
                      setEditMode("raw");
                    }}
                    className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                      editMode === "raw"
                        ? "bg-emerald-600 text-white shadow-xs font-bold"
                        : "text-emerald-200 hover:text-white"
                    }`}
                  >
                    Texto Integral
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCancelManualEdit}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-emerald-200 hover:text-white text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveManualEdit}
                  disabled={isSavingManual}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer border border-slate-400/50"
                  title="Salvar alterações manuais, atualizar a minuta e arquivar no histórico de versões"
                >
                  {isSavingManual ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : manualSaveSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Salvo!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-white" />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Mode 1: Structured Sections */}
            {editMode === "structured" && (
              <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Título do Ato (ex: SENTENÇA, DECISÃO INTERLOCUTÓRIA):
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full p-2.5 text-xs font-bold border border-emerald-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-800 focus:border-slate-800 font-sans uppercase"
                      placeholder="Ex: SENTENÇA CÍVEL"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cabeçalho / Comarca / Juízo:
                    </label>
                    <input
                      type="text"
                      value={editHeader}
                      onChange={(e) => setEditHeader(e.target.value)}
                      className="w-full p-2.5 text-xs border border-emerald-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-800 focus:border-slate-800 font-sans"
                      placeholder="Ex: TRIBUNAL DE JUSTIÇA DO ESTADO DE GOIÁS - JUIZADO ESPECIAL CÍVEL"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Processo nº:
                    </label>
                    <input
                      type="text"
                      value={editProcessNumber}
                      onChange={(e) => setEditProcessNumber(e.target.value)}
                      className="w-full p-2.5 text-xs border border-emerald-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-800 focus:border-slate-800 font-mono"
                      placeholder="0000000-00.0000.0.00.0000"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Promovente (Parte Autora):
                    </label>
                    <input
                      type="text"
                      value={editAuthor}
                      onChange={(e) => setEditAuthor(e.target.value)}
                      className="w-full p-2.5 text-xs border border-emerald-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-800 focus:border-slate-800 font-sans"
                      placeholder="Nome completo do(a) Autor(a)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Promovido (Parte Ré):
                    </label>
                    <input
                      type="text"
                      value={editDefendant}
                      onChange={(e) => setEditDefendant(e.target.value)}
                      className="w-full p-2.5 text-xs border border-emerald-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-800 focus:border-slate-800 font-sans"
                      placeholder="Nome completo do(a) Réu/Ré"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      I - RELATÓRIO:
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {editRelatorio.length} caracteres
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={editRelatorio}
                    onChange={(e) => setEditRelatorio(e.target.value)}
                    className="w-full p-3.5 text-xs border border-emerald-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-800 focus:border-slate-800 font-serif leading-relaxed"
                    placeholder="Redija ou edite o relatório fático do processo..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      II - FUNDAMENTAÇÃO:
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {editFundamentacao.length} caracteres
                    </span>
                  </div>
                  <textarea
                    rows={10}
                    value={editFundamentacao}
                    onChange={(e) => setEditFundamentacao(e.target.value)}
                    className="w-full p-3.5 text-xs border border-emerald-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-800 focus:border-slate-800 font-serif leading-relaxed"
                    placeholder="Redija ou edite a fundamentação jurídica, teses aplicadas e valoração das provas..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      III - DISPOSITIVO:
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {editDispositivo.length} caracteres
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={editDispositivo}
                    onChange={(e) => setEditDispositivo(e.target.value)}
                    className="w-full p-3.5 text-xs border border-emerald-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-800 focus:border-slate-800 font-serif leading-relaxed font-medium"
                    placeholder="Redija ou edite a conclusão resolutiva, procedência/improcedência e consectários legais..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fechamento / Local e Data:
                  </label>
                  <input
                    type="text"
                    value={editClosing}
                    onChange={(e) => setEditClosing(e.target.value)}
                    className="w-full p-2.5 text-xs border border-emerald-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-800 focus:border-slate-800 font-serif"
                    placeholder="Ex: Goiânia-GO, data da assinatura digital."
                  />
                </div>
              </div>
            )}

            {/* Mode 2: Raw Full Continuous Text */}
            {editMode === "raw" && (
              <div className="space-y-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Texto Completo da Minuta (Edição Contínua):
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {editFullText.length} caracteres
                  </span>
                </div>
                <textarea
                  rows={20}
                  value={editFullText}
                  onChange={(e) => setEditFullText(e.target.value)}
                  className="w-full p-4 text-xs font-serif leading-relaxed border border-emerald-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-800 focus:border-slate-800"
                  placeholder="Edite o texto integral da minuta..."
                />
              </div>
            )}

            {/* Bottom Save Bar for Quick Access */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">
                Concluiu suas edições?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelManualEdit}
                  className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveManualEdit}
                  disabled={isSavingManual}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Fato vs. Prova */}
        {activeTab === "fatoVsProva" && (
          <FatoVsProvaPanel items={result.auditAnalysis?.fatoVsProva || []} />
        )}

        {/* Tab: Sinopse Holística dos Autos */}
        {activeTab === "synopsis" && result?.holisticSynopsis && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-700" />
                  <h4 className="font-bold text-sm text-amber-950">
                    Sinopse Holística Forense dos Autos (5 Pilares)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                    Extração Integral Sem Supressões
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  Visão executiva e profunda de toda a dinâmica processual (polos, narrativa fática, preliminares, acervo probatório completo e decisões prévias), elaborada para subsidiar com fidelidade a decisão judicial e economizar tokens.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.holisticSynopsis || "");
                    setUpdateNotification("Sinopse Holística copiada para a área de transferência!");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Copiar texto integral da Sinopse Holística"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Sinopse</span>
                </button>
              </div>
            </div>

            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs font-serif text-slate-800 leading-relaxed text-sm whitespace-pre-wrap selection:bg-amber-100 selection:text-amber-950">
              {result.holisticSynopsis}
            </div>
          </div>
        )}

        {/* Tab 4: Compliance */}
        {activeTab === "compliance" && <ComplianceChecklist audit={result.auditAnalysis} />}

        {/* Tab 5: Calculator */}
        {activeTab === "calculator" && <ConsectariosCalculator />}

        {/* Tab 6: Projudi / Raw Text */}
        {activeTab === "projudi" && (
          <div className="space-y-3.5">
            {/* CARD: Indicação Tipo de Movimentação TPU CNJ no Projudi */}
            {effectiveTpu && (
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-slate-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-blue-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-600 text-white rounded-lg shadow-2xs shrink-0">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-blue-950 uppercase tracking-wide">
                          Indicação de Movimentação TPU CNJ • PROJUDI
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-2xs">
                          Código TPU: {effectiveTpu.codigoTpu}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                          {effectiveTpu.tipoAto}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-blue-900 mt-0.5">
                        {effectiveTpu.descricaoMovimento}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(effectiveTpu.codigoTpu);
                        setCopiedTpuCode(true);
                        setTimeout(() => setCopiedTpuCode(false), 2000);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold bg-white text-blue-900 hover:bg-blue-100 rounded-lg border border-blue-300 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Copiar apenas o código numérico TPU para colar na busca do PROJUDI"
                    >
                      {copiedTpuCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-blue-700" />}
                      <span>{copiedTpuCode ? "Código Copiado!" : `Copiar Código ${effectiveTpu.codigoTpu}`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const summary = `INFORMAÇÕES PARA LANÇAMENTO NO PROJUDI / TJGO:
- Tipo de Ato: ${effectiveTpu.tipoAto}
- Código TPU CNJ: ${effectiveTpu.codigoTpu}
- Movimentação TPU: ${effectiveTpu.descricaoMovimento}
- Resultado: ${effectiveTpu.subtipoResultado}
- Prazo Processual: ${effectiveTpu.prazoSecretaria || "15 dias úteis"}
- Fila / Pendência: ${effectiveTpu.filaProjudi || "Aguardando Intimação"}
- Orientações: ${effectiveTpu.observacoesLancamento || "Lançar movimentação e intimar as partes."}`;
                        navigator.clipboard.writeText(summary);
                        setCopiedTpuSummary(true);
                        setTimeout(() => setCopiedTpuSummary(false), 2000);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Copiar todos os dados de lançamento processual para a secretaria"
                    >
                      {copiedTpuSummary ? <Check className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
                      <span>{copiedTpuSummary ? "Dados Copiados!" : "Copiar Ficha PROJUDI"}</span>
                    </button>
                  </div>
                </div>

                {/* Grid with 3 cards: Resultado, Prazo, Fila */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-white/90 p-2.5 rounded-lg border border-blue-200">
                    <span className="text-[10px] uppercase font-bold text-blue-600 block">Subtipo / Resultado</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{effectiveTpu.subtipoResultado}</span>
                  </div>

                  <div className="bg-white/90 p-2.5 rounded-lg border border-blue-200">
                    <span className="text-[10px] uppercase font-bold text-blue-600 block">Prazo Secretaria / Partes</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{effectiveTpu.prazoSecretaria || "15 dias úteis"}</span>
                  </div>

                  <div className="bg-white/90 p-2.5 rounded-lg border border-blue-200">
                    <span className="text-[10px] uppercase font-bold text-blue-600 block">Fila / Pendência no PROJUDI</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{effectiveTpu.filaProjudi || "Aguardando Intimação"}</span>
                  </div>
                </div>

                {effectiveTpu.observacoesLancamento && (
                  <div className="text-[11px] text-blue-900 bg-blue-100/60 p-2 rounded-lg border border-blue-200 flex items-start gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                    <span><strong>Orientações de Secretaria:</strong> {effectiveTpu.observacoesLancamento}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-emerald-600/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-emerald-200">
                  Texto contínuo pronto para colagem no Projudi / PJe:
                </span>
                {projudiSelection.length > 0 && (
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full animate-pulse">
                    {projudiSelection.length} caracteres selecionados
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const textToInject = projudiSelection.trim() || minute.fullFormattedText;
                    if (textToInject) {
                      handleTriggerInjectParadigm(textToInject);
                    }
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition cursor-pointer ${
                    projudiSelection.length > 0
                      ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white ring-2 ring-amber-400 ring-offset-1"
                      : "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 border border-amber-300 dark:border-amber-800"
                  }`}
                  title={
                    projudiSelection.length > 0
                      ? "Injetar trecho selecionado no Caderno de Teses do Gabinete"
                      : "Injetar texto integral no Caderno de Teses do Gabinete"
                  }
                >
                  <Gavel className="w-3.5 h-3.5" />
                  <span>
                    {projudiSelection.length > 0
                      ? "⚡ Injetar no Caderno de Teses do Gabinete"
                      : "⚡ Injetar no Caderno de Teses"}
                  </span>
                </button>

                <button
                  onClick={handleCopy}
                  className="text-xs text-slate-700 dark:text-slate-400 bg-emerald-50 dark:bg-emerald-600/40 border border-emerald-200 dark:border-slate-800 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-emerald-50 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar tudo</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <div
                ref={projudiTextareaRef as any}
                onMouseUp={(e) => {
                  const sel = window.getSelection()?.toString() || "";
                  setProjudiSelection(sel);
                }}
                onKeyUp={(e) => {
                  const sel = window.getSelection()?.toString() || "";
                  setProjudiSelection(sel);
                }}
                className="w-full p-4 text-xs font-mono bg-slate-50 dark:bg-emerald-600 border border-emerald-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 leading-relaxed select-text focus:ring-2 focus:ring-amber-500 focus:outline-hidden overflow-y-auto max-h-[500px]"
              >
                <ReactMarkdown components={{ p: ({node, ...props}) => <div className="mb-4 break-words" {...props} /> }}>
                  {(minute.fullFormattedText || '').replace(/\\n/g, '\n')}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Chat Panel for Assessor Fabrício */}
      <div id="tour-result-chat" className="bg-slate-50 border-t border-slate-200 p-3.5 space-y-2.5">
        {/* Top bar of Assistant with Title and Limpar Chat button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-xs text-slate-800">Assistente do {userName} — Interação e Refino da Minuta</span>
          </div>

          <div className="flex items-center gap-2">
            {chatMessages.length > 0 && (
              <button
                onClick={handleClearChatOnly}
                className="px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded flex items-center gap-1 transition cursor-pointer border border-emerald-200"
                title="Limpar histórico de mensagens do Assistente"
              >
                <Trash2 className="w-3 h-3 text-slate-400" />
                <span>Limpar Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Interactive Chat Messages Log */}
        {chatMessages.length > 0 && (
          <div
            ref={chatScrollRef}
            className="max-h-96 overflow-y-auto space-y-3 p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs"
          >
            {chatMessages.map((msg) => {
              const isMinuteOpen = expandedMinuteMsgIds[msg.id] !== false;
              const isThisCopied = copiedMsgId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-xl transition space-y-2.5 ${
                    msg.sender === "user"
                      ? "bg-emerald-50 text-slate-900 ml-6 border border-slate-200"
                      : "bg-emerald-50/70 text-slate-900 mr-2 border border-emerald-200"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[10px] text-slate-500 pb-1 border-b border-slate-200/60">
                    <span className="flex items-center gap-1">
                      {msg.sender === "user" ? (
                        "Fabrício / Assessor"
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Assistente do {userName}</span>
                        </>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {msg.usage?.totalTokenCount && (
                        <span className="text-[9px] text-slate-700 bg-emerald-50/80 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                          ⚡ ~{msg.usage.totalTokenCount.toLocaleString()} tokens
                        </span>
                      )}
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>

                  <div className="leading-relaxed text-slate-800 text-xs markdown-body bg-transparent">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>

                  {/* Embedded Rewritten Minute Card */}
                  {msg.hasMinuteUpdate && msg.updatedMinute && (
                    <div className="mt-2 bg-white rounded-lg border-2 border-slate-800/50 p-3 shadow-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-slate-900 flex-shrink-0" />
                          <span className="font-bold text-xs text-emerald-600">
                            Minuta Reescrita com as Alterações Solicitadas
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-slate-900 font-mono text-[10px] font-bold self-start sm:self-auto">
                          {msg.updatedMinute.title || "MINUTA ATUALIZADA"}
                        </span>
                      </div>

                      {/* Quick Meta */}
                      <div className="text-[11px] text-slate-600 space-y-0.5 bg-slate-50 p-2 rounded border border-slate-200">
                        <p><strong>Processo:</strong> {msg.updatedMinute.processNumber}</p>
                        <p><strong>Autor:</strong> {msg.updatedMinute.parties?.author} | <strong>Réu:</strong> {msg.updatedMinute.parties?.defendant}</p>
                      </div>

                      {/* Action buttons on rewritten minute */}
                      <div className="flex items-center flex-wrap gap-1.5 pt-1">
                        <button
                          onClick={() => handleCopyMinuteDirectly(msg.updatedMinute!, msg.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1 transition cursor-pointer shadow-2xs"
                          title="Copiar texto da minuta reescrita"
                        >
                          {isThisCopied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                          <span>{isThisCopied ? "Minuta Copiada!" : "Copiar Minuta Reescrita"}</span>
                        </button>

                        <button
                          onClick={() => {
                            if (msg.updatedMinute) onUpdateMinute(msg.updatedMinute);
                            handleScrollToMainMinute();
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-slate-800 text-white font-bold rounded text-[11px] flex items-center gap-1 transition cursor-pointer shadow-2xs"
                          title="Ver minuta na aba principal do visualizador"
                        >
                          <Eye className="w-3 h-3 text-slate-400" />
                          <span>Ver na Aba Principal</span>
                        </button>

                        <button
                          onClick={() => handleExportDocxDirectly(msg.updatedMinute!)}
                          className="px-2.5 py-1 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded text-[11px] flex items-center gap-1 transition cursor-pointer"
                          title="Baixar em Word (.docx)"
                        >
                          <Download className="w-3 h-3 text-emerald-600" />
                          <span>DOCX</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab("original");
                            if (topViewerRef.current) {
                              topViewerRef.current.scrollIntoView({ behavior: "smooth" });
                            }
                          }}
                          className="px-2.5 py-1 border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded text-[11px] flex items-center gap-1 transition cursor-pointer"
                          title="Acessar o 1º modelo original gerado pela IA antes de quaisquer alterações"
                        >
                          <Bookmark className="w-3 h-3 text-amber-600" />
                          <span>1º Modelo Original</span>
                        </button>

                        <button
                          onClick={() => toggleMinuteExpansion(msg.id)}
                          className="px-2.5 py-1 border border-emerald-200 bg-emerald-50 hover:bg-slate-200 text-slate-800 font-medium rounded text-[11px] flex items-center gap-1 transition cursor-pointer"
                        >
                          {isMinuteOpen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                          <span>{isMinuteOpen ? "Ocultar Texto da Minuta" : "Expandir Texto da Minuta"}</span>
                        </button>
                      </div>

                      {/* Expandable Preview of Complete Rewritten Minute */}
                      {isMinuteOpen && (
                        <div className="mt-2 p-3.5 bg-slate-50 border border-emerald-200 rounded-md font-serif text-[11px] leading-relaxed text-slate-900 max-h-96 overflow-y-auto space-y-3 shadow-inner">
                          <div className="text-center font-sans font-bold border-b border-emerald-200 pb-1">
                            <p className="text-[10px] text-slate-500 uppercase">{msg.updatedMinute.header || minute.header}</p>
                            <p className="text-xs text-slate-900 font-bold">{msg.updatedMinute.title || minute.title}</p>
                          </div>

                          <div className="space-y-1">
                            <p className="font-sans font-bold text-[10px] text-slate-800 uppercase border-b border-slate-200 pb-0.5">I - RELATÓRIO</p>
                            <div className="text-justify text-slate-800 leading-relaxed markdown-body bg-transparent"><ReactMarkdown>{(msg.updatedMinute.relatorio || minute.relatorio || "Dispensado o relatório nos termos do art. 38 da Lei nº 9.099/95.").replace(/\\n/g, '\n')}</ReactMarkdown></div>
                          </div>

                          <div className="space-y-1">
                            <p className="font-sans font-bold text-[10px] text-slate-800 uppercase border-b border-slate-200 pb-0.5">II - FUNDAMENTAÇÃO</p>
                            <div className="text-justify text-slate-800 leading-relaxed markdown-body bg-transparent"><ReactMarkdown>{(msg.updatedMinute.fundamentacao || minute.fundamentacao || "Fundamentação jurídica nos autos.").replace(/\\n/g, '\n')}</ReactMarkdown></div>
                          </div>

                          <div className="space-y-1">
                            <p className="font-sans font-bold text-[10px] text-slate-800 uppercase border-b border-slate-200 pb-0.5">III - DISPOSITIVO</p>
                            <div className="text-justify text-slate-950 font-semibold leading-relaxed bg-emerald-50/50 p-1.5 rounded border-l-2 border-slate-800 markdown-body bg-transparent"><ReactMarkdown>{(msg.updatedMinute.dispositivo || minute.dispositivo || "Dispositivo do ato judicial.").replace(/\\n/g, '\n')}</ReactMarkdown></div>
                          </div>

                          <div className="text-center font-sans font-semibold text-[10px] text-slate-600 pt-2 border-t border-slate-200">
                            {(msg.updatedMinute.closing || minute.closing || "Mineiros - GO, data da assinatura digital.\n\nJuiz(a) de Direito").replace(/\\n/g, "\n")}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Follow-up Suggested Actions if present */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-800">Sugestões:</span>
                      {Array.isArray(msg.suggestedActions) && msg.suggestedActions.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleSendChat(action)}
                          className="px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-slate-900 hover:bg-emerald-50 text-[10px] transition cursor-pointer flex items-center gap-1"
                        >
                          <ArrowRight className="w-2.5 h-2.5 text-emerald-600" />
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isChatSending && (
              <div className="p-3 rounded-xl bg-emerald-50 text-slate-900 mr-6 border border-emerald-200 flex items-center gap-2 text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Reescrevendo a minuta com as alterações solicitadas e conferindo os autos...</span>
              </div>
            )}
          </div>
        )}

        {/* Quick Question & Command Chips */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <span className="font-bold text-slate-600 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Ações Rápidas:
          </span>
          {[
            "Qual o fundamento para o valor de dano moral?",
            "Conferir atestado médico vs. horário de audiência",
            "Explicar cálculo de juros e correção monetária",
            "Ajustar minuta para acolher ilegitimidade passiva",
            "Alterar valor do dano moral para R$ 3.000",
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendChat(chip)}
              disabled={isChatSending}
              className="px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 text-[10px] transition cursor-pointer"
            >
              + {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div id="tour-result-chat" className="relative flex flex-col gap-2 bg-white rounded-xl border border-emerald-200 p-1.5 focus-within:ring-2 focus-within:ring-slate-800 focus-within:border-emerald-300 transition-all shadow-xs">
          <textarea
            ref={chatTextareaRef}
            value={chatInput}
            onChange={(e) => {
              setChatInput(e.target.value);
              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 250) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendChat();
                // Reset height
                if (chatTextareaRef.current) {
                  chatTextareaRef.current.style.height = 'auto';
                }
              }
            }}
            placeholder="Comande alterações na minuta ou tire dúvidas sobre o caso (Shift+Enter para nova linha)..."
            className="w-full px-3 py-2 text-xs bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 placeholder-slate-400 resize-none min-h-[44px]"
            rows={1}
          />
          <div className="flex justify-between items-center px-2 pb-1">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-emerald-500" />
              Use o chat para raciocínio ou reescrita direta.
            </span>
            <button
              onClick={() => {
                handleSendChat();
                if (chatTextareaRef.current) {
                  chatTextareaRef.current.style.height = 'auto';
                }
              }}
              disabled={isChatSending || !chatInput.trim()}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold text-white flex items-center gap-1.5 transition cursor-pointer ${
                isChatSending || !chatInput.trim()
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 shadow-2xs"
              }`}
            >
              {isChatSending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CornerDownLeft className="w-3 h-3" />
              )}
              <span>{isChatSending ? "Processando..." : "Enviar (Enter)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
