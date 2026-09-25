import { MutiraoPrevidenciarioView } from './MutiraoPrevidenciarioView';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Zap,
  X,
  Gavel,
  Calendar,
  Users,
  FileText,
  Sparkles,
  Copy,
  Check,
  Plus,
  Trash2,
  Save,
  MessageSquare,
  ShieldAlert,
  HelpCircle,
  Clock,
  ChevronRight,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  UserCheck,
  UserX,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Maximize2,
  Minimize2,
  Search,
  Hammer,
  ChevronLeft,
  UploadCloud,
  FileUp,
  Loader2,
  Scale,
  RefreshCw,
  FileCheck,
  Tag,
  ShieldCheck,
  Eye,
  FileCode,
  FileSignature,
  Download,
  Printer,
  ScrollText,
  Sliders,
  Settings2,
  ChevronDown,
  ChevronUp,
  ArrowDownToLine,
  Target,
} from 'lucide-react';
import {
  HearingRecord,
  HearingWitness,
  HearingControversyPoint,
  HearingType,
} from '../types';
import {
  getLocalHearings,
  subscribeToHearingRecords,
  saveHearingRecord,
  deleteHearingRecord,
  createEmptyHearing,
  SAMPLE_HEARINGS,
} from '../utils/hearingsDb';
import { extractTextFromPdf } from '../utils/pdfExtractor';
import { exportHearingMinutesToDocx, printHearingMinutes } from '../utils/documentExport';
import { useAuth } from '../lib/AuthContext';
import { getCustomApiKey, checkUserAiAccess, requestOpenApiKeyModal, getApiHeaders } from '../utils/apiKeyManager';
import { getKnowledgeDocs } from '../utils/knowledgeDb';
import { getCabinetTeses } from '../utils/tesesDb';
import { recordApiExecution } from '../utils/apiUsageTracker';

interface HearingWorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHistory?: () => void;
}

export const HearingWorkbenchModal: React.FC<HearingWorkbenchModalProps> = ({
  isOpen,
  onClose,
  onOpenHistory,
}) => {
  const { user, userProfile, isSuperAdmin, isJudge, tenantName } = useAuth();

  // Helper to resolve the judge's name smartly
  const resolveJudgeName = () => {
    if (activeHearing?.judgeName) return activeHearing.judgeName;
    if (isJudge && userProfile?.name) return userProfile.name;
    if (tenantName) {
      const match = tenantName.match(/\(([^)]+)\)/);
      if (match && match[1].toLowerCase().includes('dr')) return match[1];
      if (tenantName.toLowerCase().startsWith('gabinete do juiz ')) return tenantName.substring(17);
      if (tenantName.toLowerCase().startsWith('gabinete do dr')) return tenantName.substring(12);
    }
    return userProfile?.name || 'Rafael Machado de Souza';
  };

  // State: List of hearings & Active hearing
  const [hearings, setHearings] = useState<HearingRecord[]>([]);
  const [activeHearing, setActiveHearing] = useState<HearingRecord | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'briefing' | 'inquiring' | 'deliberations' | 'sentence' | 'minutes'>('briefing');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'workbench'>('workbench');
  const [viewMode, setViewMode] = useState<'normal' | 'mutirao'>('normal');

  // AI Loading and state
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // PDF Extraction State
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [extractionProgressText, setExtractionProgressText] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showRawSourceModal, setShowRawSourceModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Input fields for Briefing AI Generation
  const [caseInputText, setCaseInputText] = useState('');

  // Deliberation parameters
  const [deliberationType, setDeliberationType] = useState<
    'acordo_total' | 'acordo_parcial' | 'revelia' | 'contradita' | 'indeferimento_perguntas' | 'diligencia'
  >('acordo_total');
  const [agreedValue, setAgreedValue] = useState('15.000,00');
  const [paymentTerms, setPaymentTerms] = useState('Em 3 parcelas mensais de R$ 5.000,00, todo dia 10, via chave PIX do patrono');
  const [penaltyPercent, setPenaltyPercent] = useState('20');
  const [partialPendingItems, setPartialPendingItems] = useState('Remanesce controvertido o pedido de indenização por danos morais.');
  const [deliberationDraft, setDeliberationDraft] = useState('');

  // Sentence parameters
  const [sentenceVerdict, setSentenceVerdict] = useState<'auto' | 'procedencia' | 'parcial_procedencia' | 'improcedencia' | 'sem_resolucao'>('auto');
  const [sentenceHighlights, setSentenceHighlights] = useState('');
  const [sentenceDamages, setSentenceDamages] = useState('');
  const [sentenceDraft, setSentenceDraft] = useState('');

  // Minutes (Ata de Audiência) parameters & draft
  const [minutesDraft, setMinutesDraft] = useState('');
  const [showMinutesConfig, setShowMinutesConfig] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [showHolisticSynopsis, setShowHolisticSynopsis] = useState(false);

  // Exclusão de audiência com modal in-app (sem depender de window.confirm)
  const [hearingToDelete, setHearingToDelete] = useState<HearingRecord | null>(null);
  const [isDeletingHearing, setIsDeletingHearing] = useState(false);

  // New Witness Modal or Inline Add
  const [newWitnessName, setNewWitnessName] = useState('');
  const [newWitnessRole, setNewWitnessRole] = useState<HearingWitness['role']>('testemunha_autor');
  const [newWitnessTopic, setNewWitnessTopic] = useState('');

  // Sincronizar estados locais quando activeHearing mudar
  useEffect(() => {
    if (activeHearing) {
      if (activeHearing.deliberationDraft !== undefined) {
        setDeliberationDraft(activeHearing.deliberationDraft || '');
      }
      if (activeHearing.instantSentenceDraft !== undefined) {
        setSentenceDraft(activeHearing.instantSentenceDraft || '');
      }
      if (activeHearing.hearingMinutesDraft !== undefined) {
        setMinutesDraft(activeHearing.hearingMinutesDraft || '');
      }
      if (activeHearing.deliberationType) {
        setDeliberationType(activeHearing.deliberationType as any);
      }
      if (activeHearing.instantSentenceVerdict) {
        setSentenceVerdict(activeHearing.instantSentenceVerdict as any);
      }
    }
  }, [activeHearing?.id]);

  // Subscribe to real-time hearings on open
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToHearingRecords((list) => {
      setHearings(list);
      setActiveHearing((prev) => {
        if (!prev && list.length > 0) return list[0];
        if (prev) {
          const matched = list.find((h) => h.id === prev.id);
          return matched || list[0];
        }
        return list[0] || null;
      });
    });
    return () => unsub();
  }, [isOpen]);

  // Handle Copy to clipboard
  const handleCopy = (text: string, sectionId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  // Handle Save
  const handleSaveActiveHearing = async (hearingToSave?: HearingRecord) => {
    const target = hearingToSave || activeHearing;
    if (!target) return;
    try {
      await saveHearingRecord(target);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e) {
      console.warn('Erro ao salvar audiência:', e);
    }
  };

  // AI Action Runner
  const runAiHearingCopilot = async (
    actionType: 'briefing' | 'questions' | 'deliberation' | 'instant_sentence' | 'minutes',
    extraPayload: any = {},
    baseHearing?: HearingRecord
  ) => {
    const currentHearing = baseHearing || activeHearing;
    if (!currentHearing) return;
    
    // Check AI Access before proceeding
    const access = checkUserAiAccess(userProfile, user?.email);
    if (!access.canExecute) {
      requestOpenApiKeyModal(access.message);
      return;
    }
    
    setIsLoadingAi(true);
    setAiError(null);

    try {
      const storedKey = getCustomApiKey() || '';
      let activeKnowledgeDocs: any[] = [];
      try {
        activeKnowledgeDocs = (await getKnowledgeDocs()).filter(d => d.isActive);
      } catch {}
      let activeTesesText = "";
      try {
        const teses = await getCabinetTeses();
        if (teses.isEnabled) activeTesesText = teses.text || "";
      } catch {}

      const response = await fetch('/api/hearing-copilot', {
        method: 'POST',
        headers: getApiHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          actionType,
          processNumber: currentHearing.processNumber,
          author: currentHearing.author,
          defendant: currentHearing.defendant,
          actionClass: currentHearing.actionClass,
          subject: currentHearing.subject,
          notes: currentHearing.hearingNotes,
          caseText: extraPayload.caseText || caseInputText || currentHearing.rawSourceText || currentHearing.caseFactsSummary,
          plaintiffClaims: currentHearing.plaintiffClaims,
          defendantClaims: currentHearing.defendantClaims,
          counterClaim: currentHearing.counterClaim,
          pointsOfControversy: currentHearing.pointsOfControversy,
          witnessesList: currentHearing.witnesses,
          deliberationParams: extraPayload.deliberationParams,
          sentenceParams: extraPayload.sentenceParams,
          minutesParams: extraPayload.minutesParams,
          judgeName: resolveJudgeName(),
          cabinetTesesText: activeTesesText,
          knowledgePdfs: activeKnowledgeDocs,
          ...extraPayload,
        }),
      });

      if (!response.ok) {
        let errStr = 'Falha ao processar comando com IA.';
        try {
          const errText = await response.text();
          const errJson = JSON.parse(errText);
          if (errJson?.error) errStr = errJson.error;
        } catch {}
        throw new Error(errStr);
      }

      let resData;
      try {
        const responseText = await response.text();
        resData = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Falha ao processar comando com IA: o servidor retornou um formato inválido.");
      }

      if (resData?.usage?.totalTokenCount) {
        recordApiExecution({
          label: `Mesa de Audiência (${actionType})`,
          processNumber: currentHearing.processNumber || "Processo de Audiência",
          model: resData.modelUsed || "Gemini Flash",
          promptTokens: resData.usage.promptTokenCount,
          outputTokens: resData.usage.candidatesTokenCount,
          totalTokens: resData.usage.totalTokenCount,
          module: 'audiencia',
        }).catch((e) => console.warn("Falha ao registrar telemetria de audiência:", e));
      }

      if (actionType === 'briefing') {
        const data = resData.data || {};
        const updated: HearingRecord = {
          ...currentHearing,
          processNumber: data.processNumber && data.processNumber !== 'Não informado' ? data.processNumber : (currentHearing.processNumber || 'Processo em Instrução'),
          author: data.author && data.author !== 'Não informado' ? data.author : (currentHearing.author || 'Autor'),
          defendant: data.defendant && data.defendant !== 'Não informado' ? data.defendant : (currentHearing.defendant || 'Réu'),
          actionClass: data.actionClass || currentHearing.actionClass || 'Procedimento Comum Cível',
          subject: data.subject || currentHearing.subject || 'Cível Geral',
          caseFactsSummary: data.caseFactsSummary || currentHearing.caseFactsSummary,
          holisticSynopsis: data.holisticSynopsis || resData.holisticSynopsis || currentHearing.holisticSynopsis,
          deduplicationStats: data.deduplicationStats || resData.deduplicationStats || currentHearing.deduplicationStats,
          plaintiffClaims: data.plaintiffClaims || currentHearing.plaintiffClaims,
          defendantClaims: data.defendantClaims || currentHearing.defendantClaims,
          counterClaim: data.counterClaim || currentHearing.counterClaim,
          whatRemainsToProve: data.whatRemainsToProve || currentHearing.whatRemainsToProve,
          controversySummary: data.controversySummary || currentHearing.controversySummary,
          pointsOfControversy: Array.isArray(data.pointsOfControversy) && data.pointsOfControversy.length > 0
            ? data.pointsOfControversy
            : currentHearing.pointsOfControversy,
          witnesses: Array.isArray(data.witnesses) && data.witnesses.length > 0
            ? data.witnesses
            : currentHearing.witnesses,
          keyQuestions: Array.isArray(data.keyQuestions) ? data.keyQuestions : currentHearing.keyQuestions,
          alertsAndTraps: Array.isArray(data.alertsAndTraps) ? data.alertsAndTraps : currentHearing.alertsAndTraps,
          uploadedPdfNames: extraPayload.uploadedPdfNames || currentHearing.uploadedPdfNames,
          rawSourceText: extraPayload.caseText || currentHearing.rawSourceText,
        };
        setActiveHearing(updated);
        await handleSaveActiveHearing(updated);
      } else if (actionType === 'questions') {
        const questionsText = resData.text;
        return questionsText;
      } else if (actionType === 'deliberation') {
        setDeliberationDraft(resData.text || '');
        const updated: HearingRecord = {
          ...currentHearing,
          deliberationType,
          deliberationDraft: resData.text || '',
        };
        setActiveHearing(updated);
        await handleSaveActiveHearing(updated);
      } else if (actionType === 'instant_sentence') {
        setSentenceDraft(resData.text || '');
        const updated: HearingRecord = {
          ...currentHearing,
          instantSentenceVerdict: sentenceVerdict,
          instantSentenceDraft: resData.text || '',
        };
        setActiveHearing(updated);
        await handleSaveActiveHearing(updated);
      } else if (actionType === 'minutes') {
        const genMinutes = resData.text || '';
        setMinutesDraft(genMinutes);
        const updated: HearingRecord = {
          ...currentHearing,
          hearingMinutesDraft: genMinutes,
          hearingMinutesGeneratedAt: Date.now(),
        };
        setActiveHearing(updated);
        await handleSaveActiveHearing(updated);
        return genMinutes;
      }
    } catch (err: any) {
      console.error('Hearing Copilot error:', err);
      setAiError(err.message || 'Erro ao conectar aos serviços de IA.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Gerar Ata Completa com IA
  const handleGenerateMinutesWithAi = async () => {
    if (!activeHearing) return;
    const witnessesSummaryText = (activeHearing.witnesses || [])
      .map(
        (w, i) =>
          `${i + 1}) ${w.name} (${w.role.replace('_', ' ').toUpperCase()}): ${
            w.notes ? `Declarações: ${w.notes}` : 'Depoimento colhido na audiência.'
          }`
      )
      .join('\n');

    const minutesParams = {
      judiciaryState: activeHearing.judiciaryState || 'PODER JUDICIÁRIO DO ESTADO DE GOIÁS',
      comarcaName: activeHearing.comarcaName || activeHearing.courtName || 'COMARCA DE MONTES CLAROS DE GOIÁS',
      hearingTitle: activeHearing.hearingTitle || 'AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO',
      hearingArea: activeHearing.hearingArea || 'civel',
      courtName: activeHearing.courtName || activeHearing.comarcaName || 'Comarca de Montes Claros de Goiás',
      hearingDate: activeHearing.scheduledDate
        ? new Date(activeHearing.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR'),
      hearingTime: activeHearing.scheduledTime || '14:00',
      hearingModality: activeHearing.hearingModality || 'Presencial',
      judgeName: resolveJudgeName(),
      assessorName: activeHearing.assessorName || 'Assessor(a) de Gabinete',
      plaintiffPresence: activeHearing.plaintiffPresence || 'Presente',
      plaintiffLawyerName: activeHearing.plaintiffLawyerName || 'Patrono do Autor',
      plaintiffLawyerOab: activeHearing.plaintiffLawyerOab || '',
      plaintiffLawyerPresence: activeHearing.plaintiffLawyerPresence || 'Presente',
      defendantPresence: activeHearing.defendantPresence || 'Presente',
      defendantPrepostoName: activeHearing.defendantPrepostoName || '',
      defendantLawyerName: activeHearing.defendantLawyerName || 'Patrono do Réu',
      defendantLawyerOab: activeHearing.defendantLawyerOab || '',
      defendantLawyerPresence: activeHearing.defendantLawyerPresence || 'Presente',
      prosecutorPresence: activeHearing.prosecutorPresence || 'Dispensado',
      prosecutorName: activeHearing.prosecutorName || '',
      studentOuvinte: activeHearing.studentOuvinte || '',
      victimsNames: activeHearing.victimsNames || '',
      alegacoesFinaisPrazo: activeHearing.alegacoesFinaisPrazo || (activeHearing.hearingArea === 'criminal' ? '05 (cinco) dias' : '10 (dez) dias'),
      secretarySignature: activeHearing.secretarySignature || 'Eu GMF, Secretária, digitei e subscrevi o presente termo.',
      occurrences: activeHearing.hearingOccurrences || 'Instrução transcorrida na perfeita ordem dos trabalhos.',
      witnessesSummary: witnessesSummaryText || 'Sem prova testemunhal ou partes ouvidas.',
      deliberationText: deliberationDraft || activeHearing.deliberationDraft || '',
      sentenceText: sentenceDraft || activeHearing.instantSentenceDraft || '',
    };

    await runAiHearingCopilot('minutes', { minutesParams });
  };

  // Montar Esqueleto Padrão Imediato da Ata (Sem esperar IA - Modelo Paradigma)
  const handleBuildStandardMinutesTemplate = () => {
    if (!activeHearing) return;
    const isCriminal =
      activeHearing.hearingArea === 'criminal' ||
      (activeHearing.actionClass || '').toLowerCase().includes('penal') ||
      (activeHearing.actionClass || '').toLowerCase().includes('crime');

    const hDate = activeHearing.scheduledDate
      ? new Date(activeHearing.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR');

    const formatHearingTime = (timeStr?: string) => {
      if (!timeStr) return '14H00';
      const clean = timeStr.trim().replace('h', ':').replace('H', ':');
      const [h, m] = clean.split(':');
      if (h && m) {
        return `${h.padStart(2, '0')}H${m.padStart(2, '0')}`;
      }
      return timeStr.toUpperCase();
    };

    const hTime = formatHearingTime(activeHearing.scheduledTime);
    const judiciary = (activeHearing.judiciaryState || 'PODER JUDICIÁRIO DO ESTADO DE GOIÁS').toUpperCase();
    const comarca = (activeHearing.comarcaName || activeHearing.courtName || 'COMARCA DE MONTES CLAROS DE GOIÁS').toUpperCase();
    const title = (activeHearing.hearingTitle || 'AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO').toUpperCase();

    // Juiz
    const rawJudge = resolveJudgeName();
    const judgeUpper = rawJudge.toUpperCase().startsWith('DR.') ? rawJudge.toUpperCase() : `DR. ${rawJudge.toUpperCase()}`;
    const judgeSignatureName = rawJudge.replace(/^dr\.\s*/i, '').replace(/^dra\.\s*/i, '');

    // Promotor (Criminal)
    const rawPromotor = activeHearing.prosecutorName || 'Dra. Júlia Lopes de Souza';
    const promotorUpper =
      rawPromotor.toUpperCase().startsWith('DR.') || rawPromotor.toUpperCase().startsWith('DRA.')
        ? rawPromotor.toUpperCase()
        : `DRA. ${rawPromotor.toUpperCase()}`;

    // Partes e Patronos
    const autorUpper = (activeHearing.author || 'PARTE AUTORA').toUpperCase();
    const rawAdvAutor = activeHearing.plaintiffLawyerName || 'Dra. Lara Campos Azevedo';
    const advAutorUpper =
      rawAdvAutor.toUpperCase().startsWith('DR.') || rawAdvAutor.toUpperCase().startsWith('DRA.')
        ? rawAdvAutor.toUpperCase()
        : `DRA. ${rawAdvAutor.toUpperCase()}`;

    const reuUpper = (activeHearing.defendant || 'PARTE RÉ').toUpperCase();
    const rawAdvReu =
      activeHearing.defendantLawyerName ||
      (isCriminal ? 'Dra. Jaqueline da Silva Rodrigues' : 'Dr. Paulo Henrique de Morais');
    const advReuUpper =
      rawAdvReu.toUpperCase().startsWith('DR.') || rawAdvReu.toUpperCase().startsWith('DRA.')
        ? rawAdvReu.toUpperCase()
        : `DR. ${rawAdvReu.toUpperCase()}`;

    // 1. Cabeçalho Centralizado
    let text = `${judiciary}\n${comarca}\n${title}\n\n`;

    // 2. Bloco de Identificação
    text += `DATA: ${hDate} às ${hTime}\n`;
    text += `PROCESSO Nº. ${activeHearing.processNumber || 'N/A'}\n`;
    text += `JUIZ: ${judgeUpper}\n`;

    if (isCriminal) {
      text += `PROMOTORA: ${promotorUpper}\n`;
      text += `ACUSADO: ${reuUpper}\n`;
      text += `ADVOGADA: ${advReuUpper}\n`;
    } else {
      text += `REQUERENTES: ${autorUpper}\n`;
      text += `ADVOGADA DOS REQUERENTES: ${advAutorUpper}\n`;
      text += `REQUERIDO: ${reuUpper}\n`;
      text += `ADVOGADO DO REQUERIDO: ${advReuUpper}\n`;
    }

    if (activeHearing.studentOuvinte) {
      text += `ESTUDANTE: ${activeHearing.studentOuvinte}\n`;
    }

    text += `\n`;

    // 3. CORPO DO TERMO EM PARÁGRAFO CONTÍNUO
    if (isCriminal) {
      const vitimas = activeHearing.victimsNames || 'as vítimas qualificadas nos autos';
      text += `ABERTA A AUDIÊNCIA: Realizado o pregão, verificou-se a presença do acusado ${reuUpper}, acompanhado de sua advogada ${advReuUpper}. Presente a representante do Ministério Público. Presente as vítimas ${vitimas}. `;
      text += `Iniciada a instrução, colheu-se o depoimento das vítimas ${vitimas}. `;

      const informantes = (activeHearing.witnesses || []).filter((w) => w.role === 'informante');
      const compromissadas = (activeHearing.witnesses || []).filter((w) => w.role === 'testemunha_reu' || w.role === 'testemunha_autor');
      const dispensadas = (activeHearing.witnesses || []).filter((w) => w.status === 'dispensado');

      if (informantes.length > 0) {
        text += `Em seguida, foi ouvido o informante ${informantes.map((i) => i.name.toUpperCase()).join(' e ')}. `;
      }
      if (compromissadas.length > 0) {
        text += `Em seguida, foi ouvida a testemunha ${compromissadas.map((c) => c.name.toUpperCase()).join(' e ')}. `;
      }
      if (dispensadas.length > 0) {
        text += `A testemunha ${dispensadas.map((d) => d.name.toUpperCase()).join(' e ')} foi dispensada. `;
      }

      text += `Após, entrevista reservada entre o acusado com sua advogada, houve o interrogatório do acusado ${reuUpper}. `;

      if (activeHearing.hearingOccurrences) {
        text += `${activeHearing.hearingOccurrences} `;
      }

      if (activeHearing.instantSentenceDraft || sentenceDraft) {
        text += `Ato contínuo, o MM. Juiz proferiu a seguinte SENTENÇA: “${sentenceDraft || activeHearing.instantSentenceDraft}” `;
      } else {
        const prazo = activeHearing.alegacoesFinaisPrazo || '05 (cinco) dias';
        text += `Ato contínuo, o MM. Juiz proferiu o seguinte DESPACHO: “Encerrada a instrução, abra-se vistas às partes para apresentação de alegações finais, pelo prazo sucessivo de ${prazo}, iniciando-se pelo Ministério Público. Atenda-se.” `;
      }
    } else {
      // CÍVEL
      const repReu = activeHearing.defendantPrepostoName
        ? `, na pessoa do representante ${activeHearing.defendantPrepostoName.toUpperCase()}`
        : '';
      text += `ABERTA A AUDIÊNCIA: Realizado o pregão, verificou-se a presença dos autores ${autorUpper}, acompanhados de sua advogada ${advAutorUpper}. Presente a parte requerida${repReu}, acompanhado de seu advogado ${advReuUpper}. `;

      if (activeHearing.defendantPrepostoName) {
        text += `Iniciada a instrução, houve o depoimento pessoal do requerido ${activeHearing.defendantPrepostoName.toUpperCase()}. `;
      } else {
        text += `Iniciada a instrução, houve o depoimento pessoal das partes. `;
      }

      text += `Nos termos do artigo 459, §1°, do CPC, o MM Juiz decidiu inquirir as testemunhas antes da inquirição feita pelas partes. `;

      const informantes = (activeHearing.witnesses || []).filter((w) => w.role === 'informante');
      const compromissadas = (activeHearing.witnesses || []).filter((w) => w.role === 'testemunha_autor' || w.role === 'testemunha_reu');
      const dispensadas = (activeHearing.witnesses || []).filter((w) => w.status === 'dispensado');

      if (informantes.length > 0) {
        text += `Após, foram ouvidos os informantes ${informantes.map((i) => i.name.toUpperCase()).join(', ')}. `;
      }
      if (compromissadas.length > 0) {
        text += `Em seguida, foi ouvida a testemunha ${compromissadas.map((c) => c.name.toUpperCase()).join(', ')}. `;
      }
      if (dispensadas.length > 0) {
        text += `A testemunha ${dispensadas.map((d) => d.name.toUpperCase()).join(', ')} foi dispensada. `;
      }

      if (activeHearing.hearingOccurrences) {
        text += `${activeHearing.hearingOccurrences} `;
      }

      if (activeHearing.instantSentenceDraft || sentenceDraft) {
        text += `Ato contínuo, o MM. Juiz proferiu a seguinte SENTENÇA: “${sentenceDraft || activeHearing.instantSentenceDraft}” `;
      } else if (activeHearing.deliberationDraft || deliberationDraft) {
        text += `Ato contínuo, pelo MM. Juiz foi homologado o acordo nos seguintes termos: “${deliberationDraft || activeHearing.deliberationDraft}” `;
      } else {
        const prazo = activeHearing.alegacoesFinaisPrazo || '10 (dez) dias';
        text += `Ato contínuo, o MM. Juiz proferiu o seguinte DESPACHO: “Encerrada a instrução, abra-se vistas as partes para apresentarem memoriais, no prazo sucessivo de ${prazo}, iniciando-se pela parte autora. Após, conclusos para sentença. Atenda-se.” `;
      }
    }

    // Fecho e Declaração da Secretária
    const secLine = activeHearing.secretarySignature || 'Eu GMF, Secretária, digitei e subscrevi o presente termo.';
    text += `Nada mais havendo encerrou-se o presente termo que lido e achado conforme vai devidamente assinado. Ficam as partes cientes do prazo de 24h da publicação para qualquer alteração na ata, devendo fazê-lo por petição junto ao processo. ${secLine}\n\n`;

    // 4. Assinatura Centralizada
    text += `${judgeSignatureName}\nJuiz de Direito`;

    setMinutesDraft(text);
    const updated: HearingRecord = {
      ...activeHearing,
      hearingMinutesDraft: text,
      hearingMinutesGeneratedAt: Date.now(),
    };
    setActiveHearing(updated);
    handleSaveActiveHearing(updated);
    setImportNotification('Ata montada com exatidão conforme o modelo paradigma do Tribunal!');
    setTimeout(() => setImportNotification(null), 3000);
  };

  // Importar Deliberação de Mesa para a Ata
  const handleImportDeliberationToMinutes = () => {
    if (!activeHearing) return;
    const textToInsert = deliberationDraft || activeHearing.deliberationDraft;
    if (!textToInsert) {
      setImportNotification('Nenhuma deliberação registrada na Aba 3 para importar.');
      setTimeout(() => setImportNotification(null), 3000);
      return;
    }
    const block = `\n\nDELIBERAÇÃO DO JUÍZO EM MESA:\n${textToInsert}\n`;
    const newText = (minutesDraft || activeHearing.hearingMinutesDraft || '').trim() + block;
    setMinutesDraft(newText);
    const updated: HearingRecord = { ...activeHearing, hearingMinutesDraft: newText };
    setActiveHearing(updated);
    handleSaveActiveHearing(updated);
    setImportNotification('Deliberação da Aba 3 inserida no corpo da Ata!');
    setTimeout(() => setImportNotification(null), 3000);
  };

  // Importar Sentença em Mesa para a Ata
  const handleImportSentenceToMinutes = () => {
    if (!activeHearing) return;
    const textToInsert = sentenceDraft || activeHearing.instantSentenceDraft;
    if (!textToInsert) {
      setImportNotification('Nenhuma sentença gerada na Aba 4 para importar.');
      setTimeout(() => setImportNotification(null), 3000);
      return;
    }
    const block = `\n\nSENTENÇA PROFERIDA EM AUDIÊNCIA:\n${textToInsert}\n`;
    const newText = (minutesDraft || activeHearing.hearingMinutesDraft || '').trim() + block;
    setMinutesDraft(newText);
    const updated: HearingRecord = { ...activeHearing, hearingMinutesDraft: newText };
    setActiveHearing(updated);
    handleSaveActiveHearing(updated);
    setImportNotification('Sentença em Mesa da Aba 4 inserida na Ata!');
    setTimeout(() => setImportNotification(null), 3000);
  };

  // Importar Depoimentos e Oitivas para a Ata
  const handleImportWitnessesToMinutes = () => {
    if (!activeHearing || !activeHearing.witnesses || activeHearing.witnesses.length === 0) {
      setImportNotification('Nenhuma testemunha cadastrada na Aba 2 para importar.');
      setTimeout(() => setImportNotification(null), 3000);
      return;
    }
    let witBlock = `\n\nDEPOIMENTOS COLHIDOS NA INSTRUÇÃO:\n`;
    activeHearing.witnesses.forEach((w, i) => {
      witBlock += `${i + 1}) ${w.name} (${w.role.replace('_', ' ').toUpperCase()}): ${
        w.status === 'inquirido' ? 'Ouvido(a) sob compromisso legal (art. 458 CPC). ' : ''
      }${w.notes ? `Declarações: ${w.notes}` : 'Depoimento gravado no sistema audiovisual.'}\n`;
    });
    const newText = (minutesDraft || activeHearing.hearingMinutesDraft || '').trim() + witBlock;
    setMinutesDraft(newText);
    const updated: HearingRecord = { ...activeHearing, hearingMinutesDraft: newText };
    setActiveHearing(updated);
    handleSaveActiveHearing(updated);
    setImportNotification('Depoimentos da Aba 2 importados para a Ata!');
    setTimeout(() => setImportNotification(null), 3000);
  };

  // Exportar Word (.docx)
  const handleExportMinutesDocx = () => {
    if (!activeHearing) return;
    const text = minutesDraft || activeHearing.hearingMinutesDraft;
    if (!text) {
      setAiError('A ata está vazia. Gere ou redija o termo antes de exportar.');
      return;
    }
    exportHearingMinutesToDocx(activeHearing.processNumber, text, 'Termo de Audiência');
  };

  // Imprimir Ata
  const handlePrintMinutes = () => {
    if (!activeHearing) return;
    const text = minutesDraft || activeHearing.hearingMinutesDraft;
    if (!text) {
      setAiError('A ata está vazia. Gere ou redija o termo antes de imprimir.');
      return;
    }
    printHearingMinutes(activeHearing.processNumber, text);
  };

  // Upload and Extract PDFs handler (The "Magic" Pipeline)
  const handlePdfFilesUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).filter(
      (f) => f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.txt')
    );

    if (fileArray.length === 0) {
      setAiError('Por favor, selecione arquivos válidos em PDF (.pdf) ou texto (.txt).');
      return;
    }

    setIsExtractingPdf(true);
    setAiError(null);
    let combinedText = '';
    const fileNames: string[] = [];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        fileNames.push(file.name);
        setExtractionProgressText(`Extraindo autos (${i + 1}/${fileArray.length}): "${file.name}"...`);

        if (file.name.toLowerCase().endsWith('.txt')) {
          const txt = await file.text();
          combinedText += `\n\n==============================\nARQUIVO DOS AUTOS: ${file.name}\n==============================\n${txt}`;
        } else {
          const pdfResult = await extractTextFromPdf(file);
          combinedText += `\n\n==============================\nARQUIVO DOS AUTOS: ${file.name} (Páginas: ${pdfResult.pageCount})\n==============================\n${pdfResult.text}`;
        }
      }

      setExtractionProgressText('Autos extraídos! A IA Jurídica está mapeando partes, fatos, contraprovas, ônus e oitiva...');
      setCaseInputText(combinedText);

      // Certificar audiência alvo
      let target = activeHearing;
      if (!target) {
        target = createEmptyHearing(user?.email || '', userProfile?.name || '');
        setActiveHearing(target);
      }

      const preparedTarget: HearingRecord = {
        ...target,
        uploadedPdfNames: Array.from(new Set([...(target.uploadedPdfNames || []), ...fileNames])),
        rawSourceText: combinedText.slice(0, 300000),
      };
      setActiveHearing(preparedTarget);
      await handleSaveActiveHearing(preparedTarget);

      // Disparar análise probatória automática com IA
      await runAiHearingCopilot(
        'briefing',
        {
          caseText: combinedText,
          uploadedPdfNames: preparedTarget.uploadedPdfNames,
        },
        preparedTarget
      );
    } catch (err: any) {
      console.error('Falha no upload dos PDFs:', err);
      setAiError(err.message || 'Erro ao processar os arquivos PDF dos autos.');
    } finally {
      setIsExtractingPdf(false);
      setExtractionProgressText('');
    }
  };

  // Add Witness
  const handleAddWitness = () => {
    if (!activeHearing || !newWitnessName.trim()) return;
    const newWit: HearingWitness = {
      id: `wit-${Date.now()}`,
      name: newWitnessName.trim(),
      role: newWitnessRole,
      controversyTopic: newWitnessTopic.trim() || 'Fatos controvertidos gerais',
      questions: [],
      notes: '',
      status: 'aguardando',
    };
    const updated: HearingRecord = {
      ...activeHearing,
      witnesses: [...(activeHearing.witnesses || []), newWit],
    };
    setActiveHearing(updated);
    handleSaveActiveHearing(updated);
    setNewWitnessName('');
    setNewWitnessTopic('');
  };

  // Add Custom Controversy Point
  const handleAddControversyPoint = () => {
    if (!activeHearing) return;
    const newPoint: HearingControversyPoint = {
      id: `pt-${Date.now()}`,
      fact: 'Novo ponto de fato controvertido a verificar',
      burdenOfProof: 'autor',
      legalBasis: 'Art. 373, I, do CPC',
      isControverted: true,
      status: 'pendente',
    };
    const updated: HearingRecord = {
      ...activeHearing,
      pointsOfControversy: [...(activeHearing.pointsOfControversy || []), newPoint],
    };
    setActiveHearing(updated);
    handleSaveActiveHearing(updated);
  };

  // Filtered hearings
  const filteredHearings = useMemo(() => {
    if (!searchFilter.trim()) return hearings;
    const q = searchFilter.toLowerCase();
    return hearings.filter(
      (h) =>
        h.processNumber?.toLowerCase().includes(q) ||
        h.author?.toLowerCase().includes(q) ||
        h.defendant?.toLowerCase().includes(q) ||
        h.subject?.toLowerCase().includes(q)
    );
  }, [hearings, searchFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-3 md:p-4 animate-in fade-in duration-200">
      <div
        className={`bg-slate-900 border-0 sm:border border-slate-700/80 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all duration-300 w-full ${
          isFullScreen ? 'h-full rounded-none' : 'max-w-7xl h-full sm:h-[94vh]'
        }`}
      >
        {/* ========================================================================= */}
        {/* BARRA SUPERIOR DO MÓDULO */}
        {/* ========================================================================= */}
        <div className="bg-slate-950 border-b border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-900/30 border border-amber-400/40 shrink-0">
              <Gavel className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                  Mesa de Audiências
                </h2>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 items-center gap-1">
                  <Hammer className="w-2.5 h-2.5 text-amber-400" />
                  Em Construção
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Homologação Super Admin
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate hidden md:block">
                Copiloto de Pauta, Briefing Probatório, Inquirição em Tempo Real, Acordos e Sentenças em Mesa
              </p>
            </div>

            {/* Switcher de Modo no Desktop */}
            <div className="hidden md:flex bg-slate-900 rounded-lg border border-slate-700 p-0.5 overflow-hidden ml-2 lg:ml-4 shrink-0">
              <button 
                onClick={() => setViewMode('normal')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${viewMode === 'normal' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                Pauta Normal
              </button>
              <button 
                onClick={() => setViewMode('mutirao')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1 cursor-pointer ${viewMode === 'mutirao' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                <Zap className="w-3 h-3" /> Mutirão Expresso
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {activeHearing && viewMode === 'normal' && (
              <button
                onClick={() => handleSaveActiveHearing()}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border shadow-sm cursor-pointer ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-emerald-900/20'
                }`}
                title="Salvar alterações no gabinete"
              >
                {saveStatus === 'saved' ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{saveStatus === 'saved' ? 'Salvo!' : 'Salvar Ficha'}</span>
              </button>
            )}

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="hidden sm:flex p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer border border-slate-700"
              title={isFullScreen ? 'Restaurar tamanho' : 'Expandir para tela cheia'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="min-w-[36px] min-h-[36px] p-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition cursor-pointer border border-slate-700 flex items-center justify-center"
              title="Fechar módulo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Switcher de Modo no Mobile (< md) */}
        <div className="md:hidden bg-slate-950 px-3 py-1.5 border-b border-slate-800/80 flex items-center justify-center shrink-0">
          <div className="grid grid-cols-2 p-0.5 bg-slate-900 rounded-lg border border-slate-800 w-full max-w-sm gap-1">
            <button 
              onClick={() => setViewMode('normal')}
              className={`py-1.5 text-xs font-bold rounded-md transition text-center cursor-pointer ${viewMode === 'normal' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Pauta Normal
            </button>
            <button 
              onClick={() => setViewMode('mutirao')}
              className={`py-1.5 text-xs font-bold rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${viewMode === 'mutirao' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Zap className="w-3.5 h-3.5" /> Mutirão Expresso
            </button>
          </div>
        </div>

        {viewMode === 'mutirao' ? (
          <div className="flex-1 overflow-hidden h-full flex flex-col">
            <MutiraoPrevidenciarioView onOpenHistory={onOpenHistory} />
          </div>
        ) : (
          <>
        {/* ========================================================================= */}
        {/* NAVEGADOR MOBILE: SELETOR ENTRE PAUTA E AUDIÊNCIA ATIVA */}
        {/* ========================================================================= */}
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-3 py-2 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800 w-full gap-1">
            <button
              onClick={() => setMobileView('list')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                mobileView === 'list'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Pauta ({filteredHearings.length})</span>
            </button>
            <button
              onClick={() => setMobileView('workbench')}
              disabled={!activeHearing}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 truncate ${
                mobileView === 'workbench'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              } disabled:opacity-40`}
            >
              <Gavel className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{activeHearing?.processNumber || 'Ficha da Audiência'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CORPO PRINCIPAL: PAUTA LATERAL + WORKBENCH */}
        {/* ========================================================================= */}
        <div className="flex-1 flex overflow-hidden">
          {/* COLUNA ESQUERDA: LISTA DE AUDIÊNCIAS / PAUTA DO DIA */}
          <div
            className={`bg-slate-950/60 border-r border-slate-800 flex flex-col shrink-0 ${
              mobileView === 'list' ? 'flex-1 w-full' : 'hidden'
            } lg:flex lg:w-80`}
          >
            {/* Header da lista */}
            <div className="p-3 border-b border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Pauta de Audiências
                </span>
                <button
                  onClick={() => {
                    const newH = createEmptyHearing(user?.email || '', userProfile?.name || '');
                    setActiveHearing(newH);
                    setHearings((prev) => [newH, ...prev]);
                    saveHearingRecord(newH);
                    setMobileView('workbench');
                  }}
                  className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nova</span>
                </button>
              </div>

              {/* Campo de Busca */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar processo ou parte..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Lista com scroll */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredHearings.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Nenhuma audiência localizada. Clique em "+ Nova" para cadastrar uma pauta.
                </div>
              ) : (
                filteredHearings.map((h) => {
                  const isSelected = activeHearing?.id === h.id;
                  return (
                    <div
                      key={h.id}
                      onClick={() => {
                        setActiveHearing(h);
                        setMobileView('workbench');
                      }}
                      className={`p-3 rounded-xl border transition cursor-pointer text-left space-y-1 relative group ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500/60 shadow-sm'
                          : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono font-bold text-amber-400 truncate">
                          {h.processNumber || 'Processo sem número'}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            h.status === 'em_andamento'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                              : h.status === 'concluida'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {h.status === 'em_andamento'
                            ? 'Na Mesa'
                            : h.status === 'concluida'
                            ? 'Concluída'
                            : 'Preparada'}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {h.author || 'Autor'} <span className="text-slate-500 font-normal">vs</span> {h.defendant || 'Réu'}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1 min-w-0 truncate">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{h.scheduledDate || 'Data'} às {h.scheduledTime || 'Horário'}</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[9px] text-slate-500 uppercase">
                            {h.hearingType === 'instrucao_julgamento' ? 'Instrução' : h.hearingType}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setHearingToDelete(h);
                            }}
                            className="p-1 sm:p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 border border-rose-800/40 transition flex items-center justify-center shrink-0 min-w-[34px] min-h-[34px] cursor-pointer shadow-xs"
                            title="Excluir esta audiência da pauta"
                            aria-label="Excluir audiência"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: WORKBENCH DA AUDIÊNCIA ATIVA */}
          <div
            className={`flex-1 flex flex-col bg-slate-900 overflow-hidden ${
              mobileView === 'workbench' ? 'flex' : 'hidden'
            } lg:flex`}
          >
            {activeHearing ? (
              <>
                {/* CABEÇALHO DO PROCESSO SELECIONADO */}
                <div className="p-3 sm:p-4 bg-slate-950/80 border-b border-slate-800 shrink-0 space-y-2.5 sm:space-y-3">
                  {/* Atalho mobile para voltar à pauta */}
                  <div className="lg:hidden flex items-center justify-between pb-1 border-b border-slate-800/80">
                    <button
                      onClick={() => setMobileView('list')}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 py-1 px-2.5 rounded-lg bg-amber-950/50 border border-amber-600/40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Ver Pauta de Audiências</span>
                    </button>
                    <span className="text-[11px] font-mono text-slate-400 truncate max-w-[140px]">
                      {activeHearing.processNumber || 'Sem número'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-[11px] sm:text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/40 shrink-0">
                        {activeHearing.hearingType === 'instrucao_julgamento'
                          ? 'Instrução e Julgamento'
                          : activeHearing.hearingType.toUpperCase()}
                      </span>
                      <input
                        type="text"
                        value={activeHearing.processNumber}
                        onChange={(e) =>
                          setActiveHearing({ ...activeHearing, processNumber: e.target.value })
                        }
                        placeholder="Nº do Processo (CNJ)..."
                        className="font-mono font-bold text-xs sm:text-sm bg-slate-900 border border-slate-700 px-2.5 py-1 rounded text-white focus:outline-none focus:border-amber-500 w-full sm:w-60"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <select
                        value={activeHearing.status}
                        onChange={(e) => {
                          const updated = {
                            ...activeHearing,
                            status: e.target.value as HearingRecord['status'],
                          };
                          setActiveHearing(updated);
                          handleSaveActiveHearing(updated);
                        }}
                        className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-amber-500 font-bold flex-1 sm:flex-none"
                      >
                        <option value="preparada">Status: 🟡 Preparada</option>
                        <option value="em_andamento">Status: 🟢 Em Andamento</option>
                        <option value="concluida">Status: 🔵 Concluída</option>
                        <option value="suspensa">Status: 🔴 Suspensa</option>
                      </select>

                      <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                        <input
                          type="date"
                          value={activeHearing.scheduledDate || ''}
                          onChange={(e) =>
                            setActiveHearing({ ...activeHearing, scheduledDate: e.target.value })
                          }
                          className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 focus:outline-none w-full sm:w-auto"
                        />
                        <input
                          type="time"
                          value={activeHearing.scheduledTime || ''}
                          onChange={(e) =>
                            setActiveHearing({ ...activeHearing, scheduledTime: e.target.value })
                          }
                          className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 focus:outline-none w-20 sm:w-auto"
                        />
                        <button
                          type="button"
                          onClick={() => setHearingToDelete(activeHearing)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/70 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800/50 transition cursor-pointer flex items-center justify-center shrink-0 min-w-[32px] min-h-[32px]"
                          title="Excluir esta audiência da pauta"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Linha das Partes e Assunto */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 text-xs">
                    <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-lg">
                      <span className="font-bold text-slate-400 shrink-0">Autor:</span>
                      <input
                        type="text"
                        value={activeHearing.author}
                        onChange={(e) => setActiveHearing({ ...activeHearing, author: e.target.value })}
                        placeholder="Nome do Autor"
                        className="w-full bg-transparent text-white font-medium focus:outline-none text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-lg">
                      <span className="font-bold text-slate-400 shrink-0">Réu:</span>
                      <input
                        type="text"
                        value={activeHearing.defendant}
                        onChange={(e) =>
                          setActiveHearing({ ...activeHearing, defendant: e.target.value })
                        }
                        placeholder="Nome do Réu"
                        className="w-full bg-transparent text-white font-medium focus:outline-none text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-lg">
                      <span className="font-bold text-slate-400 shrink-0">Assunto:</span>
                      <input
                        type="text"
                        value={activeHearing.subject || ''}
                        onChange={(e) => setActiveHearing({ ...activeHearing, subject: e.target.value })}
                        placeholder="Ex: Acidente de Trânsito, Cobrança..."
                        className="w-full bg-transparent text-slate-300 focus:outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* NAVEGAÇÃO DE ABAS */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80 overflow-x-auto no-scrollbar scrollbar-none py-1">
                    <button
                      onClick={() => setActiveTab('briefing')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer shrink-0 whitespace-nowrap ${
                        activeTab === 'briefing'
                          ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>1. Briefing & Fatos</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('inquiring')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer shrink-0 whitespace-nowrap ${
                        activeTab === 'inquiring'
                          ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>2. Roteiro & Oitiva ({activeHearing.witnesses?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('deliberations')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer shrink-0 whitespace-nowrap ${
                        activeTab === 'deliberations'
                          ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <Gavel className="w-3.5 h-3.5" />
                      <span>3. Deliberações Rápidas</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('sentence')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer shrink-0 whitespace-nowrap ${
                        activeTab === 'sentence'
                          ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>4. Sentença em Mesa (Oral/Ata)</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('minutes')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer shrink-0 whitespace-nowrap ${
                        activeTab === 'minutes'
                          ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <FileSignature className="w-3.5 h-3.5 text-amber-400" />
                      <span>5. Ata da Audiência</span>
                      {Boolean(minutesDraft || activeHearing.hearingMinutesDraft) && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Ata redigida" />
                      )}
                    </button>
                  </div>
                </div>

                {/* CONTEÚDO DA ABA SELECIONADA */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
                  {aiError && (
                    <div className="p-3 bg-rose-950/60 border border-rose-600/40 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{aiError}</span>
                    </div>
                  )}

                  {/* ================================================================= */}
                  {/* ABA 1: BRIEFING & FATOS CONTROVERTIDOS (MÁGICA DO PDF DOS AUTOS) */}
                  {/* ================================================================= */}
                  {activeTab === 'briefing' && (
                    <div className="space-y-4">
                      {/* ZONA DE UPLOAD MÁGICO DE PDF DOS AUTOS */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handlePdfFilesUpload(e.dataTransfer.files);
                          }
                        }}
                        className={`p-4 sm:p-5 rounded-xl border transition-all duration-200 ${
                          isDraggingFile
                            ? 'bg-amber-500/10 border-amber-400 shadow-lg shadow-amber-500/10'
                            : 'bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-900 border-indigo-900/60 shadow-md'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shrink-0 mt-0.5">
                              {isExtractingPdf ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <UploadCloud className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xs sm:text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                                  <span>Carregar PDF dos Autos (Mágica da Instrução)</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                    Extração Automática com IA
                                  </span>
                                </h3>
                              </div>
                              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                                Solte aqui os PDFs dos autos (Petição Inicial, Contestação, Decisões e Provas). O sistema extrai automaticamente: <strong>número do processo, autor, réu, classe, assunto, resumo, fatos e provas do autor, contraprovas do réu, pedido contraposto, distribuição do ônus (art. 373 CPC/CDC), o que já consta provado vs o que ainda tem que provar</strong> e o roteiro de testemunhas.
                              </p>
                            </div>
                          </div>

                          {/* Botões de Ação de Arquivo */}
                          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept=".pdf,.txt"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handlePdfFilesUpload(e.target.files);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isExtractingPdf || isLoadingAi}
                              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <FileUp className="w-4 h-4" />
                              <span>{isExtractingPdf ? 'Lendo Arquivos...' : 'Selecionar PDF(s) dos Autos'}</span>
                            </button>

                            {activeHearing.rawSourceText && (
                              <button
                                type="button"
                                onClick={() => runAiHearingCopilot('briefing')}
                                disabled={isExtractingPdf || isLoadingAi}
                                className="w-full sm:w-auto px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                                title="Reexecutar extração com IA sobre os autos carregados"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin text-amber-400' : ''}`} />
                                <span>{isLoadingAi ? 'Analisando...' : 'Reanalisar com IA'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Status / Progresso da Extração */}
                        {(isExtractingPdf || extractionProgressText) && (
                          <div className="mt-3 p-3 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-xs text-indigo-200 flex items-center gap-2.5 animate-pulse">
                            <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                            <span className="font-semibold">{extractionProgressText || 'Processando extração dos autos judiciais...'}</span>
                          </div>
                        )}

                        {/* Arquivos PDF Carregados */}
                        {activeHearing.uploadedPdfNames && activeHearing.uploadedPdfNames.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                              Peças analisadas:
                            </span>
                            {activeHearing.uploadedPdfNames.map((name, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700/80 text-[11px] text-slate-200 font-mono flex items-center gap-1"
                              >
                                <Tag className="w-2.5 h-2.5 text-amber-400" />
                                {name}
                              </span>
                            ))}
                            <button
                              type="button"
                              onClick={() => setShowRawSourceModal(!showRawSourceModal)}
                              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold ml-auto flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              {showRawSourceModal ? 'Ocultar Texto Bruto dos Autos' : 'Ver / Editar Texto Bruto dos Autos'}
                            </button>
                          </div>
                        )}

                        {/* Modal ou Área de Texto Bruto Colado / Extraído */}
                        {showRawSourceModal && (
                          <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                                Texto Integral Extraído das Peças (ou Cole Manualmente):
                              </span>
                              <button
                                onClick={() => runAiHearingCopilot('briefing', { caseText: caseInputText })}
                                disabled={isLoadingAi}
                                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                Processar este Texto com IA
                              </button>
                            </div>
                            <textarea
                              rows={5}
                              value={caseInputText || activeHearing.rawSourceText || ''}
                              onChange={(e) => setCaseInputText(e.target.value)}
                              placeholder="Texto das peças processuais..."
                              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}
                      </div>

                      {/* RESUMO FÁTICO DA DEMANDA */}
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-amber-500" />
                              Resumo Fático da Lide
                            </h4>
                            {activeHearing.deduplicationStats && activeHearing.deduplicationStats.duplicatesFound > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1" title={`${activeHearing.deduplicationStats.duplicatesFound} documentos idênticos consolidados para economia de tokens sem perda de fatos.`}>
                                <Zap className="w-3 h-3 text-emerald-400" />
                                {activeHearing.deduplicationStats.duplicatesFound} deduplicados (-{Math.round(activeHearing.deduplicationStats.charsSaved / 4)} tokens)
                              </span>
                            )}
                            {activeHearing.holisticSynopsis && (
                              <button
                                type="button"
                                onClick={() => setShowHolisticSynopsis(!showHolisticSynopsis)}
                                className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1 cursor-pointer transition"
                                title="Visualizar Sinopse Holística Forense dos Autos em 5 pilares completos"
                              >
                                <BookOpen className="w-3 h-3 text-amber-400" />
                                <span>Sinopse 5 Pilares</span>
                                {showHolisticSynopsis ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => handleCopy(activeHearing.caseFactsSummary || '', 'caseFacts')}
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                          >
                            {copiedSection === 'caseFacts' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSection === 'caseFacts' ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>
                        {showHolisticSynopsis && activeHearing.holisticSynopsis && (
                          <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-slate-200 leading-relaxed shadow-inner max-h-72 overflow-y-auto whitespace-pre-wrap">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                Sinopse Holística dos Autos (5 Pilares)
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(activeHearing.holisticSynopsis || '', 'holisticSynopsis')}
                                className="text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                              >
                                {copiedSection === 'holisticSynopsis' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedSection === 'holisticSynopsis' ? 'Copiado!' : 'Copiar'}</span>
                              </button>
                            </div>
                            {activeHearing.holisticSynopsis}
                          </div>
                        )}
                        <textarea
                          rows={3}
                          value={activeHearing.caseFactsSummary || ''}
                          onChange={(e) =>
                            setActiveHearing({ ...activeHearing, caseFactsSummary: e.target.value })
                          }
                          placeholder="Resumo executivo dos fatos da demanda extraído automaticamente pela IA..."
                          className="w-full p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-sm text-slate-300 focus:bg-slate-900 focus:outline-none focus:border-amber-500/50 transition-colors shadow-inner leading-relaxed"
                        />
                      </div>

                      {/* GRADE: FATOS & PROVAS DO AUTOR vs FATOS & CONTRAPROVAS DO RÉU */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Coluna do Autor */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between px-1">
                            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-indigo-400" />
                              Fatos e Provas do Autor
                            </h4>
                            <button
                              onClick={() => handleCopy(activeHearing.plaintiffClaims || '', 'plaintiffClaims')}
                              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                            >
                              {copiedSection === 'plaintiffClaims' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedSection === 'plaintiffClaims' ? 'Copiado' : 'Copiar'}</span>
                            </button>
                          </div>
                          <textarea
                            rows={4}
                            value={activeHearing.plaintiffClaims || ''}
                            onChange={(e) =>
                              setActiveHearing({ ...activeHearing, plaintiffClaims: e.target.value })
                            }
                            placeholder="O autor alega que... e juntou como prova os documentos dos eventos..."
                            className="w-full p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-sm text-slate-300 focus:bg-slate-900 focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner leading-relaxed"
                          />
                        </div>

                        {/* Coluna do Réu */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between px-1">
                            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                              <ShieldAlert className="w-4 h-4 text-rose-400" />
                              Fatos e Contraprovas do Réu
                            </h4>
                            <button
                              onClick={() => handleCopy(activeHearing.defendantClaims || '', 'defendantClaims')}
                              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                            >
                              {copiedSection === 'defendantClaims' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedSection === 'defendantClaims' ? 'Copiado' : 'Copiar'}</span>
                            </button>
                          </div>
                          <textarea
                            rows={4}
                            value={activeHearing.defendantClaims || ''}
                            onChange={(e) =>
                              setActiveHearing({ ...activeHearing, defendantClaims: e.target.value })
                            }
                            placeholder="A ré contesta sustentando que... e apresentou como contraprova..."
                            className="w-full p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-sm text-slate-300 focus:bg-slate-900 focus:outline-none focus:border-rose-500/50 transition-colors shadow-inner leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* PEDIDO CONTRAPOSTO / RECONVENÇÃO */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                            <Scale className="w-4 h-4 text-amber-500" />
                            Pedido Contraposto / Reconvenção
                          </h4>
                          <button
                            onClick={() => handleCopy(activeHearing.counterClaim || '', 'counterClaim')}
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                          >
                            {copiedSection === 'counterClaim' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSection === 'counterClaim' ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={activeHearing.counterClaim || ''}
                          onChange={(e) =>
                            setActiveHearing({ ...activeHearing, counterClaim: e.target.value })
                          }
                          placeholder="Pedido contraposto formulado ou indicação de inexistência..."
                          className="w-full p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-sm text-slate-300 focus:bg-slate-900 focus:outline-none focus:border-amber-500/50 transition-colors shadow-inner leading-relaxed"
                        />
                      </div>

                      {/* DIAGNÓSTICO PROBATÓRIO: O QUE CONSTA NOS AUTOS vs O QUE AINDA TEM QUE PROVAR */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Diagnóstico Probatório: Autos vs Prova Oral
                          </h4>
                          <button
                            onClick={() => handleCopy(activeHearing.whatRemainsToProve || '', 'remainsProof')}
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                          >
                            {copiedSection === 'remainsProof' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSection === 'remainsProof' ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={activeHearing.whatRemainsToProve || ''}
                          onChange={(e) =>
                            setActiveHearing({ ...activeHearing, whatRemainsToProve: e.target.value })
                          }
                          placeholder="O que já consta provado nos autos por documentos e o que AINDA TEM QUE PROVAR na audiência..."
                          className="w-full p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-sm text-slate-300 focus:bg-slate-900 focus:outline-none focus:border-emerald-500/50 transition-colors shadow-inner leading-relaxed"
                        />
                      </div>

                      {/* NÚCLEO FÁTICO CONTROVERTIDO */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                            <Target className="w-4 h-4 text-amber-500" />
                            Núcleo Fático Controvertido (Objeto da Prova)
                          </h4>
                        </div>
                        <textarea
                          rows={2}
                          value={activeHearing.controversySummary || ''}
                          onChange={(e) =>
                            setActiveHearing({ ...activeHearing, controversySummary: e.target.value })
                          }
                          placeholder="Definição precisa do que precisa ser elucidado na oitiva das testemunhas e partes..."
                          className="w-full p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-sm text-slate-300 focus:bg-slate-900 focus:outline-none focus:border-amber-500/50 transition-colors shadow-inner leading-relaxed"
                        />
                      </div>

                      {/* TABELA / MATRIZ DE PONTOS CONTROVERTIDOS & ÔNUS DA PROVA */}
                      <div className="flex flex-col gap-3 pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                              Matriz de Pontos Controvertidos & Ônus da Prova
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">
                              Fato, prova nos autos, contraprova, a quem incumbe provar e o que ainda tem que provar.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddControversyPoint}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Adicionar Ponto</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {(activeHearing.pointsOfControversy || []).length === 0 ? (
                            <div className="p-8 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
                              <Scale className="w-8 h-8 text-slate-600 mx-auto" />
                              <p className="text-sm text-slate-400 font-semibold">
                                Nenhum ponto controvertido cadastrado ainda.
                              </p>
                              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                                Arraste ou selecione o PDF dos autos na área acima para a IA estruturar toda a matriz probatória com ônus e o que resta provar.
                              </p>
                            </div>
                          ) : (
                            activeHearing.pointsOfControversy?.map((pt, idx) => (
                              <div
                                key={pt.id || idx}
                                className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-3 text-xs"
                              >
                                {/* Linha 1: Fato e Botão Remover */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        Ponto #{idx + 1}
                                      </span>
                                      <select
                                        value={pt.allegedBy || 'autor'}
                                        onChange={(e) => {
                                          const updatedPts = [...(activeHearing.pointsOfControversy || [])];
                                          updatedPts[idx] = {
                                            ...updatedPts[idx],
                                            allegedBy: e.target.value as any,
                                          };
                                          setActiveHearing({ ...activeHearing, pointsOfControversy: updatedPts });
                                        }}
                                        className="bg-slate-950 border border-slate-700 text-[10px] font-bold text-slate-300 rounded px-2 py-0.5"
                                      >
                                        <option value="autor">Alegado pelo Autor</option>
                                        <option value="reu">Alegado pelo Réu</option>
                                        <option value="ambos">Alegado por Ambos</option>
                                      </select>
                                      {pt.counterClaimFact && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                          Pedido Contraposto
                                        </span>
                                      )}
                                    </div>
                                    <input
                                      type="text"
                                      value={pt.fact}
                                      onChange={(e) => {
                                        const updatedPts = [...(activeHearing.pointsOfControversy || [])];
                                        updatedPts[idx] = { ...updatedPts[idx], fact: e.target.value };
                                        setActiveHearing({ ...activeHearing, pointsOfControversy: updatedPts });
                                      }}
                                      className="w-full bg-transparent text-slate-100 font-bold focus:outline-none focus:border-b border-amber-500 text-xs sm:text-sm pt-1"
                                      placeholder="Fato controvertido..."
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedPts = activeHearing.pointsOfControversy?.filter((_, i) => i !== idx);
                                      setActiveHearing({ ...activeHearing, pointsOfControversy: updatedPts });
                                    }}
                                    className="p-1 rounded text-slate-500 hover:text-rose-400 shrink-0"
                                    title="Remover ponto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Linha 2: Prova que Consta no Processo vs Contraprova */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80 space-y-1">
                                    <div className="flex items-center justify-between text-indigo-300 font-bold">
                                      <span className="flex items-center gap-1">
                                        <FileCheck className="w-3 h-3 text-emerald-400" />
                                        Prova que já consta no processo:
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedPts = [...(activeHearing.pointsOfControversy || [])];
                                          updatedPts[idx] = {
                                            ...updatedPts[idx],
                                            hasDocumentalProof: !updatedPts[idx].hasDocumentalProof,
                                          };
                                          setActiveHearing({ ...activeHearing, pointsOfControversy: updatedPts });
                                        }}
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                          pt.hasDocumentalProof
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                                        }`}
                                      >
                                        {pt.hasDocumentalProof ? '✓ Consta Prova nos Autos' : 'Sem Prova Documental'}
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={pt.evidenceInFiles || ''}
                                      onChange={(e) => {
                                        const updatedPts = [...(activeHearing.pointsOfControversy || [])];
                                        updatedPts[idx] = { ...updatedPts[idx], evidenceInFiles: e.target.value };
                                        setActiveHearing({ ...activeHearing, pointsOfControversy: updatedPts });
                                      }}
                                      placeholder="Ex: Doc. evento 1.4 - Nota fiscal / Contrato assinado evento 15.2"
                                      className="w-full bg-transparent text-slate-300 focus:outline-none text-[11px]"
                                    />
                                  </div>

                                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80 space-y-1">
                                    <span className="text-rose-300 font-bold flex items-center gap-1">
                                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                                      Contraprova ofertada:
                                    </span>
                                    <input
                                      type="text"
                                      value={pt.counterEvidence || ''}
                                      onChange={(e) => {
                                        const updatedPts = [...(activeHearing.pointsOfControversy || [])];
                                        updatedPts[idx] = { ...updatedPts[idx], counterEvidence: e.target.value };
                                        setActiveHearing({ ...activeHearing, pointsOfControversy: updatedPts });
                                      }}
                                      placeholder="Ex: Alegação de fraude / comprovante de quitação evento 22.3"
                                      className="w-full bg-transparent text-slate-300 focus:outline-none text-[11px]"
                                    />
                                  </div>
                                </div>

                                {/* Linha 3: O que AINDA TEM QUE PROVAR */}
                                <div className="p-2 rounded bg-amber-950/20 border border-amber-500/30 space-y-1">
                                  <div className="flex items-center justify-between text-amber-300 font-bold text-[11px]">
                                    <span className="flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 text-amber-400" />
                                      O que AINDA TEM QUE PROVAR na audiência de instrução:
                                    </span>
                                    <label className="flex items-center gap-1 cursor-pointer text-[10px] text-amber-200">
                                      <input
                                        type="checkbox"
                                        checked={pt.needsOralProof !== false}
                                        onChange={(e) => {
                                          const updatedPts = [...(activeHearing.pointsOfControversy || [])];
                                          updatedPts[idx] = {
                                            ...updatedPts[idx],
                                            needsOralProof: e.target.checked,
                                          };
                                          setActiveHearing({ ...activeHearing, pointsOfControversy: updatedPts });
                                        }}
                                        className="rounded text-amber-500"
                                      />
                                      <span>Necessita Prova Testemunhal/Oral</span>
                                    </label>
                                  </div>
                                  <input
                                    type="text"
                                    value={pt.whatNeedsProof || ''}
                                    onChange={(e) => {
                                      const updatedPts = [...(activeHearing.pointsOfControversy || [])];
                                      updatedPts[idx] = { ...updatedPts[idx], whatNeedsProof: e.target.value };
                                      setActiveHearing({ ...activeHearing, pointsOfControversy: updatedPts });
                                    }}
                                    placeholder="Ex: Efetiva entrega das mercadorias e quem assinou o canhoto no galpão..."
                                    className="w-full bg-transparent text-amber-100 focus:outline-none text-[11px]"
                                  />
                                </div>

                                {/* Linha 4: Ônus da Prova, Base Legal e Status */}
                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 justify-between">
                                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                    <span className="text-slate-400 font-semibold">Ônus da Prova:</span>
                                    <select
                                      value={pt.burdenOfProof}
                                      onChange={(e) => {
                                        const updatedPts = [...(activeHearing.pointsOfControversy || [])];
                                        updatedPts[idx] = {
                                          ...updatedPts[idx],
                                          burdenOfProof: e.target.value as HearingControversyPoint['burdenOfProof'],
                                        };
                                        setActiveHearing({ ...activeHearing, pointsOfControversy: updatedPts });
                                      }}
                                      className="bg-slate-950 border border-slate-700 text-[11px] font-bold text-amber-300 rounded px-2 py-1"
                                    >
                                      <option value="autor">Incumbe ao Autor (Art. 373, I, CPC)</option>
                                      <option value="reu">Incumbe ao Réu (Art. 373, II, CPC)</option>
                                      <option value="inversao_cdc">Inversão do Ônus (Art. 6º, VIII, CDC)</option>
                                      <option value="dinamica_juiz">Carga Dinâmica (Art. 373, § 1º, CPC)</option>
                                    </select>

                                    <input
                                      type="text"
                                      value={pt.legalBasis || ''}
                                      onChange={(e) => {
                                        const updatedPts = [...(activeHearing.pointsOfControversy || [])];
                                        updatedPts[idx] = { ...updatedPts[idx], legalBasis: e.target.value };
                                        setActiveHearing({ ...activeHearing, pointsOfControversy: updatedPts });
                                      }}
                                      placeholder="Base: Art. 373, I, CPC"
                                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-[10px] w-36"
                                    />
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400 font-semibold text-[11px]">Status Probatório:</span>
                                    <select
                                      value={pt.status}
                                      onChange={(e) => {
                                        const updatedPts = [...(activeHearing.pointsOfControversy || [])];
                                        updatedPts[idx] = {
                                          ...updatedPts[idx],
                                          status: e.target.value as HearingControversyPoint['status'],
                                        };
                                        setActiveHearing({ ...activeHearing, pointsOfControversy: updatedPts });
                                      }}
                                      className={`border text-[11px] font-bold rounded px-2 py-1 ${
                                        pt.status === 'provado_autor'
                                          ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                                          : pt.status === 'provado_reu'
                                          ? 'bg-indigo-950/80 border-indigo-600 text-indigo-300'
                                          : pt.status === 'nao_provado'
                                          ? 'bg-rose-950/80 border-rose-600 text-rose-300'
                                          : 'bg-slate-950 border-slate-700 text-slate-300'
                                      }`}
                                    >
                                      <option value="pendente">⏳ Pendente de Instrução</option>
                                      <option value="provado_autor">✓ Provado pelo Autor</option>
                                      <option value="provado_reu">✓ Provado pelo Réu</option>
                                      <option value="nao_provado">✗ Não Provado (Prejuízo ao Ônus)</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Alertas & Cautelas na Ata */}
                      <div className="flex flex-col gap-2 pt-2">
                        <div className="flex items-center gap-2 px-1">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <h4 className="text-sm font-semibold text-amber-500">
                            Alertas & Armadilhas Processuais Detectadas
                          </h4>
                        </div>
                        <ul className="space-y-2 p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/30 text-sm text-amber-200/90 list-disc list-inside shadow-inner">
                          {(activeHearing.alertsAndTraps || []).length === 0 ? (
                             <li className="text-amber-500/50 italic list-none">Nenhum alerta processual detectado na análise dos autos.</li>
                          ) : (
                            (activeHearing.alertsAndTraps || []).map((alert, i) => (
                              <li key={i} className="leading-relaxed">
                                {alert}
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* ================================================================= */}
                  {/* ABA 2: ROTEIRO DE INQUIRIÇÃO & OITIVA */}
                  {/* ================================================================= */}
                  {activeTab === 'inquiring' && (
                    <div className="space-y-4">
                      {/* Perguntas-Chave Recomendadas para o Juiz */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            Perguntas Sugeridas para o Juiz / Assessor
                          </h4>
                          <button
                            onClick={() => handleCopy(activeHearing.keyQuestions?.join('\n\n') || '', 'questions')}
                            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                          >
                            {copiedSection === 'questions' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Copiar Perguntas</span>
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(activeHearing.keyQuestions || []).map((q, i) => (
                            <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-start gap-2">
                              <span className="font-mono font-bold text-amber-400 shrink-0">{i + 1}.</span>
                              <span className="leading-relaxed">{q}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quadro de Testemunhas e Depoimentos */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-400" />
                            Rol de Depoentes & Testemunhas da Instrução
                          </h4>
                        </div>

                        {/* Formulário Rápido de Adição */}
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:grid sm:grid-cols-12 gap-2 text-xs">
                          <input
                            type="text"
                            value={newWitnessName}
                            onChange={(e) => setNewWitnessName(e.target.value)}
                            placeholder="Nome do Depoente / Testemunha..."
                            className="sm:col-span-5 bg-slate-950 border border-slate-700 px-2.5 py-2 rounded text-white focus:outline-none text-xs"
                          />
                          <select
                            value={newWitnessRole}
                            onChange={(e) => setNewWitnessRole(e.target.value as HearingWitness['role'])}
                            className="sm:col-span-3 bg-slate-950 border border-slate-700 px-2 py-2 rounded text-slate-200 font-medium text-xs"
                          >
                            <option value="testemunha_autor">Testemunha do Autor</option>
                            <option value="testemunha_reu">Testemunha do Réu</option>
                            <option value="parte_autora">Depoimento Pessoal Autor</option>
                            <option value="parte_re">Depoimento Pessoal Réu</option>
                            <option value="informante">Informante (Art. 457, § 2º)</option>
                            <option value="perito">Perito / Assistente Técnico</option>
                          </select>
                          <input
                            type="text"
                            value={newWitnessTopic}
                            onChange={(e) => setNewWitnessTopic(e.target.value)}
                            placeholder="Fato a esclarecer..."
                            className="sm:col-span-3 bg-slate-950 border border-slate-700 px-2.5 py-2 rounded text-white focus:outline-none text-xs"
                          />
                          <button
                            onClick={handleAddWitness}
                            className="sm:col-span-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded flex items-center justify-center p-2 cursor-pointer shadow-xs gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="sm:hidden text-xs">Adicionar</span>
                          </button>
                        </div>

                        {/* Lista de Testemunhas */}
                        <div className="space-y-3">
                          {(activeHearing.witnesses || []).map((wit, wIdx) => (
                            <div key={wit.id || wIdx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white text-xs">{wit.name}</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 border border-indigo-700 text-indigo-300">
                                    {wit.role.replace('_', ' ').toUpperCase()}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 justify-between sm:justify-end w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                                  <select
                                    value={wit.status || 'aguardando'}
                                    onChange={(e) => {
                                      const updatedWits = [...(activeHearing.witnesses || [])];
                                      updatedWits[wIdx] = {
                                        ...updatedWits[wIdx],
                                        status: e.target.value as HearingWitness['status'],
                                      };
                                      setActiveHearing({ ...activeHearing, witnesses: updatedWits });
                                    }}
                                    className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 flex-1 sm:flex-none"
                                  >
                                    <option value="aguardando">Aguardando</option>
                                    <option value="inquirido">Inquirido</option>
                                    <option value="contraditado">Contraditado</option>
                                    <option value="dispensado">Dispensado</option>
                                  </select>

                                  <button
                                    onClick={async () => {
                                      const qRes = await runAiHearingCopilot('questions', {
                                        witnessContext: wit,
                                      });
                                      if (qRes) {
                                        const updatedWits = [...(activeHearing.witnesses || [])];
                                        updatedWits[wIdx] = {
                                          ...updatedWits[wIdx],
                                          notes: `${updatedWits[wIdx].notes || ''}\n\n[PERGUNTAS SUGERIDAS PELA IA]:\n${qRes}`.trim(),
                                        };
                                        setActiveHearing({ ...activeHearing, witnesses: updatedWits });
                                      }
                                    }}
                                    disabled={isLoadingAi}
                                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold flex items-center gap-1 border border-slate-700 shrink-0"
                                  >
                                    <Sparkles className="w-3 h-3 text-amber-400" />
                                    <span>Perguntas IA</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      const updatedWits = activeHearing.witnesses?.filter((_, i) => i !== wIdx);
                                      setActiveHearing({ ...activeHearing, witnesses: updatedWits });
                                    }}
                                    className="p-1 text-slate-500 hover:text-rose-400 shrink-0"
                                    title="Remover testemunha"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-xs text-slate-400">
                                <strong>Objeto da oitiva:</strong> {wit.controversyTopic}
                              </p>

                              {/* Anotações do depoimento desta testemunha */}
                              <textarea
                                rows={2}
                                value={wit.notes || ''}
                                onChange={(e) => {
                                  const updatedWits = [...(activeHearing.witnesses || [])];
                                  updatedWits[wIdx] = { ...updatedWits[wIdx], notes: e.target.value };
                                  setActiveHearing({ ...activeHearing, witnesses: updatedWits });
                                }}
                                placeholder="Anotações das respostas do depoente em tempo real..."
                                className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bloco Geral de Impressões da Audiência */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                          Bloco Geral de Impressões e Ocorrências da Audiência
                        </h4>
                        <textarea
                          rows={4}
                          value={activeHearing.hearingNotes || ''}
                          onChange={(e) =>
                            setActiveHearing({ ...activeHearing, hearingNotes: e.target.value })
                          }
                          placeholder="Anote aqui impressões sobre credibilidade dos depoimentos, confissões parciais, propostas de acordo em mesa..."
                          className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* ================================================================= */}
                  {/* ABA 3: DELIBERAÇÕES RÁPIDAS EM MESA */}
                  {/* ================================================================= */}
                  {activeTab === 'deliberations' && (
                    <div className="space-y-4">
                      {/* Seletor do Tipo de Deliberação */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {[
                          { id: 'acordo_total', label: '🤝 Acordo Total' },
                          { id: 'acordo_parcial', label: '📑 Acordo Parcial' },
                          { id: 'revelia', label: '⚖️ Revelia' },
                          { id: 'contradita', label: '🛡️ Contradita' },
                          { id: 'indeferimento_perguntas', label: '🚫 Indeferir Pergunta' },
                          { id: 'diligencia', label: '🔍 Diligência / Ofício' },
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            onClick={() => setDeliberationType(btn.id as any)}
                            className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                              deliberationType === btn.id
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>

                      {/* Parâmetros Específicos para o Tipo Escolhido */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                          Parâmetros da Deliberação em Mesa: {deliberationType.replace('_', ' ').toUpperCase()}
                        </h4>

                        {deliberationType.startsWith('acordo') && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block text-slate-400 font-semibold mb-1">Valor do Acordo (R$):</label>
                              <input
                                type="text"
                                value={agreedValue}
                                onChange={(e) => setAgreedValue(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 font-semibold mb-1">Cláusula Penal (%):</label>
                              <input
                                type="text"
                                value={penaltyPercent}
                                onChange={(e) => setPenaltyPercent(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 font-semibold mb-1">Forma & Vencimentos:</label>
                              <input
                                type="text"
                                value={paymentTerms}
                                onChange={(e) => setPaymentTerms(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                              />
                            </div>

                            {deliberationType === 'acordo_parcial' && (
                              <div className="md:col-span-3">
                                <label className="block text-amber-300 font-semibold mb-1">
                                  Pontos Remanescentes Pendentes de Julgamento:
                                </label>
                                <input
                                  type="text"
                                  value={partialPendingItems}
                                  onChange={(e) => setPartialPendingItems(e.target.value)}
                                  className="w-full bg-slate-900 border border-amber-800/60 rounded px-2.5 py-1.5 text-amber-200 focus:outline-none"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {deliberationType === 'revelia' && (
                          <div className="text-xs text-slate-300 space-y-2">
                            <p className="leading-relaxed">
                              Aplicação do <strong>art. 344 do CPC</strong> em razão da ausência injustificada do réu devidamente citado nos autos.
                              Presunção relativa de veracidade dos fatos articulados na petição inicial.
                            </p>
                          </div>
                        )}

                        {deliberationType === 'contradita' && (
                          <div className="text-xs text-slate-300 space-y-2">
                            <p className="leading-relaxed">
                              Fundamentação formal do <strong>art. 457, § 1º, do CPC</strong> para acolhimento (oitiva estrita como informante) ou indeferimento de contradita suscitada pela parte contrária.
                            </p>
                          </div>
                        )}

                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() =>
                              runAiHearingCopilot('deliberation', {
                                deliberationParams: {
                                  type: deliberationType,
                                  agreedValue,
                                  paymentTerms,
                                  penaltyPercent,
                                  partialPendingItems: deliberationType === 'acordo_parcial' ? partialPendingItems : undefined,
                                },
                              })
                            }
                            disabled={isLoadingAi}
                            className="w-full sm:w-auto justify-center px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isLoadingAi ? 'Redigindo Termo...' : 'Gerar Termo de Deliberação em Ata'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Texto Gerado da Deliberação para Ata */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            Minuta de Deliberação / Ata de Audiência
                          </h4>
                          <button
                            onClick={() => handleCopy(deliberationDraft, 'deliberation')}
                            className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1 border border-slate-700 w-full sm:w-auto"
                          >
                            {copiedSection === 'deliberation' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSection === 'deliberation' ? 'Copiado para Ata!' : 'Copiar Texto para Ata'}</span>
                          </button>
                        </div>
                        <textarea
                          rows={8}
                          value={deliberationDraft || activeHearing.deliberationDraft || ''}
                          onChange={(e) => setDeliberationDraft(e.target.value)}
                          placeholder="A deliberação formatada para a ata aparecerá aqui..."
                          className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {/* ================================================================= */}
                  {/* ABA 4: SENTENÇA EM MESA (JULGAMENTO IMEDIATO NO PREGÃO) */}
                  {/* ================================================================= */}
                  {activeTab === 'sentence' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Gavel className="w-3.5 h-3.5 text-amber-400" />
                            Configuração da Sentença em Mesa (Art. 38 Lei 9.099 / Art. 489 CPC)
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">Dispositivo Pretendido:</label>
                            <select
                              value={sentenceVerdict}
                              onChange={(e) => setSentenceVerdict(e.target.value as any)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-bold"
                            >
                              <option value="auto">Análise Automática (Decisão 100% via IA)</option>
                              <option value="procedencia">Procedência Total dos Pedidos</option>
                              <option value="parcial_procedencia">Parcial Procedência</option>
                              <option value="improcedencia">Improcedência Total</option>
                              <option value="sem_resolucao">Extinção sem Resolução do Mérito (Art. 485)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">Valores / Condenações:</label>
                            <input
                              type="text"
                              value={sentenceDamages}
                              onChange={(e) => setSentenceDamages(e.target.value)}
                              placeholder="Ex: Danos materiais de R$ 4.200,00 + Morais de R$ 3.000,00"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-slate-400 font-semibold mb-1">
                              Pontos de Destaque da Fundamentação (Valoração da Prova Oral):
                            </label>
                            <textarea
                              rows={2}
                              value={sentenceHighlights}
                              onChange={(e) => setSentenceHighlights(e.target.value)}
                              placeholder="Ex: Testemunha presencial comprovou invasão do sinal vermelho pelo caminhão; afastada a alegação de excesso de velocidade..."
                              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() =>
                              runAiHearingCopilot('instant_sentence', {
                                sentenceParams: {
                                  verdict: sentenceVerdict,
                                  groundsHighlights: sentenceHighlights,
                                  damagesAwarded: sentenceDamages,
                                },
                              })
                            }
                            disabled={isLoadingAi}
                            className="w-full sm:w-auto justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isLoadingAi ? 'Redigindo Sentença...' : 'Redigir Sentença Oral em Ata'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Texto Completo da Sentença Gerada */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            Sentença Proferida em Audiência (Texto Contínuo)
                          </h4>
                          <button
                            onClick={() => handleCopy(sentenceDraft, 'sentence')}
                            className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1 border border-slate-700 w-full sm:w-auto"
                          >
                            {copiedSection === 'sentence' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSection === 'sentence' ? 'Copiada!' : 'Copiar Sentença Completa'}</span>
                          </button>
                        </div>
                        <textarea
                          rows={12}
                          value={sentenceDraft || activeHearing.instantSentenceDraft || ''}
                          onChange={(e) => setSentenceDraft(e.target.value)}
                          placeholder="A sentença completa com relatório conciso, fundamentação e dispositivo formal será exibida aqui..."
                          className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {/* ================================================================= */}
                  {/* ABA 5: ATA DA AUDIÊNCIA (TERMO DE ASSENTADA, IMPORT/EXPORT & IA) */}
                  {/* ================================================================= */}
                  {activeTab === 'minutes' && (
                    <div className="space-y-4">
                      {/* BARRA DE AÇÕES PRINCIPAIS */}
                      <div className="p-3 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-sm">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          <div>
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                              <FileSignature className="w-4 h-4 text-amber-400" />
                              Ata de Audiência & Termo de Assentada
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Consolide dados do processo, oitivas e deliberações em um termo formal contínuo pronto para juntada nos autos.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Botão de Geração com IA */}
                            <button
                              onClick={handleGenerateMinutesWithAi}
                              disabled={isLoadingAi}
                              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                            >
                              {isLoadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              <span>{isLoadingAi ? 'Redigindo Ata...' : 'Gerar Ata Completa com IA'}</span>
                            </button>

                            {/* Botão Esqueleto Padrão */}
                            <button
                              onClick={handleBuildStandardMinutesTemplate}
                              className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition cursor-pointer shadow-xs"
                              title="Montar termo imediato sem IA baseado nos dados do processo"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Esqueleto Padrão</span>
                            </button>

                            {/* Botão Toggle Configurações/Presenças */}
                            <button
                              onClick={() => setShowMinutesConfig(!showMinutesConfig)}
                              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                                showMinutesConfig
                                  ? 'bg-slate-800 text-amber-300 border-amber-500/50'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{showMinutesConfig ? 'Ocultar Pregão' : 'Dados do Pregão & Presenças'}</span>
                              {showMinutesConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Barra de Importações Rápidas entre as Abas */}
                        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                            <ArrowDownToLine className="w-3 h-3 text-amber-400" />
                            Importar para a Ata:
                          </span>

                          <button
                            onClick={handleImportDeliberationToMinutes}
                            className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                            title="Importar acordo ou deliberação da Aba 3"
                          >
                            <Gavel className="w-3 h-3 text-amber-400" />
                            <span>Puxar Deliberação (Aba 3)</span>
                          </button>

                          <button
                            onClick={handleImportSentenceToMinutes}
                            className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                            title="Importar sentença oral proferida da Aba 4"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Puxar Sentença (Aba 4)</span>
                          </button>

                          <button
                            onClick={handleImportWitnessesToMinutes}
                            className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                            title="Importar depoimentos e testemunhas da Aba 2"
                          >
                            <Users className="w-3 h-3 text-indigo-400" />
                            <span>Puxar Oitivas (Aba 2)</span>
                          </button>
                        </div>

                        {importNotification && (
                          <div className="p-2 bg-indigo-950/70 border border-indigo-600/40 rounded-lg text-xs text-indigo-200 flex items-center gap-1.5 animate-fadeIn">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{importNotification}</span>
                          </div>
                        )}
                      </div>

                      {/* PAINEL DE CONFIGURAÇÃO DE PREGÃO E PRESENÇAS (COLAPSÁVEL) */}
                      {showMinutesConfig && (
                        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4 animate-fadeIn">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-indigo-400" />
                              Qualificação dos Presentes & Modelo Paradigma da Ata
                            </h5>
                            <span className="text-[10px] text-slate-400">
                              Os dados alimentam diretamente a ata oficial em texto contínuo.
                            </span>
                          </div>

                          {/* Cabeçalho Oficial do Tribunal */}
                          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                            <span className="text-xs font-bold text-amber-400">Cabeçalho Oficial & Rito da Audiência</span>
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                              <div className="sm:col-span-4">
                                <label className="block text-slate-400 font-semibold mb-0.5">Poder Judiciário:</label>
                                <input
                                  type="text"
                                  value={activeHearing.judiciaryState || 'PODER JUDICIÁRIO DO ESTADO DE GOIÁS'}
                                  onChange={(e) => setActiveHearing({ ...activeHearing, judiciaryState: e.target.value })}
                                  placeholder="PODER JUDICIÁRIO DO ESTADO DE GOIÁS"
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-medium focus:outline-none"
                                />
                              </div>
                              <div className="sm:col-span-4">
                                <label className="block text-slate-400 font-semibold mb-0.5">Comarca:</label>
                                <input
                                  type="text"
                                  value={activeHearing.comarcaName || activeHearing.courtName || 'COMARCA DE MONTES CLAROS DE GOIÁS'}
                                  onChange={(e) => setActiveHearing({ ...activeHearing, comarcaName: e.target.value })}
                                  placeholder="COMARCA DE MONTES CLAROS DE GOIÁS"
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-medium focus:outline-none"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-slate-400 font-semibold mb-0.5">Título do Ato:</label>
                                <input
                                  type="text"
                                  value={activeHearing.hearingTitle || 'AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO'}
                                  onChange={(e) => setActiveHearing({ ...activeHearing, hearingTitle: e.target.value })}
                                  placeholder="AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO"
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-[11px] focus:outline-none"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-slate-400 font-semibold mb-0.5">Matéria / Área:</label>
                                <select
                                  value={activeHearing.hearingArea || 'civel'}
                                  onChange={(e) =>
                                    setActiveHearing({
                                      ...activeHearing,
                                      hearingArea: e.target.value as any,
                                      alegacoesFinaisPrazo:
                                        e.target.value === 'criminal' ? '05 (cinco) dias' : '10 (dez) dias',
                                    })
                                  }
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-medium"
                                >
                                  <option value="civel">Cível (Autor / Réu)</option>
                                  <option value="criminal">Criminal (Acusado / Vítimas)</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
                            <div className="sm:col-span-2">
                              <label className="block text-slate-400 font-semibold mb-1">Juízo / Vara / Cartório:</label>
                              <input
                                type="text"
                                value={activeHearing.courtName || ''}
                                onChange={(e) => setActiveHearing({ ...activeHearing, courtName: e.target.value })}
                                placeholder="Ex: Vara das Fazendas Públicas e Juizado Cível"
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 font-semibold mb-1">Juiz(a) que preside:</label>
                              <input
                                type="text"
                                value={activeHearing.judgeName || ''}
                                onChange={(e) => setActiveHearing({ ...activeHearing, judgeName: e.target.value })}
                                placeholder={resolveJudgeName()}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 font-semibold mb-1">Modalidade do Ato:</label>
                              <select
                                value={activeHearing.hearingModality || 'presencial'}
                                onChange={(e) =>
                                  setActiveHearing({
                                    ...activeHearing,
                                    hearingModality: e.target.value as any,
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-medium"
                              >
                                <option value="presencial">Presencial (Sala de Audiências)</option>
                                <option value="telepresencial">Telepresencial (Videoconferência)</option>
                                <option value="hibrida">Híbrida (Presencial e Remota)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-slate-400 font-semibold mb-1">Secretário / Assessor:</label>
                              <input
                                type="text"
                                value={activeHearing.assessorName || ''}
                                onChange={(e) => setActiveHearing({ ...activeHearing, assessorName: e.target.value })}
                                placeholder="Nome do Secretário(a)"
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Se for Criminal: Vítimas */}
                          {activeHearing.hearingArea === 'criminal' && (
                            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 space-y-1.5 text-xs">
                              <span className="font-bold text-rose-300">Vítimas Ouvidas (Área Criminal):</span>
                              <input
                                type="text"
                                value={activeHearing.victimsNames || ''}
                                onChange={(e) => setActiveHearing({ ...activeHearing, victimsNames: e.target.value })}
                                placeholder="Ex: MARTA SILVA COELHO, ALCINO DE PAULA PEREIRA NETO e MARCOS ANTÔNIO MESSIAS SILVA"
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white focus:outline-none"
                              />
                            </div>
                          )}

                          {/* Qualificação do Autor */}
                          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-300">Polo Ativo (Autor & Advogado)</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">Presença do Autor:</span>
                                <select
                                  value={activeHearing.plaintiffPresence || 'presente'}
                                  onChange={(e) =>
                                    setActiveHearing({
                                      ...activeHearing,
                                      plaintiffPresence: e.target.value as any,
                                    })
                                  }
                                  className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
                                >
                                  <option value="presente">Presente</option>
                                  <option value="ausente">Ausente</option>
                                  <option value="representado">Representado</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                              <input
                                type="text"
                                value={activeHearing.plaintiffLawyerName || ''}
                                onChange={(e) =>
                                  setActiveHearing({ ...activeHearing, plaintiffLawyerName: e.target.value })
                                }
                                placeholder="Nome do(a) Advogado(a) do Autor..."
                                className="sm:col-span-6 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                              />
                              <input
                                type="text"
                                value={activeHearing.plaintiffLawyerOab || ''}
                                onChange={(e) =>
                                  setActiveHearing({ ...activeHearing, plaintiffLawyerOab: e.target.value })
                                }
                                placeholder="OAB (Ex: GO 45.123)"
                                className="sm:col-span-3 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                              />
                              <select
                                value={activeHearing.plaintiffLawyerPresence || 'presente'}
                                onChange={(e) =>
                                  setActiveHearing({
                                    ...activeHearing,
                                    plaintiffLawyerPresence: e.target.value as any,
                                  })
                                }
                                className="sm:col-span-3 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                              >
                                <option value="presente">Adv. Presente</option>
                                <option value="ausente">Adv. Ausente</option>
                              </select>
                            </div>
                          </div>

                          {/* Qualificação do Réu */}
                          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-300">Polo Passivo (Réu, Preposto & Advogado)</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">Presença do Réu:</span>
                                <select
                                  value={activeHearing.defendantPresence || 'presente'}
                                  onChange={(e) =>
                                    setActiveHearing({
                                      ...activeHearing,
                                      defendantPresence: e.target.value as any,
                                    })
                                  }
                                  className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
                                >
                                  <option value="presente">Presente</option>
                                  <option value="ausente">Ausente (Revelia)</option>
                                  <option value="preposto">Por Preposto</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                              {activeHearing.defendantPresence === 'preposto' && (
                                <input
                                  type="text"
                                  value={activeHearing.defendantPrepostoName || ''}
                                  onChange={(e) =>
                                    setActiveHearing({ ...activeHearing, defendantPrepostoName: e.target.value })
                                  }
                                  placeholder="Nome do Preposto..."
                                  className="sm:col-span-12 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                                />
                              )}
                              <input
                                type="text"
                                value={activeHearing.defendantLawyerName || ''}
                                onChange={(e) =>
                                  setActiveHearing({ ...activeHearing, defendantLawyerName: e.target.value })
                                }
                                placeholder="Nome do(a) Advogado(a) do Réu..."
                                className="sm:col-span-6 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                              />
                              <input
                                type="text"
                                value={activeHearing.defendantLawyerOab || ''}
                                onChange={(e) =>
                                  setActiveHearing({ ...activeHearing, defendantLawyerOab: e.target.value })
                                }
                                placeholder="OAB (Ex: GO 52.880)"
                                className="sm:col-span-3 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                              />
                              <select
                                value={activeHearing.defendantLawyerPresence || 'presente'}
                                onChange={(e) =>
                                  setActiveHearing({
                                    ...activeHearing,
                                    defendantLawyerPresence: e.target.value as any,
                                  })
                                }
                                className="sm:col-span-3 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                              >
                                <option value="presente">Adv. Presente</option>
                                <option value="ausente">Adv. Ausente</option>
                              </select>
                            </div>
                          </div>

                          {/* Ministério Público & Ocorrências */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                            <div className="md:col-span-5 p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1.5">
                              <span className="text-xs font-bold text-slate-300">Ministério Público</span>
                              <div className="flex items-center gap-2">
                                <select
                                  value={activeHearing.prosecutorPresence || (activeHearing.hearingArea === 'criminal' ? 'presente' : 'dispensado')}
                                  onChange={(e) =>
                                    setActiveHearing({
                                      ...activeHearing,
                                      prosecutorPresence: e.target.value as any,
                                    })
                                  }
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                                >
                                  <option value="dispensado">Dispensado (Sem interesse público)</option>
                                  <option value="presente">Presente na Sessão</option>
                                  <option value="ausente">Ausente com Intimação</option>
                                </select>
                              </div>
                              {activeHearing.prosecutorPresence === 'presente' && (
                                <input
                                  type="text"
                                  value={activeHearing.prosecutorName || ''}
                                  onChange={(e) =>
                                    setActiveHearing({ ...activeHearing, prosecutorName: e.target.value })
                                  }
                                  placeholder="Nome do(a) Promotor(a) de Justiça..."
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                                />
                              )}
                            </div>

                            <div className="md:col-span-7 p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1.5">
                              <span className="text-xs font-bold text-slate-300">
                                Ocorrências / Protestos / Requerimentos em Mesa
                              </span>
                              <textarea
                                rows={2}
                                value={activeHearing.hearingOccurrences || ''}
                                onChange={(e) =>
                                  setActiveHearing({ ...activeHearing, hearingOccurrences: e.target.value })
                                }
                                placeholder="Registre aqui protestos de advogados, pedidos de prazo para procuração, desistências de testemunhas..."
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Bloco de Fechamento do Modelo Paradigma: Estudante, Prazo e Secretária */}
                          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2 text-xs">
                            <span className="font-bold text-slate-300">Fechamento do Termo & Subscrição Oficial</span>
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                              <div className="sm:col-span-4">
                                <label className="block text-slate-400 font-semibold mb-0.5">Estudante / Ouvinte Presente:</label>
                                <input
                                  type="text"
                                  value={activeHearing.studentOuvinte || ''}
                                  onChange={(e) => setActiveHearing({ ...activeHearing, studentOuvinte: e.target.value })}
                                  placeholder="Ex: Daniel Coelho Bezerra, RA: 2023203010"
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <label className="block text-slate-400 font-semibold mb-0.5">Prazo de Memoriais / Alegações:</label>
                                <input
                                  type="text"
                                  value={
                                    activeHearing.alegacoesFinaisPrazo ||
                                    (activeHearing.hearingArea === 'criminal' ? '05 (cinco) dias' : '10 (dez) dias')
                                  }
                                  onChange={(e) => setActiveHearing({ ...activeHearing, alegacoesFinaisPrazo: e.target.value })}
                                  placeholder="Ex: 10 (dez) dias ou 05 (cinco) dias"
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none"
                                />
                              </div>
                              <div className="sm:col-span-5">
                                <label className="block text-slate-400 font-semibold mb-0.5">Subscrição da Secretária:</label>
                                <input
                                  type="text"
                                  value={activeHearing.secretarySignature || 'Eu GMF, Secretária, digitei e subscrevi o presente termo.'}
                                  onChange={(e) => setActiveHearing({ ...activeHearing, secretarySignature: e.target.value })}
                                  placeholder="Eu [Iniciais], Secretária, digitei e subscrevi o presente termo."
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* EDITOR DA ATA DE AUDIÊNCIA COMPLETA */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <ScrollText className="w-4 h-4 text-amber-400" />
                            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                              Redação da Ata / Termo de Assentada (Texto Contínuo)
                            </h4>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {(minutesDraft || activeHearing.hearingMinutesDraft || '').length} carac. |{' '}
                              {(minutesDraft || activeHearing.hearingMinutesDraft || '').split(/\s+/).filter(Boolean).length} palavras
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Copiar Ata */}
                            <button
                              onClick={() => handleCopy(minutesDraft || activeHearing.hearingMinutesDraft || '', 'minutes')}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                              title="Copiar texto contínuo pronto para colar no PROJUDI / PJe"
                            >
                              {copiedSection === 'minutes' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>{copiedSection === 'minutes' ? 'Ata Copiada!' : 'Copiar para o PROJUDI'}</span>
                            </button>

                            {/* Exportar Word .docx */}
                            <button
                              onClick={handleExportMinutesDocx}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                              title="Baixar em formato Word (.docx)"
                            >
                              <Download className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Word (.docx)</span>
                            </button>

                            {/* Imprimir */}
                            <button
                              onClick={handlePrintMinutes}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                              title="Visualizar e Imprimir"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-300" />
                              <span>Imprimir</span>
                            </button>
                          </div>
                        </div>

                        {/* Área de Redação */}
                        <textarea
                          rows={16}
                          value={minutesDraft || activeHearing.hearingMinutesDraft || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMinutesDraft(val);
                            const updated = { ...activeHearing, hearingMinutesDraft: val };
                            setActiveHearing(updated);
                            handleSaveActiveHearing(updated);
                          }}
                          placeholder="O texto oficial da Ata de Audiência / Termo de Assentada aparecerá aqui. Você pode redigir, editar, importar deliberações das abas anteriores ou acionar a geração completa com IA..."
                          className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono leading-relaxed selection:bg-amber-500/30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <Gavel className="w-12 h-12 text-slate-700 mb-3" />
                <h3 className="text-base font-bold text-slate-400">Selecione ou Crie uma Audiência</h3>
                <p className="text-xs max-w-sm mt-1">
                  Selecione uma das audiências na coluna lateral ou clique em "+ Nova" para cadastrar o processo e preparar a instrução.
                </p>
              </div>
            )}
          </div>
        </div>
        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE AUDIÊNCIA (IN-APP) */}
        {hearingToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-100 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Excluir Audiência da Pauta?</h4>
                  <p className="text-xs text-slate-400">Esta ação removerá a ficha e todos os dados gravados.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-amber-400 font-bold">
                    {hearingToDelete.processNumber || 'Processo sem número'}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    {hearingToDelete.hearingType === 'instrucao_julgamento' ? 'Instrução e Julgamento' : hearingToDelete.hearingType}
                  </span>
                </div>
                <p className="text-slate-200 font-medium">
                  {hearingToDelete.author || 'Autor'} <span className="text-slate-500 font-normal">vs</span> {hearingToDelete.defendant || 'Réu'}
                </p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {hearingToDelete.scheduledDate || 'Data não definida'}{hearingToDelete.scheduledTime ? ` às ${hearingToDelete.scheduledTime}` : ''}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDeletingHearing}
                  onClick={() => setHearingToDelete(null)}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeletingHearing}
                  onClick={async () => {
                    setIsDeletingHearing(true);
                    try {
                      const idToRemove = hearingToDelete.id;
                      await deleteHearingRecord(idToRemove);
                      setHearings((prev) => prev.filter((item) => item.id !== idToRemove));
                      if (activeHearing?.id === idToRemove) {
                        const remaining = hearings.filter((item) => item.id !== idToRemove);
                        setActiveHearing(remaining.length > 0 ? remaining[0] : null);
                      }
                      setHearingToDelete(null);
                      setImportNotification('Audiência excluída da pauta com sucesso!');
                      setTimeout(() => setImportNotification(null), 3000);
                    } catch (err) {
                      console.error('Erro ao excluir audiência:', err);
                      setAiError('Falha ao excluir audiência.');
                    } finally {
                      setIsDeletingHearing(false);
                    }
                  }}
                  className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-950 cursor-pointer min-h-[44px]"
                >
                  {isDeletingHearing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{isDeletingHearing ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};
