import { api } from './api';

export interface SubcontractorCompany {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  contactNom: string | null;
  notes: string | null;
  createdById: string;
  createdAt: string;
  driversCount: number;
}

export interface SubcontractorDriver {
  id: string;
  companyId: string;
  companyNom?: string;
  nom: string;
  telephone: string | null;
  numeroPermis: string | null;
  adresse: string | null;
  immatriculationCamion: string | null;
  notes: string | null;
  createdById: string;
  createdAt: string;
}

export async function listSubcontractorCompanies(): Promise<SubcontractorCompany[]> {
  return api.get<SubcontractorCompany[]>('/api/subcontractors/companies');
}

export interface CreateCompanyInput {
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  contactNom?: string;
  notes?: string;
}

export async function createSubcontractorCompany(input: CreateCompanyInput): Promise<SubcontractorCompany> {
  return api.post<SubcontractorCompany>('/api/subcontractors/companies', input);
}

export async function updateSubcontractorCompany(id: string, input: Partial<CreateCompanyInput>): Promise<SubcontractorCompany> {
  return api.patch<SubcontractorCompany>(`/api/subcontractors/companies/${id}`, input);
}

export async function listSubcontractorDrivers(): Promise<SubcontractorDriver[]> {
  return api.get<SubcontractorDriver[]>('/api/subcontractors/drivers');
}

export interface CreateSubcontractorDriverInput {
  companyId: string;
  nom: string;
  telephone?: string;
  numeroPermis?: string;
  adresse?: string;
  immatriculationCamion?: string;
  notes?: string;
}

export async function createSubcontractorDriver(input: CreateSubcontractorDriverInput): Promise<SubcontractorDriver> {
  return api.post<SubcontractorDriver>('/api/subcontractors/drivers', input);
}

export async function updateSubcontractorDriver(id: string, input: Partial<CreateSubcontractorDriverInput>): Promise<SubcontractorDriver> {
  return api.patch<SubcontractorDriver>(`/api/subcontractors/drivers/${id}`, input);
}

export interface SubcontractorStats {
  totalContainers: number;
  ouverts: number;
  fermes: number;
  totalLivraisons: number;
  totalMontantRecuFCFA: number;
}

export interface CompanyAnalysis {
  company: SubcontractorCompany;
  drivers: SubcontractorDriver[];
  containers: Array<{ id: string; numeroReference: string; containerNumber: string; blNumber: string; port: string; terminal: string; size: string; status: string; subcontractorNom: string }>;
  pod: Array<{ id: string; numeroReference: string; recipientName: string; dateTime: string; status: string; montantRecuFCFA: number; subcontractorDriverNom: string }>;
  stats: SubcontractorStats;
}

export async function getCompanyAnalysis(companyId: string): Promise<CompanyAnalysis> {
  return api.get<CompanyAnalysis>(`/api/subcontractors/companies/${companyId}/analysis`);
}

export interface DriverAnalysis {
  driver: SubcontractorDriver & { companyNom: string | null };
  containers: Array<{ id: string; numeroReference: string; containerNumber: string; blNumber: string; port: string; terminal: string; size: string; status: string }>;
  pod: Array<{ id: string; numeroReference: string; recipientName: string; dateTime: string; status: string; montantRecuFCFA: number }>;
  returns: Array<{ id: string; containerNumber: string; blNumber: string; dateRetourVide: string; depotRetour: string; fraisRetourFCFA: number }>;
  stats: SubcontractorStats;
}

export async function getSubcontractorDriverAnalysis(driverId: string): Promise<DriverAnalysis> {
  return api.get<DriverAnalysis>(`/api/subcontractors/drivers/${driverId}/analysis`);
}
