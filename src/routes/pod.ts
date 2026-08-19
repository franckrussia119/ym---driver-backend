import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateReferenceNumber } from '../lib/referenceNumber.js';
import { findOrCreateCurrentReport } from '../lib/weeklyReportHelper.js';

export const podRouter = Router();
podRouter.use(requireAuth);

podRouter.get('/', async (req, res) => {
  const role = req.user!.role;
  let query: string;
  let params: unknown[];

  if (role === 'CHAUFFEUR') {
    query = `SELECT * FROM pod_records WHERE "driverId" = $1 OR "driverName" = $2 ORDER BY "createdAt" DESC`;
    params = [req.user!.sub, req.user!.name];
  } else if (role === 'SUPERVISEUR_CONTENEURS') {
    // Accès restreint aux seules livraisons liées à un conteneur, ou
    // qu'il a lui-même remplies — pas à l'ensemble des livraisons de
    // l'entreprise (hors de son périmètre).
    query = `SELECT * FROM pod_records WHERE "containerId" IS NOT NULL OR "filledById" = $1 ORDER BY "createdAt" DESC`;
    params = [req.user!.sub];
  } else {
    query = `SELECT * FROM pod_records ORDER BY "createdAt" DESC`;
    params = [];
  }

  const { rows } = await pool.query(query, params);
  res.json(rows);
});

const podSchema = z.object({
  blNumber: z.string(),
  containerNumber: z.string(),
  clientName: z.string(),
  deliveryAddress: z.string(),
  truckImmatriculation: z.string(),
  dateTime: z.string().refine((v) => v.split(' ')[0] <= new Date().toISOString().split('T')[0], {
    message: 'La date de livraison ne peut pas être dans le futur.',
  }),
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
  // Renseignés uniquement quand un Superviseur Conteneurs remplit la preuve
  // au nom d'un sous-traitant (qui n'a pas de compte dans l'application).
  containerId: z.string().optional(),
  subcontractorDriverId: z.string().optional(),
  subcontractorDriverName: z.string().optional(),
});

// Lundi de la semaine courante, au format YYYY-MM-DD
function resolveDepartureLabel(port: 'PAK' | 'PAD' | 'Autres', autre?: string): string {
  if (port === 'PAK') return 'Port Autonome de Kribi (PAK)';
  if (port === 'PAD') return 'Port Autonome de Douala (PAD)';
  return autre?.trim() || 'Autre';
}

podRouter.post('/', requireRole('CHAUFFEUR', 'SUPERVISEUR_CONTENEURS', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const parsed = podSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  if (d.departurePort === 'Autres' && !d.departurePortAutre?.trim()) {
    return res.status(400).json({ error: 'Veuillez préciser le port/lieu de départ.' });
  }

  const isSelfFiled = req.user!.role === 'CHAUFFEUR';
  const filledById = req.user!.sub;

  // Chauffeur : remplit sa propre preuve, comme d'habitude.
  // Superviseur Conteneurs : remplit au nom d'un sous-traitant (pas de
  // compte, pas de journal hebdomadaire à alimenter).
  const driverId = isSelfFiled ? req.user!.sub : null;
  const driverName = isSelfFiled ? req.user!.name : d.subcontractorDriverName || 'Sous-traitant';
  const subcontractorDriverId = isSelfFiled ? null : d.subcontractorDriverId ?? null;

  const departLabel = resolveDepartureLabel(d.departurePort, d.departurePortAutre);
  const numeroReference = generateReferenceNumber('LIV');

  const result = await withTransaction(async (client) => {
    // 1. Enregistrer la preuve de livraison
    const { rows: podRows } = await client.query(
      `INSERT INTO pod_records
        (id, "numeroReference", "blNumber", "containerNumber", "clientName", "deliveryAddress", "driverName", "driverId",
         "truckImmatriculation", "dateTime", "gpsLocation", "recipientName", status, "bordereauPhotoUrl",
         "photoUrl", observations, "departurePort", "departurePortAutre", "montantRecuFCFA", "distanceKm",
         "containerId", "subcontractorDriverId", "filledById")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
       RETURNING *`,
      [
        numeroReference, d.blNumber, d.containerNumber, d.clientName, d.deliveryAddress, driverName, driverId,
        d.truckImmatriculation, d.dateTime, d.gpsLocation ?? null, d.recipientName, d.status,
        d.bordereauPhotoUrl ?? null, d.photoUrl ?? null, d.observations ?? null,
        d.departurePort, d.departurePortAutre ?? null, d.montantRecuFCFA, d.distanceKm,
        d.containerId ?? null, subcontractorDriverId, filledById,
      ]
    );
    const pod = podRows[0];

    // 2. Remplissage automatique du journal hebdomadaire — uniquement
    // lorsque c'est réellement un de nos chauffeurs qui livre lui-même.
    if (isSelfFiled) {
      const reportId = await findOrCreateCurrentReport(client, driverId!, driverName);
      const { rows: tripRows } = await client.query(
        `INSERT INTO trip_log_entries
          (id, "reportId", date, client, "noConteneurBL", "typeConteneur", depart, destination, "kmParcourus", "carburantL", "fraisRoute", source)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, 'Autre', $5, $6, $7, 0, $8, 'POD')
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
    }

    return pod;
  });

  res.status(201).json(result);
});
