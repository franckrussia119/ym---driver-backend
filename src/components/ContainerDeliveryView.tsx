import React, { useState, useEffect, useCallback } from 'react';
import {
  PackageCheck,
  Loader2,
  Camera,
  X,
  CheckCircle2,
  Truck,
} from 'lucide-react';
import { Container, listPendingDeliveryContainers } from '../lib/containers';
import { createPOD } from '../lib/pod';
import { uploadFile, ApiError } from '../lib/api';
import { CAMEROON_DESTINATIONS, getDistanceKm } from '../data/distances';
import { usePolling } from '../lib/usePolling';
import { SearchableSelect } from './SearchableSelect';

export const ContainerDeliveryView: React.FC = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setContainers(await listPendingDeliveryContainers());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les conteneurs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  usePolling(() => {
    listPendingDeliveryContainers().then(setContainers).catch(() => {});
  }, 15000);

  const [selectedContainerId, setSelectedContainerId] = useState('');
  const selectedContainer = containers.find((c) => c.id === selectedContainerId);

  const [clientName, setClientName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isCustomDestination, setIsCustomDestination] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [montantRecuFCFA, setMontantRecuFCFA] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [status, setStatus] = useState<'LIVRE_CONFORME' | 'SOUS_RESERVES' | 'REFUSE'>('LIVRE_CONFORME');
  const [bordereauPhotoUrl, setBordereauPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setSelectedContainerId('');
    setClientName('');
    setDeliveryAddress('');
    setIsCustomDestination(false);
    setRecipientName('');
    setMontantRecuFCFA(0);
    setDistanceKm(0);
    setStatus('LIVRE_CONFORME');
    setBordereauPhotoUrl(null);
    setObservations('');
    setSubmitError(null);
  };

  const handleDestinationChange = (value: string) => {
    setDeliveryAddress(value);
    if (selectedContainer) {
      const km = getDistanceKm(value, selectedContainer.port === 'Douala' ? 'PAD' : 'PAK');
      if (km) setDistanceKm(km);
    }
  };

  // Dès qu'un conteneur est choisi, on reprend automatiquement ce qui a
  // déjà été enregistré à sa création (client, destination) plutôt que de
  // laisser ressaisir — évite tout risque de saisir une information
  // différente de celle déjà connue du système.
  useEffect(() => {
    if (!selectedContainer) return;
    setClientName(selectedContainer.clientNom || '');
    const knownDestination = selectedContainer.destinationDechargement || '';
    const matchesKnownList = CAMEROON_DESTINATIONS.some((d) => d.label === knownDestination);
    setIsCustomDestination(knownDestination.length > 0 && !matchesKnownList);
    setDeliveryAddress(knownDestination);
    if (knownDestination) {
      const km = getDistanceKm(knownDestination, selectedContainer.port === 'Douala' ? 'PAD' : 'PAK');
      if (km) setDistanceKm(km);
    }
  }, [selectedContainerId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingPhoto(true);
    setSubmitError(null);
    try {
      setBordereauPhotoUrl(await uploadFile(file, file.name));
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Échec de l'envoi de la photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContainer) {
      setSubmitError('Veuillez choisir le conteneur livré.');
      return;
    }
    if (!clientName.trim() || !deliveryAddress.trim() || !recipientName.trim()) {
      setSubmitError('Veuillez remplir le client, la destination et le récepteur.');
      return;
    }
    if (!bordereauPhotoUrl) {
      setSubmitError('Veuillez joindre une photo du bordereau de livraison.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await createPOD({
        blNumber: selectedContainer.blNumber,
        containerNumber: selectedContainer.containerNumber,
        containerId: selectedContainer.id,
        clientName,
        deliveryAddress,
        driverName: selectedContainer.subcontractorNom || 'Sous-traitant',
        truckImmatriculation: 'Non renseigné',
        dateTime: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        recipientName,
        status,
        bordereauPhotoUrl,
        observations,
        departurePort: selectedContainer.port === 'Douala' ? 'PAD' : 'PAK',
        montantRecuFCFA,
        distanceKm,
        subcontractorDriverId: selectedContainer.assignedSubcontractorId || undefined,
        subcontractorDriverName: selectedContainer.subcontractorNom || undefined,
      });
      setSuccessMessage(
        `Livraison enregistrée pour ${selectedContainer.containerNumber} — comptabilisée dans l'analyse de ${selectedContainer.subcontractorNom}. Le conteneur apparaît maintenant dans "Preuve de Retour Conteneur".`
      );
      resetForm();
      await fetchAll();
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Échec de l'enregistrement de la livraison.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-emerald-600" />
          <span>Preuve de Livraison Conteneur (Sous-traitants)</span>
        </h2>
        <p className="text-xs text-slate-500">
          Les chauffeurs sous-traitants n'ont pas accès à la plateforme — enregistrez leur livraison ici, en leur nom.
          Elle apparaîtra dans leur analyse individuelle.
        </p>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="p-10 flex items-center justify-center text-slate-400 gap-2 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement…
        </div>
      ) : loadError ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
          {loadError}
          <button onClick={fetchAll} className="underline cursor-pointer">Réessayer</button>
        </div>
      ) : containers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">
            Aucun conteneur en attente de livraison. Assignez d'abord un sous-traitant à un conteneur depuis le Registre.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Conteneur Livré *</label>
            <SearchableSelect
              required
              options={containers.map((c) => ({
                value: c.id,
                label: `${c.containerNumber} · BL ${c.blNumber}`,
                sublabel: `${c.subcontractorNom} (${c.subcontractorEntreprise || 'société non renseignée'})`,
              }))}
              value={selectedContainerId}
              onChange={setSelectedContainerId}
              placeholder="— Choisir le conteneur —"
              searchPlaceholder="Rechercher par N° conteneur, BL ou chauffeur…"
            />
          </div>

          {selectedContainer && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-amber-900 block">{selectedContainer.subcontractorNom}</span>
                <span className="text-[11px] text-amber-700">{selectedContainer.subcontractorEntreprise || 'Société non renseignée'} — transporteur assigné à ce conteneur</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Client *</label>
              <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Récepteur *</label>
              <input type="text" required value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Destination *</label>
            {!isCustomDestination ? (
              <select
                required
                value={deliveryAddress}
                onChange={(e) => {
                  if (e.target.value === '__CUSTOM__') { setIsCustomDestination(true); setDeliveryAddress(''); }
                  else handleDestinationChange(e.target.value);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">— Choisir —</option>
                {CAMEROON_DESTINATIONS.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
                <option value="__CUSTOM__">Autre (saisie libre)…</option>
              </select>
            ) : (
              <input type="text" required value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Nom de la ville / destination"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Distance (km)</label>
              <input type="number" min={0} value={distanceKm} onChange={(e) => setDistanceKm(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Montant Perçu (FCFA) *</label>
              <input type="number" required min={0} value={montantRecuFCFA} onChange={(e) => setMontantRecuFCFA(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Conformité de la Livraison</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold">
              <option value="LIVRE_CONFORME">Livré Conforme</option>
              <option value="SOUS_RESERVES">Sous Réserves</option>
              <option value="REFUSE">Refusé</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Photo du Bordereau *</label>
            {bordereauPhotoUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-40">
                <img src={bordereauPhotoUrl} alt="Bordereau" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setBordereauPhotoUrl(null)}
                  className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-1.5 py-3 bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer font-bold text-slate-700">
                {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-emerald-600" />}
                <span>{isUploadingPhoto ? 'Envoi…' : 'Téléverser une photo'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
              </label>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Observations</label>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
          </div>

          {submitError && <p className="text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting || isUploadingPhoto}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
            <span>{isSubmitting ? 'Enregistrement…' : 'Valider la Livraison'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
