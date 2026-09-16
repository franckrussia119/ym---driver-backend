import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Loader2,
  ChevronRight,
  Truck,
  UserRound,
  Ship,
  X,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  Container,
  listContainers,
  createContainer,
  assignCarrier,
  updateContainer,
} from '../lib/containers';
import { listSubcontractorDrivers, SubcontractorDriver } from '../lib/subcontractors';
import { listDrivers, DriverOption } from '../lib/users';
import { SearchableSelect } from './SearchableSelect';
import { usePolling } from '../lib/usePolling';
import { ApiError } from '../lib/api';

interface ContainerRegistryViewProps {
  onOpenContainer: (id: string) => void;
  currentUser: UserProfile | null;
}

const STATUS_BADGE: Record<string, string> = {
  OUVERT: 'bg-blue-50 text-blue-700 border-blue-200',
  FERME: 'bg-slate-100 text-slate-500 border-slate-200',
};

export const ContainerRegistryView: React.FC<ContainerRegistryViewProps> = ({ onOpenContainer, currentUser }) => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [driversList, setDriversList] = useState<DriverOption[]>([]);
  const [subcontractors, setSubcontractors] = useState<SubcontractorDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OUVERT' | 'FERME'>('OUVERT');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'CUSTOM'>('ALL');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [createdByMeOnly, setCreatedByMeOnly] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [c, s, d] = await Promise.all([listContainers(), listSubcontractorDrivers(), listDrivers()]);
      setContainers(c);
      setSubcontractors(s);
      setDriversList(d);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les conteneurs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [blNumber, setBlNumber] = useState('');
  const [port, setPort] = useState<'Douala' | 'Kribi'>('Douala');
  const [terminal, setTerminal] = useState('');
  const [containerNumber, setContainerNumber] = useState('');
  const [size, setSize] = useState<'20' | '40'>('40');
  const [notes, setNotes] = useState('');
  const [dateLimiteRetour, setDateLimiteRetour] = useState('');
  const [clientNom, setClientNom] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [contenuDescription, setContenuDescription] = useState('');
  const [destinationDechargement, setDestinationDechargement] = useState('');
  const [depotRetourPrevu, setDepotRetourPrevu] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const resetForm = () => {
    setBlNumber('');
    setPort('Douala');
    setTerminal('');
    setContainerNumber('');
    setSize('40');
    setDateLimiteRetour('');
    setNotes('');
    setClientNom('');
    setClientContact('');
    setContenuDescription('');
    setDestinationDechargement('');
    setDepotRetourPrevu('');
    setSaveError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blNumber.trim() || !terminal.trim() || !containerNumber.trim()) {
      setSaveError('Veuillez remplir le N° BL, le terminal et le N° de conteneur.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const created = await createContainer({
        blNumber, port, terminal, containerNumber, size,
        dateLimiteRetour: dateLimiteRetour || undefined,
        notes: notes || undefined,
        clientNom: clientNom || undefined,
        clientContact: clientContact || undefined,
        contenuDescription: contenuDescription || undefined,
        destinationDechargement: destinationDechargement || undefined,
        depotRetourPrevu: depotRetourPrevu || undefined,
      });
      await fetchAll();
      setIsCreateOpen(false);
      resetForm();
      onOpenContainer(created.id);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Échec de l'enregistrement du conteneur.");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick-assign modal
  const [assignTarget, setAssignTarget] = useState<Container | null>(null);
  const [carrierType, setCarrierType] = useState<'CHAUFFEUR_INTERNE' | 'SOUS_TRAITANT'>('CHAUFFEUR_INTERNE');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState('');
  const [assignCamion, setAssignCamion] = useState('');
  const [assignRemorque, setAssignRemorque] = useState('');
  const [assignTarif, setAssignTarif] = useState(0);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Rafraîchissement silencieux de la liste des conteneurs — un chauffeur
  // peut livrer ou retourner un conteneur à tout moment, ce qui doit se
  // refléter ici sans que le superviseur ait à recharger la page. Suspendu
  // pendant qu'un modal est ouvert pour ne pas perturber une saisie en cours.
  usePolling(() => {
    listContainers().then(setContainers).catch(() => {});
  }, 12000, !isCreateOpen && !assignTarget);

  const openAssign = (c: Container) => {
    setAssignTarget(c);
    setCarrierType(c.carrierType || 'CHAUFFEUR_INTERNE');
    setSelectedDriverId(c.assignedDriverId || '');
    setSelectedSubcontractorId(c.assignedSubcontractorId || '');
    setAssignCamion(c.immatriculationCamionTrajet || '');
    setAssignRemorque(c.remorqueTrajet || '');
    setAssignTarif(c.tarifConvenuFCFA || 0);
    setAssignError(null);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTarget) return;
    setIsAssigning(true);
    setAssignError(null);
    try {
      await assignCarrier(assignTarget.id, {
        carrierType,
        driverId: carrierType === 'CHAUFFEUR_INTERNE' ? selectedDriverId : undefined,
        subcontractorId: carrierType === 'SOUS_TRAITANT' ? selectedSubcontractorId : undefined,
        immatriculationCamionTrajet: assignCamion || undefined,
        remorqueTrajet: assignRemorque || undefined,
      });
      if (assignTarif !== (assignTarget.tarifConvenuFCFA || 0)) {
        await updateContainer(assignTarget.id, { tarifConvenuFCFA: assignTarif });
      }
      await fetchAll();
      setAssignTarget(null);
    } catch (err) {
      setAssignError(err instanceof ApiError ? err.message : "Échec de l'assignation.");
    } finally {
      setIsAssigning(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = containers.filter((c) => {
    const matchesSearch =
      c.blNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numeroReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.clientNom || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

    const createdDateStr = c.createdAt.split('T')[0];
    const matchesDate =
      dateFilter === 'ALL' ? true :
      dateFilter === 'TODAY' ? createdDateStr === todayStr :
      // CUSTOM : plage inclusive, l'une ou l'autre borne peut être vide.
      (!customFromDate || createdDateStr >= customFromDate) && (!customToDate || createdDateStr <= customToDate);

    const matchesCreator = !createdByMeOnly || c.createdById === currentUser?.id;

    return matchesSearch && matchesStatus && matchesDate && matchesCreator;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Registre des Conteneurs</span>
          </h2>
          <p className="text-xs text-slate-500">
            Créez un conteneur une fois validé, assignez qui le transporte — le système suit le reste.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Conteneur</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par BL, N° conteneur, référence, client…"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        {(['OUVERT', 'FERME', 'ALL'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === 'OUVERT' ? 'Ouverts' : s === 'FERME' ? 'Fermés' : 'Tous'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Date de création :</span>
        {(['ALL', 'TODAY', 'CUSTOM'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDateFilter(d)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
              dateFilter === d ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {d === 'ALL' ? 'Toutes' : d === 'TODAY' ? "Aujourd'hui" : 'Période personnalisée'}
          </button>
        ))}
        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={customFromDate}
              onChange={(e) => setCustomFromDate(e.target.value)}
              className="px-2 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg"
            />
            <span className="text-slate-400 text-[11px]">→</span>
            <input
              type="date"
              value={customToDate}
              onChange={(e) => setCustomToDate(e.target.value)}
              className="px-2 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg"
            />
          </div>
        )}
        <label className="flex items-center gap-1.5 ml-2 cursor-pointer select-none px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200">
          <input
            type="checkbox"
            checked={createdByMeOnly}
            onChange={(e) => setCreatedByMeOnly(e.target.checked)}
            className="cursor-pointer"
          />
          <span className="text-[11px] font-bold text-slate-600">Créé par moi seulement</span>
        </label>
      </div>

      {isLoading && (
        <div className="p-10 flex items-center justify-center text-slate-400 gap-2 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement…
        </div>
      )}
      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
          {loadError}
          <button onClick={fetchAll} className="underline cursor-pointer">Réessayer</button>
        </div>
      )}

      {!isLoading && filtered.length === 0 && !loadError && (
        <div className="p-10 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          Aucun conteneur trouvé.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <button onClick={() => onOpenContainer(c.id)} className="w-full text-left p-4 cursor-pointer hover:bg-slate-50/60 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-blue-700 font-bold">{c.numeroReference}</div>
                  <div className="font-bold text-sm text-slate-900 truncate mt-0.5">{c.containerNumber}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">BL: {c.blNumber}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${STATUS_BADGE[c.status]}`}>
                  {c.status === 'OUVERT' ? 'Ouvert' : 'Fermé'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-400">
                <Ship className="w-3 h-3" />
                <span>{c.port === 'Douala' ? 'PAD' : 'PAK'} · {c.terminal} · {c.size}'</span>
              </div>
              {c.clientNom && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-600 font-semibold">
                  <UserRound className="w-3 h-3 text-slate-400" />
                  <span>{c.clientNom}</span>
                </div>
              )}
              <div className="text-[10px] text-slate-400 mt-1">
                Créé le {new Date(c.createdAt).toLocaleDateString('fr-FR')} à {new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                {c.createdByNom ? ` par ${c.createdByNom}` : ''}
              </div>
              {c.status === 'OUVERT' && c.dateLimiteRetour && (() => {
                const daysLeft = Math.round((new Date(c.dateLimiteRetour).getTime() - Date.now()) / 86_400_000);
                if (daysLeft < 0) {
                  return (
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 w-fit">
                      <AlertTriangle className="w-3 h-3" />
                      Détention : {Math.abs(daysLeft)} jour(s) de retard
                    </div>
                  );
                }
                if (daysLeft <= 2) {
                  return (
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 w-fit">
                      <AlertTriangle className="w-3 h-3" />
                      Échéance dans {daysLeft} jour(s)
                    </div>
                  );
                }
                return null;
              })()}
              <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                {c.carrierType === 'CHAUFFEUR_INTERNE' ? (
                  <><UserRound className="w-3.5 h-3.5 text-emerald-600" /><span className="text-slate-700 font-semibold">{c.driverNom || 'Chauffeur assigné'}</span></>
                ) : c.carrierType === 'SOUS_TRAITANT' ? (
                  <><Truck className="w-3.5 h-3.5 text-amber-600" /><span className="text-slate-700 font-semibold">{c.subcontractorNom} ({c.subcontractorEntreprise || 'société non renseignée'})</span></>
                ) : (
                  <span className="text-slate-400 italic">Non assigné</span>
                )}
              </div>
            </button>
            <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between">
              <button
                onClick={() => openAssign(c)}
                disabled={c.status === 'FERME'}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-300 disabled:cursor-not-allowed cursor-pointer"
              >
                {c.carrierType ? 'Modifier assignation' : 'Assigner un transporteur'}
              </button>
              <button onClick={() => onOpenContainer(c.id)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Nouveau Conteneur</h3>
              <button onClick={() => { setIsCreateOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">N° Bill of Lading (BL) *</label>
                <input type="text" required value={blNumber} onChange={(e) => setBlNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
                {(() => {
                  const matching = blNumber.trim()
                    ? containers.filter((c) => c.blNumber.toLowerCase().trim() === blNumber.toLowerCase().trim())
                    : [];
                  if (matching.length === 0) return null;
                  return (
                    <div className="mt-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2 text-[11px] text-blue-800">
                      <p className="font-bold">
                        Ce BL a déjà {matching.length} conteneur{matching.length > 1 ? 's' : ''} : {matching.map((c) => c.containerNumber).join(', ')}
                      </p>
                      <button
                        type="button"
                        onClick={() => { setPort(matching[0].port); setTerminal(matching[0].terminal); }}
                        className="underline font-semibold mt-0.5 cursor-pointer"
                      >
                        Copier le port et le terminal de ce BL
                      </button>
                    </div>
                  );
                })()}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Port *</label>
                  <select value={port} onChange={(e) => setPort(e.target.value as 'Douala' | 'Kribi')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    <option value="Douala">Douala (PAD)</option>
                    <option value="Kribi">Kribi (PAK)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Taille *</label>
                  <select value={size} onChange={(e) => setSize(e.target.value as '20' | '40')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    <option value="20">20 pieds</option>
                    <option value="40">40 pieds</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Terminal *</label>
                <input type="text" required value={terminal} onChange={(e) => setTerminal(e.target.value)}
                  placeholder="Ex: Terminal à Conteneurs Douala Int'l"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">N° de Conteneur *</label>
                <input type="text" required value={containerNumber} onChange={(e) => setContainerNumber(e.target.value)}
                  placeholder="Ex: MSCU1234567"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-semibold" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Client (optionnel)</label>
                  <input type="text" value={clientNom} onChange={(e) => setClientNom(e.target.value)}
                    placeholder="Ex: SOCAM SARL"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact du Client (optionnel)</label>
                  <input type="text" value={clientContact} onChange={(e) => setClientContact(e.target.value)}
                    placeholder="Ex: 677889900"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Contenu du Conteneur (optionnel)</label>
                <input type="text" value={contenuDescription} onChange={(e) => setContenuDescription(e.target.value)}
                  placeholder="Ex: Pièces détachées automobiles"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Destination du Déchargement (optionnel)</label>
                <input type="text" value={destinationDechargement} onChange={(e) => setDestinationDechargement(e.target.value)}
                  placeholder="Ex: Zone Industrielle Bassa, Douala"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Dépôt de Retour Prévu (optionnel)</label>
                <input type="text" value={depotRetourPrevu} onChange={(e) => setDepotRetourPrevu(e.target.value)}
                  placeholder="Ex: Dépôt Bonabéri, Douala"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                <p className="text-[10px] text-slate-400 mt-1">
                  Sera automatiquement proposé lors du retour du conteneur vide, pour éviter toute confusion.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Date Limite de Retour (franchise / détention)
                </label>
                <input type="date" value={dateLimiteRetour} onChange={(e) => setDateLimiteRetour(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
                <p className="text-[10px] text-slate-400 mt-1">
                  Date à partir de laquelle des frais de détention peuvent s'appliquer. Peut être renseignée plus tard.
                </p>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes (optionnel)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              {saveError && <p className="text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{saveError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setIsCreateOpen(false); resetForm(); }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium cursor-pointer">Annuler</button>
                <button type="submit" disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5">
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Créer le Conteneur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {assignTarget && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Assigner un Transporteur</h3>
              <button onClick={() => setAssignTarget(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">Conteneur {assignTarget.containerNumber} · BL {assignTarget.blNumber}</p>
            <form onSubmit={handleAssign} className="space-y-3.5 text-xs">
              <div className="flex gap-2">
                <button type="button" onClick={() => setCarrierType('CHAUFFEUR_INTERNE')}
                  className={`flex-1 py-2.5 rounded-xl font-bold border-2 cursor-pointer transition-colors ${
                    carrierType === 'CHAUFFEUR_INTERNE' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'border-slate-200 text-slate-500'
                  }`}>
                  Notre Chauffeur
                </button>
                <button type="button" onClick={() => setCarrierType('SOUS_TRAITANT')}
                  className={`flex-1 py-2.5 rounded-xl font-bold border-2 cursor-pointer transition-colors ${
                    carrierType === 'SOUS_TRAITANT' ? 'bg-amber-50 border-amber-500 text-amber-800' : 'border-slate-200 text-slate-500'
                  }`}>
                  Sous-traitant
                </button>
              </div>

              {carrierType === 'CHAUFFEUR_INTERNE' ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chauffeur *</label>
                  <SearchableSelect
                    required
                    options={driversList.map((d) => ({ value: d.id, label: d.name, sublabel: d.camionAssigne || undefined }))}
                    value={selectedDriverId}
                    onChange={setSelectedDriverId}
                    placeholder="— Choisir un chauffeur —"
                    searchPlaceholder="Rechercher un chauffeur…"
                  />
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sous-traitant *</label>
                  <SearchableSelect
                    required
                    options={subcontractors.map((s) => ({ value: s.id, label: s.nom, sublabel: s.companyNom || undefined }))}
                    value={selectedSubcontractorId}
                    onChange={setSelectedSubcontractorId}
                    placeholder="— Choisir un sous-traitant —"
                    searchPlaceholder="Rechercher un sous-traitant…"
                  />
                  {subcontractors.length === 0 && (
                    <p className="text-[10px] text-amber-600 mt-1">Aucun sous-traitant enregistré. Ajoutez-en un dans "Chauffeurs Sous-traitants".</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Camion (ce trajet)</label>
                  <input type="text" value={assignCamion} onChange={(e) => setAssignCamion(e.target.value)}
                    placeholder="Ex: LT-100-AA"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-semibold" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Remorque</label>
                  <input type="text" value={assignRemorque} onChange={(e) => setAssignRemorque(e.target.value)}
                    placeholder="Ex: RQ-200-BB"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-semibold" />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tarif Convenu (FCFA)</label>
                <input type="number" min={0} value={assignTarif} onChange={(e) => setAssignTarif(Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                <p className="text-[10px] text-slate-400 mt-1">Apparaîtra sur l'Ordre de Transport imprimé pour le chauffeur.</p>
              </div>

              {assignError && <p className="text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{assignError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAssignTarget(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium cursor-pointer">Annuler</button>
                <button type="submit" disabled={isAssigning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5">
                  {isAssigning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
