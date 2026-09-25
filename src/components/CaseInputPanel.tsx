import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  ChevronDown,
  FolderOpen,
  ArrowRight,
  AlertCircle,
  Sliders,
  FileUp,
} from "lucide-react";
import { ProceduralPhase, ActType, ProcessInfo, SampleCase, UploadedPdf } from "../types";
import { SAMPLE_CASES } from "../data/sampleCases";
import { PdfUploadZone } from "./PdfUploadZone";

interface CaseInputPanelProps {
  inputMode: "pdf" | "text";
  setInputMode: (mode: "pdf" | "text") => void;
  pdfFiles: UploadedPdf[];
  onAddPdf: (pdf: UploadedPdf) => void;
  onRemovePdf: (id: string) => void;
  onClearPdfs: () => void;
  processText: string;
  setProcessText: (text: string) => void;
  proceduralPhase: ProceduralPhase;
  setProceduralPhase: (phase: ProceduralPhase) => void;
  actType: ActType;
  setActType: (act: ActType) => void;
  actSubtype: string;
  setActSubtype: (subtype: string) => void;
  processInfo: ProcessInfo;
  setProcessInfo: React.Dispatch<React.SetStateAction<ProcessInfo>>;
  specificInstructions: string;
  setSpecificInstructions: (text: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export const CaseInputPanel: React.FC<CaseInputPanelProps> = ({
  inputMode,
  setInputMode,
  pdfFiles,
  onAddPdf,
  onRemovePdf,
  onClearPdfs,
  processText,
  setProcessText,
  proceduralPhase,
  setProceduralPhase,
  actType,
  setActType,
  actSubtype,
  setActSubtype,
  processInfo,
  setProcessInfo,
  specificInstructions,
  setSpecificInstructions,
  onGenerate,
  isLoading,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [showMetadataFields, setShowMetadataFields] = useState<boolean>(false);

  const handleSelectPresetCase = (caseItem: SampleCase) => {
    setSelectedCaseId(caseItem.id);
    setProcessText(caseItem.processText);
    setProceduralPhase(caseItem.phase);
    setActType(caseItem.actType);
    setActSubtype(caseItem.actSubtype);
    if (caseItem.specificInstructions) {
      setSpecificInstructions(caseItem.specificInstructions);
    }
    if (caseItem.processInfo) {
      setProcessInfo((prev) => ({
        ...prev,
        ...caseItem.processInfo,
      }));
    }
  };

  const hasContentToAnalyze =
    inputMode === "pdf" ? pdfFiles.length > 0 : processText.trim().length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-5">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center p-1 bg-emerald-100 rounded-xl border border-slate-200">
        <button
          onClick={() => setInputMode("pdf")}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            inputMode === "pdf"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileUp className={`w-4 h-4 ${inputMode === "pdf" ? "text-emerald-600" : "text-slate-400"}`} />
          <span>Inserir PDF do Processo</span>
          {pdfFiles.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
              {pdfFiles.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setInputMode("text")}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            inputMode === "text"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className={`w-4 h-4 ${inputMode === "text" ? "text-emerald-600" : "text-slate-400"}`} />
          <span>Texto / Casos Modelo Projudi</span>
        </button>
      </div>

      {/* Mode 1: PDF Upload Mode */}
      {inputMode === "pdf" && (
        <div className="space-y-4">
          <PdfUploadZone
            pdfFiles={pdfFiles}
            onAddPdf={onAddPdf}
            onRemovePdf={onRemovePdf}
            onClearAll={onClearPdfs}
          />
        </div>
      )}

      {/* Mode 2: Text / Presets Mode */}
      {inputMode === "text" && (
        <div className="space-y-4">
          {/* Top Banner: Quick Preset Cases */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
                Casos Processuais e Protocolos TJGO Pré-configurados:
              </label>
              <span className="text-[11px] text-emerald-500">8 cenários oficiais de teste</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {SAMPLE_CASES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectPresetCase(c)}
                  className={`p-2.5 rounded-lg text-left text-xs transition border cursor-pointer flex flex-col justify-between ${
                    selectedCaseId === c.id
                      ? "bg-slate-50/80 border-emerald-500 text-slate-900 ring-1 ring-emerald-500 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-100 hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold line-clamp-1 mb-1">{c.title}</div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-medium">
                      {c.badge}
                    </span>
                    <span className="text-[10px] text-emerald-500 uppercase font-mono">
                      {c.actType}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Process Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                Texto dos Autos Processuais (Eventos Projudi, Certidões e Provas):
              </label>
            </div>

            <textarea
              rows={8}
              value={processText}
              onChange={(e) => {
                setProcessText(e.target.value);
                setSelectedCaseId("");
              }}
              placeholder="Cole aqui o relatório dos autos, petições, eventos do Projudi/PJe, certidões de audiência, atestados médicos, extratos do SISBAJUD/RENAJUD e manifestações das partes..."
              className="w-full p-3.5 text-xs text-slate-900 font-mono bg-slate-50/70 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white resize-y leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* Tipo de Ato (Common to both modes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-emerald-100 text-xs">
        <div>
          <label className="block font-bold text-slate-800 mb-1">
            Espécie de Ato Judicial:
          </label>
          <select
            value={actType}
            onChange={(e) => setActType(e.target.value as ActType)}
            className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="sentenca">Sentença (Extinção c/ ou s/ mérito)</option>
            <option value="decisao">Decisão Interlocutória (Tutela, Embargos, Penhora)</option>
            <option value="despacho">Despacho de Expediente / Emenda / Citação</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-800 mb-1">
            Subtipo ou Enquadramento:
          </label>
          <input
            type="text"
            value={actSubtype}
            onChange={(e) => setActSubtype(e.target.value)}
            placeholder="Ex: Análise integral do PDF, Extinção, Embargos, etc."
            className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Action Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>
            {inputMode === "pdf"
              ? "Auditoria multimodal profunda do PDF anexado com confronto de provas e normas TJGO."
              : "Auditoria com confronto fático-probatório de eventos e hierarquia normativa TJGO."}
          </span>
        </div>

        <button
          onClick={onGenerate}
          disabled={isLoading || !hasContentToAnalyze}
          className={`w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 transition cursor-pointer ${
            isLoading || !hasContentToAnalyze
              ? "bg-emerald-500 cursor-not-allowed opacity-75"
              : "bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99]"
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>
                {inputMode === "pdf"
                  ? "Analisando PDF dos Autos & Elaborando Minuta..."
                  : "Analisando Autos & Elaborando Minuta..."}
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                {inputMode === "pdf"
                  ? `Analisar PDF (${pdfFiles.length}) & Elaborar Minuta`
                  : "Elaborar Minuta Oficial (Assessor Judicial)"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
