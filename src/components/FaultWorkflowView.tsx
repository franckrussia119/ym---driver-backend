import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Wrench,
  UserCheck,
  ShieldCheck,
  Plus,
  Send,
  FileText,
  MapPin,
  MessageSquare,
  History,
  Lock,
} from 'lucide-react';
import {
  FaultDeclaration,
  FaultStatus,
  UserProfile,
  FaultHistoryEntry,
} from '../types';
import { displayRef } from '../lib/displayRef';

interface FaultWorkflowViewProps {
  faults: FaultDeclaration[];
  currentUser: UserProfile | null;
  onOpenDeclareModal: () => void;
  onUpdateFaultStatus: (
    faultId: string,
    newStatus: FaultStatus,
    comment?: string
  ) => void;
  onOpenCreateInvoiceForFault?: (fault: FaultDeclaration) => void;
}

const WORKFLOW_STEPS: { status: FaultStatus; label: string; roleNeeded: string }[] = [
  { status: 'Signalée par chauffeur', label: '1. Signalée par chauffeur', roleNeeded: 'Chauffeur' },
  { status: 'Transmise au mécanicien', label: '2. Transmise au mécanicien', roleNeeded: 'Superviseur (Niv 1)' },
  { status: 'En cours de réparation', label: '3. En cours de réparation', roleNeeded: 'Mécanicien' },
  { status: 'Réparée — en attente de clôture', label: '4. Réparée — attente clôture', roleNeeded: 'Mécanicien' },
  { status: 'Clôturée par superviseur', label: '5. Clôturée par superviseur', roleNeeded: 'Superviseur (Niv 2)' },
];

export const FaultWorkflowView: React.FC<FaultWorkflowViewProps> = ({
  faults,
  currentUser,
  onOpenDeclareModal,
  onUpdateFaultStatus,
  onOpenCreateInvoiceForFault,
}) => {
  const [selectedFaultId, setSelectedFaultId] = useState<string>(
    faults.length > 0 ? faults[0].id : ''
  );
  const [actionComment, setActionComment] = useState<string>('');

  const selectedFault =
    faults.find((f) => f.id === selectedFaultId) || faults[0];

  const getStepIndex = (status: FaultStatus): number => {
    return WORKFLOW_STEPS.findIndex((s) => s.status === status);
  };

  const currentStepIdx = selectedFault ? getStepIndex(selectedFault.status) : 0;

  const handleAdvanceWorkflow = (targetStatus: FaultStatus) => {
    if (!selectedFault) return;
    onUpdateFaultStatus(selectedFault.id, targetStatus, actionComment);
    setActionComment('');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Workflow & Suivi des Pannes</span>
          </h2>
          <p className="text-xs text-slate-500">
            Chaîne de validation : Chauffeur → Superviseur (Niv 1) → Mécanicien → Superviseur (Clôture).
          </p>
        </div>

        {currentUser?.role === 'CHAUFFEUR' && (
          <button
            type="button"
            onClick={onOpenDeclareModal}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Déclarer une Panne</span>
          </button>
        )}
      </div>

      {/* Main Grid: Faults List (Left) + Selected Fault Details & Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Faults List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            Signalements enregistrés ({faults.length})
          </div>

          {faults.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              Aucune panne signalée dans le système.
            </div>
          ) : (
            faults.map((fault) => {
              const isSelected = selectedFaultId === fault.id;
              const stepIdx = getStepIndex(fault.status);
              return (
                <div
                  key={fault.id}
                  onClick={() => setSelectedFaultId(fault.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      {displayRef(fault.numeroReference, fault.id)} · {fault.immatriculation}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        fault.niveauUrgence.includes('Élevée')
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {fault.niveauUrgence}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 line-clamp-2 mb-2">
                    {fault.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="font-medium text-slate-800">{fault.chauffeurNom}</span>
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      Étape {stepIdx + 1}/5 : {fault.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Fault Details & Step Actions */}
        {selectedFault && (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
            
            {/* Fault Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-blue-400 font-mono block">
                  DOSSIER # {displayRef(selectedFault.numeroReference, selectedFault.id)}
                </span>
                <h3 className="font-bold text-sm text-white">
                  {selectedFault.categorie} — {selectedFault.immatriculation}
                </h3>
              </div>
              <span className="text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                Chauffeur : {selectedFault.chauffeurNom}
              </span>
            </div>

            {/* 5-Step Process Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Progression du Workflow
              </span>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {WORKFLOW_STEPS.map((step, idx) => {
                  const isCompleted = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  return (
                    <div
                      key={step.status}
                      className={`p-2 rounded-lg text-[10px] font-bold leading-tight flex flex-col items-center justify-center gap-1 transition-colors ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200/80 text-slate-500'
                      }`}
                    >
                      <span>Step {idx + 1}</span>
                      <span className="text-[9px] font-medium hidden sm:inline">{step.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details Content */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Localisation</span>
                  <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    {selectedFault.localisation || 'Non précisée'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Date du Signalement</span>
                  <span className="font-medium text-slate-800 block mt-0.5">
                    {new Date(selectedFault.dateSignalement).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase mb-1">Description de la Panne</span>
                <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-mono text-[11px]">
                  {selectedFault.description}
                </p>
              </div>

              {/* ACTION CONTROLS BASED ON WORKFLOW STEP & ROLE */}
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Action requise à cette étape :</span>
                  </h4>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    {WORKFLOW_STEPS[currentStepIdx].roleNeeded}
                  </span>
                </div>

                {/* Comment box for transition */}
                {currentStepIdx < 4 && (
                  <div>
                    <input
                      type="text"
                      value={actionComment}
                      onChange={(e) => setActionComment(e.target.value)}
                      placeholder="Commentaire de transmission / note d'intervention (optionnel)..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* BUTTONS BY STEP */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Step 1 -> Step 2 (Superviseur Niv 1) */}
                  {currentStepIdx === 0 && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceWorkflow('Transmise au mécanicien')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Transmettre au Mécanicien (Superviseur Niv 1)</span>
                    </button>
                  )}

                  {/* Step 2 -> Step 3 (Mécanicien) */}
                  {currentStepIdx === 1 && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceWorkflow('En cours de réparation')}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>Démarrer les travaux / Diagnostic (Mécanicien)</span>
                    </button>
                  )}

                  {/* Step 3 -> Step 4 (Mécanicien finish & invoice) */}
                  {currentStepIdx === 2 && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleAdvanceWorkflow('Réparée — en attente de clôture')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Saisir fin travaux & Demander Clôture</span>
                      </button>

                      {onOpenCreateInvoiceForFault && (
                        <button
                          type="button"
                          onClick={() => onOpenCreateInvoiceForFault(selectedFault)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span>Créer Facture Atelier (FCFA)</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Step 4 -> Step 5 (Superviseur Niv 2 / Clôture) */}
                  {currentStepIdx === 3 && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceWorkflow('Clôturée par superviseur')}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Valider & Clôturer la Panne (Superviseur Niv 2)</span>
                    </button>
                  )}

                  {currentStepIdx === 4 && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Panne entièrement résolue et clôturée en administration.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* TIMESTAMPTED AUDIT LOG (HISTORY) */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-blue-600" />
                  <span>Historique des Actions Horodatées</span>
                </span>

                <div className="space-y-2 border-l-2 border-blue-200 pl-3 ml-1">
                  {selectedFault.history && selectedFault.history.length > 0 ? (
                    selectedFault.history.map((entry) => (
                      <div key={entry.id} className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono">
                          <span className="font-semibold text-slate-800">{entry.actorName} ({entry.actorRole})</span>
                          <span>{entry.timestamp}</span>
                        </div>
                        <div className="font-semibold text-blue-800 mt-0.5">{entry.status}</div>
                        {entry.comment && (
                          <div className="text-slate-600 italic text-[11px] mt-1">
                            "{entry.comment}"
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic">Aucun historique d'action supplémentaire.</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
