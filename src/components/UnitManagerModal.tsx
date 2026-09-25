import React, { useState } from 'react';
import { X, Plus, Trash2, Save, Building2, Edit2, Check } from 'lucide-react';
import { JudicialUnit } from '../types';
import { useAuth } from '../lib/AuthContext';
import { saveUnitsToDb } from '../lib/firestoreUtils';

interface UnitManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnitManagerModal: React.FC<UnitManagerModalProps> = ({ isOpen, onClose }) => {
  const { allowedUnits, isAdmin, isJudge } = useAuth();
  
  const [units, setUnits] = useState<JudicialUnit[]>(allowedUnits);
  const [newUnitId, setNewUnitId] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingUnitName, setEditingUnitName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if allowedUnits changes from context (from DB)
  React.useEffect(() => {
    setUnits(allowedUnits);
  }, [allowedUnits]);

  if (!isOpen) return null;

  if (!isAdmin && !isJudge) {
    return (
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-900/40 text-red-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Acesso Restrito ao Administrador e Magistrado</h3>
          <p className="text-xs text-slate-300">
            Somente o Administrador do Gabinete ou o Magistrado Titular possuem permissão para cadastrar, editar ou excluir Unidades Judiciárias / Comarcas.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const handleAddUnit = () => {
    if (!newUnitId.trim() || !newUnitName.trim()) {
      setError("Preencha o ID (sem espaços) e o nome da unidade.");
      return;
    }
    
    // Normalize ID (lowercase, no spaces)
    const normalizedId = newUnitId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    if (units.some(u => u.id === normalizedId)) {
      setError("Já existe uma unidade com este ID.");
      return;
    }

    setUnits([
      ...units,
      {
        id: normalizedId,
        name: newUnitName.trim(),
      },
    ]);
    setNewUnitId('');
    setNewUnitName('');
    setError(null);
  };

  const handleRemoveUnit = (id: string) => {
    if (!isAdmin && !isJudge) {
      setError("Apenas administradores ou magistrados podem excluir unidades já cadastradas.");
      return;
    }
    if (units.length <= 1) {
      setError("O sistema precisa ter pelo menos 1 unidade cadastrada.");
      return;
    }
    setUnits(units.filter(u => u.id !== id));
    setError(null);
  };

  const handleStartEdit = (unit: JudicialUnit) => {
    setEditingUnitId(unit.id);
    setEditingUnitName(unit.name);
  };

  const handleSaveEditUnit = (unitId: string) => {
    if (!editingUnitName.trim()) {
      setError("O nome da lotação não pode ficar vazio.");
      return;
    }
    setUnits(units.map(u => u.id === unitId ? { ...u, name: editingUnitName.trim() } : u));
    setEditingUnitId(null);
    setEditingUnitName('');
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await saveUnitsToDb(units);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar as unidades.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Gerenciar Lotações / Comarcas</h2>
              <p className="text-xs text-slate-400">Cadastre e gerencie as Unidades Judiciárias ativas no Gabinete</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* ADICIONAR NOVA UNIDADE */}
          <div className="p-4 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Cadastrar Nova Lotação / Vara
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  ID do Sistema (sem espaços):
                </label>
                <input
                  type="text"
                  placeholder="ex: 3_vara_civel"
                  value={newUnitId}
                  onChange={(e) => setNewUnitId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nome de Exibição / Comarca:
                </label>
                <input
                  type="text"
                  placeholder="ex: Montes Claros / 1ª Vara de Família"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddUnit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Lotação</span>
              </button>
            </div>
          </div>

          {/* LISTAGEM DE UNIDADES */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Lotações Cadastradas no Gabinete ({units.length})
            </h3>

            <div className="space-y-2">
              {units.map((unit) => {
                const isEditingThis = editingUnitId === unit.id;

                return (
                  <div
                    key={unit.id}
                    className="p-3 bg-slate-900/60 border border-slate-700/80 rounded-xl flex items-center justify-between gap-2 hover:border-slate-600 transition"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                        <Building2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      {isEditingThis ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingUnitName}
                            onChange={(e) => setEditingUnitName(e.target.value)}
                            className="bg-slate-800 border border-emerald-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditUnit(unit.id);
                              if (e.key === 'Escape') setEditingUnitId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditUnit(unit.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                            title="Confirmar alteração"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUnitId(null)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-slate-100 truncate">{unit.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {unit.id}</span>
                        </div>
                      )}
                    </div>

                    {!isEditingThis && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(unit)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/40"
                          title="Editar Nome da Lotação"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveUnit(unit.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/40"
                          title="Remover Unidade"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-900 flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-400 hidden sm:block">
            As alterações de lotações são salvas em tempo real no banco de dados.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition font-bold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg transition font-bold text-xs disabled:opacity-50 cursor-pointer shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Salvando..." : "Salvar Alterações"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
