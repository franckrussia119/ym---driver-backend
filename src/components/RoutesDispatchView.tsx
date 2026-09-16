import React, { useState } from 'react';
import { RouteWaypoint, RouteMap } from './RouteMap';
import {
  Truck,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  Home,
  Navigation,
  XCircle,
  FileText,
  Search,
} from 'lucide-react';

// Aucune tournée fictive : la liste démarre vide. Les arrêts réels
// proviennent de la planification (voir module "Planification") ou d'une
// saisie manuelle par l'Administration/Superviseur.
export const INITIAL_DISPATCH_WAYPOINTS: RouteWaypoint[] = [];

interface RoutesDispatchViewProps {
  onOpenMobileView?: () => void;
  onOpenPODModal?: (waypointName: string) => void;
}

export const RoutesDispatchView: React.FC<RoutesDispatchViewProps> = ({
  onOpenMobileView,
  onOpenPODModal,
}) => {
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>(INITIAL_DISPATCH_WAYPOINTS);
  const [selectedWaypointId, setSelectedWaypointId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedWaypoint: RouteWaypoint | undefined =
    waypoints.find((w) => w.id === selectedWaypointId) ?? waypoints[0];

  const handleUpdateStatus = (id: number, newStatus: RouteWaypoint['status']) => {
    setWaypoints((prev) =>
      prev.map((wp) => (wp.id === id ? { ...wp, status: newStatus } : wp))
    );
  };

  const completedCount = waypoints.filter((w) => w.status === 'completed').length;

  return (
    <div className="space-y-5">
      {/* Discreet Page Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Itinéraires & Routes
          </h2>
          <p className="text-xs text-slate-500 font-normal">
            Suivi des tournées en temps réel, arrêts de livraison et carte de géolocalisation.
          </p>
        </div>

        {onOpenMobileView && (
          <button
            onClick={onOpenMobileView}
            className="self-start sm:self-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Vue Mobile Chauffeur</span>
          </button>
        )}
      </div>

      {/* MAIN SPLIT VIEW: ROUTES LIST & DETAILS (LEFT/CENTER) + MAP (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT / CENTER COLUMN: TABLE & SELECTED WAYPOINT DETAILS */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Dispatch Table Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            
            {/* Slim, discreet filter header */}
            <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrer par étape, adresse..."
                  className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium shrink-0">
                <span className="font-semibold text-slate-800">{completedCount}/{waypoints.length}</span> étapes complétées
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-normal text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input type="checkbox" className="rounded text-blue-600 cursor-pointer" defaultChecked />
                    </th>
                    <th className="py-2.5 px-2 w-14 text-center">Statut</th>
                    <th className="py-2.5 px-3">Nom de l'étape</th>
                    <th className="py-2.5 px-3">Adresse de livraison</th>
                    <th className="py-2.5 px-3 text-right">Heure & ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Vehicle Header Row */}
                  <tr className="bg-slate-50/60 font-semibold text-slate-800">
                    <td className="py-3 px-3 text-center">
                      <input type="checkbox" className="rounded text-blue-600 cursor-pointer" defaultChecked />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="bg-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {waypoints.length}
                      </span>
                    </td>
                    <td colSpan={2} className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-900">MAN TGE / Volvo FH 500 (AB-789-XY)</span>
                        <span className="text-slate-400 font-normal text-xs">— Tournée du jour</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500 font-mono text-[11px]">10:47 — 11:42</td>
                  </tr>

                  {/* Waypoints List Rows */}
                  {waypoints
                    .filter((wp) => wp.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((wp) => {
                      const isSelected = selectedWaypointId === wp.id;
                      return (
                        <tr
                          key={wp.id}
                          onClick={() => setSelectedWaypointId(wp.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50/80 font-medium'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rounded text-blue-600 cursor-pointer"
                              checked={wp.status === 'completed'}
                              onChange={(e) =>
                                handleUpdateStatus(
                                  wp.id,
                                  e.target.checked ? 'completed' : 'pending'
                                )
                              }
                            />
                          </td>

                          <td className="py-3.5 px-2 text-center">
                            <span
                              className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold text-white ${
                                wp.status === 'completed'
                                  ? 'bg-emerald-600'
                                  : wp.status === 'delayed'
                                  ? 'bg-rose-600'
                                  : 'bg-slate-400'
                              }`}
                            >
                              {wp.id}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 font-medium text-slate-900">
                            <div className="flex items-center gap-1.5">
                              {wp.id === 1 ? (
                                <Home className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              ) : (
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <span>{wp.name}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-slate-600 truncate max-w-[200px] text-xs">
                            {wp.address}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="font-mono text-slate-700">{wp.eta}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                  wp.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                                    : wp.status === 'delayed'
                                    ? 'bg-rose-50 text-rose-700 font-semibold'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {wp.etaOffset}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Waypoint Detail Card (Compact & Clean) */}
          {!selectedWaypoint ? (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 text-center text-sm text-slate-500">
              Aucun arrêt pour le moment. Ajoutez des commandes et lancez la planification pour voir les détails d'une tournée ici.
            </div>
          ) : (
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-xs text-slate-900">
                  Détails de l'étape : <span className="font-bold text-slate-900">{selectedWaypoint.name}</span>
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Arrêt {selectedWaypoint.id} / {waypoints.length}
              </span>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] font-normal uppercase text-slate-400 tracking-wider block mb-1">
                    Statut Actuel
                  </span>
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 text-slate-800 font-medium">
                    {selectedWaypoint.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {selectedWaypoint.status === 'delayed' && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                    {selectedWaypoint.status === 'pending' && <Clock className="w-3.5 h-3.5 text-slate-500" />}
                    <span>
                      {selectedWaypoint.status === 'completed'
                        ? 'Livré avec succès'
                        : selectedWaypoint.status === 'delayed'
                        ? 'Retard signalé (+10 min)'
                        : 'En attente de livraison'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-normal uppercase text-slate-400 tracking-wider block mb-1">
                    Adresse
                  </span>
                  <p className="text-xs font-medium text-slate-800 leading-tight">
                    {selectedWaypoint.address}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">Arrivée estimée</span>
                  <span className="text-xs font-bold font-mono text-slate-800">{selectedWaypoint.eta}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Arrivée réelle / Recalcul</span>
                  <span className="text-xs font-bold font-mono text-slate-800">
                    {selectedWaypoint.actualArrival || 'En route'}
                  </span>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedWaypoint.id, 'completed')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmer Livraison</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedWaypoint.id, 'delayed')}
                    className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-medium rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Signaler Retard</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenPODModal && (
                    <button
                      type="button"
                      onClick={() => onOpenPODModal(selectedWaypoint.name)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Preuve POD</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => alert(`Navigation GPS vers : ${selectedWaypoint.address}`)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span>GPS Nav.</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

        </div>

        {/* RIGHT COLUMN: INTERACTIVE MAP (ALWAYS VISIBLE ON DESKTOP) */}
        <div className="lg:col-span-5 h-[580px] sticky top-20">
          <div className="h-full bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                Carte d'itinéraire GPS
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Cameroun & Afrique Centrale</span>
            </div>
            <div className="flex-1 relative">
              <RouteMap
                waypoints={waypoints}
                selectedWaypointId={selectedWaypointId}
                onSelectWaypoint={setSelectedWaypointId}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
