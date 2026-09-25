import React, { useState } from 'react';
import { X, Building2, Plus, CheckCircle2, Sparkles, MapPin } from 'lucide-react';
import { JudicialUnit } from '../types';
import { useAuth } from '../lib/AuthContext';
import { saveUnitsToDb } from '../lib/firestoreUtils';

interface QuickAddUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnitCreated?: (newUnit: JudicialUnit) => void;
}

export const QuickAddUnitModal: React.FC<QuickAddUnitModalProps> = ({
  isOpen,
  onClose,
  onUnitCreated,
}) => {
  const { allowedUnits, setActiveUnit, isAdmin } = useAuth();
  const [comarcaName, setComarcaName] = useState('');
  const [varaName, setVaraName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Acesso Restrito ao Administrador</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Somente o Administrador do Gabinete possui permissão para cadastrar, editar ou excluir Unidades Judiciárias / Comarcas. Usuários padrão selecionam a lotação ativa na lista do painel.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const comarcaTrim = comarcaName.trim();
    const varaTrim = varaName.trim();

    if (!comarcaTrim && !varaTrim) {
      setError('Por favor, informe a Comarca e a Vara/Juizado.');
      return;
    }

    // Full display name e.g. "Goiânia / 2ª Vara Cível" or "Mineiros / Juizado Especial Cível"
    const displayName = comarcaTrim && varaTrim
      ? `${comarcaTrim} / ${varaTrim}`
      : comarcaTrim || varaTrim;

    // Normalizing ID (e.g. goiania_2_vara_civel)
    const normalizedId = displayName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!normalizedId) {
      setError('Nome inválido para a unidade.');
      return;
    }

    if (allowedUnits.some((u) => u.id === normalizedId)) {
      setError('Já existe uma unidade com este nome/ID cadastrada.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const newUnit: JudicialUnit = {
        id: normalizedId,
        name: displayName,
      };

      const updatedUnitsList = [...allowedUnits, newUnit];
      await saveUnitsToDb(updatedUnitsList);

      // Instantly set as active unit in user session
      setActiveUnit(newUnit);
      if (onUnitCreated) {
        onUnitCreated(newUnit);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setComarcaName('');
        setVaraName('');
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Erro ao cadastrar unidade:', err);
      setError(err?.message || 'Falha ao salvar a nova unidade no banco de dados.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Cadastrar Nova Unidade Judiciária</h2>
              <p className="text-xs text-slate-300">Lotação / Comarca dos autos em análise</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Unidade cadastrada e ativada na sua sessão com sucesso!</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Comarca:
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                autoFocus
                placeholder="Ex: Goiânia, Mineiros, Anápolis, Rio Verde..."
                value={comarcaName}
                onChange={(e) => setComarcaName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Vara / Juizado / Órgão:
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Ex: Juizado Especial Cível e Criminal, 2ª Vara Cível, Vara de Família..."
                value={varaName}
                onChange={(e) => setVaraName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Live Preview */}
          {(comarcaName.trim() || varaName.trim()) && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="text-slate-500 font-semibold block">Nome Oficial no Sistema:</span>
              <span className="font-bold text-emerald-800 text-sm">
                {comarcaName.trim() && varaName.trim()
                  ? `${comarcaName.trim()} / ${varaName.trim()}`
                  : comarcaName.trim() || varaName.trim()}
              </span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || success || (!comarcaName.trim() && !varaName.trim())}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar e Ativar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
