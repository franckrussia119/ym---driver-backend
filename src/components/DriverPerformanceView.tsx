import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Award,
  Trophy,
  Search,
  ArrowUpDown,
  Download,
  Printer,
  UserCheck,
  TrendingUp,
  Clock,
  AlertTriangle,
  Smile,
  Zap,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { DriverPerformanceScore } from '../types';
import { listDriverScores, recomputeDriverScores } from '../lib/fuel';
import { ApiError } from '../lib/api';
import { usePolling } from '../lib/usePolling';

interface DriverPerformanceViewProps {}

export const DriverPerformanceView: React.FC<DriverPerformanceViewProps> = () => {
  const [scores, setScores] = useState<DriverPerformanceScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [recomputeError, setRecomputeError] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await listDriverScores();
      setScores(list);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les scores.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  usePolling(() => {
    listDriverScores().then(setScores).catch(() => {});
  }, 15000);

  const handleRecompute = async () => {
    setRecomputeError(null);
    setIsRecomputing(true);
    try {
      const periode = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
      await recomputeDriverScores(periode);
      await fetchScores();
    } catch (err) {
      setRecomputeError(err instanceof ApiError ? err.message : 'Échec du recalcul des scores.');
    } finally {
      setIsRecomputing(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  // Sort
  const [sortField, setSortField] = useState<keyof DriverPerformanceScore>('scoreGlobalPct');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter & Sort
  const filteredScores = scores.filter((s) => s.chauffeurNom.toLowerCase().includes(searchTerm.toLowerCase()));

  const sortedScores = [...filteredScores].sort((a, b) => {
    let valA = a[sortField] || 0;
    let valB = b[sortField] || 0;
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof DriverPerformanceScore) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Calculations
  const totalDriversCount = scores.length;
  const avgScoreFleet = totalDriversCount > 0 ? Math.round(scores.reduce((a, b) => a + b.scoreGlobalPct, 0) / totalDriversCount) : 0;
  const totalKmFleet = scores.reduce((a, b) => a + b.totalKm, 0);
  const avgNoteClient = totalDriversCount > 0 ? (scores.reduce((a, b) => a + b.noteClientMoyenne, 0) / totalDriversCount).toFixed(1) : '4.5';

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Rang', 'Chauffeur', 'Période', 'Km Totaux', 'Trajets', 'Ponctualité %', 'Moy Conso L/100', 'Pannes', 'Note Client', 'Score Global %'];
    const rows = sortedScores.map((s) => [
      s.rang,
      s.chauffeurNom,
      s.periode,
      s.totalKm,
      s.nombreTrajets,
      `${s.ponctualitePct}%`,
      s.moyenneConsoL100,
      s.pannesSignaleesCount,
      `${s.noteClientMoyenne}/5`,
      `${s.scoreGlobalPct}%`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Performance_Chauffeurs_YM_TRANSIT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            <span>Tableau de Bord & Performance des Chauffeurs</span>
          </h2>
          <p className="text-xs text-slate-500">
            Score global multicritères (ponctualité, éco-conduite, absence de pannes/accidents, avis clients).
          </p>
        </div>

        <button
          type="button"
          onClick={handleRecompute}
          disabled={isRecomputing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          {isRecomputing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span>Recalculer les scores (mois en cours)</span>
        </button>
      </div>

      {isLoading && (
        <div className="p-6 flex items-center justify-center text-slate-400 gap-2 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement des scores…
        </div>
      )}
      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
          {loadError}
          <button onClick={fetchScores} className="underline cursor-pointer">Réessayer</button>
        </div>
      )}
      {recomputeError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4">
          {recomputeError}
        </div>
      )}
      {!isLoading && scores.length === 0 && !loadError && (
        <div className="p-10 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          Aucun score calculé pour le moment. Cliquez sur « Recalculer les scores » pour générer le classement à partir des données réelles (rapports, pannes, carburant, avis clients).
        </div>
      )}

      {/* TOP 3 PODIUM CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scores.slice(0, 3).map((driver, index) => (
          <div
            key={driver.chauffeurId}
            className={`p-5 rounded-2xl border transition-all shadow-xs relative overflow-hidden ${
              index === 0
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
                : index === 1
                ? 'bg-slate-50 border-slate-300'
                : 'bg-amber-900/5 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Rang #{driver.rang}
              </span>
              <Trophy
                className={`w-6 h-6 ${
                  index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : 'text-amber-700'
                }`}
              />
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-base shadow-sm">
                {driver.chauffeurNom.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{driver.chauffeurNom}</h3>
                <span className="text-[11px] text-slate-500">{driver.periode}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Score Global</span>
                <span className="text-lg font-extrabold text-blue-700 font-mono">{driver.scoreGlobalPct}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Satisfaction Client</span>
                <span className="text-sm font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{driver.noteClientMoyenne} / 5</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* KPI SUMMARIES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total Chauffeurs</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalDriversCount}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Effectif actif</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Score Moyen Flotte</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-blue-700 mt-1 font-mono">{avgScoreFleet}%</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Objectif : &gt;85%</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Km Parcourus Cumulés</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {new Intl.NumberFormat('fr-FR').format(totalKmFleet)} km
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Distances validées</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Note Client Moyenne</span>
            <Smile className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600 mt-1 font-mono">{avgNoteClient} / 5</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Retours livraisons</span>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher un chauffeur par son nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>
          </div>
        </div>
      </div>

      {/* DETAILED ANALYSIS TABLE (Standard Pattern) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            Tableau d'Analyse Individuelle des Performances Chauffeurs ({sortedScores.length} chauffeurs)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Période : {scores[0]?.periode || new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-medium text-[10px] uppercase tracking-wider border-b border-slate-200">
                <th
                  onClick={() => handleSort('rang')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Rang</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('chauffeurNom')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Chauffeur</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Km Parcourus</th>
                <th className="py-3 px-3">Ponctualité %</th>
                <th className="py-3 px-3">Moyenne Conso L/100</th>
                <th className="py-3 px-3 text-center">Pannes Signalees</th>
                <th className="py-3 px-3">Avis Client</th>
                <th
                  onClick={() => handleSort('scoreGlobalPct')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Score Global %</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedScores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    Aucun chauffeur correspondant.
                  </td>
                </tr>
              ) : (
                sortedScores.map((s) => (
                  <tr key={s.chauffeurId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900 font-mono">
                      #{s.rang}
                    </td>

                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      {s.chauffeurNom}
                      <span className="text-[10px] text-slate-400 font-normal block">{s.nombreTrajets} trajets</span>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-semibold text-slate-800">
                      {new Intl.NumberFormat('fr-FR').format(s.totalKm)} km
                    </td>

                    <td className="py-3.5 px-3 font-mono">
                      <span className="font-bold text-emerald-700">{s.ponctualitePct}%</span>
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-800 font-semibold">
                      {s.moyenneConsoL100} L/100
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.pannesSignaleesCount === 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <span>{s.pannesSignaleesCount} signalements</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>{s.noteClientMoyenne} / 5</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-blue-700 text-sm">
                      {s.scoreGlobalPct}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* TOTALS FOOTER */}
            <tfoot>
              <tr className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-200">
                <td className="py-3 px-4 text-center">—</td>
                <td className="py-3 px-3">TOTAL : {sortedScores.length} chauffeurs</td>
                <td className="py-3 px-3 font-mono">{totalKmFleet} km</td>
                <td className="py-3 px-3">—</td>
                <td className="py-3 px-3">—</td>
                <td className="py-3 px-3 text-center">—</td>
                <td className="py-3 px-3 font-semibold">{avgNoteClient} / 5 moy.</td>
                <td className="py-3 px-4 text-right font-mono text-blue-800">{avgScoreFleet}% moy. flotte</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
