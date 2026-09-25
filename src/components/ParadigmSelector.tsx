import React, { useState, useEffect } from "react";
import {
  Scale,
  Gavel,
  BookOpen,
  Check,
  Search,
  Eye,
  Edit3,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Bookmark,
  PlusCircle,
  X,
  ExternalLink,
  Zap,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  Target,
  Compass,
  SlidersHorizontal,
  HelpCircle,
} from "lucide-react";
import { JudgeParadigmModel } from "../data/defaultParadigms";
import { getJudgeParadigms, PARADIGMS_UPDATE_EVENT } from "../utils/judgeParadigmsDb";
import { ParadigmMatchResult } from "../utils/paradigmMatcher";

interface ParadigmSelectorProps {
  isParadigmEnabled: boolean;
  setIsParadigmEnabled: (enabled: boolean) => void;
  selectedParadigmId: string | null;
  setSelectedParadigmId: (id: string | null) => void;
  customParadigmText: string;
  setCustomParadigmText: (text: string) => void;
  onOpenCabinetModal: (tab?: "caderno" | "modelos_paradigmas" | "importar_pdf") => void;
  detectedMatch?: ParadigmMatchResult | null;
  detectedMatches?: ParadigmMatchResult[];
  onApplySuggestedParadigm?: (match: ParadigmMatchResult) => void;
  onDismissSuggestion?: () => void;
}

export const ParadigmSelector: React.FC<ParadigmSelectorProps> = ({
  isParadigmEnabled,
  setIsParadigmEnabled,
  selectedParadigmId,
  setSelectedParadigmId,
  customParadigmText,
  setCustomParadigmText,
  onOpenCabinetModal,
  detectedMatch,
  detectedMatches = [],
  onApplySuggestedParadigm,
  onDismissSuggestion,
}) => {
  const [paradigms, setParadigms] = useState<JudgeParadigmModel[]>(() => getJudgeParadigms());
  const [searchQuery, setSearchQuery] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCustomMode, setSelectedCustomMode] = useState(false);
  const [previewModalParadigm, setPreviewModalParadigm] = useState<JudgeParadigmModel | null>(null);
  const [justAppliedId, setJustAppliedId] = useState<string | null>(null);

  // Synchronize paradigms dynamically whenever they are updated/deleted anywhere in the app
  useEffect(() => {
    const handleUpdate = (e: CustomEvent<JudgeParadigmModel[]> | Event) => {
      const currentList = "detail" in e && Array.isArray((e as any).detail)
        ? (e as any).detail
        : getJudgeParadigms();
      setParadigms(currentList);
    };

    window.addEventListener(PARADIGMS_UPDATE_EVENT, handleUpdate as EventListener);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(PARADIGMS_UPDATE_EVENT, handleUpdate as EventListener);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Reconcile selected paradigm if it was deleted
  useEffect(() => {
    if (selectedParadigmId && !selectedCustomMode) {
      const exists = paradigms.some((p) => p.id === selectedParadigmId);
      if (!exists) {
        if (paradigms.length > 0) {
          // Switch to first available paradigm
          setSelectedParadigmId(paradigms[0].id);
          setCustomParadigmText(paradigms[0].fullText);
        } else {
          // No paradigms left
          setSelectedParadigmId(null);
          setCustomParadigmText("");
          setIsParadigmEnabled(false);
        }
      }
    }
  }, [paradigms, selectedParadigmId, selectedCustomMode]);

  const activeParadigm = selectedParadigmId
    ? paradigms.find((p) => p.id === selectedParadigmId) || null
    : null;

  const handleSelectModel = (id: string) => {
    if (id === "custom") {
      setSelectedCustomMode(true);
      setSelectedParadigmId(null);
    } else {
      setSelectedCustomMode(false);
      setSelectedParadigmId(id);
      const found = paradigms.find((p) => p.id === id);
      if (found) {
        setCustomParadigmText(found.fullText);
      }
    }
  };

  const handleApplyMatch = (match: ParadigmMatchResult) => {
    setSelectedCustomMode(false);
    setSelectedParadigmId(match.paradigm.id);
    setCustomParadigmText(match.paradigm.fullText);
    setIsParadigmEnabled(true);
    setJustAppliedId(match.paradigm.id);
    setTimeout(() => setJustAppliedId(null), 3000);

    if (onApplySuggestedParadigm) {
      onApplySuggestedParadigm(match);
    }
  };

  const currentEffectiveText = selectedCustomMode
    ? customParadigmText
    : activeParadigm?.fullText || customParadigmText || "";

  // Is the suggested match already active?
  const isMatchCurrentlyActive = Boolean(
    isParadigmEnabled &&
    detectedMatch &&
    selectedParadigmId === detectedMatch.paradigm.id
  );

  // Helper for 96% threshold approximation styling (>= 96% Highly Recommended vs < 96% Suggest Not Linking)
  const getAffinityTierStyle = (score: number) => {
    const isRecommended = score >= 96;

    if (isRecommended) {
      return {
        isRecommended: true,
        label: "Altíssima Afinidade (Caso Idêntico • ≥96%)",
        recommendationBadge: "✓ Recomendado Vincular e Aplicar",
        badgeStyle: "bg-emerald-700 text-white border-emerald-800 shadow-xs font-black tracking-wide",
        containerStyle: "bg-gradient-to-r from-emerald-50 via-teal-50/90 to-amber-50/60 border-2 border-emerald-500 shadow-md ring-2 ring-emerald-400/20",
        headerTextStyle: "text-emerald-950 font-black",
        iconBoxStyle: "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300",
        icon: <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />,
        reasonBoxStyle: "bg-white/95 border-emerald-300 text-slate-800 shadow-2xs",
        keywordBadgeStyle: "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold",
        btnPrimaryStyle: "bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md hover:shadow-lg ring-2 ring-emerald-400/40 hover:scale-[1.01] active:scale-98",
        btnPrimaryText: "⚡ Vincular e Aplicar este Paradigma (Recomendado)",
        barColor: "bg-gradient-to-r from-emerald-500 to-teal-500",
        trackColor: "bg-emerald-200",
        adviceText: "Correspondência altíssima (≥96%) com caso idêntico julgado pelo Magistrado. Recomendado espelhar rigorosamente a redação, estilo e dispositivo deste modelo.",
      };
    }

    // Score < 96%: De-emphasize and suggest NOT linking
    return {
      isRecommended: false,
      label: `Afinidade de ${score}% (< 96%)`,
      recommendationBadge: "Sugestão: Não Vincular",
      badgeStyle: "bg-slate-200 text-slate-700 border-slate-300 font-bold",
      containerStyle: "bg-slate-50/90 border border-slate-200/90 shadow-2xs text-slate-600",
      headerTextStyle: "text-slate-700 font-bold",
      iconBoxStyle: "bg-slate-200 text-slate-600",
      icon: <AlertCircle className="w-4 h-4 text-slate-500" />,
      reasonBoxStyle: "bg-white border-slate-200 text-slate-700",
      keywordBadgeStyle: "bg-slate-100 text-slate-600 border-slate-200",
      btnPrimaryStyle: "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-none font-medium",
      btnPrimaryText: "Vincular Opcionalmente (Não Recomendado)",
      barColor: "bg-slate-400",
      trackColor: "bg-slate-200",
      adviceText: "Taxa de afinidade inferior a 96%. Sugere-se não vincular este paradigma para evitar divergências com as particularidades dos autos. A minuta será redigida diretamente pelas regras gerais do prompt.",
    };
  };

  const currentTier = detectedMatch ? getAffinityTierStyle(detectedMatch.confidenceScore) : null;

  return (
    <div
      id="tour-paradigm-selector"
      className={`rounded-xl border transition-all duration-200 ${
        isParadigmEnabled
          ? "bg-slate-50/80 border-slate-300 ring-1 ring-slate-400/40 shadow-xs"
          : "bg-slate-50/40 border-slate-200 hover:border-slate-300"
      } p-4 space-y-3`}
    >
      {/* Dynamic Multi-Tier Match Suggestion Banner (0% to 100%) */}
      {detectedMatch && currentTier && !isMatchCurrentlyActive && (
        <div className={`p-3.5 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200 space-y-2.5 ${currentTier.containerStyle}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${currentTier.iconBoxStyle}`}>
                {currentTier.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] uppercase tracking-wider ${currentTier.headerTextStyle}`}>
                    🎯 Análise Automática de Minutas Paradigmas:
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${currentTier.badgeStyle}`}>
                    {detectedMatch.confidenceScore}% • {currentTier.recommendationBadge}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5">
                  {detectedMatch.paradigm.title}
                </h5>
              </div>
            </div>

            {onDismissSuggestion && (
              <button
                type="button"
                onClick={onDismissSuggestion}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
                title="Dispensar sugestão"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Affinity Progress Meter */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 px-0.5">
              <span>Taxa de Aproximação / Afinidade Temática:</span>
              <span className="font-extrabold">{detectedMatch.confidenceScore}% {currentTier.isRecommended ? "(≥96% • Recomendado)" : "(<96% • Não recomendado)"}</span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${currentTier.trackColor}`}>
              <div
                className={`h-full transition-all duration-500 rounded-full ${currentTier.barColor}`}
                style={{ width: `${Math.max(detectedMatch.confidenceScore, 3)}%` }}
              />
            </div>
          </div>

          {/* Reason & Recommendation Advice Box */}
          <div className={`text-[11px] p-2.5 rounded-lg border space-y-1.5 ${currentTier.reasonBoxStyle}`}>
            <p className="font-medium">
              <strong className="text-slate-900">Diagnóstico:</strong> {detectedMatch.reason}
            </p>
            <p className={`text-[10.5px] ${currentTier.isRecommended ? "text-emerald-800 font-semibold" : "text-slate-500 italic"}`}>
              {currentTier.adviceText}
            </p>
            {detectedMatch.matchedKeywords.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-slate-500 font-semibold">Termos identificados:</span>
                {detectedMatch.matchedKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${currentTier.keywordBadgeStyle}`}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleApplyMatch(detectedMatch)}
                className={`px-3.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer ${currentTier.btnPrimaryStyle}`}
              >
                {currentTier.isRecommended ? (
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                ) : (
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{currentTier.btnPrimaryText}</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewModalParadigm(detectedMatch.paradigm)}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-slate-600" />
                <span>Ver Modelo</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenCabinetModal("modelos_paradigmas")}
                className="px-2.5 py-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-700 border border-slate-200 text-xs font-medium transition flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Biblioteca ({paradigms.length})</span>
              </button>
            </div>

            {/* Other matches if available */}
            {detectedMatches.length > 1 && (
              <div className="flex items-center gap-1 text-[10px] text-slate-600">
                <span className="font-semibold">Outros modelos:</span>
                {detectedMatches.slice(1, 4).map((m) => {
                  const isMRecommended = m.confidenceScore >= 96;
                  return (
                    <button
                      key={m.paradigm.id}
                      type="button"
                      onClick={() => handleApplyMatch(m)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition hover:underline cursor-pointer truncate max-w-[130px] ${
                        isMRecommended
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : "bg-white text-slate-700 border-slate-300"
                      }`}
                      title={`${m.paradigm.title} (${m.confidenceScore}% afinidade - ${isMRecommended ? "Recomendado" : "Não recomendado"})`}
                    >
                      {m.paradigm.category || m.paradigm.title} ({m.confidenceScore}%)
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header with Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
              isParadigmEnabled
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <Gavel className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Minuta Paradigma / Caso Idêntico do Juiz
              </h4>
              {isParadigmEnabled && (
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold tracking-wide uppercase">
                  Ativo no Prompt
                </span>
              )}
              {justAppliedId && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold animate-bounce flex items-center gap-1">
                  <Check className="w-3 h-3" /> Vinculado com Sucesso!
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Injeta no prompt um modelo paradigma <strong>para espelhar a redação em casos idênticos</strong> (uso sob demanda).
            </p>
          </div>
        </div>

        {/* Action Buttons & Switch */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => onOpenCabinetModal("modelos_paradigmas")}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 transition cursor-pointer flex items-center gap-1.5"
            title="Abrir Biblioteca Completa de Modelos Compartilhados do Gabinete"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-700" />
            <span className="hidden md:inline">Biblioteca do Juiz ({paradigms.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isParadigmEnabled;
              setIsParadigmEnabled(next);
              if (next && !selectedParadigmId && !selectedCustomMode && paradigms.length > 0) {
                // Auto select detected match if available, else first paradigm
                const targetId = detectedMatch?.paradigm?.id || paradigms[0].id;
                setSelectedParadigmId(targetId);
                const found = paradigms.find((p) => p.id === targetId);
                if (found) setCustomParadigmText(found.fullText);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
              isParadigmEnabled
                ? "bg-slate-900 hover:bg-slate-800 text-white"
                : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
            }`}
          >
            {isParadigmEnabled ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-400" />
                <span>Minuta Vinculada</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-400" />
                <span>Vincular Paradigma</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Controls when Enabled */}
      {isParadigmEnabled && (
        <div className="pt-2 border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
          {paradigms.length === 0 && !selectedCustomMode ? (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg text-center space-y-2">
              <p className="text-xs font-bold text-amber-900">
                Nenhum modelo paradigma cadastrado no momento.
              </p>
              <p className="text-[11px] text-amber-700">
                Você pode importar decisões em PDF na Biblioteca do Juiz ou colar um modelo personalizado.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenCabinetModal("importar_pdf")}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Importar Decisão em PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomMode(true);
                    setSelectedParadigmId(null);
                    setIsDetailsOpen(true);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Colar Minuta Manualmente
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Selector Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div className="md:col-span-8 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Selecione o Modelo Paradigma da Biblioteca do Juiz:
                  </label>
                  <select
                    value={selectedCustomMode ? "custom" : selectedParadigmId || ""}
                    onChange={(e) => handleSelectModel(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-slate-800 focus:border-slate-800 shadow-2xs"
                  >
                    {paradigms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.processNumber ? `(${p.processNumber})` : ""} [{p.category}]
                      </option>
                    ))}
                    <option value="custom">✏️ Inserir / Colar Minuta de Caso Idêntico Personalizada...</option>
                  </select>
                </div>

                <div className="md:col-span-4 flex items-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border shadow-2xs ${
                      isDetailsOpen
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white hover:bg-slate-50 text-slate-800 border-slate-300"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isDetailsOpen ? "Ocultar Texto" : "Ver / Editar Minuta"}</span>
                    {isDetailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Active Model Snapshot Card */}
              {activeParadigm && !selectedCustomMode && (
                <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                        {activeParadigm.category}
                      </span>
                      {activeParadigm.processNumber && (
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                          Autos: {activeParadigm.processNumber}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">
                        {activeParadigm.fullText.length.toLocaleString()} caracteres
                      </span>
                      {detectedMatch && detectedMatch.paradigm.id === activeParadigm.id && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Sugerido por IA ({detectedMatch.confidenceScore}%)
                        </span>
                      )}
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 truncate" title={activeParadigm.title}>
                      {activeParadigm.title}
                    </h5>
                    {activeParadigm.summary && (
                      <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                        {activeParadigm.summary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                      <Sparkles className="w-3 h-3 text-slate-700" />
                      Pronto para Injeção no Prompt
                    </span>
                  </div>
                </div>
              )}

              {/* Interactive Text Viewer / Editor */}
              {isDetailsOpen && (
                <div className="p-3.5 bg-white border border-slate-300 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <FileText className="w-4 h-4 text-slate-700" />
                      <span>
                        {selectedCustomMode
                          ? "Texto da Minuta Paradigma Personalizada:"
                          : `Texto Integral da Minuta Paradigma (${activeParadigm?.title || "Modelo"}):`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                      <span>{currentEffectiveText.length.toLocaleString()} caracteres</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentEffectiveText);
                        }}
                        className="text-xs text-slate-700 hover:text-slate-900 font-sans font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    value={selectedCustomMode ? customParadigmText : currentEffectiveText}
                    onChange={(e) => {
                      setCustomParadigmText(e.target.value);
                      if (!selectedCustomMode) {
                        setSelectedCustomMode(true);
                      }
                    }}
                    placeholder="Cole ou edite aqui a íntegra da minuta paradigma com relatório, fundamentação e dispositivo..."
                    className="w-full p-3 font-mono text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-slate-800 leading-relaxed shadow-2xs"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-600 gap-2">
                    <p className="flex items-center gap-1.5 text-slate-800 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        <strong>Clonagem Estrutural:</strong> A IA preservará a mesma divisão de tópicos, negritos, parágrafos e dispositivo do modelo, adaptando unicamente partes, valores e provas do novo processo.
                      </span>
                    </p>

                    {selectedCustomMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomMode(false);
                          if (paradigms.length > 0) {
                            setSelectedParadigmId(paradigms[0].id);
                            setCustomParadigmText(paradigms[0].fullText);
                          }
                        }}
                        className="text-slate-600 hover:text-slate-900 font-bold hover:underline cursor-pointer"
                      >
                        Voltar aos modelos salvos
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Preview Modal for Suggested Paradigm */}
      {previewModalParadigm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800">
                    {previewModalParadigm.category}
                  </span>
                  {previewModalParadigm.processNumber && (
                    <span className="text-[10px] font-mono text-slate-600">
                      Processo: {previewModalParadigm.processNumber}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{previewModalParadigm.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalParadigm(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {previewModalParadigm.summary && (
                <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 italic">
                  <strong>Ementa / Síntese:</strong> {previewModalParadigm.summary}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Texto Integral da Decisão / Sentença Paradigma:
                </label>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {previewModalParadigm.fullText}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewModalParadigm(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomMode(false);
                  setSelectedParadigmId(previewModalParadigm.id);
                  setCustomParadigmText(previewModalParadigm.fullText);
                  setIsParadigmEnabled(true);
                  setPreviewModalParadigm(null);
                  setJustAppliedId(previewModalParadigm.id);
                  setTimeout(() => setJustAppliedId(null), 3000);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Vincular e Aplicar este Paradigma</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
