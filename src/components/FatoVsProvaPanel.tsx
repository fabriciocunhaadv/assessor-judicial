import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, FileCheck, Info, Scale, BookOpen, BookmarkCheck, Sparkles, Gavel } from "lucide-react";
import { FatoVsProvaItem } from "../types";

interface FatoVsProvaPanelProps {
  items: FatoVsProvaItem[];
}

export const FatoVsProvaPanel: React.FC<FatoVsProvaPanelProps> = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div id="fato-vs-prova-empty" className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500">
        <Info className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="text-sm font-medium">Nenhum elemento fático-probatório analisado ainda.</p>
        <p className="text-xs text-slate-400 mt-1">Carregue um processo e gere a minuta para visualizar a matriz de confronto.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Comprovado":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Comprovado
          </span>
        );
      case "Não Comprovado":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Não Comprovado
          </span>
        );
      case "Parcialmente Comprovado":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Parcialmente Comprovado
          </span>
        );
      case "Prova Inidônea/Desatualizada":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-900 border border-purple-300 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
            Prova Inidônea / Defasada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
            {status}
          </span>
        );
    }
  };

  return (
    <div id="fato-vs-prova-container" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-amber-700" />
            Matriz de Confronto Fato vs. Prova (Auditoria & Fundamentação Normativa)
          </h3>
          <p className="text-xs text-slate-500">
            Confronto detalhado com leis, súmulas, artigos, teses vinculantes e valoração judicial aplicada à decisão.
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 bg-amber-100/70 text-amber-900 rounded-md border border-amber-300 self-start sm:self-auto">
          {items.length} {items.length === 1 ? "alegação auditada" : "alegações auditadas"}
        </span>
      </div>

      <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        {items.map((item, index) => (
          <div key={index} id={`fato-item-${index + 1}`} className="p-4 hover:bg-slate-50/70 transition-colors space-y-3">
            {/* Header: Number, Fato & Status */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 flex-1">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mt-0.5 shadow-2xs">
                  {index + 1}
                </span>
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {item.fatoAlegado}
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                      {item.eventoId || "Evento nos Autos"}
                    </span>
                    <span className="text-slate-600">
                      <strong className="text-slate-800">Prova Documental:</strong> {item.provaApresentada || "Sem prova juntada aos autos"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="self-start sm:self-center flex-shrink-0">
                {getStatusBadge(item.status)}
              </div>
            </div>

            {/* Análise Crítica do Assessor */}
            <div className="text-xs text-slate-800 bg-slate-50/90 rounded-lg p-3 border-l-3 border-slate-600 font-sans leading-relaxed">
              <strong className="text-slate-900 font-bold">🔍 Análise Fático-Probatória:</strong> {item.analiseCritica}
            </div>

            {/* Fundamentação Legal, Súmulas, Artigos, Jurisprudência e Teses */}
            {(item.fundamentoLegal || (item.dispositivosLegais && item.dispositivosLegais.length > 0)) && (
              <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-200 space-y-1.5 text-xs text-amber-950">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                    <Scale className="w-3.5 h-3.5 text-amber-700" />
                    <span>Lei, Súmula, Tese, Artigo & Jurisprudência Aplicados:</span>
                  </div>
                  {Array.isArray(item.dispositivosLegais) && item.dispositivosLegais.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {item.dispositivosLegais.map((disp, dIdx) => (
                        <span
                          key={dIdx}
                          className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 text-[11px] font-bold shadow-2xs font-mono"
                        >
                          {disp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {item.fundamentoLegal && (
                  <p className="text-amber-900 leading-relaxed font-sans pl-5">
                    {item.fundamentoLegal}
                  </p>
                )}
              </div>
            )}

            {/* Valoração Probatória & Impacto na Decisão/Sentença/Despacho */}
            {item.valoracaoJuridica && (
              <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 space-y-1 text-xs text-blue-950">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                  <Gavel className="w-3.5 h-3.5 text-blue-700" />
                  <span>Valoração Judicial & Impacto no Julgamento:</span>
                </div>
                <p className="text-blue-900 leading-relaxed font-sans pl-5">
                  {item.valoracaoJuridica}
                </p>
              </div>
            )}

            {/* Paradigma ou Tese Normativa do Gabinete Vinculada */}
            {item.paradigmaOuTeseAplicada && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50/80 rounded-lg border border-emerald-200 text-xs text-emerald-950">
                <BookmarkCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <div className="leading-tight">
                  <strong className="text-emerald-900 font-bold">Tese ou Paradigma do Gabinete:</strong>{" "}
                  <span className="text-emerald-800">{item.paradigmaOuTeseAplicada}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
