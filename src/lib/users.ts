import { api } from './api';
import { UserProfile, UserRole } from '../types';

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  camionAssigne?: string;
  telephone?: string;
  habiliteMatieresDangereuses?: boolean;
  createdAt?: string;
}

export async function listUsers(): Promise<BackendUser[]> {
  return api.get<BackendUser[]>('/api/users');
}

// Version allégée, accessible à davantage de rôles (pas seulement
// SUPER_ADMIN) — utilisée partout où il faut choisir un chauffeur dans un
// menu déroulant (assignation de conteneur, de camion...).
export interface DriverOption {
  id: string;
  name: string;
  camionAssigne: string | null;
  telephone: string | null;
}

export async function listDrivers(): Promise<DriverOption[]> {
  return api.get<DriverOption[]>('/api/users/drivers');
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  camionAssigne?: string;
  telephone?: string;
  habiliteMatieresDangereuses?: boolean;
}

export async function createUser(input: CreateUserInput): Promise<BackendUser> {
  return api.post<BackendUser>('/api/users', input);
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  camionAssigne?: string | null;
  telephone?: string | null;
  habiliteMatieresDangereuses?: boolean;
  isActive?: boolean;
  password?: string;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<BackendUser> {
  return api.patch<BackendUser>(`/api/users/${id}`, input);
}
