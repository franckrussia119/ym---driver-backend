import React from 'react';
import { Truck, User } from 'lucide-react';
import { UserProfile, WeeklyReport, FaultDeclaration } from '../types';

interface DriverQuickAppDashboardProps {
  currentUser: UserProfile;
  report: WeeklyReport;
  faults: FaultDeclaration[];
  onOpenDeclareFault: () => void;
  onGoToReport: () => void;
  hasDefects: boolean;
}

export const DriverQuickAppDashboard: React.FC<DriverQuickAppDashboardProps> = ({
  currentUser,
  report,
}) => {
  const driverPhoto = currentUser.driverPhotoUrl || report.driverInfo.driverPhotoUrl;
  const truckPhoto = currentUser.truckPhotoUrl || report.driverInfo.truckPhotoUrl;
  const immat = report.driverInfo.immatriculation || currentUser.camionAssigne || '';

  return (
    <div className="mb-3 sm:mb-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-xl p-3 sm:p-4 shadow-lg border border-blue-900/40 relative overflow-hidden">
      {/* Background Subtle Truck Pattern Overlay */}
      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-4 translate-y-4">
        <Truck className="w-36 h-36 text-blue-400" />
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Driver & Vehicle Greeting */}
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-400/30 uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Espace Chauffeur
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>

          <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
            Bonjour, {currentUser.name}
          </h2>
        </div>

        {/* Small Rounded Boxes with Driver Photo & Truck Photo */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Driver Photo Box */}
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 p-1.5 rounded-xl shadow-xs">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-900 border border-slate-600 overflow-hidden flex items-center justify-center shrink-0">
              {driverPhoto ? (
                <img src={driverPhoto} alt="Chauffeur" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="pr-1 text-left min-w-[65px]">
              <span className="text-[8px] uppercase font-bold text-slate-400 block leading-tight">Chauffeur</span>
              <span className="text-[11px] font-bold text-white truncate block max-w-[80px]">
                {currentUser.name.split(' ')[0]}
              </span>
            </div>
          </div>

          {/* Truck Photo Box */}
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 p-1.5 rounded-xl shadow-xs">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-900 border border-slate-600 overflow-hidden flex items-center justify-center shrink-0">
              {truckPhoto ? (
                <img src={truckPhoto} alt="Camion" className="w-full h-full object-cover" />
              ) : (
                <Truck className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div className="pr-1 text-left min-w-[65px]">
              <span className="text-[8px] uppercase font-bold text-slate-400 block leading-tight">Camion</span>
              <span className="text-[11px] font-bold text-amber-300 font-mono truncate block max-w-[80px]">
                {immat}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

