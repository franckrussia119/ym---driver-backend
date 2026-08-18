import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { withReferenceNumberRetry } from '../lib/referenceNumber.js';

export const maintenanceRouter = Router();
maintenanceRouter.use(requireAuth);

const MAINTENANCE_CATEGORIES = [
  'Vidange Moteur', 'Freinage & Plaquettes', 'Rotation / Pneus',
  'Révision Générale', 'Circuit Air / Turbo', 'Autre',
] as const;

maintenanceRouter.get('/plans', async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM maintenance_plan_items ORDER BY "alertLevel" DESC`);
  res.json(rows);
});

const planSchema = z.object({
  vehicleId: z.string(),
  vehicleImmatriculation: z.string(),
  typeIntervention: z.enum(MAINTENANCE_CATEGORIES),
  frequenceKm: z.number().int().positive(),
  dernierKmRealise: z.number().int().nonnegative(),
  derniereDateRealisee: z.string(),
});

function computeAlertLevel(prochainKmEcheance: number, currentKm: number): string {
  const remaining = prochainKmEcheance - currentKm;
  if (remaining <= 0) return 'ROUGE';
  if (remaining <= 1000) return 'ORANGE';
  return 'VERT';
}

maintenanceRouter.post('/plans', requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR'), async (req, res) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const d = parsed.data;
  const prochainKmEcheance = d.dernierKmRealise + d.frequenceKm;

  // Date d'échéance approximative : +90 jours par défaut, ajustée manuellement ensuite si besoin.
  const prochaineDateEcheance = new Date(Date.parse(d.derniereDateRealisee) + 90 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const rows = await withReferenceNumberRetry('PLAN', async (numeroReference) => {
    const result = await pool.query(
      `INSERT INTO maintenance_plan_items
        (id, "numeroReference", "vehicleId", "vehicleImmatriculation", "typeIntervention", "frequenceKm", "dernierKmRealise",
         "derniereDateRealisee", "prochainKmEcheance", "prochaineDateEcheance", "alertLevel")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        numeroReference, d.vehicleId, d.vehicleImmatriculation, d.typeIntervention, d.frequenceKm, d.dernierKmRealise,
        d.derniereDateRealisee, prochainKmEcheance, prochaineDateEcheance,
        computeAlertLevel(prochainKmEcheance, d.dernierKmRealise),
      ]
    );
    return result.rows;
  });
  res.status(201).json(rows[0]);
});

maintenanceRouter.get('/scheduled', async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM scheduled_maintenance ORDER BY "dateProgrammee" ASC`);
  res.json(rows);
});

const scheduledSchema = z.object({
  planItemId: z.string().optional(),
  vehicleId: z.string(),
  vehicleImmatriculation: z.string(),
  typeIntervention: z.enum(MAINTENANCE_CATEGORIES),
  dateProgrammee: z.string(),
  mecanicienOuAtelier: z.string(),
  coutEstimeFCFA: z.number().nonnegative(),
  notes: z.string().optional(),
});

maintenanceRouter.post('/scheduled', requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR'), async (req, res) => {
  const parsed = scheduledSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const d = parsed.data;

  const rows = await withReferenceNumberRetry('MAINT', async (numeroReference) => {
    const result = await pool.query(
      `INSERT INTO scheduled_maintenance
        (id, "numeroReference", "planItemId", "vehicleId", "vehicleImmatriculation", "typeIntervention", "dateProgrammee",
         "mecanicienOuAtelier", "coutEstimeFCFA", status, notes)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, 'PROGRAMMEE', $9) RETURNING *`,
      [numeroReference, d.planItemId ?? null, d.vehicleId, d.vehicleImmatriculation, d.typeIntervention, d.dateProgrammee, d.mecanicienOuAtelier, d.coutEstimeFCFA, d.notes ?? null]
    );
    return result.rows;
  });
  res.status(201).json(rows[0]);
});

const statusSchema = z.object({
  status: z.enum(['PROGRAMMEE', 'EN_COURS', 'EFFECTUEE', 'ANNULEE']),
  linkedInvoiceId: z.string().optional(),
});

maintenanceRouter.patch('/scheduled/:id/status', requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR', 'MECANICIEN'), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Statut invalide' });
  const { rows } = await pool.query(
    `UPDATE scheduled_maintenance SET status = $1, "linkedInvoiceId" = COALESCE($2, "linkedInvoiceId") WHERE id = $3 RETURNING *`,
    [parsed.data.status, parsed.data.linkedInvoiceId ?? null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Intervention introuvable' });

  // Une fois la maintenance effectuée, on met à jour le plan pour repousser la prochaine échéance.
  if (parsed.data.status === 'EFFECTUEE' && rows[0].planItemId) {
    const plan = await pool.query(`SELECT * FROM maintenance_plan_items WHERE id = $1`, [rows[0].planItemId]);
    if (plan.rows[0]) {
      const p = plan.rows[0];
      const newProchainKm = p.dernierKmRealise + p.frequenceKm; // recalculé lors de la prochaine saisie de km réel
      await pool.query(
        `UPDATE maintenance_plan_items SET "derniereDateRealisee" = to_char(now(),'YYYY-MM-DD'), "alertLevel" = 'VERT' WHERE id = $1`,
        [p.id]
      );
    }
  }

  res.json(rows[0]);
});
