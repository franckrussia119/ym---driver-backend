import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { hashPassword } from '../lib/auth.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const usersRouter = Router();

const ROLES = ['CHAUFFEUR', 'MECANICIEN', 'SUPERVISEUR', 'ADMIN', 'SUPER_ADMIN'] as const;

usersRouter.use(requireAuth, requireRole('SUPER_ADMIN'));

usersRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, "isActive", "camionAssigne", "driverPhotoUrl",
            "truckPhotoUrl", "habiliteMatieresDangereuses", "createdAt"
     FROM users ORDER BY "createdAt" ASC`
  );
  res.json(rows);
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  role: z.enum(ROLES),
  camionAssigne: z.string().optional(),
  habiliteMatieresDangereuses: z.boolean().optional(),
});

usersRouter.post('/', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  }
  const { name, email, password, role, camionAssigne, habiliteMatieresDangereuses } = parsed.data;

  const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]);
  if (existing.rows[0]) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }

  const passwordHash = await hashPassword(password);
  const { rows } = await pool.query(
    `INSERT INTO users (id, name, email, "passwordHash", role, "camionAssigne", "habiliteMatieresDangereuses")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6)
     RETURNING id, name, email, role, "isActive", "camionAssigne", "habiliteMatieresDangereuses", "createdAt"`,
    [name, email.toLowerCase(), passwordHash, role, camionAssigne ?? null, habiliteMatieresDangereuses ?? false]
  );
  res.status(201).json(rows[0]);
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(ROLES).optional(),
  camionAssigne: z.string().nullable().optional(),
  habiliteMatieresDangereuses: z.boolean().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(), // Super Admin peut réinitialiser un mot de passe
});

usersRouter.patch('/:id', async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  }
  const fields = parsed.data;
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (fields.name !== undefined) { sets.push(`name = $${i++}`); values.push(fields.name); }
  if (fields.role !== undefined) { sets.push(`role = $${i++}`); values.push(fields.role); }
  if (fields.camionAssigne !== undefined) { sets.push(`"camionAssigne" = $${i++}`); values.push(fields.camionAssigne); }
  if (fields.habiliteMatieresDangereuses !== undefined) { sets.push(`"habiliteMatieresDangereuses" = $${i++}`); values.push(fields.habiliteMatieresDangereuses); }
  if (fields.isActive !== undefined) { sets.push(`"isActive" = $${i++}`); values.push(fields.isActive); }
  if (fields.password !== undefined) {
    sets.push(`"passwordHash" = $${i++}`);
    values.push(await hashPassword(fields.password));
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Aucune modification fournie' });

  sets.push(`"updatedAt" = now()`);
  values.push(req.params.id);

  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${i}
     RETURNING id, name, email, role, "isActive", "camionAssigne", "habiliteMatieresDangereuses"`,
    values
  );
  if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(rows[0]);
});
