import React, { useState, useRef } from "react";
import { X, Plus, Save, Trash2, Edit3, Sparkles, Check, Copy, Download, Upload, RotateCcw, AlertTriangle, Send } from "lucide-react";
import { CustomPrompt, SaaSTenant } from "../types";
import { useAuth } from "../lib/AuthContext";
import { getPromptBackups } from "../utils/promptsDb";
import { getAllTenantsWithMetrics, broadcastPromptToTenants } from "../lib/firestoreUtils";

interface PromptManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: CustomPrompt[];
  onSavePrompt: (prompt: CustomPrompt) => void;
  onDeletePrompt: (id: string) => void;
  onSelectPrompt: (prompt: CustomPrompt) => void;
  onBulkUpdatePrompts?: (prompts: CustomPrompt[]) => void;
  currentPromptId: string;
}

export const PromptManagerModal: React.FC<PromptManagerModalProps> = ({
  isOpen,
  onClose,
  prompts,
  onSavePrompt,
  onDeletePrompt,
  onSelectPrompt,
  onBulkUpdatePrompts,
  currentPromptId,
}) => {
  const { isAdmin, isSuperAdmin, userProfile } = useAuth();
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [promptToDelete, setPromptToDelete] = useState<CustomPrompt | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Distribution states
  const [distributingPrompt, setDistributingPrompt] = useState<CustomPrompt | null>(null);
  const [tenantsList, setTenantsList] = useState<SaaSTenant[]>([]);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [isFetchingTenants, setIsFetchingTenants] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<"civel" | "fazenda" | "criminal" | "familia" | "infancia" | "outros">("civel");
  const [formPrivacy, setFormPrivacy] = useState<"privado" | "interno" | "publico">("privado");
  const [formScope, setFormScope] = useState<"judicial" | "administrativa">("judicial");
  const [formDescription, setFormDescription] = useState("");
  const [formPromptText, setFormPromptText] = useState("");

  if (!isOpen) return null;

  const showTemporaryStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prompts, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_prompts_gabinete_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showTemporaryStatus("Backup de prompts exportado com sucesso!");
  };

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge imported prompts
          const merged = [...prompts];
          for (const item of parsed) {
            if (item.id && item.title && item.promptText) {
              const idx = merged.findIndex((p) => p.id === item.id);
              if (idx >= 0) {
                merged[idx] = item;
              } else {
                merged.push(item);
              }
              onSavePrompt(item);
            }
          }
          if (onBulkUpdatePrompts) {
            onBulkUpdatePrompts(merged);
          }
          showTemporaryStatus(`${parsed.length} prompt(s) importados e salvos com sucesso!`);
        } else {
          alert("Arquivo inválido. O arquivo deve conter uma lista JSON de prompts.");
        }
      } catch (err) {
        console.error("Erro ao importar JSON de prompts:", err);
        alert("Erro ao ler o arquivo JSON.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRestoreBackup = () => {
    const backup = getPromptBackups();
    if (!backup || backup.length === 0) {
      alert("Nenhum backup local anterior encontrado.");
      return;
    }
    if (confirm(`Deseja restaurar ${backup.length} prompts do último ponto de restauração local?`)) {
      if (onBulkUpdatePrompts) {
        onBulkUpdatePrompts(backup);
      }
      for (const p of backup) {
        onSavePrompt(p);
      }
      showTemporaryStatus("Backup local restaurado e sincronizado!");
    }
  };

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setEditingId(null);
    setFormTitle("Outros Área Judicial - Novo Prompt Gabinete");
    setFormCategory("civel");
    setFormPrivacy("privado");
    setFormScope("judicial");
    setFormDescription("Instruções personalizadas do gabinete para análise dos autos.");
    setFormPromptText(`Você atua como Assessor de Juiz de Direito no Juizado Especial Cível do TJGO.
Analise o PDF dos autos e elabore a minuta judicial aplicando as diretrizes:
1. Confronto Fato vs. Prova com citação expressa de eventos.
2. Fidelidade absoluta ao relato processual.
3. Aplicação do Enunciado FONAJE e Lei nº 14.905/2024.`);
  };

  const handleOpenDistribute = async (p: CustomPrompt) => {
    setDistributingPrompt(p);
    setIsFetchingTenants(true);
    setSelectedTenantIds([]);
    try {
      const list = await getAllTenantsWithMetrics();
      setTenantsList(list);
    } catch (e) {
      console.error("Failed to fetch tenants:", e);
    } finally {
      setIsFetchingTenants(false);
    }
  };

  const handleConfirmDistribute = async () => {
    if (!distributingPrompt || selectedTenantIds.length === 0) return;
    setIsDistributing(true);
    try {
      await broadcastPromptToTenants(distributingPrompt, selectedTenantIds);
      setStatusMessage(`Prompt "${distributingPrompt.title}" distribuído para ${selectedTenantIds.length} gabinete(s) com sucesso!`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e) {
      console.error("Failed to distribute prompt:", e);
      setStatusMessage("Erro ao distribuir prompt.");
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsDistributing(false);
      setDistributingPrompt(null);
    }
  };

  const toggleTenantSelection = (id: string) => {
    setSelectedTenantIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const toggleAllTenants = () => {
    if (selectedTenantIds.length === tenantsList.length) {
      setSelectedTenantIds([]);
    } else {
      setSelectedTenantIds(tenantsList.map(t => t.id));
    }
  };

  const handleStartEdit = (p: CustomPrompt) => {
    setIsCreatingNew(false);
    setEditingId(p.id);
    setFormTitle(p.title);
    setFormCategory(p.category as any);
    setFormPrivacy(p.privacy);
    setFormScope(p.scope);
    setFormDescription(p.description || "");
    setFormPromptText(p.promptText);
  };

  const handleSave = () => {
    if (!formTitle.trim() || !formPromptText.trim()) {
      return;
    }

    const existingPrompt = editingId ? prompts.find((p) => p.id === editingId) : null;
    const updatedPrompt: CustomPrompt = {
      id: editingId || `custom-prompt-${Date.now()}`,
      title: formTitle.trim(),
      category: formCategory,
      privacy: formPrivacy,
      scope: formScope,
      description: formDescription.trim(),
      promptText: formPromptText.trim(),
      updatedAt: new Date().toISOString().split("T")[0],
      createdBy: existingPrompt
        ? existingPrompt.createdBy || userProfile?.uid || "anonymous"
        : userProfile?.uid || "anonymous",
      creatorName: userProfile?.name || userProfile?.email?.split("@")[0] || "Assessor",
      creatorEmail: userProfile?.email || "",
      unitId: existingPrompt ? existingPrompt.unitId : undefined,
    };

    onSavePrompt(updatedPrompt);
    setIsCreatingNew(false);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-[160] overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-slate-400" />
            <div>
              <h3 className="text-sm font-bold">Gerenciador de Prompts Jurídicos (Assessor Judicial)</h3>
              <p className="text-xs text-slate-400">Crie, edite e personalize prompts para execução automática em PDFs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message Banner */}
        {statusMessage && (
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900/60 border-b border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-700 hover:text-slate-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Top Actions */}
          {!isCreatingNew && !editingId && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-700 font-bold text-sm">
                  Prompts do Gabinete ({prompts.length})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportJson}
                  accept=".json"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer border border-slate-300 text-xs"
                  title="Importar prompts de um arquivo de backup JSON"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>Importar JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer border border-slate-300 text-xs"
                  title="Baixar cópia de segurança de todos os prompts em formato JSON"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Backup JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestoreBackup}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer border border-slate-300 text-xs"
                  title="Restaurar versão anterior do backup local"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                  <span>Restaurar Backup</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Inserir Novo Prompt</span>
                </button>
              </div>
            </div>
          )}

          {/* Form when Creating or Editing */}
          {(isCreatingNew || editingId) ? (
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-slate-900" />
                  {isCreatingNew ? "Criar Novo Prompt Judicial" : "Editar Prompt em Uso"}
                </h4>
                <button
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingId(null);
                  }}
                  className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Título do Prompt:</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Outros Área Judicial - Fabrício Juizado Especial Cível"
                    className="w-full p-2 bg-white border border-slate-300 rounded font-medium text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Categoria:</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900"
                    >
                      <option value="civel">Cível (JEC)</option>
                      <option value="fazenda">Faz. Pública</option>
                      <option value="criminal">Criminal</option>
                      <option value="familia">Família</option>
                      <option value="infancia">Infância</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Privacidade:</label>
                    <select
                      value={formPrivacy}
                      onChange={(e) => setFormPrivacy(e.target.value as any)}
                      className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900"
                    >
                      <option value="privado">Privado</option>
                      <option value="interno">Interno</option>
                      <option value="publico">Público</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Âmbito:</label>
                    <select
                      value={formScope}
                      onChange={(e) => setFormScope(e.target.value as any)}
                      className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900"
                    >
                      <option value="judicial">Judicial</option>
                      <option value="administrativa">Administrativo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição Breve:</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Análise fático-probatória no JEC com Enunciados FONAJE e Lei 14.905/2024"
                  className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Texto Completo das Instruções do Prompt (Executado no PDF/Autos):
                </label>
                <textarea
                  rows={10}
                  value={formPromptText}
                  onChange={(e) => setFormPromptText(e.target.value)}
                  placeholder="Insira as regras de ouro, fontes de direito, diretrizes de decisão e comandos que a IA deve obedecer..."
                  className="w-full p-3 font-mono text-xs bg-white border border-slate-300 rounded leading-relaxed text-slate-900 focus:ring-2 focus:ring-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Prompt</span>
                </button>
              </div>
            </div>
          ) : (
            /* List of existing prompts */
            <div id="tour-prompt-list" className="space-y-2.5">
              {prompts.map((p) => {
                const isSelected = p.id === currentPromptId;
                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-slate-50/70 border-slate-800 ring-1 ring-slate-400"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white uppercase font-mono">
                          {p.privacy}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                          {p.category}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs truncate">{p.title}</h4>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Em Uso
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs line-clamp-1">{p.description}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onSelectPrompt(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                        }`}
                      >
                        {isSelected ? "Ativo" : "Selecionar"}
                      </button>
                      {(isAdmin || p.createdBy === userProfile?.uid || isSuperAdmin) && (
                        <>
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleOpenDistribute(p)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition cursor-pointer"
                              title="Distribuir este prompt para outros gabinetes"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleStartEdit(p)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition cursor-pointer"
                            title="Editar instruções deste prompt"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPromptToDelete(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                            title="Excluir prompt"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

        {/* In-App Confirmation for Prompt Deletion */}
        {promptToDelete && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Excluir este Prompt?</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Deseja excluir o prompt <strong>"{promptToDelete.title}"</strong>? Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setPromptToDelete(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const id = promptToDelete.id;
                    setPromptToDelete(null);
                    onDeletePrompt(id);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sim, Excluir</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Distribute Prompt Modal */}
        {distributingPrompt && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in duration-150">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
              <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Distribuir Prompt</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{distributingPrompt.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDistributingPrompt(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isFetchingTenants ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8">
                  <RotateCcw className="w-6 h-6 text-indigo-600 animate-spin mb-2" />
                  <span className="text-xs text-slate-500">Carregando gabinetes...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <span className="text-xs font-semibold text-slate-700">Selecione os Gabinetes:</span>
                    <button
                      onClick={toggleAllTenants}
                      className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      {selectedTenantIds.length === tenantsList.length ? "Desmarcar Todos" : "Selecionar Todos"}
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-1.5 p-1 min-h-[200px] border border-slate-100 rounded-lg bg-slate-50/50">
                    {tenantsList.map(t => (
                      <label key={t.id} className="flex items-center gap-2.5 p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={selectedTenantIds.includes(t.id)}
                          onChange={() => toggleTenantSelection(t.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{t.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{t.id} • {t.ownerEmail}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 shrink-0">
                    <span className="text-xs font-semibold text-slate-500">
                      {selectedTenantIds.length} selecionado(s)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDistributingPrompt(null)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirmDistribute}
                        disabled={selectedTenantIds.length === 0 || isDistributing}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        {isDistributing ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            <span>Distribuindo...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Distribuir Prompt</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
