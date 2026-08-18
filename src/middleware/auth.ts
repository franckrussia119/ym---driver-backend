import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../lib/auth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expirée ou invalide' });
  }
}

// Autorise uniquement les rôles listés. Toujours utilisé APRÈS requireAuth.
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentification requise' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé pour ce rôle' });
    }
    next();
  };
}

// Le Superviseur Conteneurs a un périmètre volontairement très étroit
// (uniquement le module conteneurs). Plutôt que de compter sur chaque
// routeur pour l'exclure individuellement des données hors périmètre
// (source d'oublis, comme cela a été le cas pour /vehicles et /invoices
// qui n'avaient historiquement aucune restriction de rôle en lecture),
// ce garde-fou global bloque ce rôle sur toute route non listée ici,
// quel que soit ce qui est ajouté au routeur à l'avenir.
const CONTAINER_SUPERVISOR_ALLOWED_PREFIXES = [
  '/api/auth',
  '/api/containers',
  '/api/subcontractors',
  '/api/pod',
  '/api/uploads',
  '/health',
];

export function restrictContainerSupervisorScope(req: Request, res: Response, next: NextFunction) {
  // Ce garde-fou doit fonctionner même avant que le requireAuth propre à
  // chaque routeur n'ait eu la chance de s'exécuter — on décode donc le
  // jeton nous-mêmes plutôt que de dépendre de req.user.
  let role: string | undefined = req.user?.role;
  if (!role) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        role = verifyAccessToken(header.slice('Bearer '.length)).role;
      } catch {
        return next(); // jeton invalide : laissé au requireAuth normal du routeur
      }
    }
  }

  if (role !== 'SUPERVISEUR_CONTENEURS') return next();
  const allowed = CONTAINER_SUPERVISOR_ALLOWED_PREFIXES.some((p) => req.path.startsWith(p));
  if (!allowed) {
    return res.status(403).json({ error: 'Accès refusé : ce compte est limité au module conteneurs.' });
  }
  next();
}
