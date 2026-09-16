import { api } from './api';

export interface DriverListItem {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  camionAssigne?: string;
  totalRapports: number;
  totalPannes: number;
}

export interface DriverHistoryResponse {
  driver: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    camionAssigne?: string;
    createdAt: string;
  };
  periode: { from: string | null; to: string | null };
  summary: {
    totalRapports: number;
    rapportsSoumis: number;
    totalPannes: number;
    pannesEnCours: number;
    totalDefautsConstates: number;
    totalLivraisons: number;
    totalTrajets: number;
    totalKm: number;
    totalFraisRouteFCFA: number;
    totalCarburantL: number;
    cautionsEnRetard: number;
    anomaliesCarburant: number;
    totalMontantRecuFCFA: number;
    totalDistancePodKm: number;
    dernierScoreGlobalPct: number | null;
    dernierRang: number | null;
  };
  reports: Array<{
    id: string;
    numeroReference?: string;
    createdAt: string;
    submittedAt: string | null;
    isSubmitted: boolean;
    status: string;
    semaineDu: string;
    semaineAu: string;
    immatriculation: string;
  }>;
  faults: Array<{
    id: string;
    numeroReference?: string;
    dateSignalement: string;
    status: string;
    categorie: string;
    niveauUrgence: string;
    description: string;
    createdAt: string;
  }>;
  pod: Array<{
    id: string;
    numeroReference?: string;
    blNumber: string;
    containerNumber: string;
    clientName: string;
    status: string;
    dateTime: string;
    createdAt: string;
    departurePort?: 'PAK' | 'PAD' | 'Autres';
    departurePortAutre?: string;
    montantRecuFCFA?: number;
    distanceKm?: number;
  }>;
  invoices: Array<{ id: string; numeroReference?: string; dateIntervention: string; totalTTC: number; status: string; createdAt: string }>;
  cautions: Array<{ id: string; numeroReference?: string; noConteneurBL: string; status: string; montantCautionFCFA: number; montantPenaliteFCFA: number | null; dateLimiteRetour: string }>;
  fuelEntries: Array<{ id: string; date: string; consommationReelleL100: number; consommationRefL100: number; anomalieDetectee: boolean; typeAnomalie: string | null }>;
  scoreHistory: Array<{ periode: string; scoreGlobalPct: number; ponctualitePct: number; moyenneConsoL100: number; rang: number }>;
}

export async function listDrivers(): Promise<DriverListItem[]> {
  return api.get<DriverListItem[]>('/api/driver-history');
}

export async function getDriverHistory(
  driverId: string,
  range?: { from?: string; to?: string }
): Promise<DriverHistoryResponse> {
  const params = new URLSearchParams();
  if (range?.from) params.set('from', range.from);
  if (range?.to) params.set('to', range.to);
  const qs = params.toString();
  return api.get<DriverHistoryResponse>(`/api/driver-history/${driverId}${qs ? `?${qs}` : ''}`);
}
