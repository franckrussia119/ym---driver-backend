import React, { useState, useEffect } from 'react';
import {
  WeeklyReport,
  UserProfile,
  FaultDeclaration,
  FaultStatus,
  MechanicInvoice,
  InspectionDefectItem,
  FleetVehicle,
  MaintenancePlanItem,
  ScheduledMaintenance,
  ContainerCaution,
  FuelAnalysisEntry,
  DriverPerformanceScore,
} from './types';
import {
  createDefaultReport,
  ensureReportDefaults,
  DEMO_FAULTS,
  DEMO_INVOICES,
  DEMO_FLEET,
  DEMO_MAINTENANCE_PLANS,
  DEMO_SCHEDULED_MAINTENANCE,
  DEMO_CAUTIONS,
  DEMO_FUEL_ANALYSIS,
  DEMO_DRIVER_SCORES,
} from './data/defaults';
import { restoreSession, logout as apiLogout } from './lib/auth';
import { ApiError } from './lib/api';
import {
  createReport as apiCreateReport,
  updateReport as apiUpdateReport,
  submitReport as apiSubmitReport,
  putDriverSignature,
  listReports,
  getReport,
  ReportListItem,
} from './lib/reports';
import { listFaults, createFault, advanceFault } from './lib/faults';
import { listInvoices } from './lib/invoices';
import { FaultFormInput } from './components/FaultDeclarationModal';
import { Header } from './components/Header';
import { Sidebar, SidebarTab } from './components/Sidebar';
import { ContainerSidebar } from './components/ContainerSidebar';
import { ContainerRegistryView } from './components/ContainerRegistryView';
import { ContainerDetailView } from './components/ContainerDetailView';
import { SubcontractorDriversView } from './components/SubcontractorDriversView';
import { ContainerReturnView } from './components/ContainerReturnView';
import { ContainerDeliveryView } from './components/ContainerDeliveryView';
import { ContainerReportsView } from './components/ContainerReportsView';
import { getWorkspaceBg } from './lib/sidebarColors';
import { usePolling } from './lib/usePolling';
import { RoutesDispatchView } from './components/RoutesDispatchView';
import { DriverMobileAppView } from './components/DriverMobileAppView';
import { ModulesDashboard } from './components/ModulesDashboard';
import { Section2TripsLog } from './components/Section2TripsLog';
import { Section3VehicleInspection } from './components/Section3VehicleInspection';
import { Section4Observations } from './components/Section4Observations';
import { Section5Signatures } from './components/Section5Signatures';
import { Section1DriverInfo } from './components/Section1DriverInfo';
import { LoginModal } from './components/LoginModal';
import { FaultDeclarationModal } from './components/FaultDeclarationModal';
import { MechanicInvoiceModal } from './components/MechanicInvoiceModal';
import { FaultWorkflowView } from './components/FaultWorkflowView';
import { LandingPortal } from './components/LandingPortal';
import { UserManagementView } from './components/UserManagementView';
import { DriverHomeMenu } from './components/DriverHomeMenu';

import { SmartphoneFrameWrapper } from './components/SmartphoneFrameWrapper';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DriverHistoryView } from './components/DriverHistoryView';

// New Module Views
import { FleetRegistryView } from './components/FleetRegistryView';
import { PreventiveMaintenanceView } from './components/PreventiveMaintenanceView';
import { ContainerCautionsView } from './components/ContainerCautionsView';
import { RoutePlanningFuelView } from './components/RoutePlanningFuelView';
import { DriverPerformanceView } from './components/DriverPerformanceView';
import { DriverAnalysisHub } from './components/DriverAnalysisHub';
import { ProofOfDeliveryView } from './components/ProofOfDeliveryView';
import { CustomerFeedbackView } from './components/CustomerFeedbackView';

import { CheckCircle2, AlertTriangle, Wrench, ShieldCheck, Truck, Users, Lock, FileText } from 'lucide-react';

const STORAGE_KEY_CURRENT = 'ym_transit_current_report_v3';


export default function App() {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('routes_overview');
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // Se souvient de l'onglet courant (et du conteneur ouvert, le cas échéant)
  // pour qu'un simple rechargement de page (F5) ne renvoie jamais l'utilisateur
  // à son écran d'accueil par défaut — seule une VRAIE nouvelle connexion le fait.
  // IMPORTANT : on attend que la restauration de session soit terminée avant de
  // commencer à écrire, sinon l'état initial ('routes_overview') écraserait
  // l'onglet sauvegardé avant même que la restauration ait pu le lire.
  useEffect(() => {
    if (isRestoringSession) return;
    sessionStorage.setItem('ym_transit_last_tab', sidebarTab);
  }, [sidebarTab, isRestoringSession]);
  useEffect(() => {
    if (isRestoringSession) return;
    if (selectedContainerId) sessionStorage.setItem('ym_transit_last_container_id', selectedContainerId);
    else sessionStorage.removeItem('ym_transit_last_container_id');
  }, [selectedContainerId, isRestoringSession]);
  const [isSmartphoneView, setIsSmartphoneView] = useState<boolean>(false);

  // POD Modal State

  // Auth User State — la session réelle est restaurée via le jeton JWT
  // (voir useEffect ci-dessous), plus jamais depuis un objet utilisateur
  // stocké en clair dans localStorage.
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    restoreSession().then((user) => {
      if (user) {
        handleSelectUserFromPortal(user, true);
      }
      setIsRestoringSession(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDeclareFaultModalOpen, setIsDeclareFaultModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedFaultForInvoice, setSelectedFaultForInvoice] = useState<FaultDeclaration | null>(null);

  // Data Stores
  const [report, setReport] = useState<WeeklyReport>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (saved) {
      try { return ensureReportDefaults(JSON.parse(saved)); } catch { }
    }
    return createDefaultReport();
  });

  // Historique des rapports : désormais sourcé depuis le backend (voir
  // useEffect de rafraîchissement plus bas), plus localStorage.
  const [history, setHistory] = useState<ReportListItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const refreshReportHistory = React.useCallback(async () => {
    if (!currentUser) return;
    setIsHistoryLoading(true);
    try {
      const list = await listReports();
      setHistory(list);
    } catch {
      // silencieux : l'historique reste tel quel si le rafraîchissement échoue
    } finally {
      setIsHistoryLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshReportHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const [faults, setFaults] = useState<FaultDeclaration[]>([]);
  const [isSubmittingFault, setIsSubmittingFault] = useState(false);

  const [invoices, setInvoices] = useState<MechanicInvoice[]>([]);

  const refreshInvoices = React.useCallback(async () => {
    if (!currentUser) return;
    try {
      const list = await listInvoices();
      setInvoices(list);
    } catch {
      // silencieux : la liste reste telle quelle si le rafraîchissement échoue
    }
  }, [currentUser]);

  useEffect(() => {
    refreshInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const refreshFaults = React.useCallback(async () => {
    if (!currentUser) return;
    try {
      const list = await listFaults();
      setFaults(list);
    } catch {
      // silencieux : les pannes restent telles quelles si le rafraîchissement échoue
    }
  }, [currentUser]);

  useEffect(() => {
    refreshFaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Rafraîchissement silencieux régulier — ces trois domaines (rapports,
  // factures, pannes) sont partagés entre plusieurs écrans et plusieurs
  // rôles ; personne ne devrait avoir besoin de recharger la page pour voir
  // qu'un autre utilisateur a changé quelque chose.
  usePolling(() => { refreshReportHistory(); }, 15000, !!currentUser);
  usePolling(() => { refreshInvoices(); }, 15000, !!currentUser);
  usePolling(() => { refreshFaults(); }, 15000, !!currentUser);

  const [notification, setNotification] = useState<string | null>(null);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(report));
  }, [report]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'CHAUFFEUR') {
        const camionParts = currentUser.camionAssigne?.split('(') || [];
        const immat = camionParts[0]?.trim() || currentUser.camionAssigne || '';
        const model = camionParts[1] ? camionParts[1].replace(')', '').trim() : '';

        setReport((prev) => ({
          ...prev,
          driverInfo: {
            ...prev.driverInfo,
            nomChauffeur: currentUser.name || prev.driverInfo.nomChauffeur,
            immatriculation: immat,
            marqueModele: model,
          },
        }));
      }
    }
  }, [currentUser]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const hasDefects = (Object.values(report.defects || {}) as InspectionDefectItem[]).some((d) => d.constate);

  // Actions
  const handleSelectUserFromPortal = (user: UserProfile, isRestore = false) => {
    setCurrentUser(user);

    if (isRestore) {
      // Rechargement de page : on restaure l'écran où l'utilisateur était,
      // pas un écran d'accueil par défaut. Aucun toast — ce n'est pas une
      // nouvelle connexion.
      const savedTab = sessionStorage.getItem('ym_transit_last_tab') as SidebarTab | null;
      const savedContainerId = sessionStorage.getItem('ym_transit_last_container_id');
      if (savedTab) {
        setSidebarTab(savedTab);
        if (savedTab === 'container_detail' && savedContainerId) {
          setSelectedContainerId(savedContainerId);
        }
        return;
      }
      // Pas d'onglet sauvegardé (première visite) : on retombe sur le
      // comportement par défaut ci-dessous.
    }

    if (user.role === 'CHAUFFEUR') {
      setSidebarTab('proof_of_delivery');
      showToast(`Espace Chauffeur connecté : ${user.name}`);
    } else if (user.role === 'MECANICIEN') {
      setSidebarTab('faults_workflow');
      showToast(`Espace Mécanique connecté : ${user.name}`);
    } else if (user.role === 'SUPER_ADMIN') {
      setSidebarTab('superadmin_users');
      showToast(`Espace Super Admin connecté : ${user.name}`);
    } else if (user.role === 'SUPERVISEUR_CONTENEURS') {
      setSidebarTab('container_registry');
      showToast(`Espace Superviseur Conteneurs connecté : ${user.name}`);
    } else {
      setSidebarTab('routes_overview');
      showToast(`Espace Supervision / Admin connecté : ${user.name}`);
    }
  };

  const handleLogin = (user: UserProfile) => {
    handleSelectUserFromPortal(user);
    setIsLoginModalOpen(false);
  };

  const handleLogout = async () => {
    await apiLogout();
    setCurrentUser(null);
    setSidebarTab('routes_overview');
    sessionStorage.removeItem('ym_transit_last_tab');
    sessionStorage.removeItem('ym_transit_last_container_id');
    showToast('Déconnexion réussie.');
  };

  const [isSavingReport, setIsSavingReport] = useState(false);

  // Un rapport tout juste créé localement a un id placeholder "RPT-...".
  // Une fois enregistré côté serveur, il reçoit un vrai id (UUID) — c'est ce
  // qui distingue "à créer" de "à mettre à jour".
  const isLocalOnlyReport = (id: string) => id.startsWith('RPT-');

  const persistReport = async (current: WeeklyReport): Promise<WeeklyReport> => {
    if (isLocalOnlyReport(current.id)) {
      return apiCreateReport(current);
    }
    return apiUpdateReport(current.id, current);
  };

  const handleSaveDraft = async () => {
    if (!currentUser) return;
    setIsSavingReport(true);
    try {
      const saved = await persistReport(report);
      setReport(saved);
      await refreshReportHistory();
      showToast('Rapport sauvegardé avec succès dans la base de données.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Échec de l'enregistrement du rapport.");
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleSubmitReportToAdmin = async () => {
    if (!currentUser) return;
    const sig = report.signatures?.chauffeur;
    if (!sig?.signature && !sig?.nom) {
      alert('Veuillez signer la section 5 avant de soumettre le rapport.');
      return;
    }

    setIsSavingReport(true);
    try {
      // 1. S'assurer que le rapport existe côté serveur (créer si besoin).
      const saved = await persistReport(report);

      // 2. Enregistrer la signature du chauffeur côté serveur.
      await putDriverSignature(saved.id, {
        nom: sig.nom,
        signature: sig.signature,
        date: sig.date || new Date().toISOString().slice(0, 10),
      });

      // 3. Soumettre : verrouille définitivement le rapport côté serveur.
      const submitted = await apiSubmitReport(saved.id);
      setReport(submitted);
      await refreshReportHistory();

      showToast("Rapport hebdomadaire soumis et verrouillé ! Transmis à l'Administration.");
      setSidebarTab('driver_mobile_app');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Échec de l'envoi du rapport.");
    } finally {
      setIsSavingReport(false);
    }
  };

  // Ouvre un rapport historique : récupère la version complète depuis le
  // serveur (la liste ne contient qu'un résumé), puis l'affiche.
  const handleViewHistoricalReport = async (reportId: string) => {
    try {
      const full = await getReport(reportId);
      setReport(full);
      setSidebarTab('driver_vehicle');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Impossible de charger ce rapport.');
    }
  };

  // Ouvre l'écran de rapport hebdomadaire du chauffeur. Le brouillon local
  // (localStorage) peut être obsolète — en particulier, il ne sait pas
  // qu'une preuve de livraison ou un retour de conteneur a pu remplir
  // automatiquement des trajets côté serveur entre-temps. On récupère donc
  // toujours le brouillon réel du serveur s'il existe, pour ne jamais
  // afficher un rapport qui ne reflète pas ce qui a réellement été fait.
  const handleOpenWeeklyReport = async () => {
    if (!currentUser) return;
    try {
      const all = await listReports();
      const currentDraft = all.find((r) => !r.isSubmitted);
      if (currentDraft) {
        const full = await getReport(currentDraft.id);
        setReport(full);
      }
      // Si aucun brouillon n'existe encore côté serveur, on garde le
      // brouillon local (nouvelle semaine, rien à synchroniser).
    } catch (err) {
      // Silencieux : si la récupération échoue (ex: hors-ligne), on continue
      // avec le brouillon local plutôt que de bloquer le chauffeur.
    }
    setSidebarTab('driver_vehicle');
  };

  const handleAddFault = async (input: FaultFormInput) => {
    setIsSubmittingFault(true);
    try {
      const created = await createFault(input);
      await refreshFaults();
      setIsDeclareFaultModalOpen(false);
      showToast(`Panne enregistrée et transmise au Superviseur & Atelier.`);
      setSidebarTab('faults_workflow');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Échec de l'enregistrement de la panne.");
    } finally {
      setIsSubmittingFault(false);
    }
  };

  // Le statut cible réel est toujours déterminé par le serveur (jamais par
  // le client) — targetStatus n'est utilisé ici que pour la compatibilité
  // de signature avec FaultWorkflowView, il n'est pas envoyé à l'API.
  const handleUpdateFaultStatus = async (faultId: string, _targetStatus: FaultStatus, comment?: string) => {
    try {
      await advanceFault(faultId, comment);
      await refreshFaults();
      showToast('Panne mise à jour avec succès.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Impossible de faire avancer cette panne.');
    }
  };

  // Quand une facture est créée pour une panne, cela signale que la
  // réparation est terminée : on fait avancer le workflow de la panne.
  const handleInvoiceSavedForFault = async (faultId?: string) => {
    await refreshInvoices();
    if (faultId) {
      try {
        await advanceFault(faultId, 'Facture atelier enregistrée par le mécanicien.');
        await refreshFaults();
      } catch {
        // La facture est déjà enregistrée ; l'avancement de la panne est
        // une amélioration secondaire, on ne bloque pas l'utilisateur si
        // le statut ne peut pas avancer (ex: déjà à l'étape suivante).
      }
    }
    showToast('Facture enregistrée avec succès.');
    setSidebarTab('mechanic_invoices');
  };


  // Redirige vers l'écran réel de Preuve de Livraison (l'ancien modal de
  // confirmation rapide ne persistait jamais rien en base de données).
  const handleOpenPODModalForWaypoint = (_waypointName: string) => {
    setSidebarTab('proof_of_delivery');
  };

  // Le backend filtre déjà les rapports/pannes par chauffeur connecté (voir
  // GET /api/reports et GET /api/faults), donc ces listes ne contiennent
  // déjà que ce que ce rôle doit voir.
  const driverPersonalReports = history;
  const driverPersonalFaults = faults;

  // Restauration de session en cours : éviter le clignotement de l'écran de connexion
  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
          <span>Vérification de la session…</span>
        </div>
      </div>
    );
  }

  // If no user logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900">
        <LandingPortal onLoginSuccess={handleSelectUserFromPortal} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col lg:flex-row">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Login Modal */}
      {isLoginModalOpen && (
        <LoginModal onLogin={handleLogin} onClose={() => setIsLoginModalOpen(false)} />
      )}

      {/* Fault Declaration Modal */}
      {currentUser && (
        <FaultDeclarationModal
          currentUser={currentUser}
          isOpen={isDeclareFaultModalOpen}
          onClose={() => setIsDeclareFaultModalOpen(false)}
          onSubmitFault={handleAddFault}
          isSubmitting={isSubmittingFault}
        />
      )}

      {/* Mechanic Invoice Modal */}
      {currentUser && (
        <MechanicInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedFaultForInvoice(null);
          }}
          onSaved={() => handleInvoiceSavedForFault(selectedFaultForInvoice?.id)}
          currentUser={currentUser}
          initialTruck={selectedFaultForInvoice?.immatriculation || ''}
          initialChauffeur={selectedFaultForInvoice?.chauffeurNom || ''}
          initialFaultId={selectedFaultForInvoice?.id}
        />
      )}

      {/* Proof of Delivery Modal (POD) */}
      {/* Left Sidebar */}
      {currentUser?.role === 'SUPERVISEUR_CONTENEURS' ? (
        <ContainerSidebar
          activeTab={sidebarTab}
          setActiveTab={setSidebarTab}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      ) : (
        <Sidebar
          activeTab={sidebarTab}
          setActiveTab={setSidebarTab}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* Main Workspace Area */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-colors duration-300 ${getWorkspaceBg(sidebarTab)}`}>
        {/* Top Header Bar */}
        {currentUser?.role !== 'SUPERVISEUR_CONTENEURS' && (
          <Header
            report={report}
            currentUser={currentUser}
            activeTab={sidebarTab as any}
            setActiveTab={(tab: any) => setSidebarTab(tab)}
            onLogout={handleLogout}
            onOpenDeclareFault={() => setIsDeclareFaultModalOpen(true)}
            onOpenCreateInvoice={() => setIsInvoiceModalOpen(true)}
            onLoadDemo={() => setReport(createDefaultReport())}
            onSaveDraft={handleSaveDraft}
            onPrint={() => window.print()}
            hasDefects={hasDefects}
            historyCount={history.length}
            isSmartphoneView={isSmartphoneView}
            setIsSmartphoneView={setIsSmartphoneView}
          />
        )}

        {/* Content Area */}
        <SmartphoneFrameWrapper
          isSmartphoneView={isSmartphoneView}
          setIsSmartphoneView={setIsSmartphoneView}
          appName="YM-TRANSIT Logistics"
          driverName={currentUser?.name}
        >
          <main className="flex-1 p-3 sm:p-5 lg:p-6 pb-24 lg:pb-10 max-w-7xl mx-auto w-full">
            
            {/* DRIVER MOBILE HOME MENU (When Driver clicks Mobile App Tab) */}
            {sidebarTab === 'driver_mobile_app' && (
              <DriverHomeMenu
                currentUser={currentUser}
                onOpenDeclareFault={() => setIsDeclareFaultModalOpen(true)}
                onOpenWeeklyReport={handleOpenWeeklyReport}
                driverReports={driverPersonalReports}
                driverFaults={driverPersonalFaults}
                onViewReport={handleViewHistoricalReport}
                onViewFault={(fault) => {
                  setSidebarTab('faults_workflow');
                }}
              />
            )}

            {/* 1. ROUTES DISPATCH OVERVIEW VIEW */}
            {sidebarTab === 'routes_overview' && (
              <RoutesDispatchView
                onOpenMobileView={() => setSidebarTab('driver_mobile_app')}
                onOpenPODModal={handleOpenPODModalForWaypoint}
              />
            )}

            {/* 2. CONDUCTEUR ET VÉHICULE (Weekly Driver Report) */}
            {sidebarTab === 'driver_vehicle' && (
              <div className="space-y-6">
                {/* Header Banner */}
                <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Truck className="w-6 h-6 text-blue-400" />
                    <div>
                      <h2 className="font-bold text-base">Rapport Hebdomadaire & Inspection Camion</h2>
                      <p className="text-xs text-slate-400">
                        {report.isSubmitted ? 'Rapport soumis et verrouillé (Lecture seule)' : 'Saisie du rapport par le chauffeur'}
                      </p>
                    </div>
                  </div>

                  {report.isSubmitted ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-800/80">
                      <Lock className="w-3.5 h-3.5" />
                      Envoyé — non modifiable
                    </span>
                  ) : currentUser?.role === 'CHAUFFEUR' ? (
                    <button
                      onClick={() => setIsDeclareFaultModalOpen(true)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Déclarer Panne</span>
                    </button>
                  ) : null}
                </div>

                <Section1DriverInfo
                  driverInfo={report.driverInfo}
                  onChange={(updated) => setReport({ ...report, driverInfo: updated })}
                  isSubmitted={report.isSubmitted}
                />

                <Section2TripsLog
                  trips={report.trips}
                  tripStats={report.tripStats}
                  onUpdateTrips={(updatedTrips) => setReport({ ...report, trips: updatedTrips })}
                  onUpdateTripStats={(updatedStats) => setReport({ ...report, tripStats: updatedStats })}
                  isSubmitted={report.isSubmitted}
                />

                <Section3VehicleInspection
                  checklist={report.checklist || {}}
                  defects={report.defects || {}}
                  aucunDefautConstate={report.aucunDefautConstate}
                  mechanicVerif={report.mechanicVerif || { nomMecanicien: '', date: '' }}
                  onAucunDefautToggle={(val) => setReport({ ...report, aucunDefautConstate: val })}
                  onDefectChange={(id, updated) =>
                    setReport({
                      ...report,
                      defects: {
                        ...(report.defects || {}),
                        [id]: {
                          id,
                          category: '',
                          name: '',
                          constate: false,
                          ...(report.defects?.[id] || {}),
                          ...updated,
                        },
                      },
                    })
                  }
                  onChecklistToggle={(item) =>
                    setReport({
                      ...report,
                      checklist: {
                        ...(report.checklist || {}),
                        [item]: !report.checklist?.[item],
                      },
                    })
                  }
                  onChecklistAll={(checked) => {
                    const updated = { ...(report.checklist || {}) };
                    Object.keys(updated).forEach((k) => (updated[k] = checked));
                    setReport({ ...report, checklist: updated });
                  }}
                  onMechanicVerifChange={(updated) => setReport({ ...report, mechanicVerif: updated })}
                  onUpdateChecklist={(c) => setReport({ ...report, checklist: c })}
                  onUpdateDefects={(d) => setReport({ ...report, defects: d })}
                  onUpdateAucunDefaut={(val) => setReport({ ...report, aucunDefautConstate: val })}
                  isSubmitted={report.isSubmitted}
                />

                <Section4Observations
                  observations={report.observations}
                  onChange={(obs) => setReport({ ...report, observations: obs })}
                  isSubmitted={report.isSubmitted}
                />

                <Section5Signatures
                  signatures={report.signatures}
                  onChange={(sigs) => setReport({ ...report, signatures: sigs })}
                  onSubmitReport={handleSubmitReportToAdmin}
                  isSubmitted={report.isSubmitted}
                  isSubmitting={isSavingReport}
                />
              </div>
            )}

            {/* 3. FAULTS WORKFLOW VIEW */}
            {sidebarTab === 'faults_workflow' && (
              <FaultWorkflowView
                currentUser={currentUser}
                faults={faults}
                onUpdateFaultStatus={handleUpdateFaultStatus}
                onOpenDeclareModal={() => setIsDeclareFaultModalOpen(true)}
                onOpenCreateInvoiceForFault={(fault) => {
                  setSelectedFaultForInvoice(fault);
                  setIsInvoiceModalOpen(true);
                }}
              />
            )}

            {/* 4. MECHANIC INVOICES VIEW */}
            {sidebarTab === 'mechanic_invoices' && (
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-blue-600" />
                      <span>Factures Atelier & Interventions Mécaniques</span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Création et consultation des factures d'entretien et pièces détachées (FCFA).
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFaultForInvoice(null);
                      setIsInvoiceModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Créer Facture Atelier (FCFA)</span>
                  </button>
                </div>

                {invoices.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Aucune facture d'intervention mécanique enregistrée pour le moment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{inv.id}</span>
                            <span className="text-slate-400">·</span>
                            <span className="font-semibold text-blue-700">{inv.truckImmatriculation}</span>
                          </div>
                          <p className="text-slate-600 mt-0.5">{inv.descriptionTravaux}</p>
                          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                            Mécanicien : {inv.mecanicienNom} · Date : {inv.dateIntervention}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-slate-900 text-sm block">
                            {new Intl.NumberFormat('fr-FR').format(inv.totalTTC)} FCFA
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-1">
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. SUPERADMIN USER MANAGEMENT VIEW */}
            {sidebarTab === 'superadmin_users' && (
              <UserManagementView />
            )}

            {/* 6. REGISTRE FLOTTE & DOCUMENTS */}
            {sidebarTab === 'fleet_registry' && (
              <FleetRegistryView />
            )}

            {/* 7. MAINTENANCE PRÉVENTIVE */}
            {sidebarTab === 'preventive_maintenance' && (
              <PreventiveMaintenanceView
                allTrips={report.trips || []}
                currentUser={currentUser}
                onOpenCreateInvoiceForMaintenance={(sched) => {
                  setSelectedFaultForInvoice(null);
                  setIsInvoiceModalOpen(true);
                  showToast(`Création facture atelier pour intervention ${sched.vehicleImmatriculation}`);
                }}
              />
            )}

            {/* 8. SUIVI CAUTIONS CONTENEURS */}
            {sidebarTab === 'container_cautions' && <ContainerCautionsView />}

            {/* 9. OPTIMISATION ROUTE & CARBURANT */}
            {sidebarTab === 'route_planning_fuel' && <RoutePlanningFuelView />}

            {/* 10. SCORE & PERFORMANCE CHAUFFEURS */}
            {sidebarTab === 'driver_performance' && (
              <DriverPerformanceView />
            )}

            {/* 10b. ANALYSE DÉTAILLÉE PAR CHAUFFEUR (nouveau) */}
            {sidebarTab === 'driver_analysis' && <DriverAnalysisHub />}

            {/* 11. PREUVE DE LIVRAISON (POD) VIEW */}
            {sidebarTab === 'proof_of_delivery' && (
              <ProofOfDeliveryView
                currentUser={currentUser}
              />
            )}

            {/* 12. RETOUR CLIENT VIEW */}
            {sidebarTab === 'customer_feedback' && (
              <CustomerFeedbackView
                currentUser={currentUser}
              />
            )}

            {/* 13. HISTORIQUE GLOBAL (POD, RAPPORTS, AVIS) VIEW */}
            {sidebarTab === 'driver_history' && (
              <DriverHistoryView
                currentUser={currentUser}
                driverReports={history}
                onViewReport={handleViewHistoricalReport}
              />
            )}

            {/* 13. OTHER MODULES DASHBOARD */}
            {(sidebarTab === 'realtime_eta' ||
              sidebarTab === 'barcode_scan' ||
              sidebarTab === 'hazmat_routing') && (
              <ModulesDashboard
                onSelectModule={setSidebarTab}
                onOpenPODModal={handleOpenPODModalForWaypoint}
              />
            )}

            {/* MODULE GESTION DES CONTENEURS */}
            {sidebarTab === 'container_registry' && (
              <ContainerRegistryView
                currentUser={currentUser}
                onOpenContainer={(id) => {
                  setSelectedContainerId(id);
                  setSidebarTab('container_detail');
                }}
              />
            )}
            {sidebarTab === 'container_detail' && selectedContainerId && (
              <ContainerDetailView
                containerId={selectedContainerId}
                onBack={() => {
                  setSelectedContainerId(null);
                  setSidebarTab('container_registry');
                }}
                onGoToReturn={() => setSidebarTab('container_return')}
              />
            )}
            {sidebarTab === 'subcontractor_drivers' && <SubcontractorDriversView />}
            {sidebarTab === 'container_delivery' && <ContainerDeliveryView />}
            {sidebarTab === 'container_return' && <ContainerReturnView />}
            {sidebarTab === 'container_reports' && <ContainerReportsView />}
          </main>
        </SmartphoneFrameWrapper>

        {/* Permanent WhatsApp-Style Bottom Navigation for Mobile & Tablet */}
        <MobileBottomNav
          activeTab={sidebarTab}
          setActiveTab={(tab) => setSidebarTab(tab)}
          currentUser={currentUser}
          onOpenDeclareFault={() => setIsDeclareFaultModalOpen(true)}
          faultsCount={faults.filter((f) => f.status !== 'Clôturée par superviseur').length}
        />
      </div>
    </div>
  );
}
