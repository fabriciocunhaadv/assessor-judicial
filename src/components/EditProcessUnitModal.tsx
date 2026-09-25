import React, { useState, useEffect } from "react";
import { X, Building2, MapPin, Check, Save, Plus, AlertCircle, RefreshCw, Tag, Scale } from "lucide-react";
import { JudicialUnit } from "../types";
import { updateProcessUnit, updateAnalysisUnit, updateProcessCategory, updateAnalysisCategory } from "../utils/historyDb";
import { AVAILABLE_PROCESS_CATEGORIES } from "../utils/promptCategoryHelper";

interface EditProcessUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  processNumber: string;
  currentJudicialUnit?: string;
  currentUnitId?: string;
  currentCategory?: string;
  analysisId?: string;
  allowedUnits: JudicialUnit[];
  onUnitUpdated: (updated: { unitId: string; judicialUnit: string; category?: string }) => void;
}

export const EditProcessUnitModal: React.FC<EditProcessUnitModalProps> = ({
  isOpen,
  onClose,
  processNumber,
  currentJudicialUnit = "",
  currentUnitId = "montes_claros",
  currentCategory = "civel",
  analysisId,
  allowedUnits,
  onUnitUpdated,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(currentUnitId);
  const [customUnitName, setCustomUnitName] = useState<string>(currentJudicialUnit || "");
  const [useCustomName, setUseCustomName] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedUnitId(currentUnitId || "montes_claros");
      setCustomUnitName(currentJudicialUnit || "");
      setSelectedCategory(currentCategory || "civel");
      // Se a unidade atual não corresponde exatamente ao nome de uma das allowedUnits, ativa modo custom
      const matchedUnit = allowedUnits.find((u) => u.id === currentUnitId || u.name === currentJudicialUnit);
      if (currentJudicialUnit && !matchedUnit) {
        setUseCustomName(true);
      } else {
        setUseCustomName(false);
      }
      setError(null);
    }
  }, [isOpen, currentJudicialUnit, currentUnitId, currentCategory, allowedUnits]);

  if (!isOpen) return null;

  const handleSelectPredefined = (unit: JudicialUnit) => {
    setSelectedUnitId(unit.id);
    setCustomUnitName(unit.name);
    setUseCustomName(false);
    setError(null);
  };

  const handleSave = async () => {
    let finalUnitName = customUnitName.trim();
    let finalUnitId = selectedUnitId;

    if (!useCustomName) {
      const matched = allowedUnits.find((u) => u.id === selectedUnitId);
      if (matched) {
        finalUnitName = matched.name;
        finalUnitId = matched.id;
      }
    }

    if (!finalUnitName) {
      setError("Por favor, selecione ou informe o nome da Unidade / Comarca do processo.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const catDef = AVAILABLE_PROCESS_CATEGORIES.find((c) => c.category === selectedCategory);
    const varaName = catDef ? catDef.label : undefined;

    try {
      if (analysisId) {
        // Atualiza apenas um ato específico
        await updateAnalysisUnit(analysisId, {
          unitId: finalUnitId,
          judicialUnit: finalUnitName,
          vara: varaName,
        });
        await updateAnalysisCategory(analysisId, {
          promptCategory: selectedCategory,
          vara: varaName,
        });
      } else {
        // Atualiza todo o dossiê do processo
        await updateProcessUnit(processNumber, {
          unitId: finalUnitId,
          judicialUnit: finalUnitName,
          vara: varaName,
        });
        await updateProcessCategory(processNumber, {
          promptCategory: selectedCategory,
          vara: varaName,
        });
      }

      onUnitUpdated({
        unitId: finalUnitId,
        judicialUnit: finalUnitName,
        category: selectedCategory,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar a lotação do processo no banco de dados.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Alterar Vara & Lotação do Processo</h3>
              <p className="text-xs text-slate-500 font-mono">Processo: {processNumber || "Sem Número"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. SELEÇÃO DA VARA / COMPETÊNCIA DO PROCESSO */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span>1. Competência / Vara na Etiqueta:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_PROCESS_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.category;
                return (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() => setSelectedCategory(cat.category)}
                    className={`px-3 py-2 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span className="truncate">{cat.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. SELEÇÃO DA UNIDADE / COMARCA */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span>2. Selecionar Comarca / Unidade:</span>
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
              {allowedUnits.map((unit) => {
                const isSelected = !useCustomName && selectedUnitId === unit.id;
                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => handleSelectPredefined(unit)}
                    className={`px-3.5 py-2 rounded-xl border text-left flex items-center justify-between text-xs transition cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-bold shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                      <span>{unit.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opção para Unidade / Comarca Personalizada */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Ou Digitar Comarca Personalizada:
              </label>
              <button
                type="button"
                onClick={() => setUseCustomName(!useCustomName)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {useCustomName ? "Usar Comarca da Lista" : "+ Digitar Manualmente"}
              </button>
            </div>

            {useCustomName ? (
              <div className="space-y-1.5 animate-in fade-in">
                <input
                  type="text"
                  value={customUnitName}
                  onChange={(e) => setCustomUnitName(e.target.value)}
                  placeholder="Ex: Comarca de Montes Claros de Goiás"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-indigo-300 ring-2 ring-indigo-500/10 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  autoFocus
                />
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                Comarca atual: <strong className="text-slate-700">{customUnitName || "Nenhuma"}</strong>
              </p>
            )}
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
            <strong>Atualização Imediata:</strong> A alteração de Vara e Lotação é sincronizada para todos os membros do gabinete e refletirá imediatamente na etiqueta do processo e no dossiê de histórico.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
};

