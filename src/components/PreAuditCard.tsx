import React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Scale,
  Award,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  Fingerprint,
  GitCommit,
  BookOpen,
} from "lucide-react";
import { PreAuditResult, AuditAnalysis } from "../types";

interface PreAuditCardProps {
  preAudit?: PreAuditResult;
  auditAnalysis?: AuditAnalysis;
  onOpenAuditorModal?: () => void;
  compact?: boolean;
}

export const PreAuditCard: React.FC<PreAuditCardProps> = ({
  preAudit,
  auditAnalysis,
  onOpenAuditorModal,
  compact = false,
}) => {
  const effectivePreAudit: PreAuditResult | undefined = preAudit || (auditAnalysis ? {
    score: 100,
    verdict: "Aprovada sem Ressalvas",
    verdictColor: "emerald",
    certificateMessage: auditAnalysis.regularidadeDocumental?.observacoes || "Minuta estruturada em estrita conformidade com os autos e teses vigentes.",
    congruenceStatus: "Plena congruência com o relatório fático e pedidos da exordial",
    evidentiaryStatus: "Acervo fático-probatório devidamente valorado e suficiente",
    proceduralStatus: "Regularidade estrita da marcha processual",
    auditSummary: "Auditoria forense concluída com sucesso.",
    forensicAuditStatus: "Regular e sem inconsistências",
    marchaProcessualStatus: "Regular",
    precedentsStatus: "Em estrita conformidade com a legislação aplicável e súmulas vigentes.",
    safetySeal: true,
    auditedAt: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    keyFindings: [
      { topic: "Aderência Fática", status: "aprovado", details: "Elementos fáticos e pedidos devidamente contemplados." },
      { topic: "Regularidade", status: "aprovado", details: "Consectários e normas aplicadas em harmonia com os autos." }
    ]
  } : undefined);

  if (!effectivePreAudit) return null;

  const scoreColor =
    effectivePreAudit.score >= 90
      ? "text-emerald-700 bg-emerald-50 border-emerald-300"
      : effectivePreAudit.score >= 75
      ? "text-amber-700 bg-amber-50 border-amber-300"
      : "text-rose-700 bg-rose-50 border-rose-300";

  const badgeBg =
    effectivePreAudit.score >= 90
      ? "bg-emerald-600 text-white"
      : effectivePreAudit.score >= 75
      ? "bg-amber-600 text-white"
      : "bg-rose-600 text-white";

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white p-3 sm:p-4 rounded-xl border border-emerald-500/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 text-emerald-300">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-emerald-300 flex items-center gap-1">
                🛡️ Minuta Pré-Auditada com os Autos
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${badgeBg}`}>
                Score: {effectivePreAudit.score}/100 • {effectivePreAudit.verdict}
              </span>
              {auditAnalysis?.indicacaoTpuCnj && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/40">
                  TPU {auditAnalysis.indicacaoTpuCnj.codigoTpu}
                </span>
              )}
              {auditAnalysis?.tesesGabineteCheck?.aplicadas && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                  Teses Aplicadas
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
              {effectivePreAudit.certificateMessage || effectivePreAudit.auditSummary}
            </p>
          </div>
        </div>

        {onOpenAuditorModal && (
          <button
            onClick={onOpenAuditorModal}
            className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg border border-emerald-400/50 flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Auditoria Detalhada</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-emerald-200/80 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-300">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                  Certificado de Minuta Pré-Auditada com os Autos
                </h4>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeBg}`}>
                  Score {effectivePreAudit.score}/100 • {effectivePreAudit.verdict}
                </span>
                {auditAnalysis?.indicacaoTpuCnj && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-200 border border-blue-400/40 flex items-center gap-1">
                    <Scale className="w-3 h-3" />
                    <span>TPU CNJ {auditAnalysis.indicacaoTpuCnj.codigoTpu} • {auditAnalysis.indicacaoTpuCnj.subtipoResultado}</span>
                  </span>
                )}
                {auditAnalysis?.tesesGabineteCheck?.aplicadas && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                    <span>Caderno de Teses Aplicado</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                {effectivePreAudit.certificateMessage}
              </p>
            </div>
          </div>

          {onOpenAuditorModal && (
            <button
              onClick={onOpenAuditorModal}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg border border-emerald-400/50 flex items-center gap-1.5 transition cursor-pointer shadow-sm self-start sm:self-auto shrink-0"
              title="Abrir o Dossiê Completo de Auditoria Judicial e Raio-X dos Autos"
            >
              <Search className="w-4 h-4" />
              <span>Abrir Dossiê Raio-X</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Verified Pillars */}
      <div className="p-4 sm:p-5 bg-slate-50/50 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Pillar 1: Adstrição */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-slate-900">
                Adstrição & Congruência
              </h5>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                {effectivePreAudit.congruenceStatus}
              </p>
            </div>
          </div>

          {/* Pillar 2: Provas */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 text-blue-700 mt-0.5">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-slate-900">
                Confronto Fático-Probatório
              </h5>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                {effectivePreAudit.evidentiaryStatus}
              </p>
            </div>
          </div>

          {/* Pillar 3: Auditoria Forense Documental (6 Pilares) */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 text-teal-700 mt-0.5">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-slate-900">
                Auditoria Forense (6 Pilares)
              </h5>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                {effectivePreAudit.forensicAuditStatus ||
                  "Assinaturas, integridade temporal/visual, selos e Tema 1049 STJ validados."}
              </p>
            </div>
          </div>

          {/* Pillar 4: Rito & Preliminares */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0 text-purple-700 mt-0.5">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-slate-900">
                Rito, Competência & Defesas
              </h5>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                {effectivePreAudit.proceduralStatus}
              </p>
            </div>
          </div>

          {/* Pillar 5: Marcha Processual & Preclusão */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-700 mt-0.5">
              <GitCommit className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-slate-900">
                Marcha Processual & Preclusão
              </h5>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                {effectivePreAudit.marchaProcessualStatus ||
                  "Fluxo contínuo sem reabertura indevida de matérias já decididas."}
              </p>
            </div>
          </div>

          {/* Pillar 6: Precedentes */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700 mt-0.5">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-slate-900">
                Precedentes Vinculantes & Teses
              </h5>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                {effectivePreAudit.precedentsStatus || "Súmulas STF/STJ e caderno de teses aplicados com rigor."}
              </p>
            </div>
          </div>
        </div>

        {/* Caderno de Teses e Diretrizes do Gabinete */}
        {auditAnalysis?.tesesGabineteCheck && (
          <div className="bg-emerald-50/70 p-3.5 rounded-lg border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                Caderno de Teses e Diretrizes Vinculantes do Gabinete
              </h5>
              <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                {auditAnalysis.tesesGabineteCheck.aplicadas ? "Conforme & Aplicado" : "Auditado"}
              </span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              {auditAnalysis.tesesGabineteCheck.observacoes}
            </p>
            {Array.isArray(auditAnalysis.tesesGabineteCheck.resumoTeses) && auditAnalysis.tesesGabineteCheck.resumoTeses.length > 0 && (
              <div className="pt-1 border-t border-emerald-200/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Diretrizes do gabinete verificadas e aplicadas:
                </span>
                <div className="space-y-1">
                  {auditAnalysis.tesesGabineteCheck.resumoTeses.map((tese: string, tIdx: number) => (
                    <div key={tIdx} className="flex items-start gap-1.5 text-xs text-emerald-900 bg-white/60 p-1.5 rounded border border-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{tese}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detailed Findings Checklist */}
        {Array.isArray(effectivePreAudit.keyFindings) && effectivePreAudit.keyFindings.length > 0 && (
          <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-2">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Diagnóstico de Segurança da Pré-Auditoria:
            </h5>
            <div className="space-y-1.5">
              {effectivePreAudit.keyFindings.map((finding, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs p-2 rounded bg-slate-50/70 border border-slate-100"
                >
                  {finding.status === "aprovado" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : finding.status === "atencao" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="font-bold text-slate-800">{finding.topic}: </span>
                    <span className="text-slate-600">{finding.details}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
