import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const vehiclesRouter = Router();
vehiclesRouter.use(requireAuth);

async function attachDocuments(vehicle: any) {
  const docs = await pool.query(`SELECT * FROM admin_documents WHERE "vehicleId" = $1`, [vehicle.id]);
  return { ...vehicle, documents: docs.rows };
}

vehiclesRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM fleet_vehicles ORDER BY immatriculation ASC`);
  res.json(await Promise.all(rows.map(attachDocuments)));
});

vehiclesRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM fleet_vehicles WHERE id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Véhicule introuvable' });
  res.json(await attachDocuments(rows[0]));
});

const vehicleSchema = z.object({
  immatriculation: z.string(),
  marqueModele: z.string(),
  annee: z.number().int(),
  capaciteTonnage: z.number(),
  noRemorqueAssociee: z.string().optional(),
  photoUrl: z.string().optional(),
  chauffeurHabituelId: z.string().optional(),
  chauffeurHabituelNom: z.string().optional(),
  statut: z.enum(['En service', 'En maintenance', 'Hors service']),
  kmCompteurInitial: z.number().default(0),
  consommationReferenceL100: z.number(),
  notesInterne: z.string().optional(),
  habiliteMatieresDangereuses: z.boolean().default(false),
});

vehiclesRouter.post('/', requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR'), async (req, res) => {
  const parsed = vehicleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const existing = await pool.query(`SELECT id FROM fleet_vehicles WHERE immatriculation = $1`, [d.immatriculation]);
  if (existing.rows[0]) return res.status(409).json({ error: 'Un véhicule avec cette immatriculation existe déjà' });

  const { rows } = await pool.query(
    `INSERT INTO fleet_vehicles
      (id, immatriculation, "marqueModele", annee, "capaciteTonnage", "noRemorqueAssociee", "photoUrl",
       "chauffeurHabituelId", "chauffeurHabituelNom", statut, "kmCompteurInitial", "consommationReferenceL100",
       "notesInterne", "habiliteMatieresDangereuses")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      d.immatriculation, d.marqueModele, d.annee, d.capaciteTonnage, d.noRemorqueAssociee ?? null, d.photoUrl ?? null,
      d.chauffeurHabituelId ?? null, d.chauffeurHabituelNom ?? null, d.statut, d.kmCompteurInitial,
      d.consommationReferenceL100, d.notesInterne ?? null, d.habiliteMatieresDangereuses,
    ]
  );
  res.status(201).json({ ...rows[0], documents: [] });
});

vehiclesRouter.patch('/:id', requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR'), async (req, res) => {
  const parsed = vehicleSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const d = parsed.data;
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const colMap: Record<string, string> = {
    immatriculation: 'immatriculation', marqueModele: '"marqueModele"', annee: 'annee',
    capaciteTonnage: '"capaciteTonnage"', noRemorqueAssociee: '"noRemorqueAssociee"', photoUrl: '"photoUrl"',
    chauffeurHabituelId: '"chauffeurHabituelId"', chauffeurHabituelNom: '"chauffeurHabituelNom"', statut: 'statut',
    kmCompteurInitial: '"kmCompteurInitial"', consommationReferenceL100: '"consommationReferenceL100"',
    notesInterne: '"notesInterne"', habiliteMatieresDangereuses: '"habiliteMatieresDangereuses"',
  };
  for (const [key, col] of Object.entries(colMap)) {
    if ((d as any)[key] !== undefined) { sets.push(`${col} = $${i++}`); values.push((d as any)[key]); }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Aucune modification fournie' });
  sets.push(`"updatedAt" = now()`);
  values.push(req.params.id);

  const { rows } = await pool.query(`UPDATE fleet_vehicles SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values);
  if (!rows[0]) return res.status(404).json({ error: 'Véhicule introuvable' });
  res.json(await attachDocuments(rows[0]));
});

const documentSchema = z.object({
  type: z.enum(['Assurance', 'Carte Grise', 'Visite Technique', 'Patente / Transport', 'Extincteur', 'Autre']),
  numeroDoc: z.string(),
  dateEmission: z.string(),
  dateExpiration: z.string(),
  photoScanUrl: z.string().optional(),
});

vehiclesRouter.post('/:id/documents', requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR'), async (req, res) => {
  const parsed = documentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Document invalide' });
  const d = parsed.data;

  const daysToExpiry = Math.ceil((new Date(d.dateExpiration).getTime() - Date.now()) / 86_400_000);
  const status = daysToExpiry < 0 ? 'EXPIRE' : daysToExpiry <= 30 ? 'EXPIRE_BIENTOT' : 'VALIDE';

  const { rows } = await pool.query(
    `INSERT INTO admin_documents (id, "vehicleId", type, "numeroDoc", "dateEmission", "dateExpiration", "photoScanUrl", status)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.params.id, d.type, d.numeroDoc, d.dateEmission, d.dateExpiration, d.photoScanUrl ?? null, status]
  );
  res.status(201).json(rows[0]);
});

// Historique complet d'un véhicule : rapports, pannes, factures, cautions liées.
vehiclesRouter.get('/:id/history', async (req, res) => {
  const { rows: vehicleRows } = await pool.query(`SELECT immatriculation FROM fleet_vehicles WHERE id = $1`, [req.params.id]);
  const vehicle = vehicleRows[0];
  if (!vehicle) return res.status(404).json({ error: 'Véhicule introuvable' });
  const immat = vehicle.immatriculation;

  const [reports, faults, invoices, cautions] = await Promise.all([
    pool.query(`SELECT id, "createdAt", status, "isSubmitted" FROM weekly_reports WHERE immatriculation = $1 ORDER BY "createdAt" DESC`, [immat]),
    pool.query(`SELECT id, "dateSignalement", status, categorie FROM fault_declarations WHERE immatriculation = $1 ORDER BY "createdAt" DESC`, [immat]),
    pool.query(`SELECT id, "dateIntervention", "totalTTC", status FROM mechanic_invoices WHERE "truckImmatriculation" = $1 ORDER BY "createdAt" DESC`, [immat]),
    pool.query(`SELECT id, "noConteneurBL", status, "montantCautionFCFA" FROM container_cautions WHERE "truckImmatriculation" = $1 ORDER BY "createdAt" DESC`, [immat]),
  ]);

  res.json({
    reports: reports.rows,
    faults: faults.rows,
    invoices: invoices.rows,
    cautions: cautions.rows,
  });
});
