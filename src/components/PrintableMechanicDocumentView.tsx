import React from 'react';
import { MechanicInvoice, formatFCFA } from '../types';
import { displayRef } from '../lib/displayRef';
import { Printer, X, Wrench, ShieldCheck, FileText, Camera, CheckCircle2 } from 'lucide-react';

interface PrintableMechanicDocumentViewProps {
  invoice: MechanicInvoice;
  onClose?: () => void;
}

export const PrintableMechanicDocumentView: React.FC<PrintableMechanicDocumentViewProps> = ({
  invoice,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-6 overflow-y-auto print:p-0 print:static print:bg-white print:overflow-visible print:inset-auto print:z-auto">
      {/* Non-printable Navigation / Action Header */}
      <div className="w-full max-w-[210mm] bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-between text-white shadow-xl print:hidden shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">
              Aperçu PDF - Rapport & Facture d'Intervention Mécanique
            </h2>
            <p className="text-xs text-slate-400 font-mono">Document Officiel N° {displayRef(invoice.numeroReference, invoice.id)}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
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
          {/* HEADER COMPANY & DOCUMENT IDENTIFIER */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="bg-amber-600 text-white px-2.5 py-1 rounded text-xs font-black tracking-wider uppercase">
                  YM-TRANSIT
                </span>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  FLOTTE LOGISTIQUE & MAINTENANCE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                RAPPORT D'INTERVENTION MÉCANIQUE & FICHE D'ATELIER
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                Gestion des Pièces de Rechange & Main d'Œuvre d'Entretien
              </p>
            </div>

            <div className="text-right border-l-2 border-slate-200 pl-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">N° Document</span>
              <span className="text-sm sm:text-base font-mono font-extrabold text-amber-700 block">{displayRef(invoice.numeroReference, invoice.id)}</span>
              <span className="text-xs text-slate-500 font-medium block mt-1">Date: {invoice.dateIntervention}</span>
              <span className="inline-block px-2 py-0.5 mt-1 text-[10px] font-extrabold rounded bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                {invoice.status}
              </span>
            </div>
          </div>

          {/* SECTION 1: IDENTIFICATION INTERVENTION & VÉHICULE */}
          <div className="mb-6">
            <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t flex justify-between items-center">
              <span>1. IDENTIFICATION DU VÉHICULE & INTERVENANTS</span>
              {invoice.faultId && (
                <span className="text-amber-400 text-[10px] font-mono">
                  RÉF. PANNE: {invoice.faultId}
                </span>
              )}
            </div>

            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr>
                  <td className="bg-slate-100 font-bold px-3 py-2 w-1/4 border border-slate-300 text-slate-700">
                    IMMATRICULATION CAMION
                  </td>
                  <td className="px-3 py-2 border border-slate-300 font-mono font-extrabold text-slate-900 text-sm">
                    {invoice.truckImmatriculation}
                  </td>
                  <td className="bg-slate-100 font-bold px-3 py-2 w-1/4 border border-slate-300 text-slate-700">
                    MÉCANICIEN RESPONSABLE
                  </td>
                  <td className="px-3 py-2 border border-slate-300 font-semibold text-slate-900">
                    {invoice.mecanicienNom}
                  </td>
                </tr>
                <tr>
                  <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300 text-slate-700">
                    CHAUFFEUR CONCERNÉ
                  </td>
                  <td className="px-3 py-2 border border-slate-300 font-medium text-slate-800">
                    {invoice.chauffeurNom || 'Non renseigné'}
                  </td>
                  <td className="bg-slate-100 font-bold px-3 py-2 border border-slate-300 text-slate-700">
                    DATE INTERVENTION
                  </td>
                  <td className="px-3 py-2 border border-slate-300 font-medium text-slate-800">
                    {invoice.dateIntervention}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 2: DESCRIPTION DES TRAVAUX & DIAGNOSTIC */}
          <div className="mb-6">
            <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t">
              2. DIAGNOSTIC ET DESCRIPTION DES TRAVAUX EFFECTUÉS
            </div>
            <div className="p-3.5 border border-slate-300 rounded-b bg-slate-50/70 text-xs text-slate-800 leading-relaxed font-medium">
              {invoice.descriptionTravaux || 'Aucune description fournie.'}
            </div>
          </div>

          {/* SECTION 3: PIÈCES DE RECHANGE UTILISÉES */}
          <div className="mb-6">
            <div className="bg-slate-900 text-white font-extrabold text-xs uppercase px-3 py-1.5 mb-2 rounded-t flex items-center justify-between">
              <span>3. PIÈCES DE RECHANGE ET FOURNITURES (SPARE PARTS)</span>
              <span className="text-[10px] font-normal text-slate-300">({invoice.parts.length} article(s))</span>
            </div>

            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2 border border-slate-300 w-10 text-center">N°</th>
                  <th className="p-2 border border-slate-300 text-left">Désignation de la Pièce de Rechange</th>
                  <th className="p-2 border border-slate-300 w-20 text-center">Qté</th>
                  <th className="p-2 border border-slate-300 w-36 text-right">Prix Unitaire (FCFA)</th>
                  <th className="p-2 border border-slate-300 w-36 text-right">Montant Total (FCFA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.parts.map((item, index) => (
                  <tr key={item.id || index} className="even:bg-slate-50/50">
                    <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-500">
                      {index + 1}
                    </td>
                    <td className="p-2 border border-slate-300 font-semibold text-slate-900">
                      {item.name || 'Pièce non spécifiée'}
                    </td>
                    <td className="p-2 border border-slate-300 text-center font-bold text-slate-800">
                      {item.qty}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono text-slate-700">
                      {formatFCFA(item.unitPrice)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono font-extrabold text-slate-900">
                      {formatFCFA(item.total)}
                    </td>
                  </tr>
                ))}
                {invoice.parts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                      Aucune pièce de rechange facturée pour cette intervention.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <td colSpan={4} className="p-2 border border-slate-300 text-right uppercase text-[11px] text-slate-700">
                    Sous-Total Pièces de Rechange (FCFA) :
                  </td>
                  <td className="p-2 border border-slate-300 text-right font-mono text-xs font-black text-slate-900">
                    {formatFCFA(invoice.totalPieces)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* SECTION 4: MAIN D'ŒUVRE ET TOTAUX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:grid-cols-2">
            {/* Main d'œuvre */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-800 text-white font-bold text-xs uppercase px-3 py-1.5">
                4. MAIN D'ŒUVRE ATELIER
              </div>
              <div className="p-3 text-xs space-y-2 bg-slate-50/50">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-600 font-medium">Temps d'intervention:</span>
                  <span className="font-bold text-slate-900">{invoice.mainOeuvreHeures} Heure(s)</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-600 font-medium">Taux horaire atelier:</span>
                  <span className="font-mono text-slate-800">{formatFCFA(invoice.tauxHoraire)} / h</span>
                </div>
                <div className="flex justify-between pt-1 text-slate-900 font-bold">
                  <span>Total Main d'œuvre:</span>
                  <span className="font-mono font-extrabold">{formatFCFA(invoice.totalMainOeuvre)}</span>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="border-2 border-slate-900 rounded overflow-hidden shadow-sm">
              <div className="bg-slate-900 text-white font-bold text-xs uppercase px-3 py-1.5 flex justify-between">
                <span>5. RÉCAPITULATIF FINANCIER</span>
                <span className="text-amber-400">NET À REGLER</span>
              </div>
              <div className="p-3 text-xs space-y-2 bg-white">
                <div className="flex justify-between text-slate-600">
                  <span>Total Pièces de Rechange:</span>
                  <span className="font-mono font-bold text-slate-800">{formatFCFA(invoice.totalPieces)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Main d'Œuvre:</span>
                  <span className="font-mono font-bold text-slate-800">{formatFCFA(invoice.totalMainOeuvre)}</span>
                </div>
                <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-sm font-black text-amber-950 bg-amber-50 -mx-3 -mb-3 p-3">
                  <span className="uppercase">TOTAL INTERVENTION (FCFA) :</span>
                  <span className="font-mono text-base font-extrabold text-amber-700">
                    {formatFCFA(invoice.totalTTC || invoice.totalHT)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: PHOTOS ET PREUVES D'ACHAT (if available) */}
          {invoice.partsPhotoUrls && invoice.partsPhotoUrls.length > 0 && (
            <div className="mb-6 print:break-inside-avoid">
              <div className="bg-slate-800 text-white font-bold text-xs uppercase px-3 py-1.5 mb-2 rounded-t flex items-center space-x-2">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>6. PREUVES PHOTOS PIÈCES NEUVES / REÇUS D'ACHAT ATTACHÉS ({invoice.partsPhotoUrls.length})</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-3 border border-slate-300 rounded bg-slate-50">
                {invoice.partsPhotoUrls.map((url, idx) => (
                  <div key={idx} className="border border-slate-300 rounded overflow-hidden bg-white shadow-xs">
                    <img src={url} alt={`Photo pièce ${idx + 1}`} className="w-full h-24 object-cover" />
                    <div className="p-1 text-[9px] font-bold text-center bg-slate-100 text-slate-600 uppercase border-t border-slate-200">
                      Pièce / Preuve #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 6: SIGNATURES & STAMPS */}
          <div className="border border-slate-300 rounded-lg p-4 bg-slate-50/50 print:break-inside-avoid">
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-3 text-center border-b border-slate-300 pb-1">
              VISA & APPROBATIONS OFFICIELLES YM-TRANSIT
            </h4>
            <div className="grid grid-cols-2 gap-8 text-xs">
              {/* Mechanic Signature */}
              <div className="flex flex-col justify-between h-28 border border-dashed border-slate-300 rounded p-3 bg-white">
                <div>
                  <span className="font-bold text-slate-800 uppercase text-[10px] block">
                    Signature & Cachet du Mécanicien
                  </span>
                  <span className="text-slate-500 text-[11px]">{invoice.mecanicienNom}</span>
                </div>
                <div className="text-right text-[9px] text-slate-400 italic">
                  Signé électroniquement / Certifié conforme
                </div>
              </div>

              {/* Admin / Fleet Supervisor Signature */}
              <div className="flex flex-col justify-between h-28 border border-dashed border-slate-300 rounded p-3 bg-white">
                <div>
                  <span className="font-bold text-slate-800 uppercase text-[10px] block">
                    Validation Administration / Direction Logistique
                  </span>
                  <span className="text-slate-500 text-[11px]">Direction Flotte YM-TRANSIT</span>
                </div>
                <div className="flex items-center space-x-1 text-emerald-700 font-bold text-[10px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>TRANSMIS POUR RAPPROCHEMENT COMPTABLE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DOCUMENT FOOTER */}
        <div className="border-t border-slate-300 pt-3 text-[10px] text-slate-500 flex justify-between items-center print:pt-2">
          <span>YM-TRANSIT SARL — Gestion Flotte & Maintenance Routière</span>
          <span className="font-mono">Document généré le {new Date().toLocaleDateString('fr-FR')}</span>
          <span>Page 1 / 1</span>
        </div>
      </div>
    </div>
  );
};
