import { api } from './api';

export interface PlanOrderInput {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demandType: 'LIVRAISON' | 'ENLEVEMENT' | 'DEPOT_VIDE';
  adresse: string;
  isHazmat?: boolean;
}

export interface CreatePlanInput {
  dateExecution: string;
  depot?: 'Douala Port' | 'Kribi Port';
  orders: PlanOrderInput[];
  vehicleIds: string[];
}

export interface RoutePlan {
  id: string;
  createdAt: string;
  createdById: string;
  dateExecution: string;
  statut: 'BROUILLON' | 'VALIDE' | 'EN_COURS' | 'TERMINE';
  totalDistanceKm: number;
  estimatedDurationHours: number;
  estimatedFuelL: number;
  assignments: Array<{
    id: string;
    vehicleId: string;
    driverId: string;
    driverName: string;
    immatriculation: string;
    orderIndex: number;
    waypoints: PlanOrderInput[];
    distanceKm: number;
    durationH: number;
  }>;
}

export async function listRoutePlans(): Promise<RoutePlan[]> {
  return api.get<RoutePlan[]>('/api/route-planning/plans');
}

export async function getRoutePlan(id: string): Promise<RoutePlan> {
  return api.get<RoutePlan>(`/api/route-planning/plans/${id}`);
}

export async function createRoutePlan(input: CreatePlanInput): Promise<RoutePlan> {
  return api.post<RoutePlan>('/api/route-planning/plans', input);
}

export async function updateRoutePlanStatus(
  id: string,
  statut: 'BROUILLON' | 'VALIDE' | 'EN_COURS' | 'TERMINE'
): Promise<RoutePlan> {
  return api.patch<RoutePlan>(`/api/route-planning/plans/${id}/statut`, { statut });
}

export async function getMyAssignments() {
  return api.get('/api/route-planning/my-assignments');
}
