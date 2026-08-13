import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const podRouter = Router();
podRouter.use(requireAuth);

podRouter.get('/', async (req, res) => {
  const isDriver = req.user!.role === 'CHAUFFEUR';
  const { rows } = await pool.query(
    isDriver
      ? `SELECT * FROM pod_records WHERE "driverName" = $1 ORDER BY "createdAt" DESC`
      : `SELECT * FROM pod_records ORDER BY "createdAt" DESC`,
    isDriver ? [req.user!.name] : []
  );
  res.json(rows);
});

const podSchema = z.object({
  blNumber: z.string(),
  containerNumber: z.string(),
  clientName: z.string(),
  deliveryAddress: z.string(),
  driverName: z.string(),
  truckImmatriculation: z.string(),
  dateTime: z.string(),
  gpsLocation: z.string().optional(),
  recipientName: z.string(),
  status: z.enum(['LIVRE_CONFORME', 'SOUS_RESERVES', 'REFUSE', 'EN_COURS']),
  signatureData: z.string().optional(),
  photoUrl: z.string().optional(),
  observations: z.string().optional(),
});

podRouter.post('/', async (req, res) => {
  const parsed = podSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO pod_records
      (id, "blNumber", "containerNumber", "clientName", "deliveryAddress", "driverName", "truckImmatriculation",
       "dateTime", "gpsLocation", "recipientName", status, "signatureData", "photoUrl", observations)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      d.blNumber, d.containerNumber, d.clientName, d.deliveryAddress, d.driverName, d.truckImmatriculation,
      d.dateTime, d.gpsLocation ?? null, d.recipientName, d.status, d.signatureData ?? null, d.photoUrl ?? null,
      d.observations ?? null,
    ]
  );
  res.status(201).json(rows[0]);
});
