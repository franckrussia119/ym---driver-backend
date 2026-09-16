import React from 'react';
import { TripLogEntry, TripStats, ContainerType, formatFCFA } from '../types';
import { Plus, Trash2, Route, Fuel, DollarSign, Box, Lock } from 'lucide-react';

interface Section2TripsLogProps {
  trips?: TripLogEntry[];
  tripStats?: TripStats;
  onTripsChange?: (updated: TripLogEntry[]) => void;
  onUpdateTrips?: (updated: TripLogEntry[]) => void;
  onStatsChange?: (updated: TripStats) => void;
  onUpdateTripStats?: (updated: TripStats) => void;
  isSubmitted?: boolean;
}

export const Section2TripsLog: React.FC<Section2TripsLogProps> = ({
  trips = [],
  tripStats = { totalEnlevesPort: 0, totalLivresDestinataire: 0, conteneursVidesRetournes: 0 },
  onTripsChange,
  onUpdateTrips,
  onStatsChange,
  onUpdateTripStats,
  isSubmitted = false,
}) => {
  const notifyTripsChange = (updated: TripLogEntry[]) => {
    if (onTripsChange) onTripsChange(updated);
    if (onUpdateTrips) onUpdateTrips(updated);
  };

  const notifyStatsChange = (updated: TripStats) => {
    if (onStatsChange) onStatsChange(updated);
    if (onUpdateTripStats) onUpdateTripStats(updated);
  };

  const handleTripChange = (id: string, field: keyof TripLogEntry, value: any) => {
    const updated = trips.map((t) => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    });
    notifyTripsChange(updated);
  };

  const addTrip = () => {
    const newTrip: TripLogEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      client: '',
      noConteneurBL: '',
      typeConteneur: '40',
      depart: '',
      destination: '',
      kmParcourus: 0,
      carburantL: 0,
      fraisRoute: 0,
    };
    notifyTripsChange([...trips, newTrip]);
  };

  const removeTrip = (id: string) => {
    if (trips.length <= 1) {
      notifyTripsChange([]);
      return;
    }
    notifyTripsChange(trips.filter((t) => t.id !== id));
  };

  // Calculations
  const totalKm = trips.reduce((acc, t) => acc + (Number(t.kmParcourus) || 0), 0);
  const totalFuel = trips.reduce((acc, t) => acc + (Number(t.carburantL) || 0), 0);
  const totalFrais = trips.reduce((acc, t) => acc + (Number(t.fraisRoute) || 0), 0);
  const fuelConsumption = totalKm > 0 ? ((totalFuel / totalKm) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Section Header */}
      <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white font-bold text-xs px-2.5 py-1 rounded">SECTION 2</span>
          <h2 className="font-semibold text-sm sm:text-base tracking-wide">Journal Quotidien des Trajets</h2>
        </div>
        <button
          type="button"
          onClick={addTrip}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Ajouter un trajet
        </button>
      </div>

      {/* Trips Table - DESKTOP VIEW ONLY (md and above) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <th className="py-2.5 px-3 w-12 text-center">N°</th>
              <th className="py-2.5 px-3 w-32">Date</th>
              <th className="py-2.5 px-3">Client</th>
              <th className="py-2.5 px-3">N° Conteneur / BL</th>
              <th className="py-2.5 px-3 w-28">Type</th>
              <th className="py-2.5 px-3">Départ</th>
              <th className="py-2.5 px-3">Destination</th>
              <th className="py-2.5 px-3 w-24 text-right">Km</th>
              <th className="py-2.5 px-3 w-24 text-right">Carburant (L)</th>
              <th className="py-2.5 px-3 w-32 text-right">Frais (FCFA)</th>
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {trips.map((trip, idx) => {
              const locked = !!trip.source && trip.source !== 'MANUEL';
              const lockedLabel = trip.source === 'POD' ? 'Preuve de Livraison' : trip.source === 'RETOUR_CONTENEUR' ? 'Retour Conteneur Vide' : '';
              return (
              <tr key={trip.id} className={`transition-colors ${locked ? 'bg-slate-50/80' : 'hover:bg-slate-50'}`}>
                <td className="py-2 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                <td className="py-2 px-2">
                  <input
                    type="date"
                    value={trip.date}
                    disabled={locked}
                    onChange={(e) => handleTripChange(trip.id, 'date', e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    value={trip.client}
                    disabled={locked}
                    onChange={(e) => handleTripChange(trip.id, 'client', e.target.value)}
                    placeholder="Nom du client"
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                  {locked && <span className="text-[9px] font-bold text-blue-600 flex items-center gap-0.5 mt-0.5"><Lock className="w-2.5 h-2.5" />{lockedLabel}</span>}
                </td>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    value={trip.noConteneurBL}
                    disabled={locked}
                    onChange={(e) => handleTripChange(trip.id, 'noConteneurBL', e.target.value)}
                    placeholder="Conteneur / BL"
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="py-2 px-2">
                  <select
                    value={trip.typeConteneur}
                    disabled={locked}
                    onChange={(e) => handleTripChange(trip.id, 'typeConteneur', e.target.value as ContainerType)}
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="20">20'</option>
                    <option value="40">40'</option>
                    <option value="Reefer">Reefer</option>
                    <option value="Autre">Autre</option>
                  </select>
                </td>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    value={trip.depart}
                    disabled={locked}
                    onChange={(e) => handleTripChange(trip.id, 'depart', e.target.value)}
                    placeholder="Ville / Dépôt"
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    value={trip.destination}
                    disabled={locked}
                    onChange={(e) => handleTripChange(trip.id, 'destination', e.target.value)}
                    placeholder="Destination"
                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    min="0"
                    value={trip.kmParcourus || ''}
                    disabled={locked}
                    onChange={(e) => handleTripChange(trip.id, 'kmParcourus', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-2 py-1 text-xs text-right font-medium bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    min="0"
                    value={trip.carburantL || ''}
                    disabled={locked}
                    onChange={(e) => handleTripChange(trip.id, 'carburantL', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-2 py-1 text-xs text-right font-medium bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    min="0"
                    value={trip.fraisRoute || ''}
                    disabled={locked}
                    onChange={(e) => handleTripChange(trip.id, 'fraisRoute', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-2 py-1 text-xs text-right font-medium bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="py-2 px-2 text-center">
                  {locked ? (
                    <span className="p-1 text-blue-400 inline-flex" title={`Rempli automatiquement — ${lockedLabel}`}>
                      <Lock className="w-4 h-4" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeTrip(trip.id)}
                      disabled={trips.length <= 1}
                      className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
          {/* TOTAL Row */}
          <tfoot>
            <tr className="bg-slate-100 font-bold text-xs text-slate-800 border-t-2 border-slate-300">
              <td colSpan={7} className="py-3 px-4 text-right uppercase tracking-wider text-slate-600">
                TOTAL HEBDOMADAIRE :
              </td>
              <td className="py-3 px-3 text-right text-blue-900 font-mono text-sm">{totalKm} km</td>
              <td className="py-3 px-3 text-right text-blue-900 font-mono text-sm">{totalFuel} L</td>
              <td className="py-3 px-3 text-right text-emerald-700 font-mono text-sm">{formatFCFA(totalFrais)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Trips Native Mobile Cards - MOBILE VIEW ONLY (hidden on md and above) */}
      <div className="block md:hidden p-3 space-y-3 bg-slate-100/70">
        {trips.map((trip, idx) => {
          const locked = !!trip.source && trip.source !== 'MANUEL';
          const lockedLabel = trip.source === 'POD' ? 'Preuve de Livraison' : trip.source === 'RETOUR_CONTENEUR' ? 'Retour Conteneur Vide' : '';
          return (
          <div
            key={trip.id}
            className={`bg-white rounded-xl border p-3 shadow-xs space-y-2.5 relative ${locked ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'}`}
          >
            {/* Mobile Card Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                  #{idx + 1}
                </span>
                <input
                  type="date"
                  value={trip.date}
                  disabled={locked}
                  onChange={(e) => handleTripChange(trip.id, 'date', e.target.value)}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white disabled:text-slate-500"
                />
                {locked && (
                  <span className="text-[9px] font-bold text-blue-600 flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />{lockedLabel}
                  </span>
                )}
              </div>

              {locked ? (
                <span className="p-1.5 text-blue-400" title={`Rempli automatiquement — ${lockedLabel}`}>
                  <Lock className="w-3.5 h-3.5" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => removeTrip(trip.id)}
                  disabled={trips.length <= 1}
                  className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer rounded-lg bg-slate-50"
                  title="Supprimer la mission"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile Card Form Inputs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-0.5">
                  Client
                </label>
                <input
                  type="text"
                  value={trip.client}
                  disabled={locked}
                  onChange={(e) => handleTripChange(trip.id, 'client', e.target.value)}
                  placeholder="Nom du client"
                  className="w-full px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 font-medium disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-0.5">
                  Conteneur / BL
                </label>
                <input
                  type="text"
                  value={trip.noConteneurBL}
                  disabled={locked}
                  onChange={(e) => handleTripChange(trip.id, 'noConteneurBL', e.target.value)}
                  placeholder="N° Conteneur"
                  className="w-full px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 font-mono disabled:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-0.5">
                  Type
                </label>
                <select
                  value={trip.typeConteneur}
                  disabled={locked}
                  onChange={(e) => handleTripChange(trip.id, 'typeConteneur', e.target.value as ContainerType)}
                  className="w-full px-1.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-medium disabled:text-slate-500"
                >
                  <option value="20">20'</option>
                  <option value="40">40'</option>
                  <option value="Reefer">Reefer</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-0.5">
                  Départ
                </label>
                <input
                  type="text"
                  value={trip.depart}
                  disabled={locked}
                  onChange={(e) => handleTripChange(trip.id, 'depart', e.target.value)}
                  placeholder="Départ"
                  className="w-full px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-medium disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-0.5">
                  Destination
                </label>
                <input
                  type="text"
                  value={trip.destination}
                  disabled={locked}
                  onChange={(e) => handleTripChange(trip.id, 'destination', e.target.value)}
                  placeholder="Arrivée"
                  className="w-full px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-medium disabled:text-slate-500"
                />
              </div>
            </div>

            {/* Mobile Numbers Row */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="block text-[9px] font-bold text-slate-500 uppercase">Km</span>
                <input
                  type="number"
                  min="0"
                  value={trip.kmParcourus || ''}
                  disabled={locked}
                  onChange={(e) => handleTripChange(trip.id, 'kmParcourus', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-transparent text-right font-bold text-xs text-blue-900 focus:outline-none disabled:text-slate-400"
                />
              </div>

              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="block text-[9px] font-bold text-slate-500 uppercase">Gasoil (L)</span>
                <input
                  type="number"
                  min="0"
                  value={trip.carburantL || ''}
                  disabled={locked}
                  onChange={(e) => handleTripChange(trip.id, 'carburantL', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-transparent text-right font-bold text-xs text-amber-900 focus:outline-none disabled:text-slate-400"
                />
              </div>

              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="block text-[9px] font-bold text-slate-500 uppercase">Frais FCFA</span>
                <input
                  type="number"
                  min="0"
                  value={trip.fraisRoute || ''}
                  disabled={locked}
                  onChange={(e) => handleTripChange(trip.id, 'fraisRoute', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-transparent text-right font-bold text-xs text-emerald-800 focus:outline-none disabled:text-slate-400"
                />
              </div>
            </div>
          </div>
          );
        })}

        {/* Mobile Total Banner */}
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-md border border-slate-800 space-y-1 text-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Total Hebdomadaire ({trips.length} missions)
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
            <div>
              <span className="text-[9px] block text-slate-400 uppercase">Km Total</span>
              <span className="font-bold text-blue-300 text-xs">{totalKm} km</span>
            </div>
            <div>
              <span className="text-[9px] block text-slate-400 uppercase">Gasoil</span>
              <span className="font-bold text-amber-300 text-xs">{totalFuel} L</span>
            </div>
            <div>
              <span className="text-[9px] block text-slate-400 uppercase">Frais</span>
              <span className="font-bold text-emerald-400 text-xs">{formatFCFA(totalFrais)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats & Summary Boxes */}
      <div className="p-3 sm:p-5 bg-slate-50 border-t border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-3 sm:mb-4">
          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-700 shrink-0">
              <Route className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium block truncate">Distances</span>
              <span className="text-xs sm:text-base font-bold text-slate-800">{totalKm} km</span>
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-700 shrink-0">
              <Fuel className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium block truncate">Consommation</span>
              <span className="text-xs sm:text-base font-bold text-slate-800">{fuelConsumption} L/100km</span>
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700 shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium block truncate">Frais Route</span>
              <span className="text-xs sm:text-base font-bold text-slate-800">{formatFCFA(totalFrais)}</span>
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-700 shrink-0">
              <Box className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium block truncate">Missions</span>
              <span className="text-xs sm:text-base font-bold text-slate-800">{trips.length}</span>
            </div>
          </div>
        </div>

        {/* Section 2 Bottom Summary Questions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 border-t border-slate-200 pt-3 sm:pt-4">
          <div className="bg-white p-2.5 sm:p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
              Conteneurs enlevés au port :
            </label>
            <input
              type="number"
              min="0"
              value={tripStats.totalEnlevesPort}
              onChange={(e) =>
                notifyStatsChange({ ...tripStats, totalEnlevesPort: parseInt(e.target.value) || 0 })
              }
              className="w-full px-2.5 py-1 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
            />
          </div>

          <div className="bg-white p-2.5 sm:p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
              Conteneurs livrés au destinataire :
            </label>
            <input
              type="number"
              min="0"
              value={tripStats.totalLivresDestinataire}
              onChange={(e) =>
                notifyStatsChange({ ...tripStats, totalLivresDestinataire: parseInt(e.target.value) || 0 })
              }
              className="w-full px-2.5 py-1 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
            />
          </div>

          <div className="bg-white p-2.5 sm:p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
              Conteneurs vides retournés :
            </label>
            <input
              type="number"
              min="0"
              value={tripStats.conteneursVidesRetournes}
              onChange={(e) =>
                notifyStatsChange({ ...tripStats, conteneursVidesRetournes: parseInt(e.target.value) || 0 })
              }
              className="w-full px-2.5 py-1 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
