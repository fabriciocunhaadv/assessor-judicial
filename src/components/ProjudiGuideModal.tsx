import React, { useState, useEffect } from "react";
import {
  X,
  FileSpreadsheet,
  Save,
  RotateCcw,
  CheckCircle2,
  Plus,
  BookOpen,
  Copy,
  Check,
  Download,
  AlertCircle,
  Search,
  HelpCircle,
  ExternalLink,
  ClipboardList
} from "lucide-react";
import { ProjudiGuideData } from "../types";
import { saveProjudiGuide, resetProjudiGuide } from "../utils/projudiGuideDb";
import { useAuth } from "../lib/AuthContext";

interface ProjudiGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  guideData: ProjudiGuideData;
  onGuideUpdated: (data: ProjudiGuideData) => void;
}

export const ProjudiGuideModal: React.FC<ProjudiGuideModalProps> = ({
  isOpen,
  onClose,
  guideData,
  onGuideUpdated,
}) => {
  const { isAdmin } = useAuth();
  const [text, setText] = useState(guideData.text || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setText(guideData.text || "");
      setSaveSuccess(false);
      setSearchQuery("");
    }
  }, [isOpen, guideData]);

  if (!isOpen) return null;

  // Count estimated number of topics
  const detectedTopics = (text.match(/^\s*\d+\.\s+[^\n]+/gm) || []).length;
  const detectedSubtopics = (text.match(/^\s*\d+\.\d+\.\s+[^\n]+/gm) || []).length;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await saveProjudiGuide({
        text,
        title: "Guia Rápido de Lançamentos no PROJUDI",
      });
      onGuideUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar guia PROJUDI:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      const defaultData = await resetProjudiGuide();
      setText(defaultData.text);
      onGuideUpdated(defaultData);
      setShowConfirmReset(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao restaurar guia PROJUDI:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertTemplate = () => {
    const nextNumber = detectedTopics > 0 ? detectedTopics + 1 : 1;
    const templateBlock = `\n\n${nextNumber}. [NOVO TIPO DE ATO / MATÉRIA DO GABINETE]
--------------------------------------------------------------------------------
${nextNumber}.1. [Situação Fática ou Procedimento]
   - Tipo de Ato: [Sentença / Decisão Interlocutória / Despacho]
   - Movimentação no PROJUDI: "[Nome exato da movimentação]"
   - Pendência de Gabinete / Fila: "[Fila ou pendência a ser marcada]"
   - Prazo / Destino: "[Cartório - Prazo 15 dias / Conclusos / Cumprimento]"
   - Cuidados e Observações: [Orientações específicas do magistrado ou secretaria].
`;
    setText((prev) => prev.trimEnd() + templateBlock);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTxt = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guia_lancamentos_projudi_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="projudi-guide-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="projudi-guide-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-slate-50 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-xs">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Guia Rápido de Lançamentos no PROJUDI
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
                  Manual do Gabinete
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Instruções para assessores, estagiários e servidores sobre qual pendência e movimentação selecionar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-close-projudi-guide-modal"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Information & Actions Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              <strong>{detectedTopics}</strong> seções principais
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>
              <strong>{detectedSubtopics}</strong> pendências detalhadas
            </span>
            {guideData.updatedAt && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Atualizado em: {new Date(guideData.updatedAt).toLocaleDateString("pt-BR")} às {new Date(guideData.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <button
                id="btn-insert-projudi-template"
                onClick={handleInsertTemplate}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700 transition-colors cursor-pointer"
                title="Inserir modelo de novo lançamento de pendência"
              >
                <Plus className="w-3.5 h-3.5" />
                Inserir Lançamento
              </button>
            )}

            <button
              id="btn-copy-projudi-guide"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Copiar texto completo do guia"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-slate-800" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>

            <button
              id="btn-export-projudi-txt"
              onClick={handleExportTxt}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Baixar em formato TXT"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar TXT
            </button>
          </div>
        </div>

        {/* Editor & Viewer Area */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col min-h-0">
          <div className="mb-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Instruções do Gabinete:</strong> Este caderno pode ser consultado a qualquer momento por assessores e estagiários para sanar dúvidas de cadastramento. {isAdmin ? "Como administrador, você pode redigir, editar, adicionar ou excluir qualquer orientação abaixo." : "O texto abaixo é mantido atualizado pela administração do gabinete."}
            </div>
          </div>

          <div className="relative flex-1 flex flex-col">
            <textarea
              id="textarea-projudi-guide"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!isAdmin}
              placeholder={isAdmin ? "Digite ou cole aqui as orientações de pendências e lançamentos do PROJUDI..." : "Você não tem permissão de administrador para editar o guia."}
              className={`w-full flex-1 min-h-[380px] p-4 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none leading-relaxed resize-none shadow-inner ${!isAdmin ? "opacity-90 bg-white dark:bg-slate-900" : ""}`}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                {showConfirmReset ? (
                  <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-lg border border-rose-200 dark:border-rose-800">
                    <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                      Restaurar guia padrão do PROJUDI?
                    </span>
                    <button
                      id="btn-confirm-reset-projudi"
                      onClick={handleReset}
                      disabled={isSaving}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold cursor-pointer"
                    >
                      Sim, Restaurar
                    </button>
                    <button
                      onClick={() => setShowConfirmReset(false)}
                      className="px-2 py-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-request-reset-projudi"
                    onClick={() => setShowConfirmReset(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Restaurar o modelo padrão do Guia PROJUDI"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar Padrão
                  </button>
                )}
              </>
            )}

            {saveSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-slate-900 dark:text-slate-400 font-semibold animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvo e sincronizado no banco do gabinete!</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-cancel-projudi-guide-modal"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {isAdmin && (
              <button
                id="btn-save-projudi-guide"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Salvando..." : "Salvar Guia PROJUDI"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
