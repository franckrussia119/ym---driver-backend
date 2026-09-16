import { api } from './api';
import { MaintenancePlanItem, ScheduledMaintenance } from '../types';

export async function listMaintenancePlans(): Promise<MaintenancePlanItem[]> {
  return api.get<MaintenancePlanItem[]>('/api/maintenance/plans');
}

export interface CreatePlanInput {
  vehicleId: string;
  vehicleImmatriculation: string;
  typeIntervention: string;
  frequenceKm: number;
  dernierKmRealise: number;
  derniereDateRealisee: string;
}

export async function createMaintenancePlan(input: CreatePlanInput): Promise<MaintenancePlanItem> {
  return api.post<MaintenancePlanItem>('/api/maintenance/plans', input);
}

export async function listScheduledMaintenance(): Promise<ScheduledMaintenance[]> {
  return api.get<ScheduledMaintenance[]>('/api/maintenance/scheduled');
}

export interface CreateScheduledInput {
  planItemId?: string;
  vehicleId: string;
  vehicleImmatriculation: string;
  typeIntervention: string;
  dateProgrammee: string;
  mecanicienOuAtelier: string;
  coutEstimeFCFA: number;
  notes?: string;
}

export async function createScheduledMaintenance(input: CreateScheduledInput): Promise<ScheduledMaintenance> {
  return api.post<ScheduledMaintenance>('/api/maintenance/scheduled', input);
}

export async function updateScheduledMaintenanceStatus(
  id: string,
  status: 'PROGRAMMEE' | 'EN_COURS' | 'EFFECTUEE' | 'ANNULEE',
  linkedInvoiceId?: string
): Promise<ScheduledMaintenance> {
  return api.patch<ScheduledMaintenance>(`/api/maintenance/scheduled/${id}/status`, { status, linkedInvoiceId });
}
