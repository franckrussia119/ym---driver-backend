import React from 'react';
import {
  Package,
  Users,
  RotateCcw,
  BarChart3,
  LogOut,
  Truck,
  PackageCheck,
} from 'lucide-react';
import { UserProfile } from '../types';
import { SidebarTab } from './Sidebar';

interface ContainerSidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
}

const NAV_ITEMS: { tab: SidebarTab; label: string; icon: React.ElementType; colors: { active: string; iconIdle: string; dot: string } }[] = [
  {
    tab: 'container_registry',
    label: 'Registre des Conteneurs',
    icon: Package,
    colors: { active: 'bg-blue-600 text-white shadow-sm shadow-blue-900/30', iconIdle: 'text-blue-400', dot: 'bg-blue-500' },
  },
  {
    tab: 'subcontractor_drivers',
    label: 'Chauffeurs Sous-traitants',
    icon: Truck,
    colors: { active: 'bg-amber-600 text-white shadow-sm shadow-amber-900/30', iconIdle: 'text-amber-400', dot: 'bg-amber-500' },
  },
  {
    tab: 'container_delivery',
    label: 'Preuve de Livraison Conteneur',
    icon: PackageCheck,
    colors: { active: 'bg-teal-600 text-white shadow-sm shadow-teal-900/30', iconIdle: 'text-teal-400', dot: 'bg-teal-500' },
  },
  {
    tab: 'container_return',
    label: 'Preuve de Retour Conteneur',
    icon: RotateCcw,
    colors: { active: 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/30', iconIdle: 'text-emerald-400', dot: 'bg-emerald-500' },
  },
  {
    tab: 'container_reports',
    label: 'Rapports & Tableau de Bord',
    icon: BarChart3,
    colors: { active: 'bg-violet-600 text-white shadow-sm shadow-violet-900/30', iconIdle: 'text-violet-400', dot: 'bg-violet-500' },
  },
];

export const ContainerSidebar: React.FC<ContainerSidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
}) => {
  if (currentUser?.role !== 'SUPERVISEUR_CONTENEURS') return null;

  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-white h-full flex flex-col border-r border-slate-800">
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-black text-sm tracking-tight">YM-TRANSIT</div>
            <div className="text-[10px] text-slate-400 truncate">Gestion Conteneurs</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map(({ tab, label, icon: Icon, colors }) => {
          const isActive = activeTab === tab || (tab === 'container_registry' && activeTab === 'container_detail');
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive ? colors.active : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : colors.iconIdle}`} />
              <span className="text-left">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <div className="px-3 py-2 mb-1.5">
          <div className="text-xs font-bold text-white truncate">{currentUser?.name}</div>
          <div className="text-[10px] text-slate-400">Superviseur Conteneurs</div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-950/50 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};
