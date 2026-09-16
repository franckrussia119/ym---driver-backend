import React, { useState, useRef, useEffect } from 'react';
import {
  Truck,
  LogOut,
  MoreVertical,
  Printer,
  Save,
  Smartphone,
  RotateCcw,
  AlertTriangle,
  Wrench,
  User,
  ShieldCheck,
  LayoutDashboard,
  Home,
  Users,
  History,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { WeeklyReport, UserProfile } from '../types';
import { SidebarTab } from './Sidebar';

export type MainViewTab = SidebarTab;

interface HeaderProps {
  report: WeeklyReport;
  currentUser: UserProfile | null;
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  onLogout: () => void;
  onOpenDeclareFault: () => void;
  onOpenCreateInvoice: () => void;
  onLoadDemo: () => void;
  onSaveDraft: () => void;
  onPrint: () => void;
  hasDefects: boolean;
  historyCount: number;
  isSmartphoneView?: boolean;
  setIsSmartphoneView?: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenDeclareFault,
  onOpenCreateInvoice,
  onLoadDemo,
  onSaveDraft,
  onPrint,
  isSmartphoneView = false,
  setIsSmartphoneView,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-xs h-14">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-4">
        
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab(currentUser?.role === 'CHAUFFEUR' ? 'driver_mobile_app' : 'routes_overview')}
            className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white cursor-pointer hover:bg-blue-500 transition-colors"
            title="Retour au Portail"
          >
            <Truck className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span
              onClick={() => setActiveTab(currentUser?.role === 'CHAUFFEUR' ? 'driver_mobile_app' : 'routes_overview')}
              className="font-bold text-sm tracking-tight text-white cursor-pointer hover:text-blue-300 transition-colors"
            >
              YM-TRANSIT
            </span>
            <span className="text-slate-500 text-xs hidden sm:inline">|</span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Logistics & Fleet</span>
          </div>
        </div>

        {/* Center: Main View Navigation (Role-based filtering) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          {/* DRIVER NAVIGATION: Portail, Rapport Hebdo, Pannes, Historique + Preuve de Livraison, Retour Client */}
          {currentUser?.role === 'CHAUFFEUR' && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('driver_mobile_app')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'driver_mobile_app'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Portail
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('driver_vehicle')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'driver_vehicle'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Rapport Hebdo
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('faults_workflow')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'faults_workflow'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Pannes
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('driver_history')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'driver_history'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Historique
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('proof_of_delivery')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'proof_of_delivery'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Preuve de Livraison</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('customer_feedback')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'customer_feedback'
                    ? 'bg-amber-500 text-slate-900 shadow-xs font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Retour Client</span>
              </button>
            </>
          )}

          {/* TECHNICIAN / MECHANIC NAVIGATION */}
          {currentUser?.role === 'MECANICIEN' && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('faults_workflow')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'faults_workflow'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Pannes & Signalements
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('mechanic_invoices')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'mechanic_invoices'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Factures Atelier
              </button>
            </>
          )}

          {/* ADMIN & SUPER ADMIN NAVIGATION */}
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('routes_overview')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'routes_overview'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Portail Dispatch
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('driver_vehicle')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'driver_vehicle'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Rapport Hebdo
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('fleet_registry')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'fleet_registry' || activeTab === 'preventive_maintenance' || activeTab === 'route_planning_fuel' || activeTab === 'container_cautions'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Gestion Flotte
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('proof_of_delivery')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'proof_of_delivery'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Preuve de Livraison
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('customer_feedback')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'customer_feedback'
                    ? 'bg-amber-500 text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Retour Client
              </button>

              {currentUser?.role === 'SUPER_ADMIN' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('superadmin_users')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === 'superadmin_users'
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  Super Admin
                </button>
              )}
            </>
          )}
        </nav>

        {/* Right: User Profile & Options Menu */}
        <div className="flex items-center gap-2">
          {/* Action Button: Declare Fault / Invoice based on role */}
          {currentUser?.role === 'CHAUFFEUR' && (
            <button
              type="button"
              onClick={onOpenDeclareFault}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Déclarer Panne</span>
            </button>
          )}

          {(currentUser?.role === 'MECANICIEN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
            <button
              type="button"
              onClick={onOpenCreateInvoice}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Facture Atelier</span>
            </button>
          )}

          {/* User Account Chip — real logout */}
          <button
            onClick={() => {
              if (window.confirm('Se déconnecter de votre session ?')) onLogout();
            }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 px-2.5 py-1 rounded-lg border border-slate-700/80 text-xs transition-colors cursor-pointer"
            title="Se déconnecter"
          >
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shrink-0">
              {currentUser?.driverPhotoUrl ? (
                <img src={currentUser.driverPhotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                currentUser?.name?.charAt(0) || 'U'
              )}
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-semibold text-white text-xs block leading-tight truncate max-w-[110px]">
                {currentUser?.name || 'Connexion'}
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                {currentUser?.role || 'Compte'}
              </span>
            </div>
            <LogOut className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Options Dropdown Menu ("...") */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Plus d'options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-slate-800 text-slate-200 rounded-xl shadow-xl border border-slate-700 py-1 z-50 text-xs animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    onSaveDraft();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-700/80 flex items-center gap-2 text-slate-200 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-blue-400" />
                  <span>Sauvegarder brouillon</span>
                </button>

                <button
                  onClick={() => {
                    onPrint();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-700/80 flex items-center gap-2 text-slate-200 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  <span>Imprimer / Exporter PDF</span>
                </button>

                {setIsSmartphoneView && (
                  <button
                    onClick={() => {
                      setIsSmartphoneView(!isSmartphoneView);
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-700/80 flex items-center gap-2 text-slate-200 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    <span>{isSmartphoneView ? 'Vue Large Web' : 'Simuler Vue Smartphone'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onLoadDemo();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-700/80 flex items-center gap-2 text-slate-200 cursor-pointer border-t border-slate-700/60 mt-1"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Réinitialiser démo</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
