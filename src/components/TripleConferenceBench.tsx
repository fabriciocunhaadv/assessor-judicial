import React, { useEffect, useState } from "react";
import {
  Scale,
  Sparkles,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  Save,
  MessageSquare,
  BookmarkPlus,
  RefreshCw,
  Columns3,
  Columns2,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
  Zap,
  Info,
  Loader2,
  ThumbsUp,
  Send,
  Bot,
} from "lucide-react";
import { AssessorDraftAuditResult, UploadedPdf, AuditedProcessRecord } from "../types";
import { PdfViewerPane } from "./PdfViewerPane";

interface TripleConferenceBenchProps {
  pdfFiles: UploadedPdf[];
  processText: string;
  systemGeneratedMinute: string;
  assessorDraftText: string;
  auditResult: AssessorDraftAuditResult | null;
  currentRecord?: AuditedProcessRecord | null;
  onUpdateDraftText: (newText: string) => void;
  onSaveAuditEdits: () => Promise<void>;
  onApproveDraft: () => Promise<void>;
  onRejectDraftWithFeedback: (feedback: string) => Promise<void>;
  onOpenSaveTeseModal: (content?: string, defaultTitle?: string) => void;
  onStartReAudit?: () => void;
  onGenerateIdealMinute?: () => Promise<void>;
  isGeneratingIdealMinute?: boolean;
  isSaving?: boolean;
  onOpenCopilot?: () => void;
}

export const TripleConferenceBench: React.FC<TripleConferenceBenchProps> = ({
  pdfFiles,
  processText,
  systemGeneratedMinute,
  assessorDraftText,
  auditResult,
  currentRecord,
  onUpdateDraftText,
  onSaveAuditEdits,
  onApproveDraft,
  onRejectDraftWithFeedback,
  onOpenSaveTeseModal,
  onStartReAudit,
  onGenerateIdealMinute,
  isGeneratingIdealMinute,
  isSaving = false,
  onOpenCopilot,
}) => {
  const [layoutMode, setLayoutMode] = useState<"triple" | "gabaritoVsAssessor" | "pdfVsAssessor" | "pdfFull">(
    "triple"
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [judgeNotes, setJudgeNotes] = useState<string>(currentRecord?.judgeNotes || "");
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>(
    auditResult?.assessorFeedbackMessage || ""
  );
  const [isDeliberating, setIsDeliberating] = useState<boolean>(false);

  const resumoParaCopiar = [
    auditResult ? `Score ${auditResult.score} — ${auditResult.verdict}` : "",
    auditResult?.summary || "",
    ...(auditResult?.criticalAlerts || []).map((al, i) => `${i + 1}. ${al.title}${al.minutaTrecho ? `\n   Minuta: “${al.minutaTrecho}”` : ""}${al.autosTrecho ? `\n   Autos: “${al.autosTrecho}”` : ""}${al.recommendation ? `\n   Orientação: ${al.recommendation}` : ""}`),
    systemGeneratedMinute ? `\nMINUTA GERADA\n${systemGeneratedMinute}` : "",
  ].filter(Boolean).join("\n\n");

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleApprove = async () => {
    setIsDeliberating(true);
    try {
      await onApproveDraft();
    } finally {
      setIsDeliberating(false);
    }
  };

  const handleSendFeedback = async () => {
    setIsDeliberating(true);
    try {
      await onRejectDraftWithFeedback(feedbackText);
      setShowFeedbackModal(false);
    } finally {
      setIsDeliberating(false);
    }
  };

  const score = auditResult?.score ?? currentRecord?.score ?? 85;
  const isApproved = (currentRecord?.status || "pendente_correcao") === "aprovado";

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* BARRA SUPERIOR DE CONTROLES DA BANCADA DE CONFERÊNCIA */}
      <div className="p-3 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border border-amber-500/40 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
            <Scale className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                Bancada de Tripla Conferência
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                Auditoria Ouro do Juiz
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                🚧 Módulo em Construção
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-300 mt-0.5">
              Confronto simultâneo: <strong>PDF dos Autos</strong> ⟷ <strong>Minuta Gabarito do Sistema</strong> ⟷ <strong>Minuta Pré-Analisada do Assessor</strong>
            </p>
          </div>
        </div>

        {/* Seletores de Layout & Ações Rápidas */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Modo de Visualização */}
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setLayoutMode("triple")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                layoutMode === "triple"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Tripla Visão 360° (3 Colunas Lado a Lado)"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tripla Visão 360°</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode("gabaritoVsAssessor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                layoutMode === "gabaritoVsAssessor"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Confronto: Gabarito IA vs Minuta do Assessor"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gabarito ⟷ Assessor</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode("pdfVsAssessor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                layoutMode === "pdfVsAssessor"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Confronto: PDF dos Autos vs Minuta do Assessor"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF ⟷ Assessor</span>
            </button>
          </div>

          {/* Botão Salvar Edições no Banco */}
          <button
            type="button"
            onClick={onSaveAuditEdits}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Salvar alterações manuais feitas na minuta"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-amber-400" />}
            <span>Salvar Edições</span>
          </button>

          {/* Botão Copiloto IA na Bancada de Tripla Conferência */}
          {onOpenCopilot && (
            <button
              type="button"
              onClick={onOpenCopilot}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-950/40 border border-indigo-400/40 group hover:scale-[1.02]"
              title="Abrir o Copiloto IA para dialogar com este processo e confrontar os autos"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-100 group-hover:rotate-12 transition-transform" />
              <span>Copiloto IA</span>
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
            </button>
          )}
        </div>
      </div>

      {/* ÁREA CENTRAL DE CONFERÊNCIA COM 3 COLUNAS */}
      <div className={`flex-1 grid grid-cols-1 gap-3 ${isMobile ? "" : "min-h-[580px] overflow-hidden"}`}
        style={{
          gridTemplateColumns:
            isMobile
              ? "minmax(0, 1fr)"
              : layoutMode === "triple"
              ? "minmax(320px, 1fr) minmax(320px, 1fr) minmax(350px, 1.15fr)"
              : layoutMode === "gabaritoVsAssessor"
              ? "minmax(340px, 1fr) minmax(340px, 1fr)"
              : layoutMode === "pdfVsAssessor"
              ? "minmax(340px, 1.1fr) minmax(340px, 1fr)"
              : "1fr",
        }}
      >
        {/* ========================================================================= */}
        {/* COLUNA 1: LEITOR DE PDF & AUTOS DO PROCESSO                               */}
        {/* ========================================================================= */}
        {(layoutMode === "triple" || layoutMode === "pdfVsAssessor" || layoutMode === "pdfFull") && (
          <div className="h-full flex flex-col min-h-[520px]">
            <PdfViewerPane
              pdfFiles={pdfFiles}
              fallbackText={processText}
              title="1. Autos do Processo (PDF / Projudi)"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* COLUNA 2: MINUTA GABARITO OFICIAL DO SISTEMA (IA & PARADIGMA DO JUIZ)     */}
        {/* ========================================================================= */}
        {(layoutMode === "triple" || layoutMode === "gabaritoVsAssessor") && (
          <div className="h-full flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg min-h-[520px]">
            {/* Header Coluna 2: resumo do resultado e análise */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300 block truncate">
                    2. Resumo e Análise
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    Nota, apontamentos com prova e minuta gerada
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(resumoParaCopiar, "systemGabarito")}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black transition flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Copiar o resumo da análise e a minuta gerada"
                >
                  {copiedKey === "systemGabarito" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "systemGabarito" ? "Copiado!" : "Copiar"}</span>
                </button>
              </div>
            </div>

            {/* Conteúdo: quadro do resultado (nota e análise) + minuta gerada abaixo */}
            <div data-testid="coluna-resumo-analise" className="flex-1 overflow-y-auto p-4 bg-slate-950/80 text-xs text-slate-200 leading-relaxed space-y-4 select-text scrollbar-thin">
              {auditResult ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3.5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl border-2 border-amber-400 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xl font-black text-white leading-none">{auditResult.score}</span>
                      <span className="text-[8px] uppercase tracking-wider text-amber-300">score</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-wide text-amber-300">{auditResult.verdict}</div>
                      <div className="text-[10px] text-slate-400">{(auditResult.criticalAlerts || []).length} apontamento(s) com prova</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="rounded-lg bg-slate-950 border border-slate-800 py-1.5"><div className="text-slate-400">Adstrição</div><div className="font-black text-white">{auditResult.congruence?.score ?? "—"}%</div></div>
                    <div className="rounded-lg bg-slate-950 border border-slate-800 py-1.5"><div className="text-slate-400">Provas</div><div className="font-black text-white">{auditResult.evidentiary?.score ?? "—"}%</div></div>
                    <div className="rounded-lg bg-slate-950 border border-slate-800 py-1.5"><div className="text-slate-400">Rito</div><div className="font-black text-white">{auditResult.procedural?.score ?? "—"}%</div></div>
                  </div>
                  {auditResult.summary && <p className="text-[12px] text-slate-100 leading-relaxed">{auditResult.summary}</p>}
                  {(auditResult.criticalAlerts || []).length > 0 && (
                    <ul className="space-y-1.5">
                      {auditResult.criticalAlerts.slice(0, 8).map((al, i) => (
                        <li key={i} className="pl-2.5 border-l-2 border-amber-500/70">
                          <span className="font-bold text-white">{al.title}</span>
                          {al.severity && <span className="ml-1.5 text-[9px] uppercase tracking-wider text-amber-300">{al.severity}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {auditResult.assessorFeedbackMessage && <p className="text-[11px] text-slate-300 border-t border-slate-800 pt-2">{auditResult.assessorFeedbackMessage}</p>}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Sem resultado de auditoria ainda.</p>
              )}

              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Minuta gerada</div>
                {systemGeneratedMinute ? (
                  <div className="whitespace-pre-wrap font-mono">{systemGeneratedMinute}</div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center space-y-2.5">
                    <p className="text-[11px] text-slate-400 leading-relaxed">A minuta completa só é gerada quando solicitada, para economizar tokens.</p>
                    {onGenerateIdealMinute && (
                      <button
                        type="button"
                        onClick={onGenerateIdealMinute}
                        disabled={isGeneratingIdealMinute}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {isGeneratingIdealMinute ? (<><Loader2 className="w-4 h-4 animate-spin text-slate-950" /><span>Redigindo minuta…</span></>) : (<><Zap className="w-4 h-4 fill-current" /><span>Gerar minuta (sob demanda)</span></>)}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Coluna Gabarito */}
            <div className="px-3.5 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Nota calculada por regra, só com prova nos autos</span>
              </span>
              <span className="font-mono text-slate-300">
                {systemGeneratedMinute.length.toLocaleString()} caracteres
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* COLUNA 3: MINUTA PRÉ-ANALISADA DO ASSESSOR + AUDITORIA OURO               */}
        {/* ========================================================================= */}
        <div className="h-full flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg min-h-[520px]">
          {/* Header Coluna Assessor com Selo de Auditoria Ouro */}
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-300 block truncate">
                    3. Minuta do Assessor
                  </span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black border ${
                    score >= 90
                      ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                      : score >= 75
                      ? "bg-amber-950 text-amber-300 border-amber-500/40"
                      : "bg-rose-950 text-rose-300 border-rose-500/40"
                  }`}>
                    Score: {score}/100
                  </span>
                  {auditResult?.proceduralChain?.estadoAtual?.proceduralStage && (
                    <span
                      className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-950 text-blue-300 border border-blue-500/40 uppercase hidden sm:inline-block"
                      title={`Diagnóstico da Marcha: ${auditResult.proceduralChain.estadoAtual.stageDiagnosis}`}
                    >
                      {auditResult.proceduralChain.estadoAtual.proceduralStage.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block truncate">
                  {currentRecord?.assessorName ? `Elaborada por: ${currentRecord.assessorName}` : "Pré-análise sob revisão judicial"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(assessorDraftText, "assessorDraft")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="Copiar minuta atual do assessor"
              >
                {copiedKey === "assessorDraft" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === "assessorDraft" ? "Copiado!" : "Copiar"}</span>
              </button>
            </div>
          </div>

          {/* Banner de Diagnóstico Rápido & Alertas Críticos */}
          {auditResult?.criticalAlerts && auditResult.criticalAlerts.length > 0 && (
            <div className="px-3.5 py-2 bg-rose-950/70 border-b border-rose-500/50 flex items-start gap-2 text-xs text-rose-200 shrink-0">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-rose-300 block">
                  {auditResult.criticalAlerts.length} Alerta(s) Crítico(s) Detectado(s):
                </span>
                <p className="text-[11px] text-rose-200/90 truncate">
                  {auditResult.criticalAlerts
                    .map((a: any) => (typeof a === "string" ? a : a?.title || a?.description || ""))
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
            </div>
          )}

          {/* Editor/Visualizador Interativo da Minuta do Assessor */}
          <div className="flex-1 flex flex-col min-h-0 relative bg-slate-950">
            <textarea
              value={assessorDraftText}
              onChange={(e) => onUpdateDraftText(e.target.value)}
              placeholder="Cole ou edite a minuta do assessor aqui..."
              className="w-full h-full p-4 bg-transparent border-0 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-hidden resize-none leading-relaxed select-text scrollbar-thin"
            />
          </div>

          {/* Painel de Deliberação e Decisão Judicial do Magistrado */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Deliberação do Juiz:
                </span>
                {isApproved ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Minuta Aprovada
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/50 text-amber-300 font-bold text-[10px]">
                    Em Análise
                  </span>
                )}
              </div>

              {/* Botões de Ação Decisória */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Devolver com Parecer / Feedback */}
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Devolver ao assessor com apontamentos e orientações pedagógicas"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Devolver c/ Parecer</span>
                </button>

                {/* Homologar / Aprovar */}
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isDeliberating}
                  className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  title="Homologar e Aprovar Minuta para assinatura no Projudi"
                >
                  {isDeliberating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Homologar Minuta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE DEVOLUÇÃO COM PARECER / FEEDBACK AO ASSESSOR */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Devolver com Orientações ao Assessor</h3>
                  <p className="text-[11px] text-slate-400">
                    O status será alterado para "Pendente de Correção" e o feedback salvo no histórico.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                Mensagem de Orientação / Apontamentos do Magistrado
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Insira as orientações e correções requeridas pelo magistrado..."
                className="w-full h-48 p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-hidden focus:border-amber-500 leading-relaxed shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendFeedback}
                  disabled={isDeliberating}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isDeliberating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Salvar e Devolver</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
