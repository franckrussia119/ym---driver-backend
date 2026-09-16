import { api, setTokens, clearTokens, getAccessToken } from './api';
import { UserProfile } from '../types';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: UserProfile['role'] };
}

export async function login(email: string, password: string): Promise<UserProfile> {
  const data = await api.post<LoginResponse>(
    '/api/auth/login',
    { email, password },
    { skipAuth: true }
  );
  setTokens(data.accessToken, data.refreshToken);
  return {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    role: data.user.role,
    isActive: true,
  };
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('ym_transit_refresh_token');
  clearTokens();
  if (refreshToken) {
    try {
      await api.post('/api/auth/logout', { refreshToken });
    } catch {
      /* la déconnexion locale a déjà eu lieu, peu importe si l'appel échoue */
    }
  }
}

// Restaure la session au chargement de l'app à partir du jeton stocké.
// Retourne null si aucun jeton, ou si le jeton est invalide/expiré.
export async function restoreSession(): Promise<UserProfile | null> {
  if (!getAccessToken()) return null;
  try {
    const me = await api.get<{
      id: string;
      name: string;
      email: string;
      role: UserProfile['role'];
      isActive: boolean;
      camionAssigne?: string;
    }>('/api/auth/me');
    return {
      id: me.id,
      name: me.name,
      email: me.email,
      role: me.role,
      isActive: me.isActive,
      camionAssigne: me.camionAssigne,
    };
  } catch {
    clearTokens();
    return null;
  }
}
