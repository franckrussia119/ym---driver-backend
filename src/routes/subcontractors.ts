import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const subcontractorsRouter = Router();
subcontractorsRouter.use(requireAuth);

const CONTAINER_ROLES = ['SUPERVISEUR_CONTENEURS', 'ADMIN', 'SUPER_ADMIN'] as const;

// ------------------------------------------------------------------
// SOCIÉTÉS SOUS-TRAITANTES
// ------------------------------------------------------------------
subcontractorsRouter.get('/companies', requireRole(...CONTAINER_ROLES), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT sc.*, COUNT(sd.id)::int AS "driversCount"
     FROM subcontractor_companies sc
     LEFT JOIN subcontractor_drivers sd ON sd."companyId" = sc.id
     GROUP BY sc.id
     ORDER BY sc.nom ASC`
  );
  res.json(rows);
});

const companySchema = z.object({
  nom: z.string().min(1),
  telephone: z.string().optional(),
  email: z.string().optional(),
  adresse: z.string().optional(),
  contactNom: z.string().optional(),
  notes: z.string().optional(),
});

subcontractorsRouter.post('/companies', requireRole(...CONTAINER_ROLES), async (req, res) => {
  const parsed = companySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO subcontractor_companies (id, nom, telephone, email, adresse, "contactNom", notes, "createdById")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [d.nom, d.telephone ?? null, d.email ?? null, d.adresse ?? null, d.contactNom ?? null, d.notes ?? null, req.user!.sub]
  );
  res.status(201).json(rows[0]);
});

subcontractorsRouter.patch('/companies/:id', requireRole(...CONTAINER_ROLES), async (req, res) => {
  const parsed = companySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const colMap: Record<string, string> = {
    nom: 'nom', telephone: 'telephone', email: 'email', adresse: 'adresse',
    contactNom: '"contactNom"', notes: 'notes',
  };
  for (const [key, col] of Object.entries(colMap)) {
    if ((d as any)[key] !== undefined) { sets.push(`${col} = $${i++}`); values.push((d as any)[key]); }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Aucune modification fournie' });
  values.push(req.params.id);

  const { rows } = await pool.query(`UPDATE subcontractor_companies SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values);
  if (!rows[0]) return res.status(404).json({ error: 'Société introuvable' });
  res.json(rows[0]);
});

// ------------------------------------------------------------------
// CHAUFFEURS SOUS-TRAITANTS (rattachés à une société)
// ------------------------------------------------------------------
subcontractorsRouter.get('/drivers', requireRole(...CONTAINER_ROLES), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT sd.*, sc.nom AS "companyNom"
     FROM subcontractor_drivers sd
     LEFT JOIN subcontractor_companies sc ON sc.id = sd."companyId"
     ORDER BY sd.nom ASC`
  );
  res.json(rows);
});

const driverSchema = z.object({
  companyId: z.string().min(1),
  nom: z.string().min(1),
  telephone: z.string().optional(),
  numeroPermis: z.string().optional(),
  adresse: z.string().optional(),
  immatriculationCamion: z.string().optional(),
  notes: z.string().optional(),
});

subcontractorsRouter.post('/drivers', requireRole(...CONTAINER_ROLES), async (req, res) => {
  const parsed = driverSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const companyCheck = await pool.query(`SELECT id FROM subcontractor_companies WHERE id = $1`, [d.companyId]);
  if (!companyCheck.rows[0]) return res.status(400).json({ error: 'Société introuvable' });

  const { rows } = await pool.query(
    `INSERT INTO subcontractor_drivers (id, "companyId", nom, telephone, "numeroPermis", adresse, "immatriculationCamion", notes, "createdById")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [d.companyId, d.nom, d.telephone ?? null, d.numeroPermis ?? null, d.adresse ?? null, d.immatriculationCamion ?? null, d.notes ?? null, req.user!.sub]
  );
  res.status(201).json(rows[0]);
});

subcontractorsRouter.patch('/drivers/:id', requireRole(...CONTAINER_ROLES), async (req, res) => {
  const parsed = driverSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const colMap: Record<string, string> = {
    companyId: '"companyId"', nom: 'nom', telephone: 'telephone', numeroPermis: '"numeroPermis"',
    adresse: 'adresse', immatriculationCamion: '"immatriculationCamion"', notes: 'notes',
  };
  for (const [key, col] of Object.entries(colMap)) {
    if ((d as any)[key] !== undefined) { sets.push(`${col} = $${i++}`); values.push((d as any)[key]); }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Aucune modification fournie' });
  values.push(req.params.id);

  const { rows } = await pool.query(`UPDATE subcontractor_drivers SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values);
  if (!rows[0]) return res.status(404).json({ error: 'Chauffeur introuvable' });
  res.json(rows[0]);
});
