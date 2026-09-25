import React, { useState, useRef } from "react";
import {
  FileText,
  Upload,
  X, ExternalLink,
  Eye,
  CheckCircle2,
  AlertCircle,
  FilePlus,
  Layers,
  Sparkles,
  Loader2,
  Compass,
  RefreshCw,
} from "lucide-react";
import { UploadedPdf } from "../types";
import { extractTextFromPdf } from "../utils/pdfExtractor";

interface PdfUploadZoneProps {
  pdfFiles: UploadedPdf[];
  onAddPdf: (file: UploadedPdf) => void;
  onUpdatePdf?: (file: UploadedPdf) => void;
  onRemovePdf: (id: string) => void;
  onClearAll: () => void;
  onOpenAssessorGuide?: () => void;
  title?: string;
  subtitle?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
}

export const PdfUploadZone: React.FC<PdfUploadZoneProps> = ({
  pdfFiles,
  onAddPdf,
  onUpdatePdf,
  onRemovePdf,
  onClearAll,
  onOpenAssessorGuide,
  title = "Documentos PDF Anexados",
  subtitle = "Clique ou arraste outro PDF para adicionar aos autos",
  emptyTitle = "Arraste o PDF do processo aqui ou clique para selecionar",
  emptySubtitle = "Suporta autos de qualquer tamanho (50MB, 100MB+, centenas de páginas)",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfName, setPreviewPdfName] = useState<string>("");
  const [processingFilesCount, setProcessingFilesCount] = useState<number>(0);
  const [extractionProgress, setExtractionProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      console.warn("Arquivo ignorado: não é um PDF válido", file.name);
      return;
    }

    setProcessingFilesCount((prev) => prev + 1);

    try {
      const blobUrl = URL.createObjectURL(file);

      // 1. Extract text from PDF in browser using pdfjs-dist with real-time page progress
      const extraction = await extractTextFromPdf(file, (current, total) => {
        setExtractionProgress({ current, total, fileName: file.name });
      });

      // 2. Read base64 ONLY if extraction has NO text (scanned PDF fallback) and file is under 28MB
      // This prevents sending huge base64 payloads over the wire when text is already extracted!
      let base64Data = "";
      if (!extraction.hasText && file.size < 28 * 1024 * 1024) {
        base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const res = (e.target?.result as string) || "";
            resolve(res.includes("base64,") ? res.split("base64,")[1] : res);
          };
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        });
      }

      const newPdf: UploadedPdf = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
        mimeType: "application/pdf",
        base64: base64Data || undefined,
        previewUrl: blobUrl,
        extractedText: extraction.text,
        pageCount: extraction.pageCount,
        isExtracting: false,
      };

      onAddPdf(newPdf);
    } catch (err) {
      console.error("Erro ao processar PDF:", err);
    } finally {
      setExtractionProgress(null);
      setProcessingFilesCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await processFile(files[i]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await processFile(files[i]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Dropzone Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? "border-slate-800 bg-slate-50/80 scale-[1.01]"
            : pdfFiles.length > 0
            ? "border-slate-300 bg-slate-50/30 hover:border-slate-400 hover:bg-slate-50/50"
            : "border-slate-300 bg-slate-50/80 hover:border-slate-400 hover:bg-slate-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-14 h-14 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-900">
          {processingFilesCount > 0 ? (
            <Loader2 className="w-7 h-7 animate-spin text-slate-900" />
          ) : (
            <Upload className="w-7 h-7" />
          )}
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-800">
            {processingFilesCount > 0
              ? `Lendo e estruturando páginas do PDF (${processingFilesCount} em processamento)...`
              : pdfFiles.length > 0
              ? subtitle
              : emptyTitle}
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            {emptySubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          <div className="flex items-center gap-2 text-[11px] text-slate-800 bg-slate-100/80 px-3 py-1 rounded-full font-medium">
            <Sparkles className="w-3.5 h-3.5 text-slate-900" />
            <span>Leitura de autos sem limite de tamanho • Processa todas as páginas</span>
          </div>
          {onOpenAssessorGuide && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAssessorGuide();
              }}
              className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/90 border border-emerald-300/80 px-3 py-1 rounded-full font-bold transition cursor-pointer shadow-2xs"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-700" />
              <span>Como orientar a IA antes de minutar</span>
            </button>
          )}
        </div>
      </div>

      {/* Extraction Progress Bar */}
      {extractionProgress && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs flex flex-col gap-1.5 shadow-xs animate-pulse">
          <div className="flex items-center justify-between font-semibold">
            <span className="truncate flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              Lendo autos do processo: {extractionProgress.fileName}
            </span>
            <span className="shrink-0 text-blue-800">
              {extractionProgress.current} / {extractionProgress.total} págs ({Math.round((extractionProgress.current / Math.max(1, extractionProgress.total)) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-150 rounded-full"
              style={{ width: `${Math.min(100, Math.round((extractionProgress.current / Math.max(1, extractionProgress.total)) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* List of uploaded PDFs */}
      {pdfFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-900" />
              {title} ({pdfFiles.length}):
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline cursor-pointer"
            >
              Remover todos
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pdfFiles.map((pdf) => {
              const charCount = pdf.extractedText?.trim().length || 0;
              const hasText = charCount > 30;

              return (
                <div
                  key={pdf.id}
                  className={`p-3 bg-white border rounded-lg shadow-xs flex items-center justify-between gap-2 transition ${
                    hasText ? "border-slate-200 hover:border-slate-300" : "border-amber-300 bg-amber-50/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded border flex items-center justify-center shrink-0 ${
                      hasText ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-amber-100 border-amber-300 text-amber-700"
                    }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate" title={pdf.name}>
                        {pdf.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span>{formatFileSize(pdf.size)}</span>
                        {pdf.pageCount ? (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 font-medium">{pdf.pageCount} pág{pdf.pageCount > 1 ? "s" : ""}</span>
                          </>
                        ) : null}
                        <span>•</span>
                        {hasText ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-0.5" title={`${charCount.toLocaleString()} caracteres extraídos dos autos`}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {Math.round(charCount / 1000)}k caracs. lidos
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-amber-800 font-semibold flex items-center gap-0.5" title="Não foi possível extrair texto (PDF digitalizado/imagem sem OCR)">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Sem texto extraído
                            </span>
                            {pdf.previewUrl && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    setExtractionProgress({ current: 1, total: pdf.pageCount || 1, fileName: pdf.name });
                                    const res = await fetch(pdf.previewUrl!);
                                    const b = await res.blob();
                                    const f = new File([b], pdf.name, { type: "application/pdf" });
                                    const ext = await extractTextFromPdf(f, (c, t) => {
                                      setExtractionProgress({ current: c, total: t, fileName: pdf.name });
                                    });
                                    if (ext.hasText && ext.text.trim().length > 0) {
                                      const updatedPdf: UploadedPdf = {
                                        ...pdf,
                                        extractedText: ext.text,
                                        pageCount: ext.pageCount,
                                      };
                                      if (onUpdatePdf) {
                                        onUpdatePdf(updatedPdf);
                                      }
                                    }
                                  } catch (reErr) {
                                    console.warn("Re-extração falhou:", reErr);
                                  } finally {
                                    setExtractionProgress(null);
                                  }
                                }}
                                className="px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded text-[10px] flex items-center gap-1 cursor-pointer transition"
                                title="Reexaminar e extrair camada de texto deste arquivo"
                              >
                                <RefreshCw className="w-2.5 h-2.5" />
                                <span>Re-extrair</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {pdf.previewUrl && (
                      <button
                        onClick={() => {
                          setPreviewPdfUrl(pdf.previewUrl || null);
                          setPreviewPdfName(pdf.name);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Visualizar PDF"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onRemovePdf(pdf.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      title="Remover este arquivo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alerta caso algum PDF não contenha texto extraível */}
          {pdfFiles.some((p) => !p.extractedText || p.extractedText.trim().length <= 30) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <p className="font-bold text-amber-950">Atenção: Camada de texto não identificada em um dos PDFs anexados.</p>
                <p className="text-[11px] text-amber-900/90 mt-0.5">
                  Se o processo foi digitalizado apenas como fotos ou imagens escaneadas sem OCR, a IA não conseguirá ler as partes nem os fatos da ação.
                  Para garantir total fidelidade fática, copie e cole o teor das peças processuais na aba <strong>&quot;Digitar / Colar Texto&quot;</strong> antes de gerar a minuta.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-bold truncate">{previewPdfName}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="text-[10px] sm:text-xs text-amber-400/80 bg-amber-400/10 px-2 py-1 rounded hidden md:inline-flex items-center gap-1.5" title="O Chrome restringe iframes na pré-visualização. Abra o aplicativo numa aba externa.">
                  <AlertCircle className="w-3 h-3" />
                  Bloqueado? Abra o app em aba externa
                </span>
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nova Aba</span>
                </a>
                <button
                  onClick={() => setPreviewPdfUrl(null)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-rose-500 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-1">
              <iframe
                src={previewPdfUrl}
                title="Pré-visualização do PDF"
                className="w-full h-full rounded border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
