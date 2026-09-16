import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Search,
  ArrowLeft,
  Truck,
  Loader2,
  ChevronRight,
  Package,
  Wallet,
  CheckCircle2,
  Clock,
  UserRound,
  Phone,
} from 'lucide-react';
import { formatFCFA } from '../types';
import {
  listSubcontractorCompanies,
  getCompanyAnalysis,
  getSubcontractorDriverAnalysis,
  SubcontractorCompany,
  CompanyAnalysis,
  DriverAnalysis,
} from '../lib/subcontractors';
import { ApiError } from '../lib/api';
import { usePolling } from '../lib/usePolling';
import { displayRef } from '../lib/displayRef';

type Level = 'COMPANIES' | 'COMPANY_DETAIL' | 'DRIVER_DETAIL';

export const SubcontractorAnalysisView: React.FC = () => {
  const [level, setLevel] = useState<Level>('COMPANIES');
  const [companies, setCompanies] = useState<SubcontractorCompany[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCompanies = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      setCompanies(await listSubcontractorCompanies());
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Impossible de charger les sociétés.');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  usePolling(() => { listSubcontractorCompanies().then(setCompanies).catch(() => {}); }, 15000, level === 'COMPANIES');

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyDetail, setCompanyDetail] = useState<CompanyAnalysis | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const openCompany = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    setLevel('COMPANY_DETAIL');
    setCompanyDetail(null);
    setIsLoadingCompany(true);
    setCompanyError(null);
    try {
      setCompanyDetail(await getCompanyAnalysis(companyId));
    } catch (err) {
      setCompanyError(err instanceof ApiError ? err.message : 'Impossible de charger cette société.');
    } finally {
      setIsLoadingCompany(false);
    }
  };

  usePolling(() => {
    if (selectedCompanyId && level === 'COMPANY_DETAIL') {
      getCompanyAnalysis(selectedCompanyId).then(setCompanyDetail).catch(() => {});
    }
  }, 15000, level === 'COMPANY_DETAIL');

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [driverDetail, setDriverDetail] = useState<DriverAnalysis | null>(null);
  const [isLoadingDriver, setIsLoadingDriver] = useState(false);
  const [driverError, setDriverError] = useState<string | null>(null);

  const openDriver = async (driverId: string) => {
    setSelectedDriverId(driverId);
    setLevel('DRIVER_DETAIL');
    setDriverDetail(null);
    setIsLoadingDriver(true);
    setDriverError(null);
    try {
      setDriverDetail(await getSubcontractorDriverAnalysis(driverId));
    } catch (err) {
      setDriverError(err instanceof ApiError ? err.message : 'Impossible de charger ce chauffeur.');
    } finally {
      setIsLoadingDriver(false);
    }
  };

  usePolling(() => {
    if (selectedDriverId && level === 'DRIVER_DETAIL') {
      getSubcontractorDriverAnalysis(selectedDriverId).then(setDriverDetail).catch(() => {});
    }
  }, 15000, level === 'DRIVER_DETAIL');

  const filteredCompanies = companies.filter(
    (c) =>
      c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.telephone || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ---------------------------------------------------------------
  // LEVEL 3 : détail d'un chauffeur sous-traitant précis
  // ---------------------------------------------------------------
  if (level === 'DRIVER_DETAIL') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setLevel('COMPANY_DETAIL'); setSelectedDriverId(null); setDriverDetail(null); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour à la société
        </button>

        {isLoadingDriver ? (
          <div className="p-16 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Chargement…
          </div>
        ) : driverError ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4">{driverError}</div>
        ) : driverDetail && (
          <>
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <UserRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{driverDetail.driver.nom}</h2>
                  <p className="text-xs text-slate-400">{driverDetail.driver.companyNom || 'Société non renseignée'}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-300">
                {driverDetail.driver.telephone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {driverDetail.driver.telephone}</span>}
                {driverDetail.driver.immatriculationCamion && <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> {driverDetail.driver.immatriculationCamion}</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Package} label="Conteneurs" value={driverDetail.stats.totalContainers} accent="blue" />
              <StatCard icon={Clock} label="Ouverts" value={driverDetail.stats.ouverts} accent="amber" />
              <StatCard icon={CheckCircle2} label="Fermés" value={driverDetail.stats.fermes} accent="emerald" />
              <StatCard icon={Wallet} label="Total Perçu" value={formatFCFA(driverDetail.stats.totalMontantRecuFCFA)} accent="emerald" />
            </div>

            <SimpleTable
              title={`Conteneurs Transportés (${driverDetail.containers.length})`}
              rows={driverDetail.containers}
              emptyLabel="Aucun conteneur transporté par ce chauffeur."
              columns={[
                { header: 'N°', render: (c: any) => displayRef(c.numeroReference, c.id) },
                { header: 'Conteneur', render: (c: any) => `${c.containerNumber} · BL ${c.blNumber}` },
                { header: 'Port', render: (c: any) => (c.port === 'Douala' ? 'PAD' : 'PAK') },
                { header: 'Statut', render: (c: any) => (c.status === 'OUVERT' ? 'Ouvert' : 'Fermé'), badge: (c: any) => (c.status === 'OUVERT' ? 'blue' : 'slate') },
              ]}
            />

            <SimpleTable
              title={`Livraisons Effectuées (${driverDetail.pod.length})`}
              rows={driverDetail.pod}
              emptyLabel="Aucune livraison enregistrée pour ce chauffeur."
              columns={[
                { header: 'N°', render: (p: any) => displayRef(p.numeroReference, p.id) },
                { header: 'Récepteur', render: (p: any) => p.recipientName },
                { header: 'Date', render: (p: any) => p.dateTime },
                { header: 'Montant', render: (p: any) => formatFCFA(p.montantRecuFCFA) },
                { header: 'Statut', render: (p: any) => p.status, badge: (p: any) => (p.status === 'LIVRE_CONFORME' ? 'emerald' : 'amber') },
              ]}
            />

            {driverDetail.returns.length > 0 && (
              <SimpleTable
                title={`Retours Effectués (${driverDetail.returns.length})`}
                rows={driverDetail.returns}
                emptyLabel=""
                columns={[
                  { header: 'Conteneur', render: (r: any) => `${r.containerNumber} · BL ${r.blNumber}` },
                  { header: 'Date', render: (r: any) => r.dateRetourVide },
                  { header: 'Dépôt', render: (r: any) => r.depotRetour },
                  { header: 'Frais', render: (r: any) => formatFCFA(r.fraisRetourFCFA) },
                ]}
              />
            )}
          </>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------
  // LEVEL 2 : détail d'une société (vue d'ensemble + ses chauffeurs)
  // ---------------------------------------------------------------
  if (level === 'COMPANY_DETAIL') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setLevel('COMPANIES'); setSelectedCompanyId(null); setCompanyDetail(null); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour aux sociétés
        </button>

        {isLoadingCompany ? (
          <div className="p-16 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Chargement…
          </div>
        ) : companyError ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4">{companyError}</div>
        ) : companyDetail && (
          <>
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{companyDetail.company.nom}</h2>
                  <p className="text-xs text-slate-400">{companyDetail.drivers.length} chauffeur(s)</p>
                </div>
              </div>
              {(companyDetail.company.telephone || companyDetail.company.email) && (
                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-300">
                  {companyDetail.company.telephone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {companyDetail.company.telephone}</span>}
                  {companyDetail.company.email && <span>{companyDetail.company.email}</span>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Package} label="Conteneurs" value={companyDetail.stats.totalContainers} accent="blue" />
              <StatCard icon={Clock} label="Ouverts" value={companyDetail.stats.ouverts} accent="amber" />
              <StatCard icon={CheckCircle2} label="Fermés" value={companyDetail.stats.fermes} accent="emerald" />
              <StatCard icon={Wallet} label="Total Perçu" value={formatFCFA(companyDetail.stats.totalMontantRecuFCFA)} accent="emerald" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900">Chauffeurs de cette Société ({companyDetail.drivers.length})</h3>
              </div>
              {companyDetail.drivers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Aucun chauffeur enregistré pour cette société.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {companyDetail.drivers.map((d) => {
                    const driverContainers = companyDetail.containers.filter((c) => c.subcontractorNom === d.nom).length;
                    return (
                      <button
                        key={d.id}
                        onClick={() => openDriver(d.id)}
                        className="w-full text-left p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <UserRound className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="font-bold text-slate-900 block">{d.nom}</span>
                            {d.telephone && <span className="text-slate-400 text-[11px]">{d.telephone}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-semibold">{driverContainers} conteneur(s)</span>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <SimpleTable
              title={`Tous les Conteneurs de la Société (${companyDetail.containers.length})`}
              rows={companyDetail.containers}
              emptyLabel="Aucun conteneur pour cette société."
              columns={[
                { header: 'N°', render: (c: any) => displayRef(c.numeroReference, c.id) },
                { header: 'Conteneur', render: (c: any) => `${c.containerNumber} · BL ${c.blNumber}` },
                { header: 'Chauffeur', render: (c: any) => c.subcontractorNom },
                { header: 'Statut', render: (c: any) => (c.status === 'OUVERT' ? 'Ouvert' : 'Fermé'), badge: (c: any) => (c.status === 'OUVERT' ? 'blue' : 'slate') },
              ]}
            />
          </>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------
  // LEVEL 1 : liste des sociétés sous-traitantes
  // ---------------------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher une société sous-traitante…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          />
        </div>
      </div>

      {isLoadingList ? (
        <div className="p-16 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Chargement…
        </div>
      ) : listError ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
          {listError}
          <button onClick={fetchCompanies} className="underline cursor-pointer">Réessayer</button>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-10 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          Aucune société sous-traitante trouvée.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCompanies.map((c) => (
            <button
              key={c.id}
              onClick={() => openCompany(c.id)}
              className="text-left bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-sm text-slate-900 block truncate">{c.nom}</span>
                  <span className="text-[11px] text-slate-500">{c.driversCount} chauffeur(s)</span>
                </div>
              </div>
              {c.telephone && <p className="text-[11px] text-slate-400 mt-2">{c.telephone}</p>}
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

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; accent?: keyof typeof ACCENT_CLASSES }> = ({
  icon: Icon, label, value, accent = 'slate',
}) => (
  <div className={`p-3.5 rounded-xl border ${ACCENT_CLASSES[accent]}`}>
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
    <div className="text-xl font-bold mt-1">{value}</div>
  </div>
);

function SimpleTable<T>({
  title,
  rows,
  columns,
  emptyLabel,
}: {
  title: string;
  rows: T[];
  columns: { header: string; render: (row: T) => React.ReactNode; badge?: (row: T) => string }[];
  emptyLabel: string;
}) {
  if (rows.length === 0 && !emptyLabel) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <h3 className="font-bold text-sm text-slate-900">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400">{emptyLabel}</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <div key={i} className="p-3.5 flex items-center justify-between gap-3 text-xs flex-wrap">
              {columns.map((col, ci) => (
                <span
                  key={ci}
                  className={
                    ci === 0
                      ? 'font-mono font-bold text-blue-700'
                      : col.badge
                      ? `px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          col.badge(row) === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          col.badge(row) === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          col.badge(row) === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-500 border-slate-200'
                        }`
                      : 'text-slate-600'
                  }
                >
                  {col.render(row)}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
