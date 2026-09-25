import React, { useState } from "react";
import {
  Sparkles,
  Edit3,
  Plus,
  ChevronDown,
  Check,
  RotateCcw,
  Save,
  Shield,
  Layers,
  Search,
  BookOpen,
} from "lucide-react";
import { CustomPrompt } from "../types";

interface PromptSelectorAndEditorProps {
  prompts: CustomPrompt[];
  activePrompt: CustomPrompt;
  onSelectPrompt: (prompt: CustomPrompt) => void;
  onUpdateActivePromptText: (text: string) => void;
  onOpenPromptManager: () => void;
  onResetPromptToDefault: () => void;
  isAdmin?: boolean;
  isAdvancedMode?: boolean;
}

export const PromptSelectorAndEditor: React.FC<PromptSelectorAndEditorProps> = ({
  prompts,
  activePrompt,
  onSelectPrompt,
  onUpdateActivePromptText,
  onOpenPromptManager,
  onResetPromptToDefault,
  isAdmin = false,
  isAdvancedMode = true,
}) => {
  const [selectedPrivacy, setSelectedPrivacy] = useState<string>("todos");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isEditorExpanded, setIsEditorExpanded] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>(activePrompt.promptText);
  const [isSavedMessage, setIsSavedMessage] = useState<boolean>(false);

  // Sync editedText when activePrompt changes
  React.useEffect(() => {
    setEditedText(activePrompt.promptText);
  }, [activePrompt.id]);

  const filteredPrompts = prompts.filter((p) => {
    const matchesPrivacy = selectedPrivacy === "todos" || p.privacy === selectedPrivacy;
    const matchesCategory = selectedCategory === "todos" || p.category === selectedCategory;
    const matchesSearch =
      searchTerm.trim() === "" ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesPrivacy && matchesCategory && matchesSearch;
  });

  const handleSaveText = () => {
    onUpdateActivePromptText(editedText);
    setIsSavedMessage(true);
    setTimeout(() => setIsSavedMessage(false), 2500);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4.5 space-y-4">
      {/* Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-slate-900" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
              {isAdvancedMode ? "Execução de Prompts Jurídicos" : "Tipo de Peça (Prompt)"}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isAdvancedMode ? "Selecione, atualize ou insira novos prompts" : "Selecione a peça que deseja gerar"}
            </p>
          </div>
        </div>

        {isAdvancedMode && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsEditorExpanded(!isEditorExpanded)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[36px] ${
                isEditorExpanded
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100"
              }`}
              title="Editar texto do prompt atual"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditorExpanded ? "Fechar Editor" : "Editar Prompt em Uso"}</span>
            </button>

            <button
              onClick={onOpenPromptManager}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs min-h-[36px]"
              title="Gerenciar e cadastrar novos prompts"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              <span>Inserir Prompt</span>
            </button>
          </div>
        )}
      </div>

      {/* Row 2: Search */}
      {isAdvancedMode && (
        <div className="text-xs">
          <label className="block font-bold text-slate-700 mb-1">Filtrar prompts:</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por nome ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-800 focus:bg-white"
            />
          </div>
        </div>
      )}

      {/* Row 3: Dropdown Prompt Selector (Matching screenshot dropdown) */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <label className="block font-bold text-slate-700">Prompt Ativo:</label>
          {isAdvancedMode && (
            <button
              type="button"
              onClick={() => setIsEditorExpanded(!isEditorExpanded)}
              className="text-[11px] font-bold text-slate-700 hover:text-slate-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditorExpanded ? "Ocultar regras" : "Editar regras deste prompt"}</span>
            </button>
          )}
        </div>
        <select
          value={activePrompt.id}
          onChange={(e) => {
            const found = prompts.find((p) => p.id === e.target.value);
            if (found) onSelectPrompt(found);
          }}
          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-slate-800 focus:border-slate-800 focus:bg-white"
        >
          {filteredPrompts.length === 0 ? (
            <option value="">Nenhum prompt encontrado com esses filtros</option>
          ) : (
            filteredPrompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))
          )}
        </select>
        {activePrompt.description && (
          <p className="text-[11px] text-slate-500 italic px-1">{activePrompt.description}</p>
        )}

        {/* Mobile-friendly Quick Edit Bar */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsEditorExpanded(!isEditorExpanded)}
            className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-between transition cursor-pointer border ${
              isEditorExpanded
                ? "bg-slate-100/70 border-slate-400 text-slate-900"
                : "bg-slate-50 hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-800"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-slate-900" />
              <span>{isEditorExpanded ? "Visualizando/Editando Instruções do Prompt:" : "Toque aqui para Visualizar ou Editar as Regras deste Prompt"}</span>
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/80 border border-slate-200">
              {isEditorExpanded ? "Fechar ▲" : "Abrir ▼"}
            </span>
          </button>
        </div>
      </div>

      {/* Expandable Inline Prompt Editor */}
      {isEditorExpanded && (
        <div className="p-3.5 sm:p-4 bg-slate-50/50 border border-slate-300 rounded-xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-slate-700" />
              <span className="font-bold text-xs text-slate-900">
                Instruções do Prompt em Execução:
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {editedText.length} caracteres
            </span>
          </div>

          <textarea
            rows={7}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            placeholder="Edite aqui as regras, diretrizes, leis e fontes que a IA deve aplicar na análise deste processo..."
            className="w-full p-3 bg-white font-mono text-xs sm:text-xs text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 leading-relaxed shadow-2xs"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <button
              onClick={onResetPromptToDefault}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline cursor-pointer py-1"
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar instruções padrão
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isSavedMessage && (
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Prompt salvo!
                </span>
              )}
              <button
                onClick={handleSaveText}
                className="w-full sm:w-auto px-4 py-2 bg-slate-700 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Alterações no Prompt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
