import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  Lock,
  ChevronRight,
  Truck,
  UserCheck,
  Plus,
  ShieldCheck,
  History,
  Package,
  Ship,
} from 'lucide-react';
import { UserProfile, FaultDeclaration, formatFCFA } from '../types';
import { ReportListItem } from '../lib/reports';
import { Container, listContainers } from '../lib/containers';

interface DriverHomeMenuProps {
  currentUser: UserProfile | null;
  onOpenDeclareFault: () => void;
  onOpenWeeklyReport: () => void;
  driverReports: ReportListItem[];
  driverFaults: FaultDeclaration[];
  onViewReport: (reportId: string) => void;
  onViewFault: (fault: FaultDeclaration) => void;
}

export const DriverHomeMenu: React.FC<DriverHomeMenuProps> = ({
  currentUser,
  onOpenDeclareFault,
  onOpenWeeklyReport,
  driverReports,
  driverFaults,
  onViewReport,
  onViewFault,
}) => {
  // Cet écran est aussi utilisé par l'Admin/Superviseur pour prévisualiser
  // l'application mobile du chauffeur — dans ce cas, les actions
  // (déclarer une panne, remplir un rapport) doivent rester désactivées :
  // seul le chauffeur lui-même peut les effectuer.
  const isDriverViewing = currentUser?.role === 'CHAUFFEUR';

  const [assignedContainers, setAssignedContainers] = useState<Container[]>([]);
  const fetchAssignedContainers = () => {
    if (!isDriverViewing) return;
    listContainers()
      .then((all) => setAssignedContainers(all.filter((c) => c.status === 'OUVERT')))
      .catch(() => {
        /* silencieux : la section conteneurs reste vide si le chargement échoue */
      });
  };
  useEffect(() => {
    fetchAssignedContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDriverViewing]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {!isDriverViewing && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl px-4 py-2.5">
          Aperçu de l'application mobile chauffeur — lecture seule. Seul le chauffeur connecté peut déclarer une panne ou remplir son rapport.
        </div>
      )}
      {/* Driver Welcome Card */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0 ring-2 ring-blue-400/30">
            {currentUser?.driverPhotoUrl ? (
              <img src={currentUser.driverPhotoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              currentUser?.name?.charAt(0) || 'C'
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white leading-tight truncate">
              Bonjour, {currentUser?.name || 'Chauffeur'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-800/60">
                <Truck className="w-3 h-3 text-blue-400" />
                {currentUser?.camionAssigne || 'Camion non assigné'}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden sm:block text-right">
          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Espace Chauffeur</span>
          <span className="text-xs text-emerald-400 font-mono flex items-center justify-end gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Session Active
          </span>
        </div>
      </div>

      {/* TWO MAIN PRIMARY BIG TOUCH-FRIENDLY BUTTON CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* ACTION 1: DECLARE FAULT */}
        <button
          type="button"
          disabled={!isDriverViewing}
          onClick={onOpenDeclareFault}
          className="group relative bg-white hover:bg-rose-50/50 disabled:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed p-5 rounded-2xl border-2 border-slate-200 hover:border-rose-500 shadow-sm transition-all duration-200 text-left cursor-pointer flex flex-col justify-between min-h-[140px] active:scale-[0.99]"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-rose-100 text-slate-400 group-hover:text-rose-600 flex items-center justify-center transition-colors">
              <Plus className="w-4 h-4" />
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
              Déclarer une Panne
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Signaler un problème mécanique, pneu, frein ou panne sur votre véhicule.
            </p>
          </div>
        </button>

        {/* ACTION 2: WEEKLY REPORT */}
        <button
          type="button"
          disabled={!isDriverViewing}
          onClick={onOpenWeeklyReport}
          className="group relative bg-white hover:bg-blue-50/50 disabled:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-600 shadow-sm transition-all duration-200 text-left cursor-pointer flex flex-col justify-between min-h-[140px] active:scale-[0.99]"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <span className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition-colors">
              <Plus className="w-4 h-4" />
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
              Rapport Hebdomadaire
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Remplir la fiche de contrôle, trajets, frais de route (FCFA) et signatures.
            </p>
          </div>
        </button>
      </div>

      {/* PERSONAL DRIVER HISTORY SECTION */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Mon Historique Personnel</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {driverReports.length + driverFaults.length} activité(s)
          </span>
        </div>

        {/* CONTENEURS ASSIGNÉS */}
        {isDriverViewing && assignedContainers.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Conteneurs Assignés — À Livrer
            </h4>
            {assignedContainers.map((c) => (
              <div
                key={c.id}
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">{c.containerNumber}</span>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Ship className="w-3 h-3" />
                        <span>{c.port === 'Douala' ? 'PAD' : 'PAK'} · {c.terminal} · {c.size}'</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-lg shrink-0">
                    BL {c.blNumber}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2.5">
                  Rendez-vous dans "Preuve de Livraison" pour livrer ce conteneur.
                </p>
              </div>
            ))}
          </div>
        )}

        {/* SUBMITTED WEEKLY REPORTS */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Rapports Hebdomadaires
          </h4>

          {driverReports.length === 0 ? (
            <div className="bg-slate-50 p-4 rounded-xl text-center text-xs text-slate-500 border border-slate-200">
              Aucun rapport hebdomadaire soumis pour le moment.
            </div>
          ) : (
            driverReports.map((rpt) => (
              <div
                key={rpt.id}
                onClick={() => onViewReport(rpt.id)}
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        Rapport du {rpt.semaineDu || 'N/A'} au {rpt.semaineAu || 'N/A'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{rpt.tripCount || 0} trajet(s)</span>
                      <span>·</span>
                      <span>{rpt.immatriculation || 'Poids Lourd'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {rpt.isSubmitted ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <Lock className="w-3 h-3 text-emerald-600" />
                      Envoyé — non modifiable
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Brouillon
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* SUBMITTED FAULT DECLARATIONS */}
        <div className="space-y-2.5 pt-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pannes & Signalements
          </h4>

          {driverFaults.length === 0 ? (
            <div className="bg-slate-50 p-4 rounded-xl text-center text-xs text-slate-500 border border-slate-200">
              Aucune panne signalée pour le moment.
            </div>
          ) : (
            driverFaults.map((fault) => (
              <div
                key={fault.id}
                onClick={() => onViewFault(fault)}
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {fault.categorie} - {fault.immatriculation}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {fault.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                    <Lock className="w-3 h-3 text-slate-500" />
                    {fault.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
