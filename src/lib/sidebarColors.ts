// Palette partagée : une couleur unique par élément de menu, utilisée à la
// fois par la barre latérale (icônes, surbrillance) et par la zone de
// travail principale (léger fond teinté correspondant à la section active).
export const SIDEBAR_TAB_COLORS: Record<string, { active: string; icon: string; workspaceBg: string }> = {
  routes_overview: { active: 'bg-blue-950/60 border-blue-500', icon: 'text-blue-400', workspaceBg: 'bg-blue-50/40' },
  fleet_registry: { active: 'bg-emerald-950/60 border-emerald-500', icon: 'text-emerald-400', workspaceBg: 'bg-emerald-50/40' },
  preventive_maintenance: { active: 'bg-orange-950/60 border-orange-500', icon: 'text-orange-400', workspaceBg: 'bg-orange-50/40' },
  faults_workflow: { active: 'bg-rose-950/60 border-rose-500', icon: 'text-rose-400', workspaceBg: 'bg-rose-50/40' },
  mechanic_invoices: { active: 'bg-amber-950/60 border-amber-500', icon: 'text-amber-400', workspaceBg: 'bg-amber-50/40' },
  container_cautions: { active: 'bg-cyan-950/60 border-cyan-500', icon: 'text-cyan-400', workspaceBg: 'bg-cyan-50/40' },
  route_planning_fuel: { active: 'bg-lime-950/60 border-lime-500', icon: 'text-lime-400', workspaceBg: 'bg-lime-50/40' },
  driver_performance: { active: 'bg-violet-950/60 border-violet-500', icon: 'text-violet-400', workspaceBg: 'bg-violet-50/40' },
  driver_analysis: { active: 'bg-indigo-950/60 border-indigo-500', icon: 'text-indigo-400', workspaceBg: 'bg-indigo-50/40' },
  driver_mobile_app: { active: 'bg-sky-950/60 border-sky-500', icon: 'text-sky-400', workspaceBg: 'bg-sky-50/40' },
  barcode_scan: { active: 'bg-fuchsia-950/60 border-fuchsia-500', icon: 'text-fuchsia-400', workspaceBg: 'bg-fuchsia-50/40' },
  customer_feedback: { active: 'bg-pink-950/60 border-pink-500', icon: 'text-pink-400', workspaceBg: 'bg-pink-50/40' },
  realtime_eta: { active: 'bg-teal-950/60 border-teal-500', icon: 'text-teal-400', workspaceBg: 'bg-teal-50/40' },
  hazmat_routing: { active: 'bg-red-950/60 border-red-500', icon: 'text-red-400', workspaceBg: 'bg-red-50/40' },
  superadmin_users: { active: 'bg-purple-950/60 border-purple-500', icon: 'text-purple-400', workspaceBg: 'bg-purple-50/40' },
  container_return: { active: 'bg-emerald-950/60 border-emerald-500', icon: 'text-emerald-400', workspaceBg: 'bg-emerald-50/40' },
  // Écrans du module Conteneurs (Superviseur Conteneurs) — mêmes couleurs
  // que dans ContainerSidebar, pour une identité visuelle cohérente.
  container_registry: { active: 'bg-blue-950/60 border-blue-500', icon: 'text-blue-400', workspaceBg: 'bg-blue-50/40' },
  container_delivery: { active: 'bg-emerald-950/60 border-emerald-500', icon: 'text-emerald-400', workspaceBg: 'bg-emerald-50/40' },
  container_detail: { active: 'bg-blue-950/60 border-blue-500', icon: 'text-blue-400', workspaceBg: 'bg-blue-50/40' },
  subcontractor_drivers: { active: 'bg-amber-950/60 border-amber-500', icon: 'text-amber-400', workspaceBg: 'bg-amber-50/40' },
  container_reports: { active: 'bg-violet-950/60 border-violet-500', icon: 'text-violet-400', workspaceBg: 'bg-violet-50/40' },
};

export function getWorkspaceBg(tab: string): string {
  return SIDEBAR_TAB_COLORS[tab]?.workspaceBg ?? '';
}
