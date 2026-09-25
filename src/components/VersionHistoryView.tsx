import React, { useState } from "react";
import { MinuteData, MinuteVersion } from "../types";
import { History, Bookmark, Sparkles, Check, Copy, Download, Printer, CheckCircle2, RotateCcw, MessageSquare, Edit3, Trash2, AlertTriangle } from "lucide-react";
import { copyMinuteToClipboard, exportMinuteToDocx, printFormattedMinute } from "../utils/documentExport";
import ReactMarkdown from "react-markdown";

interface VersionHistoryViewProps {
  currentMinute: MinuteData;
  originalMinute: MinuteData;
  versions: MinuteVersion[];
  onSelectActiveMinute: (minute: MinuteData, versionLabel: string) => void;
  onNavigateToCompare: () => void;
  onDeleteVersion?: (versionId: string) => void;
  onClearVersionHistory?: () => void;
}

export const VersionHistoryView: React.FC<VersionHistoryViewProps> = ({
  currentMinute,
  originalMinute,
  versions,
  onSelectActiveMinute,
  onNavigateToCompare,
  onDeleteVersion,
  onClearVersionHistory,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [versionToDelete, setVersionToDelete] = useState<MinuteVersion | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);

  // Normalize versions list: make sure 1st original model is always represented at v1
  const displayList: MinuteVersion[] = [...versions];
  if (displayList.length === 0) {
    displayList.push({
      id: "v-initial",
      versionNumber: 1,
      label: "1º Modelo Original (Gerado por IA)",
      timestamp: Date.now(),
      minute: originalMinute,
      source: "generation",
      author: "Assessor Judicial AI",
    });
  }

  const handleCopy = async (min: MinuteData, id: string) => {
    const ok = await copyMinuteToClipboard(min);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleConfirmDeleteVersion = () => {
    if (versionToDelete && onDeleteVersion) {
      onDeleteVersion(versionToDelete.id);
      setVersionToDelete(null);
    }
  };

  const handleConfirmClearAll = () => {
    if (onClearVersionHistory) {
      onClearVersionHistory();
      setIsConfirmingClearAll(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 relative">
      {/* Header bar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-900 dark:text-white">
              Histórico Cronológico de Versões ({displayList.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Todas as minutas geradas e refinadas permanecem arquivadas para consulta e restauração.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {onClearVersionHistory && displayList.length > 1 && (
            <button
              onClick={() => setIsConfirmingClearAll(true)}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 rounded-lg font-semibold text-xs flex items-center gap-1 transition cursor-pointer border border-rose-200 dark:border-rose-900"
              title="Excluir histórico de versões intermediárias e manter apenas a minuta atual"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Versões</span>
            </button>
          )}

          <button
            onClick={onNavigateToCompare}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Abrir Comparador Lado a Lado</span>
          </button>
        </div>
      </div>

      {/* Timeline items */}
      <div className="space-y-3">
        {displayList.map((ver, idx) => {
          const isOriginal = idx === 0 || ver.source === "generation";
          const isCurrentActive = JSON.stringify(ver.minute) === JSON.stringify(currentMinute);
          const canDelete = onDeleteVersion && displayList.length > 1;

          return (
            <div
              key={ver.id || `ver-${idx}`}
              className={`p-4 rounded-xl border transition-all ${
                isCurrentActive
                  ? "border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 shadow-xs"
                  : isOriginal
                  ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                    isCurrentActive
                      ? "bg-slate-900 text-white"
                      : isOriginal
                      ? "bg-amber-500 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  }`}>
                    {ver.versionNumber || idx + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {ver.label || `Versão ${idx + 1}`}
                      </span>

                      {isOriginal && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-800">
                          1º Modelo Original
                        </span>
                      )}

                      {isCurrentActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-900/60 text-slate-900 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-800">
                          Minuta Ativa no Visualizador
                        </span>
                      )}

                      <span className="text-[11px] text-slate-500 font-mono">
                        {ver.timestamp ? new Date(ver.timestamp).toLocaleString("pt-BR") : "Horário de criação"}
                      </span>
                    </div>

                    {ver.promptOrInstruction && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 italic flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-400" />
                        <span>Solicitação: "{ver.promptOrInstruction}"</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleCopy(ver.minute, ver.id)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition cursor-pointer"
                    title="Copiar texto desta versão"
                  >
                    {copiedId === ver.id ? <Check className="w-3 h-3 text-slate-900" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === ver.id ? "Copiado!" : "Copiar"}</span>
                  </button>

                  <button
                    onClick={() => exportMinuteToDocx(ver.minute)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Baixar DOCX desta versão"
                  >
                    <Download className="w-3 h-3" />
                    <span>DOCX</span>
                  </button>

                  <button
                    onClick={() => printFormattedMinute(ver.minute)}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Imprimir / PDF"
                  >
                    <Printer className="w-3 h-3" />
                    <span>PDF</span>
                  </button>

                  {!isCurrentActive && (
                    <button
                      onClick={() => onSelectActiveMinute(ver.minute, ver.label)}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                      title="Ativar esta versão como a minuta corrente no visualizador"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Restaurar / Ativar</span>
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => setVersionToDelete(ver)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      title="Excluir esta versão do histórico cronológico"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Preview excerpt */}
              <div className="mt-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 font-serif line-clamp-3">
                <strong>Dispositivo: </strong>
                <ReactMarkdown components={{ 
                  p: ({node, ...props}) => <span {...props} />,
                  ol: ({node, ...props}) => <span {...props} />,
                  ul: ({node, ...props}) => <span {...props} />,
                  li: ({node, ...props}) => <span className="mr-1" {...props} />
                }}>
                  {ver.minute.dispositivo || ver.minute.fundamentacao?.slice(0, 200) || "Sem texto de dispositivo."}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}
      </div>

      {/* In-Modal Confirmation for Deleting Single Version */}
      {versionToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-80 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Excluir esta Versão?</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Deseja remover a versão <strong>"{versionToDelete.label}"</strong> do histórico cronológico desta minuta?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setVersionToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteVersion}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Modal Confirmation for Clearing All Versions */}
      {isConfirmingClearAll && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-80 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Limpar Histórico de Versões?</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Esta ação removerá todas as versões intermediárias e manterá apenas a minuta ativa atual.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsConfirmingClearAll(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Limpar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

