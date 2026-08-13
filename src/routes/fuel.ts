import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const fuelRouter = Router();
fuelRouter.use(requireAuth);

fuelRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM fuel_analysis_entries ORDER BY date DESC`);
  res.json(rows);
});

const entrySchema = z.object({
  tripId: z.string().optional(),
  date: z.string(),
  truckImmatriculation: z.string(),
  chauffeurNom: z.string(),
  trajetLabel: z.string(),
  kmParcourus: z.number().positive(),
  carburantConsommeL: z.number().positive(),
});

// Seuil au-delà duquel un écart de consommation est considéré comme une anomalie.
const ANOMALY_THRESHOLD_L100 = 5;

fuelRouter.post('/', async (req, res) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const d = parsed.data;

  const vehicle = await pool.query(
    `SELECT "consommationReferenceL100" FROM fleet_vehicles WHERE immatriculation = $1`,
    [d.truckImmatriculation]
  );
  const consommationRefL100 = vehicle.rows[0]?.consommationReferenceL100 ?? 35;
  const consommationReelleL100 = (d.carburantConsommeL / d.kmParcourus) * 100;
  const ecartL100 = consommationReelleL100 - consommationRefL100;
  const anomalieDetectee = ecartL100 > ANOMALY_THRESHOLD_L100;
  const typeAnomalie = !anomalieDetectee
    ? null
    : ecartL100 > 15
      ? 'Suspicion fuite/vol'
      : ecartL100 > 8
        ? 'Surconsommation mécanique'
        : 'Ligne trafic chargée';

  const { rows } = await pool.query(
    `INSERT INTO fuel_analysis_entries
      (id, "tripId", date, "truckImmatriculation", "chauffeurNom", "trajetLabel", "kmParcourus",
       "carburantConsommeL", "consommationReelleL100", "consommationRefL100", "ecartL100", "anomalieDetectee", "typeAnomalie")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      d.tripId ?? null, d.date, d.truckImmatriculation, d.chauffeurNom, d.trajetLabel, d.kmParcourus,
      d.carburantConsommeL, consommationReelleL100, consommationRefL100, ecartL100, anomalieDetectee, typeAnomalie,
    ]
  );
  res.status(201).json(rows[0]);
});
