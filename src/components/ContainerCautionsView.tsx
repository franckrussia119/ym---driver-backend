import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ArrowUpDown,
  Download,
  Printer,
  DollarSign,
  FileText,
  Ship,
  Truck,
  Edit,
  Loader2,
} from 'lucide-react';
import { ContainerCaution, CautionStatus, formatFCFA, FleetVehicle } from '../types';
import { listCautions, createCaution, updateCaution } from '../lib/cautions';
import { listVehicles } from '../lib/vehicles';
import { SearchableSelect } from './SearchableSelect';
import { ApiError } from '../lib/api';
import { displayRef } from '../lib/displayRef';
import { usePolling } from '../lib/usePolling';

export const ContainerCautionsView: React.FC = () => {
  const [cautions, setCautions] = useState<ContainerCaution[]>([]);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [c, v] = await Promise.all([listCautions(), listVehicles()]);
      setCautions(c);
      setVehicles(v);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les cautions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  usePolling(() => {
    Promise.all([listCautions(), listVehicles()]).then(([c, v]) => { setCautions(c); setVehicles(v); }).catch(() => {});
  }, 15000);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Sort
  const [sortField, setSortField] = useState<keyof ContainerCaution>('dateLimiteRetour');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCaution, setEditingCaution] = useState<ContainerCaution | null>(null);

  // Form
  const [noConteneurBL, setNoConteneurBL] = useState('');
  const [ligneMaritime, setLigneMaritime] = useState('');
  const [clientNom, setClientNom] = useState('');
  const [truckImmat, setTruckImmat] = useState('');
  const [chauffeurNom, setChauffeurNom] = useState('');
  const [montantCaution, setMontantCaution] = useState<number>(0);
  const [fraisJournalier, setFraisJournalier] = useState<number>(0);
  const [depotDest, setDepotDest] = useState('');
  const [dateDepot, setDateDepot] = useState(new Date().toISOString().split('T')[0]);
  const [dateLimite, setDateLimite] = useState('');
  const [status, setStatus] = useState<CautionStatus>('En cours');
  const [penalite, setPenalite] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const handleOpenCreate = () => {
    setEditingCaution(null);
    setNoConteneurBL('');
    setLigneMaritime('');
    setClientNom('');
    setTruckImmat(vehicles[0]?.immatriculation || '');
    setChauffeurNom('');
    setMontantCaution(0);
    setFraisJournalier(0);
    setDepotDest('');
    setDateDepot(new Date().toISOString().split('T')[0]);

    // set date limit 7 days ahead
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDateLimite(d.toISOString().split('T')[0]);

    setStatus('En cours');
    setPenalite(0);
    setNotes('');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: ContainerCaution) => {
    setEditingCaution(c);
    setNoConteneurBL(c.noConteneurBL);
    setLigneMaritime(c.ligneMaritime);
    setClientNom(c.clientNom);
    setTruckImmat(c.truckImmatriculation || '');
    setChauffeurNom(c.chauffeurNom || '');
    setMontantCaution(c.montantCautionFCFA);
    setFraisJournalier(c.fraisJournalierRetardFCFA);
    setDepotDest(c.depotDestination);
    setDateDepot(c.dateDepot);
    setDateLimite(c.dateLimiteRetour);
    setStatus(c.status);
    setPenalite(c.montantPenaliteFCFA || 0);
    setNotes(c.notes || '');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noConteneurBL.trim() || !clientNom.trim() || !ligneMaritime.trim()) {
      setSaveError('Veuillez renseigner le N° conteneur, le client et la ligne maritime.');
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    try {
      const payload = {
        noConteneurBL,
        ligneMaritime,
        clientNom,
        truckImmatriculation: truckImmat,
        chauffeurNom,
        montantCautionFCFA: montantCaution,
        fraisJournalierRetardFCFA: fraisJournalier,
        depotDestination: depotDest,
        dateDepot,
        dateLimiteRetour: dateLimite,
        notes: notes || undefined,
      };
      if (editingCaution) {
        await updateCaution(editingCaution.id, { ...payload, status, montantPenaliteFCFA: penalite > 0 ? penalite : undefined });
      } else {
        await createCaution(payload);
      }
      await fetchAll();
      setIsModalOpen(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Échec de l'enregistrement de la caution.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter & Sort
  const filteredCautions = cautions.filter((c) => {
    const matchesSearch =
      c.noConteneurBL.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ligneMaritime.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientNom.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedCautions = [...filteredCautions].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof ContainerCaution) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Calculations
  const totalCount = cautions.length;
  const enCoursCount = cautions.filter((c) => c.status === 'En cours').length;
  const inRetardCount = cautions.filter((c) => c.status === 'En retard - Pénalité').length;
  const lostCount = cautions.filter((c) => c.status === 'Caution perdue').length;

  const totalMontantEngage = cautions.reduce((acc, c) => acc + c.montantCautionFCFA, 0);
  const totalAvisque = cautions
    .filter((c) => c.status === 'En cours' || c.status === 'En retard - Pénalité')
    .reduce((acc, c) => acc + c.montantCautionFCFA, 0);
  const totalPerdu = cautions.reduce((acc, c) => acc + (c.montantPenaliteFCFA || 0), 0);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'N° Conteneur / BL',
      'Ligne Maritime',
      'Client',
      'Montant Caution (FCFA)',
      'Frais Retard/Jour',
      'Date Limite',
      'Statut',
      'Pénalités (FCFA)',
    ];
    const rows = sortedCautions.map((c) => [
      c.noConteneurBL,
      c.ligneMaritime,
      c.clientNom,
      c.montantCautionFCFA,
      c.fraisJournalierRetardFCFA,
      c.dateLimiteRetour,
      c.status,
      c.montantPenaliteFCFA || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Suivi_Cautions_Conteneurs_YM_TRANSIT_${new Date().toISOString().split('T')[0]}.csv`);
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
            <Box className="w-5 h-5 text-blue-600" />
            <span>Suivi des Cautions de Conteneurs & Pénalités de Surestarie</span>
          </h2>
          <p className="text-xs text-slate-500">
            Contrôle rigoureux des délais de restitution aux armateurs (MSC, Maersk, CMA CGM) et montants financiers à risque (FCFA).
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Enregistrer une Caution</span>
        </button>
      </div>

      {isLoading && (
        <div className="p-6 flex items-center justify-center text-slate-400 gap-2 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement des cautions…
        </div>
      )}
      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
          {loadError}
          <button onClick={fetchAll} className="underline cursor-pointer">Réessayer</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total Cautions Saisies</span>
            <Box className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalCount}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Volume total dossiers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Montant Cautions à Risque</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-lg font-bold text-amber-600 mt-1 font-mono">{formatFCFA(totalAvisque)}</p>
          <span className="text-[10px] text-amber-600 mt-1 block font-medium">{enCoursCount + inRetardCount} conteneurs non restitués</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">En Retard (Surestarie)</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-bold text-rose-600 mt-1">{inRetardCount}</p>
          <span className="text-[10px] text-rose-500 mt-1 block font-medium">Frais journaliers en cours</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Pénalités / Perdues (FCFA)</span>
            <XCircle className="w-4 h-4 text-rose-700" />
          </div>
          <p className="text-lg font-bold text-rose-700 mt-1 font-mono">{formatFCFA(totalPerdu)}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Frais ou confisqué</span>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher conteneur, BL, armateur, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="En cours">En cours</option>
              <option value="En retard - Pénalité">En retard - Pénalité</option>
              <option value="Retourné à temps">Retourné à temps</option>
              <option value="Caution perdue">Caution perdue</option>
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
            Tableau d'analyse du Suivi des Cautions ({sortedCautions.length} conteneurs)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Calcul des pénalités FCFA en direct</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-medium text-[10px] uppercase tracking-wider border-b border-slate-200">
                <th
                  onClick={() => handleSort('noConteneurBL')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>N° Conteneur / BL</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('ligneMaritime')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Ligne Maritime & Client</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Camion / Chauffeur</th>
                <th className="py-3 px-3">Caution (FCFA) & Frais/Jour</th>
                <th
                  onClick={() => handleSort('dateLimiteRetour')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Date Limite Restitution</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Statut Caution</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCautions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Aucun dossier de caution trouvé.
                  </td>
                </tr>
              ) : (
                sortedCautions.map((c) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isLate = c.status === 'En retard - Pénalité' || (c.status === 'En cours' && c.dateLimiteRetour < todayStr);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{c.noConteneurBL}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{displayRef(c.numeroReference, c.id)}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <Ship className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{c.ligneMaritime}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Client: {c.clientNom}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800 font-mono">{c.truckImmatriculation || '—'}</div>
                        <span className="text-[10px] text-slate-500 block">{c.chauffeurNom || 'N/A'}</span>
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                        {formatFCFA(c.montantCautionFCFA)}
                        <span className="text-[10px] text-rose-600 font-normal block font-sans">
                          Frais : {formatFCFA(c.fraisJournalierRetardFCFA)} / jour
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-800">
                        {c.dateLimiteRetour}
                        <span className="text-[10px] text-slate-400 block font-sans">Dépôt : {c.depotDestination}</span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'Retourné à temps'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : c.status === 'En cours'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : c.status === 'En retard - Pénalité'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {c.status === 'Retourné à temps' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {c.status === 'En cours' && <Clock className="w-3 h-3 text-blue-600" />}
                          {c.status === 'En retard - Pénalité' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          {c.status === 'Caution perdue' && <XCircle className="w-3 h-3 text-rose-600" />}
                          <span>{c.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                          title="Modifier la caution"
                        >
                          <Edit className="w-4 h-4" />
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
                <td className="py-3 px-4">TOTAL : {sortedCautions.length} dossiers</td>
                <td className="py-3 px-3">—</td>
                <td className="py-3 px-3">—</td>
                <td className="py-3 px-3 font-mono text-amber-700">{formatFCFA(totalMontantEngage)} total engagé</td>
                <td className="py-3 px-3">—</td>
                <td className="py-3 px-3 text-center">{enCoursCount} En cours</td>
                <td className="py-3 px-4 text-right font-mono text-rose-700">
                  {formatFCFA(totalPerdu)} pénalités
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-600" />
                <span>{editingCaution ? 'Modifier Caution Conteneur' : 'Enregistrer une Nouvelle Caution'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">N° Conteneur / BL *</label>
                  <input
                    type="text"
                    value={noConteneurBL}
                    onChange={(e) => setNoConteneurBL(e.target.value)}
                    required
                    placeholder="Ex: MSCU-9821340"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ligne Maritime (Armateur)</label>
                  <select
                    value={ligneMaritime}
                    onChange={(e) => setLigneMaritime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer"
                  >
                    <option value="MSC (Mediterranean Shipping Co)">MSC</option>
                    <option value="Maersk Line">Maersk Line</option>
                    <option value="CMA CGM">CMA CGM</option>
                    <option value="COSCO Shipping">COSCO Shipping</option>
                    <option value="Hapag-Lloyd">Hapag-Lloyd</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nom du Client *</label>
                  <input
                    type="text"
                    value={clientNom}
                    onChange={(e) => setClientNom(e.target.value)}
                    required
                    placeholder="Ex: Bolloré Logistics / Socar"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Camion Assigné</label>
                  <SearchableSelect
                    required
                    options={vehicles.map((v) => ({ value: v.immatriculation, label: v.immatriculation, sublabel: v.marqueModele }))}
                    value={truckImmat}
                    onChange={setTruckImmat}
                    placeholder="— Choisir un camion —"
                    searchPlaceholder="Rechercher par immatriculation ou modèle…"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Montant Caution (FCFA)</label>
                  <input
                    type="number"
                    value={montantCaution}
                    onChange={(e) => setMontantCaution(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Frais Journalier Retard (FCFA)</label>
                  <input
                    type="number"
                    value={fraisJournalier}
                    onChange={(e) => setFraisJournalier(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Dépôt / Destination</label>
                  <input
                    type="text"
                    value={depotDest}
                    onChange={(e) => setDepotDest(e.target.value)}
                    placeholder="Ex: Dépôt 3B Douala Port"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date Limite Retour</label>
                  <input
                    type="date"
                    value={dateLimite}
                    onChange={(e) => setDateLimite(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Statut Caution</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CautionStatus)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold cursor-pointer"
                  >
                    <option value="En cours">En cours</option>
                    <option value="En retard - Pénalité">En retard - Pénalité</option>
                    <option value="Retourné à temps">Retourné à temps</option>
                    <option value="Caution perdue">Caution perdue</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Pénalité Appliquée (FCFA)</label>
                  <input
                    type="number"
                    value={penalite}
                    onChange={(e) => setPenalite(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes Interne / Détails</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  placeholder="Informations sur l'état du conteneur..."
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  Valider
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
