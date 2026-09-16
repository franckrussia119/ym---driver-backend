import React, { useState } from 'react';
import {
  CheckCircle2,
  FileText,
  Search,
  Download,
  Printer,
  Camera,
  PenTool,
  MapPin,
  Clock,
  UserCheck,
  Building2,
  Plus,
  X,
  AlertTriangle,
  Check,
  ShieldCheck,
  PackageCheck,
  History,
  Loader2,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  Package,
} from 'lucide-react';
import { UserProfile, formatFCFA } from '../types';
import { listPOD, createPOD } from '../lib/pod';
import { ApiError, uploadFile } from '../lib/api';
import { displayRef } from '../lib/displayRef';
import { CAMEROON_DESTINATIONS, getDistanceKm } from '../data/distances';
import { Container, ContainerReturnHistoryItem, listPendingDeliveryContainers, listPendingReturnContainers, listReturnsHistory, submitContainerReturn } from '../lib/containers';
import { usePolling } from '../lib/usePolling';
import { SearchableSelect } from './SearchableSelect';

export interface PODRecord {
  id: string;
  numeroReference?: string;
  blNumber: string;
  containerNumber: string;
  clientName: string;
  deliveryAddress: string;
  driverName: string;
  truckImmatriculation: string;
  dateTime: string;
  gpsLocation: string;
  recipientName: string;
  status: 'LIVRE_CONFORME' | 'SOUS_RESERVES' | 'REFUSE' | 'EN_COURS';
  bordereauPhotoUrl?: string;
  photoUrl?: string;
  observations?: string;
  departurePort: 'PAK' | 'PAD' | 'Autres';
  departurePortAutre?: string;
  montantRecuFCFA: number;
  distanceKm: number;
  linkedReportId?: string;
  linkedTripId?: string;
}

interface ProofOfDeliveryViewProps {
  currentUser: UserProfile | null;
}

// Aucune preuve de livraison fictive : la liste démarre vide. Chaque
// enregistrement réel est créé par un chauffeur lors d'une livraison.
export const DEMO_POD_RECORDS: PODRecord[] = [];

export const ProofOfDeliveryView: React.FC<ProofOfDeliveryViewProps> = ({
  currentUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'MENU' | 'CREATE' | 'HISTORY' | 'RETURN' | 'RETURN_HISTORY'>('MENU');
  const [podRecords, setPodRecords] = useState<PODRecord[]>([]);
  const [isLoadingPOD, setIsLoadingPOD] = useState(true);
  const [podLoadError, setPodLoadError] = useState<string | null>(null);
  const [isSubmittingPOD, setIsSubmittingPOD] = useState(false);

  // Formulaire "Preuve de Retour Conteneur Vide"
  const [returnContainerId, setReturnContainerId] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDepot, setReturnDepot] = useState('');
  const [returnFrais, setReturnFrais] = useState(0);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnPhotoUrl, setReturnPhotoUrl] = useState<string | null>(null);
  const [isUploadingReturnPhoto, setIsUploadingReturnPhoto] = useState(false);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnSuccess, setReturnSuccess] = useState<string | null>(null);

  const handleReturnPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingReturnPhoto(true);
    setReturnError(null);
    try {
      setReturnPhotoUrl(await uploadFile(file, file.name));
    } catch (err) {
      setReturnError(err instanceof ApiError ? err.message : "Échec de l'envoi de la photo.");
    } finally {
      setIsUploadingReturnPhoto(false);
    }
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnContainerId) {
      setReturnError('Veuillez choisir le conteneur à retourner.');
      return;
    }
    if (!returnDepot.trim()) {
      setReturnError('Veuillez indiquer le dépôt de retour.');
      return;
    }
    if (returnDate > new Date().toISOString().split('T')[0]) {
      setReturnError('La date de retour ne peut pas être dans le futur.');
      return;
    }
    setIsSubmittingReturn(true);
    setReturnError(null);
    try {
      const target = pendingReturnContainers.find((c) => c.id === returnContainerId);
      await submitContainerReturn(returnContainerId, {
        dateRetourVide: returnDate,
        depotRetour: returnDepot,
        fraisRetourFCFA: returnFrais,
        photoUrl: returnPhotoUrl || undefined,
        notes: returnNotes || undefined,
      });
      setReturnSuccess(
        `Conteneur ${target?.containerNumber || ''} retourné avec succès — ajouté automatiquement à votre rapport hebdomadaire.`
      );
      setReturnContainerId('');
      setReturnDate(new Date().toISOString().split('T')[0]);
      setReturnDepot('');
      setReturnFrais(0);
      setReturnNotes('');
      setReturnPhotoUrl(null);
      await fetchPendingReturnContainers();
      await fetchReturnsHistory();
      setTimeout(() => setReturnSuccess(null), 5000);
    } catch (err) {
      setReturnError(err instanceof ApiError ? err.message : "Échec de l'enregistrement du retour.");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedPOD, setSelectedPOD] = useState<PODRecord | null>(null);

  const fetchPODRecords = React.useCallback(async () => {
    setIsLoadingPOD(true);
    setPodLoadError(null);
    try {
      const records = await listPOD();
      setPodRecords(records);
    } catch (err) {
      setPodLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les preuves de livraison.');
    } finally {
      setIsLoadingPOD(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPODRecords();
  }, [fetchPODRecords]);

  // Conteneurs assignés au chauffeur pour LIVRAISON — sert à verrouiller le
  // champ conteneur de la Preuve de Livraison sur des conteneurs réels.
  const [assignedContainers, setAssignedContainers] = useState<Container[]>([]);
  const [isLoadingContainers, setIsLoadingContainers] = useState(true);
  const [containersLoadError, setContainersLoadError] = useState<string | null>(null);

  const fetchAssignedContainers = React.useCallback(async () => {
    setIsLoadingContainers(true);
    setContainersLoadError(null);
    try {
      setAssignedContainers(await listPendingDeliveryContainers());
    } catch (err) {
      setContainersLoadError(err instanceof ApiError ? err.message : 'Impossible de charger vos conteneurs assignés.');
    } finally {
      setIsLoadingContainers(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAssignedContainers();
  }, [fetchAssignedContainers]);

  // Pool ouvert de RETOUR : conteneurs déjà livrés (preuve de livraison
  // faite), pas encore retournés — visible à TOUS les chauffeurs, pas
  // seulement celui qui a livré. C'est l'étape suivante du pipeline.
  const [pendingReturnContainers, setPendingReturnContainers] = useState<Container[]>([]);
  const [isLoadingPendingReturn, setIsLoadingPendingReturn] = useState(true);
  const [pendingReturnLoadError, setPendingReturnLoadError] = useState<string | null>(null);

  const fetchPendingReturnContainers = React.useCallback(async () => {
    setIsLoadingPendingReturn(true);
    setPendingReturnLoadError(null);
    try {
      setPendingReturnContainers(await listPendingReturnContainers());
    } catch (err) {
      setPendingReturnLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les conteneurs disponibles au retour.');
    } finally {
      setIsLoadingPendingReturn(false);
    }
  }, []);

  // Rafraîchissement silencieux (sans spinner) — le pool est partagé entre
  // tous les chauffeurs, donc un autre chauffeur peut le modifier à tout
  // moment. Pas besoin d'actualiser la page pour le voir.
  usePolling(() => {
    listPendingReturnContainers().then(setPendingReturnContainers).catch(() => {});
  }, 12000, activeSubTab === 'RETURN');

  React.useEffect(() => {
    fetchPendingReturnContainers();
  }, [fetchPendingReturnContainers]);

  // Historique des retours déjà effectués.
  const [returnsHistory, setReturnsHistory] = useState<ContainerReturnHistoryItem[]>([]);
  const [isLoadingReturnsHistory, setIsLoadingReturnsHistory] = useState(true);
  const [returnsHistoryError, setReturnsHistoryError] = useState<string | null>(null);
  const [returnsHistorySearch, setReturnsHistorySearch] = useState('');

  const fetchReturnsHistory = React.useCallback(async () => {
    setIsLoadingReturnsHistory(true);
    setReturnsHistoryError(null);
    try {
      setReturnsHistory(await listReturnsHistory());
    } catch (err) {
      setReturnsHistoryError(err instanceof ApiError ? err.message : "Impossible de charger l'historique des retours.");
    } finally {
      setIsLoadingReturnsHistory(false);
    }
  }, []);

  React.useEffect(() => {
    fetchReturnsHistory();
  }, [fetchReturnsHistory]);

  // Modal Form State for New POD
  const [blNumber, setBlNumber] = useState('');
  const [containerNumber, setContainerNumber] = useState('');
  const [selectedContainerId, setSelectedContainerId] = useState('');
  const [clientName, setClientName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [status, setStatus] = useState<PODRecord['status']>('LIVRE_CONFORME');
  const [bordereauPhotoUrl, setBordereauPhotoUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [observations, setObservations] = useState('');
  const [gpsLocation, setGpsLocation] = useState('');
  const [departurePort, setDeparturePort] = useState<'PAK' | 'PAD' | 'Autres'>('PAD');
  const [departurePortAutre, setDeparturePortAutre] = useState('');
  const [montantRecuFCFA, setMontantRecuFCFA] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [isCustomDestination, setIsCustomDestination] = useState(false);

  // Recalcule automatiquement la distance dès que la destination ou le port
  // de départ change (sauf en saisie libre, où le chauffeur ajuste lui-même).
  React.useEffect(() => {
    if (isCustomDestination) return;
    if (departurePort === 'Autres') return; // pas de distance de référence pour un départ personnalisé
    const km = getDistanceKm(deliveryAddress, departurePort);
    if (km !== null) setDistanceKm(km);
  }, [deliveryAddress, departurePort, isCustomDestination]);

  // Capture la position GPS réelle du navigateur à l'ouverture du
  // formulaire de création (best-effort : n'empêche jamais la création si
  // refusée ou indisponible).
  React.useEffect(() => {
    if (activeSubTab !== 'CREATE' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGpsLocation(`Lat ${pos.coords.latitude.toFixed(4)}, Long ${pos.coords.longitude.toFixed(4)}`),
      () => setGpsLocation(''),
      { timeout: 8000 }
    );
  }, [activeSubTab]);

  // Filtered Records
  const filteredRecords = podRecords.filter((rec) => {
    const matchesSearch =
      rec.blNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.driverName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || rec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const bordereauInputRef = React.useRef<HTMLInputElement>(null);
  const colisInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingBordereau, setIsUploadingBordereau] = useState(false);
  const [isUploadingColis, setIsUploadingColis] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleCaptureBordereau = () => {
    bordereauInputRef.current?.click();
  };
  const handleBordereauSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setIsUploadingBordereau(true);
    try {
      const url = await uploadFile(file, file.name);
      setBordereauPhotoUrl(url);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Échec de l'envoi de la photo du bordereau.");
    } finally {
      setIsUploadingBordereau(false);
    }
  };

  const handleCapturePhoto = () => {
    colisInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setIsUploadingColis(true);
    try {
      const url = await uploadFile(file, file.name);
      setPhotoUrl(url);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Échec de l'envoi de la photo.");
    } finally {
      setIsUploadingColis(false);
    }
  };

  const handleCreatePOD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContainerId) {
      alert('Veuillez choisir le conteneur — seul un conteneur réellement enregistré et qui vous est assigné peut être livré.');
      return;
    }
    if (!blNumber.trim() || !clientName.trim() || !recipientName.trim()) {
      alert('Veuillez remplir le N° BL, le nom du client et du récepteur.');
      return;
    }
    if (!deliveryAddress.trim()) {
      alert('Veuillez indiquer la destination.');
      return;
    }
    if (!bordereauPhotoUrl) {
      alert('Veuillez prendre une photo du bordereau de livraison.');
      return;
    }
    if (departurePort === 'Autres' && !departurePortAutre.trim()) {
      alert('Veuillez préciser le lieu de départ.');
      return;
    }

    setIsSubmittingPOD(true);
    try {
      await createPOD({
        blNumber,
        containerNumber: containerNumber || 'N/A',
        containerId: selectedContainerId,
        clientName,
        deliveryAddress,
        driverName: currentUser?.name || 'Chauffeur YM-TRANSIT',
        truckImmatriculation: currentUser?.camionAssigne || 'Non renseigné',
        dateTime: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        gpsLocation: gpsLocation || 'Non disponible',
        recipientName,
        status,
        bordereauPhotoUrl,
        photoUrl: photoUrl || undefined,
        observations,
        departurePort,
        departurePortAutre: departurePort === 'Autres' ? departurePortAutre : undefined,
        montantRecuFCFA,
        distanceKm,
      });

      await fetchPODRecords();

      // Reset Form
      setBlNumber('');
      setContainerNumber('');
      setSelectedContainerId('');
      setClientName('');
      setDeliveryAddress('');
      setRecipientName('');
      setStatus('LIVRE_CONFORME');
      setBordereauPhotoUrl(null);
      setPhotoUrl(null);
      setObservations('');
      setGpsLocation('');
      setDeparturePort('PAD');
      setDeparturePortAutre('');
      setMontantRecuFCFA(0);
      setDistanceKm(0);
      setIsCustomDestination(false);

      // Switch view to history automatically
      setActiveSubTab('HISTORY');
      alert(
        'Preuve de livraison créée avec succès !\n\nCe trajet a été ajouté automatiquement à votre rapport hebdomadaire en cours.'
      );
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Échec de l'enregistrement de la preuve de livraison.");
    } finally {
      setIsSubmittingPOD(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['N° POD', 'BL', 'Conteneur', 'Client', 'Adresse', 'Chauffeur', 'Date/Heure', 'Recepteur', 'Statut'];
    const rows = filteredRecords.map((r) => [
      r.id,
      r.blNumber,
      r.containerNumber,
      r.clientName,
      r.deliveryAddress,
      r.driverName,
      r.dateTime,
      r.recipientName,
      r.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `POD_YM_TRANSIT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <input
        ref={colisInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
              <PackageCheck className="w-4 h-4" />
              <span>Gestion Numérique & Réception Client</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Preuves de Livraison (POD)
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Validation des déchargements avec signatures électroniques, géolocalisation GPS, horodatage et photos.
            </p>
          </div>

          {activeSubTab !== 'MENU' && (
            <button
              type="button"
              onClick={() => setActiveSubTab('MENU')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-700 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Menu Principal</span>
            </button>
          )}
        </div>

        {/* SUB-MENU NAVIGATION (WHEN INSIDE CREATE OR HISTORY) */}
        {activeSubTab !== 'MENU' && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setActiveSubTab('CREATE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'CREATE'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Créer preuve de livraison (POD)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('HISTORY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'HISTORY'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Historique ({podRecords.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* MENU LAUNCHER: THREE CLEAN ACTION CARDS (WHEN ACTIVE SUB TAB IS MENU) */}
      {activeSubTab === 'MENU' && (
        <div className="max-w-4xl mx-auto space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* ACTION CARD 1: CREATE POD */}
            <button
              type="button"
              onClick={() => setActiveSubTab('CREATE')}
              className="group relative bg-white hover:bg-emerald-50/50 p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 shadow-sm transition-all duration-200 text-left cursor-pointer flex flex-col justify-between min-h-[150px] active:scale-[0.99]"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-100 text-slate-400 group-hover:text-emerald-600 flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4" />
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Créer Preuve de Livraison (POD)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  Signatures électroniques, géolocalisation GPS, horodatage et photos du conteneur.
                </p>
              </div>
            </button>

            {/* ACTION CARD 2: RETURN EMPTY CONTAINER */}
            <button
              type="button"
              onClick={() => setActiveSubTab('RETURN')}
              className="group relative bg-white hover:bg-amber-50/50 p-5 rounded-2xl border-2 border-slate-200 hover:border-amber-500 shadow-sm transition-all duration-200 text-left cursor-pointer flex flex-col justify-between min-h-[150px] active:scale-[0.99]"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <span className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-amber-100 text-slate-400 group-hover:text-amber-600 flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4" />
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Preuve de Retour Conteneur Vide
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  Déclarez le retour du conteneur vide au dépôt — s'ajoute directement à votre rapport hebdomadaire.
                </p>
              </div>
            </button>

            {/* ACTION CARD 3: HISTORY POD */}
            <button
              type="button"
              onClick={() => setActiveSubTab('HISTORY')}
              className="group relative bg-white hover:bg-blue-50/50 p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-600 shadow-sm transition-all duration-200 text-left cursor-pointer flex flex-col justify-between min-h-[150px] active:scale-[0.99]"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <History className="w-6 h-6" />
                </div>
                <span className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Historique des Preuves de Livraison
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  Consulter, rechercher, exporter en CSV et imprimer tous les récépissés enregistrés ({podRecords.length}).
                </p>
              </div>
            </button>

            {/* ACTION CARD 4: HISTORY RETOUR */}
            <button
              type="button"
              onClick={() => setActiveSubTab('RETURN_HISTORY')}
              className="group relative bg-white hover:bg-violet-50/50 p-5 rounded-2xl border-2 border-slate-200 hover:border-violet-600 shadow-sm transition-all duration-200 text-left cursor-pointer flex flex-col justify-between min-h-[150px] active:scale-[0.99]"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <History className="w-6 h-6" />
                </div>
                <span className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-violet-100 text-slate-400 group-hover:text-violet-600 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-violet-700 transition-colors">
                  Historique des Retours Conteneur
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  Tous les conteneurs vides déjà retournés, avec dépôt, frais et date ({returnsHistory.length}).
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* SUB-VIEW 1: CREATE POD FORM */}
      {activeSubTab === 'CREATE' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-3xl mx-auto space-y-5">
          <div className="flex items-center space-x-2.5 border-b pb-3 border-slate-100">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900">Saisie de Preuve de Livraison (POD)</h2>
              <p className="text-xs text-slate-500">Formulaire direct de réception client avec signature tactile</p>
            </div>
          </div>

          <form onSubmit={handleCreatePOD} className="space-y-4 text-xs">
            {isLoadingContainers ? (
              <div className="p-6 flex items-center justify-center text-slate-400 gap-2 bg-slate-50 rounded-xl border border-slate-200">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement de vos conteneurs assignés…
              </div>
            ) : assignedContainers.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <Package className="w-7 h-7 text-amber-400 mx-auto mb-2" />
                <p className="text-amber-800 font-semibold">
                  Aucun conteneur ouvert ne vous est actuellement assigné.
                </p>
                <p className="text-amber-700 mt-1">
                  Le Superviseur Conteneurs doit d'abord créer et vous assigner un conteneur avant que vous puissiez enregistrer une preuve de livraison.
                </p>
              </div>
            ) : (
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Conteneur <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  required
                  options={assignedContainers.map((c) => ({
                    value: c.id,
                    label: `${c.containerNumber} · BL ${c.blNumber}`,
                    sublabel: c.port === 'Douala' ? 'PAD' : 'PAK',
                  }))}
                  value={selectedContainerId}
                  onChange={(id) => {
                    setSelectedContainerId(id);
                    const c = assignedContainers.find((x) => x.id === id);
                    setBlNumber(c?.blNumber || '');
                    setContainerNumber(c?.containerNumber || '');
                    // On reprend ce qui a déjà été enregistré à la création
                    // du conteneur (client, destination) plutôt que de
                    // laisser ressaisir — évite toute confusion avec ce qui
                    // est déjà connu du système.
                    setClientName(c?.clientNom || '');
                    const knownDestination = c?.destinationDechargement || '';
                    const matchesKnownList = CAMEROON_DESTINATIONS.some((d) => d.label === knownDestination);
                    setIsCustomDestination(knownDestination.length > 0 && !matchesKnownList);
                    setDeliveryAddress(knownDestination);
                    if (knownDestination && c) {
                      const km = getDistanceKm(knownDestination, c.port === 'Douala' ? 'PAD' : 'PAK');
                      if (km) setDistanceKm(km);
                    }
                  }}
                  placeholder="— Choisir le conteneur assigné —"
                  searchPlaceholder="Rechercher par N° conteneur ou BL…"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Seuls les conteneurs réellement enregistrés et qui vous sont assignés apparaissent ici.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Port de Départ <span className="text-rose-500">*</span>
                </label>
                <select
                  value={departurePort}
                  onChange={(e) => setDeparturePort(e.target.value as 'PAK' | 'PAD' | 'Autres')}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="PAD">PAD — Port Autonome de Douala</option>
                  <option value="PAK">PAK — Port Autonome de Kribi</option>
                  <option value="Autres">Autre lieu de départ</option>
                </select>
                {departurePort === 'Autres' && (
                  <input
                    type="text"
                    value={departurePortAutre}
                    onChange={(e) => setDeparturePortAutre(e.target.value)}
                    placeholder="Précisez le lieu de départ"
                    className="w-full mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  />
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Destination <span className="text-rose-500">*</span>
                </label>
                <select
                  value={isCustomDestination ? '__CUSTOM__' : deliveryAddress}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomDestination(true);
                      setDeliveryAddress('');
                      setDistanceKm(0);
                    } else {
                      setIsCustomDestination(false);
                      setDeliveryAddress(e.target.value);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="">— Choisir une destination —</option>
                  {CAMEROON_DESTINATIONS.map((d) => (
                    <option key={d.label} value={d.label}>{d.label}</option>
                  ))}
                  <option value="__CUSTOM__">Autre destination (saisie libre)</option>
                </select>
                {isCustomDestination && (
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Ex: Zone Industrielle, Bonabéri Douala"
                    className="w-full mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Distance Estimée (km)
                  {!isCustomDestination && departurePort !== 'Autres' && deliveryAddress && (
                    <span className="text-emerald-600 font-normal"> — calculée automatiquement</span>
                  )}
                </label>
                <input
                  type="number"
                  min={0}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Montant Perçu pour ce Transport (FCFA) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={montantRecuFCFA}
                  onChange={(e) => setMontantRecuFCFA(Number(e.target.value))}
                  placeholder="Ex: 150000"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nom du Client & Entreprise <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: CIMENCAM Bonabéri, Douala"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nom & Fonction du Récepteur / Destinataire <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Ex: M. Jean-Paul Mbarga (Chef de Stock)"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Conformité de la Livraison</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PODRecord['status'])}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="LIVRE_CONFORME">Livré Conforme (En parfait état)</option>
                <option value="SOUS_RESERVES">Livré Sous Réserves (Avarie partielle / Manquant)</option>
                <option value="REFUSE">Livraison Refusée par le Client</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Photo du Bordereau de Livraison <span className="text-rose-500">*</span>
              </label>
              <input
                ref={bordereauInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleBordereauSelected}
                className="hidden"
              />
              {bordereauPhotoUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-48">
                  <img src={bordereauPhotoUrl} alt="Bordereau" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setBordereauPhotoUrl(null)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full cursor-pointer shadow-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isUploadingBordereau}
                  onClick={handleCaptureBordereau}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 border-2 border-dashed border-slate-300 rounded-xl text-slate-700 font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {isUploadingBordereau ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Envoi de la photo…</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>Prendre une photo du bordereau</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Photo Justificative du Conteneur / Colis (Optionnel)</label>
              {photoUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-48">
                  <img src={photoUrl} alt="Aperçu photo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full cursor-pointer shadow-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isUploadingColis}
                  onClick={handleCapturePhoto}
                  className="w-full py-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-60 border-2 border-dashed border-slate-300 rounded-xl text-slate-700 font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {isUploadingColis ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Envoi de la photo…</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>Prendre photo du conteneur / plombage</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Observations & Réserves</label>
              <textarea
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Saisissez ici les remarques éventuelles du récepteur..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            {uploadError && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {uploadError}
              </p>
            )}

            <div className="pt-3 border-t border-slate-100 flex gap-3">
              <button
                type="submit"
                disabled={isSubmittingPOD || isUploadingBordereau || isUploadingColis}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmittingPOD ? 'Enregistrement…' : 'Valider et Enregistrer la Preuve de Livraison'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-VIEW: PREUVE DE RETOUR CONTENEUR VIDE */}
      {activeSubTab === 'RETURN' && (
        <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
          <button
            type="button"
            onClick={() => setActiveSubTab('MENU')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour au menu
          </button>

          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4.5 h-4.5 text-amber-600" />
              Preuve de Retour Conteneur Vide
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Une fois validé, ce retour clôture le conteneur et s'ajoute automatiquement à votre rapport hebdomadaire.
              Ces conteneurs ont déjà été livrés — n'importe quel chauffeur disponible peut les ramener au port.
            </p>
          </div>

          {returnSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl p-3">
              {returnSuccess}
            </div>
          )}

          {isLoadingPendingReturn ? (
            <div className="p-8 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement des conteneurs disponibles…
            </div>
          ) : pendingReturnLoadError ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-3 flex items-center justify-between">
              {pendingReturnLoadError}
              <button onClick={fetchPendingReturnContainers} className="underline cursor-pointer">Réessayer</button>
            </div>
          ) : pendingReturnContainers.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">
                Aucun conteneur vide en attente de retour pour l'instant. Un conteneur apparaît ici une fois sa preuve de livraison complétée.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReturn} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Conteneur à Retourner *</label>
                <SearchableSelect
                  required
                  options={pendingReturnContainers.map((c) => ({
                    value: c.id,
                    label: `${c.containerNumber} · BL ${c.blNumber}`,
                    sublabel: c.port === 'Douala' ? 'PAD' : 'PAK',
                  }))}
                  value={returnContainerId}
                  onChange={(id) => {
                    setReturnContainerId(id);
                    const c = pendingReturnContainers.find((x) => x.id === id);
                    // On reprend le dépôt de retour déjà planifié à la
                    // création du conteneur, plutôt que de laisser
                    // ressaisir — reste modifiable si besoin.
                    setReturnDepot(c?.depotRetourPrevu || '');
                  }}
                  placeholder="— Choisir —"
                  searchPlaceholder="Rechercher par N° conteneur ou BL…"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Date de Retour (vide) *</label>
                <input
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Dépôt de Retour *</label>
                <input
                  type="text"
                  required
                  value={returnDepot}
                  onChange={(e) => setReturnDepot(e.target.value)}
                  placeholder="Ex: Dépôt Bonabéri, Douala"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
                {pendingReturnContainers.find((c) => c.id === returnContainerId)?.depotRetourPrevu && (
                  <p className="text-[10px] text-emerald-600 mt-1">
                    Pré-rempli depuis le dépôt prévu à la création — modifiable si la situation réelle diffère.
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Frais de Retour (FCFA)</label>
                <input
                  type="number"
                  min={0}
                  value={returnFrais}
                  onChange={(e) => setReturnFrais(Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Coûts engagés pour ramener le conteneur vide (transport, frais divers…) — apparaîtra dans le rapport final.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Photo Justificative (optionnel)</label>
                {returnPhotoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-40">
                    <img src={returnPhotoUrl} alt="Retour conteneur" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setReturnPhotoUrl(null)}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-1.5 py-3 bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer font-bold text-slate-700">
                    {isUploadingReturnPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-amber-600" />}
                    <span>{isUploadingReturnPhoto ? 'Envoi…' : 'Prendre une photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleReturnPhotoSelected}
                      disabled={isUploadingReturnPhoto}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes</label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {returnError && (
                <p className="text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{returnError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmittingReturn || isUploadingReturnPhoto}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmittingReturn ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>{isSubmittingReturn ? 'Enregistrement…' : 'Valider le Retour du Conteneur'}</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* SUB-VIEW: HISTORIQUE DES RETOURS CONTENEUR */}
      {activeSubTab === 'RETURN_HISTORY' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setActiveSubTab('MENU')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour au menu
          </button>

          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher par N° conteneur, BL ou dépôt…"
                value={returnsHistorySearch}
                onChange={(e) => setReturnsHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          {isLoadingReturnsHistory ? (
            <div className="p-10 flex items-center justify-center text-slate-400 gap-2 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement…
            </div>
          ) : returnsHistoryError ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
              {returnsHistoryError}
              <button onClick={fetchReturnsHistory} className="underline cursor-pointer">Réessayer</button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800">
                  Retours Enregistrés ({returnsHistory.filter((r) =>
                    !returnsHistorySearch ||
                    r.containerNumber.toLowerCase().includes(returnsHistorySearch.toLowerCase()) ||
                    r.blNumber.toLowerCase().includes(returnsHistorySearch.toLowerCase()) ||
                    r.depotRetour.toLowerCase().includes(returnsHistorySearch.toLowerCase())
                  ).length})
                </span>
              </div>
              {returnsHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Aucun retour enregistré pour l'instant.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {returnsHistory
                    .filter((r) =>
                      !returnsHistorySearch ||
                      r.containerNumber.toLowerCase().includes(returnsHistorySearch.toLowerCase()) ||
                      r.blNumber.toLowerCase().includes(returnsHistorySearch.toLowerCase()) ||
                      r.depotRetour.toLowerCase().includes(returnsHistorySearch.toLowerCase())
                    )
                    .map((r) => (
                      <div key={r.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-violet-700 block">{r.containerNumeroReference}</span>
                          <span className="text-slate-600 font-semibold">{r.containerNumber} · BL {r.blNumber}</span>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {r.port === 'Douala' ? 'PAD' : 'PAK'} · {r.terminal} · {r.size}' — Retourné le {r.dateRetourVide} au {r.depotRetour}
                          </div>
                        </div>
                        <span className="text-emerald-700 font-bold shrink-0">{formatFCFA(r.fraisRetourFCFA)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: POD HISTORY & SEARCH */}
      {activeSubTab === 'HISTORY' && (
        <>
          {/* SEARCH & FILTERS BAR */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher par N° BL, conteneur, client ou chauffeur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="LIVRE_CONFORME">Livré Conforme (Vert)</option>
                <option value="SOUS_RESERVES">Sous Réserves (Orange)</option>
                <option value="REFUSE">Refusé (Rouge)</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>
            </div>
          </div>

          {/* POD RECORDS TABLE */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Registre des Preuves de Livraison ({filteredRecords.length} enregistrements)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Chiffrement & Horodatage actif</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-medium text-[10px] uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Ref / BL / Conteneur</th>
                    <th className="py-3 px-3">Client & Destinataire</th>
                    <th className="py-3 px-3">Chauffeur & Camion</th>
                    <th className="py-3 px-3">Date & Horodatage</th>
                    <th className="py-3 px-3">Récepteur Signataire</th>
                    <th className="py-3 px-3 text-center">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        Aucune preuve de livraison enregistrée.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((pod) => (
                      <tr key={pod.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-blue-700 block font-mono">{displayRef(pod.numeroReference, pod.id)}</span>
                          <span className="text-[11px] font-bold text-slate-900 block">{pod.blNumber}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">{pod.containerNumber}</span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900 block">{pod.clientName}</span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[200px]">
                            {pod.deliveryAddress}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-800 block">{pod.driverName}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">{pod.truckImmatriculation}</span>
                        </td>

                        <td className="py-3.5 px-3 font-mono">
                          <span className="text-slate-800 font-medium block">{pod.dateTime}</span>
                          <span className="text-[10px] text-slate-400 block">{pod.gpsLocation}</span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-800 block">{pod.recipientName}</span>
                          {pod.bordereauPhotoUrl && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Bordereau Capturé
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              pod.status === 'LIVRE_CONFORME'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : pod.status === 'SOUS_RESERVES'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {pod.status === 'LIVRE_CONFORME' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> Livré Conforme
                              </>
                            ) : pod.status === 'SOUS_RESERVES' ? (
                              <>
                                <AlertTriangle className="w-3 h-3" /> Sous Réserves
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" /> Refusé
                              </>
                            )}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedPOD(pod)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors cursor-pointer border border-blue-200"
                          >
                            Détails & Reçu
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* DETAIL MODAL / SHEET */}
      {selectedPOD && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase font-mono">{displayRef(selectedPOD.numeroReference, selectedPOD.id)}</span>
                <h3 className="font-extrabold text-base text-slate-900">
                  Récépissé Officiel de Preuve de Livraison
                </h3>
              </div>
              <button
                onClick={() => setSelectedPOD(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">N° Bon de Livraison (BL)</span>
                  <span className="font-extrabold text-slate-900 text-sm font-mono">{selectedPOD.blNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">N° Conteneur</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedPOD.containerNumber}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-2">
                <span className="text-[10px] text-slate-400 font-bold block">Client & Destinataire</span>
                <p className="font-bold text-slate-900">{selectedPOD.clientName}</p>
                <p className="text-slate-600">{selectedPOD.deliveryAddress}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Chauffeur YM-TRANSIT</span>
                  <p className="font-semibold text-slate-800">{selectedPOD.driverName} ({selectedPOD.truckImmatriculation})</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Date & Horodatage</span>
                  <p className="font-semibold text-slate-800">{selectedPOD.dateTime}</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-2">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">Bordereau de Livraison</span>
                {selectedPOD.bordereauPhotoUrl ? (
                  <img src={selectedPOD.bordereauPhotoUrl} alt="Bordereau de livraison" className="w-full max-h-56 object-cover rounded-lg border border-slate-300" />
                ) : (
                  <span className="text-slate-400 italic">Aucun bordereau enregistré</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Port de Départ</span>
                  <p className="font-semibold text-slate-800">
                    {selectedPOD.departurePort === 'PAK' && 'PAK — Kribi'}
                    {selectedPOD.departurePort === 'PAD' && 'PAD — Douala'}
                    {selectedPOD.departurePort === 'Autres' && (selectedPOD.departurePortAutre || 'Autre')}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Distance / Montant</span>
                  <p className="font-semibold text-slate-800">
                    {selectedPOD.distanceKm} km · {new Intl.NumberFormat('fr-FR').format(selectedPOD.montantRecuFCFA)} FCFA
                  </p>
                </div>
              </div>

              {selectedPOD.photoUrl && (
                <div className="border-t border-slate-200 pt-2">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Photo Justificative</span>
                  <img src={selectedPOD.photoUrl} alt="Justificatif" className="w-full max-h-48 object-cover rounded-lg border" />
                </div>
              )}

              {selectedPOD.observations && (
                <div className="border-t border-slate-200 pt-2 bg-amber-50/50 p-2.5 rounded-lg border-amber-200">
                  <span className="text-[10px] text-amber-800 font-bold block">Observations & Réserves :</span>
                  <p className="text-slate-700 italic">{selectedPOD.observations}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer le Récépissé POD</span>
              </button>
              <button
                onClick={() => setSelectedPOD(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
