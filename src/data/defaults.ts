import {
  WeeklyReport,
  InspectionDefectItem,
  UserProfile,
  FaultDeclaration,
  MechanicInvoice,
  FleetVehicle,
  MaintenancePlanItem,
  ScheduledMaintenance,
  ContainerCaution,
  FuelAnalysisEntry,
  DriverPerformanceScore,
} from '../types';

// ==========================================
// COMPTE DE DÉMARRAGE (bootstrap)
// ==========================================
// Un seul compte Super Admin est fourni pour permettre la toute première
// connexion. Il n'a aucune photo ni donnée fictive associée. Le Super Admin
// doit créer tous les autres comptes (Admin, Superviseur, Mécanicien,
// Chauffeur) lui-même depuis l'espace de gestion des utilisateurs, et
// changer ce mot de passe temporaire dès la première connexion.
export const DEMO_USERS: UserProfile[] = [
  {
    id: 'user_superadmin_bootstrap',
    name: 'Super Administrateur',
    email: 'superadmin@ym-transit.com',
    role: 'SUPER_ADMIN',
    password: 'ChangezMoi123',
    isActive: true,
  },
];

// ==========================================
// PANNES, FACTURES, FLOTTE, MAINTENANCE, CAUTIONS,
// CARBURANT, PERFORMANCE — vides au démarrage.
// Toutes les données réelles sont créées depuis l'application par les
// utilisateurs (Super Admin, Admin, Superviseur, Mécanicien, Chauffeur).
// ==========================================
export const DEMO_FAULTS: FaultDeclaration[] = [];
export const DEMO_INVOICES: MechanicInvoice[] = [];
export const DEMO_FLEET: FleetVehicle[] = [];
export const DEMO_MAINTENANCE_PLANS: MaintenancePlanItem[] = [];
export const DEMO_SCHEDULED_MAINTENANCE: ScheduledMaintenance[] = [];
export const DEMO_CAUTIONS: ContainerCaution[] = [];
export const DEMO_FUEL_ANALYSIS: FuelAnalysisEntry[] = [];
export const DEMO_DRIVER_SCORES: DriverPerformanceScore[] = [];

// ==========================================
// STRUCTURE DVIR — catégories de défauts (conforme à la norme, reprise
// fidèlement du rapport hebdomadaire papier). Ce n'est pas une donnée
// fictive : c'est la structure du formulaire elle-même.
// ==========================================
export const INITIAL_DEFECT_CATEGORIES: { category: string; items: { id: string; name: string }[] }[] = [
  {
    category: 'MOTEUR',
    items: [
      { id: 'moteur_fuite_huile', name: "Fuite d'huile" },
      { id: 'moteur_bruit_anormal', name: 'Bruit anormal / cognement' },
      { id: 'moteur_voyant_allume', name: 'Voyant moteur allumé' },
    ],
  },
  {
    category: 'FREINS',
    items: [
      { id: 'freins_pedale_molle', name: 'Pédale molle ou spongieuse' },
      { id: 'freins_bruit_grincement', name: 'Bruit de freinage (grincement)' },
      { id: 'freins_fuite_air', name: "Fuite du système d'air" },
    ],
  },
  {
    category: 'PNEUS',
    items: [
      { id: 'pneus_pression_basse', name: 'Pression basse' },
      { id: 'pneus_usure_anormale', name: 'Usure irrégulière / anormale' },
      { id: 'pneus_crevaison', name: 'Dommage visible ou crevaison' },
    ],
  },
  {
    category: 'ÉLECTRIQUE',
    items: [
      { id: 'elec_feu_defectueux', name: 'Feu avant ou arrière défectueux' },
      { id: 'elec_clignotant', name: 'Clignotant non fonctionnel' },
      { id: 'elec_batterie_faible', name: 'Batterie faible / voyant allumé' },
    ],
  },
  {
    category: 'HYDRAULIQUE',
    items: [
      { id: 'hydra_fuite_visible', name: 'Fuite hydraulique visible' },
      { id: 'hydra_niveau_bas', name: 'Niveau de fluide bas' },
    ],
  },
  {
    category: 'REFROIDISSEMENT',
    items: [
      { id: 'refroid_niveau_bas', name: 'Niveau de liquide bas' },
      { id: 'refroid_surchauffe', name: 'Surchauffe moteur' },
    ],
  },
  {
    category: 'TRANSMISSION',
    items: [
      { id: 'trans_difficulte_vitesses', name: 'Difficulté à passer les vitesses' },
      { id: 'trans_bruit_anormal', name: 'Bruit anormal' },
    ],
  },
  {
    category: 'CARROSSERIE / REMORQUE',
    items: [
      { id: 'carross_dommage_visible', name: 'Dommage visible (bosse/rayure)' },
      { id: 'carross_parebrise_fissure', name: 'Pare-brise fissuré' },
      { id: 'carross_retroviseur_casse', name: 'Rétroviseur cassé ou manquant' },
      { id: 'carross_eclairage_remorque', name: 'Éclairage remorque défectueux' },
      { id: 'carross_pneu_remorque', name: 'Pneu remorque endommagé ou usé' },
    ],
  },
  {
    category: 'AUTRE (non listé ci-dessus)',
    items: [
      { id: 'autre_defaut', name: 'Autre défaut constaté — préciser dans Notes' },
    ],
  },
];

export const INITIAL_CHECKLIST_ITEMS = [
  'Pneus & pression',
  'Freins',
  'Feux & clignotants',
  'Rétroviseurs',
  'Klaxon',
  'Niveaux de fluides (huile, liquide de refroidissement, frein)',
  'Batterie',
  'Système carburant',
  "Compresseur d'air",
  "Sellette d'attelage",
  'Verrous tournants',
  'Extincteur',
  'Trousse de premiers secours',
  'Triangles réfléchissants',
  'Documents à bord',
];

// ==========================================
// MODÈLE DE RAPPORT VIERGE
// Aucune valeur pré-remplie : ni nom, ni camion, ni trajet, ni signature.
// ==========================================
export const createDefaultReport = (): WeeklyReport => {
  const today = new Date().toISOString().split('T')[0];
  const defectsMap: Record<string, InspectionDefectItem> = {};

  INITIAL_DEFECT_CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
      defectsMap[item.id] = {
        id: item.id,
        category: cat.category,
        name: item.name,
        constate: false,
        gravite: 'Mineure',
        actionPrise: 'Réparé sur place',
        date: today,
        notes: '',
      };
    });
  });

  const checklistMap: Record<string, boolean> = {};
  INITIAL_CHECKLIST_ITEMS.forEach((item) => {
    checklistMap[item] = false;
  });

  return {
    id: `RPT-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'CONFORME',
    isSubmitted: false,
    driverInfo: {
      semaineDu: '',
      semaineAu: '',
      nomChauffeur: '',
      immatriculation: '',
      marqueModele: '',
      noRemorque: '',
    },
    trips: [],
    tripStats: {
      totalEnlevesPort: 0,
      totalLivresDestinataire: 0,
      conteneursVidesRetournes: 0,
    },
    aucunDefautConstate: false,
    defects: defectsMap,
    checklist: checklistMap,
    mechanicVerif: {
      nomMecanicien: '',
      date: '',
    },
    observations: {
      itineraireTrafic: '',
      clientsDestinataires: '',
      suggestionsOperations: '',
      besoinsFormation: '',
      commentairesGeneraux: '',
    },
    signatures: {
      chauffeur: { nom: '', signature: '', date: '' },
      superviseur: { nom: '', signature: '', date: '' },
      logistique: { nom: '', signature: '', date: '' },
    },
  };
};

// Conservé par compatibilité — retourne désormais un rapport vierge, comme
// createDefaultReport (il n'existe plus de "rapport de démonstration").
export const createDemoReport = (): WeeklyReport => {
  return createDefaultReport();
};

export const ensureReportDefaults = (raw: any): WeeklyReport => {
  const defaultRep = createDefaultReport();
  if (!raw || typeof raw !== 'object') return defaultRep;

  return {
    ...defaultRep,
    ...raw,
    driverInfo: {
      ...defaultRep.driverInfo,
      ...(raw.driverInfo || {}),
    },
    trips: Array.isArray(raw.trips) && raw.trips.length > 0 ? raw.trips : defaultRep.trips,
    tripStats: {
      ...defaultRep.tripStats,
      ...(raw.tripStats || {}),
    },
    defects: {
      ...defaultRep.defects,
      ...(raw.defects || {}),
    },
    checklist: {
      ...defaultRep.checklist,
      ...(raw.checklist || {}),
    },
    mechanicVerif: {
      ...defaultRep.mechanicVerif,
      ...(raw.mechanicVerif || {}),
    },
    observations: {
      ...defaultRep.observations,
      ...(raw.observations || {}),
    },
    signatures: {
      chauffeur: {
        ...defaultRep.signatures.chauffeur,
        ...(raw.signatures?.chauffeur || {}),
      },
      superviseur: {
        ...defaultRep.signatures.superviseur,
        ...(raw.signatures?.superviseur || {}),
      },
      logistique: {
        ...defaultRep.signatures.logistique,
        ...(raw.signatures?.logistique || {}),
      },
    },
  };
};
