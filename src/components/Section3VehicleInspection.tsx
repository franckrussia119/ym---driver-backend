import React, { useState } from 'react';
import {
  InspectionDefectItem,
  MechanicVerification,
  DefectSeverity,
  DefectAction,
} from '../types';
import { INITIAL_DEFECT_CATEGORIES } from '../data/defaults';
import { ShieldCheck, AlertOctagon, Wrench, CheckSquare, Calendar, UserCheck, X, AlertTriangle } from 'lucide-react';

interface Section3VehicleInspectionProps {
  aucunDefautConstate?: boolean;
  defects?: Record<string, InspectionDefectItem>;
  checklist?: Record<string, boolean>;
  mechanicVerif?: MechanicVerification;
  isSubmitted?: boolean;
  onAucunDefautToggle?: (checked: boolean) => void;
  onDefectChange?: (id: string, updated: Partial<InspectionDefectItem>) => void;
  onChecklistToggle?: (item: string) => void;
  onChecklistAll?: (checked: boolean) => void;
  onMechanicVerifChange?: (updated: MechanicVerification) => void;
  onUpdateChecklist?: (c: Record<string, boolean>) => void;
  onUpdateDefects?: (d: Record<string, InspectionDefectItem>) => void;
  onUpdateAucunDefaut?: (val: boolean) => void;
}

export const Section3VehicleInspection: React.FC<Section3VehicleInspectionProps> = ({
  aucunDefautConstate = true,
  defects = {},
  checklist = {},
  mechanicVerif = { nomMecanicien: '', date: '' },
  onAucunDefautToggle,
  onDefectChange,
  onChecklistToggle,
  onChecklistAll,
  onMechanicVerifChange,
  onUpdateChecklist,
  onUpdateDefects,
  onUpdateAucunDefaut,
}) => {
  const safeMechanicVerif = mechanicVerif || { nomMecanicien: '', date: '' };
  const safeDefects = defects || {};
  const safeChecklist = checklist || {};

  const handleAucunDefautToggle = (checked: boolean) => {
    if (onAucunDefautToggle) onAucunDefautToggle(checked);
    if (onUpdateAucunDefaut) onUpdateAucunDefaut(checked);
  };

  const handleDefectChange = (id: string, updated: Partial<InspectionDefectItem>) => {
    if (onDefectChange) {
      onDefectChange(id, updated);
    } else if (onUpdateDefects) {
      const existing = safeDefects[id] || {
        id,
        category: 'AUTRE',
        name: 'Défaut',
        constate: false,
        gravite: 'Mineure',
        actionPrise: 'Réparé sur place',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      };
      onUpdateDefects({
        ...safeDefects,
        [id]: { ...existing, ...updated },
      });
    }
  };

  const handleChecklistToggle = (item: string) => {
    if (onChecklistToggle) {
      onChecklistToggle(item);
    } else if (onUpdateChecklist) {
      onUpdateChecklist({
        ...safeChecklist,
        [item]: !safeChecklist[item],
      });
    }
  };

  const handleChecklistAll = (checked: boolean) => {
    if (onChecklistAll) {
      onChecklistAll(checked);
    } else if (onUpdateChecklist) {
      const updated = { ...safeChecklist };
      Object.keys(updated).forEach((k) => (updated[k] = checked));
      onUpdateChecklist(updated);
    }
  };

  const handleMechanicVerifChange = (updated: MechanicVerification) => {
    if (onMechanicVerifChange) onMechanicVerifChange(updated);
  };

  const activeDefectsCount = (Object.values(safeDefects) as InspectionDefectItem[]).filter((d) => d?.constate).length;

  // State for Mobile / Desktop Defect Detail Pop-up Modal
  const [selectedDefectItem, setSelectedDefectItem] = useState<{
    id: string;
    category: string;
    name: string;
  } | null>(null);

  const handleOpenDefectModal = (id: string, category: string, name: string) => {
    if (!safeDefects[id]) {
      handleDefectChange(id, {
        category,
        name,
        constate: true,
        gravite: 'Mineure',
        actionPrise: 'Signalé au mécanicien',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    } else if (!safeDefects[id].constate) {
      handleDefectChange(id, { constate: true });
    }
    setSelectedDefectItem({ id, category, name });
  };

  const handleItemCardClick = (id: string, category: string, name: string, currentState: boolean) => {
    if (!currentState) {
      handleOpenDefectModal(id, category, name);
    } else {
      setSelectedDefectItem({ id, category, name });
    }
  };

  const activeDefectModalData = selectedDefectItem ? safeDefects[selectedDefectItem.id] : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Section Header */}
      <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white font-bold text-xs px-2.5 py-1 rounded">SECTION 3</span>
          <h2 className="font-semibold text-sm sm:text-base tracking-wide">
            Diagnostic du Véhicule et Défauts Identifiés (DVIR)
          </h2>
        </div>
        <span className="text-xs text-slate-300 italic">
          (Conforme à la norme DVIR. Cochez les défauts constatés durant la semaine.)
        </span>
      </div>

      {/* Main Banner: Aucun défaut vs Defect Mode */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 cursor-pointer bg-white px-4 py-2.5 rounded-lg border border-slate-300 shadow-xs hover:border-blue-500 transition-colors">
          <input
            type="checkbox"
            checked={!!aucunDefautConstate}
            onChange={(e) => handleAucunDefautToggle(e.target.checked)}
            className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
          />
          <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            AUCUN DÉFAUT CONSTATÉ CETTE SEMAINE — véhicule conforme
          </span>
        </label>

        {activeDefectsCount > 0 && (
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
            <AlertOctagon className="w-4 h-4 text-amber-700" />
            {activeDefectsCount} anomalie(s) signalée(s)
          </div>
        )}
      </div>

      {/* Defect Categories Inspection Table */}
      <div className="p-3 sm:p-5 space-y-4 sm:space-y-6">
        {INITIAL_DEFECT_CATEGORIES.map((categoryGroup) => {
          return (
            <div key={categoryGroup.category} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-800 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
                <span>{categoryGroup.category}</span>
                {categoryGroup.items.some((i) => safeDefects[i.id]?.constate) && (
                  <span className="bg-amber-500 text-slate-900 text-[10px] px-2 py-0.5 rounded font-bold">
                    Défaut actif
                  </span>
                )}
              </div>

              <div className="p-2 grid grid-cols-2 md:grid-cols-1 gap-2 divide-y-0">
                {categoryGroup.items.map((itemDef) => {
                  const defect = safeDefects[itemDef.id] || {
                    id: itemDef.id,
                    category: categoryGroup.category,
                    name: itemDef.name,
                    constate: false,
                    gravite: 'Mineure',
                    actionPrise: 'Réparé sur place',
                    date: new Date().toISOString().split('T')[0],
                    notes: '',
                  };

                  return (
                    <div
                      key={itemDef.id}
                      onClick={() => handleItemCardClick(itemDef.id, categoryGroup.category, itemDef.name, defect.constate)}
                      className={`p-2.5 text-xs rounded-xl border cursor-pointer transition-all active:scale-98 select-none ${
                        defect.constate
                          ? 'bg-amber-50 border-amber-400 shadow-xs ring-1 ring-amber-400/50'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={defect.constate}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleItemCardClick(itemDef.id, categoryGroup.category, itemDef.name, defect.constate);
                          }}
                          className="mt-0.5 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span
                            className={`font-semibold text-[11px] sm:text-xs leading-tight block ${
                              defect.constate ? 'text-amber-950 font-bold' : 'text-slate-800'
                            }`}
                          >
                            {itemDef.name}
                          </span>

                          {defect.constate ? (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                  defect.gravite === 'Critique'
                                    ? 'bg-red-600 text-white'
                                    : defect.gravite === 'Majeure'
                                    ? 'bg-amber-500 text-slate-900'
                                    : 'bg-yellow-200 text-yellow-900'
                                }`}
                              >
                                {defect.gravite || 'Mineure'}
                              </span>
                              <span className="text-[10px] text-amber-900 font-medium truncate max-w-[90px]">
                                {defect.actionPrise || 'Signalé'}
                              </span>
                              <span className="text-[10px] text-blue-700 underline font-bold ml-auto">
                                Options ⚙️
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic mt-0.5 block">
                              Cliquer pour signaler
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Mechanic Verification Block */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-blue-700" />
            <h3 className="font-bold text-sm text-slate-800">
              Confirmation mécanicien (si défaut signalé) :
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" /> Nom du mécanicien informé
              </label>
              <input
                type="text"
                value={safeMechanicVerif.nomMecanicien || ''}
                onChange={(e) =>
                  handleMechanicVerifChange({ ...safeMechanicVerif, nomMecanicien: e.target.value })
                }
                placeholder="Nom du mécanicien"
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Date d'intervention / information
              </label>
              <input
                type="date"
                value={safeMechanicVerif.date || ''}
                onChange={(e) => handleMechanicVerifChange({ ...safeMechanicVerif, date: e.target.value })}
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Liste de vérification (cocher ✔) */}
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-sm text-slate-900">
                Liste de vérification hebdomadaire (cocher ✔)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleChecklistAll(true)}
                className="text-xs font-medium text-blue-700 hover:text-blue-900 underline cursor-pointer"
              >
                Tout cocher
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => handleChecklistAll(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 underline cursor-pointer"
              >
                Décocher tout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.keys(safeChecklist).map((checkItem) => (
              <label
                key={checkItem}
                className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-blue-400 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={!!safeChecklist[checkItem]}
                  onChange={() => handleChecklistToggle(checkItem)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                />
                <span className="text-[11px] sm:text-xs font-semibold text-slate-800 leading-tight">{checkItem}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE & DESKTOP POP-UP MODAL FOR DEFECT OPTIONS SELECTION */}
      {selectedDefectItem && activeDefectModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                    {selectedDefectItem.category}
                  </span>
                  <h3 className="text-sm font-bold text-white">{selectedDefectItem.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDefectItem(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Constat Toggle */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-950 block">Défaut / Anomalie constatée</span>
                  <span className="text-[10px] text-amber-800">Déclare une défaillance sur ce composant</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeDefectModalData.constate}
                  onChange={(e) =>
                    handleDefectChange(selectedDefectItem.id, { constate: e.target.checked })
                  }
                  className="w-5 h-5 text-amber-600 rounded border-amber-400 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              {activeDefectModalData.constate && (
                <>
                  {/* Severity Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Niveau de Gravité du Défaut
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Mineure', 'Majeure', 'Critique'] as DefectSeverity[]).map((sev) => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => handleDefectChange(selectedDefectItem.id, { gravite: sev })}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border text-center transition-all ${
                            activeDefectModalData.gravite === sev
                              ? sev === 'Critique'
                                ? 'bg-red-600 text-white border-red-700 shadow-sm'
                                : sev === 'Majeure'
                                ? 'bg-amber-500 text-slate-900 border-amber-600 shadow-sm'
                                : 'bg-blue-600 text-white border-blue-700 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Prise */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Action Immédiate Prise
                    </label>
                    <select
                      value={activeDefectModalData.actionPrise || 'Signalé au mécanicien'}
                      onChange={(e) =>
                        handleDefectChange(selectedDefectItem.id, {
                          actionPrise: e.target.value as DefectAction,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Réparé sur place">Réparé sur place (Conducteur / Dépannage)</option>
                      <option value="Signalé au mécanicien">Signalé au mécanicien / Atelier garage</option>
                      <option value="Immobilisation">Immobilisation immédiate du camion</option>
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Date du constat
                    </label>
                    <input
                      type="date"
                      value={activeDefectModalData.date || new Date().toISOString().split('T')[0]}
                      onChange={(e) =>
                        handleDefectChange(selectedDefectItem.id, { date: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-slate-50 focus:bg-white"
                    />
                  </div>

                  {/* Notes / Remarks */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Observations & Description détaillée
                    </label>
                    <textarea
                      rows={2}
                      value={activeDefectModalData.notes || ''}
                      onChange={(e) =>
                        handleDefectChange(selectedDefectItem.id, { notes: e.target.value })
                      }
                      placeholder="Préciser l'état (ex: pneu arrière droit dégonflé, voyant frein rouge...)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    ></textarea>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleDefectChange(selectedDefectItem.id, { constate: false });
                    setSelectedDefectItem(null);
                  }}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                >
                  Annuler / Sans Défaut
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDefectItem(null)}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow cursor-pointer"
                >
                  Valider & Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
