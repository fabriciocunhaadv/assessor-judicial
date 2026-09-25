import React, { useRef, useState, useEffect } from "react";
import { BookOpen, FileText, Upload, X, Loader2, CheckCircle2, Trash2, Eye } from "lucide-react";
import { SavedKnowledgeDoc, getKnowledgeDocs, saveKnowledgeDoc, deleteKnowledgeDoc, toggleKnowledgeDocActive } from "../utils/knowledgeDb";
import { extractTextFromPdf } from "../utils/pdfExtractor";
import { useAuth } from "../lib/AuthContext";

interface KnowledgeBasePanelProps {
  onSelectionChange?: (selectedDocs: SavedKnowledgeDoc[]) => void;
}

export const KnowledgeBasePanel: React.FC<KnowledgeBasePanelProps> = ({ onSelectionChange }) => {
  const { isAdmin, userProfile } = useAuth();
  const [docs, setDocs] = useState<SavedKnowledgeDoc[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [docToDelete, setDocToDelete] = useState<SavedKnowledgeDoc | null>(null);
  const [docToView, setDocToView] = useState<SavedKnowledgeDoc | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    const loadedDocs = await getKnowledgeDocs();
    setDocs(loadedDocs);
    notifySelection(loadedDocs);
  };

  const notifySelection = (currentDocs: SavedKnowledgeDoc[]) => {
    if (onSelectionChange) {
      onSelectionChange(currentDocs.filter((d) => d.isActive));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== "application/pdf") continue;

        const extraction = await extractTextFromPdf(file);
        
        if (extraction.hasText) {
          // Truncate text if it's excessively large (Firestore limit is ~1MB per doc)
          // 1MB string is about 1,000,000 characters for ASCII, but Unicode takes more.
          // Let's truncate at 600,000 characters (~600KB) to be safe.
          let finalExtractedText = extraction.text;
          if (finalExtractedText.length > 600000) {
            finalExtractedText = finalExtractedText.slice(0, 600000) + "\n\n[TEXTO TRUNCADO POR EXCEDER O LIMITE DE TAMANHO DE 1MB DO BANCO DE DADOS]";
          }

          const newDoc: SavedKnowledgeDoc = {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            pageCount: extraction.pageCount,
            extractedText: finalExtractedText,
            addedAt: Date.now(),
            isActive: true, // Default to active when added
            createdBy: userProfile?.uid || "anonymous",
            creatorName: userProfile?.name || userProfile?.email?.split("@")[0] || "Usuário",
            creatorEmail: userProfile?.email || "",
          };
          await saveKnowledgeDoc(newDoc);
        }
      }
      await loadDocs();
    } catch (err: any) {
      console.error("Error adding knowledge doc:", err);
      const errMsg = err?.message || String(err);
      if (errMsg.toLowerCase().includes("payload size") || errMsg.includes("exceeds the limit")) {
        alert("O PDF é muito grande e excedeu o limite de armazenamento em nuvem (1MB de texto extraído). Tente dividir o PDF.");
      } else {
        alert("Ocorreu um erro ao salvar o PDF: " + errMsg);
      }
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await toggleKnowledgeDocActive(id, isActive);
    const updatedDocs = docs.map((d) => (d.id === id ? { ...d, isActive } : d));
    setDocs(updatedDocs);
    notifySelection(updatedDocs);
  };

  const confirmDeleteDoc = async () => {
    if (!docToDelete) return;
    const id = docToDelete.id;
    setDocToDelete(null);
    await deleteKnowledgeDoc(id);
    const updatedDocs = docs.filter((d) => d.id !== id);
    setDocs(updatedDocs);
    notifySelection(updatedDocs);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5 relative">
      <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div>
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-slate-900" />
            Base de Conhecimento do Gabinete (Nuvem):
          </span>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-2xl">
            Salve aqui PDFs de jurisprudência (ex: Boletins do NUGEPNAC), enunciados e normativas do Tribunal. Esses documentos <strong>ficarão armazenados no banco de dados em nuvem do gabinete</strong> (Firestore) e estarão disponíveis para toda a equipe. O Modo Especialista "Travado" fará a busca cruzada nestes documentos e citará as fontes automaticamente nas sentenças e minutas.
          </p>
        </div>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            isProcessing ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800 active:scale-95"
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>{isProcessing ? "Salvando..." : "Adicionar PDF"}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {docs.length > 0 && (
        <div className="space-y-2 mt-3 pt-3 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className={`p-2.5 bg-white border rounded-lg shadow-2xs flex items-start gap-2.5 transition ${
                  doc.isActive ? "border-slate-400 bg-slate-50/20" : "border-slate-200 opacity-75"
                }`}
              >
                <input
                  type="checkbox"
                  checked={doc.isActive}
                  onChange={(e) => handleToggleActive(doc.id, e.target.checked)}
                  className="accent-slate-900 w-4 h-4 mt-0.5 cursor-pointer shrink-0"
                />
                
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate ${doc.isActive ? "text-slate-900" : "text-slate-600"}`} title={doc.name}>
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span>{formatFileSize(doc.size)}</span>
                    {doc.pageCount && <span>• {doc.pageCount} págs</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDocToView(doc)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded transition cursor-pointer shrink-0"
                    title="Visualizar texto do documento"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {(isAdmin || doc.createdBy === userProfile?.uid) && (
                    <button
                      onClick={() => setDocToDelete(doc)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer shrink-0"
                      title="Excluir documento da base permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal for PDF deletion */}
      {docToDelete && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 rounded-xl animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 space-y-3 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Remover Documento da Base?</h4>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed truncate max-w-[220px]" title={docToDelete.name}>
                  "{docToDelete.name}"
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDocToDelete(null)}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteDoc}
                className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Sim, Remover</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Viewer Modal */}
      {docToView && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] rounded-xl animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-800 line-clamp-1">{docToView.name}</h3>
              </div>
              <button
                onClick={() => setDocToView(null)}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-slate-50">
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                {docToView.extractedText || "Nenhum texto extraído deste documento."}
              </pre>
            </div>
            <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl flex justify-end">
              <button
                onClick={() => setDocToView(null)}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};