import React, { useState } from 'react';
import {
  History,
  PackageCheck,
  Search,
  Download,
  Printer,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Star,
  X,
  ShieldCheck,
  UserCheck,
  Clock,
  MapPin,
  Truck,
  MessageSquare,
} from 'lucide-react';
import { UserProfile } from '../types';
import { ReportListItem } from '../lib/reports';
import { DEMO_POD_RECORDS, PODRecord } from './ProofOfDeliveryView';
import { displayRef } from '../lib/displayRef';
import { DEMO_FEEDBACKS, CustomerFeedbackRecord } from './CustomerFeedbackView';

interface DriverHistoryViewProps {
  currentUser: UserProfile | null;
  driverReports?: ReportListItem[];
  onViewReport?: (reportId: string) => void;
}

export const DriverHistoryView: React.FC<DriverHistoryViewProps> = ({
  currentUser,
  driverReports = [],
  onViewReport,
}) => {
  const [activeTab, setActiveTab] = useState<'POD' | 'REPORTS' | 'FEEDBACK'>('POD');
  const [podRecords, setPodRecords] = useState<PODRecord[]>(DEMO_POD_RECORDS);
  const [feedbacks, setFeedbacks] = useState<CustomerFeedbackRecord[]>(DEMO_FEEDBACKS);

  // Search & Filter state for POD
  const [podSearch, setPodSearch] = useState('');
  const [podStatusFilter, setPodStatusFilter] = useState('ALL');
  const [selectedPOD, setSelectedPOD] = useState<PODRecord | null>(null);

  // Search for Feedbacks
  const [feedbackSearch, setFeedbackSearch] = useState('');

  // Filtered POD records
  const filteredPODs = podRecords.filter((rec) => {
    const matchSearch =
      rec.blNumber.toLowerCase().includes(podSearch.toLowerCase()) ||
      rec.clientName.toLowerCase().includes(podSearch.toLowerCase()) ||
      (rec.containerNumber && rec.containerNumber.toLowerCase().includes(podSearch.toLowerCase())) ||
      rec.driverName.toLowerCase().includes(podSearch.toLowerCase());

    if (podStatusFilter === 'ALL') return matchSearch;
    return matchSearch && rec.status === podStatusFilter;
  });

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['N° POD,N° BL,N° Conteneur,Client,Chauffeur,Statut,Date,Récepteur']
        .concat(
          filteredPODs.map(
            (r) =>
              `${r.id},${r.blNumber},${r.containerNumber || ''},"${r.clientName}","${r.driverName}",${r.status},${r.dateTime},"${r.recipientName}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `POD_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: PODRecord['status']) => {
    switch (status) {
      case 'LIVRE_CONFORME':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Livré Conforme
          </span>
        );
      case 'SOUS_RESERVES':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            Sous Réserves
          </span>
        );
      case 'REFUSE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 bg-rose-50 border border-rose-300 px-2.5 py-1 rounded-full shadow-2xs">
            <XCircle className="w-3.5 h-3.5" />
            Refusé
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
          <History className="w-4 h-4" />
          <span>Historique Global de la Flotte & Activités</span>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
          Registre des Historiques
        </h1>
        <p className="text-xs text-slate-300 mt-0.5">
          Consultation centralisée des preuves de livraison (POD), rapports hebdomadaires et retours client.
        </p>

        {/* TOP TABS */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('POD')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'POD'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            <span>Preuves de Livraison / POD ({podRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REPORTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'REPORTS'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Rapports Hebdomadaires ({driverReports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FEEDBACK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'FEEDBACK'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Retours Client ({feedbacks.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: POD HISTORY REGISTRY TABLE */}
      {activeTab === 'POD' && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS BAR */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher par N° BL, conteneur, client ou chauffeur..."
                value={podSearch}
                onChange={(e) => setPodSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                value={podStatusFilter}
                onChange={(e) => setPodStatusFilter(e.target.value)}
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

          {/* TABLE CONTAINER */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Registre des Preuves de Livraison ({filteredPODs.length} enregistrements)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Chiffrement & Horodatage actif</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <th className="p-3">REF / BL / CONTENEUR</th>
                    <th className="p-3">CLIENT & DESTINATAIRE</th>
                    <th className="p-3">CHAUFFEUR & CAMION</th>
                    <th className="p-3">DATE & HORODATAGE</th>
                    <th className="p-3">RÉCEPTEUR SIGNATAIRE</th>
                    <th className="p-3 text-center">STATUT</th>
                    <th className="p-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredPODs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Aucune preuve de livraison trouvée pour les critères spécifiés.
                      </td>
                    </tr>
                  ) : (
                    filteredPODs.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <span className="font-extrabold text-blue-600 block">{displayRef(rec.numeroReference, rec.id)}</span>
                          <span className="font-mono text-slate-900 font-bold text-[11px] block">{rec.blNumber}</span>
                          {rec.containerNumber && (
                            <span className="text-[10px] font-mono text-slate-400 block">{rec.containerNumber}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{rec.clientName}</span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[200px]">{rec.deliveryAddress}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block">{rec.driverName}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">{rec.truckImmatriculation}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-slate-700 block">{rec.dateTime}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{rec.gpsLocation}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{rec.recipientName}</span>
                          {rec.bordereauPhotoUrl && (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Bordereau Capturé
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">{getStatusBadge(rec.status)}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedPOD(rec)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Détails & Reçu</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY REPORTS HISTORY */}
      {activeTab === 'REPORTS' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-3">
          <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider mb-2">
            Historique des Rapports Hebdomadaires ({driverReports.length})
          </h3>
          {driverReports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Aucun rapport hebdomadaire enregistré dans l'historique.
            </div>
          ) : (
            <div className="space-y-2">
              {driverReports.map((rpt) => (
                <div
                  key={rpt.id}
                  onClick={() => onViewReport && onViewReport(rpt.id)}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">Semaine du {rpt.semaineDu}</span>
                    <span className="text-[11px] text-slate-500">{rpt.nomChauffeur} · Camion {rpt.immatriculation}</span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg">
                    {rpt.isSubmitted ? 'Soumis / Validé' : 'Brouillon'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FEEDBACK HISTORY */}
      {activeTab === 'FEEDBACK' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4">
          <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
            Historique des Retours Client ({feedbacks.length})
          </h3>
          <div className="space-y-3">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm block">{fb.clientName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">N° BL : {fb.blNumber} · Chauffeur : {fb.driverName}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-100 px-2.5 py-1 rounded-lg">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-black text-slate-900 text-xs font-mono">{fb.rating} / 5</span>
                  </div>
                </div>
                <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200">
                  "{fb.comment}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAIL MODAL FOR POD RECORD */}
      {selectedPOD && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedPOD(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b pb-3 border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Fiche Officielle - Récépissé
              </span>
              <h2 className="text-lg font-extrabold text-slate-900">{displayRef(selectedPOD.numeroReference, selectedPOD.id)}</h2>
              <p className="text-xs text-slate-500">BL : {selectedPOD.blNumber}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 text-[10px] block">CLIENT</span>
                  <span className="font-bold text-slate-900">{selectedPOD.clientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">RÉCEPTEUR</span>
                  <span className="font-bold text-slate-900">{selectedPOD.recipientName}</span>
                </div>
              </div>

              {selectedPOD.bordereauPhotoUrl && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Bordereau de Livraison :</span>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex justify-center max-h-40">
                    <img src={selectedPOD.bordereauPhotoUrl} alt="Bordereau de livraison" className="max-h-36 object-contain" />
                  </div>
                </div>
              )}

              {selectedPOD.observations && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Observations :</span>
                  <p className="p-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl font-medium">
                    {selectedPOD.observations}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer Récépissé</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
