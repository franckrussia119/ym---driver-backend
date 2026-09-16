import React, { useState } from 'react';
import { UserProfile } from '../types';
import { AlertTriangle, Send, X, ShieldAlert, Truck, MapPin, Wrench } from 'lucide-react';

export interface FaultFormInput {
  immatriculation: string;
  niveauUrgence: 'Faible' | 'Moyenne' | 'Élevée / Immobilisation';
  categorie: string;
  description: string;
  localisation: string;
}

interface FaultDeclarationModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSubmitFault: (fault: FaultFormInput) => void;
  isSubmitting?: boolean;
}

export const FaultDeclarationModal: React.FC<FaultDeclarationModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSubmitFault,
  isSubmitting,
}) => {
  const [immatriculation, setImmatriculation] = useState(
    currentUser.camionAssigne ? currentUser.camionAssigne.split(' ')[0] : ''
  );
  const [niveauUrgence, setNiveauUrgence] = useState<'Faible' | 'Moyenne' | 'Élevée / Immobilisation'>('Moyenne');
  const [categorie, setCategorie] = useState('FREINS');
  const [description, setDescription] = useState('');
  const [localisation, setLocalisation] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Veuillez décrire le problème constaté.');
      return;
    }

    onSubmitFault({
      immatriculation,
      niveauUrgence,
      categorie,
      description,
      localisation: localisation || 'Sur route / Au dépôt',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold leading-tight">Déclarer une Panne / Défaillance</h3>
              <p className="text-[11px] sm:text-xs text-amber-100">Transmis directement au superviseur & service mécanique</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center space-x-1">
                <Truck className="w-3.5 h-3.5 text-slate-500" />
                <span>Immatriculation Camion</span>
              </label>
              <input
                type="text"
                value={immatriculation}
                onChange={(e) => setImmatriculation(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono text-xs uppercase"
                placeholder="Ex: AB-789-XY"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                <span>Niveau d'urgence</span>
              </label>
              <select
                value={niveauUrgence}
                onChange={(e) => setNiveauUrgence(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 text-xs font-medium"
              >
                <option value="Faible">Faible (À contrôler plus tard)</option>
                <option value="Moyenne">Moyenne (Nécessite intervention proche)</option>
                <option value="Élevée / Immobilisation">Élevée / IMMOBILISATION VÉHICULE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center space-x-1">
                <Wrench className="w-3.5 h-3.5 text-slate-500" />
                <span>Catégorie du problème</span>
              </label>
              <select
                value={categorie}
                onChange={(e) => setCategorie(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 text-xs"
              >
                <option value="MOTEUR">MOTEUR</option>
                <option value="FREINS">FREINS & PNEUMATIQUE AIR</option>
                <option value="PNEUS">PNEUMATIQUES / ROUES</option>
                <option value="ÉLECTRIQUE">ÉLECTRIQUE & ÉCLAIRAGE</option>
                <option value="HYDRAULIQUE">CIRCUIT HYDRAULIQUE</option>
                <option value="REFROIDISSEMENT">REFROIDISSEMENT</option>
                <option value="TRANSMISSION">TRANSMISSION & BOÎTE</option>
                <option value="CARROSSERIE / REMORQUE">CARROSSERIE / REMORQUE</option>
                <option value="AUTRE">AUTRE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Localisation du camion / Organe</span>
              </label>
              <input
                type="text"
                value={localisation}
                onChange={(e) => setLocalisation(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 text-xs"
                placeholder="Ex: Essieu avant droit / Dépôt Nord"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Description détaillée du défaut ou bruit constaté *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 text-xs"
              placeholder="Décrivez précisément ce qui s'est passé, les voyants allumés ou les anomalies de conduite..."
            ></textarea>
          </div>

          <div className="pt-2 flex justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs shadow flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Envoi en cours…' : 'Envoyer la Déclaration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
