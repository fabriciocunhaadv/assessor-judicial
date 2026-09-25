import React, { useState } from 'react';
import { X, FileText, Check, Download, BrainCircuit } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'react-hot-toast';
import type { UploadedPdf } from '../types';

interface ExtractedDocument {
  id: string;
  evento: string;
  descricao: string;
  fileName: string;
  base64?: string;
}

interface ExtensionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  processNumber: string;
  documents: ExtractedDocument[];
  onImport: (documents: UploadedPdf[]) => void;
}

export function ExtensionImportModal({ isOpen, onClose, processNumber, documents, onImport }: ExtensionImportModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(documents.map(d => d.id)));
  const [isImporting, setIsImporting] = useState(false);
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleToggleAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)));
    }
  };

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecione pelo menos um documento para importar.');
      return;
    }

    setIsImporting(true);
    const selectedDocs = documents.filter(d => selectedIds.has(d.id));
    const importToast = toast.loading('Processando e carregando PDFs baixados...');

    try {
      const importedPdfs: UploadedPdf[] = await Promise.all(selectedDocs.map(async (doc) => {
        let file: File;
        let previewUrl: string | undefined;

        if (doc.base64) {
           // We have the actual binary file from the extension!
           try {
               let blob: Blob;
               // Robust base64 parsing without fetch() to avoid data URI length limits
               if (doc.base64.startsWith('data:')) {
                   const arr = doc.base64.split(',');
                   const mimeMatch = arr[0].match(/:(.*?);/);
                   const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
                   const byteCharacters = atob(arr[1]);
                   const byteArrays = [];
                   for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
                       const slice = byteCharacters.slice(offset, offset + 1024);
                       const byteNumbers = new Array(slice.length);
                       for (let i = 0; i < slice.length; i++) {
                           byteNumbers[i] = slice.charCodeAt(i);
                       }
                       const byteArray = new Uint8Array(byteNumbers);
                       byteArrays.push(byteArray);
                   }
                   blob = new Blob(byteArrays, { type: mime });
                   
                   if (blob.size === 0) {
                       throw new Error("O arquivo recebido do PROJUDI contém 0 bytes (bloqueado pela origem).");
                   }
               } else {
                   // fallback just in case it's a raw base64 string
                   const bstr = atob(doc.base64);
                   let n = bstr.length;
                   const u8arr = new Uint8Array(n);
                   while (n--) {
                       u8arr[n] = bstr.charCodeAt(n);
                   }
                   blob = new Blob([u8arr], { type: 'application/pdf' });
               }
               
               file = new File([blob], doc.fileName, { type: blob.type || 'application/pdf' });
               previewUrl = URL.createObjectURL(blob);
               
               return {
                  id: doc.id,
                  file: file,
                  name: doc.fileName,
                  size: file.size,
                  mimeType: file.type,
                  previewUrl: previewUrl,
               };
           } catch (err: any) {
               throw new Error("Falha ao decodificar arquivo PDF (" + doc.fileName + "): " + err.message);
           }
        } else {
           // Fallback if no binary was captured
           const textContent = `[Documento extraído via PROJUDI Conecta]\nProcesso: ${processNumber}\nEvento: ${doc.evento}\nDescrição: ${doc.descricao}\nNome Original: ${doc.fileName}\n\n(O conteúdo integral deste documento não foi acessível.)`;
           
           const htmlContent = `
            <!DOCTYPE html>
            <html><head><meta charset="utf-8"></head>
            <body style="font-family: sans-serif; padding: 20px;">
              <h2>Pré-visualização da Extração (Sem Binário)</h2>
              <p><strong>Evento:</strong> ${doc.evento}</p>
              <p><strong>Arquivo:</strong> ${doc.fileName}</p>
              <pre style="background: #eee; padding: 10px;">${textContent}</pre>
            </body></html>
           `;
           const blob = new Blob([htmlContent], { type: "text/html" });
           file = new File([blob], doc.fileName + '.html', { type: "text/html" });
           previewUrl = URL.createObjectURL(blob);
           
           return {
              id: doc.id,
              file: file,
              name: doc.fileName + '.html',
              size: file.size,
              mimeType: 'text/html',
              previewUrl: previewUrl,
              extractedText: textContent
           };
        }
      }));

      toast.success(`${importedPdfs.length} documentos importados com sucesso!`, { id: importToast });
      onImport(importedPdfs);
      onClose();
    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast.error('Ocorreu um erro ao processar os arquivos baixados: ' + (error?.message || error), { id: importToast });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Download className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Documentos importados via extensão
                <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <BrainCircuit className="w-3 h-3" />
                  Conecta
                </span>
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Processo: <span className="font-mono text-slate-300">{processNumber || 'Não identificado'}</span> • Selecione os documentos do processo que deseja importar para análise
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
          <div className="flex items-center justify-between mb-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div 
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  selectedIds.size === documents.length 
                    ? 'bg-indigo-500 border-indigo-500' 
                    : 'border-slate-500 hover:border-indigo-400'
                }`}
              >
                {selectedIds.size === documents.length && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className="font-semibold text-slate-200">
                Selecionar todos <span className="text-slate-400 font-normal">({selectedIds.size}/{documents.length})</span>
              </span>
            </label>

          </div>

          <div className="space-y-2">
            {documents.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => handleToggle(doc.id)}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${
                  selectedIds.has(doc.id)
                    ? 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div 
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    selectedIds.has(doc.id)
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'border-slate-500 group-hover:border-indigo-400'
                  }`}
                >
                  {selectedIds.has(doc.id) && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className={`w-5 h-5 shrink-0 ${selectedIds.has(doc.id) ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <div className="flex flex-col truncate">
                    <span className={`text-sm font-medium truncate ${selectedIds.has(doc.id) ? 'text-indigo-100' : 'text-slate-300'}`}>
                      {doc.evento} - {doc.descricao}
                    </span>
                    <span className="text-xs text-slate-500 truncate mt-0.5">
                      {doc.fileName}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="px-2 py-1 rounded-md bg-slate-700/50 text-xs font-medium text-slate-300 border border-slate-600">
                    PDF
                  </span>
                </div>
              </div>
            ))}
            
            {documents.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum documento encontrado para este processo.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800 bg-slate-900/50">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleImport}
            disabled={selectedIds.size === 0 || isImporting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {isImporting ? 'Importando arquivos...' : `Importar (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
