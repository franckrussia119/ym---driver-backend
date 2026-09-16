import React from 'react';
import { BLReport } from '../lib/containers';
import { formatFCFA } from '../types';
import { Printer, X, FileText } from 'lucide-react';

interface PrintableBLReportViewProps {
  report: BLReport;
  onClose?: () => void;
}

export const PrintableBLReportView: React.FC<PrintableBLReportViewProps> = ({ report, onClose }) => {
  return (
    <div className="print-isolate fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-6 overflow-y-auto print:p-0 print:static print:bg-white print:overflow-visible print:inset-auto print:z-auto">
      {/* Non-printable Navigation / Action Header */}
      <div className="w-full max-w-[210mm] bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-between text-white shadow-xl print:hidden shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">Aperçu PDF - Rapport par BL</h2>
            <p className="text-xs text-slate-400 font-mono">{report.blNumber}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer / Exporter</span>
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
            <h1 className="text-2xl font-black tracking-tight">RAPPORT CONSOLIDÉ PAR BL</h1>
            <p className="text-xs text-slate-500 mt-1">YM-TRANSIT — Gestion Flotte & Conteneurs</p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">N° BL</span>
            <span className="block font-mono font-black text-lg text-indigo-700">{report.blNumber}</span>
            <span className="block text-[10px] text-slate-400 mt-0.5">Édité le {new Date().toLocaleDateString('fr-FR')}</span>
          </div>
        </div>

        {/* SECTION 1: RÉSUMÉ GLOBAL */}
        <div className="mb-6">
          <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
            1. Résumé Global
          </div>
          <div className="grid grid-cols-3 gap-2 border border-slate-300 border-t-0 p-3">
            <div className="border border-slate-300 rounded p-2.5 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Conteneurs</span>
              <span className="text-lg font-black text-slate-900 block mt-1">{report.totalContainers}</span>
            </div>
            <div className="border border-blue-300 bg-blue-50 rounded p-2.5 text-center">
              <span className="text-[9px] font-bold text-blue-600 uppercase block">Ouverts</span>
              <span className="text-lg font-black text-blue-800 block mt-1">{report.ouverts}</span>
            </div>
            <div className="border border-slate-300 rounded p-2.5 text-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Fermés</span>
              <span className="text-lg font-black text-slate-700 block mt-1">{report.fermes}</span>
            </div>
            <div className="border border-slate-300 rounded p-2.5 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Revenu Total</span>
              <span className="text-sm font-black text-slate-900 block mt-1">{formatFCFA(report.totalRevenueFCFA)}</span>
            </div>
            <div className="border border-slate-300 rounded p-2.5 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Coûts Totaux</span>
              <span className="text-sm font-black text-slate-900 block mt-1">{formatFCFA(report.totalCostsFCFA)}</span>
            </div>
            <div className={`border rounded p-2.5 text-center ${report.totalMargeFCFA >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
              <span className={`text-[9px] font-bold uppercase block ${report.totalMargeFCFA >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Marge Totale</span>
              <span className={`text-sm font-black block mt-1 ${report.totalMargeFCFA >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>{formatFCFA(report.totalMargeFCFA)}</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: DÉTAIL PAR CONTENEUR */}
        <div className="mb-6">
          <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
            2. Détail par Conteneur ({report.totalContainers})
          </div>
          <table className="w-full border-collapse border border-slate-300 text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <td className="font-bold px-2 py-1.5 border border-slate-300 text-slate-700">N° CONTENEUR</td>
                <td className="font-bold px-2 py-1.5 border border-slate-300 text-slate-700">STATUT</td>
                <td className="font-bold px-2 py-1.5 border border-slate-300 text-slate-700">CLIENT</td>
                <td className="font-bold px-2 py-1.5 border border-slate-300 text-slate-700">TRANSPORTEUR</td>
                <td className="font-bold px-2 py-1.5 border border-slate-300 text-slate-700">LIVRÉ LE</td>
                <td className="font-bold px-2 py-1.5 border border-slate-300 text-slate-700">JOURS</td>
                <td className="font-bold px-2 py-1.5 border border-slate-300 text-slate-700">REVENU</td>
                <td className="font-bold px-2 py-1.5 border border-slate-300 text-slate-700">COÛTS</td>
                <td className="font-bold px-2 py-1.5 border border-slate-300 text-slate-700">MARGE</td>
              </tr>
            </thead>
            <tbody>
              {report.containers.map((c) => (
                <tr key={c.container.id}>
                  <td className="px-2 py-1.5 border border-slate-300 font-mono font-bold">{c.container.containerNumber}</td>
                  <td className="px-2 py-1.5 border border-slate-300">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${c.container.status === 'OUVERT' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                      {c.container.status === 'OUVERT' ? 'Ouvert' : 'Fermé'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300">{c.container.clientNom || '—'}</td>
                  <td className="px-2 py-1.5 border border-slate-300">{c.carrier.label}</td>
                  <td className="px-2 py-1.5 border border-slate-300">{c.dateLivraisonClient ? c.dateLivraisonClient.split(' ')[0] : '—'}</td>
                  <td className="px-2 py-1.5 border border-slate-300 text-center">{c.joursDetentionClient ?? '—'}</td>
                  <td className="px-2 py-1.5 border border-slate-300 font-semibold">{c.tarifConvenuFCFA > 0 ? formatFCFA(c.tarifConvenuFCFA) : '—'}</td>
                  <td className="px-2 py-1.5 border border-slate-300 font-semibold">{formatFCFA(c.montantTotalFCFA)}</td>
                  <td className={`px-2 py-1.5 border border-slate-300 font-bold ${c.margeFCFA >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatFCFA(c.margeFCFA)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SECTION 3: DESTINATIONS & CONTENU */}
        <div className="mb-6">
          <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
            3. Contenu & Destinations
          </div>
          <table className="w-full border-collapse border border-slate-300 text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <td className="font-bold px-2 py-1.5 border border-slate-300 text-slate-700">N° CONTENEUR</td>
                <td className="font-bold px-2 py-1.5 border border-slate-300 text-slate-700">CONTENU</td>
                <td className="font-bold px-2 py-1.5 border border-slate-300 text-slate-700">DESTINATION</td>
                <td className="font-bold px-2 py-1.5 border border-slate-300 text-slate-700">RETOUR PAR</td>
              </tr>
            </thead>
            <tbody>
              {report.containers.map((c) => (
                <tr key={c.container.id}>
                  <td className="px-2 py-1.5 border border-slate-300 font-mono font-bold">{c.container.containerNumber}</td>
                  <td className="px-2 py-1.5 border border-slate-300">{c.container.contenuDescription || '—'}</td>
                  <td className="px-2 py-1.5 border border-slate-300">{c.container.destinationDechargement || '—'}</td>
                  <td className="px-2 py-1.5 border border-slate-300">{c.retourPar || (c.container.status === 'FERME' ? '—' : 'Pas encore retourné')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-3 border-t border-slate-200 text-[9px] text-slate-400 text-center">
          Document généré automatiquement par YM-TRANSIT — Module Gestion des Conteneurs · Édité le {new Date().toLocaleDateString('fr-FR')}
        </div>
      </div>
    </div>
  );
};
