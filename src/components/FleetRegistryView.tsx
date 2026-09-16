import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Plus,
  ShieldAlert,
  FileText,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  ArrowUpDown,
  Download,
  Printer,
  Edit,
  Trash2,
  Image as ImageIcon,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { FleetVehicle, AdminDocument, VehicleStatus } from '../types';
import { listVehicles, createVehicle, updateVehicle, addVehicleDocument } from '../lib/vehicles';
import { listDrivers, DriverOption } from '../lib/users';
import { SearchableSelect } from './SearchableSelect';
import { usePolling } from '../lib/usePolling';
import { ApiError, uploadFile } from '../lib/api';

interface FleetRegistryViewProps {}

export const FleetRegistryView: React.FC<FleetRegistryViewProps> = () => {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [driversList, setDriversList] = useState<DriverOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await listVehicles();
      setVehicles(list);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger la flotte.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    listDrivers().then(setDriversList).catch(() => {
      /* silencieux : le menu déroulant chauffeur reste vide si le chargement échoue */
    });
  }, [fetchVehicles]);

  usePolling(() => {
    listVehicles().then(setVehicles).catch(() => {});
    listDrivers().then(setDriversList).catch(() => {});
  }, 15000);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [docAlertFilter, setDocAlertFilter] = useState<string>('ALL');

  // Sorting
  const [sortField, setSortField] = useState<keyof FleetVehicle>('immatriculation');
  const [sortAsc, setSortAsc] = useState(true);

  // Expanded card/modal state
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);

  // Vehicle Form State
  const [immatriculation, setImmatriculation] = useState('');
  const [marqueModele, setMarqueModele] = useState('');
  const [annee, setAnnee] = useState<number>(new Date().getFullYear());
  const [capaciteTonnage, setCapaciteTonnage] = useState<number>(0);
  const [noRemorque, setNoRemorque] = useState('');
  const [chauffeurNom, setChauffeurNom] = useState('');
  const [statut, setStatut] = useState<VehicleStatus>('En service');
  const [kmCompteur, setKmCompteur] = useState<number>(0);
  const [consoRef, setConsoRef] = useState<number>(0);
  const [photoUrl, setPhotoUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Document add state inside modal
  const [docType, setDocType] = useState<AdminDocument['type']>('Assurance');
  const [docNum, setDocNum] = useState('');
  const [docEmission, setDocEmission] = useState('');
  const [docExpiration, setDocExpiration] = useState('');
  const [docPhoto, setDocPhoto] = useState('');
  const [tempDocs, setTempDocs] = useState<AdminDocument[]>([]);
  const [pendingNewDocs, setPendingNewDocs] = useState<AdminDocument[]>([]);

  const handleOpenCreate = () => {
    setEditingVehicle(null);
    setImmatriculation('');
    setMarqueModele('');
    setAnnee(new Date().getFullYear());
    setCapaciteTonnage(0);
    setNoRemorque('');
    setChauffeurNom('');
    setStatut('En service');
    setKmCompteur(0);
    setConsoRef(0);
    setPhotoUrl('');
    setNotes('');
    setTempDocs([]);
    setPendingNewDocs([]);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: FleetVehicle) => {
    setEditingVehicle(v);
    setImmatriculation(v.immatriculation);
    setMarqueModele(v.marqueModele);
    setAnnee(v.annee);
    setCapaciteTonnage(v.capaciteTonnage);
    setNoRemorque(v.noRemorqueAssociee || '');
    setChauffeurNom(v.chauffeurHabituelNom || '');
    setStatut(v.statut);
    setKmCompteur(v.kmCompteurInitial);
    setConsoRef(v.consommationReferenceL100);
    setPhotoUrl(v.photoUrl || '');
    setNotes(v.notesInterne || '');
    setTempDocs(v.documents || []);
    setPendingNewDocs([]);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleAddTempDoc = () => {
    if (!docNum || !docExpiration) return;
    const newDoc: AdminDocument = {
      id: `doc_${Date.now()}`,
      type: docType,
      numeroDoc: docNum,
      dateEmission: docEmission || new Date().toISOString().split('T')[0],
      dateExpiration: docExpiration,
      photoScanUrl: docPhoto,
      status: calculateDocStatus(docExpiration),
    };
    setTempDocs([...tempDocs, newDoc]);
    setPendingNewDocs([...pendingNewDocs, newDoc]);
    setDocNum('');
    setDocPhoto('');
  };

  const calculateDocStatus = (expDateStr: string): AdminDocument['status'] => {
    if (!expDateStr) return 'VALIDE';
    const today = new Date();
    const exp = new Date(expDateStr);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) return 'EXPIRE';
    if (diffDays <= 30) return 'EXPIRE_BIENTOT';
    return 'VALIDE';
  };

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setIsUploadingPhoto(true);
    try {
      const url = await uploadFile(file, file.name);
      setter(url);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Échec de l'envoi de la photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!immatriculation.trim() || !marqueModele.trim()) {
      setSaveError("Veuillez renseigner l'immatriculation et le modèle.");
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    try {
      const vehiclePayload = {
        immatriculation,
        marqueModele,
        annee,
        capaciteTonnage,
        noRemorqueAssociee: noRemorque || undefined,
        photoUrl: photoUrl || undefined,
        chauffeurHabituelNom: chauffeurNom || undefined,
        statut,
        kmCompteurInitial: kmCompteur,
        consommationReferenceL100: consoRef,
        notesInterne: notes || undefined,
      };

      const saved = editingVehicle
        ? await updateVehicle(editingVehicle.id, vehiclePayload)
        : await createVehicle(vehiclePayload);

      for (const doc of pendingNewDocs) {
        await addVehicleDocument(saved.id, {
          type: doc.type,
          numeroDoc: doc.numeroDoc,
          dateEmission: doc.dateEmission,
          dateExpiration: doc.dateExpiration,
          photoScanUrl: doc.photoScanUrl,
        });
      }

      await fetchVehicles();
      setIsModalOpen(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Échec de l'enregistrement du véhicule.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter & Sort Logic
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.immatriculation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marqueModele.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.chauffeurHabituelNom && v.chauffeurHabituelNom.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || v.statut === statusFilter;

    let matchesDocAlert = true;
    if (docAlertFilter === 'ALERT') {
      matchesDocAlert = v.documents.some((d) => d.status === 'EXPIRE' || d.status === 'EXPIRE_BIENTOT');
    }

    return matchesSearch && matchesStatus && matchesDocAlert;
  });

  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof FleetVehicle) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Calculations
  const totalVehicles = vehicles.length;
  const inServiceCount = vehicles.filter((v) => v.statut === 'En service').length;
  const inMaintenanceCount = vehicles.filter((v) => v.statut === 'En maintenance').length;
  const expiredDocsCount = vehicles.reduce(
    (acc, v) => acc + v.documents.filter((d) => d.status === 'EXPIRE' || d.status === 'EXPIRE_BIENTOT').length,
    0
  );
  const totalTonnageSum = vehicles.reduce((acc, v) => acc + (v.capaciteTonnage || 0), 0);

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Immatriculation', 'Marque/Modèle', 'Année', 'Statut', 'Chauffeur', 'Tonnage (T)', 'Km Compteur', 'Docs en Alerte'];
    const rows = sortedVehicles.map((v) => [
      v.immatriculation,
      v.marqueModele,
      v.annee,
      v.statut,
      v.chauffeurHabituelNom || '—',
      v.capaciteTonnage,
      v.kmCompteurInitial,
      v.documents.filter((d) => d.status !== 'VALIDE').length,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Registre_Flotte_YM_TRANSIT_${new Date().toISOString().split('T')[0]}.csv`);
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
            <Truck className="w-5 h-5 text-blue-600" />
            <span>Registre Centralisé des Véhicules & Documents Flotte</span>
          </h2>
          <p className="text-xs text-slate-500">
            Fiche technique des camions, suivi des cartes grises/assurances/visites techniques et historique complet.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Véhicule</span>
        </button>
      </div>

      {isLoading && (
        <div className="p-6 flex items-center justify-center text-slate-400 gap-2 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement de la flotte…
        </div>
      )}
      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
          {loadError}
          <button onClick={fetchVehicles} className="underline cursor-pointer">Réessayer</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total Camions</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalVehicles}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Tonnage total : {totalTonnageSum}T</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">En Service</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-1">{inServiceCount}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Prêts pour expédition</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">En Maintenance</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-600 mt-1">{inMaintenanceCount}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">À l'atelier ou garage</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Docs à Échéance</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-bold text-rose-600 mt-1">{expiredDocsCount}</p>
          <span className="text-[10px] text-rose-500 mt-1 block font-medium">Expirés ou &lt;30 jours</span>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher par immatriculation, marque, chauffeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Tous les Statuts</option>
              <option value="En service">En Service</option>
              <option value="En maintenance">En Maintenance</option>
              <option value="Hors service">Hors Service</option>
            </select>

            <button
              onClick={() => setDocAlertFilter(docAlertFilter === 'ALL' ? 'ALERT' : 'ALL')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                docAlertFilter === 'ALERT'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Docs Expirés / Proches</span>
            </button>

            {/* Export Buttons */}
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Exporter au format CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Imprimer le registre"
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
            Tableau d'analyse du Registre Flotte ({sortedVehicles.length} camions)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Affichage triable et filtré</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-medium text-[10px] uppercase tracking-wider border-b border-slate-200">
                <th
                  onClick={() => handleSort('immatriculation')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Véhicule / Immat</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('marqueModele')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Marque & Spécifications</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('statut')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Statut</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Chauffeur Assigné</th>
                <th className="py-3 px-3">Compteur Km</th>
                <th className="py-3 px-3">Documents Administratifs</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Aucun camion correspondant aux filtres.
                  </td>
                </tr>
              ) : (
                sortedVehicles.map((v) => {
                  const alertDocs = v.documents.filter((d) => d.status === 'EXPIRE' || d.status === 'EXPIRE_BIENTOT');

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {v.photoUrl ? (
                              <img src={v.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Truck className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs font-mono">{v.immatriculation}</span>
                            <span className="text-[10px] text-slate-400">Année : {v.annee}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800 text-xs">{v.marqueModele}</div>
                        <div className="text-[11px] text-slate-500 font-normal">
                          {v.capaciteTonnage}T · Remorque : {v.noRemorqueAssociee || 'N/A'}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            v.statut === 'En service'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : v.statut === 'En maintenance'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {v.statut === 'En service' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {v.statut === 'En maintenance' && <Clock className="w-3 h-3 text-amber-600" />}
                          {v.statut === 'Hors service' && <XCircle className="w-3 h-3 text-rose-600" />}
                          <span>{v.statut}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-700 font-medium">
                        {v.chauffeurHabituelNom ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{v.chauffeurHabituelNom}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Non assigné</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-800 font-semibold">
                        {new Intl.NumberFormat('fr-FR').format(v.kmCompteurInitial)} km
                        <span className="text-[10px] text-slate-400 block font-sans font-normal">
                          Réf: {v.consommationReferenceL100} L/100
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          {v.documents.length === 0 ? (
                            <span className="text-[10px] text-slate-400 italic">Aucun document saisi</span>
                          ) : (
                            v.documents.slice(0, 3).map((doc) => (
                              <div key={doc.id} className="flex items-center gap-1.5 text-[11px]">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    doc.status === 'EXPIRE'
                                      ? 'bg-rose-500'
                                      : doc.status === 'EXPIRE_BIENTOT'
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                />
                                <span className="font-medium text-slate-700">{doc.type}</span>
                                <span className="text-slate-400 font-mono text-[10px]">({doc.dateExpiration})</span>
                              </div>
                            ))
                          )}
                          {v.documents.length > 3 && (
                            <span className="text-[10px] text-blue-600 font-semibold">
                              +{v.documents.length - 3} autres docs
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(v)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                          title="Modifier la fiche"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* TOTALS ROW */}
            <tfoot>
              <tr className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-200">
                <td className="py-3 px-4">TOTAL : {sortedVehicles.length} camions</td>
                <td className="py-3 px-3">Tonnage cumulé : {sortedVehicles.reduce((a, b) => a + (b.capaciteTonnage || 0), 0)} T</td>
                <td className="py-3 px-3 text-center">{inServiceCount} En service</td>
                <td className="py-3 px-3">—</td>
                <td className="py-3 px-3 font-mono">
                  {new Intl.NumberFormat('fr-FR').format(sortedVehicles.reduce((a, b) => a + (b.kmCompteurInitial || 0), 0))} km totaux
                </td>
                <td className="py-3 px-3 font-semibold text-rose-600">
                  {expiredDocsCount} alertes docs
                </td>
                <td className="py-3 px-4 text-right">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT VEHICLE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>{editingVehicle ? 'Modifier Fiche Véhicule' : 'Ajouter un Camion au Registre'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Immatriculation *</label>
                  <input
                    type="text"
                    value={immatriculation}
                    onChange={(e) => setImmatriculation(e.target.value)}
                    required
                    placeholder="Ex: AB-789-XY"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Marque & Modèle *</label>
                  <input
                    type="text"
                    value={marqueModele}
                    onChange={(e) => setMarqueModele(e.target.value)}
                    required
                    placeholder="Ex: Volvo FH 500 Globetrotter"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Année & Tonnage</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={annee}
                      onChange={(e) => setAnnee(Number(e.target.value))}
                      placeholder="2023"
                      className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg"
                    />
                    <input
                      type="number"
                      value={capaciteTonnage}
                      onChange={(e) => setCapaciteTonnage(Number(e.target.value))}
                      placeholder="40 (Tonnes)"
                      className="w-1/2 px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">N° Remorque Associée</label>
                  <input
                    type="text"
                    value={noRemorque}
                    onChange={(e) => setNoRemorque(e.target.value)}
                    placeholder="Ex: REM-8820"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Chauffeur Habituel</label>
                  <SearchableSelect
                    options={driversList.map((d) => ({
                      value: d.name,
                      label: d.name,
                      sublabel: d.camionAssigne || undefined,
                    }))}
                    value={chauffeurNom}
                    onChange={setChauffeurNom}
                    emptyOptionLabel="-- Saisie libre ou non assigné --"
                    searchPlaceholder="Rechercher un chauffeur…"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Statut Opérationnel</label>
                  <select
                    value={statut}
                    onChange={(e) => setStatut(e.target.value as VehicleStatus)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold cursor-pointer"
                  >
                    <option value="En service">En service</option>
                    <option value="En maintenance">En maintenance</option>
                    <option value="Hors service">Hors service</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Km Compteur Actuel</label>
                  <input
                    type="number"
                    value={kmCompteur}
                    onChange={(e) => setKmCompteur(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Consommation Réf. (L/100km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={consoRef}
                    onChange={(e) => setConsoRef(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Photo du Véhicule (Scan/Photo)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingPhoto}
                    onChange={(e) => handleFileUpload(e, setPhotoUrl)}
                    className="text-xs text-slate-500 cursor-pointer disabled:opacity-50"
                  />
                  {isUploadingPhoto && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                  {photoUrl && (
                    <img src={photoUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                  )}
                </div>
              </div>

              {/* DOCUMENTS ADMINISTRATIFS SECTION */}
              <div className="border-t border-slate-200 pt-3 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Documents Administratifs & Dates d'Expiration</span>
                </h4>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="Assurance">Assurance</option>
                      <option value="Carte Grise">Carte Grise</option>
                      <option value="Visite Technique">Visite Technique</option>
                      <option value="Patente / Transport">Patente / Transport</option>
                      <option value="Extincteur">Extincteur</option>
                    </select>

                    <input
                      type="text"
                      placeholder="N° du Document"
                      value={docNum}
                      onChange={(e) => setDocNum(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />

                    <input
                      type="date"
                      value={docExpiration}
                      onChange={(e) => setDocExpiration(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />

                    <button
                      type="button"
                      onClick={handleAddTempDoc}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 cursor-pointer"
                    >
                      Ajouter Document
                    </button>
                  </div>
                </div>

                {/* Added docs list */}
                {tempDocs.length > 0 && (
                  <div className="space-y-1.5">
                    {tempDocs.map((doc) => (
                      <div key={doc.id} className="p-2 bg-slate-100 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800">{doc.type}</span> — N° {doc.numeroDoc} (Exp: {doc.dateExpiration})
                        </div>
                        <button
                          type="button"
                          onClick={() => setTempDocs(tempDocs.filter((d) => d.id !== doc.id))}
                          className="text-rose-600 hover:text-rose-800 cursor-pointer font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  {editingVehicle ? 'Mettre à jour' : 'Enregistrer le Camion'}
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
