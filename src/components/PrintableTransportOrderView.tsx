import React from 'react';
import { ContainerWithDetails } from '../lib/containers';
import { formatFCFA } from '../types';
import { Printer, X, FileText } from 'lucide-react';

interface PrintableTransportOrderViewProps {
  container: ContainerWithDetails;
  onClose?: () => void;
}

export const PrintableTransportOrderView: React.FC<PrintableTransportOrderViewProps> = ({ container, onClose }) => {
  const carrierLabel =
    container.carrierType === 'CHAUFFEUR_INTERNE'
      ? container.driverNom || 'Chauffeur interne (non renseigné)'
      : container.carrierType === 'SOUS_TRAITANT'
      ? `${container.subcontractorNom || 'Sous-traitant'} (${container.subcontractorEntreprise || 'société non renseignée'})`
      : null;
  const carrierPhone =
    container.carrierType === 'CHAUFFEUR_INTERNE' ? container.driverTelephone : container.subcontractorTelephone;

  return (
    <div className="print-isolate fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-6 overflow-y-auto print:p-0 print:static print:bg-white print:overflow-visible print:inset-auto print:z-auto">
      {/* Non-printable Navigation / Action Header */}
      <div className="w-full max-w-[210mm] bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-between text-white shadow-xl print:hidden shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">Aperçu PDF - Ordre de Transport</h2>
            <p className="text-xs text-slate-400 font-mono">{container.numeroReference}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
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
            <h1 className="text-2xl font-black tracking-tight">ORDRE DE TRANSPORT</h1>
            <p className="text-xs text-slate-500 mt-1">YM-TRANSIT — Gestion Flotte & Conteneurs</p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">N° d'Ordre</span>
            <span className="block font-mono font-black text-lg text-teal-700">{container.numeroReference}</span>
            <span className="block text-[10px] text-slate-400 mt-0.5">Émis le {new Date(container.createdAt).toLocaleDateString('fr-FR')}</span>
          </div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg px-4 py-2.5 mb-6 text-xs font-bold text-amber-800 text-center">
          À REMETTRE AU CHAUFFEUR AVANT TOUT DÉPART — À CONSERVER PENDANT TOUTE LA DURÉE DU TRAJET
        </div>

        {/* SECTION 1: CONTENEUR & CLIENT */}
        <div className="mb-5">
          <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
            1. Conteneur & Client
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
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">PORT</td>
                <td className="px-3 py-2 border border-slate-300">{container.port === 'Douala' ? 'Port Autonome de Douala (PAD)' : 'Port Autonome de Kribi (PAK)'} · {container.terminal}</td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">CLIENT</td>
                <td className="px-3 py-2 border border-slate-300">{container.clientNom || '—'}</td>
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">CONTACT CLIENT</td>
                <td className="px-3 py-2 border border-slate-300">{container.clientContact || '—'}</td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">CONTENU</td>
                <td className="px-3 py-2 border border-slate-300" colSpan={3}>{container.contenuDescription || 'Non renseigné'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECTION 2: TRANSPORT */}
        <div className="mb-5">
          <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
            2. Transport
          </div>
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <tbody>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 w-1/4 border border-slate-300">CHAUFFEUR</td>
                <td className="px-3 py-2 border border-slate-300 font-bold" colSpan={3}>
                  {carrierLabel || 'NON ASSIGNÉ'}{carrierPhone ? ` — Tél : ${carrierPhone}` : ''}
                </td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">CAMION</td>
                <td className="px-3 py-2 border border-slate-300 font-mono">{container.immatriculationCamionTrajet || '—'}</td>
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">REMORQUE</td>
                <td className="px-3 py-2 border border-slate-300 font-mono">{container.remorqueTrajet || '—'}</td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">LIVRAISON À</td>
                <td className="px-3 py-2 border border-slate-300" colSpan={3}>{container.destinationDechargement || 'Non renseigné'}</td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">RETOUR CONTENEUR VIDE</td>
                <td className="px-3 py-2 border border-slate-300" colSpan={3}>Dépôt le plus proche du port de départ, sauf instruction contraire ci-dessous</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECTION 3: DOCUMENTS & INSTRUCTIONS */}
        <div className="mb-5">
          <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
            3. Documents Requis & Instructions
          </div>
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <tbody>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 w-1/4 border border-slate-300">DOCUMENTS REQUIS</td>
                <td className="px-3 py-2 border border-slate-300" colSpan={3}>{container.documentsRequis || "BL, pièce d'identité du chauffeur, bordereau de livraison à faire signer"}</td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">INSTRUCTIONS PARTICULIÈRES</td>
                <td className="px-3 py-2 border border-slate-300" colSpan={3}>{container.notes || 'Aucune'}</td>
              </tr>
              {container.dateLimiteRetour && (
                <tr>
                  <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300">DATE LIMITE DE RETOUR</td>
                  <td className="px-3 py-2 border border-slate-300 font-bold text-rose-700" colSpan={3}>
                    {new Date(container.dateLimiteRetour).toLocaleDateString('fr-FR')} — au-delà, des frais de détention peuvent s'appliquer
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* SECTION 4: TARIF */}
        <div className="mb-5">
          <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
            4. Tarif Convenu
          </div>
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <tbody>
              <tr>
                <td className="bg-slate-100 font-bold px-3 py-2 w-1/4 border border-slate-300">TARIF CONVENU</td>
                <td className="px-3 py-2 border border-slate-300 font-bold text-emerald-700" colSpan={3}>
                  {container.tarifConvenuFCFA > 0 ? formatFCFA(container.tarifConvenuFCFA) : 'Non renseigné'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SIGNATURES */}
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
