import React, { useState } from "react";
import ReactMarkdown from 'react-markdown';
import {
  X,
  Scale,
  Calendar,
  Clock,
  User,
  ArrowRight,
  FileText,
  MessageSquare,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronRight,
  Eye,
  Hash,
  BookOpen,
  ArrowUpRight,
  Copy,
  Check,
  AlertTriangle,
  Tag,
} from "lucide-react";
import { ProcessDossier, SavedAnalysis, MinuteData } from "../types";
import { auth } from "../lib/firebase";
import { detectPromptCategory } from "../utils/promptCategoryHelper";

interface ProcessTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossier: ProcessDossier | null;
  onLoadAnalysis: (analysis: SavedAnalysis) => void;
  onDeleteAnalysis: (analysis: SavedAnalysis) => void;
  onDeleteDossier?: (dossier: ProcessDossier) => void;
  isAdmin?: boolean;
}

export const ProcessTimelineModal: React.FC<ProcessTimelineModalProps> = ({
  isOpen,
  onClose,
  dossier,
  onLoadAnalysis,
  onDeleteAnalysis,
  onDeleteDossier,
  isAdmin = false,
}) => {
  const [selectedPreviewAct, setSelectedPreviewAct] = useState<SavedAnalysis | null>(null);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState(false);
  const [actToDelete, setActToDelete] = useState<SavedAnalysis | null>(null);

  if (!isOpen || !dossier) return null;

  const currentUid = auth.currentUser?.uid;
  const canDeleteDossier = true; // Always allow deleting the dossier evolution

  const handleCopyProcessNumber = () => {
    navigator.clipboard.writeText(dossier.processNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleConfirmDeleteAll = () => {
    setIsConfirmingDeleteAll(false);
    if (onDeleteDossier) {
      onDeleteDossier(dossier);
      onClose();
    } else {
      // Fallback: delete each analysis
      dossier.analyses.forEach((a) => onDeleteAnalysis(a));
      onClose();
    }
  };

  const handleConfirmDeleteAct = () => {
    if (actToDelete) {
      onDeleteAnalysis(actToDelete);
      setActToDelete(null);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-4xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border-0 sm:border border-slate-200 relative">
        
        {/* Header with Dossier Title & Badge */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
                  <Hash className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[130px] sm:max-w-none">{dossier.processNumber}</span>
                </span>
                <button
                  onClick={handleCopyProcessNumber}
                  className="text-slate-400 hover:text-white transition cursor-pointer p-0.5"
                  title="Copiar número do processo"
                >
                  {copiedNumber ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {dossier.totalActs} {dossier.totalActs === 1 ? "Ato" : "Atos"}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate max-w-[200px] sm:max-w-md">
                {dossier.parties?.author || "Parte Autora"} <span className="text-indigo-300 font-semibold">vs</span> {dossier.parties?.defendant || "Parte Ré"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {canDeleteDossier && (
              <button
                onClick={() => setIsConfirmingDeleteAll(true)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-400/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Excluir toda a evolução cronológica dos atos vinculados deste processo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Excluir Toda a Evolução</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Fechar linha do tempo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informative Sub-header Banner */}
        <div className="px-3.5 sm:px-6 py-2 bg-indigo-50/90 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-900 shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[11px] sm:text-xs line-clamp-1">
              <strong>Linha do Tempo:</strong> Atos concatenados deste processo.
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-indigo-700 font-mono font-medium hidden sm:inline">
            1º Ato: {new Date(dossier.firstDate).toLocaleDateString("pt-BR")}
          </span>
        </div>

        {/* Content Body: Timeline List & Preview Split (if act preview is selected) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50/60">
          
          <div className="space-y-6">
            {dossier.analyses.map((act, index) => {
              const actNumber = index + 1;
              const isLast = index === dossier.analyses.length - 1;
              const actTitle = act.result?.minute?.title || act.promptTitle || `Ato Judicial #${actNumber}`;
              const isMine = currentUid && act.createdBy === currentUid;
              const canDelete = true;
              const dateStr = new Date(act.date).toLocaleDateString("pt-BR");
              const timeStr = new Date(act.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const paradigmUsed = act.result?.paradigmUsed;
              const hasChat = act.chatMessages && act.chatMessages.length > 0;
              const hasVersions = (act.versions && act.versions.length > 1) || (act.result?.versions && act.result.versions.length > 1);

              return (
                <div key={act.id} className="relative flex items-start gap-2.5 sm:gap-4 group">
                  
                  {/* Left Column: Number Badge & Vertical Connecting Line */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-bold text-xs flex items-center justify-center shadow-xs border transition ${
                      isLast
                        ? "bg-indigo-600 text-white border-indigo-700 ring-4 ring-indigo-100"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}>
                      {actNumber}
                    </div>
                    {!isLast && (
                      <div className="w-0.5 h-full min-h-[60px] sm:min-h-[70px] bg-slate-300 mt-2"></div>
                    )}
                  </div>

                  {/* Right Card: Act Details */}
                  <div className="flex-1 bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-md transition min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="px-2 sm:px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono text-xs font-bold">
                            {actTitle}
                          </span>
                          {(() => {
                            const cat = detectPromptCategory(act);
                            return (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${cat.badgeColor}`}>
                                <Tag className="w-2.5 h-2.5" />
                                <span>{cat.label}</span>
                              </span>
                            );
                          })()}
                          {isLast && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wide">
                              Último Ato Elaborado
                            </span>
                          )}
                          {paradigmUsed && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold flex items-center gap-1">
                              <Scale className="w-3 h-3 text-amber-700" />
                              <span>{paradigmUsed.title}</span>
                            </span>
                          )}
                          {hasChat && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-slate-500" />
                              <span>Chat ({act.chatMessages?.length})</span>
                            </span>
                          )}
                          {hasVersions && (
                            <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                              Versões Salvas
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1.5 line-clamp-2">
                          {act.promptTitle}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-500 shrink-0">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dateStr} às {timeStr}</span>
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => setActToDelete(act)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs"
                            title="Excluir este ato individual da evolução cronológica"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] hidden md:inline">Excluir Ato</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Excerpt of Relatorio & Fundamentacao */}
                    <div className="py-2.5 sm:py-3 text-xs text-slate-600 space-y-1.5 font-sans leading-relaxed">
                      {act.result?.minute?.fundamentacao && (
                        <p className="line-clamp-2 text-slate-600 italic bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-100 text-[11px] sm:text-xs">
                          <strong className="text-slate-800 not-italic font-semibold">Síntese dos Fundamentos: </strong>
                          {act.result.minute.fundamentacao.replace(/\n+/g, " ").slice(0, 240)}...
                        </p>
                      )}
                    </div>

                    {/* Footer Actions of the Act Card */}
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Elaborado por: <strong>{act.creatorName || "Assessor"}</strong></span>
                        {isMine && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1 rounded font-bold shrink-0">
                            Você
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPreviewAct(selectedPreviewAct?.id === act.id ? null : act)}
                          className="flex-1 sm:flex-initial justify-center px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>{selectedPreviewAct?.id === act.id ? "Ocultar Prévia" : "Prévia Rápida"}</span>
                        </button>

                        <button
                          onClick={() => {
                            onLoadAnalysis(act);
                            onClose();
                          }}
                          className="flex-1 sm:flex-initial justify-center px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer whitespace-nowrap"
                        >
                          <span>Carregar no Editor</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Inline Preview Accordion */}
                    {selectedPreviewAct?.id === act.id && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono max-h-72 overflow-y-auto border border-slate-800 space-y-3 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                          <span>Texto Integral Formatado da Minuta</span>
                          <span>{act.result?.minute?.fullFormattedText?.length || 0} caracteres</span>
                        </div>
                        <div className="leading-relaxed text-[11px] text-slate-300 markdown-body bg-transparent" style={{'--color-fg-default': '#cbd5e1'} as React.CSSProperties}>
                          <ReactMarkdown>{act.result?.minute?.fullFormattedText || "Sem texto formatado."}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <span className="text-[11px] sm:text-xs text-slate-500">
              Dossiê: <strong>{dossier.totalActs}</strong> minuta(s) vinculada(s).
            </span>
            {canDeleteDossier && (
              <button
                onClick={() => setIsConfirmingDeleteAll(true)}
                className="text-rose-600 hover:text-rose-800 text-[11px] sm:text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"
                title="Excluir todos os atos vinculados a este processo"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir Todos</span>
              </button>
            )}
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              onClick={() => {
                const latestAct = dossier.analyses[dossier.analyses.length - 1];
                if (latestAct) {
                  onLoadAnalysis(latestAct);
                  onClose();
                }
              }}
              className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <span>Carregar Última Minuta (Ato #{dossier.totalActs})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* In-Modal Confirmation for Deleting Single Act */}
        {actToDelete && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-80 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Excluir este Ato da Linha do Tempo?</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Deseja remover o ato <strong>"{actToDelete.result?.minute?.title || actToDelete.promptTitle}"</strong> da evolução cronológica do processo <strong>{dossier.processNumber}</strong>?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setActToDelete(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDeleteAct}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sim, Excluir Ato</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* In-Modal Confirmation for Deleting Entire Chronological Evolution */}
        {isConfirmingDeleteAll && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-80 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Excluir Toda a Evolução Cronológica?</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Esta ação excluirá definitivamente <strong>todos os {dossier.totalActs} ato(s) vinculados</strong> ao processo <strong>{dossier.processNumber}</strong> do banco de dados.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setIsConfirmingDeleteAll(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDeleteAll}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sim, Excluir Toda a Evolução</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

