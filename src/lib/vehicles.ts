import { api } from './api';
import { FleetVehicle } from '../types';

export async function listVehicles(): Promise<FleetVehicle[]> {
  return api.get<FleetVehicle[]>('/api/vehicles');
}

export interface CreateVehicleInput {
  immatriculation: string;
  marqueModele: string;
  annee: number;
  capaciteTonnage: number;
  noRemorqueAssociee?: string;
  photoUrl?: string;
  chauffeurHabituelId?: string;
  chauffeurHabituelNom?: string;
  statut: 'En service' | 'En maintenance' | 'Hors service';
  kmCompteurInitial?: number;
  consommationReferenceL100: number;
  notesInterne?: string;
  habiliteMatieresDangereuses?: boolean;
}

export async function createVehicle(input: CreateVehicleInput): Promise<FleetVehicle> {
  return api.post<FleetVehicle>('/api/vehicles', input);
}

export async function updateVehicle(id: string, input: Partial<CreateVehicleInput>): Promise<FleetVehicle> {
  return api.patch<FleetVehicle>(`/api/vehicles/${id}`, input);
}

export interface CreateDocumentInput {
  type: 'Assurance' | 'Carte Grise' | 'Visite Technique' | 'Patente / Transport' | 'Extincteur' | 'Autre';
  numeroDoc: string;
  dateEmission: string;
  dateExpiration: string;
  photoScanUrl?: string;
}

export async function addVehicleDocument(vehicleId: string, input: CreateDocumentInput) {
  return api.post(`/api/vehicles/${vehicleId}/documents`, input);
}

export async function getVehicleHistory(vehicleId: string) {
  return api.get(`/api/vehicles/${vehicleId}/history`);
}
