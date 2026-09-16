import { api } from './api';
import { MechanicInvoice } from '../types';

export interface CreateInvoiceInput {
  faultId?: string;
  truckImmatriculation: string;
  chauffeurNom?: string;
  dateIntervention: string;
  descriptionTravaux: string;
  parts: { name: string; qty: number; unitPrice: number }[];
  mainOeuvreHeures: number;
  tauxHoraire: number;
  tva?: number;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<MechanicInvoice> {
  return api.post<MechanicInvoice>('/api/invoices', input);
}

export async function listInvoices(): Promise<MechanicInvoice[]> {
  return api.get<MechanicInvoice[]>('/api/invoices');
}
