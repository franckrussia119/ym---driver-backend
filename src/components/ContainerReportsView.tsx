import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Package,
  Ship,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Wallet,
  Printer,
  History,
  ChevronRight,
  Search,
  Truck,
  FileText,
  UserRound,
  Paperclip,
} from 'lucide-react';
import { formatFCFA } from '../types';
import { Container, ContainerReport, BLGroup, BLReport, RevenueSummary, OpsBoardItem, listContainers, getContainerReport, listBLGroups, getContainersByBL, getBLReport, getRevenueSummary, getOpsBoard } from '../lib/containers';
import { PrintableContainerReportView } from './PrintableContainerReportView';
import { DOC_TYPE_LABELS } from './ContainerDetailView';
import { PrintableBLReportView } from './PrintableBLReportView';
import { usePolling } from '../lib/usePolling';
import { listPOD } from '../lib/pod';
import { PODRecord } from './ProofOfDeliveryView';
import { ApiError } from '../lib/api';

type ViewMode = 'dashboard' | 'operations' | 'deliveries' | 'byBl' | 'opsBoard';

export const ContainerReportsView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [containers, setContainers] = useState<Container[]>([]);
  const [deliveries, setDeliveries] = useState<PODRecord[]>([]);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setContainers(await listContainers());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les données.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (viewMode !== 'deliveries' || deliveries.length > 0) return;
    setIsLoadingDeliveries(true);
    listPOD()
      .then(setDeliveries)
      .catch(() => {
        /* silencieux : la liste reste vide si le chargement échoue, l'utilisateur peut changer d'onglet et revenir */
      })
      .finally(() => setIsLoadingDeliveries(false));
  }, [viewMode, deliveries.length]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  usePolling(() => {
    listContainers().then(setContainers).catch(() => {});
  }, 15000, !selectedId);

  // Rapport par BL
  const [blGroups, setBlGroups] = useState<BLGroup[]>([]);
  const [isLoadingBlGroups, setIsLoadingBlGroups] = useState(false);
  const [blGroupsError, setBlGroupsError] = useState<string | null>(null);
  const [blSearch, setBlSearch] = useState('');
  const [selectedBl, setSelectedBl] = useState<string | null>(null);
  const [blContainers, setBlContainers] = useState<Container[]>([]);
  const [isLoadingBlContainers, setIsLoadingBlContainers] = useState(false);

  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);

  const fetchRevenueSummary = useCallback(async () => {
    try {
      setRevenueSummary(await getRevenueSummary());
    } catch {
      /* silencieux : les cartes de revenu restent vides si le chargement échoue */
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'dashboard') fetchRevenueSummary();
  }, [viewMode, fetchRevenueSummary]);

  usePolling(() => { fetchRevenueSummary(); }, 15000, viewMode === 'dashboard');

  const [opsBoardItems, setOpsBoardItems] = useState<OpsBoardItem[]>([]);
  const [isLoadingOpsBoard, setIsLoadingOpsBoard] = useState(false);
  const [opsBoardError, setOpsBoardError] = useState<string | null>(null);

  const fetchOpsBoard = useCallback(async () => {
    setIsLoadingOpsBoard(true);
    setOpsBoardError(null);
    try {
      setOpsBoardItems(await getOpsBoard());
    } catch (err) {
      setOpsBoardError(err instanceof ApiError ? err.message : 'Impossible de charger le suivi en direct.');
    } finally {
      setIsLoadingOpsBoard(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'opsBoard') fetchOpsBoard();
  }, [viewMode, fetchOpsBoard]);

  usePolling(() => { fetchOpsBoard(); }, 12000, viewMode === 'opsBoard');

  const fetchBlGroups = useCallback(async () => {
    setIsLoadingBlGroups(true);
    setBlGroupsError(null);
    try {
      setBlGroups(await listBLGroups());
    } catch (err) {
      setBlGroupsError(err instanceof ApiError ? err.message : 'Impossible de charger les BL.');
    } finally {
      setIsLoadingBlGroups(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'byBl' && !selectedBl) fetchBlGroups();
  }, [viewMode, selectedBl, fetchBlGroups]);

  usePolling(() => { fetchBlGroups(); }, 15000, viewMode === 'byBl' && !selectedBl);

  const openBl = async (blNumber: string) => {
    setSelectedBl(blNumber);
    setIsLoadingBlContainers(true);
    try {
      setBlContainers(await getContainersByBL(blNumber));
    } catch (err) {
      setBlGroupsError(err instanceof ApiError ? err.message : 'Impossible de charger ce BL.');
    } finally {
      setIsLoadingBlContainers(false);
    }
  };

  const [blReport, setBlReport] = useState<BLReport | null>(null);
  const [isLoadingBlReport, setIsLoadingBlReport] = useState(false);

  const openBlReport = async () => {
    if (!selectedBl) return;
    setIsLoadingBlReport(true);
    try {
      setBlReport(await getBLReport(selectedBl));
    } catch (err) {
      setBlGroupsError(err instanceof ApiError ? err.message : 'Impossible de générer le rapport de ce BL.');
    } finally {
      setIsLoadingBlReport(false);
    }
  };


  // Filtres — Rapport Opérations
  const [opsPortFilter, setOpsPortFilter] = useState<'ALL' | 'Douala' | 'Kribi'>('ALL');
  const [opsStatusFilter, setOpsStatusFilter] = useState<'ALL' | 'OUVERT' | 'FERME'>('ALL');
  const [opsCarrierFilter, setOpsCarrierFilter] = useState<'ALL' | 'ASSIGNED' | 'CHAUFFEUR_INTERNE' | 'SOUS_TRAITANT' | 'UNASSIGNED'>('ALL');
  const [opsFromDate, setOpsFromDate] = useState('');
  const [opsToDate, setOpsToDate] = useState('');
  const [opsAgentFilter, setOpsAgentFilter] = useState('');

  // Filtres — Rapport Livraisons
  const [delFromDate, setDelFromDate] = useState('');
  const [delToDate, setDelToDate] = useState('');
  const [delStatusFilter, setDelStatusFilter] = useState<'ALL' | PODRecord['status']>('ALL');
  const [delSearch, setDelSearch] = useState('');
  const [report, setReport] = useState<ContainerReport | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const openReport = async (id: string) => {
    setSelectedId(id);
    setIsLoadingReport(true);
    setReportError(null);
    try {
      setReport(await getContainerReport(id));
    } catch (err) {
      setReportError(err instanceof ApiError ? err.message : 'Impossible de charger ce rapport.');
    } finally {
      setIsLoadingReport(false);
    }
  };

  if (selectedId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setSelectedId(null); setReport(null); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour au tableau de bord
          </button>
          {report && (
            <button
              onClick={() => setIsPrintOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Exporter en PDF
            </button>
          )}
        </div>

        {isPrintOpen && report && (
          <PrintableContainerReportView report={report} onClose={() => setIsPrintOpen(false)} />
        )}

        {isLoadingReport && (
          <div className="p-16 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Chargement du rapport…
          </div>
        )}
        {reportError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4">{reportError}</div>
        )}

        {report && (
          <>
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800">
              <div className="font-mono text-xs text-blue-400">{report.container.numeroReference}</div>
              <h2 className="text-lg font-bold mt-0.5">{report.container.containerNumber}</h2>
              <p className="text-xs text-slate-400">BL: {report.container.blNumber} · {report.container.port === 'Douala' ? 'PAD' : 'PAK'} · {report.container.terminal}</p>
              {(report.container.clientNom || report.container.contenuDescription || report.container.destinationDechargement) && (
                <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  {report.container.clientNom && <span>Client : <span className="text-slate-200 font-semibold">{report.container.clientNom}</span>{report.container.clientContact && ` (${report.container.clientContact})`}</span>}
                  {report.container.contenuDescription && <span>Contenu : <span className="text-slate-200">{report.container.contenuDescription}</span></span>}
                  {report.container.destinationDechargement && <span>Déchargement : <span className="text-slate-200">{report.container.destinationDechargement}</span></span>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Clock} label="Jours (Création → Clôture)" value={report.totalDays} sub={report.isOuvert ? 'Toujours ouvert' : 'Clôturé'} accent={report.isOuvert ? 'blue' : 'slate'} />
              <StatCard icon={Clock} label="Jours (Livraison Client → Clôture)" value={report.joursDetentionClient ?? '—'} sub={report.dateLivraisonClient ? `Livré le ${report.dateLivraisonClient.split(' ')[0]}` : 'Pas encore livré'} accent="amber" />
              <StatCard icon={CheckCircle2} label="Étapes Terminées" value={`${report.stepsCompleted}/${report.stepsTotal}`} accent={report.stepsBlocked > 0 ? 'rose' : 'emerald'} />
              <StatCard icon={Package} label="Documents Validés" value={`${report.documentsValidated}/${report.documentsCount}`} accent="blue" />
            </div>

            {report.documents.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-blue-600" /> Documents Téléversés ({report.documents.length})
                  </h3>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {report.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 cursor-pointer transition-colors"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      {DOC_TYPE_LABELS[doc.type] || doc.type}
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        doc.status === 'VALIDATED' ? 'bg-emerald-100 text-emerald-700' :
                        doc.status === 'RECEIVED' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {doc.status === 'VALIDATED' ? 'Validé' : doc.status === 'RECEIVED' ? 'Reçu' : 'En attente'}
                      </span>
                    </a>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 px-4 pb-3">
                  Ces documents restent consultables ici même après la clôture du conteneur.
                </p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5"><Wallet className="w-4 h-4 text-emerald-600" /> Détail des Coûts</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Droits & Taxes</span>
                  <span className="text-sm font-bold text-slate-900">{formatFCFA(report.montantDroitsTaxesFCFA)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Frais de Retour</span>
                  <span className="text-sm font-bold text-slate-900">{formatFCFA(report.montantFraisRetourFCFA)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Frais de Dépôt</span>
                  <span className="text-sm font-bold text-slate-900">{formatFCFA(report.montantFraisDepotFCFA)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Frais Supplémentaires</span>
                  <span className="text-sm font-bold text-slate-900">{formatFCFA(report.montantFraisSupplementairesFCFA)}</span>
                  {report.fraisSupplementairesNote && <span className="block text-[10px] text-slate-400 italic mt-0.5">{report.fraisSupplementairesNote}</span>}
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 -m-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">Coût Total</span>
                  <span className="text-base font-bold text-emerald-800">{formatFCFA(report.montantTotalFCFA)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Tarif Convenu (Revenu)</span>
                <span className="text-lg font-bold text-slate-900">{report.tarifConvenuFCFA > 0 ? formatFCFA(report.tarifConvenuFCFA) : 'Non renseigné'}</span>
              </div>
              <div className={`rounded-2xl border shadow-xs p-4 ${report.margeFCFA >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <span className={`text-xs font-semibold block mb-1 ${report.margeFCFA >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Marge (Revenu − Coûts)</span>
                <span className={`text-lg font-bold ${report.margeFCFA >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>{formatFCFA(report.margeFCFA)}</span>
              </div>
            </div>

            {report.incidents.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5"><History className="w-4 h-4 text-amber-600" /> Incidents & Transferts ({report.incidents.length})</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {report.incidents.map((inc) => (
                    <div key={inc.id} className="p-3.5 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          inc.type === 'PANNE' ? 'bg-rose-50 text-rose-700 border-rose-200' : inc.type === 'TRANSFERT' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {inc.type === 'PANNE' ? 'Panne' : inc.type === 'TRANSFERT' ? 'Transfert' : 'Autre'}
                        </span>
                        <span className="text-slate-400 text-[11px]">{new Date(inc.createdAt).toLocaleString('fr-FR')}</span>
                      </div>
                      <p className="text-slate-700">{inc.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Chauffeur — Livraison (aller)</span>
                <span className="text-sm font-bold text-slate-900">{report.carrier.label}</span>
                {report.carrier.telephone && <span className="text-xs text-slate-500 block mt-0.5">{report.carrier.telephone}</span>}
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Chauffeur — Retour (à vide)</span>
                <span className="text-sm font-bold text-slate-900">{report.retourPar || 'Pas encore retourné'}</span>
                {report.retourParTelephone && <span className="text-xs text-slate-500 block mt-0.5">{report.retourParTelephone}</span>}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900">Chronologie Complète</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {report.timeline.map((t) => (
                  <div key={t.stepNumber} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">{t.stepNumber}</span>
                      <div>
                        <span className="font-semibold text-slate-800 block">{t.stepName}</span>
                        {t.notes && <span className="text-[10px] text-slate-400 italic">{t.notes}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        t.status === 'DONE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        t.status === 'BLOCKED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        t.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {t.status === 'DONE' ? 'Fait' : t.status === 'BLOCKED' ? 'Bloqué' : t.status === 'IN_PROGRESS' ? 'En cours' : 'En attente'}
                      </span>
                      {t.dateDone && <span className="text-[10px] text-slate-400 block mt-0.5">{t.dateDone}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {report.return && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <h3 className="font-bold text-sm text-emerald-900 mb-1">Retourné</h3>
                <p className="text-xs text-emerald-800">Le {report.return.dateRetourVide} au dépôt {report.return.depotRetour}.</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const totalOuverts = containers.filter((c) => c.status === 'OUVERT').length;
  const totalFermes = containers.filter((c) => c.status === 'FERME').length;
  const parPort = { Douala: containers.filter((c) => c.port === 'Douala').length, Kribi: containers.filter((c) => c.port === 'Kribi').length };
  const nonAssignes = containers.filter((c) => c.status === 'OUVERT' && !c.carrierType).length;
  const assignes = containers.filter((c) => c.status === 'OUVERT' && c.carrierType).length;

  // Un clic sur une carte KPI ouvre directement le Rapport Opérations avec
  // le filtre correspondant déjà appliqué — pas besoin de re-filtrer à la main.
  const goToOperationsWith = (filters: {
    status?: 'ALL' | 'OUVERT' | 'FERME';
    port?: 'ALL' | 'Douala' | 'Kribi';
    carrier?: 'ALL' | 'ASSIGNED' | 'CHAUFFEUR_INTERNE' | 'SOUS_TRAITANT' | 'UNASSIGNED';
  }) => {
    setOpsStatusFilter(filters.status ?? 'ALL');
    setOpsPortFilter(filters.port ?? 'ALL');
    setOpsCarrierFilter(filters.carrier ?? 'ALL');
    setOpsFromDate('');
    setOpsToDate('');
    setOpsAgentFilter('');
    setViewMode('operations');
  };

  const filteredOps = containers.filter((c) => {
    if (opsPortFilter !== 'ALL' && c.port !== opsPortFilter) return false;
    if (opsStatusFilter !== 'ALL' && c.status !== opsStatusFilter) return false;
    if (opsCarrierFilter === 'ASSIGNED' && !c.carrierType) return false;
    if (opsCarrierFilter === 'UNASSIGNED' && c.carrierType) return false;
    if (opsCarrierFilter === 'CHAUFFEUR_INTERNE' && c.carrierType !== 'CHAUFFEUR_INTERNE') return false;
    if (opsCarrierFilter === 'SOUS_TRAITANT' && c.carrierType !== 'SOUS_TRAITANT') return false;
    if (opsFromDate && c.createdAt < opsFromDate) return false;
    if (opsToDate && c.createdAt > `${opsToDate}T23:59:59`) return false;
    if (opsAgentFilter && !(c.createdByNom || '').toLowerCase().includes(opsAgentFilter.toLowerCase())) return false;
    return true;
  });

  const filteredDeliveries = deliveries.filter((d) => {
    if (delStatusFilter !== 'ALL' && d.status !== delStatusFilter) return false;
    if (delFromDate && d.dateTime < delFromDate) return false;
    if (delToDate && d.dateTime > `${delToDate}T23:59:59`) return false;
    if (delSearch) {
      const q = delSearch.toLowerCase();
      const matches = d.containerNumber.toLowerCase().includes(q) || d.blNumber.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <span>Tableau de Bord & Rapports</span>
        </h2>
        <p className="text-xs text-slate-500">Vue d'ensemble de l'activité conteneurs. Cliquez un conteneur pour son rapport complet.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['opsBoard', 'Suivi en Direct'],
          ['dashboard', 'Tableau de Bord'],
          ['operations', 'Rapport Opérations'],
          ['deliveries', 'Rapport Livraisons'],
          ['byBl', 'Rapport par BL'],
        ] as [ViewMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              viewMode === mode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {viewMode === 'operations' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Port</label>
              <select value={opsPortFilter} onChange={(e) => setOpsPortFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold">
                <option value="ALL">Tous</option>
                <option value="Douala">Douala (PAD)</option>
                <option value="Kribi">Kribi (PAK)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Statut</label>
              <select value={opsStatusFilter} onChange={(e) => setOpsStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold">
                <option value="ALL">Tous</option>
                <option value="OUVERT">Ouvert</option>
                <option value="FERME">Fermé</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Transporteur</label>
              <select value={opsCarrierFilter} onChange={(e) => setOpsCarrierFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold">
                <option value="ALL">Tous</option>
                <option value="ASSIGNED">Assigné (Nos Chauffeurs + Sous-traitants)</option>
                <option value="CHAUFFEUR_INTERNE">Nos Chauffeurs</option>
                <option value="SOUS_TRAITANT">Sous-traitants</option>
                <option value="UNASSIGNED">Sans transporteur</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Du</label>
              <input type="date" value={opsFromDate} onChange={(e) => setOpsFromDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Au</label>
              <input type="date" value={opsToDate} onChange={(e) => setOpsToDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Agent (créé par)</label>
              <input type="text" value={opsAgentFilter} onChange={(e) => setOpsAgentFilter(e.target.value)}
                placeholder="Nom de l'agent…"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
          </div>

          {(() => {
            // Compte chaque catégorie de transporteur en respectant les
            // AUTRES filtres actifs (statut, port, dates, agent) — pour que
            // les chiffres sur ces boutons restent cohérents avec le reste
            // de l'écran, sans être eux-mêmes limités par le filtre transporteur.
            const baseForCarrierCounts = containers.filter((c) => {
              if (opsStatusFilter !== 'ALL' && c.status !== opsStatusFilter) return false;
              if (opsPortFilter !== 'ALL' && c.port !== opsPortFilter) return false;
              if (opsFromDate && c.createdAt < opsFromDate) return false;
              if (opsToDate && c.createdAt > `${opsToDate}T23:59:59`) return false;
              if (opsAgentFilter && !(c.createdByNom || '').toLowerCase().includes(opsAgentFilter.toLowerCase())) return false;
              return true;
            });
            const countChauffeurs = baseForCarrierCounts.filter((c) => c.carrierType === 'CHAUFFEUR_INTERNE').length;
            const countSousTraitants = baseForCarrierCounts.filter((c) => c.carrierType === 'SOUS_TRAITANT').length;
            const countSansTransporteur = baseForCarrierCounts.filter((c) => !c.carrierType).length;
            return (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Transporteur :</span>
                {([
                  ['ALL', 'Tous', baseForCarrierCounts.length, Truck],
                  ['CHAUFFEUR_INTERNE', 'Nos Chauffeurs', countChauffeurs, UserRound],
                  ['SOUS_TRAITANT', 'Sous-traitants', countSousTraitants, Truck],
                  ['UNASSIGNED', 'Sans Transporteur', countSansTransporteur, AlertTriangle],
                ] as [typeof opsCarrierFilter, string, number, React.ElementType][]).map(([value, label, count, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOpsCarrierFilter(value)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                      opsCarrierFilter === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label} ({count})
                  </button>
                ))}
              </div>
            );
          })()}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">{filteredOps.length} conteneur(s)</h3>
              {(opsStatusFilter !== 'ALL' || opsPortFilter !== 'ALL' || opsCarrierFilter !== 'ALL' || opsFromDate || opsToDate || opsAgentFilter) && (
                <button
                  type="button"
                  onClick={() => goToOperationsWith({})}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
            {filteredOps.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Aucun résultat pour ces filtres.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {filteredOps.map((c) => {
                  const carrierLabel =
                    c.carrierType === 'CHAUFFEUR_INTERNE' ? c.driverNom
                    : c.carrierType === 'SOUS_TRAITANT' ? c.subcontractorNom
                    : null;
                  return (
                    <button
                      key={c.id}
                      onClick={() => openReport(c.id)}
                      className="text-left bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-blue-700 text-xs truncate">{c.numeroReference}</span>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.status === 'OUVERT' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {c.status === 'OUVERT' ? 'Ouvert' : 'Fermé'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 mt-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Package className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-slate-900 block truncate">{c.containerNumber}</span>
                          <span className="text-[11px] text-slate-500">BL {c.blNumber} · {c.port === 'Douala' ? 'PAD' : 'PAK'}</span>
                        </div>
                      </div>
                      {c.clientNom && <p className="text-[11px] text-slate-500 mt-2 truncate">{c.clientNom}</p>}
                      <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-[11px] text-slate-400 truncate flex-1">
                          {carrierLabel || <span className="italic text-rose-500">Non assigné</span>}
                        </p>
                        {c.carrierType && (
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            c.carrierType === 'CHAUFFEUR_INTERNE' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {c.carrierType === 'CHAUFFEUR_INTERNE' ? 'Interne' : 'Sous-traitant'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100">Créé par {c.createdByNom || '—'}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'opsBoard' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Où en est chaque conteneur ouvert en ce moment — mis à jour automatiquement toutes les 12 secondes.
          </p>
          {isLoadingOpsBoard ? (
            <div className="p-10 flex items-center justify-center text-slate-400 gap-2 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement…
            </div>
          ) : opsBoardError ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
              {opsBoardError}
              <button onClick={fetchOpsBoard} className="underline cursor-pointer">Réessayer</button>
            </div>
          ) : opsBoardItems.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
              Aucun conteneur ouvert en ce moment.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    <th className="px-3 py-2.5 font-bold text-slate-500">N° Réf.</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500">Client</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500">Conteneur</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500">Port</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500">Chauffeur</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500">Camion</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500">Étape Actuelle</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500">POD</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500">Retour</th>
                    <th className="px-3 py-2.5 font-bold text-slate-500">Incidents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {opsBoardItems.map((item) => {
                    const carrierLabel =
                      item.carrierType === 'CHAUFFEUR_INTERNE' ? item.driverNom
                      : item.carrierType === 'SOUS_TRAITANT' ? item.subcontractorNom
                      : null;
                    return (
                      <tr key={item.id} onClick={() => openReport(item.id)} className="hover:bg-slate-50/70 cursor-pointer transition-colors">
                        <td className="px-3 py-2.5 font-mono text-blue-700 font-bold whitespace-nowrap">{item.numeroReference}</td>
                        <td className="px-3 py-2.5">{item.clientNom || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold">{item.containerNumber}</span>
                          <span className="text-slate-400 block text-[10px]">BL {item.blNumber}</span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{item.port === 'Douala' ? 'PAD' : 'PAK'} · {item.terminal}</td>
                        <td className="px-3 py-2.5">
                          {carrierLabel || <span className="text-rose-500 italic">Non assigné</span>}
                        </td>
                        <td className="px-3 py-2.5 font-mono">{item.immatriculationCamionTrajet || '—'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {item.currentStepName ? (
                            <span>#{item.currentStepNumber} {item.currentStepName}</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">Terminé</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.hasPod ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {item.hasPod ? 'Reçue' : 'En attente'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {item.estEnRetard ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-200">En retard</span>
                          ) : item.dateLimiteRetour ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">Dans les délais</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {item.incidentsCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">{item.incidentsCount}</span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {viewMode === 'byBl' && (
        <div className="space-y-4">
          {selectedBl ? (
            <>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setSelectedBl(null); setBlContainers([]); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Retour à la liste des BL
                </button>
                <button
                  onClick={openBlReport}
                  disabled={isLoadingBlReport}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  {isLoadingBlReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                  Exporter en PDF
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-bold text-sm text-slate-900">BL {selectedBl} — {blContainers.length} conteneur(s)</h3>
                </div>
                {isLoadingBlContainers ? (
                  <div className="p-8 flex items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Chargement…
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                    {blContainers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => openReport(c.id)}
                        className="text-left bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-blue-700 text-xs truncate">{c.numeroReference}</span>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.status === 'OUVERT' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {c.status === 'OUVERT' ? 'Ouvert' : 'Fermé'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 mt-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Package className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-sm text-slate-900 block truncate">{c.containerNumber}</span>
                            <span className="text-[11px] text-slate-500">{c.port === 'Douala' ? 'PAD' : 'PAK'} · {c.terminal} · {c.size}'</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Rechercher un BL…"
                    value={blSearch}
                    onChange={(e) => setBlSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>
              {isLoadingBlGroups ? (
                <div className="p-10 flex items-center justify-center text-slate-400 gap-2 bg-white rounded-2xl border border-slate-200">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement…
                </div>
              ) : blGroupsError ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
                  {blGroupsError}
                  <button onClick={fetchBlGroups} className="underline cursor-pointer">Réessayer</button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  {blGroups
                    .filter((bl) => bl.blNumber.toLowerCase().includes(blSearch.toLowerCase()))
                    .length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">Aucun BL trouvé.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {blGroups
                        .filter((bl) => bl.blNumber.toLowerCase().includes(blSearch.toLowerCase()))
                        .map((bl) => (
                          <button
                            key={bl.blNumber}
                            onClick={() => openBl(bl.blNumber)}
                            className="w-full text-left p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/70 transition-colors cursor-pointer"
                          >
                            <div>
                              <span className="font-mono font-bold text-blue-700 block">{bl.blNumber}</span>
                              <span className="text-slate-500">{bl.ports.map((p) => (p === 'Douala' ? 'PAD' : 'PAK')).join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-600 font-semibold">{bl.totalContainers} conteneur{bl.totalContainers > 1 ? 's' : ''}</span>
                              <span className="text-blue-600 font-bold">{bl.ouverts} ouvert{bl.ouverts !== 1 ? 's' : ''}</span>
                              <span className="text-slate-400">{bl.fermes} fermé{bl.fermes !== 1 ? 's' : ''}</span>
                              <ChevronRight className="w-4 h-4 text-slate-300" />
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {viewMode === 'deliveries' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Statut</label>
              <select value={delStatusFilter} onChange={(e) => setDelStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold">
                <option value="ALL">Tous</option>
                <option value="LIVRE_CONFORME">Livré Conforme</option>
                <option value="SOUS_RESERVES">Sous Réserves</option>
                <option value="REFUSE">Refusé</option>
                <option value="EN_COURS">En Cours</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Du</label>
              <input type="date" value={delFromDate} onChange={(e) => setDelFromDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Au</label>
              <input type="date" value={delToDate} onChange={(e) => setDelToDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Rechercher</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={delSearch}
                  onChange={(e) => setDelSearch(e.target.value)}
                  placeholder="N° conteneur ou BL…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">{filteredDeliveries.length} livraison(s)</h3>
            </div>
            {isLoadingDeliveries ? (
              <div className="p-10 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement…
              </div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Aucune livraison pour ces filtres.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {filteredDeliveries.map((d) => (
                  <div key={d.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-blue-700 text-xs truncate">{d.numeroReference}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        d.status === 'LIVRE_CONFORME' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {d.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 mt-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-slate-900 block truncate">{d.containerNumber}</span>
                        <span className="text-[11px] text-slate-500">BL {d.blNumber}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 truncate">Reçu par : {d.recipientName}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{d.dateTime}</p>
                    {d.bordereauPhotoUrl && (
                      <a href={d.bordereauPhotoUrl} target="_blank" rel="noreferrer"
                        className="inline-block mt-2 text-[10px] text-blue-600 font-bold underline">
                        Voir la preuve
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'dashboard' && (
      <>
      {isLoading && (
        <div className="p-10 flex items-center justify-center text-slate-400 gap-2 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement…
        </div>
      )}
      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
          {loadError}
          <button onClick={fetchAll} className="underline cursor-pointer">Réessayer</button>
        </div>
      )}

      {!isLoading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={Package} label="Total Conteneurs" value={containers.length} accent="blue" onClick={() => goToOperationsWith({})} />
            <StatCard icon={Clock} label="Actuellement Ouverts" value={totalOuverts} accent="amber" onClick={() => goToOperationsWith({ status: 'OUVERT' })} />
            <StatCard icon={CheckCircle2} label="Clôturés" value={totalFermes} accent="emerald" onClick={() => goToOperationsWith({ status: 'FERME' })} />
            <StatCard icon={Truck} label="Avec Transporteur" value={assignes} accent="blue" onClick={() => goToOperationsWith({ status: 'OUVERT', carrier: 'ASSIGNED' })} />
            <StatCard icon={AlertTriangle} label="Sans Transporteur" value={nonAssignes} accent={nonAssignes > 0 ? 'rose' : 'emerald'} onClick={() => goToOperationsWith({ status: 'OUVERT', carrier: 'UNASSIGNED' })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => goToOperationsWith({ port: 'Douala' })}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 text-left hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer"
            >
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Ship className="w-3.5 h-3.5" /> Douala (PAD)</span>
              <span className="text-2xl font-bold text-slate-900 block mt-1">{parPort.Douala}</span>
            </button>
            <button
              type="button"
              onClick={() => goToOperationsWith({ port: 'Kribi' })}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 text-left hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer"
            >
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Ship className="w-3.5 h-3.5" /> Kribi (PAK)</span>
              <span className="text-2xl font-bold text-slate-900 block mt-1">{parPort.Kribi}</span>
            </button>
          </div>

          {revenueSummary && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5"><Wallet className="w-4 h-4 text-emerald-600" /> Synthèse Financière</h3>
                {revenueSummary.containersWithoutRate > 0 && (
                  <span className="text-[11px] text-amber-600 font-semibold">{revenueSummary.containersWithoutRate} conteneur(s) sans tarif renseigné</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Revenu Total (Tarifs Convenus)</span>
                  <span className="text-lg font-bold text-slate-900">{formatFCFA(revenueSummary.totalRevenueFCFA)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Coûts Totaux</span>
                  <span className="text-lg font-bold text-slate-900">{formatFCFA(revenueSummary.totalCostsFCFA)}</span>
                </div>
                <div className={`rounded-xl px-3 py-2 -m-1 border ${revenueSummary.totalMargeFCFA >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <span className={`text-[10px] font-bold uppercase block ${revenueSummary.totalMargeFCFA >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Marge</span>
                  <span className={`text-lg font-bold ${revenueSummary.totalMargeFCFA >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>{formatFCFA(revenueSummary.totalMargeFCFA)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Tous les Conteneurs</h3>
            </div>
            {containers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Aucun conteneur enregistré.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {containers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openReport(c.id)}
                    className="w-full text-left p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-mono font-bold text-blue-700 block">{c.numeroReference}</span>
                      <span className="text-slate-500">{c.containerNumber} · BL {c.blNumber}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      c.status === 'OUVERT' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {c.status === 'OUVERT' ? 'Ouvert' : 'Fermé'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      </>
      )}

      {blReport && (
        <PrintableBLReportView report={blReport} onClose={() => setBlReport(null)} />
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

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; sub?: string; accent?: keyof typeof ACCENT_CLASSES; onClick?: () => void }> = ({
  icon: Icon, label, value, sub, accent = 'slate', onClick,
}) => {
  const content = (
    <>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="text-xl font-bold mt-1">{value}</div>
      {sub && <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`p-3.5 rounded-xl border text-left w-full cursor-pointer hover:shadow-sm hover:brightness-95 transition-all ${ACCENT_CLASSES[accent]}`}
      >
        {content}
      </button>
    );
  }

  return <div className={`p-3.5 rounded-xl border ${ACCENT_CLASSES[accent]}`}>{content}</div>;
};
