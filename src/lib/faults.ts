import { api } from './api';
import { FaultDeclaration } from '../types';

export async function listFaults(): Promise<FaultDeclaration[]> {
  return api.get<FaultDeclaration[]>('/api/faults');
}

export async function getFault(id: string): Promise<FaultDeclaration> {
  return api.get<FaultDeclaration>(`/api/faults/${id}`);
}

export interface CreateFaultInput {
  immatriculation: string;
  niveauUrgence: 'Faible' | 'Moyenne' | 'Élevée / Immobilisation';
  categorie: string;
  description: string;
  localisation: string;
}

export async function createFault(input: CreateFaultInput): Promise<FaultDeclaration> {
  return api.post<FaultDeclaration>('/api/faults', input);
}

// Fait avancer la panne à l'étape suivante du workflow (le statut cible est
// déterminé par le serveur en fonction du statut actuel — jamais fourni par
// le client).
export async function advanceFault(id: string, comment?: string): Promise<FaultDeclaration> {
  return api.post<FaultDeclaration>(`/api/faults/${id}/advance`, comment ? { comment } : {});
}

export async function linkFaultInvoice(id: string, invoiceId: string): Promise<FaultDeclaration> {
  return api.put<FaultDeclaration>(`/api/faults/${id}/invoice`, { invoiceId });
}
