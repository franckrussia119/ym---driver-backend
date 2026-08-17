import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const podRouter = Router();
podRouter.use(requireAuth);

podRouter.get('/', async (req, res) => {
  const isDriver = req.user!.role === 'CHAUFFEUR';
  const { rows } = await pool.query(
    isDriver
      ? `SELECT * FROM pod_records WHERE "driverId" = $1 OR "driverName" = $2 ORDER BY "createdAt" DESC`
      : `SELECT * FROM pod_records ORDER BY "createdAt" DESC`,
    isDriver ? [req.user!.sub, req.user!.name] : []
  );
  res.json(rows);
});

const podSchema = z.object({
  blNumber: z.string(),
  containerNumber: z.string(),
  clientName: z.string(),
  deliveryAddress: z.string(),
  truckImmatriculation: z.string(),
  dateTime: z.string(),
  gpsLocation: z.string().optional(),
  recipientName: z.string(),
  status: z.enum(['LIVRE_CONFORME', 'SOUS_RESERVES', 'REFUSE', 'EN_COURS']),
  bordereauPhotoUrl: z.string().optional(),
  photoUrl: z.string().optional(),
  observations: z.string().optional(),
  departurePort: z.enum(['PAK', 'PAD', 'Autres']),
  departurePortAutre: z.string().optional(),
  montantRecuFCFA: z.number().nonnegative().default(0),
  distanceKm: z.number().nonnegative().default(0),
});

// Lundi de la semaine courante, au format YYYY-MM-DD
function mondayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = dimanche
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  return monday.toISOString().split('T')[0];
}
function sundayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diffToSunday = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diffToSunday);
  return sunday.toISOString().split('T')[0];
}

// Trouve le rapport hebdomadaire "brouillon" en cours du chauffeur, ou en
// crée un nouveau pour la semaine courante s'il n'en existe pas.
async function findOrCreateCurrentReport(client: import('pg').PoolClient, driverId: string, driverName: string) {
  const existing = await client.query(
    `SELECT id FROM weekly_reports WHERE "driverId" = $1 AND "isSubmitted" = false ORDER BY "createdAt" DESC LIMIT 1`,
    [driverId]
  );
  if (existing.rows[0]) return existing.rows[0].id as string;

  const userRes = await client.query(`SELECT "camionAssigne" FROM users WHERE id = $1`, [driverId]);
  const camionAssigne: string | null = userRes.rows[0]?.camionAssigne ?? null;
  const camionParts = camionAssigne?.split('(') ?? [];
  const immatriculation = camionParts[0]?.trim() || '';
  const marqueModele = camionParts[1] ? camionParts[1].replace(')', '').trim() : '';

  const created = await client.query(
    `INSERT INTO weekly_reports (id, "driverId", "semaineDu", "semaineAu", "nomChauffeur", immatriculation, "marqueModele", "noRemorque")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, '')
     RETURNING id`,
    [driverId, mondayOfCurrentWeek(), sundayOfCurrentWeek(), driverName, immatriculation, marqueModele]
  );
  return created.rows[0].id as string;
}

function resolveDepartureLabel(port: 'PAK' | 'PAD' | 'Autres', autre?: string): string {
  if (port === 'PAK') return 'Port Autonome de Kribi (PAK)';
  if (port === 'PAD') return 'Port Autonome de Douala (PAD)';
  return autre?.trim() || 'Autre';
}

podRouter.post('/', async (req, res) => {
  const parsed = podSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  if (d.departurePort === 'Autres' && !d.departurePortAutre?.trim()) {
    return res.status(400).json({ error: 'Veuillez préciser le port/lieu de départ.' });
  }

  const driverId = req.user!.sub;
  const driverName = req.user!.name;
  const departLabel = resolveDepartureLabel(d.departurePort, d.departurePortAutre);

  const result = await withTransaction(async (client) => {
    // 1. Enregistrer la preuve de livraison
    const { rows: podRows } = await client.query(
      `INSERT INTO pod_records
        (id, "blNumber", "containerNumber", "clientName", "deliveryAddress", "driverName", "driverId",
         "truckImmatriculation", "dateTime", "gpsLocation", "recipientName", status, "bordereauPhotoUrl",
         "photoUrl", observations, "departurePort", "departurePortAutre", "montantRecuFCFA", "distanceKm")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        d.blNumber, d.containerNumber, d.clientName, d.deliveryAddress, driverName, driverId,
        d.truckImmatriculation, d.dateTime, d.gpsLocation ?? null, d.recipientName, d.status,
        d.bordereauPhotoUrl ?? null, d.photoUrl ?? null, d.observations ?? null,
        d.departurePort, d.departurePortAutre ?? null, d.montantRecuFCFA, d.distanceKm,
      ]
    );
    const pod = podRows[0];

    // 2. Remplissage automatique du journal hebdomadaire : trouve ou crée le
    // rapport brouillon du chauffeur, puis y ajoute ce trajet.
    const reportId = await findOrCreateCurrentReport(client, driverId, driverName);
    const { rows: tripRows } = await client.query(
      `INSERT INTO trip_log_entries
        (id, "reportId", date, client, "noConteneurBL", "typeConteneur", depart, destination, "kmParcourus", "carburantL", "fraisRoute")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, 'Autre', $5, $6, $7, 0, $8)
       RETURNING id`,
      [
        reportId, d.dateTime.split(' ')[0] || new Date().toISOString().split('T')[0],
        d.clientName, d.blNumber, departLabel, d.deliveryAddress, d.distanceKm, d.montantRecuFCFA,
      ]
    );
    const tripId = tripRows[0].id;

    await client.query(
      `UPDATE pod_records SET "linkedReportId" = $1, "linkedTripId" = $2 WHERE id = $3`,
      [reportId, tripId, pod.id]
    );

    return { ...pod, linkedReportId: reportId, linkedTripId: tripId };
  });

  res.status(201).json(result);
});
