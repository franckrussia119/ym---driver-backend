import { api } from './api';
import { PODRecord } from '../components/ProofOfDeliveryView';

export async function listPOD(): Promise<PODRecord[]> {
  return api.get<PODRecord[]>('/api/pod');
}

export interface CreatePODInput {
  blNumber: string;
  containerNumber: string;
  containerId?: string;
  clientName: string;
  deliveryAddress: string;
  driverName: string;
  truckImmatriculation: string;
  dateTime: string;
  gpsLocation?: string;
  recipientName: string;
  status: PODRecord['status'];
  bordereauPhotoUrl?: string;
  photoUrl?: string;
  observations?: string;
  departurePort: 'PAK' | 'PAD' | 'Autres';
  departurePortAutre?: string;
  montantRecuFCFA: number;
  distanceKm: number;
  subcontractorDriverId?: string;
  subcontractorDriverName?: string;
}

export async function createPOD(record: CreatePODInput): Promise<PODRecord> {
  return api.post<PODRecord>('/api/pod', record);
}
