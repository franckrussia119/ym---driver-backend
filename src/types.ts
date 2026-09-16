export type ContainerType = '20' | '40' | 'Reefer' | 'Autre';

export type UserRole = 'CHAUFFEUR' | 'MECANICIEN' | 'SUPERVISEUR' | 'ADMIN' | 'SUPER_ADMIN' | 'SUPERVISEUR_CONTENEURS';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  isActive?: boolean;
  camionAssigne?: string;
  driverPhotoUrl?: string;
  truckPhotoUrl?: string;
}

export const formatFCFA = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0)) + ' FCFA';
};

export type DefectSeverity = 'Mineure' | 'Majeure' | 'Critique';
export type DefectAction = 'Réparé sur place' | 'Signalé au mécanicien' | 'Immobilisation';

export interface DriverInfo {
  semaineDu: string;
  semaineAu: string;
  nomChauffeur: string;
  immatriculation: string;
  marqueModele: string;
  noRemorque: string;
  driverPhotoUrl?: string;
  truckPhotoUrl?: string;
}

export interface TripLogEntry {
  id: string;
  date: string;
  client: string;
  noConteneurBL: string;
  typeConteneur: ContainerType;
  depart: string;
  destination: string;
  kmParcourus: number;
  carburantL: number;
  fraisRoute: number;
  source?: 'MANUEL' | 'POD' | 'RETOUR_CONTENEUR';
}

export interface TripStats {
  totalEnlevesPort: number;
  totalLivresDestinataire: number;
  conteneursVidesRetournes: number;
}

export interface InspectionDefectItem {
  id: string;
  category: string;
  name: string;
  constate: boolean;
  gravite?: DefectSeverity;
  actionPrise?: DefectAction;
  date?: string;
  notes?: string;
}

export interface MechanicVerification {
  nomMecanicien: string;
  date: string;
}

export interface AudioNote {
  id: string;
  dataUrl: string;
  durationSeconds: number;
  date: string;
  transcription?: string;
  fieldKey?: string;
}

export interface PhotoEvidence {
  id: string;
  dataUrl: string;
  caption?: string;
  date: string;
  fieldKey?: string;
}

export interface DriverObservations {
  itineraireTrafic: string;
  clientsDestinataires: string;
  suggestionsOperations: string;
  besoinsFormation: string;
  commentairesGeneraux: string;
  voiceNotes?: AudioNote[];
  photos?: PhotoEvidence[];
}

export interface SignatureEntry {
  nom: string;
  signature: string; // base64 data url or string
  date: string;
}

export interface ReportSignatures {
  chauffeur: SignatureEntry;
  superviseur: SignatureEntry;
  logistique: SignatureEntry;
}

export interface WeeklyReport {
  id: string;
  numeroReference?: string;
  createdAt: string;
  submittedAt?: string;
  isSubmitted?: boolean; // Locked for driver edit once submitted
  status: 'CONFORME' | 'AVEC_DEFAUTS';
  driverInfo: DriverInfo;
  trips: TripLogEntry[];
  tripStats: TripStats;
  aucunDefautConstate: boolean;
  defects: Record<string, InspectionDefectItem>;
  checklist: Record<string, boolean>;
  mechanicVerif: MechanicVerification;
  observations: DriverObservations;
  signatures: ReportSignatures;
}

export type FaultStatus =
  | 'Signalée par chauffeur'
  | 'Transmise au mécanicien'
  | 'En cours de réparation'
  | 'Réparée — en attente de clôture'
  | 'Clôturée par superviseur';

export interface FaultHistoryEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  status: FaultStatus;
  comment?: string;
}

export interface FaultDeclaration {
  id: string;
  numeroReference?: string;
  dateSignalement: string;
  chauffeurId: string;
  chauffeurNom: string;
  immatriculation: string;
  niveauUrgence: 'Faible' | 'Moyenne' | 'Élevée / Immobilisation';
  categorie: string;
  description: string;
  localisation: string;
  status: FaultStatus;
  history?: FaultHistoryEntry[];
  notesSuperviseur?: string;
  notesMecanicien?: string;
  invoiceId?: string;
}

export interface SparePartItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface MechanicInvoice {
  id: string;
  numeroReference?: string;
  faultId?: string;
  truckImmatriculation: string;
  chauffeurNom?: string;
  mecanicienNom: string;
  dateIntervention: string;
  descriptionTravaux: string;
  parts: SparePartItem[];
  mainOeuvreHeures: number;
  tauxHoraire: number;
  totalPieces: number;
  totalMainOeuvre: number;
  totalHT: number;
  tva: number; // e.g. 0 or 18
  totalTTC: number;
  partsPhotoUrls?: string[];
  status: 'Transmis Administration' | 'Payé' | 'Brouillon';
}

// ==========================================
// 1. REGISTRE DE FLOTTE & DOCUMENTS ADMINISTRATIFS
// ==========================================
export type VehicleStatus = 'En service' | 'En maintenance' | 'Hors service';

export interface AdminDocument {
  id: string;
  type: 'Assurance' | 'Carte Grise' | 'Visite Technique' | 'Patente / Transport' | 'Extincteur' | 'Autre';
  numeroDoc: string;
  dateEmission: string;
  dateExpiration: string;
  photoScanUrl?: string; // photo/scan base64
  status: 'VALIDE' | 'EXPIRE_BIENTOT' | 'EXPIRE';
}

export interface FleetVehicle {
  id: string;
  immatriculation: string;
  marqueModele: string;
  annee: number;
  capaciteTonnage: number;
  noRemorqueAssociee?: string;
  photoUrl?: string;
  chauffeurHabituelId?: string;
  chauffeurHabituelNom?: string;
  statut: VehicleStatus;
  kmCompteurInitial: number; // base km
  consommationReferenceL100: number; // e.g. 35 L/100km
  documents: AdminDocument[];
  notesInterne?: string;
}

// ==========================================
// 2. MAINTENANCE PRÉVENTIVE
// ==========================================
export type MaintenanceCategory =
  | 'Vidange Moteur'
  | 'Freinage & Plaquettes'
  | 'Rotation / Pneus'
  | 'Révision Générale'
  | 'Circuit Air / Turbo'
  | 'Autre';

export type MaintenanceAlertLevel = 'VERT' | 'ORANGE' | 'ROUGE';

export interface MaintenancePlanItem {
  id: string;
  numeroReference?: string;
  vehicleImmatriculation: string;
  typeIntervention: MaintenanceCategory;
  frequenceKm: number; // e.g. 15000 km
  dernierKmRealise: number;
  derniereDateRealisee: string;
  prochainKmEcheance: number;
  prochaineDateEcheance: string;
  alertLevel: MaintenanceAlertLevel;
}

export interface ScheduledMaintenance {
  id: string;
  numeroReference?: string;
  planItemId?: string;
  vehicleImmatriculation: string;
  typeIntervention: MaintenanceCategory;
  dateProgrammee: string;
  mecanicienOuAtelier: string;
  coutEstimeFCFA: number;
  status: 'PROGRAMMEE' | 'EN_COURS' | 'EFFECTUEE' | 'ANNULEE';
  notes?: string;
  linkedInvoiceId?: string;
}

// ==========================================
// 3. SUIVI DES CAUTIONS DE CONTENEURS
// ==========================================
export type ContainerCautionStatus =
  | 'En cours'
  | 'Retourné à temps'
  | 'En retard - Pénalité'
  | 'Caution perdue';

export type CautionStatus = ContainerCautionStatus;

export interface ContainerCaution {
  id: string;
  numeroReference?: string;
  noConteneurBL: string;
  ligneMaritime: string; // MSC, Maersk, CMA CGM, Grimaldi, COSCO...
  clientNom: string;
  truckImmatriculation: string;
  chauffeurNom: string;
  montantCautionFCFA: number; // e.g. 350 000 FCFA
  fraisJournalierRetardFCFA: number; // e.g. 15 000 FCFA/day
  depotDestination: string; // e.g. Dépôt 3B Douala, Port Kribi...
  dateDepot: string;
  dateLimiteRetour: string;
  dateRetourEffectif?: string;
  status: ContainerCautionStatus;
  montantRecupereFCFA?: number;
  montantPenaliteFCFA?: number;
  notes?: string;
}

// ==========================================
// 4. PLANIFICATION DE ROUTE & ANALYSE CARBURANT
// ==========================================
export interface RouteWaypointPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demandType: 'LIVRAISON' | 'ENLEVEMENT' | 'DEPOT_VIDE';
  adresse: string;
}

export interface OptimizedRouteResult {
  orderedWaypoints: RouteWaypointPoint[];
  totalDistanceKm: number;
  estimatedDurationHours: number;
  estimatedFuelL: number;
}

export interface FuelAnalysisEntry {
  tripId: string;
  date: string;
  truckImmatriculation: string;
  chauffeurNom: string;
  trajetLabel: string;
  kmParcourus: number;
  carburantConsommeL: number;
  consommationReelleL100: number;
  consommationRefL100: number;
  ecartL100: number;
  anomalieDetectee: boolean;
  typeAnomalie?: 'Surconsommation mécanique' | 'Ligne trafic chargée' | 'Suspicion fuite/vol';
}

export interface DriverPerformanceScore {
  chauffeurId: string;
  chauffeurNom: string;
  periode: string;
  totalKm: number;
  nombreTrajets: number;
  ponctualitePct: number;
  moyenneConsoL100: number;
  pannesSignaleesCount: number;
  cautionsEnRetardCount: number;
  noteClientMoyenne: number; // 1-5
  scoreGlobalPct: number;
  rang: number;
}

