import React from 'react';
import {
  Home,
  FileCheck,
  AlertTriangle,
  Wrench,
  Truck,
  CheckCircle2,
  Star,
  FileText,
  Users,
} from 'lucide-react';
import { SidebarTab } from './Sidebar';
import { UserProfile } from '../types';

interface MobileBottomNavProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  currentUser: UserProfile | null;
  onOpenDeclareFault?: () => void;
  faultsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenDeclareFault,
  faultsCount = 0,
}) => {
  const role = currentUser?.role || 'CHAUFFEUR';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 text-slate-400 px-1 py-1.5 shadow-2xl lg:hidden">
      <div className="flex items-center justify-around max-w-lg mx-auto gap-0.5 overflow-x-auto no-scrollbar">
        {/* CHAUFFEUR MOBILE / TABLET MENU */}
        {role === 'CHAUFFEUR' && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('driver_mobile_app')}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                activeTab === 'driver_mobile_app'
                  ? 'text-blue-400 font-bold bg-slate-800/90 scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <Truck className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] whitespace-nowrap">Portail</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('driver_vehicle')}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                activeTab === 'driver_vehicle'
                  ? 'text-blue-400 font-bold bg-slate-800/90 scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] whitespace-nowrap">Rapport</span>
            </button>

            {/* Floating Declare Fault Action Button */}
            {onOpenDeclareFault && (
              <button
                type="button"
                onClick={onOpenDeclareFault}
                className="flex flex-col items-center justify-center bg-gradient-to-tr from-rose-600 to-rose-500 text-white rounded-full p-2.5 shadow-lg shadow-rose-600/40 border-2 border-slate-900 active:scale-95 transition-transform shrink-0 cursor-pointer"
                title="Déclarer une Panne"
              >
                <AlertTriangle className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('faults_workflow')}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
                activeTab === 'faults_workflow'
                  ? 'text-amber-400 font-bold bg-slate-800/90 scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <Wrench className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] whitespace-nowrap">Pannes</span>
              {faultsCount > 0 && (
                <span className="absolute top-0 right-1 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center">
                  {faultsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('proof_of_delivery')}
              className={`flex flex-col items-center justify-center min-w-[50px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                activeTab === 'proof_of_delivery'
                  ? 'text-emerald-400 font-bold bg-slate-800/90 scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] whitespace-nowrap">POD</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customer_feedback')}
              className={`flex flex-col items-center justify-center min-w-[50px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                activeTab === 'customer_feedback'
                  ? 'text-amber-400 font-bold bg-slate-800/90 scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <Star className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] whitespace-nowrap">Retour</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('driver_history')}
              className={`flex flex-col items-center justify-center min-w-[50px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                activeTab === 'driver_history'
                  ? 'text-blue-400 font-bold bg-slate-800/90 scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <FileText className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] whitespace-nowrap">Historique</span>
            </button>
          </>
        )}

        {/* MECANICIEN MOBILE / TABLET MENU */}
        {role === 'MECANICIEN' && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('faults_workflow')}
              className={`flex flex-col items-center justify-center min-w-[70px] py-1 px-2 rounded-xl transition-all cursor-pointer relative ${
                activeTab === 'faults_workflow'
                  ? 'text-amber-400 font-bold bg-slate-800/90 scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <Wrench className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] whitespace-nowrap">Pannes</span>
              {faultsCount > 0 && (
                <span className="absolute top-0 right-2 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center">
                  {faultsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mechanic_invoices')}
              className={`flex flex-col items-center justify-center min-w-[70px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'mechanic_invoices'
                  ? 'text-blue-400 font-bold bg-slate-800/90 scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <FileText className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] whitespace-nowrap">Factures Atelier</span>
            </button>
          </>
        )}

        {/* ADMIN, SUPER_ADMIN & SUPERVISEUR MOBILE / TABLET MENU */}
        {(role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPERVISEUR') && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('routes_overview')}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                activeTab === 'routes_overview'
                  ? 'text-blue-400 font-bold bg-slate-800/90 scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <Home className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] whitespace-nowrap">Dispatch</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('driver_vehicle')}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                activeTab === 'driver_vehicle'
                  ? 'text-blue-400 font-bold bg-slate-800/90 scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] whitespace-nowrap">Rapport</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fleet_registry')}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                activeTab === 'fleet_registry' ||
                activeTab === 'preventive_maintenance' ||
                activeTab === 'route_planning_fuel' ||
                activeTab === 'container_cautions'
                  ? 'text-blue-400 font-bold bg-slate-800/90 scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <Truck className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] whitespace-nowrap">Flotte</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('proof_of_delivery')}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                activeTab === 'proof_of_delivery'
                  ? 'text-emerald-400 font-bold bg-slate-800/90 scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] whitespace-nowrap">POD</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customer_feedback')}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                activeTab === 'customer_feedback'
                  ? 'text-amber-400 font-bold bg-slate-800/90 scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <Star className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] whitespace-nowrap">Avis</span>
            </button>

            {role === 'SUPER_ADMIN' && (
              <button
                type="button"
                onClick={() => setActiveTab('superadmin_users')}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'superadmin_users'
                    ? 'text-purple-400 font-bold bg-slate-800/90 scale-105'
                    : 'hover:text-slate-200'
                }`}
              >
                <Users className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] whitespace-nowrap">S.Admin</span>
              </button>
            )}
          </>
        )}
      </div>
    </nav>
  );
};
