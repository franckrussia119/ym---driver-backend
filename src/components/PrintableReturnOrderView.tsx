import React, { useState } from 'react';
import { ContainerWithDetails } from '../lib/containers';
import { Printer, X, FileText, RotateCcw } from 'lucide-react';

interface PrintableReturnOrderViewProps {
  container: ContainerWithDetails;
  onClose?: () => void;
}

export const PrintableReturnOrderView: React.FC<PrintableReturnOrderViewProps> = ({ container, onClose }) => {
  const [chauffeurNom, setChauffeurNom] = useState(container.driverNom || container.subcontractorNom || '');
  const [camion, setCamion] = useState(container.immatriculationCamionTrajet || '');
  const [depotRetour, setDepotRetour] = useState('');
  const [isReady, setIsReady] = useState(false);

  const pod = container.pod[0];

  if (!isReady) {
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-emerald-600" /> Ordre de Retour — Qui ramène le conteneur ?
            </h3>
            {onClose && (
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Ce conteneur est disponible pour retour par n'importe quel chauffeur. Indiquez qui s'en charge pour générer son ordre imprimé.
          </p>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Chauffeur désigné pour ce retour *</label>
              <input type="text" required value={chauffeurNom} onChange={(e) => setChauffeurNom(e.target.value)}
                placeholder="Nom du chauffeur"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Camion</label>
              <input type="text" value={camion} onChange={(e) => setCamion(e.target.value)}
                placeholder="Ex: LT-100-AA"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-semibold" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Dépôt de Retour Prévu</label>
              <input type="text" value={depotRetour} onChange={(e) => setDepotRetour(e.target.value)}
                placeholder="Ex: Dépôt Bonabéri, Douala"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium text-xs cursor-pointer">
              Annuler
            </button>
            <button
              onClick={() => chauffeurNom.trim() && setIsReady(true)}
              disabled={!chauffeurNom.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer text-xs"
            >
              Générer l'Ordre
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="print-isolate fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-6 overflow-y-auto print:p-0 print:static print:bg-white print:overflow-visible print:inset-auto print:z-auto">
      {/* Non-printable Navigation / Action Header */}
      <div className="w-full max-w-[210mm] bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-between text-white shadow-xl print:hidden shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">Aperçu PDF - Ordre de Retour</h2>
            <p className="text-xs text-slate-400 font-mono">{container.numeroReference}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer / Remettre au Chauffeur</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Printable A4 Page */}
      <div className="w-full max-w-[210mm] bg-white text-slate-900 p-8 sm:p-10 shadow-2xl print:shadow-none print:p-8 font-sans text-sm">
        <div className="flex items-center justify-between border-b-4 border-slate-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight">ORDRE DE RETOUR — CONTENEUR VIDE</h1>
            <p className="text-xs text-slate-500 mt-1">YM-TRANSIT — Gestion Flotte & Conteneurs</p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">N° d'Ordre</span>
            <span className="block font-mono font-black text-lg text-emerald-700">{container.numeroReference}</span>
            <span className="block text-[10px] text-slate-400 mt-0.5">Édité le {new Date().toLocaleDateString('fr-FR')}</span>
          </div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg px-4 py-2.5 mb-6 text-xs font-bold text-amber-800 text-center">
          À REMETTRE AU CHAUFFEUR AVANT LE DÉPART POUR LE RETOUR — CONTENEUR DÉJÀ LIVRÉ, EN ATTENTE DE RESTITUTION
        </div>

        <div className="mb-5">
          <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
            1. Conteneur
          </div>
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <tbody>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 w-1/4 border border-slate-300">N° CONTENEUR</td>
                <td className="px-3 py-2 border border-slate-300 font-mono font-bold">{container.containerNumber}</td>
                <td className="bg-slate-100 font-bold px-3 py-2 w-1/4 border border-slate-300">TAILLE</td>
                <td className="px-3 py-2 border border-slate-300">{container.size}'</td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">N° BL</td>
                <td className="px-3 py-2 border border-slate-300 font-mono">{container.blNumber}</td>
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">PORT D'ORIGINE</td>
                <td className="px-3 py-2 border border-slate-300">{container.port === 'Douala' ? 'Port Autonome de Douala (PAD)' : 'Port Autonome de Kribi (PAK)'}</td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">CLIENT LIVRÉ</td>
                <td className="px-3 py-2 border border-slate-300" colSpan={3}>{container.clientNom || '—'}{pod ? ` — livré le ${pod.dateTime?.split(' ')[0] || ''}` : ''}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-5">
          <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
            2. Retour à Effectuer
          </div>
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <tbody>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 w-1/4 border border-slate-300">CHAUFFEUR DÉSIGNÉ</td>
                <td className="px-3 py-2 border border-slate-300 font-bold" colSpan={3}>{chauffeurNom}</td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">CAMION</td>
                <td className="px-3 py-2 border border-slate-300 font-mono">{camion || '—'}</td>
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">DÉPÔT DE RETOUR</td>
                <td className="px-3 py-2 border border-slate-300">{depotRetour || 'Au choix du chauffeur, dépôt agréé le plus proche'}</td>
              </tr>
              {container.dateLimiteRetour && (
                <tr>
                  <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">DATE LIMITE</td>
                  <td className="px-3 py-2 border border-slate-300 font-bold text-rose-700" colSpan={3}>
                    {new Date(container.dateLimiteRetour).toLocaleDateString('fr-FR')} — au-delà, des frais de détention peuvent s'appliquer
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-10 pt-6 border-t border-slate-300">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-8">Signature Superviseur Conteneurs</p>
            <div className="border-b border-slate-400 w-full"></div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-8">Signature Chauffeur (reçu et pris connaissance)</p>
            <div className="border-b border-slate-400 w-full"></div>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-slate-200 text-[9px] text-slate-400 text-center">
          Document généré automatiquement par YM-TRANSIT — Module Gestion des Conteneurs · Édité le {new Date().toLocaleDateString('fr-FR')}
        </div>
      </div>
    </div>
  );
};
