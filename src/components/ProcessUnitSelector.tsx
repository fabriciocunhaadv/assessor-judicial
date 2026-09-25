import React, { useState } from 'react';
import { Building2, Plus, Check, ChevronDown, Sparkles, MapPin, Settings2, ShieldCheck } from 'lucide-react';
import { JudicialUnit, DEFAULT_UNITS } from '../types';
import { useAuth } from '../lib/AuthContext';
import { QuickAddUnitModal } from './QuickAddUnitModal';

interface ProcessUnitSelectorProps {
  onOpenUnitManager?: () => void;
  detectedUnitName?: string | null;
  onApplyDetectedUnit?: (unit: JudicialUnit) => void;
}

export const ProcessUnitSelector: React.FC<ProcessUnitSelectorProps> = ({
  onOpenUnitManager,
  detectedUnitName,
  onApplyDetectedUnit,
}) => {
  const { 
    activeUnit, 
    setActiveUnit, 
    allowedUnits, 
    isAdmin, 
    isSuperAdmin, 
    allTenants, 
    allUnitsForSuperAdmin, 
    activeTenantId,
    setSuperAdminActiveTenant 
  } = useAuth();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const displayUnits = allowedUnits && allowedUnits.length > 0 ? allowedUnits : (activeUnit ? [activeUnit] : DEFAULT_UNITS);

  // Check if detected unit matches any known unit in displayUnits
  const matchedDetectedUnit = detectedUnitName
    ? displayUnits.find((u) => {
        const cleanName = u.name.toLowerCase();
        const cleanDet = detectedUnitName.toLowerCase();
        return cleanName.includes(cleanDet) || cleanDet.includes(cleanName);
      })
    : null;

  const showDetectedBadge =
    matchedDetectedUnit && matchedDetectedUnit.id !== activeUnit.id;

  return (
    <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 sm:p-3 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Label & Active Unit Display */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-emerald-100/70 text-emerald-700 rounded-lg shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Unidade Judiciária / Comarca Ativa:
              </span>
              {isSuperAdmin && (
                <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Super Admin
                </span>
              )}
            </div>
            <div className="relative inline-block text-left w-full sm:w-auto">
              <button
                type="button"
                id="tour-process-unit-selector"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between gap-2 px-2.5 py-1 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition cursor-pointer max-w-full truncate"
                title="Clique para alternar a unidade judiciária dos autos"
              >
                <span className="truncate">{activeUnit?.name || 'Selecione a Unidade'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-72 sm:w-84 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
                    {isSuperAdmin && allTenants && allTenants.length > 0 ? (
                      allTenants.map((t) => {
                        const isCurrentTenant = t.id === activeTenantId;
                        const tUnits = isCurrentTenant ? displayUnits : allUnitsForSuperAdmin.filter(u => u.tenantId === t.id);
                        const unitsList = tUnits.length > 0 ? tUnits : (t.isPrimary ? DEFAULT_UNITS : []);
                        
                        return (
                          <div key={t.id} className="py-1">
                            <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${
                              isCurrentTenant ? 'text-indigo-700 bg-indigo-50/50' : 'text-slate-400'
                            }`}>
                              <span className="truncate">🏢 {t.name}</span>
                              {t.isPrimary && <span className="text-[9px] font-semibold text-slate-400">(Principal)</span>}
                            </div>
                            {unitsList.map((unit) => {
                              const isSelected = unit.id === activeUnit?.id && (unit.tenantId ? unit.tenantId === activeTenantId : true);
                              return (
                                <button
                                  key={`${t.id}-${unit.id}`}
                                  type="button"
                                  onClick={() => {
                                    setSuperAdminActiveTenant(t.id, unit.id);
                                    setIsDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition hover:bg-slate-50 ${
                                    isSelected
                                      ? 'font-bold text-indigo-800 bg-indigo-50/80'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  <span className="truncate pl-2">{unit.name}</span>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                            {unitsList.length === 0 && (
                              <div className="px-5 py-1 text-[11px] text-slate-400 italic">
                                Sem lotações cadastradas
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Lotações Disponíveis no Gabinete
                        </div>
                        {displayUnits.map((unit) => {
                          const isSelected = unit.id === activeUnit?.id;
                          return (
                            <button
                              key={unit.id}
                              type="button"
                              onClick={() => {
                                setActiveUnit(unit);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition hover:bg-slate-50 ${
                                isSelected
                                  ? 'font-bold text-emerald-800 bg-emerald-50/60'
                                  : 'text-slate-700'
                              }`}
                            >
                              <span className="truncate">{unit.name}</span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Admin Action Button: Only visible to Administrator */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            {onOpenUnitManager && (
              <button
                type="button"
                onClick={onOpenUnitManager}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition cursor-pointer"
                title="Painel de Administração: Gerenciar e Cadastrar Lotações/Comarcas"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Gerenciar Lotações (ADM)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Auto-detected unit recommendation badge if detected from PDF */}
      {showDetectedBadge && matchedDetectedUnit && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2 text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">
              Detectada nos autos: <strong>{matchedDetectedUnit.name}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveUnit(matchedDetectedUnit);
              if (onApplyDetectedUnit) onApplyDetectedUnit(matchedDetectedUnit);
            }}
            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-md transition shrink-0 cursor-pointer"
          >
            Alternar para esta
          </button>
        </div>
      )}

      {/* Quick Add Modal */}
      <QuickAddUnitModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </div>
  );
};
