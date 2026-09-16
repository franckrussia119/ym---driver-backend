import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  Loader2,
  Package,
  Ship,
  Camera,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Container, listPendingReturnContainers, submitContainerReturn } from '../lib/containers';
import { usePolling } from '../lib/usePolling';
import { uploadFile, ApiError } from '../lib/api';

export const ContainerReturnView: React.FC = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setContainers(await listPendingReturnContainers());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les conteneurs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Rafraîchissement silencieux : plusieurs chauffeurs partagent ce même
  // pool, il peut donc changer à tout moment sans action du superviseur.
  usePolling(() => {
    listPendingReturnContainers().then(setContainers).catch(() => {});
  }, 12000);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const [target, setTarget] = useState<Container | null>(null);
  const [dateRetourVide, setDateRetourVide] = useState(new Date().toISOString().split('T')[0]);
  const [depotRetour, setDepotRetour] = useState('');
  const [fraisRetour, setFraisRetour] = useState(0);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const openReturn = (c: Container) => {
    setTarget(c);
    setDateRetourVide(new Date().toISOString().split('T')[0]);
    setDepotRetour(c.depotRetourPrevu || '');
    setFraisRetour(0);
    setNotes('');
    setPhotoUrl(null);
    setSaveError(null);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingPhoto(true);
    setSaveError(null);
    try {
      setPhotoUrl(await uploadFile(file, file.name));
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Échec de l'envoi de la photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (!depotRetour.trim()) {
      setSaveError('Veuillez indiquer le dépôt de retour.');
      return;
    }
    if (dateRetourVide > new Date().toISOString().split('T')[0]) {
      setSaveError('La date de retour ne peut pas être dans le futur.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await submitContainerReturn(target.id, {
        dateRetourVide,
        depotRetour,
        fraisRetourFCFA: fraisRetour,
        photoUrl: photoUrl || undefined,
        notes: notes || undefined,
      });
      setSuccessMessage(`Conteneur ${target.containerNumber} retourné avec succès — sa vie est maintenant clôturée.`);
      setTarget(null);
      await fetchAll();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Échec de l'enregistrement du retour.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-blue-600" />
          <span>Preuve de Retour Conteneur</span>
        </h2>
        <p className="text-xs text-slate-500">
          Enregistrer le retour d'un conteneur vide clôture définitivement sa vie et génère son rapport final.
        </p>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl p-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

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
      {!isLoading && containers.length === 0 && !loadError && (
        <div className="p-10 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          Aucun conteneur livré en attente de retour. Un conteneur apparaît ici une fois sa preuve de livraison complétée.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {containers.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
            <div className="font-mono text-[11px] text-blue-700 font-bold">{c.numeroReference}</div>
            <div className="font-bold text-sm text-slate-900 mt-0.5">{c.containerNumber}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1.5">
              <Ship className="w-3 h-3" /> {c.port === 'Douala' ? 'PAD' : 'PAK'} · {c.terminal}
            </div>
            <button
              onClick={() => openReturn(c)}
              className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Enregistrer le Retour
            </button>
          </div>
        ))}
      </div>

      {target && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900">Retour du Conteneur</h3>
                <p className="text-[11px] text-slate-500">{target.containerNumber} · BL {target.blNumber}</p>
              </div>
              <button onClick={() => setTarget(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg px-3 py-2 mb-4 flex items-start gap-2">
              <Package className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Cette action clôture définitivement la vie de ce conteneur. Elle ne peut être faite qu'une seule fois.
            </div>
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Date de Retour (vide) *</label>
                <input type="date" required max={new Date().toISOString().split('T')[0]} value={dateRetourVide} onChange={(e) => setDateRetourVide(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Dépôt de Retour *</label>
                <input type="text" required value={depotRetour} onChange={(e) => setDepotRetour(e.target.value)}
                  placeholder="Ex: Dépôt Bonabéri, Douala"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
                {target?.depotRetourPrevu && (
                  <p className="text-[10px] text-emerald-600 mt-1">
                    Pré-rempli depuis le dépôt prévu à la création — modifiable si la situation réelle diffère.
                  </p>
                )}
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Frais de Retour (FCFA)</label>
                <input type="number" min={0} value={fraisRetour} onChange={(e) => setFraisRetour(Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                <p className="text-[10px] text-slate-400 mt-1">Apparaîtra dans le rapport final du conteneur.</p>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Photo Justificative (optionnel)</label>
                {photoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-40">
                    <img src={photoUrl} alt="Retour conteneur" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setPhotoUrl(null)}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-1.5 py-3 bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer font-bold text-slate-700">
                    {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-emerald-600" />}
                    <span>{isUploadingPhoto ? 'Envoi…' : 'Prendre une photo'}</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} disabled={isUploadingPhoto} />
                  </label>
                )}
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              {saveError && <p className="text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{saveError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setTarget(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium cursor-pointer">Annuler</button>
                <button type="submit" disabled={isSaving || isUploadingPhoto}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5">
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Clôturer le Conteneur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
