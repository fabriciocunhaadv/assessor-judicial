import React, { useState } from "react";
import { MinuteData, MinuteVersion } from "../types";
import { Copy, Check, Download, Printer, CheckCircle2, ArrowLeftRight, Sparkles, Bookmark, RotateCcw } from "lucide-react";
import { copyMinuteToClipboard, exportMinuteToDocx, printFormattedMinute } from "../utils/documentExport";
import ReactMarkdown from "react-markdown";

interface VersionCompareViewProps {
  currentMinute: MinuteData;
  originalMinute: MinuteData;
  versions: MinuteVersion[];
  onSelectActiveMinute: (minute: MinuteData, versionLabel: string) => void;
}

export const VersionCompareView: React.FC<VersionCompareViewProps> = ({
  currentMinute,
  originalMinute,
  versions,
  onSelectActiveMinute,
}) => {
  // Setup available versions
  const allVersions: { id: string; label: string; date: string; minute: MinuteData; tag: string }[] = [];

  // Always include 1st original model
  allVersions.push({
    id: "original",
    label: "1º Modelo Original (Base)",
    date: versions[0]?.timestamp ? new Date(versions[0].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Inicial",
    minute: originalMinute,
    tag: "Original Intocado",
  });

  // Include version history
  versions.forEach((v, idx) => {
    if (idx === 0) return; // already in original
    allVersions.push({
      id: v.id,
      label: v.label || `Versão ${v.versionNumber}`,
      date: new Date(v.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      minute: v.minute,
      tag: v.source === "chat" ? "Refino do Chat" : v.source === "editor" ? "Edição Manual" : "Versão Salva",
    });
  });

  // Also include active if not in list
  const isCurrentInList = allVersions.some(
    v => JSON.stringify(v.minute) === JSON.stringify(currentMinute)
  );
  if (!isCurrentInList) {
    allVersions.push({
      id: "current-active",
      label: "Minuta Atual (Em Edição/Ativa)",
      date: "Agora",
      minute: currentMinute,
      tag: "Minuta Ativa",
    });
  }

  const [leftVersionId, setLeftVersionId] = useState<string>("original");
  const [rightVersionId, setRightVersionId] = useState<string>(
    allVersions.length > 1 ? allVersions[allVersions.length - 1].id : "original"
  );

  const [copiedLeft, setCopiedLeft] = useState(false);
  const [copiedRight, setCopiedRight] = useState(false);

  const leftItem = allVersions.find(v => v.id === leftVersionId) || allVersions[0];
  const rightItem = allVersions.find(v => v.id === rightVersionId) || allVersions[allVersions.length - 1];

  const handleCopyLeft = async () => {
    const success = await copyMinuteToClipboard(leftItem.minute);
    if (success) {
      setCopiedLeft(true);
      setTimeout(() => setCopiedLeft(false), 2500);
    }
  };

  const handleCopyRight = async () => {
    const success = await copyMinuteToClipboard(rightItem.minute);
    if (success) {
      setCopiedRight(true);
      setTimeout(() => setCopiedRight(false), 2500);
    }
  };

  const handleSwap = () => {
    setLeftVersionId(rightVersionId);
    setRightVersionId(leftVersionId);
  };

  const isRelatorioDifferent = leftItem.minute.relatorio !== rightItem.minute.relatorio;
  const isFundamentacaoDifferent = leftItem.minute.fundamentacao !== rightItem.minute.fundamentacao;
  const isDispositivoDifferent = leftItem.minute.dispositivo !== rightItem.minute.dispositivo;
  const isTitleDifferent = leftItem.minute.title !== rightItem.minute.title;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Controls: Selectors & Actions */}
      <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left selector */}
        <div className="flex-1 w-full space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5" />
            <span>Versão da Esquerda (Comparativo A)</span>
          </label>
          <select
            value={leftVersionId}
            onChange={(e) => setLeftVersionId(e.target.value)}
            className="w-full p-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
          >
            {allVersions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} ({v.tag} - {v.date})
              </option>
            ))}
          </select>
        </div>

        {/* Swap button */}
        <button
          onClick={handleSwap}
          className="p-2 bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-full transition shadow-xs text-slate-700 dark:text-slate-200 shrink-0"
          title="Inverter lados de comparação"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>

        {/* Right selector */}
        <div className="flex-1 w-full space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Versão da Direita (Comparativo B)</span>
          </label>
          <select
            value={rightVersionId}
            onChange={(e) => setRightVersionId(e.target.value)}
            className="w-full p-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-slate-800"
          >
            {allVersions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} ({v.tag} - {v.date})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Difference Summary Badges */}
      <div className="flex items-center gap-2 flex-wrap text-xs px-1">
        <span className="font-bold text-slate-600 dark:text-slate-400">Diagnóstico de Diferenças:</span>
        <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
          isTitleDifferent ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-100 text-slate-600"
        }`}>
          Título: {isTitleDifferent ? "Alterado" : "Idêntico"}
        </span>
        <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
          isRelatorioDifferent ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-100 text-slate-600"
        }`}>
          Relatório: {isRelatorioDifferent ? "Alterado" : "Idêntico"}
        </span>
        <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
          isFundamentacaoDifferent ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-100 text-slate-600"
        }`}>
          Fundamentação: {isFundamentacaoDifferent ? "Alterado" : "Idêntico"}
        </span>
        <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
          isDispositivoDifferent ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-100 text-slate-600"
        }`}>
          Dispositivo: {isDispositivoDifferent ? "Alterado" : "Idêntico"}
        </span>
      </div>

      {/* Side-by-Side Comparison Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        
        {/* LEFT COLUMN */}
        <div className="border border-amber-300 dark:border-amber-900/60 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-amber-950 dark:text-amber-200">{leftItem.label}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-200/80 text-amber-900 font-semibold">{leftItem.tag}</span>
              </div>
              <p className="text-[11px] text-slate-500">Horário: {leftItem.date}</p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyLeft}
                className="px-2 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded text-xs font-semibold text-amber-950 flex items-center gap-1 transition"
                title="Copiar texto integral deste lado"
              >
                {copiedLeft ? <Check className="w-3 h-3 text-slate-900" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLeft ? "Copiado!" : "Copiar"}</span>
              </button>

              <button
                onClick={() => exportMinuteToDocx(leftItem.minute)}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                title="Baixar DOCX deste lado"
              >
                <Download className="w-3 h-3" />
                <span>DOCX</span>
              </button>

              <button
                onClick={() => onSelectActiveMinute(leftItem.minute, leftItem.label)}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold flex items-center gap-1 transition"
                title="Tornar esta versão a minuta ativa no visualizador"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Usar Esta</span>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4 text-xs font-serif leading-relaxed text-slate-800 dark:text-slate-200 max-h-[500px] overflow-y-auto select-text">
            <div className="text-center font-sans font-bold border-b pb-2">
              <p className="text-[10px] text-slate-500 uppercase">{leftItem.minute.header}</p>
              <p className={`text-xs font-bold uppercase ${isTitleDifferent ? "bg-amber-100 dark:bg-amber-950/60 p-1 rounded" : ""}`}>
                {leftItem.minute.title}
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-sans font-bold text-[10px] uppercase text-slate-700 dark:text-slate-300 border-b pb-0.5 flex items-center justify-between">
                <span>I - RELATÓRIO</span>
                {isRelatorioDifferent && <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded">Diferente</span>}
              </p>
              <div className={isRelatorioDifferent ? "bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded border-l-2 border-amber-400" : ""}>
                {(leftItem.minute.relatorio || "Dispensado o relatório.")
                  .split("\n\n")
                  .map((p, i) => (
                    <div key={i} className="text-justify indent-4 leading-relaxed mb-2"><ReactMarkdown components={{ p: ({node, ...props}) => <span className="block mb-2" {...props} /> }}>{p}</ReactMarkdown></div>
                  ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-sans font-bold text-[10px] uppercase text-slate-700 dark:text-slate-300 border-b pb-0.5 flex items-center justify-between">
                <span>II - FUNDAMENTAÇÃO</span>
                {isFundamentacaoDifferent && <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded">Diferente</span>}
              </p>
              <div className={isFundamentacaoDifferent ? "bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded border-l-2 border-amber-400" : ""}>
                {(leftItem.minute.fundamentacao || "Fundamentação jurídica nos autos.")
                  .split("\n\n")
                  .map((p, i) => (
                    <div key={i} className="text-justify indent-4 leading-relaxed mb-2"><ReactMarkdown components={{ p: ({node, ...props}) => <span className="block mb-2" {...props} /> }}>{p}</ReactMarkdown></div>
                  ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-sans font-bold text-[10px] uppercase text-slate-700 dark:text-slate-300 border-b pb-0.5 flex items-center justify-between">
                <span>III - DISPOSITIVO</span>
                {isDispositivoDifferent && <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded">Diferente</span>}
              </p>
              <div className={isDispositivoDifferent ? "bg-amber-50/60 dark:bg-amber-950/30 p-2 rounded border-l-2 border-amber-500 font-medium" : "font-medium"}>
                {(leftItem.minute.dispositivo || "Dispositivo do ato.")
                  .split("\n\n")
                  .map((p, i) => (
                    <div key={i} className="text-justify indent-4 leading-relaxed mb-2"><ReactMarkdown components={{ p: ({node, ...props}) => <span className="block mb-2" {...props} /> }}>{p}</ReactMarkdown></div>
                  ))}
              </div>
            </div>

            <div className="text-center font-sans text-[10px] text-slate-500 pt-2 border-t">
              {leftItem.minute.closing}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="border border-slate-300 dark:border-slate-900/60 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="p-3 bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-900/50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-200">{rightItem.label}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200/80 text-slate-900 font-semibold">{rightItem.tag}</span>
              </div>
              <p className="text-[11px] text-slate-500">Horário: {rightItem.date}</p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyRight}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-xs font-semibold text-slate-900 flex items-center gap-1 transition"
                title="Copiar texto integral deste lado"
              >
                {copiedRight ? <Check className="w-3 h-3 text-slate-900" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRight ? "Copiado!" : "Copiar"}</span>
              </button>

              <button
                onClick={() => exportMinuteToDocx(rightItem.minute)}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                title="Baixar DOCX deste lado"
              >
                <Download className="w-3 h-3" />
                <span>DOCX</span>
              </button>

              <button
                onClick={() => onSelectActiveMinute(rightItem.minute, rightItem.label)}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold flex items-center gap-1 transition"
                title="Tornar esta versão a minuta ativa no visualizador"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Usar Esta</span>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4 text-xs font-serif leading-relaxed text-slate-800 dark:text-slate-200 max-h-[500px] overflow-y-auto select-text">
            <div className="text-center font-sans font-bold border-b pb-2">
              <p className="text-[10px] text-slate-500 uppercase">{rightItem.minute.header}</p>
              <p className={`text-xs font-bold uppercase ${isTitleDifferent ? "bg-slate-100 dark:bg-slate-900/60 p-1 rounded" : ""}`}>
                {rightItem.minute.title}
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-sans font-bold text-[10px] uppercase text-slate-700 dark:text-slate-300 border-b pb-0.5 flex items-center justify-between">
                <span>I - RELATÓRIO</span>
                {isRelatorioDifferent && <span className="text-[9px] text-slate-700 bg-slate-100 px-1 rounded">Diferente</span>}
              </p>
              <div className={isRelatorioDifferent ? "bg-slate-50/50 dark:bg-slate-900/20 p-2 rounded border-l-2 border-slate-400" : ""}>
                {(rightItem.minute.relatorio || "Dispensado o relatório.")
                  .split("\n\n")
                  .map((p, i) => (
                    <div key={i} className="text-justify indent-4 leading-relaxed mb-2"><ReactMarkdown components={{ p: ({node, ...props}) => <span className="block mb-2" {...props} /> }}>{p}</ReactMarkdown></div>
                  ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-sans font-bold text-[10px] uppercase text-slate-700 dark:text-slate-300 border-b pb-0.5 flex items-center justify-between">
                <span>II - FUNDAMENTAÇÃO</span>
                {isFundamentacaoDifferent && <span className="text-[9px] text-slate-700 bg-slate-100 px-1 rounded">Diferente</span>}
              </p>
              <div className={isFundamentacaoDifferent ? "bg-slate-50/50 dark:bg-slate-900/20 p-2 rounded border-l-2 border-slate-400" : ""}>
                {(rightItem.minute.fundamentacao || "Fundamentação jurídica nos autos.")
                  .split("\n\n")
                  .map((p, i) => (
                    <div key={i} className="text-justify indent-4 leading-relaxed mb-2"><ReactMarkdown components={{ p: ({node, ...props}) => <span className="block mb-2" {...props} /> }}>{p}</ReactMarkdown></div>
                  ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-sans font-bold text-[10px] uppercase text-slate-700 dark:text-slate-300 border-b pb-0.5 flex items-center justify-between">
                <span>III - DISPOSITIVO</span>
                {isDispositivoDifferent && <span className="text-[9px] text-slate-700 bg-slate-100 px-1 rounded">Diferente</span>}
              </p>
              <div className={isDispositivoDifferent ? "bg-slate-50/60 dark:bg-slate-900/30 p-2 rounded border-l-2 border-slate-800 font-medium" : "font-medium"}>
                {(rightItem.minute.dispositivo || "Dispositivo do ato.")
                  .split("\n\n")
                  .map((p, i) => (
                    <div key={i} className="text-justify indent-4 leading-relaxed mb-2"><ReactMarkdown components={{ p: ({node, ...props}) => <span className="block mb-2" {...props} /> }}>{p}</ReactMarkdown></div>
                  ))}
              </div>
            </div>

            <div className="text-center font-sans text-[10px] text-slate-500 pt-2 border-t">
              {rightItem.minute.closing}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
