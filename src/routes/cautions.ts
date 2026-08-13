import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const cautionsRouter = Router();
cautionsRouter.use(requireAuth);

cautionsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM container_cautions ORDER BY "dateLimiteRetour" ASC`);
  res.json(rows);
});

// Tableau de bord : montant engagé, à risque (échéance proche), perdu sur la période.
cautionsRouter.get('/summary', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT
      COALESCE(SUM("montantCautionFCFA") FILTER (WHERE status = 'En cours'), 0) AS "montantEngage",
      COALESCE(SUM("montantCautionFCFA") FILTER (
        WHERE status = 'En cours' AND "dateLimiteRetour"::date <= (now() + interval '5 days')::date
      ), 0) AS "montantARisque",
      COALESCE(SUM("montantCautionFCFA") FILTER (WHERE status = 'Caution perdue'), 0) AS "montantPerdu",
      COALESCE(SUM("montantPenaliteFCFA") FILTER (WHERE status = 'En retard - Pénalité'), 0) AS "montantPenalites"
    FROM container_cautions
  `);
  res.json(rows[0]);
});

const cautionSchema = z.object({
  noConteneurBL: z.string(),
  ligneMaritime: z.string(),
  clientNom: z.string(),
  truckImmatriculation: z.string(),
  chauffeurNom: z.string(),
  montantCautionFCFA: z.number().nonnegative(),
  fraisJournalierRetardFCFA: z.number().nonnegative(),
  depotDestination: z.string(),
  dateDepot: z.string(),
  dateLimiteRetour: z.string(),
  notes: z.string().optional(),
});

cautionsRouter.post('/', requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR'), async (req, res) => {
  const parsed = cautionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO container_cautions
      (id, "noConteneurBL", "ligneMaritime", "clientNom", "truckImmatriculation", "chauffeurNom",
       "montantCautionFCFA", "fraisJournalierRetardFCFA", "depotDestination", "dateDepot", "dateLimiteRetour",
       status, notes)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'En cours', $11)
     RETURNING *`,
    [
      d.noConteneurBL, d.ligneMaritime, d.clientNom, d.truckImmatriculation, d.chauffeurNom,
      d.montantCautionFCFA, d.fraisJournalierRetardFCFA, d.depotDestination, d.dateDepot, d.dateLimiteRetour,
      d.notes ?? null,
    ]
  );
  res.status(201).json(rows[0]);
});

const returnSchema = z.object({ dateRetourEffectif: z.string() });

cautionsRouter.post('/:id/return', requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR'), async (req, res) => {
  const parsed = returnSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Date de retour requise' });

  const { rows } = await pool.query(`SELECT * FROM container_cautions WHERE id = $1`, [req.params.id]);
  const caution = rows[0];
  if (!caution) return res.status(404).json({ error: 'Caution introuvable' });

  const limite = new Date(caution.dateLimiteRetour).getTime();
  const retour = new Date(parsed.data.dateRetourEffectif).getTime();
  const onTime = retour <= limite;
  const daysLate = onTime ? 0 : Math.ceil((retour - limite) / 86_400_000);
  const penalite = daysLate * caution.fraisJournalierRetardFCFA;
  const status = onTime ? 'Retourné à temps' : 'En retard - Pénalité';
  const montantRecupere = onTime ? caution.montantCautionFCFA : Math.max(0, caution.montantCautionFCFA - penalite);

  const { rows: updated } = await pool.query(
    `UPDATE container_cautions
     SET "dateRetourEffectif" = $1, status = $2, "montantPenaliteFCFA" = $3, "montantRecupereFCFA" = $4
     WHERE id = $5 RETURNING *`,
    [parsed.data.dateRetourEffectif, status, penalite, montantRecupere, req.params.id]
  );
  res.json(updated[0]);
});

cautionsRouter.post('/:id/lost', requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR'), async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE container_cautions SET status = 'Caution perdue', "montantRecupereFCFA" = 0 WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Caution introuvable' });
  res.json(rows[0]);
});
