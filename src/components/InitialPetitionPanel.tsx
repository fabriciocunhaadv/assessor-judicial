import { extractTextFromPdf } from "../utils/pdfExtractor";
import { getKnowledgeDocs } from "../utils/knowledgeDb";
import { getCabinetTeses } from "../utils/tesesDb";
import React, { useState, useEffect, useRef } from "react";
import {
  FileUp,
  PlusCircle,
  FileText,
  Sparkles,
  AlertCircle,
  X,
  Download,
  Copy,
  History,
  Scale,
  ShieldCheck,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Save,
  Zap,
  RefreshCw,
  FolderLock,
  ArrowRight,
  CheckSquare,
  Building2,
  CalendarClock,
  Layers,
  SplitSquareVertical,
  Check,
  Shield,
  FileCheck,
  Search,
  Globe,
  Lightbulb,
  Link2
} from "lucide-react";
import { toast } from "react-hot-toast";
import Markdown from "react-markdown";
import { getApiHeaders } from "../utils/apiKeyManager";
import { exportMinuteToDocx } from "../utils/documentExport";
import {
  saveInitialPetitionRecord,
  getInitialPetitionsHistory,
  deleteInitialPetitionRecord,
  getRepetitiveTemplates,
  DEFAULT_REPETITIVE_TEMPLATES
} from "../utils/advogadoPeticaoDb";
import {
  InitialPetitionRecord,
  InitialPetitionChecklistAudit,
  InitialPetitionJurisprudenceItem,
  InitialPetitionRepetitiveTemplate
} from "../types";

export interface InitialPetitionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

const COMMON_PRELIMINARES = [
  "Inépcia da Petição Inicial (Art. 337, IV CPC)",
  "Ilegitimidade Passiva Ad Causam (Art. 337, XI CPC)",
  "Incompetência Absoluta ou Relativa (Art. 337, II CPC)",
  "Falta de Interesse de Agir (Art. 337, XI CPC)",
  "Impugnação ao Valor da Causa (Art. 337, III CPC)",
  "Impugnação à Gratuidade de Justiça (Art. 337, XIII CPC)",
  "Prescrição ou Decadência (Prejudicial - Art. 487, II CPC)",
  "Defeito de Representação / Procuração (Art. 337, IX CPC)",
  "Ausência de Prévio Requerimento Administrativo (Tema 350 STF)",
  "Litispendência ou Coisa Julgada (Art. 337, VI/VII CPC)"
];

export const InitialPetitionPanel: React.FC<InitialPetitionPanelProps> = ({
  isOpen,
  onClose,
  currentUserEmail = "superadmin@advocacia.jus.br"
}) => {
  // Abas do Painel Independente
  const [activeTab, setActiveTab] = useState<"editor" | "historico" | "modelos" | "impugnacao" | "auditoria" | "jurisprudencia">("editor");

  // No mobile, alternar visualização entre formulário ("form") e peça gerada ("viewer") na aba editor
  const [mobileEditorView, setMobileEditorView] = useState<"form" | "viewer">("form");

  // Tipo de Peça Processual e Postura Forense (Inicial vs Defesa no Curso dos Autos)
  const [pieceType, setPieceType] = useState<"inicial" | "contestacao" | "replica" | "incidental" | "recurso">("inicial");
  const [clientRole, setClientRole] = useState<"autor" | "reu">("autor");
  const [processNumber, setProcessNumber] = useState("");
  const [varaJuizo, setVaraJuizo] = useState("");
  const [tempestividadeInfo, setTempestividadeInfo] = useState("");
  const [preliminaresSelecionadas, setPreliminaresSelecionadas] = useState<string[]>([]);
  const [customPreliminarInput, setCustomPreliminarInput] = useState("");

  // Dados do Formulário
  const [clientName, setClientName] = useState("");
  const [defendantName, setDefendantName] = useState("");
  const [lawArea, setLawArea] = useState<string>("Direito do Consumidor / Bancário");
  const [targetCourt, setTargetCourt] = useState<string>("TJGO");
  const [caseDescription, setCaseDescription] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [causeValue, setCauseValue] = useState("");
  const [wantsUrgency, setWantsUrgency] = useState(true);
  const [wantsGratuity, setWantsGratuity] = useState(true);
  const [hasConciliationOption, setHasConciliationOption] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Duplo Upload Especializado: Autos do Processo (PDF) e Documentos do Cliente
  const [processFiles, setProcessFiles] = useState<{ name: string; base64: string; mimeType: string; size: number; extractedText?: string }[]>([]);
  const [clientFiles, setClientFiles] = useState<{ name: string; base64: string; mimeType: string; size: number; extractedText?: string }[]>([]);
  // Arquivos Probatórios Anexados (geral/legado)
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; base64: string; mimeType: string; size: number; extractedText?: string }[]>([]);

  // Estados de Execução da IA
  const [isExtractingEvidence, setIsExtractingEvidence] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Resultado da Petição Gerada
  const [currentRecord, setCurrentRecord] = useState<InitialPetitionRecord | null>(null);

  // Histórico Independente de Petições
  const [historyList, setHistoryList] = useState<InitialPetitionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<InitialPetitionRecord | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Biblioteca de Casos Repetitivos
  const [templatesList, setTemplatesList] = useState<InitialPetitionRepetitiveTemplate[]>(DEFAULT_REPETITIVE_TEMPLATES);

  // Google Search Grounding e Pesquisa de Jurisprudência
  const [isSearchingGrounding, setIsSearchingGrounding] = useState(false);
  const [groundingSearchQuery, setGroundingSearchQuery] = useState("");
  const autoSearchedIdsRef = useRef<Set<string>>(new Set());

  // Extração Automática do Tema Jurídico da Minuta/Petição/Defesa para Google Grounding
  const getSmartThemeForRecord = (record?: InitialPetitionRecord | null) => {
    if (!record) return "";
    const firstItemTheme = record.favorableJurisprudence?.[0]?.theme;
    if (firstItemTheme && firstItemTheme.length > 5 && !firstItemTheme.toLowerCase().includes("petição inicial") && !firstItemTheme.toLowerCase().includes("contestação")) {
      return firstItemTheme;
    }
    if (record.title && !record.title.toLowerCase().startsWith("petição inicial") && !record.title.toLowerCase().startsWith("contestação") && !record.title.toLowerCase().startsWith("réplica")) {
      return record.title;
    }
    if (record.caseDescription) {
      const cleanDesc = record.caseDescription
        .replace(/EXCELENT[ÍI]SSIMO[\s\S]*?VARA/i, "")
        .replace(/[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}/g, "")
        .replace(/\b(brasileiro|casado|solteiro|inscrito no CPF|portador do RG|residente e domiciliado)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      const words = cleanDesc.split(" ").slice(0, 15).join(" ");
      return `${record.lawArea || "Direito Cível"} ${words}`;
    }
    return `${record.lawArea || "Direito Cível"} ${record.targetCourt || "TJGO"}`;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const processFileInputRef = useRef<HTMLInputElement>(null);
  const clientFileInputRef = useRef<HTMLInputElement>(null);

  // Carrega Histórico e Templates ao abrir
  useEffect(() => {
    if (isOpen) {
      loadHistory();
      loadTemplates();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const records = await getInitialPetitionsHistory();
      setHistoryList(records);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const list = await getRepetitiveTemplates();
      setTemplatesList(list);
    } catch (e) {
      console.warn("Using default repetitive templates:", e);
    }
  };

  // Alternar Tipo de Peça / Postura Processual
  const handlePieceTypeChange = (type: "inicial" | "contestacao" | "replica" | "incidental" | "recurso") => {
    setPieceType(type);
    if (type === "contestacao") {
      setClientRole("reu");
      if (preliminaresSelecionadas.length === 0) {
        setPreliminaresSelecionadas([
          "Inépcia da Petição Inicial (Art. 337, IV CPC)",
          "Ilegitimidade Passiva Ad Causam (Art. 337, XI CPC)"
        ]);
      }
    } else if (type === "inicial" || type === "replica") {
      setClientRole("autor");
    }
  };


  const processFilesForUpload = async (files: File[]) => {
    return await Promise.all(
      files.map(async (file) => {
        let extractedText = "";
        let base64Data = "";
        
        const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type.includes("pdf");
        if (isPdf) {
          try {
            const result = await extractTextFromPdf(file);
            if (result && result.hasText && result.text && result.text.trim().length > 0) {
              extractedText = result.text;
              console.log(`[Petição] Texto do PDF "${file.name}" extraído no navegador (${extractedText.length} caracteres).`);
            }
          } catch (e) {
            console.warn(`[Petição] Falha na extração de texto no cliente para ${file.name}. Enviando cópia binária...`, e);
          }
        }
        
        if (!extractedText) {
          base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const res = event.target?.result;
              resolve(typeof res === "string" ? res.split(",")[1] : "");
            };
            reader.readAsDataURL(file);
          });
        }
        
        return {
          name: file.name,
          base64: base64Data,
          mimeType: file.type || "application/pdf",
          size: file.size,
          extractedText
        };
      })
    );
  };

  // Processar Upload de Autos do Processo Existente em PDF
  const handleProcessFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    const newFiles = await processFilesForUpload(files);

    setProcessFiles(prev => [...prev, ...newFiles]);
    setAttachedFiles(prev => [...prev, ...newFiles]);
    if (processFileInputRef.current) processFileInputRef.current.value = "";
    toast.success(`${newFiles.length} arquivo(s) dos autos anexado(s)!`);
  };

  // Processar Upload de Documentos e Provas do Cliente/Defesa
  const handleClientFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    const newFiles = await processFilesForUpload(files);

    setClientFiles(prev => [...prev, ...newFiles]);
    setAttachedFiles(prev => [...prev, ...newFiles]);
    if (clientFileInputRef.current) clientFileInputRef.current.value = "";
    toast.success(`${newFiles.length} prova(s) do cliente anexada(s)!`);
  };

  // Upload Geral/Legado
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const files = Array.from(e.target.files);
    const newFiles = await processFilesForUpload(files);

    setClientFiles(prev => [...prev, ...newFiles]);
    setAttachedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success(`${newFiles.length} documento(s) anexado(s)!`);
  };

  const removeProcessFile = (index: number) => {
    const fileToRemove = processFiles[index];
    setProcessFiles(prev => prev.filter((_, i) => i !== index));
    if (fileToRemove) {
      setAttachedFiles(prev => prev.filter(f => f.name !== fileToRemove.name));
    }
  };

  const removeClientFile = (index: number) => {
    const fileToRemove = clientFiles[index];
    setClientFiles(prev => prev.filter((_, i) => i !== index));
    if (fileToRemove) {
      setAttachedFiles(prev => prev.filter(f => f.name !== fileToRemove.name));
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Alternar seleção de Preliminar de Mérito
  const togglePreliminar = (prelim: string) => {
    setPreliminaresSelecionadas(prev =>
      prev.includes(prelim) ? prev.filter(p => p !== prelim) : [...prev, prelim]
    );
  };

  const handleAddCustomPreliminar = () => {
    if (!customPreliminarInput.trim()) return;
    if (!preliminaresSelecionadas.includes(customPreliminarInput.trim())) {
      setPreliminaresSelecionadas(prev => [...prev, customPreliminarInput.trim()]);
    }
    setCustomPreliminarInput("");
  };

  const handleNewProcess = () => {
    setClientName("");
    setDefendantName("");
    setLawArea("Direito do Consumidor / Bancário");
    setTargetCourt("TJGO");
    setCaseDescription("");
    setCustomPrompt("");
    setCauseValue("");
    setWantsUrgency(true);
    setWantsGratuity(true);
    setHasConciliationOption(false);
    setSelectedTemplateId("");
    setProcessFiles([]);
    setClientFiles([]);
    setAttachedFiles([]);
    setProcessNumber("");
    setVaraJuizo("");
    setTempestividadeInfo("");
    setPreliminaresSelecionadas([]);
    setCustomPreliminarInput("");
    setPieceType("inicial");
    setClientRole("autor");
    setCurrentRecord(null);
    setMobileEditorView("form");
    setActiveTab("editor");
  };

  // 1. AUTO-INGESTÃO E EXTRAÇÃO DE PROVAS E AUTOS (Ultra-automático)
  const handleAutoExtractEvidence = async () => {
    if (processFiles.length === 0 && clientFiles.length === 0 && attachedFiles.length === 0 && !caseDescription.trim()) {
      toast.error("Anexe os arquivos dos autos (PDF), as provas do cliente ou insira anotações da demanda.");
      return;
    }

    setIsExtractingEvidence(true);
    try {
      const response = await fetch("/api/advogado-peticao/auto-extract-evidence", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          processFiles,
          clientFiles,
          pdfFiles: attachedFiles,
          quickNotes: caseDescription,
          pieceType,
          clientRole
        })
      });

      if (!response.ok) {
        let errStr = "Erro na auto-extração dos autos e provas.";
        if (response.status === 413) {
          errStr = "Mesmo com a otimização de texto, o tamanho combinado dos arquivos excede o limite máximo físico da nuvem (~32MB). Por favor, anexe arquivos menores.";
        } else if (response.status === 504 || response.status === 503 || response.status === 502) {
          errStr = "O servidor (IA) demorou muito para responder ou está sobrecarregado. O arquivo pode ser muito complexo ou o Google está instável. Tente novamente.";
        } else {
          try {
            const errText = await response.text();
            const errObj = JSON.parse(errText);
            if (errObj?.error) errStr = errObj.error;
          } catch {}
        }
        throw new Error(errStr);
      }

      let res;
      try {
        const responseText = await response.text();
        res = JSON.parse(responseText);
      } catch (jsonErr) {
        throw new Error("A conexão com o servidor foi interrompida ou a IA retornou um formato inválido. Por favor, tente novamente.");
      }
      const data = res.data;

      if (data) {
        if (data.clientName) setClientName(data.clientName);
        if (data.defendantName) setDefendantName(data.defendantName);
        if (data.processNumber) setProcessNumber(data.processNumber);
        if (data.varaJuizo) setVaraJuizo(data.varaJuizo);
        if (data.lawArea) setLawArea(data.lawArea);
        if (data.targetCourt) setTargetCourt(data.targetCourt);
        if (data.factualNarrative) setCaseDescription(data.factualNarrative);
        if (data.materialDamages) setCauseValue(`R$ ${data.materialDamages}`);
        if (typeof data.hasUrgency === "boolean") setWantsUrgency(data.hasUrgency);
        if (Array.isArray(data.identifiedPreliminaries) && data.identifiedPreliminaries.length > 0) {
          setPreliminaresSelecionadas(prev => Array.from(new Set([...prev, ...data.identifiedPreliminaries])));
        }

        if (Array.isArray(data.matrizImpugnacao) && data.matrizImpugnacao.length > 0) {
          toast.success(`⚡ Extração 360° concluída! Autos, partes e ${data.matrizImpugnacao.length} ponto(s) de impugnação detectados!`);
        } else {
          toast.success("⚡ Extração 360° concluída! Dados dos autos, partes e fatos preenchidos.");
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro na triagem dos autos e provas.");
    } finally {
      setIsExtractingEvidence(false);
    }
  };

  // 2. APLICAR MODELO DE CASO REPETITIVO
  const handleApplyTemplate = (template: InitialPetitionRepetitiveTemplate) => {
    setSelectedTemplateId(template.id);
    setLawArea(template.category);
    setTargetCourt(template.targetCourtDefault);
    setWantsUrgency(template.suggestedUrgency);
    setCaseDescription(template.defaultClientFactualSkeleton);
    setActiveTab("editor");
    setMobileEditorView("form");
    toast.success(`Esqueleto de '${template.title}' aplicado! Preencha as lacunas entre colchetes.`);
  };

  // 3. GERAR PEÇA FORENSE 360° COMPLETA (INICIAL OU DEFESA)
  const handleGeneratePetition = async () => {
    if (!caseDescription.trim() && attachedFiles.length === 0 && processFiles.length === 0 && clientFiles.length === 0) {
      toast.error("Forneça a narrativa dos fatos ou anexe as peças e provas.");
      return;
    }

    setIsGenerating(true);
    try {
      let activeKnowledgeDocs: any[] = [];
      try {
        activeKnowledgeDocs = (await getKnowledgeDocs()).filter(d => d.isActive);
      } catch {}
      let activeTesesText = "";
      try {
        const teses = await getCabinetTeses();
        if (teses.isEnabled) activeTesesText = teses.text || "";
      } catch {}

      const response = await fetch("/api/advogado-peticao/generate-full-petition", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          pieceType,
          clientRole,
          processNumber,
          varaJuizo,
          clientName,
          defendantName,
          lawArea,
          targetCourt,
          caseDescription,
          customPrompt,
          wantsUrgency,
          wantsGratuity,
          hasConciliationOption,
          causeValue,
          preliminaresSelecionadas,
          tempestividadeInfo,
          processFiles,
          clientFiles,
          pdfFiles: attachedFiles,
          repetitiveTemplateId: selectedTemplateId,
          knowledgePdfs: activeKnowledgeDocs,
          cabinetTesesText: activeTesesText
        })
      });

      let responseText = "";
      try {
        responseText = await response.text();
      } catch (readErr) {
        throw new Error("Conexão interrompida pela rede. Por favor, tente novamente.");
      }

      if (!response.ok) {
        let errStr = "Falha na redação da peça forense. O servidor pode estar sobrecarregado. Por favor, tente novamente.";
        if (response.status === 413) {
          errStr = "Mesmo com a otimização de texto, o tamanho combinado dos arquivos excede o limite máximo físico da nuvem (~32MB). Por favor, anexe arquivos menores.";
        } else if (response.status === 504 || response.status === 503 || response.status === 502) {
          errStr = "A inteligência artificial demorou muito para responder (timeout) devido ao volume de páginas do processo. Tente gerar a peça enviando apenas as páginas principais do PDF.";
        } else {
          try {
            const errObj = JSON.parse(responseText.trim());
            if (errObj?.error) errStr = errObj.error;
          } catch {}
        }
        throw new Error(errStr);
      }

      let res: any;
      try {
        res = JSON.parse(responseText.trim());
      } catch (jsonErr) {
        throw new Error("A conexão com o servidor foi interrompida durante a geração da peça. Por favor, tente novamente.");
      }
      const resultData = res.data;

      const pieceLabel = pieceType === "contestacao"
        ? "Contestação"
        : pieceType === "replica"
        ? "Réplica"
        : pieceType === "incidental"
        ? "Manifestação Incidental"
        : pieceType === "recurso"
        ? "Recurso"
        : "Petição Inicial";

      const newRecord: InitialPetitionRecord = {
        id: `pet_${Date.now()}`,
        title: resultData.title || `${pieceLabel} - ${clientName || (clientRole === "reu" ? "Réu" : "Autor")}`,
        pieceType,
        clientRole,
        processNumber,
        varaJuizo,
        clientName: clientName || (clientRole === "reu" ? "Réu a qualificar" : "Autor(a)"),
        defendantName: defendantName || (clientRole === "reu" ? "Autor da ação" : "Réu"),
        lawArea,
        targetCourt,
        causeValueEstimated: causeValue,
        caseDescription,
        wantsUrgency,
        wantsGratuity,
        hasConciliationOption,
        attachedFileNames: [...processFiles.map(f => `[Autos] ${f.name}`), ...clientFiles.map(f => `[Defesa] ${f.name}`), ...attachedFiles.map(f => f.name)],
        processAttachedFiles: processFiles.map(f => f.name),
        clientAttachedFiles: clientFiles.map(f => f.name),
        preliminaresArguidas: preliminaresSelecionadas,
        impugnacaoMatriz: resultData.matrizImpugnacao || [],
        fullPetitionMarkdown: resultData.fullPetitionMarkdown || "",
        cleanTextPreview: resultData.cleanTextPreview || "",
        auditCpc: resultData.auditCpc,
        favorableJurisprudence: resultData.favorableJurisprudence,
        anticipatedDefenses: resultData.anticipatedDefenses,
        kitProcuracao: resultData.kitProcuracao,
        kitDeclaracaoPobreza: resultData.kitDeclaracaoPobreza,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdByEmail: currentUserEmail
      };

      setCurrentRecord(newRecord);
      setMobileEditorView("viewer");

      // Salva no Firestore isolado
      try {
        const savedId = await saveInitialPetitionRecord(newRecord);
        newRecord.id = savedId;
        setHistoryList(prev => [newRecord, ...prev]);
      } catch (dbErr) {
        console.warn("Could not save to initial_petitions_history:", dbErr);
      }

      toast.success(`${pieceLabel} 360° redigida e salva no Histórico com sucesso!`);
    } catch (error: any) {
      console.error(error);
      const msg = error.message || "Erro ao redigir peça forense.";
      toast.error(msg);
      if (msg.includes("429") || msg.includes("Quota")) {
        window.dispatchEvent(new CustomEvent("open-api-key-modal", { detail: { message: msg } }));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Copiar Petição
  const handleCopy = (text?: string) => {
    const textToCopy = text || currentRecord?.fullPetitionMarkdown;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      toast.success("Texto copiado para a área de transferência!");
    }
  };

  // Exportar para Word DOCX
  const handleExportWord = async () => {
    if (!currentRecord) return;
    try {
      const headerTitle = currentRecord.varaJuizo
        ? `AO JUÍZO DA ${currentRecord.varaJuizo.toUpperCase()}`
        : `AO JUÍZO DE DIREITO DO ${currentRecord.targetCourt.toUpperCase()}`;

      await exportMinuteToDocx({
        title: currentRecord.title,
        header: headerTitle,
        fullFormattedText: currentRecord.fullPetitionMarkdown,
        processNumber: currentRecord.processNumber || (currentRecord.pieceType === "inicial" ? "DISTRIBUIÇÃO INICIAL" : "AUTOS DO PROCESSO"),
        relatorio: "",
        fundamentacao: currentRecord.fullPetitionMarkdown,
        dispositivo: "",
        parties: {
          author: currentRecord.clientRole === "reu" ? (currentRecord.defendantName || "Parte Autora") : (currentRecord.clientName || "Autor"),
          defendant: currentRecord.clientRole === "reu" ? (currentRecord.clientName || "Cliente Réu") : (currentRecord.defendantName || "Réu")
        }
      });
      toast.success("Documento Word (.docx) exportado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar documento Word.");
    }
  };

  // Carregar do Histórico
  const handleSelectHistoryItem = (rec: InitialPetitionRecord) => {
    setCurrentRecord(rec);
    setPieceType(rec.pieceType || "inicial");
    setClientRole(rec.clientRole || (rec.pieceType === "contestacao" ? "reu" : "autor"));
    setProcessNumber(rec.processNumber || "");
    setVaraJuizo(rec.varaJuizo || "");
    setPreliminaresSelecionadas(rec.preliminaresArguidas || []);
    setClientName(rec.clientName || "");
    setDefendantName(rec.defendantName || "");
    setLawArea(rec.lawArea || "Direito do Consumidor / Bancário");
    setTargetCourt(rec.targetCourt || "TJGO");
    setCaseDescription(rec.caseDescription || "");
    setWantsUrgency(rec.wantsUrgency);
    setWantsGratuity(rec.wantsGratuity);
    setHasConciliationOption(rec.hasConciliationOption);
    setActiveTab("editor");
    setMobileEditorView("viewer");
    toast.success(`Peça '${rec.title}' carregada do histórico.`);
  };

  // Abrir Modal de Exclusão do Histórico
  const handlePromptDeleteHistoryItem = (e: React.MouseEvent, rec: InitialPetitionRecord) => {
    e.stopPropagation();
    setRecordToDelete(rec);
  };

  // Excluir Peça por ID (Ação Direta e Imediata)
  const handleExecuteDeleteById = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!id) return;
    setIsDeleting(true);

    try {
      await deleteInitialPetitionRecord(id);
      setHistoryList(prev => prev.filter(item => item.id !== id));
      if (currentRecord?.id === id) {
        setCurrentRecord(null);
      }
      toast.success("Petição removida do histórico com sucesso.");
      setConfirmDeleteId(null);
      setRecordToDelete(null);
    } catch (err: any) {
      console.error("Falha ao excluir petição:", err);
      toast.error(err?.message || "Erro ao excluir do histórico.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Executar Pesquisa em Tempo Real de Jurisprudência no Google (Grounding)
  const handleSearchGrounding = async (queryOverride?: string, isAuto: boolean = false) => {
    const targetCourtName = currentRecord?.targetCourt || targetCourt || "TJGO";
    const currentLawArea = currentRecord?.lawArea || lawArea || "Cível";
    const smartTheme = getSmartThemeForRecord(currentRecord);

    const q = (queryOverride || groundingSearchQuery || `${smartTheme} ${targetCourtName}`).trim();
    if (!q) {
      if (!isAuto) toast.error("Informe os termos da matéria para pesquisar no Google.");
      return;
    }

    setIsSearchingGrounding(true);
    try {
      const response = await fetch("/api/advogado-peticao/search-grounding", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          query: q,
          theme: smartTheme,
          court: targetCourtName,
          lawArea: currentLawArea,
          caseDescription: currentRecord?.caseDescription || caseDescription
        })
      });

      let resData;
      try {
        const responseText = await response.text();
        resData = JSON.parse(responseText);
      } catch (jsonErr) {
        throw new Error("Falha ao ler os dados do Google Grounding.");
      }
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Falha na consulta ao Google Grounding.");
      }

      if (Array.isArray(resData.items) && resData.items.length > 0) {
        if (currentRecord) {
          // Filtrar julgados antigos para não duplicar se já existirem
          const existingNonDuplicate = (currentRecord.favorableJurisprudence || []).filter(
            oldItem => !resData.items.some((newItem: any) => 
              (newItem.fonteUrl && newItem.fonteUrl === oldItem.fonteUrl) || 
              (newItem.theme && newItem.theme.toLowerCase() === oldItem.theme.toLowerCase())
            )
          );

          const updatedJuris = [
            ...resData.items,
            ...existingNonDuplicate
          ];

          const updatedRecord: InitialPetitionRecord = {
            ...currentRecord,
            favorableJurisprudence: updatedJuris,
            updatedAt: Date.now()
          };

          setCurrentRecord(updatedRecord);
          try {
            await saveInitialPetitionRecord(updatedRecord);
          } catch (e) {
            console.warn("Auto-save updated jurisprudence error:", e);
          }
        }
        if (isAuto) {
          toast.success(`Google Grounding: ${resData.items.length} precedentes reais localizados automaticamente para "${smartTheme}"!`);
        } else {
          toast.success(`${resData.items.length} precedentes/teses obtidos via Google Grounding!`);
        }
      } else {
        if (!isAuto) {
          toast("Nenhum acórdão novo indexado retornado. Utilize as teses doutrinárias sugeridas.", { icon: "ℹ️" });
        }
      }
    } catch (err: any) {
      console.error("Grounding error:", err);
      if (!isAuto) toast.error(err?.message || "Erro ao consultar Google Grounding.");
    } finally {
      setIsSearchingGrounding(false);
    }
  };

  // Disparo AUTOMÁTICO da Pesquisa de Jurisprudência conforme o Tema da Peça / Minuta
  useEffect(() => {
    if (!isOpen || !currentRecord) return;

    const smartTheme = getSmartThemeForRecord(currentRecord);
    const targetCourtName = currentRecord.targetCourt || targetCourt || "TJGO";
    const defaultSearchQuery = `${smartTheme} ${targetCourtName}`.trim();

    // Sincronizar input com o tema detectado
    if (!groundingSearchQuery) {
      setGroundingSearchQuery(defaultSearchQuery);
    }

    // Verificar se já tem precedentes reais verificados com link oficial
    const hasRealVerified = Array.isArray(currentRecord.favorableJurisprudence) && currentRecord.favorableJurisprudence.some(
      j => (j.tipo === "real_verificado" || j.isRealVerificado === true) && Boolean(j.fonteUrl)
    );

    // Se NÃO possui precedentes com link e ainda não pesquisou automaticamente nesta sessão:
    if (!hasRealVerified && !autoSearchedIdsRef.current.has(currentRecord.id) && !isSearchingGrounding) {
      autoSearchedIdsRef.current.add(currentRecord.id);
      handleSearchGrounding(defaultSearchQuery, true);
    }
  }, [isOpen, currentRecord?.id, activeTab]);

  // Confirmar Exclusão do Modal
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    await handleExecuteDeleteById(recordToDelete.id);
  };

  if (!isOpen) return null;

  return (
    <div id="initial-petition-panel-root" className="fixed inset-0 z-[100] flex bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 text-slate-100 w-full h-full flex flex-col shadow-2xl overflow-hidden border border-slate-800">
        
        {/* Top Header com Isolamento Visual Total e Responsivo */}
        <header id="initial-petition-header" className="min-h-16 flex flex-col md:flex-row md:items-center justify-between px-3 md:px-6 py-2.5 md:py-0 bg-slate-900 border-b border-slate-800 shrink-0 gap-2">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-sm md:text-base font-bold text-slate-100 tracking-tight">
                    Módulo Petição & Defesa 360°
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    <FolderLock className="w-2.5 h-2.5" /> Super Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Ambiente independente: Inicial, Contestação e Defesa com leitura de autos do processo e provas do cliente.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:hidden shrink-0 ml-2">
              <button
                onClick={handleNewProcess}
                className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition"
                title="Novo Processo"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
              <button
                id="close-petition-panel-btn"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                title="Fechar Painel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Abas Superiores de Navegação com Scroll Horizontal Suave no Mobile */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 overflow-x-auto max-w-full scrollbar-none py-1">
            <button
              id="tab-btn-editor"
              onClick={() => setActiveTab("editor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                activeTab === "editor"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Redator
            </button>

            <button
              id="tab-btn-modelos"
              onClick={() => setActiveTab("modelos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                activeTab === "modelos"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Modelos
            </button>

            <button
              id="tab-btn-impugnacao"
              onClick={() => setActiveTab("impugnacao")}
              disabled={!currentRecord?.impugnacaoMatriz?.length && pieceType !== "contestacao"}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === "impugnacao"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
              title="Matriz de Impugnação Específica dos Fatos da Inicial (Art. 341 CPC)"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Matriz Impugnação (341)
              {currentRecord?.impugnacaoMatriz && currentRecord.impugnacaoMatriz.length > 0 ? (
                <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-200 text-[10px] rounded-full font-bold">
                  {currentRecord.impugnacaoMatriz.length}
                </span>
              ) : null}
            </button>

            <button
              id="tab-btn-auditoria"
              onClick={() => setActiveTab("auditoria")}
              disabled={!currentRecord?.auditCpc}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === "auditoria"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Auditoria CPC
              {currentRecord?.auditCpc && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </button>

            <button
              id="tab-btn-jurisprudencia"
              onClick={() => setActiveTab("jurisprudencia")}
              disabled={!currentRecord?.favorableJurisprudence?.length}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === "jurisprudencia"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <Scale className="w-3.5 h-3.5" /> Jurisprudência
              {currentRecord?.favorableJurisprudence?.length ? (
                <span className="px-1.5 py-0.2 bg-purple-500/30 text-purple-200 text-[10px] rounded-full">
                  {currentRecord.favorableJurisprudence.length}
                </span>
              ) : null}
            </button>

            <button
              id="tab-btn-historico"
              onClick={() => setActiveTab("historico")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                activeTab === "historico"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <History className="w-3.5 h-3.5" /> Histórico ({historyList.length})
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={handleNewProcess}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition text-xs font-semibold mr-1"
              title="Novo Processo / Limpar Dados"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Novo Processo
            </button>
            <button
              id="close-petition-panel-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Fechar Painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Sub-Header para Celular (Alternador Formulário vs Peça Gerada na aba editor) */}
        {activeTab === "editor" && currentRecord && (
          <div className="md:hidden flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full">
              <button
                type="button"
                onClick={() => setMobileEditorView("form")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  mobileEditorView === "form"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Dados & Fatos
              </button>
              <button
                type="button"
                onClick={() => setMobileEditorView("viewer")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  mobileEditorView === "viewer"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-300" /> Ver Petição Gerada
              </button>
            </div>
          </div>
        )}

        {/* CORPO DO PAINEL DEPENDENDO DA ABA */}
        <main className="flex-1 flex overflow-hidden">
          {/* ========================================================================= */}
          {/* ABA 1: REDATOR PRINCIPAL (FORMULÁRIO LATERAL + VISUALIZADOR DIREITO) */}
          {/* ========================================================================= */}
          {activeTab === "editor" && (
            <>
              {/* Lado Esquerdo: Formulário com Automações */}
              <section
                id="petition-form-section"
                className={`w-full md:w-[460px] md:shrink-0 md:border-r border-slate-800 bg-slate-900/90 overflow-y-auto flex flex-col p-4 md:p-5 space-y-4 ${
                  currentRecord && mobileEditorView !== "form" ? "hidden md:flex" : "flex"
                }`}
              >
                
                {/* Seletor Segmentado de Tipo de Peça / Postura Processual */}
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-indigo-400" /> Tipo de Peça & Postura
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                      {pieceType === "contestacao"
                        ? "Polo Passivo (Réu)"
                        : pieceType === "replica"
                        ? "Impugnação à Defesa"
                        : pieceType === "incidental"
                        ? "Manifestação"
                        : pieceType === "recurso"
                        ? "Grau Recursal"
                        : "Polo Ativo (Autor)"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePieceTypeChange("inicial")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition text-left flex items-center gap-1.5 ${
                        pieceType === "inicial"
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700/70"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Petição Inicial</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePieceTypeChange("contestacao")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition text-left flex items-center gap-1.5 ${
                        pieceType === "contestacao"
                          ? "bg-amber-600 text-white shadow"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700/70"
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                      <span className="truncate">Contestação</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePieceTypeChange("replica")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition text-left flex items-center gap-1.5 ${
                        pieceType === "replica"
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700/70"
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Réplica</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePieceTypeChange("incidental")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition text-left flex items-center gap-1.5 ${
                        pieceType === "incidental"
                          ? "bg-purple-600 text-white shadow"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700/70"
                      }`}
                    >
                      <FileCheck className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Incidental</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePieceTypeChange("recurso")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition text-left flex items-center gap-1.5 col-span-2 sm:col-span-2 ${
                        pieceType === "recurso"
                          ? "bg-rose-600 text-white shadow"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700/70"
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Peça Recursal (Apelação / Agravo)</span>
                    </button>
                  </div>
                </div>

                {/* Dados do Processo Existente em Andamento (Atuação no decorrer da lide) */}
                {pieceType !== "inicial" && (
                  <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-800/40 space-y-2.5">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FolderLock className="w-3.5 h-3.5" /> Identificação dos Autos Existentes
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Nº dos Autos (CNJ)
                        </label>
                        <input
                          id="input-process-number"
                          type="text"
                          value={processNumber}
                          onChange={(e) => setProcessNumber(e.target.value)}
                          placeholder="Ex: 5012345-67.2026.8.09.0051"
                          className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Vara / Juízo de Trâmite
                        </label>
                        <input
                          id="input-vara-juizo"
                          type="text"
                          value={varaJuizo}
                          onChange={(e) => setVaraJuizo(e.target.value)}
                          placeholder="Ex: 3ª Vara Cível de Goiânia/GO"
                          className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Certidão de Intimação / Citação & Tempestividade
                      </label>
                      <input
                        id="input-tempestividade"
                        type="text"
                        value={tempestividadeInfo}
                        onChange={(e) => setTempestividadeInfo(e.target.value)}
                        placeholder="Ex: Citação juntada em 10/08/2026, prazo de 15 dias úteis, tempestiva"
                        className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Preliminares de Mérito (Art. 337 do CPC) - Especial Defesa */}
                {pieceType === "contestacao" && (
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-amber-400" /> Preliminares de Mérito (Art. 337 CPC)
                      </span>
                      <span className="text-[10px] text-amber-300 font-semibold">
                        {preliminaresSelecionadas.length} ativa(s)
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      Clique para marcar preliminares que devem constar no capítulo inicial da defesa:
                    </p>

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {COMMON_PRELIMINARES.map((prelim) => {
                        const isSelected = preliminaresSelecionadas.includes(prelim);
                        return (
                          <button
                            key={prelim}
                            type="button"
                            onClick={() => togglePreliminar(prelim)}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 border ${
                              isSelected
                                ? "bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-sm"
                                : "bg-slate-800/90 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-800"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                            <span>{prelim}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        value={customPreliminarInput}
                        onChange={(e) => setCustomPreliminarInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCustomPreliminar()}
                        placeholder="Adicionar outra preliminar..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomPreliminar}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shrink-0"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>
                )}

                {/* Duplo Upload Especializado: Autos do Processo vs Provas do Cliente */}
                <div className="space-y-3">
                  {/* Upload 1: Autos do Processo Existente em PDF */}
                  <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                        <FolderLock className="w-3.5 h-3.5" /> Autos do Processo (PDF Completo ou Inicial)
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                        {processFiles.length} arquivo(s)
                      </span>
                    </div>

                    <div
                      id="dropzone-process-files"
                      onClick={() => processFileInputRef.current?.click()}
                      className="border border-dashed border-indigo-700/50 hover:border-indigo-500 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer bg-indigo-950/20 hover:bg-indigo-950/40 transition"
                    >
                      <FileUp className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-medium text-slate-300 text-center">
                        Juntar PDF do Processo / Petição Adversa
                      </span>
                      <span className="text-[10px] text-slate-400 text-center">
                        A IA lerá os pedidos, fatos alegados pelo adversário e valor da causa
                      </span>
                      <input
                        type="file"
                        ref={processFileInputRef}
                        multiple
                        className="hidden"
                        onChange={handleProcessFilesChange}
                        accept=".pdf"
                      />
                    </div>

                    {processFiles.length > 0 && (
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {processFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/70 border border-slate-700/50 text-xs">
                            <div className="flex items-center gap-1.5 truncate">
                              <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span className="text-slate-300 truncate text-[11px]" title={file.name}>{file.name}</span>
                            </div>
                            <button
                              onClick={() => removeProcessFile(idx)}
                              className="text-slate-400 hover:text-rose-400 p-0.5 transition"
                              title="Remover anexo dos autos"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upload 2: Provas e Documentos do Cliente/Defesa */}
                  <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5" /> Provas & Documentos do Cliente (Defesa)
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                        {clientFiles.length} prova(s)
                      </span>
                    </div>

                    <div
                      id="dropzone-client-files"
                      onClick={() => clientFileInputRef.current?.click()}
                      className="border border-dashed border-purple-700/50 hover:border-purple-500 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer bg-purple-950/20 hover:bg-purple-950/40 transition"
                    >
                      <FileUp className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-medium text-slate-300 text-center">
                        Anexar Provas do Cliente (PDF, Prints, Contratos, Extratos)
                      </span>
                      <span className="text-[10px] text-slate-400 text-center">
                        A IA cruzará estes documentos para a refutação direta no art. 341 CPC
                      </span>
                      <input
                        type="file"
                        ref={clientFileInputRef}
                        multiple
                        className="hidden"
                        onChange={handleClientFilesChange}
                        accept=".pdf,image/*"
                      />
                    </div>

                    {clientFiles.length > 0 && (
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {clientFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/70 border border-slate-700/50 text-xs">
                            <div className="flex items-center gap-1.5 truncate">
                              <FileCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span className="text-slate-300 truncate text-[11px]" title={file.name}>{file.name}</span>
                            </div>
                            <button
                              onClick={() => removeClientFile(idx)}
                              className="text-slate-400 hover:text-rose-400 p-0.5 transition"
                              title="Remover prova do cliente"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Banner de Automação Rápida */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-indigo-200">Triagem 360° Automatizada</h2>
                      <p className="text-[11px] text-slate-400">Extraia autos, preliminares e fatos dos arquivos</p>
                    </div>
                  </div>
                  <button
                    id="auto-extract-btn"
                    onClick={handleAutoExtractEvidence}
                    disabled={isExtractingEvidence || (processFiles.length === 0 && clientFiles.length === 0 && attachedFiles.length === 0 && !caseDescription.trim())}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1 shrink-0"
                  >
                    {isExtractingEvidence ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3" />
                    )}
                    Extrair Autos & Provas
                  </button>
                </div>

                {/* Qualificação do Cliente e Réu (Adaptativo por Polo) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {clientRole === "reu" ? "Cliente Defendido (Polo Passivo / Réu)" : "Cliente / Autor(a)"}
                    </label>
                    <input
                      id="input-client-name"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder={clientRole === "reu" ? "Ex: Empresa Ré Ltda." : "Ex: Maria das Graças"}
                      className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {clientRole === "reu" ? "Parte Autora da Ação (Polo Ativo)" : "Parte Ré / Réu"}
                    </label>
                    <input
                      id="input-defendant-name"
                      type="text"
                      value={defendantName}
                      onChange={(e) => setDefendantName(e.target.value)}
                      placeholder={clientRole === "reu" ? "Ex: João da Silva (Autor)" : "Ex: Banco Santander S/A"}
                      className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Seleção de Área e Tribunal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Área do Direito
                    </label>
                    <select
                      id="select-law-area"
                      value={lawArea}
                      onChange={(e) => setLawArea(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="Direito do Consumidor / Bancário">Consumidor & Bancário</option>
                      <option value="Transporte Aéreo & Consumidor">Transporte Aéreo (Voos/Bagagem)</option>
                      <option value="Previdenciário (RMC/Empréstimo)">Previdenciário (RMC/Descontos)</option>
                      <option value="Cível Geral / Responsabilidade Civil">Cível Geral (Indenizações)</option>
                      <option value="Trabalhista (Reclamatória)">Trabalhista (Reclamatória/Defesa)</option>
                      <option value="Família e Sucessões">Família & Alimentos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                      <span>Tribunal Alvo</span>
                      <span className="text-[10px] text-purple-400 font-semibold">Súmulas locais</span>
                    </label>
                    <select
                      id="select-target-court"
                      value={targetCourt}
                      onChange={(e) => setTargetCourt(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-medium"
                    >
                      <option value="TJGO">TJGO (Goiás)</option>
                      <option value="TJSP">TJSP (São Paulo)</option>
                      <option value="TJRJ">TJRJ (Rio de Janeiro)</option>
                      <option value="TJMG">TJMG (Minas Gerais)</option>
                      <option value="TJDFT">TJDFT (Distrito Federal)</option>
                      <option value="TJPR">TJPR (Paraná)</option>
                      <option value="TJRS">TJRS (Rio Grande do Sul)</option>
                      <option value="TRF1">TRF1 (Federal)</option>
                      <option value="TRT18">TRT18 (Trabalhista GO)</option>
                      <option value="TRT2">TRT2 (Trabalhista SP)</option>
                    </select>
                  </div>
                </div>

                {/* Narrativa Fática / Argumentos da Defesa ou Ataque */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      {pieceType === "contestacao"
                        ? "Versão Fática da Defesa & Pontos a Rebater"
                        : "Narrativa Fática dos Acontecimentos"}
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab("modelos")}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      <BookOpen className="w-3 h-3" /> Usar Esqueleto Fático
                    </button>
                  </div>
                  <textarea
                    id="textarea-case-description"
                    value={caseDescription}
                    onChange={(e) => setCaseDescription(e.target.value)}
                    placeholder={
                      pieceType === "contestacao" || pieceType === "replica" || pieceType === "incidental" || pieceType === "recurso"
                        ? "Versão/Resumo dos fatos extraídos dos autos (Deixe vazio para auto-preencher via Extração 360°)..."
                        : "Descreva cronologicamente o que ocorreu com o cliente, datas, protocolos, valores pagos indevidamente..."
                    }
                    rows={5}
                    className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed resize-none font-mono"
                  />
                </div>
                
                {/* Comandos Extras / Prompt Direto */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Comandos Extras / Prompt Direto para a IA
                  </label>
                  <textarea
                    id="textarea-custom-prompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder='Ex: "Na qualidade de advogada do Rodrigo, reclamante, faça a impugnação da manifestação de id f8bbdea."'
                    rows={2}
                    className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed resize-none font-mono"
                  />
                </div>

                {/* Requerimentos Expressos CPC (Art. 319 / 335) */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Requisitos & Pedidos Processuais CPC
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        id="checkbox-urgency"
                        type="checkbox"
                        checked={wantsUrgency}
                        onChange={(e) => setWantsUrgency(e.target.checked)}
                        className="w-3.5 h-3.5 text-indigo-600 rounded bg-slate-700 border-slate-600 focus:ring-indigo-500"
                      />
                      <span>{pieceType === "contestacao" ? "Revogação da Liminar (300)" : "Tutela de Urgência (300)"}</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        id="checkbox-gratuity"
                        type="checkbox"
                        checked={wantsGratuity}
                        onChange={(e) => setWantsGratuity(e.target.checked)}
                        className="w-3.5 h-3.5 text-indigo-600 rounded bg-slate-700 border-slate-600 focus:ring-indigo-500"
                      />
                      <span>Gratuidade Justiça (Art. 98)</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer sm:col-span-2">
                      <input
                        id="checkbox-conciliation"
                        type="checkbox"
                        checked={hasConciliationOption}
                        onChange={(e) => setHasConciliationOption(e.target.checked)}
                        className="w-3.5 h-3.5 text-indigo-600 rounded bg-slate-700 border-slate-600 focus:ring-indigo-500"
                      />
                      <span>Interesse em audiência de conciliação / mediação (334 CPC)</span>
                    </label>
                  </div>

                  <div className="pt-1">
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      {pieceType === "contestacao" ? "Valor da Causa Contestada / Proveito Econômico" : "Valor da Causa Estimado / Pedidos (Art. 292 CPC)"}
                    </label>
                    <input
                      id="input-cause-value"
                      type="text"
                      value={causeValue}
                      onChange={(e) => setCauseValue(e.target.value)}
                      placeholder="Ex: R$ 15.000,00"
                      className="w-full bg-slate-800/90 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Botão de Redação 360 */}
                <div className="mt-auto pt-2">
                  <button
                    id="generate-petition-btn"
                    onClick={handleGeneratePetition}
                    disabled={isGenerating || (!caseDescription.trim() && processFiles.length === 0 && clientFiles.length === 0 && attachedFiles.length === 0)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Redigindo {pieceType === "contestacao" ? "Contestação" : pieceType === "replica" ? "Réplica" : pieceType === "incidental" ? "Manifestação" : pieceType === "recurso" ? "Recurso" : "Petição"} 360°...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {pieceType === "contestacao"
                            ? "Redigir Contestação & Defesa 360°"
                            : pieceType === "replica"
                            ? "Redigir Réplica / Impugnação 360°"
                            : pieceType === "incidental"
                            ? "Redigir Manifestação Incidental 360°"
                            : pieceType === "recurso"
                            ? "Redigir Recurso 360°"
                            : "Redigir Petição Inicial 360°"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </section>

              {/* Lado Direito: Visualizador da Peça e Ferramentas Pró-Autor */}
              <section
                id="petition-viewer-section"
                className={`flex-1 bg-slate-950 flex-col overflow-hidden relative ${
                  currentRecord && mobileEditorView === "form" ? "hidden md:flex" : "flex"
                }`}
              >
                {currentRecord ? (
                  <>
                    {/* Barra de Ações Rápidas Responsiva */}
                    <div className="min-h-12 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-2 sm:py-0 shrink-0 gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-200 truncate max-w-[200px] sm:max-w-md" title={currentRecord.title}>
                          {currentRecord.title}
                        </span>
                        {currentRecord.auditCpc && (
                          <button
                            type="button"
                            onClick={() => setActiveTab("auditoria")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition flex items-center gap-1 ${
                              currentRecord.auditCpc.safeForProtocol
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                                : "bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            Auditoria CPC: {currentRecord.auditCpc.score}/100
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 sm:pb-0">
                        {currentRecord.kitProcuracao && (
                          <button
                            onClick={() => handleCopy(currentRecord.kitProcuracao)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1 border border-slate-700 shrink-0"
                            title="Copiar modelo de Procuração Ad Judicia específico para esta ação"
                          >
                            <Copy className="w-3 h-3 text-indigo-400" /> Procuração
                          </button>
                        )}
                        {currentRecord.kitDeclaracaoPobreza && (
                          <button
                            onClick={() => handleCopy(currentRecord.kitDeclaracaoPobreza)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1 border border-slate-700 shrink-0"
                            title="Copiar Declaração de Hipossuficiência"
                          >
                            <Copy className="w-3 h-3 text-purple-400" /> Declaração
                          </button>
                        )}
                        {currentRecord.id && (
                          <button
                            type="button"
                            onClick={() => handlePromptDeleteHistoryItem({ stopPropagation: () => {} } as any, currentRecord)}
                            className="px-2.5 py-1 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 hover:text-rose-200 text-xs font-semibold transition flex items-center gap-1 border border-rose-800/40 shrink-0"
                            title="Excluir esta petição do histórico"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Excluir
                          </button>
                        )}
                        <button
                          id="copy-petition-btn"
                          onClick={() => handleCopy()}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1 border border-slate-700 shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </button>
                        <button
                          id="export-word-btn"
                          onClick={handleExportWord}
                          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" /> Word (.docx)
                        </button>
                      </div>
                    </div>

                    {/* Banner de Destaque da Matriz Art. 341 CPC (Quando em Contestação / Defesa) */}
                    {currentRecord.impugnacaoMatriz && currentRecord.impugnacaoMatriz.length > 0 && (
                      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border-b border-amber-500/30 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-xs text-amber-200">
                            <strong>Matriz Art. 341 CPC:</strong> {currentRecord.impugnacaoMatriz.length} ponto(s) da inicial adversa rebatidos individualmente com provas!
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("impugnacao")}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition flex items-center gap-1 shrink-0 shadow"
                        >
                          Ver Matriz <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Texto Formatado da Petição Inicial */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8">
                      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-4 sm:p-7 md:p-10 min-h-full">
                        <div className="prose prose-invert max-w-none prose-headings:font-bold prose-h1:text-center prose-h1:text-lg sm:prose-h1:text-xl prose-h1:text-indigo-300 prose-h2:text-sm sm:prose-h2:text-base prose-h2:text-indigo-400 prose-p:text-justify prose-p:leading-relaxed prose-p:text-slate-200 text-xs sm:text-sm">
                          <Markdown>{currentRecord.fullPetitionMarkdown}</Markdown>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-5 shadow-xl">
                      <Sparkles className="w-10 h-10 text-indigo-400/80 animate-pulse" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-200 mb-1">
                      Painel do Redator 360° em Prontidão
                    </h2>
                    <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                      Anexe comprovantes, extratos ou relatos do cliente. A IA efetuará a triagem probatória imediata e gerará a Petição Inicial completa com jurisprudência do tribunal selecionado e auditoria preventiva CPC.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveTab("modelos")}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-2"
                      >
                        <BookOpen className="w-4 h-4 text-indigo-400" /> Explorar Biblioteca Fática
                      </button>
                      {historyList.length > 0 && (
                        <button
                          onClick={() => setActiveTab("historico")}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-2"
                        >
                          <History className="w-4 h-4 text-purple-400" /> Abrir do Histórico ({historyList.length})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: BIBLIOTECA FÁTICA DE CASOS REPETITIVOS (PONTO 2.6) */}
          {/* ========================================================================= */}
          {activeTab === "modelos" && (
            <div id="repetitive-templates-tab" className="flex-1 p-3 sm:p-6 md:p-8 overflow-y-auto bg-slate-950">
              <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" /> Biblioteca de Fatos & Ações Repetitivas
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Esqueletos fáticos consolidados para demandas de massa da advocacia. Aplique com 1 clique para carregar os fatos-padrão, precedentes aplicáveis e rol de documentos exigidos.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {templatesList.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="bg-slate-900 border border-slate-800 hover:border-indigo-500/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition shadow-lg group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {tpl.category}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Tribunal Padrão: {tpl.targetCourtDefault}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition">
                          {tpl.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          {tpl.shortDesc}
                        </p>

                        <div className="mt-4 space-y-2">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                            Teses & Precedentes Pró-Autor Incluídos:
                          </span>
                          <ul className="space-y-1">
                            {tpl.keyClaims.slice(0, 3).map((claim, cIdx) => (
                              <li key={cIdx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{claim}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-3 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                            Provas Recomendadas:
                          </span>
                          <p className="text-[11px] text-slate-400 leading-tight">
                            {tpl.recommendedProves.join(" • ")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[11px] sm:text-xs text-indigo-400 font-medium flex items-center gap-1">
                          {tpl.suggestedUrgency ? "⚡ Requer Liminar" : "Rito Ordinário/Juizado"}
                        </span>
                        <button
                          onClick={() => handleApplyTemplate(tpl)}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition flex items-center gap-1.5 shrink-0"
                        >
                          Carregar <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA: MATRIZ DE IMPUGNAÇÃO ESPECÍFICA ART. 341 DO CPC (DEFESA) */}
          {/* ========================================================================= */}
          {activeTab === "impugnacao" && (
            <div id="impugnacao-matriz-tab" className="flex-1 p-3 sm:p-6 md:p-8 overflow-y-auto bg-slate-950">
              <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-amber-400" /> Matriz de Impugnação Específica (Art. 341 CPC)
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Ônus da Defesa
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                      O art. 341 do CPC impõe ao réu o ônus de impugnar precisamente cada fato alegado na petição inicial sob pena de presunção de veracidade. Esta matriz correlaciona cada alegação à respectiva refutação da defesa e prova documental anexada.
                    </p>
                  </div>

                  {currentRecord?.impugnacaoMatriz && currentRecord.impugnacaoMatriz.length > 0 && (
                    <button
                      onClick={() => {
                        const formatted = currentRecord.impugnacaoMatriz!.map((item, i) => 
                          `### PONTO ${i + 1}:\n- **Alegação Inicial**: ${item.alegacaoAutor || (item as any).alegacaoInicial}\n- **Refutação Defesa**: ${item.refutacaoDefesa}\n- **Prova**: ${item.documentoRef || (item as any).provaDocumentalCorrespondente || "Documental anexa"}`
                        ).join("\n\n");
                        navigator.clipboard.writeText(formatted);
                        toast.success("Matriz completa copiada para a área de transferência!");
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar Matriz Completa
                    </button>
                  )}
                </div>

                {!currentRecord?.impugnacaoMatriz || currentRecord.impugnacaoMatriz.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-3">
                    <CheckSquare className="w-12 h-12 text-slate-600 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-300">Nenhum ponto controvertido mapeado ainda</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Selecione o tipo <strong>Contestação</strong> no redator, anexe o PDF dos autos do processo (petição inicial adversa) e clique em <strong>Extrair Autos & Provas</strong> ou <strong>Redigir Contestação</strong>. A IA fará a dissecação de cada alegação fática do autor e montará este espelho de refutação com base no art. 341 do CPC.
                    </p>
                    <button
                      onClick={() => setActiveTab("editor")}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
                    >
                      Voltar ao Redator
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span>Total de fatos controvertidos: <strong>{currentRecord.impugnacaoMatriz.length}</strong></span>
                      <span className="text-[11px] text-emerald-400">✓ Todos contrapostos sem confissão ficta</span>
                    </div>

                    {currentRecord.impugnacaoMatriz.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow transition space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-mono font-bold">
                              {idx + 1}
                            </span>
                            Ponto Controvertido #{idx + 1}
                          </span>
                          <button
                            onClick={() => {
                              const txt = `PONTO ${idx + 1}:\nAlegação Inicial: ${item.alegacaoAutor || (item as any).alegacaoInicial}\nRefutação Defesa: ${item.refutacaoDefesa}\nProva Documental: ${item.documentoRef || (item as any).provaDocumentalCorrespondente || "Documental anexa"}`;
                              navigator.clipboard.writeText(txt);
                              toast.success(`Ponto #${idx + 1} copiado!`);
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 px-2 transition"
                            title="Copiar este ponto de impugnação"
                          >
                            <Copy className="w-3 h-3" /> Copiar
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
                          {/* Coluna 1: Alegação Inicial Adversa */}
                          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block">
                              1. Alegação na Inicial Adversa:
                            </span>
                            <p className="text-slate-300 leading-relaxed text-[11px]">
                              {item.alegacaoAutor || (item as any).alegacaoInicial}
                            </p>
                          </div>

                          {/* Coluna 2: Refutação Fática e Jurídica */}
                          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                              2. Refutação Fática da Defesa:
                            </span>
                            <p className="text-slate-200 leading-relaxed text-[11px]">
                              {item.refutacaoDefesa}
                            </p>
                          </div>

                          {/* Coluna 3: Prova Documental Anexa */}
                          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/30 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                              3. Prova Documental Indicada:
                            </span>
                            <p className="text-indigo-200 leading-relaxed text-[11px] font-medium flex items-start gap-1.5">
                              <FileCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                              <span>{item.documentoRef || (item as any).provaDocumentalCorrespondente || "Documental carreada aos autos"}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: AUDITORIA PRÉ-PROTOCOLO CPC ARTS. 319 E 320 (PONTO 2.4) */}
          {/* ========================================================================= */}
          {activeTab === "auditoria" && currentRecord?.auditCpc && (
            <div id="cpc-audit-tab" className="flex-1 p-3 sm:p-6 md:p-8 overflow-y-auto bg-slate-950">
              <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                
                {/* Header de Pontuação */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`p-2.5 sm:p-3.5 rounded-2xl shrink-0 ${
                      currentRecord.auditCpc.safeForProtocol
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}>
                      <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm sm:text-base font-bold text-slate-100">
                          Auditoria de Conformidade CPC (Arts. 319 e 320)
                        </h2>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase ${
                          currentRecord.auditCpc.safeForProtocol
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        }`}>
                          {currentRecord.auditCpc.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Varredura de risco contra despacho de emenda à inicial ou indeferimento. Peça pronta para protocolo seguro.
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {currentRecord.auditCpc.score}
                    </span>
                    <span className="text-xs text-slate-500 block">de 100 pontos</span>
                  </div>
                </div>

                {/* Vacinas Preventivas contra a Contestação */}
                {currentRecord.anticipatedDefenses && currentRecord.anticipatedDefenses.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-purple-400" /> Vacinas Preventivas (Antecipação das Teses do Réu)
                    </h3>
                    <ul className="space-y-2">
                      {currentRecord.anticipatedDefenses.map((defense, dIdx) => (
                        <li key={dIdx} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50">
                          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                          <span>{defense}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Itens do Checklist CPC */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Checklist de Requisitos Formais Obrigatórios:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentRecord.auditCpc.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 sm:p-4 flex items-start justify-between gap-3 shadow"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-200">
                              {item.label}
                            </span>
                            <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-400">
                              {item.requirement}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {item.details}
                          </p>
                          {item.recommendation && (
                            <p className="text-[11px] text-amber-400 mt-1">
                              ⚠️ {item.recommendation}
                            </p>
                          )}
                        </div>

                        {item.isCompliant ? (
                          <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1 rounded-full bg-amber-500/20 text-amber-400 shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 4: JURISPRUDÊNCIA & TESES FORENSES COM GOOGLE GROUNDING */}
          {/* ========================================================================= */}
          {activeTab === "jurisprudencia" && currentRecord?.favorableJurisprudence && (
            <div id="jurisprudence-tab" className="flex-1 p-3 sm:p-6 md:p-8 overflow-y-auto bg-slate-950">
              <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                
                {/* Banner de Transparência e Google Grounding */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 shadow-xl space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <Globe className="w-4 h-4 animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                          Pesquisa de Jurisprudência & Precedentes
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Google Grounding Ativo
                          </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Conexão com busca em tempo real no Google e portais de tribunais para validação de precedentes.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Legenda Explicativa de Segurança Jurídica */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-200/90 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-emerald-300">Jurisprudência Real Verificada:</strong>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Acórdãos, Súmulas ou Temas Repetitivos autênticos confirmados na web com fonte oficial.
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-200/90 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-300">Sugestão de Tese Argumentativa:</strong>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Construção teórica/doutrinária de mérito. Recomenda-se pesquisar os autos no tribunal antes de citar numeração.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Banner de Busca Automática Inteligente pelo Tema */}
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5 sm:mt-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-indigo-200">
                            Pesquisa Automática pelo Tema da Peça:
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-900/80 text-indigo-300 border border-indigo-700/50">
                            {getSmartThemeForRecord(currentRecord) || "Tema Geral"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Tribunal: <strong className="text-slate-200">{currentRecord.targetCourt || "TJGO"}</strong> • A pesquisa no Google Grounding é acionada automaticamente conforme a matéria desta minuta/petição.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const theme = getSmartThemeForRecord(currentRecord);
                        handleSearchGrounding(`${theme} ${currentRecord.targetCourt || "TJGO"}`, false);
                      }}
                      disabled={isSearchingGrounding}
                      className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 shadow"
                      title="Forçar atualização da pesquisa no Google Grounding"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSearchingGrounding ? "animate-spin" : ""}`} />
                      {isSearchingGrounding ? "Buscando..." : "Atualizar Pesquisa"}
                    </button>
                  </div>

                  {/* Barra de Pesquisa On-Demand no Google Grounding */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder={`Pesquisar julgados reais no Google (${currentRecord.targetCourt || "TJGO"})...`}
                        value={groundingSearchQuery}
                        onChange={(e) => setGroundingSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSearchGrounding();
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={() => handleSearchGrounding()}
                      disabled={isSearchingGrounding}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-indigo-600/20"
                    >
                      {isSearchingGrounding ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Consultando Google...
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" />
                          Pesquisar no Google (Grounding)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Indicador Ativo de Busca Automática no Google Grounding */}
                {isSearchingGrounding && (
                  <div className="p-4 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 text-xs flex items-center gap-3 animate-pulse shadow-lg">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                    <div>
                      <strong className="text-indigo-100 block">
                        Pesquisando jurisprudência no Google Grounding em tempo real...
                      </strong>
                      <p className="text-[11px] text-indigo-300/80 mt-0.5">
                        Varrendo decisões autênticas dos tribunais para: "{getSmartThemeForRecord(currentRecord)}"...
                      </p>
                    </div>
                  </div>
                )}

                {/* Lista de Julgados e Teses */}
                <div className="space-y-3 sm:space-y-4">
                  {currentRecord.favorableJurisprudence.map((item, idx) => {
                    const isReal = item.tipo === "real_verificado" || item.isRealVerificado === true;
                    return (
                      <div
                        key={idx}
                        className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 transition ${
                          isReal ? "border-emerald-500/30 hover:border-emerald-500/50" : "border-amber-500/30 hover:border-amber-500/50"
                        }`}
                      >
                        {/* Topo do Card com Tribunal, Classificação e Ações */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {item.court}
                            </span>

                            {isReal ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                Jurisprudência Real Verificada
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                <Lightbulb className="w-3 h-3 text-amber-400" />
                                💡 Sugestão de Tese Argumentativa
                              </span>
                            )}

                            {(() => {
                              if (isReal) {
                                return (
                                  <span className="text-xs font-bold text-slate-200">
                                    {item.precedentNumber || "Precedente Oficial"}
                                  </span>
                                );
                              }
                              const isOfficialSumula = item.precedentNumber && /súmula|sumula|tema repetitivo|tema vinculante|súmula vinculante/i.test(item.precedentNumber);
                              if (isOfficialSumula) {
                                return (
                                  <span className="text-xs font-bold text-amber-300">
                                    {item.precedentNumber}
                                  </span>
                                );
                              }
                              return (
                                <span className="text-xs font-medium text-amber-300/90 italic">
                                  💡 Tese Doutrinária de Mérito
                                </span>
                              );
                            })()}
                          </div>

                          <div className="flex items-center gap-2 ml-auto">
                            {item.fonteUrl ? (
                              <a
                                href={item.fonteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition"
                                title="Abrir acórdão no repositório oficial"
                              >
                                <ExternalLink className="w-3 h-3" /> Abrir Fonte Oficial
                              </a>
                            ) : (
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(
                                  `${item.court} jurisprudencia ${item.theme}`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
                                title="Buscar decisões correlatas no Google"
                              >
                                <Search className="w-3 h-3" /> Checar no Google ↗
                              </a>
                            )}

                            <button
                              onClick={() => handleCopy(item.fullCitation)}
                              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium transition"
                            >
                              <Copy className="w-3 h-3" /> Copiar
                            </button>
                          </div>
                        </div>

                        {/* Tema */}
                        <h4 className="text-sm font-semibold text-slate-200">
                          {item.theme}
                        </h4>

                        {/* Alerta Preventivo se for Sugestão de Tese */}
                        {!isReal && (
                          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-600/30 text-xs text-amber-200 flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="font-semibold text-amber-300">Sugestão de Linha Argumentativa:</span>
                              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                                {item.alertaAutenticidade ||
                                  "Esta fundamentação doutrinária representa a tese favorável de mérito. Para citar número específico de processo ou relator na petição, consulte previamente a jurisprudência oficial do tribunal."}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Ementa ou Citação da Tese */}
                        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300 leading-relaxed font-serif italic">
                          "{item.fullCitation}"
                        </div>

                        {/* Impacto no caso */}
                        <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                          <strong>Impacto favorável no caso:</strong> {item.favorableArgument}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 5: HISTÓRICO TOTALMENTE INDEPENDENTE (APENAS SUPER ADMIN) */}
          {/* ========================================================================= */}
          {activeTab === "historico" && (
            <div id="independent-history-tab" className="flex-1 p-3 sm:p-6 md:p-8 overflow-y-auto bg-slate-950">
              <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                      <History className="w-5 h-5 text-indigo-400" /> Histórico Exclusivo da Advocacia
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Banco de dados isolado no Firestore (<code>initial_petitions_history</code>), inacessível por assessores e juízes do gabinete.
                    </p>
                  </div>
                  <button
                    onClick={loadHistory}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                  </button>
                </div>

                {isLoadingHistory ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-400">Carregando acervo de petições...</span>
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-12 text-center">
                    <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-300 mb-1">Nenhuma petição salva ainda</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                      Todas as peças redigidas no painel de Petição Inicial 360° são salvas de forma estritamente confidencial neste módulo.
                    </p>
                    <button
                      onClick={() => setActiveTab("editor")}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow"
                    >
                      Redigir Primeira Petição
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyList.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectHistoryItem(item)}
                        className="bg-slate-900 border border-slate-800 hover:border-indigo-500/60 rounded-2xl p-3.5 sm:p-4.5 cursor-pointer transition shadow flex items-center justify-between group gap-3"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition truncate max-w-full">
                              {item.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.pieceType === "contestacao"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : item.pieceType === "replica"
                                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                : item.pieceType === "incidental"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : item.pieceType === "recurso"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}>
                              {item.pieceType === "contestacao"
                                ? "Contestação"
                                : item.pieceType === "replica"
                                ? "Réplica"
                                : item.pieceType === "incidental"
                                ? "Incidental"
                                : item.pieceType === "recurso"
                                ? "Recurso"
                                : "Petição Inicial"}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                              {item.targetCourt}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300">
                              {item.lawArea}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">
                            {item.caseDescription || item.cleanTextPreview || "Sem descrição fática."}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 flex-wrap">
                            {item.processNumber && (
                              <>
                                <span className="text-amber-400 font-mono">Autos: {item.processNumber}</span>
                                <span>•</span>
                              </>
                            )}
                            <span>{item.clientRole === "reu" ? "Cliente (Réu)" : "Cliente (Autor)"}: {item.clientName || "Não informado"}</span>
                            <span>•</span>
                            <span>{item.clientRole === "reu" ? "Adverso (Autor)" : "Réu"}: {item.defendantName || "Não informado"}</span>
                            <span>•</span>
                            <span>{new Date(item.createdAt).toLocaleDateString("pt-BR")} às {new Date(item.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-1.5 bg-slate-800/95 border border-rose-500/50 rounded-xl p-1 shadow-lg animate-in fade-in duration-150">
                              <span className="text-[11px] text-rose-300 font-bold px-1.5 whitespace-nowrap">
                                Excluir?
                              </span>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-semibold transition"
                              >
                                Não
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={(e) => handleExecuteDeleteById(item.id, e)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow transition flex items-center gap-1 disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                                Sim
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(item.id);
                                }}
                                className="p-2 sm:p-2.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition"
                                title="Excluir Petição do Histórico"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <div className="p-1 text-slate-500 group-hover:text-indigo-400 transition">
                                <ChevronRight className="w-5 h-5" />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Modal de Confirmação de Exclusão in-app */}
        {recordToDelete && (
          <div
            id="modal-confirm-delete-petition"
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
            onClick={() => !isDeleting && setRecordToDelete(null)}
          >
            <div
              className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-white">
                    Excluir Petição do Histórico?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Tem certeza de que deseja remover permanentemente a petição <strong className="text-slate-200">"{recordToDelete.title}"</strong>? Esta ação não poderá ser desfeita.
                  </p>
                </div>
              </div>

              {recordToDelete.clientName && (
                <div className="px-3 py-2 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">Autor:</span>
                  <span className="font-semibold text-slate-200">{recordToDelete.clientName}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setRecordToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirmar Exclusão</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
