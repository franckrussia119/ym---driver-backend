import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const feedbackRouter = Router();
feedbackRouter.use(requireAuth);

feedbackRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM customer_feedback_records ORDER BY "createdAt" DESC`);
  res.json(rows);
});

const feedbackSchema = z.object({
  clientName: z.string(),
  blNumber: z.string(),
  driverName: z.string(),
  date: z.string(),
  rating: z.number().int().min(1).max(5),
  punctualityScore: z.enum(['Excellente', 'Correcte', 'Retard']),
  cargoConditionScore: z.enum(['Intacte', 'Dommage Mineur', 'Avarie Grave']),
  comment: z.string().optional(),
});

feedbackRouter.post('/', async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const status = d.cargoConditionScore === 'Avarie Grave' || d.punctualityScore === 'Retard' ? 'RECLAMATION' : 'TRAITE';

  const { rows } = await pool.query(
    `INSERT INTO customer_feedback_records
      (id, "clientName", "blNumber", "driverName", date, rating, "punctualityScore", "cargoConditionScore", comment, status)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [d.clientName, d.blNumber, d.driverName, d.date, d.rating, d.punctualityScore, d.cargoConditionScore, d.comment ?? null, status]
  );
  res.status(201).json(rows[0]);
});
