import { api } from './api';
import { ContainerCaution } from '../types';

export async function listCautions(): Promise<ContainerCaution[]> {
  return api.get<ContainerCaution[]>('/api/cautions');
}

export interface CautionsSummary {
  montantEngage: number;
  montantARisque: number;
  montantPerdu: number;
  montantPenalites: number;
}

export async function getCautionsSummary(): Promise<CautionsSummary> {
  return api.get<CautionsSummary>('/api/cautions/summary');
}

export interface CreateCautionInput {
  noConteneurBL: string;
  ligneMaritime: string;
  clientNom: string;
  truckImmatriculation: string;
  chauffeurNom: string;
  montantCautionFCFA: number;
  fraisJournalierRetardFCFA: number;
  depotDestination: string;
  dateDepot: string;
  dateLimiteRetour: string;
  notes?: string;
}

export async function createCaution(input: CreateCautionInput): Promise<ContainerCaution> {
  return api.post<ContainerCaution>('/api/cautions', input);
}

export async function updateCaution(id: string, input: Partial<CreateCautionInput> & { status?: string; montantPenaliteFCFA?: number }): Promise<ContainerCaution> {
  return api.patch<ContainerCaution>(`/api/cautions/${id}`, input);
}

export async function returnCaution(id: string, dateRetourEffectif: string): Promise<ContainerCaution> {
  return api.post<ContainerCaution>(`/api/cautions/${id}/return`, { dateRetourEffectif });
}

export async function markCautionLost(id: string): Promise<ContainerCaution> {
  return api.post<ContainerCaution>(`/api/cautions/${id}/lost`);
}
