import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const subcontractorsRouter = Router();
subcontractorsRouter.use(requireAuth);

const CONTAINER_ROLES = ['SUPERVISEUR_CONTENEURS', 'ADMIN', 'SUPER_ADMIN'] as const;

subcontractorsRouter.get('/', requireRole(...CONTAINER_ROLES), async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM subcontractor_drivers ORDER BY nom ASC`);
  res.json(rows);
});

const createSchema = z.object({
  nom: z.string().min(1),
  telephone: z.string().optional(),
  nomEntreprise: z.string().optional(),
  immatriculationCamion: z.string().optional(),
  notes: z.string().optional(),
});

subcontractorsRouter.post('/', requireRole(...CONTAINER_ROLES), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO subcontractor_drivers (id, nom, telephone, "nomEntreprise", "immatriculationCamion", notes, "createdById")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [d.nom, d.telephone ?? null, d.nomEntreprise ?? null, d.immatriculationCamion ?? null, d.notes ?? null, req.user!.sub]
  );
  res.status(201).json(rows[0]);
});

subcontractorsRouter.patch('/:id', requireRole(...CONTAINER_ROLES), async (req, res) => {
  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const colMap: Record<string, string> = {
    nom: 'nom', telephone: 'telephone', nomEntreprise: '"nomEntreprise"',
    immatriculationCamion: '"immatriculationCamion"', notes: 'notes',
  };
  for (const [key, col] of Object.entries(colMap)) {
    if ((d as any)[key] !== undefined) { sets.push(`${col} = $${i++}`); values.push((d as any)[key]); }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Aucune modification fournie' });
  values.push(req.params.id);

  const { rows } = await pool.query(`UPDATE subcontractor_drivers SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values);
  if (!rows[0]) return res.status(404).json({ error: 'Sous-traitant introuvable' });
  res.json(rows[0]);
});
