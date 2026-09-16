import React from 'react';
import { ContainerReport } from '../lib/containers';
import { formatFCFA } from '../types';
import { Printer, X, Package } from 'lucide-react';

interface PrintableContainerReportViewProps {
  report: ContainerReport;
  onClose?: () => void;
}

const STEP_STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  DONE: 'Fait',
  BLOCKED: 'Bloqué',
};

export const PrintableContainerReportView: React.FC<PrintableContainerReportViewProps> = ({ report, onClose }) => {
  return (
    <div className="print-isolate fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-6 overflow-y-auto print:p-0 print:static print:bg-white print:overflow-visible print:inset-auto print:z-auto">
      {/* Non-printable Navigation / Action Header */}
      <div className="w-full max-w-[210mm] bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-between text-white shadow-xl print:hidden shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">
              Aperçu PDF - Rapport Complet Conteneur
            </h2>
            <p className="text-xs text-slate-400 font-mono">{report.container.numeroReference}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer / Générer PDF</span>
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

      {/* PRINTABLE A4 CONTAINER */}
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 font-sans p-8 sm:p-10 shadow-2xl print:shadow-none print:p-0 print:w-full print:max-w-none print:min-h-0 border border-slate-200 print:border-none rounded-2xl print:rounded-none flex flex-col justify-between space-y-6">
        <div>
          {/* HEADER */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="bg-blue-600 text-white px-2.5 py-1 rounded text-xs font-black tracking-wider uppercase">
                  YM-TRANSIT
                </span>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  GESTION DES CONTENEURS
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                RAPPORT COMPLET DE CONTENEUR
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                Cycle de vie complet, chronologie des étapes et coûts associés
              </p>
            </div>

            <div className="text-right border-l-2 border-slate-200 pl-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">N° Référence</span>
              <span className="text-sm sm:text-base font-mono font-extrabold text-blue-700 block">{report.container.numeroReference}</span>
              <span className="text-xs text-slate-500 font-medium block mt-1">BL: {report.container.blNumber}</span>
              <span
                className={`inline-block px-2 py-0.5 mt-1 text-[10px] font-extrabold rounded uppercase border ${
                  report.isOuvert
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {report.isOuvert ? 'Vie Ouverte' : 'Vie Fermée'}
              </span>
            </div>
          </div>

          {/* SECTION 1: IDENTIFICATION */}
          <div className="mb-6">
            <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
              1. IDENTIFICATION DU CONTENEUR
            </div>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr>
                  <td className="bg-slate-100 font-bold px-3 py-2 w-1/4 border border-slate-300 text-slate-700">N° CONTENEUR</td>
                  <td className="px-3 py-2 border border-slate-300 font-mono">{report.container.containerNumber}</td>
                  <td className="bg-slate-100 font-bold px-3 py-2 w-1/4 border border-slate-300 text-slate-700">TAILLE</td>
                  <td className="px-3 py-2 border border-slate-300">{report.container.size}'</td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300 text-slate-700">PORT</td>
                  <td className="px-3 py-2 border border-slate-300">{report.container.port === 'Douala' ? 'Port Autonome de Douala (PAD)' : 'Port Autonome de Kribi (PAK)'}</td>
                  <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300 text-slate-700">TERMINAL</td>
                  <td className="px-3 py-2 border border-slate-300">{report.container.terminal}</td>
                </tr>
                {(report.container.clientNom || report.container.clientContact) && (
                  <tr>
                    <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300 text-slate-700">CLIENT</td>
                    <td className="px-3 py-2 border border-slate-300">{report.container.clientNom || '—'}</td>
                    <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300 text-slate-700">CONTACT CLIENT</td>
                    <td className="px-3 py-2 border border-slate-300">{report.container.clientContact || '—'}</td>
                  </tr>
                )}
                {report.container.contenuDescription && (
                  <tr>
                    <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300 text-slate-700">CONTENU</td>
                    <td className="px-3 py-2 border border-slate-300" colSpan={3}>{report.container.contenuDescription}</td>
                  </tr>
                )}
                {report.container.destinationDechargement && (
                  <tr>
                    <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300 text-slate-700">DÉCHARGEMENT</td>
                    <td className="px-3 py-2 border border-slate-300" colSpan={3}>{report.container.destinationDechargement}</td>
                  </tr>
                )}
                <tr>
                  <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300 text-slate-700">DATE D'OUVERTURE</td>
                  <td className="px-3 py-2 border border-slate-300">{new Date(report.dateOuverture).toLocaleDateString('fr-FR')}</td>
                  <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300 text-slate-700">DATE DE FERMETURE</td>
                  <td className="px-3 py-2 border border-slate-300">{report.dateFermeture ? new Date(report.dateFermeture).toLocaleDateString('fr-FR') : '—'}</td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300 text-slate-700">CHAUFFEUR — LIVRAISON</td>
                  <td className="px-3 py-2 border border-slate-300" colSpan={3}>
                    {report.carrier.label}{report.carrier.telephone ? ` — ${report.carrier.telephone}` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300 text-slate-700">CHAUFFEUR — RETOUR</td>
                  <td className="px-3 py-2 border border-slate-300" colSpan={3}>
                    {report.retourPar ? `${report.retourPar}${report.retourParTelephone ? ` — ${report.retourParTelephone}` : ''}` : 'Pas encore retourné'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 2: RÉSUMÉ CHIFFRÉ */}
          <div className="mb-6">
            <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
              2. RÉSUMÉ
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="border border-slate-300 rounded p-2.5 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Jours (Création → Clôture)</span>
                <span className="text-lg font-black text-slate-900 block">{report.totalDays}</span>
              </div>
              <div className="border border-slate-300 rounded p-2.5 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Jours (Livraison Client → Clôture)</span>
                <span className="text-lg font-black text-slate-900 block">{report.joursDetentionClient ?? '—'}</span>
                {report.dateLivraisonClient && <span className="text-[8px] text-slate-400 block">Livré le {report.dateLivraisonClient.split(' ')[0]}</span>}
              </div>
              <div className="border border-slate-300 rounded p-2.5 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Étapes</span>
                <span className="text-lg font-black text-slate-900 block">{report.stepsCompleted}/{report.stepsTotal}</span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              <div className="border border-slate-300 rounded p-2.5 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Droits & Taxes</span>
                <span className="text-sm font-black text-emerald-700 block mt-1">{formatFCFA(report.montantDroitsTaxesFCFA)}</span>
              </div>
              <div className="border border-slate-300 rounded p-2.5 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Frais de Retour</span>
                <span className="text-sm font-black text-amber-700 block mt-1">{formatFCFA(report.montantFraisRetourFCFA)}</span>
              </div>
              <div className="border border-slate-300 rounded p-2.5 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Frais de Dépôt</span>
                <span className="text-sm font-black text-amber-700 block mt-1">{formatFCFA(report.montantFraisDepotFCFA)}</span>
              </div>
              <div className="border border-slate-300 rounded p-2.5 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Frais Suppl.</span>
                <span className="text-sm font-black text-amber-700 block mt-1">{formatFCFA(report.montantFraisSupplementairesFCFA)}</span>
              </div>
              <div className="border border-slate-300 rounded p-2.5 text-center bg-slate-50">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Coût Total</span>
                <span className="text-sm font-black text-slate-900 block mt-1">{formatFCFA(report.montantTotalFCFA)}</span>
              </div>
            </div>
            {report.fraisSupplementairesNote && (
              <p className="text-[9px] text-slate-500 italic mt-1">Note frais supplémentaires : {report.fraisSupplementairesNote}</p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="border border-slate-300 rounded p-2.5 text-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Tarif Convenu (Revenu)</span>
                <span className="text-sm font-black text-slate-900 block mt-1">
                  {report.tarifConvenuFCFA > 0 ? formatFCFA(report.tarifConvenuFCFA) : 'Non renseigné'}
                </span>
              </div>
              <div className={`border rounded p-2.5 text-center ${report.margeFCFA >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
                <span className={`text-[9px] font-bold uppercase block ${report.margeFCFA >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Marge (Revenu − Coûts)</span>
                <span className={`text-sm font-black block mt-1 ${report.margeFCFA >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>{formatFCFA(report.margeFCFA)}</span>
              </div>
            </div>
          </div>

          {/* SECTION 3: CHRONOLOGIE */}
          <div className="mb-6">
            <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
              3. CHRONOLOGIE COMPLÈTE DU PIPELINE
            </div>
            <table className="w-full border-collapse border border-slate-300 text-[11px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-2 py-1.5 border border-slate-300 text-left w-8">#</th>
                  <th className="px-2 py-1.5 border border-slate-300 text-left">Étape</th>
                  <th className="px-2 py-1.5 border border-slate-300 text-left w-24">Statut</th>
                  <th className="px-2 py-1.5 border border-slate-300 text-left w-24">Date</th>
                  <th className="px-2 py-1.5 border border-slate-300 text-left">Agent / Notes</th>
                </tr>
              </thead>
              <tbody>
                {report.timeline.map((t) => (
                  <tr key={t.stepNumber}>
                    <td className="px-2 py-1.5 border border-slate-300 font-bold text-slate-500">{t.stepNumber}</td>
                    <td className="px-2 py-1.5 border border-slate-300 font-semibold">{t.stepName}</td>
                    <td className="px-2 py-1.5 border border-slate-300">{STEP_STATUS_LABEL[t.status]}</td>
                    <td className="px-2 py-1.5 border border-slate-300">{t.dateDone || '—'}</td>
                    <td className="px-2 py-1.5 border border-slate-300 text-slate-500">
                      {t.agent || ''}{t.agent && t.notes ? ' — ' : ''}{t.notes || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SECTION 4: LIVRAISON & RETOUR */}
          {(report.pod.length > 0 || report.return) && (
            <div className="mb-6">
              <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
                4. LIVRAISON & RETOUR
              </div>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <tbody>
                  {report.pod.map((p: any) => (
                    <tr key={p.id}>
                      <td className="bg-slate-100 font-bold px-3 py-2 w-1/4 border border-slate-300 text-slate-700">PREUVE DE LIVRAISON</td>
                      <td className="px-3 py-2 border border-slate-300" colSpan={3}>
                        {p.numeroReference} — {p.recipientName} — {p.dateTime} — {p.status}
                      </td>
                    </tr>
                  ))}
                  {report.return && (
                    <tr>
                      <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300 text-slate-700">RETOUR CONTENEUR VIDE</td>
                      <td className="px-3 py-2 border border-slate-300" colSpan={3}>
                        Le {report.return.dateRetourVide} au dépôt {report.return.depotRetour}
                        {report.return.notes ? ` — ${report.return.notes}` : ''}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SECTION 5: INCIDENTS & TRANSFERTS */}
          {report.incidents.length > 0 && (
            <div className="mb-6">
              <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
                5. INCIDENTS & TRANSFERTS
              </div>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <td className="font-bold px-3 py-2 border border-slate-300 text-slate-700">TYPE</td>
                    <td className="font-bold px-3 py-2 border border-slate-300 text-slate-700">DATE</td>
                    <td className="font-bold px-3 py-2 border border-slate-300 text-slate-700">DESCRIPTION</td>
                  </tr>
                </thead>
                <tbody>
                  {report.incidents.map((inc) => (
                    <tr key={inc.id}>
                      <td className="px-3 py-2 border border-slate-300 font-semibold">
                        {inc.type === 'PANNE' ? 'Panne' : inc.type === 'TRANSFERT' ? 'Transfert' : 'Autre'}
                      </td>
                      <td className="px-3 py-2 border border-slate-300">{new Date(inc.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td className="px-3 py-2 border border-slate-300">{inc.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t-2 border-slate-900 pt-3 flex items-center justify-between text-[10px] text-slate-400">
          <span>Document généré automatiquement par YM-TRANSIT — Module Gestion des Conteneurs</span>
          <span>Édité le {new Date().toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
    </div>
  );
};
