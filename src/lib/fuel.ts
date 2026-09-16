import { api } from './api';
import { FuelAnalysisEntry, DriverPerformanceScore } from '../types';

export async function listFuelEntries(): Promise<FuelAnalysisEntry[]> {
  return api.get<FuelAnalysisEntry[]>('/api/fuel');
}

export interface CreateFuelEntryInput {
  tripId?: string;
  date: string;
  truckImmatriculation: string;
  chauffeurNom: string;
  trajetLabel: string;
  kmParcourus: number;
  carburantConsommeL: number;
}

export async function createFuelEntry(input: CreateFuelEntryInput): Promise<FuelAnalysisEntry> {
  return api.post<FuelAnalysisEntry>('/api/fuel', input);
}

export async function listDriverScores(): Promise<DriverPerformanceScore[]> {
  return api.get<DriverPerformanceScore[]>('/api/performance');
}

export async function recomputeDriverScores(periode: string): Promise<DriverPerformanceScore[]> {
  return api.post<DriverPerformanceScore[]>('/api/performance/recompute', { periode });
}
