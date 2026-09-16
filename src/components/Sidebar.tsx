import React, { useState } from 'react';
import {
  Truck,
  Calendar,
  Route,
  Box,
  MessageSquare,
  Bell,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Menu,
  X,
  Smartphone,
  ShieldCheck,
  QrCode,
  Star,
  Navigation,
  Globe,
  AlertTriangle,
  Wrench,
  Users,
  LogOut,
  RotateCcw
} from 'lucide-react';
import { UserProfile } from '../types';
import { SIDEBAR_TAB_COLORS } from '../lib/sidebarColors';

export type SidebarTab =
  | 'planning_auto' // 1. Planification automatisée
  | 'driver_vehicle' // 2. Conducteur et véhicule (Rapport hebdo, DVIR)
  | 'orders_tasks' // 3. Commande et tâche
  | 'realtime_eta' // 4. Suivi en temps réel et ETA
  | 'customer_tracking' // 5. Suivi des commandes en temps réel
  | 'driver_mobile_app' // 6. Application mobile pour les conducteurs
  | 'proof_of_delivery' // 7. Preuve de livraison (POD)
  | 'barcode_scan' // 8. Scan de codes-barres
  | 'customer_feedback' // 9. Retour client
  | 'route_modification' // 10. Modification d'itinéraire en temps réel
  | 'hazmat_routing' // 11. Itinéraires pour camions et matières dangereuses
  | 'commercial_nav' // 12. Navigation pour camions commerciaux
  | 'routes_overview' // Main dispatch view
  | 'faults_workflow' // Pannes & réparations
  | 'mechanic_invoices' // Factures atelier
  | 'superadmin_users' // Gestion admin
  | 'fleet_registry' // Registre Flotte & Docs
  | 'preventive_maintenance' // Maintenance Préventive
  | 'container_cautions' // Suivi Cautions Conteneurs
  | 'route_planning_fuel' // Route planning & Fuel
  | 'driver_performance' // Performance Chauffeurs
  | 'driver_analysis' // Analyse détaillée par chauffeur (nouveau)
  | 'driver_history' // Historique Chauffeur (POD, Rapports, Avis)
  // --- Module Gestion des Conteneurs (Superviseur Conteneurs) ---
  | 'container_registry'
  | 'container_delivery'
  | 'container_detail'
  | 'subcontractor_drivers'
  | 'container_return'
  | 'container_reports';


interface SidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  notificationCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  notificationCount = 7,
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    fleet: true,
    operations: true,
    navigation: true,
  });

  // SIDEBAR VISIBILITY : Admin, Super Admin et Superviseur (supervision de
  // flotte). Chauffeur et Mécanicien utilisent leurs propres menus mobiles
  // dédiés (voir MobileBottomNav), plus simples pour un usage terrain.
  //
  // IMPORTANT : ce retour anticipé doit rester APRÈS tous les hooks
  // ci-dessus. Le placer avant provoque un nombre de hooks différent d'un
  // rendu à l'autre dès que le rôle de l'utilisateur change (ex: changement
  // de compte dans la même session), ce qui fait planter React entièrement
  // (écran blanc). Ne jamais réintroduire un `return` avant un hook.
  const canSeeSidebar =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'SUPERVISEUR';
  if (!canSeeSidebar) {
    return null;
  }

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const navClass = (tab: SidebarTab) => {
    const color = SIDEBAR_TAB_COLORS[tab as string];
    return `w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
      activeTab === tab
        ? `${color?.active ?? 'bg-slate-800 border-blue-500'} text-white font-semibold border-l-3`
        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
    }`;
  };

  // Couleur de l'icône : toujours sa couleur propre, active ou non — c'est
  // elle qui porte l'identité visuelle de chaque sous-menu.
  const navIconColor = (tab: SidebarTab) => SIDEBAR_TAB_COLORS[tab as string]?.icon ?? 'text-slate-400';

  return (
    <>
      {/* Mobile Toggle Bar */}
      <div className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide block leading-none">Logistics</span>
            <span className="text-[10px] text-slate-400 font-medium">YM-TRANSIT</span>
          </div>
        </div>

        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="p-2 text-slate-300 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
        >
          {isOpenMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Sidebar Container (Solid Uniform Dark Shade) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Branding (Clean & Solid) */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white">
                Logistics
              </h1>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide block">
                YM-TRANSIT Fleet
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpenMobile(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zone d'opération — Cameroun / Afrique Centrale, un seul fuseau horaire */}
        <div className="px-3 py-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs text-slate-200">
            <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-white text-xs font-medium">Cameroun & Afrique Centrale (GMT +01:00)</span>
          </div>
        </div>


        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          
          {/* Main Dispatch Routes Overview */}
          <button
            onClick={() => {
              setActiveTab('routes_overview');
              setIsOpenMobile(false);
            }}
            className={navClass('routes_overview')}
          >
            <div className="flex items-center space-x-2.5">
              <Route className={`w-4 h-4 ${navIconColor('routes_overview')}`} />
              <span>Itinéraires & Routes</span>
            </div>
          </button>

          {/* SECTION 2: CONDUCTEUR & FLOTTE */}
          <div className="space-y-1">
            <button
              onClick={() => toggleGroup('fleet')}
              className="w-full flex items-center justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wider px-2 py-1 hover:text-slate-200 cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>Conducteur & Flotte</span>
              </div>
              {expandedGroups.fleet ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {expandedGroups.fleet && (
              <div className="space-y-0.5 pl-2 border-l border-slate-800 ml-2">
                <button
                  onClick={() => {
                    setActiveTab('fleet_registry');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('fleet_registry')}
                >
                  <div className="flex items-center space-x-2">
                    <Truck className={`w-3.5 h-3.5 ${navIconColor('fleet_registry')}`} />
                    <span>Registre Flotte & Docs</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('preventive_maintenance');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('preventive_maintenance')}
                >
                  <div className="flex items-center space-x-2">
                    <Wrench className={`w-3.5 h-3.5 ${navIconColor('preventive_maintenance')}`} />
                    <span>Maintenance Préventive</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('faults_workflow');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('faults_workflow')}
                >
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className={`w-3.5 h-3.5 ${navIconColor('faults_workflow')}`} />
                    <span>Pannes & Signalements</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('mechanic_invoices');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('mechanic_invoices')}
                >
                  <div className="flex items-center space-x-2">
                    <Wrench className={`w-3.5 h-3.5 ${navIconColor('mechanic_invoices')}`} />
                    <span>Factures Mécanicien</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('container_cautions');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('container_cautions')}
                >
                  <div className="flex items-center space-x-2">
                    <Box className={`w-3.5 h-3.5 ${navIconColor('container_cautions')}`} />
                    <span>Suivi Cautions Conteneurs</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('route_planning_fuel');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('route_planning_fuel')}
                >
                  <div className="flex items-center space-x-2">
                    <Route className={`w-3.5 h-3.5 ${navIconColor('route_planning_fuel')}`} />
                    <span>Optimisation & Carburant</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('driver_performance');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('driver_performance')}
                >
                  <div className="flex items-center space-x-2">
                    <Star className={`w-3.5 h-3.5 ${navIconColor('driver_performance')}`} />
                    <span>Score & Performance</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('driver_analysis');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('driver_analysis')}
                >
                  <div className="flex items-center space-x-2">
                    <Users className={`w-3.5 h-3.5 ${navIconColor('driver_analysis')}`} />
                    <span>Analyse par Chauffeur</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 3: COMMANDES & LIVRAISONS */}
          <div className="space-y-1">
            <button
              onClick={() => toggleGroup('operations')}
              className="w-full flex items-center justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wider px-2 py-1 hover:text-slate-200 cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Box className="w-3.5 h-3.5 text-slate-400" />
                <span>Commandes & Livraisons</span>
              </div>
              {expandedGroups.operations ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {expandedGroups.operations && (
              <div className="space-y-0.5 pl-2 border-l border-slate-800 ml-2">
                <button
                  onClick={() => {
                    setActiveTab('driver_mobile_app');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('driver_mobile_app')}
                >
                  <div className="flex items-center space-x-2">
                    <Smartphone className={`w-3.5 h-3.5 ${navIconColor('driver_mobile_app')}`} />
                    <span>App Mobile Chauffeur</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('barcode_scan');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('barcode_scan')}
                >
                  <div className="flex items-center space-x-2">
                    <QrCode className={`w-3.5 h-3.5 ${navIconColor('barcode_scan')}`} />
                    <span>Scan de codes-barres</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('customer_feedback');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('customer_feedback')}
                >
                  <div className="flex items-center space-x-2">
                    <Star className={`w-3.5 h-3.5 ${navIconColor('customer_feedback')}`} />
                    <span>Retour client</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('container_return');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('container_return')}
                >
                  <div className="flex items-center space-x-2">
                    <RotateCcw className={`w-3.5 h-3.5 ${navIconColor('container_return')}`} />
                    <span>Preuve de Retour Conteneur</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 4: NAVIGATION & ITINÉRAIRES */}
          <div className="space-y-1">
            <button
              onClick={() => toggleGroup('navigation')}
              className="w-full flex items-center justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wider px-2 py-1 hover:text-slate-200 cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Navigation className="w-3.5 h-3.5 text-slate-400" />
                <span>GPS & Suivi ETA</span>
              </div>
              {expandedGroups.navigation ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {expandedGroups.navigation && (
              <div className="space-y-0.5 pl-2 border-l border-slate-800 ml-2">
                <button
                  onClick={() => {
                    setActiveTab('realtime_eta');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('realtime_eta')}
                >
                  <div className="flex items-center space-x-2">
                    <Navigation className={`w-3.5 h-3.5 ${navIconColor('realtime_eta')}`} />
                    <span>Suivi temps réel & ETA</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('hazmat_routing');
                    setIsOpenMobile(false);
                  }}
                  className={navClass('hazmat_routing')}
                >
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className={`w-3.5 h-3.5 ${navIconColor('hazmat_routing')}`} />
                    <span>Poids lourd & Hazmat</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* OTHER UTILITY LINKS */}
          <div className="pt-2 border-t border-slate-800 space-y-1">
            <button
              onClick={() => {
                setActiveTab('superadmin_users');
                setIsOpenMobile(false);
              }}
              className={navClass('superadmin_users')}
            >
              <div className="flex items-center space-x-2.5">
                <Users className={`w-4 h-4 ${navIconColor('superadmin_users')}`} />
                <span>Utilisateurs & Rôles</span>
              </div>
            </button>

            <div className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg cursor-pointer">
              <div className="flex items-center space-x-2.5">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                <span>Messagerie</span>
              </div>
            </div>

            <div className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg cursor-pointer">
              <div className="flex items-center space-x-2.5">
                <Bell className="w-4 h-4 text-slate-400" />
                <span>Notifications</span>
              </div>
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {notificationCount}
              </span>
            </div>
          </div>
        </div>

        {/* User Account / Profile Box at bottom */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden">
                {currentUser?.driverPhotoUrl ? (
                  <img src={currentUser.driverPhotoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name ? currentUser.name.charAt(0) : 'U'
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {currentUser ? currentUser.name : 'Chauffeur / Admin'}
                </p>
                <p className="text-[10px] text-slate-400 font-normal truncate">
                  {currentUser ? currentUser.role : 'Cliquer pour Se Connecter'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (window.confirm('Se déconnecter de votre session ?')) onLogout();
              }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4 text-blue-400" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
