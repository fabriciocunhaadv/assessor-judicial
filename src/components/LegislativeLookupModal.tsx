import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Scale,
  Sparkles,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Calculator,
  Layers,
  Loader2,
  FileText,
  BookmarkCheck,
  HelpCircle,
} from "lucide-react";
import { LEGAL_FRAMEWORKS, LegalFramework } from "../data/legalTaxonomy";
import { LegislationLookupResult } from "../types";

interface LegislativeLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  processContext?: string;
  onInsertClause?: (clauseText: string) => void;
}

export const LegislativeLookupModal: React.FC<LegislativeLookupModalProps> = ({
  isOpen,
  onClose,
  initialQuery = "",
  processContext = "",
  onInsertClause,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string>("civil_geral");
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);
  const [apiResult, setApiResult] = useState<LegislationLookupResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copiedClause, setCopiedClause] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"taxonomia" | "pesquisa_ia">("taxonomia");

  // Selected local framework
  const currentFramework = useMemo(() => {
    return LEGAL_FRAMEWORKS.find((f) => f.id === selectedFrameworkId) || LEGAL_FRAMEWORKS[0];
  }, [selectedFrameworkId]);

  // Filter frameworks by search text
  const filteredFrameworks逃 = useMemo(() => {
    if (!searchQuery.trim()) return LEGAL_FRAMEWORKS;
    const q = searchQuery.toLowerCase();
    return LEGAL_FRAMEWORKS.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        f.keywords.some((k) => k.toLowerCase().includes(q)) ||
        f.principaisLeis.some(
          (l) =>
            l.diploma.toLowerCase().includes(q) ||
            l.artigosChave.toLowerCase().includes(q) ||
            l.objeto.toLowerCase().includes(q)
        )
    );
  }, [searchQuery]);

  const handleSearchApi = async () => {
    if (!searchQuery.trim()) return;
    setIsLoadingApi(true);
    setApiError(null);
    setActiveTab("pesquisa_ia");

    try {
      const res = await fetch("/api/lookup-legislation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery.trim(),
          context: processContext || undefined,
        }),
      });

      if (!res.ok) {
        let errStr = "Erro ao consultar a base legislativa.";
        try {
          const errText = await res.text();
          const errJson = JSON.parse(errText);
          if (errJson?.error) errStr = errJson.error;
        } catch {}
        throw new Error(errStr);
      }

      let data: LegislationLookupResult;
      try {
        const responseText = await res.text();
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("A conexão com o servidor foi interrompida ou a IA retornou um formato inválido.");
      }
      setApiResult(data);
    } catch (err: any) {
      console.error("Erro na pesquisa legislativa:", err);
      const errorMsg = err?.message || "Falha na conexão com o serviço normativo.";
      setApiError(errorMsg);
      if (errorMsg.includes("Erro 429") || errorMsg.includes("Limite de requisições") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
         window.dispatchEvent(new CustomEvent("open-api-key-modal", { detail: { message: errorMsg } }));
      }
    } finally {
      setIsLoadingApi(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedClause(true);
    setTimeout(() => setCopiedClause(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Pesquisa Legislativa & Taxonomia Normativa (TJGO)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Regimes Dinâmicos
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Consulta de microssistemas jurídicos, leis aplicáveis e parametrização exata de juros e correção monetária.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Tab Navigation */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchApi()}
                placeholder="Ex: Lei 14.905/2024, Fazenda Pública, Cheque prescrito, Dano moral atraso voo, Art. 406 CC..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={handleSearchApi}
              disabled={isLoadingApi || !searchQuery.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              {isLoadingApi ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              Pesquisar IA
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("taxonomia")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "taxonomia"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Catálogo Taxonômico ({filteredFrameworks逃.length})
            </button>
            <button
              onClick={() => setActiveTab("pesquisa_ia")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "pesquisa_ia"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Resultado da Pesquisa Aprofundada {apiResult ? "✓" : ""}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "taxonomia" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: Framework Selector */}
              <div className="md:col-span-4 space-y-2 border-r border-slate-100 pr-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Microssistemas e Regimes
                </h4>
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {filteredFrameworks逃.map((fw) => {
                    const isSelected = fw.id === selectedFrameworkId;
                    return (
                      <button
                        key={fw.id}
                        onClick={() => setSelectedFrameworkId(fw.id)}
                        className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1 ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold line-clamp-1 ${
                              isSelected ? "text-indigo-900" : "text-slate-800"
                            }`}
                          >
                            {fw.name}
                          </span>
                          <ChevronRight
                            className={`w-3.5 h-3.5 ${
                              isSelected ? "text-indigo-600" : "text-slate-400"
                            }`}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                          {fw.category}
                        </span>
                        <div className="text-[11px] text-slate-600 font-mono bg-white/70 px-1.5 py-0.5 rounded border border-slate-100 inline-block line-clamp-1">
                          {fw.regimeCorrecao.indiceCorrecao} • {fw.regimeCorrecao.indiceJuros}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Detailed Framework View */}
              <div className="md:col-span-8 space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                        {currentFramework.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">
                        {currentFramework.name}
                      </h4>
                    </div>
                  </div>

                  {/* Leis e Artigos */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      Diplomas e Artigos Fundamentais
                    </h5>
                    <div className="space-y-1.5">
                      {currentFramework.principaisLeis.map((lei, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>{lei.diploma}</span>
                            <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {lei.artigosChave}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1">{lei.objeto}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Regime de Consectários Legais */}
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs space-y-2.5">
                    <h5 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                      Regime Legal de Juros e Correção Monetária
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Correção Monetária
                        </span>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {currentFramework.regimeCorrecao.indiceCorrecao}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          <strong>Termo Inicial:</strong> {currentFramework.regimeCorrecao.termoInicialCorrecao}
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">
                          Juros de Mora
                        </span>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {currentFramework.regimeCorrecao.indiceJuros}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          <strong>Termo Inicial:</strong> {currentFramework.regimeCorrecao.termoInicialJuros}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                      <strong>Base Legal / Ratio Decidendi:</strong> {currentFramework.regimeCorrecao.baseLegalCompleta}
                    </div>
                  </div>

                  {/* Súmulas e Precedentes */}
                  {currentFramework.sumulasEPrecedentes.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Súmulas e Precedentes Vinculantes Correlatos
                      </h5>
                      <div className="flex flex-wrap gap-1.5">
                        {currentFramework.sumulasEPrecedentes.map((sumula, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-900 border border-emerald-200"
                          >
                            {sumula}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cláusula Sugerida com 1-Click Copy */}
                  <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5" />
                        Redação Padrão do Dispositivo
                      </span>
                      <div className="flex items-center gap-2">
                        {onInsertClause && (
                          <button
                            onClick={() => onInsertClause(currentFramework.clausulaDispositivoPadrao)}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            Inserir na Minuta
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(currentFramework.clausulaDispositivoPadrao)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition flex items-center gap-1"
                        >
                          {copiedClause ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {copiedClause ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                    </div>
                    <p className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      {currentFramework.clausulaDispositivoPadrao}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "pesquisa_ia" && (
            <div className="space-y-4">
              {isLoadingApi && (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">
                    Consultando base legislativa e precedentes dos tribunais superiores...
                  </p>
                  <p className="text-xs text-slate-400">
                    Mapeando microssistema, diplomas federais e parâmetros de liquidação.
                  </p>
                </div>
              )}

              {apiError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                  <strong>Erro:</strong> {apiError}
                </div>
              )}

              {!isLoadingApi && !apiError && !apiResult && (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <Search className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Digite uma consulta na barra superior e clique em "Pesquisar IA".</p>
                </div>
              )}

              {!isLoadingApi && apiResult && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <span className="text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Resultado Normativo Oficial
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">
                      {apiResult.diplomaOficial}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">{apiResult.ementa}</p>
                  </div>

                  {/* Artigos Relevantes */}
                  {apiResult.artigosRelevantes && apiResult.artigosRelevantes.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        Dispositivos Legais Relevantes
                      </h5>
                      <div className="space-y-2">
                        {apiResult.artigosRelevantes.map((art, i) => (
                          <div
                            key={i}
                            className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1"
                          >
                            <span className="font-bold text-indigo-900 block">{art.artigo}</span>
                            <p className="text-slate-700 italic font-mono text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                              "{art.texto}"
                            </p>
                            {art.comentarioAplicacao && (
                              <p className="text-[11px] text-slate-600">
                                <strong>Aplicação Prática:</strong> {art.comentarioAplicacao}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regime de Consectários */}
                  {apiResult.regimeConsectarios && (
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs space-y-2.5">
                      <h5 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                        Parâmetros de Consectários Legais Identificados
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Correção Monetária
                          </span>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {apiResult.regimeConsectarios.indiceCorrecao}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            <strong>Termo Inicial:</strong> {apiResult.regimeConsectarios.termoInicialCorrecao}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Juros de Mora
                          </span>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {apiResult.regimeConsectarios.indiceJuros}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            <strong>Termo Inicial:</strong> {apiResult.regimeConsectarios.termoInicialJuros}
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                        <strong>Fundamentação:</strong> {apiResult.regimeConsectarios.fundamentacao}
                      </p>
                    </div>
                  )}

                  {/* Súmulas */}
                  {apiResult.sumulasEPrecedentes && apiResult.sumulasEPrecedentes.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                        <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Súmulas e Enunciados Aplicáveis
                      </h5>
                      <div className="flex flex-wrap gap-1.5">
                        {apiResult.sumulasEPrecedentes.map((sumula, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-900 border border-emerald-200"
                          >
                            {sumula}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dispositivo Sugerido */}
                  {apiResult.dispositivoSugerido && (
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5" />
                          Cláusula de Dispositivo Gerada
                        </span>
                        <div className="flex items-center gap-2">
                          {onInsertClause && (
                            <button
                              onClick={() => onInsertClause(apiResult.dispositivoSugerido)}
                              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              Inserir na Minuta
                            </button>
                          )}
                          <button
                            onClick={() => handleCopy(apiResult.dispositivoSugerido)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition flex items-center gap-1"
                          >
                            {copiedClause ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {copiedClause ? "Copiado!" : "Copiar"}
                          </button>
                        </div>
                      </div>
                      <p className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        {apiResult.dispositivoSugerido}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Em conformidade com a jurisprudência consolidada do STF, STJ e TJGO.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
