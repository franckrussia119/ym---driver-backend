// Client API centralisé — toutes les communications avec le backend
// YM-TRANSIT passent par ce module. Gère les jetons JWT (access + refresh),
// le rafraîchissement automatique en cas d'expiration, et des erreurs
// lisibles pour l'interface.

const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

const ACCESS_TOKEN_KEY = 'ym_transit_access_token';
const REFRESH_TOKEN_KEY = 'ym_transit_refresh_token';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

let refreshInFlight: Promise<string | null> | null = null;

// Tente de rafraîchir le jeton d'accès avec le refresh token stocké.
// Retourne le nouveau access token, ou null si le refresh échoue (session
// définitivement expirée — l'appelant doit alors déconnecter l'utilisateur).
async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      return data.accessToken as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Ne pas joindre le jeton d'authentification (ex: login) */
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuth = false } = options;

  const doFetch = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let token = skipAuth ? null : getAccessToken();
  let res: Response;
  try {
    res = await doFetch(token);
  } catch {
    throw new ApiError(
      "Impossible de joindre le serveur. Vérifiez votre connexion internet.",
      0
    );
  }

  // Jeton expiré : on tente un rafraîchissement silencieux, une seule fois.
  if (res.status === 401 && !skipAuth && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
    } else {
      clearTokens();
      throw new ApiError('Session expirée. Veuillez vous reconnecter.', 401);
    }
  }

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* réponse non-JSON, on garde le message générique */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Partial<RequestOptions>) =>
    request<T>(path, { method: 'POST', body, ...opts }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Upload réel d'un fichier (photo, document) vers /api/uploads — retourne
// une URL courte à stocker, au lieu d'intégrer le fichier en base64 dans le
// JSON (ce qui dépasse vite la limite de taille de requête sur de vraies
// photos de téléphone).
export async function uploadFile(file: Blob, filename: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename);

  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/uploads`, {
    method: 'POST',
    headers, // ne pas fixer Content-Type : le navigateur ajoute la bonne boundary multipart
    body: formData,
  });

  if (!res.ok) {
    let message = "Échec de l'envoi du fichier.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* réponse non-JSON */
    }
    throw new ApiError(message, res.status);
  }

  const data = await res.json();
  const relativeUrl = data.url as string;
  return relativeUrl.startsWith('http') ? relativeUrl : `${API_BASE_URL}${relativeUrl}`;
}

export { API_BASE_URL };
