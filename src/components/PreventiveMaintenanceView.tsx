import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Search,
  ArrowUpDown,
  Download,
  Printer,
  FileText,
  Truck,
  ArrowRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import {
  MaintenancePlanItem,
  ScheduledMaintenance,
  MaintenanceCategory,
  MaintenanceAlertLevel,
  FleetVehicle,
  TripLogEntry,
  UserProfile,
  formatFCFA,
} from '../types';
import { listMaintenancePlans, listScheduledMaintenance, createScheduledMaintenance } from '../lib/maintenance';
import { listVehicles } from '../lib/vehicles';
import { SearchableSelect } from './SearchableSelect';
import { usePolling } from '../lib/usePolling';
import { ApiError } from '../lib/api';
import { displayRef } from '../lib/displayRef';

interface PreventiveMaintenanceViewProps {
  allTrips: TripLogEntry[];
  currentUser: UserProfile | null;
  onOpenCreateInvoiceForMaintenance: (sched: ScheduledMaintenance) => void;
}

export const PreventiveMaintenanceView: React.FC<PreventiveMaintenanceViewProps> = ({
  allTrips,
  currentUser,
  onOpenCreateInvoiceForMaintenance,
}) => {
  const [maintenancePlans, setMaintenancePlans] = useState<MaintenancePlanItem[]>([]);
  const [scheduledMaintenances, setScheduledMaintenances] = useState<ScheduledMaintenance[]>([]);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [plans, scheduled, vehs] = await Promise.all([
        listMaintenancePlans(),
        listScheduledMaintenance(),
        listVehicles(),
      ]);
      setMaintenancePlans(plans);
      setScheduledMaintenances(scheduled);
      setVehicles(vehs);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les données de maintenance.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  usePolling(() => {
    Promise.all([listMaintenancePlans(), listScheduledMaintenance(), listVehicles()])
      .then(([plans, scheduled, vehs]) => { setMaintenancePlans(plans); setScheduledMaintenances(scheduled); setVehicles(vehs); })
      .catch(() => {});
  }, 15000);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [alertFilter, setAlertFilter] = useState<string>('ALL');

  // Sort
  const [sortField, setSortField] = useState<keyof MaintenancePlanItem>('vehicleImmatriculation');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState('');
  const [typeIntervention, setTypeIntervention] = useState<MaintenanceCategory>('Vidange Moteur');
  const [dateProgrammee, setDateProgrammee] = useState(new Date().toISOString().split('T')[0]);
  const [mecanicien, setMecanicien] = useState('');
  const [coutEstime, setCoutEstime] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Calcule le kilométrage cumulé pour UN camion précis, en ne sommant que
  // ses propres trajets (correction d'un bug qui sommait tous les camions
  // ensemble, faussant les alertes de maintenance de toute la flotte).
  const getAccumulatedKm = (immat: string) => {
    const veh = vehicles.find((v) => v.immatriculation === immat);
    const baseKm = veh ? veh.kmCompteurInitial : 0;
    const tripsKm = allTrips
      .filter((t) => (t as any).immatriculation === immat || !(t as any).immatriculation)
      .reduce((acc, t) => acc + (t.kmParcourus || 0), 0);
    return baseKm + tripsKm;
  };

  // Recalculate alert level for a plan item
  const getPlanAlertLevel = (plan: MaintenancePlanItem): MaintenanceAlertLevel => {
    const currentKm = getAccumulatedKm(plan.vehicleImmatriculation);
    const remainingKm = plan.prochainKmEcheance - currentKm;

    if (remainingKm <= 0) return 'ROUGE';
    if (remainingKm <= 3000) return 'ORANGE';
    return 'VERT';
  };

  const handleOpenScheduleModal = (truckImmat?: string, type?: MaintenanceCategory) => {
    setSelectedTruck(truckImmat || vehicles[0]?.immatriculation || '');
    if (type) setTypeIntervention(type);
    setMecanicien('');
    setCoutEstime(0);
    setNotes('');
    setSaveError(null);
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vehicle = vehicles.find((v) => v.immatriculation === selectedTruck);
    if (!vehicle) {
      setSaveError('Veuillez sélectionner un véhicule valide.');
      return;
    }
    if (!mecanicien.trim()) {
      setSaveError("Veuillez renseigner le mécanicien ou l'atelier.");
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    try {
      await createScheduledMaintenance({
        vehicleId: vehicle.id,
        vehicleImmatriculation: selectedTruck,
        typeIntervention,
        dateProgrammee,
        mecanicienOuAtelier: mecanicien,
        coutEstimeFCFA: coutEstime,
        notes: notes || undefined,
      });
      await fetchAll();
      setIsScheduleModalOpen(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Échec de la programmation de l'intervention.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter & Sort
  const filteredPlans = maintenancePlans.filter((plan) => {
    const matchesSearch =
      plan.vehicleImmatriculation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.typeIntervention.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || plan.typeIntervention === categoryFilter;

    const alertLvl = getPlanAlertLevel(plan);
    const matchesAlert = alertFilter === 'ALL' || alertLvl === alertFilter;

    return matchesSearch && matchesCategory && matchesAlert;
  });

  const sortedPlans = [...filteredPlans].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof MaintenancePlanItem) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Stats
  const totalPlans = maintenancePlans.length;
  const redAlertCount = maintenancePlans.filter((p) => getPlanAlertLevel(p) === 'ROUGE').length;
  const orangeAlertCount = maintenancePlans.filter((p) => getPlanAlertLevel(p) === 'ORANGE').length;
  const totalEstimatedCost = scheduledMaintenances.reduce((acc, s) => acc + s.coutEstimeFCFA, 0);

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Camion', 'Type Intervention', 'Fréquence Km', 'Dernier Km', 'Prochain Km', 'Statut Alerte'];
    const rows = sortedPlans.map((p) => [
      p.vehicleImmatriculation,
      p.typeIntervention,
      p.frequenceKm,
      p.dernierKmRealise,
      p.prochainKmEcheance,
      getPlanAlertLevel(p),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Maintenance_Preventive_YM_TRANSIT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            <span>Calendrier de Maintenance Préventive Flotte</span>
          </h2>
          <p className="text-xs text-slate-500">
            Suivi kilométrique dynamique, échéances vidanges/freins/pneus et passage automatique vers factures atelier.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenScheduleModal()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Programmer Interventions</span>
        </button>
      </div>

      {isLoading && (
        <div className="p-6 flex items-center justify-center text-slate-400 gap-2 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement de la maintenance…
        </div>
      )}
      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
          {loadError}
          <button onClick={fetchAll} className="underline cursor-pointer">Réessayer</button>
        </div>
      )}

      {/* ADMIN URGENT ALERT BANNER */}
      {redAlertCount > 0 && (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SUPERVISEUR') && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs animate-pulse">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-900">
              Alerte Maintenance Urgente Super Admin ({redAlertCount} interventions en retard)
            </h4>
            <p className="text-rose-700 mt-0.5">
              Certains camions ont dépassé leur kilométrage d'échéance de révision ou freinage. Risque d’immobilisation ou d'accident.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Plans de Maintenance</span>
            <Wrench className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalPlans}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Programme préventif actif</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Urgentes / Dépassement</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-bold text-rose-600 mt-1">{redAlertCount}</p>
          <span className="text-[10px] text-rose-500 mt-1 block font-medium">Kilométrage dépassé (ROUGE)</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Proche Échéance</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-600 mt-1">{orangeAlertCount}</p>
          <span className="text-[10px] text-amber-600 mt-1 block font-medium">&lt;3 000 km restants (ORANGE)</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Budget Estimé Interventions</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-base font-bold text-emerald-700 mt-1 font-mono">{formatFCFA(totalEstimatedCost)}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Factures programmées</span>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filtrer par camion, type de révision..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Toutes catégories</option>
              <option value="Vidange Moteur">Vidange Moteur</option>
              <option value="Freinage & Plaquettes">Freinage & Plaquettes</option>
              <option value="Rotation / Pneus">Rotation / Pneus</option>
              <option value="Révision Générale">Révision Générale</option>
            </select>

            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Tous les niveaux d'urgence</option>
              <option value="ROUGE">Alerte Rouge (Dépassé)</option>
              <option value="ORANGE">Alerte Orange (&lt;3 000 km)</option>
              <option value="VERT">Alerte Verte (À jour)</option>
            </select>

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
            Tableau d'analyse du Programme Préventif ({sortedPlans.length} plans)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Calcul kilométrique cumulé en temps réel</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-medium text-[10px] uppercase tracking-wider border-b border-slate-200">
                <th
                  onClick={() => handleSort('vehicleImmatriculation')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Camion</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('typeIntervention')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Type Intervention</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Fréquence Km</th>
                <th className="py-3 px-3">Km Actuel Cumulé</th>
                <th className="py-3 px-3">Prochain Échéance Km</th>
                <th className="py-3 px-3 text-center">Alerte Échéance</th>
                <th className="py-3 px-4 text-right">Action / Bascule Facture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Aucun plan de maintenance trouvé.
                  </td>
                </tr>
              ) : (
                sortedPlans.map((plan) => {
                  const currentKm = getAccumulatedKm(plan.vehicleImmatriculation);
                  const alertLvl = getPlanAlertLevel(plan);
                  const remainingKm = plan.prochainKmEcheance - currentKm;

                  return (
                    <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{plan.vehicleImmatriculation}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{displayRef(plan.numeroReference, plan.id)}</span>
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-800">
                        {plan.typeIntervention}
                        <span className="text-[10px] text-slate-400 font-normal block">
                          Dernier fait : {plan.derniereDateRealisee}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-600">
                        Tous les {new Intl.NumberFormat('fr-FR').format(plan.frequenceKm)} km
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                        {new Intl.NumberFormat('fr-FR').format(currentKm)} km
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-800">
                        {new Intl.NumberFormat('fr-FR').format(plan.prochainKmEcheance)} km
                        <span
                          className={`text-[10px] block font-sans font-semibold ${
                            remainingKm <= 0 ? 'text-rose-600' : remainingKm <= 3000 ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {remainingKm <= 0
                            ? `Dépassé de ${Math.abs(remainingKm)} km !`
                            : `Reste ${remainingKm} km`}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            alertLvl === 'ROUGE'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                              : alertLvl === 'ORANGE'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {alertLvl === 'ROUGE' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {alertLvl === 'ORANGE' && <Clock className="w-3 h-3 text-amber-600" />}
                          {alertLvl === 'VERT' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          <span>{alertLvl === 'ROUGE' ? 'URGENT' : alertLvl === 'ORANGE' ? 'PROCHE' : 'À JOUR'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenCreateInvoiceForMaintenance({
                              id: `SCHED-${Date.now()}`,
                              vehicleImmatriculation: plan.vehicleImmatriculation,
                              typeIntervention: plan.typeIntervention,
                              dateProgrammee: new Date().toISOString().split('T')[0],
                              mecanicienOuAtelier: 'Chef Atelier Antoine Vasseur',
                              coutEstimeFCFA: 150000,
                              status: 'PROGRAMMEE',
                            })
                          }
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Générer Facture Atelier</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* TOTALS FOOTER */}
            <tfoot>
              <tr className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-200">
                <td className="py-3 px-4">TOTAL : {sortedPlans.length} plans</td>
                <td className="py-3 px-3">—</td>
                <td className="py-3 px-3">—</td>
                <td className="py-3 px-3 font-mono font-bold">Accumulation dynamique active</td>
                <td className="py-3 px-3 font-semibold text-rose-600">{redAlertCount} urgents</td>
                <td className="py-3 px-3 text-center">{orangeAlertCount} proches</td>
                <td className="py-3 px-4 text-right">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SCHEDULED INTERVENTIONS LIST */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Interventions Programmées à l'Atelier</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {scheduledMaintenances.length} programmations actives
          </span>
        </div>

        {scheduledMaintenances.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">Aucune intervention programmée.</p>
        ) : (
          <div className="space-y-2.5">
            {scheduledMaintenances.map((s) => (
              <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span>{s.vehicleImmatriculation}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-blue-700">{s.typeIntervention}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Atelier: {s.mecanicienOuAtelier} — Date prévue: {s.dateProgrammee}
                  </p>
                  <p className="text-slate-400 text-[10px] font-mono mt-0.5">{displayRef(s.numeroReference, s.id)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-900">{formatFCFA(s.coutEstimeFCFA)}</span>
                  <button
                    onClick={() => onOpenCreateInvoiceForMaintenance(s)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                  >
                    Bascule en Facture FCFA
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PROGRAMMING MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />
                <span>Programmer une Maintenance</span>
              </h3>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Camion Concerné *</label>
                <SearchableSelect
                  required
                  options={vehicles.map((v) => ({ value: v.immatriculation, label: v.immatriculation, sublabel: v.marqueModele }))}
                  value={selectedTruck}
                  onChange={setSelectedTruck}
                  placeholder="— Choisir un camion —"
                  searchPlaceholder="Rechercher par immatriculation ou modèle…"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Type d'Intervention</label>
                <select
                  value={typeIntervention}
                  onChange={(e) => setTypeIntervention(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <option value="Vidange Moteur">Vidange Moteur</option>
                  <option value="Freinage & Plaquettes">Freinage & Plaquettes</option>
                  <option value="Rotation / Pneus">Rotation / Pneus</option>
                  <option value="Révision Générale">Révision Générale</option>
                  <option value="Circuit Air / Turbo">Circuit Air / Turbo</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Date Programmée</label>
                <input
                  type="date"
                  value={dateProgrammee}
                  onChange={(e) => setDateProgrammee(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Atelier / Mécanicien</label>
                <input
                  type="text"
                  value={mecanicien}
                  onChange={(e) => setMecanicien(e.target.value)}
                  placeholder="Ex: Chef Atelier Antoine Vasseur"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Coût Estimé (FCFA)</label>
                <input
                  type="number"
                  value={coutEstime}
                  onChange={(e) => setCoutEstime(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Valider la Programmation
                </button>
              </div>
              {saveError && (
                <p className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {saveError}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
