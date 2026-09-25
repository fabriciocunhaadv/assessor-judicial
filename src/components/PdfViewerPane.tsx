import React, { useState, useMemo } from "react";
import {
  FileText,
  Eye,
  Maximize2,
  ExternalLink, AlertCircle,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Upload,
  Layers,
  X,
  Sparkles,
  BookOpen,
  Filter,
  Copy,
  Check,
  CheckCircle2,
  FileSearch,
} from "lucide-react";
import { UploadedPdf } from "../types";

interface PdfViewerPaneProps {
  pdfFiles: UploadedPdf[];
  fallbackText?: string;
  onAddPdf?: (file: UploadedPdf) => void;
  onRemovePdf?: (id: string) => void;
  title?: string;
}

export const PdfViewerPane: React.FC<PdfViewerPaneProps> = ({
  pdfFiles = [],
  fallbackText = "",
  onAddPdf,
  onRemovePdf,
  title = "Autos do Processo (PDF Projudi)",
}) => {
  const [selectedPdfId, setSelectedPdfId] = useState<string>(
    pdfFiles.length > 0 ? pdfFiles[0].id : ""
  );
  const [viewMode, setViewMode] = useState<"pdf" | "text">("pdf");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [filterEvent, setFilterEvent] = useState<string>("all");

  // Keep selectedPdfId valid if pdfFiles change
  const activePdf = useMemo(() => {
    if (pdfFiles.length === 0) return null;
    return pdfFiles.find((p) => p.id === selectedPdfId) || pdfFiles[0];
  }, [pdfFiles, selectedPdfId]);

  const activePdfSourceUrl = useMemo(() => {
    if (!activePdf) return null;
    if (activePdf.previewUrl) return activePdf.previewUrl;
    if (activePdf.base64) return `data:application/pdf;base64,${activePdf.base64}`;
    return null;
  }, [activePdf]);

  const activeExtractedText = useMemo(() => {
    if (activePdf?.extractedText && activePdf.extractedText.trim().length > 0) {
      return activePdf.extractedText;
    }
    if (fallbackText && fallbackText.trim().length > 0) {
      return fallbackText;
    }
    return "";
  }, [activePdf, fallbackText]);

  // Highlight search matches or filter events in text mode
  const filteredTextParagraphs = useMemo(() => {
    if (!activeExtractedText) return [];
    const paragraphs = activeExtractedText.split(/\n\s*\n/);
    if (!searchQuery.trim() && filterEvent === "all") return paragraphs;

    return paragraphs.filter((p) => {
      const matchSearch =
        !searchQuery.trim() ||
        p.toLowerCase().includes(searchQuery.toLowerCase().trim());

      let matchFilter = true;
      if (filterEvent === "inicial") {
        matchFilter = /peti[çc][ãa]o\s+inicial|evento\s*1\b|mov\.\s*1\b|requerente|autor/i.test(p);
      } else if (filterEvent === "contestacao") {
        matchFilter = /contesta[çc][ãa]o|defesa|r[eé]u|evento\s*\d+|mov\.\s*\d+/i.test(p);
      } else if (filterEvent === "laudo") {
        matchFilter = /laudo|per[ií]cia|m[eé]dic|conclus[ãa]o\s+pericial|cid|diagn[oó]stico/i.test(p);
      } else if (filterEvent === "mp") {
        matchFilter = /minist[eé]rio\s+p[uú]blico|promotor|parecer|custos\s+legis/i.test(p);
      } else if (filterEvent === "tutela") {
        matchFilter = /tutela|liminar|urg[eê]ncia|decis[ãa]o\s+interlocut[oó]ria/i.test(p);
      }

      return matchSearch && matchFilter;
    });
  }, [activeExtractedText, searchQuery, filterEvent]);

  const handleCopyText = () => {
    if (!activeExtractedText) return;
    navigator.clipboard.writeText(activeExtractedText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const handleOpenPdfExternal = () => {
    if (activePdfSourceUrl) {
      window.open(activePdfSourceUrl, "_blank");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg">
      {/* Header do Painel com Seletor de Arquivos e Controles */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-black uppercase tracking-wider text-slate-200 block truncate">
              {title}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              {pdfFiles.length > 0
                ? `${pdfFiles.length} documento(s) nos autos`
                : fallbackText
                ? "Texto transcrito dos autos"
                : "Aguardando PDF dos autos"}
            </span>
          </div>
        </div>

        {/* Alternador de Modo: Visualizador PDF vs Texto Limpo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("pdf")}
              disabled={!activePdfSourceUrl}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === "pdf" && activePdfSourceUrl
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
              title="Visualizador Gráfico do PDF Original"
            >
              <Eye className="w-3 h-3" />
              <span>PDF Original</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("text")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === "text" || !activePdfSourceUrl
                  ? "bg-amber-500 text-slate-950 shadow-xs font-black"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Texto integral e busca fática por eventos"
            >
              <FileSearch className="w-3 h-3" />
              <span>Texto dos Autos</span>
            </button>
          </div>

          {activePdfSourceUrl && (
            <button
              type="button"
              onClick={handleOpenPdfExternal}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Abrir PDF em nova aba para leitura expandida"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Seletor de Arquivos PDF (se houver mais de 1 anexo) */}
      {pdfFiles.length > 1 && (
        <div className="px-3 py-1.5 bg-slate-950/90 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-thin">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Layers className="w-3 h-3 text-rose-400" />
            Peças:
          </span>
          {pdfFiles.map((pdf) => {
            const isSelected = (activePdf?.id || "") === pdf.id;
            return (
              <button
                key={pdf.id}
                type="button"
                onClick={() => setSelectedPdfId(pdf.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer max-w-[180px] truncate border ${
                  isSelected
                    ? "bg-rose-950/80 border-rose-500/60 text-rose-200 shadow-xs"
                    : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                title={pdf.name}
              >
                <FileText className={`w-3 h-3 shrink-0 ${isSelected ? "text-rose-400" : "text-slate-500"}`} />
                <span className="truncate">{pdf.name}</span>
                {pdf.pageCount && (
                  <span className="text-[9px] opacity-75 font-mono">({pdf.pageCount}p)</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Conteúdo Principal do Painel */}
      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden bg-slate-950">
        {/* MODO 1: VISUALIZADOR PDF ORIGINAL */}
        {viewMode === "pdf" && activePdfSourceUrl ? (
          <div className="flex-1 w-full h-full flex flex-col min-h-0 bg-slate-950 relative">
            {/* Barra de Ferramentas de Zoom & Páginas */}
            <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <span className="truncate font-semibold text-slate-300 max-w-[200px]">
                {activePdf?.name || "Documento dos Autos"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.max(50, prev - 15))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[10px] text-slate-300 w-10 text-center">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.min(200, prev + 15))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                <span className="text-[10px] text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded hidden md:inline-flex items-center gap-1" title="O Chrome restringe iframes na pré-visualização. Abra o aplicativo numa aba externa.">
                  <AlertCircle className="w-3 h-3" />
                  Bloqueado?
                </span>
                <a
                  href={activePdfSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 rounded bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] sm:text-xs transition flex items-center gap-1.5 font-medium ml-1"
                  title="Abrir em Nova Aba"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nova Aba</span>
                </a>
              </div>
            </div>

            {/* Iframe / Object do PDF */}
            <div className="flex-1 w-full h-full min-h-[450px] relative overflow-auto bg-slate-900">
              <iframe
                src={`${activePdfSourceUrl}#zoom=${zoomLevel}&toolbar=1&navpanes=1`}
                title={activePdf?.name || "Visualizador de Autos do Processo"}
                className="w-full h-full border-0 min-h-[500px]"
                style={{
                  transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
                  transformOrigin: "top left",
                  width: zoomLevel !== 100 ? `${(100 / zoomLevel) * 100}%` : "100%",
                  height: zoomLevel !== 100 ? `${(100 / zoomLevel) * 100}%` : "100%",
                }}
              />
            </div>
          </div>
        ) : (
          /* MODO 2: TEXTO LIMPO DOS AUTOS & BUSCA FÁTICA */
          <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-950">
            {/* Barra de Pesquisa e Filtro de Eventos */}
            <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar nos autos (ex: 'laudo', 'dano moral', 'evento 15')..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro Rápido por Tipo de Peça */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Filter className="w-3 h-3 text-amber-400 shrink-0" />
                <select
                  value={filterEvent}
                  onChange={(e) => setFilterEvent(e.target.value)}
                  className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-[11px] text-amber-300 font-semibold focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Todas as Peças / Eventos</option>
                  <option value="inicial">Petição Inicial (Evento 1)</option>
                  <option value="contestacao">Contestação / Defesa</option>
                  <option value="laudo">Laudos & Prova Técnica</option>
                  <option value="mp">Parecer do Ministério Público</option>
                  <option value="tutela">Decisões Liminares / Tutelas</option>
                </select>

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Copiar texto integral dos autos para a área de transferência"
                >
                  {copiedSuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSuccess ? "Copiado!" : "Copiar"}</span>
                </button>
              </div>
            </div>

            {/* Visualizador de Texto Formatado com Realce */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs text-slate-200 leading-relaxed scrollbar-thin select-text">
              {activeExtractedText ? (
                filteredTextParagraphs.length > 0 ? (
                  filteredTextParagraphs.map((par, pIdx) => {
                    const isEventHeader = /^(?:\[===|===|EVENTO|MOV\.?|MOVIMENTAÇÃO|FOLHA|PETIÇÃO)/i.test(par.trim());
                    return (
                      <div
                        key={pIdx}
                        className={`p-2.5 rounded-lg border transition ${
                          isEventHeader
                            ? "bg-slate-900 border-amber-500/40 text-amber-200 font-bold"
                            : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{par}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Search className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs">Nenhum trecho dos autos corresponde ao filtro/pesquisa selecionada.</p>
                  </div>
                )
              ) : (
                <div className="p-8 text-center text-slate-500 space-y-3">
                  <FileText className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-xs">
                    Nenhum arquivo PDF ou texto foi carregado para este processo.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer do Painel com Metadados */}
      <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Fidelidade probatória aos autos originais do PROJUDI</span>
        </span>
        <span className="font-mono text-slate-300">
          {activeExtractedText.length.toLocaleString()} caracteres
        </span>
      </div>
    </div>
  );
};
