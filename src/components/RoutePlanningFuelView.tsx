import React, { useState, useEffect, useCallback } from 'react';
import {
  Route,
  Search,
  ArrowUpDown,
  Download,
  Printer,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Truck,
  Zap,
  TrendingUp,
  Navigation,
  FileText,
  Clock,
  Droplet,
  Loader2,
  Save,
} from 'lucide-react';
import { FuelAnalysisEntry, FleetVehicle, TripLogEntry, formatFCFA } from '../types';
import { listFuelEntries, createFuelEntry } from '../lib/fuel';
import { listVehicles } from '../lib/vehicles';
import { SearchableSelect } from './SearchableSelect';
import { usePolling } from '../lib/usePolling';
import { ApiError } from '../lib/api';

// Major Cameroun routes database for local routing algorithm
const CAMEROON_ROUTES = [
  { id: 'r1', origin: 'Douala (Port Autonome)', destination: 'Yaoundé (Nsimalen / ZI)', km: 280, peagesCount: 3, peagesCostFCFA: 1500, refL100: 34.5, durationHours: 5.5 },
  { id: 'r2', origin: 'Douala (Port Autonome)', destination: 'Kribi (Port en Eau Profonde)', km: 180, peagesCount: 2, peagesCostFCFA: 1000, refL100: 32.0, durationHours: 3.5 },
  { id: 'r3', origin: 'Douala (Bassa ZI)', destination: 'Bafoussam (Hauts-Plateaux)', km: 290, peagesCount: 4, peagesCostFCFA: 2000, refL100: 38.0, durationHours: 6.0 },
  { id: 'r4', origin: 'Yaoundé (Mvan)', destination: 'Ngaoundéré (Gare Ferroviaire)', km: 650, peagesCount: 7, peagesCostFCFA: 3500, refL100: 36.5, durationHours: 12.0 },
  { id: 'r5', origin: 'Douala (Port Autonome)', destination: 'Garoua (Nord)', km: 1100, peagesCount: 12, peagesCostFCFA: 6000, refL100: 37.0, durationHours: 22.0 },
];

export const RoutePlanningFuelView: React.FC = () => {
  const [fuelEntries, setFuelEntries] = useState<FuelAnalysisEntry[]>([]);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logSuccess, setLogSuccess] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [entries, vehs] = await Promise.all([listFuelEntries(), listVehicles()]);
      setFuelEntries(entries);
      setVehicles(vehs);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les données carburant.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  usePolling(() => {
    Promise.all([listFuelEntries(), listVehicles()]).then(([entries, vehs]) => { setFuelEntries(entries); setVehicles(vehs); }).catch(() => {});
  }, 15000);

  const [searchTerm, setSearchTerm] = useState('');
  const [anomalyOnly, setAnomalyOnly] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof FuelAnalysisEntry>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // ROUTING ALGORITHM SIMULATOR STATE
  const [selectedRouteId, setSelectedRouteId] = useState(CAMEROON_ROUTES[0].id);
  const [selectedTruckImmat, setSelectedTruckImmat] = useState('');
  const [cargoWeightTons, setCargoWeightTons] = useState<number>(30);
  const [dieselPriceFCFA, setDieselPriceFCFA] = useState<number>(840); // 840 FCFA / Liter
  const [chauffeurNomForLog, setChauffeurNomForLog] = useState('');

  // Computed Routing Result
  const routeObj = CAMEROON_ROUTES.find((r) => r.id === selectedRouteId) || CAMEROON_ROUTES[0];
  const truckObj = vehicles.find((v) => v.immatriculation === selectedTruckImmat);
  const baseConsoRef = truckObj ? truckObj.consommationReferenceL100 : routeObj.refL100;

  // Weight adjustment (+0.2L per ton above 20T)
  const weightAdjustedConso = baseConsoRef + Math.max(0, (cargoWeightTons - 20) * 0.2);
  const estimatedFuelLiters = Math.round((routeObj.km * weightAdjustedConso) / 100);
  const estimatedFuelCostFCFA = estimatedFuelLiters * dieselPriceFCFA;
  const totalTripEstimateFCFA = estimatedFuelCostFCFA + routeObj.peagesCostFCFA;

  const handleLogEntry = async () => {
    if (!truckObj) {
      setLogError('Veuillez sélectionner un camion.');
      return;
    }
    setLogError(null);
    setLogSuccess(false);
    setIsLogging(true);
    try {
      await createFuelEntry({
        date: new Date().toISOString().split('T')[0],
        truckImmatriculation: truckObj.immatriculation,
        chauffeurNom: chauffeurNomForLog || truckObj.chauffeurHabituelNom || 'Non renseigné',
        trajetLabel: `${routeObj.origin} → ${routeObj.destination}`,
        kmParcourus: routeObj.km,
        carburantConsommeL: estimatedFuelLiters,
      });
      await fetchAll();
      setLogSuccess(true);
      setTimeout(() => setLogSuccess(false), 3000);
    } catch (err) {
      setLogError(err instanceof ApiError ? err.message : "Échec de l'enregistrement du relevé.");
    } finally {
      setIsLogging(false);
    }
  };

  // Filter & Sort Analysis Table
  const filteredEntries = fuelEntries.filter((e) => {
    const matchesSearch =
      e.truckImmatriculation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.chauffeurNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.trajetLabel.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAnomaly = !anomalyOnly || e.anomalieDetectee;
    return matchesSearch && matchesAnomaly;
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof FuelAnalysisEntry) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Calculations
  const totalKmSum = fuelEntries.reduce((acc, e) => acc + e.kmParcourus, 0);
  const totalFuelLitersSum = fuelEntries.reduce((acc, e) => acc + e.carburantConsommeL, 0);
  const avgConsoOverall = totalKmSum > 0 ? (totalFuelLitersSum / totalKmSum) * 100 : 35.0;
  const anomalyCount = fuelEntries.filter((e) => e.anomalieDetectee).length;

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Camion', 'Chauffeur', 'Trajet', 'Km', 'Carburant (L)', 'Réel L/100', 'Réf L/100', 'Écart', 'Anomalie'];
    const rows = sortedEntries.map((e) => [
      e.date,
      e.truckImmatriculation,
      e.chauffeurNom,
      e.trajetLabel,
      e.kmParcourus,
      e.carburantConsommeL,
      e.consommationReelleL100,
      e.consommationRefL100,
      e.ecartL100,
      e.anomalieDetectee ? e.typeAnomalie : 'Aucune',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Analyse_Carburant_Routage_YM_TRANSIT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Route className="w-5 h-5 text-blue-600" />
            <span>Planification d'Itinéraires & Analyse de Consommation Carburant</span>
          </h2>
          <p className="text-xs text-slate-500">
            Algorithme de routage local (péages, km, gazole) et détection automatique des surconsommations (L/100km).
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="p-6 flex items-center justify-center text-slate-400 gap-2 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement de l'analyse carburant…
        </div>
      )}
      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
          {loadError}
          <button onClick={fetchAll} className="underline cursor-pointer">Réessayer</button>
        </div>
      )}

      {/* MODULE 1: ROUTING ALGORITHM CALCULATOR */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <span>Algorithme de Calcul d'Itinéraire & Estimation Budget Gazole</span>
          </h3>
          <span className="text-[10px] text-blue-400 bg-blue-950 px-2.5 py-1 rounded-full border border-blue-800 font-mono">
            Optimisation dynamique Cameroun
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Axe Routier Principal</label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium cursor-pointer"
            >
              {CAMEROON_ROUTES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.origin} ➔ {r.destination} ({r.km} km)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Camion Assigné</label>
            <SearchableSelect
              required
              dark
              options={vehicles.map((v) => ({ value: v.immatriculation, label: v.immatriculation, sublabel: `${v.consommationReferenceL100} L/100km` }))}
              value={selectedTruckImmat}
              onChange={setSelectedTruckImmat}
              placeholder="— Choisir un camion —"
              searchPlaceholder="Rechercher par immatriculation…"
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Poids Chargement (Tonnes)</label>
            <input
              type="number"
              value={cargoWeightTons}
              onChange={(e) => setCargoWeightTons(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Prix Gazole (FCFA / Litre)</label>
            <input
              type="number"
              value={dieselPriceFCFA}
              onChange={(e) => setDieselPriceFCFA(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
            />
          </div>
        </div>

        {/* Calculated Result Display */}
        <div className="p-4 bg-slate-800/90 rounded-xl border border-slate-700 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Distance Estimée</span>
            <span className="text-base font-bold text-white font-mono">{routeObj.km} km</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">~{routeObj.durationHours}h de route</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Consommation Réf.</span>
            <span className="text-base font-bold text-blue-400 font-mono">{weightAdjustedConso.toFixed(1)} L/100</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Ajustée selon tonnage</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Volume Carburant</span>
            <span className="text-base font-bold text-amber-400 font-mono">{estimatedFuelLiters} Litres</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{formatFCFA(estimatedFuelCostFCFA)}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Péages Routiers</span>
            <span className="text-base font-bold text-slate-200 font-mono">{formatFCFA(routeObj.peagesCostFCFA)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{routeObj.peagesCount} postes péage</span>
          </div>

          <div className="col-span-2 md:col-span-1 bg-blue-600/30 p-2 rounded-lg border border-blue-500/50 flex flex-col justify-center">
            <span className="text-[10px] text-blue-200 block uppercase font-bold">Budget Trajet Est.</span>
            <span className="text-base font-bold text-white font-mono">{formatFCFA(totalTripEstimateFCFA)}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
              Chauffeur (pour ce relevé)
            </label>
            <input
              type="text"
              value={chauffeurNomForLog}
              onChange={(e) => setChauffeurNomForLog(e.target.value)}
              placeholder={truckObj?.chauffeurHabituelNom || 'Nom du chauffeur'}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleLogEntry}
            disabled={isLogging || !truckObj}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            {isLogging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Enregistrer ce relevé réel</span>
          </button>
        </div>
        {logError && (
          <p className="mt-2 text-xs text-rose-300 font-semibold bg-rose-950/40 border border-rose-900/60 rounded-lg px-3 py-2">
            {logError}
          </p>
        )}
        {logSuccess && (
          <p className="mt-2 text-xs text-emerald-300 font-semibold bg-emerald-950/40 border border-emerald-900/60 rounded-lg px-3 py-2">
            ✓ Relevé enregistré dans la base de données.
          </p>
        )}
      </div>

      {/* KPI Cards for Fuel Analysis */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Km Totaux Analysés</span>
            <Navigation className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {new Intl.NumberFormat('fr-FR').format(totalKmSum)} km
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Rapports trajets hebdo</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Moyenne Flotte (L/100km)</span>
            <Droplet className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-600 mt-1 font-mono">{avgConsoOverall.toFixed(1)} L/100</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Consommation moyenne</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Anomalies Surconsommation</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-bold text-rose-600 mt-1">{anomalyCount}</p>
          <span className="text-[10px] text-rose-500 mt-1 block font-medium">Dérapage &gt;15% ou fuite</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Volume Gazole Total</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-700 mt-1 font-mono">{totalFuelLitersSum} L</p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            ~{formatFCFA(totalFuelLitersSum * dieselPriceFCFA)}
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filtrer par camion, chauffeur, trajet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setAnomalyOnly(!anomalyOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                anomalyOnly
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Anomalies Seules</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>
          </div>
        </div>
      </div>

      {/* DETAILED ANALYSIS TABLE (Standard Pattern) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            Tableau d'analyse comparative Réel vs Référence ({sortedEntries.length} trajets)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Calcul automatique de l'écart L/100km</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-medium text-[10px] uppercase tracking-wider border-b border-slate-200">
                <th
                  onClick={() => handleSort('date')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('truckImmatriculation')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Camion & Chauffeur</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Trajet Effectué</th>
                <th className="py-3 px-3">Km Parcourus</th>
                <th className="py-3 px-3">Gazole Consommé</th>
                <th className="py-3 px-3">Conso Réelle vs Réf.</th>
                <th className="py-3 px-3 text-center">Détection Anomalie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Aucune donnée de consommation disponible.
                  </td>
                </tr>
              ) : (
                sortedEntries.map((e, idx) => (
                  <tr key={e.tripId + idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-600">{e.date}</td>

                    <td className="py-3.5 px-3 font-bold text-slate-900 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{e.truckImmatriculation}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block font-sans font-normal">{e.chauffeurNom}</span>
                    </td>

                    <td className="py-3.5 px-3 text-slate-800 font-medium">{e.trajetLabel}</td>

                    <td className="py-3.5 px-3 font-mono font-semibold text-slate-800">{e.kmParcourus} km</td>

                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900">{e.carburantConsommeL} L</td>

                    <td className="py-3.5 px-3 font-mono">
                      <span className="font-bold text-slate-900">{e.consommationReelleL100} L/100</span>
                      <span className="text-[10px] text-slate-400 block font-sans">Réf : {e.consommationRefL100} L/100</span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      {e.anomalieDetectee ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>{e.typeAnomalie || 'Surconsommation (+15%)'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Conforme</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* TOTALS FOOTER */}
            <tfoot>
              <tr className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-200">
                <td className="py-3 px-4">TOTAL : {sortedEntries.length} trajets</td>
                <td className="py-3 px-3">—</td>
                <td className="py-3 px-3">—</td>
                <td className="py-3 px-3 font-mono">{totalKmSum} km</td>
                <td className="py-3 px-3 font-mono">{totalFuelLitersSum} Litres</td>
                <td className="py-3 px-3 font-mono">{avgConsoOverall.toFixed(1)} L/100 moy.</td>
                <td className="py-3 px-3 text-center font-semibold text-rose-600">{anomalyCount} anomalies</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
