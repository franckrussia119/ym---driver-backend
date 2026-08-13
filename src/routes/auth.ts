import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import {
  verifyPassword,
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email ou mot de passe manquant' });
  }
  const { email, password } = parsed.data;

  const { rows } = await pool.query(
    `SELECT id, name, email, "passwordHash", role, "isActive" FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  const user = rows[0];

  // Message volontairement identique pour email inconnu / mot de passe
  // incorrect, afin de ne pas révéler si un compte existe.
  if (!user) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  if (!user.isActive) {
    return res.status(403).json({ error: 'Ce compte a été désactivé' });
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role, name: user.name });
  const { token: refreshToken, hash, expiresAt } = generateRefreshToken();
  await pool.query(
    `INSERT INTO refresh_tokens (id, "tokenHash", "userId", "expiresAt") VALUES (gen_random_uuid()::text, $1, $2, $3)`,
    [hash, user.id, expiresAt]
  );

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

authRouter.post('/refresh', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Jeton manquant' });

  const hash = hashRefreshToken(parsed.data.refreshToken);
  const { rows } = await pool.query(
    `SELECT rt.id, rt."userId", rt."expiresAt", u.name, u.role, u."isActive"
     FROM refresh_tokens rt JOIN users u ON u.id = rt."userId"
     WHERE rt."tokenHash" = $1`,
    [hash]
  );
  const record = rows[0];
  if (!record || !record.isActive || new Date(record.expiresAt) < new Date()) {
    return res.status(401).json({ error: 'Session expirée, reconnectez-vous' });
  }

  const accessToken = signAccessToken({ sub: record.userId, role: record.role, name: record.name });
  res.json({ accessToken });
});

authRouter.post('/logout', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (parsed.success) {
    const hash = hashRefreshToken(parsed.data.refreshToken);
    await pool.query(`DELETE FROM refresh_tokens WHERE "tokenHash" = $1`, [hash]);
  }
  res.status(204).send();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, "isActive", "camionAssigne", "driverPhotoUrl", "truckPhotoUrl"
     FROM users WHERE id = $1`,
    [req.user!.sub]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(rows[0]);
});
