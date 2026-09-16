import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  ArrowLeft,
  FileText,
  AlertTriangle,
  PackageCheck,
  Wrench,
  ShieldAlert,
  Fuel,
  TrendingUp,
  Truck,
  Loader2,
  ChevronRight,
  BarChart3,
  Calendar,
  Wallet,
  Route,
} from 'lucide-react';
import { formatFCFA } from '../types';
import { listDrivers, getDriverHistory, DriverListItem, DriverHistoryResponse } from '../lib/driverHistory';
import { ApiError } from '../lib/api';
import { usePolling } from '../lib/usePolling';
import { displayRef } from '../lib/displayRef';

type PeriodPreset = '7J' | '30J' | 'MOIS' | 'PERSONNALISE' | 'TOUT';

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function presetToRange(preset: PeriodPreset): { from?: string; to?: string } {
  const now = new Date();
  const to = isoDate(now);
  if (preset === '7J') {
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    return { from: isoDate(from), to };
  }
  if (preset === '30J') {
    const from = new Date(now);
    from.setDate(now.getDate() - 30);
    return { from: isoDate(from), to };
  }
  if (preset === 'MOIS') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: isoDate(from), to };
  }
  return {}; // 'TOUT' — pas de filtre
}

export const DriverAnalysisView: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DriverHistoryResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [preset, setPreset] = useState<PeriodPreset>('TOUT');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const fetchDrivers = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const list = await listDrivers();
      setDrivers(list);
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Impossible de charger la liste des chauffeurs.');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const currentRange = useCallback((): { from?: string; to?: string } => {
    if (preset === 'PERSONNALISE') {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    return presetToRange(preset);
  }, [preset, customFrom, customTo]);

  const loadDetail = useCallback(async (driverId: string) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    try {
      const data = await getDriverHistory(driverId, currentRange());
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : 'Impossible de charger le détail de ce chauffeur.');
    } finally {
      setIsLoadingDetail(false);
    }
  }, [currentRange]);

  const openDriver = async (driverId: string) => {
    setSelectedDriverId(driverId);
    setDetail(null);
    await loadDetail(driverId);
  };

  // Recharge automatiquement quand la période change, tant qu'un chauffeur est sélectionné.
  useEffect(() => {
    if (selectedDriverId) loadDetail(selectedDriverId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo]);

  usePolling(() => {
    if (selectedDriverId) loadDetail(selectedDriverId);
  }, 15000, !!selectedDriverId);

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.camionAssigne || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedDriverId) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => {
            setSelectedDriverId(null);
            setDetail(null);
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour à la liste des chauffeurs
        </button>

        {/* Sélecteur de période */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-3.5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
            <Calendar className="w-3.5 h-3.5" />
            Période :
          </div>
          {([
            ['7J', '7 derniers jours'],
            ['30J', '30 derniers jours'],
            ['MOIS', 'Ce mois-ci'],
            ['TOUT', 'Tout'],
          ] as [PeriodPreset, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                preset === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPreset('PERSONNALISE')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
              preset === 'PERSONNALISE' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Personnalisé
          </button>

          {preset === 'PERSONNALISE' && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg"
              />
              <span className="text-slate-400 text-xs">→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          )}
        </div>

        {isLoadingDetail && (
          <div className="p-16 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Chargement de l'analyse…
          </div>
        )}

        {detailError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4">
            {detailError}
          </div>
        )}

        {detail && (
          <>
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {detail.driver.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{detail.driver.name}</h2>
                  <p className="text-xs text-slate-400">{detail.driver.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {detail.driver.camionAssigne && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    {detail.driver.camionAssigne}
                  </div>
                )}
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    detail.driver.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {detail.driver.isActive ? 'Actif' : 'Désactivé'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard icon={FileText} label="Rapports" value={detail.summary.totalRapports} sub={`${detail.summary.rapportsSoumis} soumis`} />
              <SummaryCard icon={AlertTriangle} label="Pannes" value={detail.summary.totalPannes} sub={`${detail.summary.pannesEnCours} en cours`} accent="amber" />
              <SummaryCard icon={PackageCheck} label="Livraisons" value={detail.summary.totalLivraisons} accent="emerald" />
              <SummaryCard icon={TrendingUp} label="Trajets" value={detail.summary.totalTrajets} sub={`${detail.summary.totalKm.toLocaleString('fr-FR')} km`} accent="blue" />
              <SummaryCard
                icon={Wrench}
                label="Défauts constatés"
                value={detail.summary.totalDefautsConstates}
                accent={detail.summary.totalDefautsConstates > 0 ? 'amber' : 'emerald'}
              />
              <SummaryCard icon={ShieldAlert} label="Cautions en retard" value={detail.summary.cautionsEnRetard} accent={detail.summary.cautionsEnRetard > 0 ? 'rose' : 'emerald'} />
              <SummaryCard icon={Fuel} label="Anomalies carburant" value={detail.summary.anomaliesCarburant} accent={detail.summary.anomaliesCarburant > 0 ? 'rose' : 'emerald'} />
              <SummaryCard
                icon={BarChart3}
                label="Score global"
                value={detail.summary.dernierScoreGlobalPct !== null ? `${Math.round(detail.summary.dernierScoreGlobalPct)}%` : '—'}
                sub={detail.summary.dernierRang ? `Rang #${detail.summary.dernierRang}` : undefined}
                accent="blue"
              />
              <SummaryCard
                icon={Wallet}
                label="Montant perçu (POD)"
                value={formatFCFA(detail.summary.totalMontantRecuFCFA)}
                accent="emerald"
              />
              <SummaryCard
                icon={Route}
                label="Distance livrée (POD)"
                value={`${detail.summary.totalDistancePodKm.toLocaleString('fr-FR')} km`}
                accent="blue"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Total des frais de route engagés</span>
              <span className="text-lg font-bold text-slate-900">{formatFCFA(detail.summary.totalFraisRouteFCFA)}</span>
            </div>

            <DetailTable<DriverHistoryResponse["reports"][number]>
              title={`Rapports Hebdomadaires (${detail.reports.length})`}
              rows={detail.reports}
              emptyLabel="Aucun rapport enregistré."
              columns={[
                { header: 'N°', render: (r) => displayRef(r.numeroReference, r.id) },
                { header: 'Semaine', render: (r) => `${r.semaineDu} → ${r.semaineAu}` },
                { header: 'Camion', render: (r) => r.immatriculation || '—' },
                { header: 'Statut', render: (r) => (r.isSubmitted ? 'Soumis' : 'Brouillon'), badge: (r) => (r.isSubmitted ? 'emerald' : 'slate') },
                { header: 'Conformité', render: (r) => r.status },
              ]}
            />

            <DetailTable<DriverHistoryResponse["faults"][number]>
              title={`Pannes Déclarées (${detail.faults.length})`}
              rows={detail.faults}
              emptyLabel="Aucune panne déclarée."
              columns={[
                { header: 'N°', render: (f) => displayRef(f.numeroReference, f.id) },
                { header: 'Date', render: (f) => f.dateSignalement },
                { header: 'Catégorie', render: (f) => f.categorie },
                { header: 'Urgence', render: (f) => f.niveauUrgence },
                { header: 'Statut', render: (f) => f.status, badge: (f) => (f.status === 'Clôturée par superviseur' ? 'emerald' : 'amber') },
              ]}
            />

            <DetailTable<DriverHistoryResponse["pod"][number]>
              title={`Preuves de Livraison (${detail.pod.length})`}
              rows={detail.pod}
              emptyLabel="Aucune livraison enregistrée."
              columns={[
                { header: 'N°', render: (p) => displayRef(p.numeroReference, p.id) },
                { header: 'BL', render: (p) => p.blNumber },
                { header: 'Client', render: (p) => p.clientName },
                {
                  header: 'Départ → Distance',
                  render: (p) =>
                    `${p.departurePort === 'PAK' ? 'PAK' : p.departurePort === 'PAD' ? 'PAD' : p.departurePortAutre || 'Autre'} · ${p.distanceKm ?? 0} km`,
                },
                { header: 'Montant', render: (p) => formatFCFA(p.montantRecuFCFA ?? 0) },
                { header: 'Statut', render: (p) => p.status, badge: (p) => (p.status === 'LIVRE_CONFORME' ? 'emerald' : 'amber') },
              ]}
            />

            {detail.cautions.length > 0 && (
              <DetailTable<DriverHistoryResponse["cautions"][number]>
                title={`Cautions de Conteneurs (${detail.cautions.length})`}
                rows={detail.cautions}
                emptyLabel="Aucune caution."
                columns={[
                  { header: 'N°', render: (c) => displayRef(c.numeroReference, c.id) },
                  { header: 'Conteneur / BL', render: (c) => c.noConteneurBL },
                  { header: 'Montant', render: (c) => formatFCFA(c.montantCautionFCFA) },
                  { header: 'Statut', render: (c) => c.status, badge: (c) => (c.status === 'En cours' ? 'slate' : c.status.includes('temps') ? 'emerald' : 'rose') },
                ]}
              />
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Analyse par Chauffeur
        </h2>
        <p className="text-xs text-slate-500">
          Sélectionnez un chauffeur pour voir l'ensemble de ses activités : rapports, pannes, livraisons, cautions et performance.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un chauffeur, email, camion…"
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {listError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
          {listError}
          <button onClick={fetchDrivers} className="underline cursor-pointer">Réessayer</button>
        </div>
      )}

      {isLoadingList ? (
        <div className="p-16 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Chargement des chauffeurs…
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="p-10 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          Aucun chauffeur trouvé.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDrivers.map((d) => (
            <button
              key={d.id}
              onClick={() => openDriver(d.id)}
              className="text-left bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                  {d.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900 truncate">{d.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{d.camionAssigne || d.email}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {d.totalRapports} rapport(s) · {d.totalPannes} panne(s)
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ACCENT_CLASSES: Record<string, string> = {
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
};

const SummaryCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: keyof typeof ACCENT_CLASSES;
}> = ({ icon: Icon, label, value, sub, accent = 'slate' }) => (
  <div className={`p-3.5 rounded-xl border ${ACCENT_CLASSES[accent]}`}>
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
    <div className="text-xl font-bold mt-1">{value}</div>
    {sub && <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>}
  </div>
);

function DetailTable<T>({
  title,
  rows,
  columns,
  emptyLabel,
}: {
  title: string;
  rows: T[];
  columns: { header: string; render: (row: T) => React.ReactNode; badge?: (row: T) => keyof typeof ACCENT_CLASSES }[];
  emptyLabel: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
      <div className="p-3.5 bg-slate-50 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-700">{title}</span>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400">{emptyLabel}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 font-normal uppercase text-[10px] tracking-wider border-b border-slate-100">
                {columns.map((c) => (
                  <th key={c.header} className="py-2.5 px-4">{c.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  {columns.map((c, ci) => {
                    const content = c.render(row);
                    const badgeAccent = c.badge?.(row);
                    return (
                      <td key={ci} className="py-2.5 px-4 font-medium text-slate-800">
                        {badgeAccent ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ACCENT_CLASSES[badgeAccent]}`}>
                            {content}
                          </span>
                        ) : (
                          content
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
