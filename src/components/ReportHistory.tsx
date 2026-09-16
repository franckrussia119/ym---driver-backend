import React, { useState } from 'react';
import { WeeklyReport, InspectionDefectItem } from '../types';
import {
  FileText,
  Trash2,
  Eye,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
} from 'lucide-react';

interface ReportHistoryProps {
  reports: WeeklyReport[];
  currentReportId: string;
  onSelectReport: (report: WeeklyReport) => void;
  onDeleteReport: (id: string) => void;
  onCreateNew: () => void;
}

export const ReportHistory: React.FC<ReportHistoryProps> = ({
  reports,
  currentReportId,
  onSelectReport,
  onDeleteReport,
  onCreateNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReports = reports.filter((r) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      r.driverInfo.nomChauffeur.toLowerCase().includes(searchLower) ||
      r.driverInfo.immatriculation.toLowerCase().includes(searchLower) ||
      r.driverInfo.semaineDu.includes(searchLower) ||
      r.id.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-base tracking-wide flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Historique des Rapports Registres YM-TRANSIT
          </h2>
          <p className="text-xs text-slate-400">Consultez, rechargez ou gérez vos rapports enregistrés</p>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouveau rapport vierge
        </button>
      </div>

      {/* Search & Stats Filter */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par chauffeur, immat..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {filteredReports.length} rapport(s) archivé(s)
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-200">
        {filteredReports.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aucun rapport ne correspond à votre recherche.
          </div>
        ) : (
          filteredReports.map((report) => {
            const isCurrent = report.id === currentReportId;
            const totalKm = report.trips.reduce((acc, t) => acc + (Number(t.kmParcourus) || 0), 0);
            const activeDefects = (Object.values(report.defects) as InspectionDefectItem[]).filter((d) => d.constate).length;

            return (
              <div
                key={report.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isCurrent ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {report.driverInfo.nomChauffeur || 'Chauffeur Non Renseigné'}
                    </span>
                    {activeDefects > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> {activeDefects} anomalie(s)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Véhicule Conforme
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded">
                        En cours
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Semaine du {report.driverInfo.semaineDu || '?'} au {report.driverInfo.semaineAu || '?'}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Camion: {report.driverInfo.immatriculation || '—'}
                    </span>
                    <span className="font-semibold text-blue-900">{totalKm} km parcourus</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectReport(report)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Charger le rapport
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteReport(report.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                    title="Supprimer de l'historique"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
