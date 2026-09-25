import { JudgeParadigmModel } from "./data/defaultParadigms";

export type ProceduralPhase = "conhecimento" | "execucao_extrajudicial" | "cumprimento_sentenca";

export type ActType = "sentenca" | "decisao" | "despacho";

export interface ProcessInfo {
  processNumber: string;
  comarca: string;
  vara: string;
  juiz: string;
  autor: string;
  reu: string;
  valorCausa: string;
  assunto: string;
}

export interface FatoVsProvaItem {
  fatoAlegado: string;
  eventoId: string;
  provaApresentada: string;
  status: "Comprovado" | "Não Comprovado" | "Parcialmente Comprovado" | "Prova Inidônea/Desatualizada";
  analiseCritica: string;
  fundamentoLegal?: string;
  dispositivosLegais?: string[];
  valoracaoJuridica?: string;
  paradigmaOuTeseAplicada?: string;
}

export interface CompetenciaCheck {
  valorCausa: string;
  adequacaoTeto40SM: boolean;
  competenciaMaterial: boolean;
  legitimidadePartes: boolean;
  competenciaTerritorial: string;
  observacoes: string;
}

export interface RegularidadeDocumental {
  procuracaoStatus: string;
  comprovanteEnderecoStatus: string;
  consectariosStatus: string;
  observacoes: string;
  // Matriz de Auditoria Forense e Cautelar Documental (6 Pilares):
  assinaturasStatus?: string; // Validação de assinaturas físicas vs digitais e logs ICP-Brasil/Gov.br/DocuSign
  integridadeTemporalStatus?: string; // Análise de anacronismos cronológicos
  integridadeVisualStatus?: string; // Verificação de rasuras, emendas, fontes incompatíveis e montagens
  autenticidadeCartorariaStatus?: string; // Selos eletrônicos de fiscalização e QR codes
  subsuncaoLegalProvas?: string; // Aplicação CPC arts. 428/429 e Tema 1049 STJ
  confrontoDadosMinuta?: string; // Confronto cruzado direto de dados PDF vs Minuta
  marchaProcessualStatus?: string; // Ordem cronológica e respeito à preclusão de matérias já decididas
}

export interface PreAuditFinding {
  topic: string;
  status: "aprovado" | "atencao" | "ressalva";
  details: string;
}

export interface PreAuditResult {
  score: number; // 0 a 100
  verdict: "Aprovada sem Ressalvas" | "Aprovada com Ressalvas" | "Requer Correções";
  verdictColor: "emerald" | "amber" | "rose" | "indigo";
  certificateMessage: string;
  auditSummary: string;
  congruenceStatus: string;
  evidentiaryStatus: string;
  proceduralStatus: string;
  precedentsStatus?: string;
  forensicAuditStatus?: string;
  marchaProcessualStatus?: string;
  safetySeal: boolean;
  auditedAt: string;
  keyFindings: PreAuditFinding[];
}

export interface LegislacaoMapeadaItem {
  leiOuNorma: string;
  artigoOuDispositivo: string;
  ementaOuObjeto: string;
  regimeCorrecao?: string;
  aplicabilidadeAoCaso?: string;
}

export interface ConsectariosDetalhados {
  regimeAplicado: string;
  indiceCorrecao: string;
  termoInicialCorrecao: string;
  indiceJuros: string;
  termoInicialJuros: string;
  baseLegalCompleta: string;
  observacoes?: string;
}

export interface AuditAnalysis {
  fatoVsProva: FatoVsProvaItem[];
  competenciaCheck: CompetenciaCheck;
  regularidadeDocumental: RegularidadeDocumental;
  normasAplicadas: string[];
  alertasProcessuais: string[];
  preAudit?: PreAuditResult;
  legislacaoMapeada?: LegislacaoMapeadaItem[];
  consectariosDetalhados?: ConsectariosDetalhados;
  indicacaoTpuCnj?: IndicacaoTpuCnj;
  tesesGabineteCheck?: {
    aplicadas: boolean;
    resumoTeses?: string[];
    observacoes?: string;
  };
}

export interface LegislationLookupResult {
  query: string;
  diplomaOficial: string;
  ementa: string;
  artigosRelevantes: {
    artigo: string;
    texto: string;
    comentarioAplicacao: string;
  }[];
  regimeConsectarios: {
    indiceCorrecao: string;
    termoInicialCorrecao: string;
    indiceJuros: string;
    termoInicialJuros: string;
    fundamentacao: string;
  };
  sumulasEPrecedentes: string[];
  dispositivoSugerido: string;
}

export interface IndicacaoTpuCnj {
  codigoTpu: string;
  descricaoMovimento: string;
  tipoAto: "Sentença" | "Decisão Interlocutória" | "Despacho";
  subtipoResultado: string;
  prazoSecretaria?: string;
  filaProjudi?: string;
  observacoesLancamento?: string;
}

export interface MinuteData {
  title: string;
  header: string;
  processNumber: string;
  judicialUnit?: string;
  comarca?: string;
  vara?: string;
  parties: {
    author: string;
    defendant: string;
  };
  relatorio: string;
  fundamentacao: string;
  dispositivo: string;
  closing?: string;
  fullFormattedText: string;
  indicacaoTpuCnj?: IndicacaoTpuCnj;
}

export interface ApiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  cachedContentTokenCount?: number;
  modelUsed?: string;
}

export interface MinuteVersion {
  id: string;
  versionNumber: number;
  label: string; // e.g. "1º Modelo Original", "Refino Chat: Ajuste dos danos morais", "Edição Manual #1"
  timestamp: number;
  minute: MinuteData;
  author?: string;
  source: "initial" | "generation" | "chat" | "editor" | "restored";
  changeSummary?: string;
  promptOrInstruction?: string;
}

export interface GenerationResult {
  minute: MinuteData;
  originalMinute?: MinuteData;
  versions?: MinuteVersion[];
  auditAnalysis: AuditAnalysis;
  usage?: ApiUsageMetadata;
  modelUsed?: string;
  paradigmUsed?: {
    id?: string;
    title: string;
    decisionType?: string;
    fullText?: string;
  };
  holisticSynopsis?: string;
  indicacaoTpuCnj?: IndicacaoTpuCnj;
  cadernoTesesApplied?: {
    active: boolean;
    thesesSnippet?: string;
    fullText?: string;
  };
  deduplicationStats?: {
    duplicatesFound: number;
    charsSaved: number;
  };
}

export interface ChatMessage {
  id: string;
  sender: "user" | "agaia";
  text: string;
  timestamp: string;
  hasMinuteUpdate?: boolean;
  updatedMinute?: MinuteData;
  suggestedActions?: string[];
  usage?: ApiUsageMetadata;
}

export interface ProcessDossier {
  id: string; // chave única normalizada do processo
  processNumber: string;
  normalizedNumber: string;
  parties?: {
    author: string;
    defendant: string;
  };
  comarca?: string;
  vara?: string;
  judicialUnit?: string;
  unitId?: string;
  totalActs: number;
  actTypes: string[];
  lastDate: number;
  firstDate: number;
  analyses: SavedAnalysis[]; // atos ordenados cronologicamente
  creators: string[];
  paradigmsUsed: { id?: string; title: string; decisionType?: string }[];
  hasChat: boolean;
}

export interface SavedAnalysis {
  id: string;
  promptTitle: string;
  promptId?: string;
  promptCategory?: string;
  promptScope?: string;
  date: number;
  processNumber: string;
  result: GenerationResult;
  originalMinute?: MinuteData;
  versions?: MinuteVersion[];
  processTextContext: string;
  createdBy?: string;
  creatorName?: string;
  creatorEmail?: string;
  chatMessages?: ChatMessage[];
  unitId?: string;
}

export interface InitialPetitionFile {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'audio' | 'video' | 'text' | 'other';
  mimeType: string;
  size: number;
  base64?: string;
  textContent?: string;
  previewUrl?: string;
}

export interface InitialPetitionFormData {
  area: string;
  clientName: string;
  defendantName: string;
  caseDescription: string;
  hasInjunction: boolean;
  hasGratuidade: boolean;
  hasPrioridade: boolean;
  conciliationInterest: boolean;
  damagesClaimed?: string;
  specificDirectives?: string;
  writingStyle: 'objetivo' | 'doutrinario' | 'visual_law';
  courtCityState?: string;
}

export interface InitialPetitionClaimItem {
  id: string;
  title: string;
  description: string;
  legalBasis?: string;
  estimatedValue?: string;
}

export interface InitialPetitionTimelineItem {
  dateOrPeriod: string;
  event: string;
  evidenceSource: string;
}

export interface InitialPetitionData {
  title: string;
  jurisdiction: string;
  partiesQualification: string;
  preliminaries?: string;
  factsNarrative: string;
  legalBasis: string;
  injunctionTopic?: string;
  claims: InitialPetitionClaimItem[];
  valueOfTheCause: string;
  evidenceRequests: string;
  finalRequests: string;
  closing: string;
  fullMarkdown: string;
  factualTimeline?: InitialPetitionTimelineItem[];
  applicableLegislation?: string[];
  relevantPrecedents?: string[];
}

export interface SavedInitialPetition {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  area: string;
  clientName: string;
  defendantName: string;
  caseDescription: string;
  petition: InitialPetitionData;
  filesCount: number;
}

export interface SystemBroadcast {
  id?: string;
  message: string;
  type: "info" | "warning" | "update" | "maintenance";
  active: boolean;
  targetVersion?: string;
  createdAt: number;
  createdBy?: string;
  createdByName?: string;
  expiresAt?: number;
}

export interface SessionDraft {
  savedAt: number;
  processNumber: string;
  processNumber2ndGrau?: string;
  processText: string;
  actingArea: "judicial" | "administrativa";
  activePromptId: string;
  selectedParadigmId?: string;
  isParadigmEnabled?: boolean;
  uploadedPdfNames: string[];
  generationResult: GenerationResult | null;
  currentAnalysisId: string | null;
  chatMessages: ChatMessage[];
}

export interface CustomPrompt {
  id: string;
  title: string;
  category: "civel" | "fazenda" | "criminal" | "familia" | "infancia" | "outros" | "todos";
  privacy: "privado" | "interno" | "publico";
  scope: "judicial" | "administrativa";
  promptText: string;
  description?: string;
  isDefault?: boolean;
  actTypeHint?: ActType;
  proceduralPhaseHint?: ProceduralPhase;
  updatedAt?: string;
  createdBy?: string;
  creatorName?: string;
  creatorEmail?: string;
  isDeleted?: boolean;
  unitId?: string;
}

export interface CabinetTesesData {
  text: string;
  isEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
  title?: string;
}

export interface ProjudiGuideData {
  text: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
  title?: string;
}

export type UserRole = "admin" | "user";

export type TenantStatus = "active" | "suspended" | "trial" | "maintenance";
export type TenantPlan = "pro" | "magistrado" | "trial" | "enterprise";

export interface SaaSTenant {
  id: string;
  name: string;
  ownerEmail: string;
  createdAt: number;
  status?: TenantStatus;
  plan?: TenantPlan;
  notes?: string;
  suspendedReason?: string;
  maxUsers?: number;
  updatedAt?: number;
  usersCount?: number;
  promptsCount?: number;
  historyCount?: number;
  unitsCount?: number;
  paradigmsCount?: number;
  primaryUnitName?: string;
}

export interface JudicialUnit {
  id: string;
  name: string;
  calendarIdOrUrl?: string;
  calendarTitle?: string;
  tenantId?: string;
  tenantName?: string;
}

export interface CabinetCalendarSettings {
  globalCalendarIdOrUrl?: string;
  globalCalendarTitle?: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
  notes?: string;
}

export interface UserApiKeyItem {
  id: string;
  key: string;
  label: string;
  keyType?: "paid" | "free";
  createdAt: number;
}

export interface UserKeyTelemetry {
  keyMode?: "native" | "custom";
  poolSize?: number;
  activeKeyLabel?: string;
  activeKeySnippet?: string;
  totalRequests?: number;
  dailyRequests?: number;
  dailyDate?: string;
  totalTokens?: number;
  rotationsCount?: number;
  lastRotationAt?: number;
  lastRotationReason?: string;
  lastUsedAt?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  isActive?: boolean;
  isJudge?: boolean;
  judgeTitle?: string;
  createdAt: number;
  updatedAt?: number | string;
  allowedUnits?: string[];
  tenantId?: string;
  completedTours?: string[];
  customApiKey?: string;
  customApiKeys?: UserApiKeyItem[];
  isCustomKeyActive?: boolean;
  activeKeyId?: string;
  canUseNativeKey?: boolean;
  isUnauthorized?: boolean;
  keyTelemetry?: UserKeyTelemetry;
}

export const DEFAULT_UNITS: JudicialUnit[] = [
  { id: "montes_claros", name: "Montes Claros / Vara Única" },
  
];

export interface UploadedPdf {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  base64?: string;
  previewUrl?: string;
  extractedText?: string;
  pageCount?: number;
  isExtracting?: boolean;
}

export interface SampleCase {
  id: string;
  title: string;
  badge: string;
  phase: ProceduralPhase;
  actType: ActType;
  actSubtype: string;
  summary: string;
  processInfo: Partial<ProcessInfo>;
  processText: string;
  specificInstructions?: string;
}

export interface CongruenceItem {
  request: string;
  source: string;
  analyzedInDraft: boolean;
  verdictInDraft?: string;
  risk: "none" | "citra_petita" | "extra_petita" | "omission";
  details: string;
}

export interface EvidenceAuditItem {
  evidence: string;
  locationInPdf: string;
  party: "autor" | "reu" | "terceiro" | "perito";
  consideredInDraft: boolean;
  draftTreatment: string;
  impact: "critico" | "medio" | "baixo";
  observation: string;
}

export interface ProceduralAuditItem {
  topic: string;
  foundInProcess: boolean;
  addressedInDraft: boolean;
  status: "ok" | "alerta" | "grave";
  notes: string;
}

export interface CriticalAuditAlert {
  type: "danger" | "warning" | "info" | "success";
  title: string;
  description: string;
  recommendation: string;
}

export interface AlertResolutionItem {
  originalAlertTitle: string;
  originalAlertDescription?: string;
  status: "sanado" | "parcialmente_sanado" | "persistente" | "novo" | "não corrigido";
  explanation?: string;
  justification?: string;
  persistingRiskNotes?: string;
}

export interface PillarComparisonItem {
  previousScore: number;
  newScore: number;
  evolutionNotes?: string;
  commentary?: string;
}

export interface AuditComparisonResult {
  previousScore: number;
  newScore: number;
  scoreDelta: number;
  executiveCorrectionSummary: string;
  alertResolutions?: AlertResolutionItem[];
  alertsComparison?: AlertResolutionItem[];
  congruenceComparison?: PillarComparisonItem;
  evidentiaryComparison?: PillarComparisonItem;
  proceduralComparison?: PillarComparisonItem;
  congruenceDelta?: { before: number; after: number };
  evidentiaryDelta?: { before: number; after: number };
  proceduralDelta?: { before: number; after: number };
}

export interface AssessorDraftAuditResult {
  score: number;
  verdict: "Aprovada sem Ressalvas" | "Aprovada com Ressalvas" | "Requer Correções Obrigatórias" | "Crítica / Risco de Nulidade";
  verdictColor: "emerald" | "amber" | "rose" | "indigo";
  summary: string;
  congruence: {
    score: number;
    summary: string;
    items: CongruenceItem[];
  };
  evidentiary: {
    score: number;
    summary: string;
    items: EvidenceAuditItem[];
  };
  procedural: {
    score: number;
    summary: string;
    items: ProceduralAuditItem[];
  };
  criticalAlerts: CriticalAuditAlert[];
  assessorFeedbackMessage: string;
  suggestedCorrectionSnippet: string;
  systemGeneratedMinute?: string;
  comparison?: AuditComparisonResult;
  modelUsed?: string;
  holisticSynopsis?: string;
  deduplicationStats?: {
    duplicatesFound: number;
    charsSaved: number;
  };
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    cachedContentTokenCount?: number;
  };
}

export interface AuditedProcessRecord {
  id: string;
  tenant?: string;
  unitId?: string;
  processNumber: string;
  assessorName: string;
  date: number;
  score: number;
  verdict: string;
  verdictColor: "emerald" | "amber" | "rose" | "indigo";
  processText: string;
  assessorDraft: string;
  specificDirectives?: string;
  auditResult: AssessorDraftAuditResult;
  systemGeneratedMinute?: string;
  judgeNotes?: string;
  status: "pendente_correcao" | "corrigido" | "aprovado" | "arquivado";
  createdBy?: string;
  creatorName?: string;
  creatorEmail?: string;
  updatedAt?: number;
  pdfFileNames?: string[];
  version?: number;
  versionLabel?: string;
  parentAuditId?: string;
  correctionNotes?: string;
  isCorrectionOfId?: string;
  previousDraft?: string;
}

export interface CabinetBackupSnapshot {
  id: string;
  timestamp: number;
  dateIso: string;
  tenantId: string;
  triggeredBy: "broadcast" | "manual" | "migration";
  broadcastMessage?: string;
  broadcastType?: string;
  authorEmail: string;
  authorName: string;
  isChunked?: boolean;
  totalChunks?: number;
  totalSize?: number;
  data?: {
    teses?: Record<string, CabinetTesesData | null>;
    projudiGuide?: Record<string, ProjudiGuideData | null>;
    paradigms?: Record<string, JudgeParadigmModel[] | null>;
    prompts?: CustomPrompt[];
    units?: JudicialUnit[];
    calendarSettings?: CabinetCalendarSettings | null;
  };
  summary: {
    tesesCount: number;
    projudiGuideCount: number;
    paradigmsCount: number;
    promptsCount: number;
    unitsCount: number;
  };
}

export interface CabinetFullPartitionData {
  profile?: any;
  units?: JudicialUnit[];
  teses?: Record<string, CabinetTesesData | null>;
  paradigms?: Record<string, JudgeParadigmModel[] | null>;
  projudiGuide?: Record<string, ProjudiGuideData | null>;
  calendarSettings?: CabinetCalendarSettings | null;
  prompts?: CustomPrompt[];
  history?: SavedAnalysis[];
  knowledge?: any[];
  audits?: AuditedProcessRecord[];
}

export interface GlobalDatabaseSnapshot {
  id: string;
  timestamp: number;
  dateIso: string;
  reason: string;
  triggeredBy: "superadmin" | "permission_change" | "manual" | "migration" | "auto";
  authorEmail: string;
  authorName: string;
  isChunked?: boolean;
  totalChunks?: number;
  totalSize?: number;
  data?: {
    tenants: SaaSTenant[];
    users: UserProfile[];
    invites: { email: string; tenantId: string; invitedAt: number; role?: string; invitedBy?: string }[];
    globalSettings?: Record<string, any>;
    gabinetesData: Record<string, CabinetFullPartitionData>;
    legacyData?: {
      history?: SavedAnalysis[];
      prompts?: CustomPrompt[];
      teses?: any[];
      knowledge?: any[];
      audits?: any[];
    };
  };
  summary: {
    tenantsCount: number;
    usersCount: number;
    invitesCount: number;
    totalHistoriesCount: number;
    totalPromptsCount: number;
    totalTesesCount: number;
    totalParadigmsCount: number;
    totalAuditsCount: number;
    totalUnitsCount: number;
  };
}

export interface SuggestedCabinetThesis {
  id: string;
  title: string;
  category: string;
  decisionType: JudgeParadigmModel["decisionType"];
  hypothesis: string;
  probativeStandard: string;
  consequencesAndLimits?: string;
  consectariosAndPrecedents?: string;
  fullSuggestedBlock: string;
  sourceSummary: string;
  frequencyCount?: number;
  isDuplicate: boolean;
  duplicateReason?: string;
  duplicateOverlapRatio?: number;
  status: "pending" | "injected" | "saved_paradigm" | "both" | "discarded";
}

export interface CabinetThesesScanResult {
  suggestedTheses: SuggestedCabinetThesis[];
  minedStats: {
    totalHistoryAnalyzed: number;
    totalParadigmsAnalyzed: number;
    totalThesesDiscovered: number;
    totalInediteTheses: number;
    totalDuplicateFiltered: number;
  };
}

export type TicketType = 
  | "melhoria_sugestao" 
  | "reporte_erro" 
  | "ajuste_tese_prompt" 
  | "duvida_suporte" 
  | "elogio_feedback" 
  | "outro";

export type TicketPriority = "baixa" | "media" | "alta" | "critica";

export type TicketStatus = 
  | "aguardando" 
  | "em_analise" 
  | "em_construcao" 
  | "concluido" 
  | "nao_provido" 
  | "arquivado";

export interface TicketMessage {
  id: string;
  authorUid: string;
  authorName: string;
  authorEmail: string;
  authorRole: string;
  content: string;
  createdAt: number;
  isSuperAdminReply?: boolean;
}

export interface TicketStatusHistoryItem {
  status: TicketStatus;
  changedBy: string;
  changedByName: string;
  changedAt: number;
  comment?: string;
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  tenantName?: string;
  unitId?: string;
  unitName?: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: number;
  updatedAt: number;
  createdByUid: string;
  createdByName: string;
  createdByEmail: string;
  createdByRole: string;
  resolutionFeedback?: string;
  resolvedAt?: number;
  resolvedBy?: string;
  messages: TicketMessage[];
  statusHistory?: TicketStatusHistoryItem[];
  isReadByTenant?: boolean;
  isReadBySuperAdmin?: boolean;
  tags?: string[];
  systemModule?: string;
}

export type HearingType = "instrucao_julgamento" | "conciliacao" | "saneamento" | "justificacao" | "una";

export interface HearingWitness {
  id: string;
  name: string;
  role: "testemunha_autor" | "testemunha_reu" | "informante" | "perito" | "parte_autora" | "parte_re";
  document?: string;
  controversyTopic: string;
  questions?: string[];
  notes?: string;
  status?: "aguardando" | "inquirido" | "dispensado" | "contraditado";
  contradictReason?: string;
}

export interface HearingControversyPoint {
  id: string;
  fact: string;
  allegedBy?: "autor" | "reu" | "ambos";
  evidenceInFiles?: string; // Provas já constantes no processo
  hasDocumentalProof?: boolean; // Se consta nos autos prova documental/pericial
  counterEvidence?: string; // Contraprova alegada pelo réu/adverso
  counterClaimFact?: boolean; // Se relativo a pedido contraposto/reconvenção
  burdenOfProof: "autor" | "reu" | "inversao_cdc" | "dinamica_juiz";
  legalBasis?: string;
  needsOralProof?: boolean; // O que ainda tem que provar em audiência
  whatNeedsProof?: string; // Detalhe do que ainda falta esclarecer
  isControverted: boolean;
  status: "pendente" | "provado_autor" | "provado_reu" | "nao_provado";
}

export interface HearingRecord {
  id: string;
  tenantId: string;
  unitId?: string;
  processNumber: string;
  author: string;
  defendant: string;
  hearingType: HearingType;
  scheduledDate?: string;
  scheduledTime?: string;
  judgeName?: string;
  assessorName?: string;
  actionClass?: string;
  subject?: string;
  
  // Extração de PDF e Peças
  uploadedPdfNames?: string[];
  rawSourceText?: string;

  // Briefing, Resumo e Matriz Probatória Completa
  caseFactsSummary?: string;
  holisticSynopsis?: string;
  deduplicationStats?: {
    duplicatesFound: number;
    charsSaved: number;
  };
  plaintiffClaims?: string; // Fatos e provas do autor
  defendantClaims?: string; // Fatos e contraprovas do réu
  counterClaim?: string; // Pedido contraposto ou reconvenção
  whatRemainsToProve?: string; // O que ainda resta provar em audiência
  controversySummary?: string;
  pointsOfControversy?: HearingControversyPoint[];
  witnesses?: HearingWitness[];
  keyQuestions?: string[];
  alertsAndTraps?: string[];

  // Bloco de Notas / Impressões em Tempo Real
  hearingNotes?: string;

  // Deliberações Rápidas
  deliberationType?: "acordo_total" | "acordo_parcial" | "revelia" | "contradita" | "indeferimento_perguntas" | "diligencia" | "sentenca_imediata" | "outro";
  deliberationDraft?: string;

  // Sentença em Mesa
  instantSentenceVerdict?: "auto" | "procedencia" | "parcial_procedencia" | "improcedencia" | "sem_resolucao";
  instantSentenceDraft?: string;

  // Ata de Audiência / Termo de Assentada
  courtName?: string; // Ex: Vara / Juizado / Comarca
  judiciaryState?: string; // Ex: "PODER JUDICIÁRIO DO ESTADO DE GOIÁS"
  comarcaName?: string; // Ex: "COMARCA DE MONTES CLAROS DE GOIÁS"
  hearingTitle?: string; // Ex: "AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO"
  hearingArea?: "civel" | "criminal";
  hearingModality?: "presencial" | "telepresencial" | "hibrida";
  plaintiffPresence?: "presente" | "ausente" | "representado";
  plaintiffLawyerName?: string;
  plaintiffLawyerOab?: string;
  plaintiffLawyerPresence?: "presente" | "ausente";
  defendantPresence?: "presente" | "ausente" | "preposto";
  defendantPrepostoName?: string;
  defendantLawyerName?: string;
  defendantLawyerOab?: string;
  defendantLawyerPresence?: "presente" | "ausente";
  prosecutorPresence?: "presente" | "ausente" | "dispensado";
  prosecutorName?: string;
  victimsNames?: string; // Se criminal: nomes das vítimas
  studentOuvinte?: string; // Ex: "Daniel Coelho Bezerra, RA: 2023203010"
  secretarySignature?: string; // Ex: "Eu GMF, Secretária, digitei e subscrevi o presente termo."
  alegacoesFinaisPrazo?: string; // Ex: "10 (dez) dias" ou "05 (cinco) dias"
  hearingOccurrences?: string; // Ocorrências, requerimentos das partes, protestos em mesa
  hearingMinutesDraft?: string; // O texto integral contínuo da ata redigido/gerado
  hearingMinutesGeneratedAt?: number;

  createdAt: number;
  updatedAt: number;
  createdByEmail: string;
  createdByName?: string;
  status: "preparada" | "em_andamento" | "concluida" | "suspensa";
}

// ==========================================
// MÓDULO INDEPENDENTE: PETIÇÃO INICIAL 360°
// (Acesso e uso exclusivo para Super Admin / Advocacia)
// ==========================================

export interface InitialPetitionChecklistAudit {
  status: "aprovado" | "atencao" | "risco";
  score: number; // 0 a 100
  items: {
    id: string;
    label: string;
    requirement: string;
    isCompliant: boolean;
    details: string;
    recommendation?: string;
  }[];
  criticalAlerts: string[];
  safeForProtocol: boolean;
}

export interface InitialPetitionJurisprudenceItem {
  court: string; // Ex: "TJGO", "TJSP", "STJ"
  precedentNumber: string; // Ex: "Súmula 297 STJ", "Tema Repetitivo 1061" ou "Sugestão de Tese"
  theme: string;
  summary: string;
  favorableArgument: string;
  fullCitation: string;
  tipo?: "real_verificado" | "sugestao_tese";
  isRealVerificado?: boolean;
  fonteUrl?: string;
  fonteNome?: string;
  alertaAutenticidade?: string;
  termoPesquisa?: string;
}

export interface InitialPetitionRepetitiveTemplate {
  id: string;
  title: string;
  category: string;
  shortDesc: string;
  defaultClientFactualSkeleton: string;
  keyClaims: string[];
  recommendedProves: string[];
  suggestedUrgency: boolean;
  targetCourtDefault: string;
}

export interface InitialPetitionRecord {
  id: string;
  title: string;
  clientName?: string;
  defendantName?: string;
  lawArea: string;
  targetCourt: string; // Ex: "TJGO", "TJSP", "TRF1", "TRT18"
  causeValueEstimated?: string;
  caseDescription: string;
  wantsUrgency: boolean;
  urgencyRationale?: string;
  wantsGratuity: boolean;
  hasConciliationOption: boolean;
  attachedFileNames: string[];
  
  // Conteúdo Gerado
  fullPetitionMarkdown: string;
  cleanTextPreview?: string;
  
  // Módulos 360 e Atuação Contenciosa (Defesa / No Curso dos Autos)
  pieceType?: "inicial" | "contestacao" | "replica" | "incidental" | "recurso";
  clientRole?: "autor" | "reu";
  processNumber?: string;
  varaJuizo?: string;
  processAttachedFiles?: string[];
  clientAttachedFiles?: string[];
  preliminaresArguidas?: string[];
  impugnacaoMatriz?: {
    alegacaoAutor: string;
    refutacaoDefesa: string;
    documentoRef?: string;
  }[];

  auditCpc?: InitialPetitionChecklistAudit;
  favorableJurisprudence?: InitialPetitionJurisprudenceItem[];
  anticipatedDefenses?: string[];
  kitProcuracao?: string;
  kitDeclaracaoPobreza?: string;

  createdAt: number;
  updatedAt: number;
  createdByEmail: string;
  tags?: string[];
}

// ==========================================
// TELEMETRIA E CONSUMO DE TOKENS (NATIVE & BYOK)
// ==========================================

export type ExecutionModuleType = 
  | 'minuta'           // Geração de Minutas (Sentença, Decisão, Despacho)
  | 'audiencia'        // Mesa de Audiência (Roteiro, Perguntas, Deliberação, Ata)
  | 'lupa_magistrado'  // Lupa do Magistrado (Auditoria de Minuta / Conformidade Forense)
  | 'chat_refino'      // Assistente Judicial / Refino e Chat do Assessor
  | 'outros';          // Outras gerações (Mutirão, Petição, etc.)

export interface ModuleTokenUsageStats {
  totalTokens: number;
  promptTokens: number;
  candidatesTokens: number;
  requestCount: number;
  costBrl: number;
}

export interface UserTokenUsageStats {
  userEmail: string;
  userName?: string;
  totalTokens: number;
  promptTokens: number;
  candidatesTokens: number;
  requestCount: number;
  lastUsedAt: number;
  keyMode?: "native" | "custom";
  activeKeyLabel?: string;
  activeKeySnippet?: string;
  poolSize?: number;
  rotationsCount?: number;
  dailyRequests?: number;
  dailyDate?: string;
  lastRotationAt?: number;
  lastRotationReason?: string;
  modules?: Partial<Record<ExecutionModuleType, ModuleTokenUsageStats>>;
}

export interface CabinetMonthlyTokenUsage {
  id: string; // e.g., "2026-09"
  monthKey: string; // "2026-09"
  tenantId: string;
  tenantName?: string;
  totalTokens: number;
  promptTokens: number;
  candidatesTokens: number;
  requestCount: number;
  lastUsedAt: number;
  users: Record<string, UserTokenUsageStats>;
  modules?: Partial<Record<ExecutionModuleType, ModuleTokenUsageStats>>;
}

