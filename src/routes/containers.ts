import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { withReferenceNumberRetry } from '../lib/referenceNumber.js';
import { CONTAINER_PIPELINE_STEPS } from '../lib/containerPipeline.js';

export const containersRouter = Router();
containersRouter.use(requireAuth);

const CONTAINER_STAFF = ['SUPERVISEUR_CONTENEURS', 'ADMIN', 'SUPER_ADMIN'] as const;

// ------------------------------------------------------------------
// LISTE : le personnel conteneur voit tout ; un chauffeur ne voit que
// les conteneurs qui lui sont assignés (c'est ce qui les fait
// "apparaître côté chauffeur").
// ------------------------------------------------------------------
containersRouter.get('/', async (req, res) => {
  const isDriver = req.user!.role === 'CHAUFFEUR';
  const { rows } = await pool.query(
    isDriver
      ? `SELECT c.*, sd.nom AS "subcontractorNom", u.name AS "driverNom", creator.name AS "createdByNom"
         FROM containers c
         LEFT JOIN subcontractor_drivers sd ON sd.id = c."assignedSubcontractorId"
         LEFT JOIN users u ON u.id = c."assignedDriverId"
         LEFT JOIN users creator ON creator.id = c."createdById"
         WHERE c."assignedDriverId" = $1
         ORDER BY c."createdAt" DESC`
      : `SELECT c.*, sd.nom AS "subcontractorNom", u.name AS "driverNom", creator.name AS "createdByNom"
         FROM containers c
         LEFT JOIN subcontractor_drivers sd ON sd.id = c."assignedSubcontractorId"
         LEFT JOIN users u ON u.id = c."assignedDriverId"
         LEFT JOIN users creator ON creator.id = c."createdById"
         ORDER BY c."createdAt" DESC`,
    isDriver ? [req.user!.sub] : []
  );
  res.json(rows);
});

async function fetchFullContainer(id: string) {
  const containerRes = await pool.query(
    `SELECT c.*, sd.nom AS "subcontractorNom", sd.telephone AS "subcontractorTelephone",
            sd."nomEntreprise" AS "subcontractorEntreprise", u.name AS "driverNom"
     FROM containers c
     LEFT JOIN subcontractor_drivers sd ON sd.id = c."assignedSubcontractorId"
     LEFT JOIN users u ON u.id = c."assignedDriverId"
     WHERE c.id = $1`,
    [id]
  );
  const container = containerRes.rows[0];
  if (!container) return null;

  const [steps, documents, pod, ret] = await Promise.all([
    pool.query(`SELECT s.*, u.name AS "agentNom" FROM container_pipeline_steps s LEFT JOIN users u ON u.id = s."agentResponsibleId" WHERE s."containerId" = $1 ORDER BY s."stepNumber" ASC`, [id]),
    pool.query(`SELECT d.*, u.name AS "uploadedByNom" FROM container_documents d LEFT JOIN users u ON u.id = d."uploadedById" WHERE d."containerId" = $1 ORDER BY d."uploadedAt" DESC`, [id]),
    pool.query(`SELECT * FROM pod_records WHERE "containerId" = $1 ORDER BY "createdAt" DESC`, [id]),
    pool.query(`SELECT * FROM container_returns WHERE "containerId" = $1`, [id]),
  ]);

  return {
    ...container,
    steps: steps.rows,
    documents: documents.rows,
    pod: pod.rows,
    return: ret.rows[0] ?? null,
  };
}

containersRouter.get('/:id', async (req, res) => {
  const full = await fetchFullContainer(req.params.id);
  if (!full) return res.status(404).json({ error: 'Conteneur introuvable' });

  if (req.user!.role === 'CHAUFFEUR' && full.assignedDriverId !== req.user!.sub) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  res.json(full);
});

// ------------------------------------------------------------------
// CRÉATION : ouvre la "vie" du conteneur + crée automatiquement les
// 10 étapes du pipeline (toutes en PENDING).
// ------------------------------------------------------------------
const createSchema = z.object({
  blNumber: z.string().min(1),
  port: z.enum(['Douala', 'Kribi']),
  terminal: z.string().min(1),
  containerNumber: z.string().min(1),
  size: z.enum(['20', '40']),
  notes: z.string().optional(),
});

containersRouter.post('/', requireRole(...CONTAINER_STAFF), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const containerId = await withReferenceNumberRetry('CONT', async (numeroReference) =>
    withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO containers (id, "numeroReference", "blNumber", port, terminal, "containerNumber", size, "createdById", notes)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [numeroReference, d.blNumber, d.port, d.terminal, d.containerNumber, d.size, req.user!.sub, d.notes ?? null]
      );
      const id = rows[0].id;

      for (const step of CONTAINER_PIPELINE_STEPS) {
        await client.query(
          `INSERT INTO container_pipeline_steps (id, "containerId", "stepNumber", "stepName")
           VALUES (gen_random_uuid()::text, $1, $2, $3)`,
          [id, step.number, step.name]
        );
      }
      return id;
    })
  );

  const full = await fetchFullContainer(containerId);
  res.status(201).json(full);
});

// ------------------------------------------------------------------
// ASSIGNATION du transporteur : notre chauffeur OU un sous-traitant.
// ------------------------------------------------------------------
const assignSchema = z.object({
  carrierType: z.enum(['CHAUFFEUR_INTERNE', 'SOUS_TRAITANT']),
  driverId: z.string().optional(),
  subcontractorId: z.string().optional(),
});

containersRouter.patch('/:id/assign', requireRole(...CONTAINER_STAFF), async (req, res) => {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  if (d.carrierType === 'CHAUFFEUR_INTERNE' && !d.driverId) {
    return res.status(400).json({ error: 'Veuillez sélectionner un chauffeur.' });
  }
  if (d.carrierType === 'SOUS_TRAITANT' && !d.subcontractorId) {
    return res.status(400).json({ error: 'Veuillez sélectionner un sous-traitant.' });
  }

  const { rows } = await pool.query(
    `UPDATE containers SET "carrierType" = $1, "assignedDriverId" = $2, "assignedSubcontractorId" = $3 WHERE id = $4 RETURNING id`,
    [
      d.carrierType,
      d.carrierType === 'CHAUFFEUR_INTERNE' ? d.driverId : null,
      d.carrierType === 'SOUS_TRAITANT' ? d.subcontractorId : null,
      req.params.id,
    ]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Conteneur introuvable' });

  // Étape 8 (Transport Terrestre) reflète automatiquement l'assignation.
  await pool.query(
    `UPDATE container_pipeline_steps SET status = 'IN_PROGRESS', details = details || $1::jsonb, "updatedAt" = now()
     WHERE "containerId" = $2 AND "stepNumber" = 8`,
    [JSON.stringify({ transporteurAssigne: d.carrierType }), req.params.id]
  );

  const full = await fetchFullContainer(req.params.id);
  res.json(full);
});

// ------------------------------------------------------------------
// MISE À JOUR D'UNE ÉTAPE DU PIPELINE
// ------------------------------------------------------------------
const stepUpdateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED']).optional(),
  dateDone: z.string().optional(),
  notes: z.string().optional(),
  details: z.record(z.any()).optional(),
});

containersRouter.patch('/:id/pipeline/:stepNumber', requireRole(...CONTAINER_STAFF), async (req, res) => {
  const parsed = stepUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const sets: string[] = ['"agentResponsibleId" = $1', '"updatedAt" = now()'];
  const values: unknown[] = [req.user!.sub];
  let i = 2;
  if (d.status !== undefined) { sets.push(`status = $${i++}`); values.push(d.status); }
  if (d.dateDone !== undefined) { sets.push(`"dateDone" = $${i++}`); values.push(d.dateDone); }
  if (d.notes !== undefined) { sets.push(`notes = $${i++}`); values.push(d.notes); }
  if (d.details !== undefined) { sets.push(`details = details || $${i++}::jsonb`); values.push(JSON.stringify(d.details)); }
  values.push(req.params.id, req.params.stepNumber);

  const { rows } = await pool.query(
    `UPDATE container_pipeline_steps SET ${sets.join(', ')} WHERE "containerId" = $${i++} AND "stepNumber" = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) return res.status(404).json({ error: 'Étape introuvable' });
  res.json(rows[0]);
});

// ------------------------------------------------------------------
// DOCUMENTS (le fichier est d'abord envoyé via /api/uploads, ceci ne
// fait que lier son URL au conteneur).
// ------------------------------------------------------------------
const documentSchema = z.object({
  type: z.enum(['BL_OBL', 'BL_TELEX', 'TICKET', 'AUTRE']),
  fileUrl: z.string().min(1),
});

containersRouter.post('/:id/documents', requireRole(...CONTAINER_STAFF), async (req, res) => {
  const parsed = documentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO container_documents (id, "containerId", type, "fileUrl", "uploadedById")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4) RETURNING *`,
    [req.params.id, d.type, d.fileUrl, req.user!.sub]
  );
  res.status(201).json(rows[0]);
});

containersRouter.patch('/:id/documents/:docId/status', requireRole(...CONTAINER_STAFF), async (req, res) => {
  const status = req.body?.status;
  if (!['PENDING', 'RECEIVED', 'VALIDATED'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  const { rows } = await pool.query(
    `UPDATE container_documents SET status = $1 WHERE id = $2 AND "containerId" = $3 RETURNING *`,
    [status, req.params.docId, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Document introuvable' });
  res.json(rows[0]);
});

// ------------------------------------------------------------------
// RETOUR DU CONTENEUR VIDE : ferme la vie du conteneur.
// ------------------------------------------------------------------
const returnSchema = z.object({
  dateRetourVide: z.string(),
  depotRetour: z.string().min(1),
  photoUrl: z.string().optional(),
  notes: z.string().optional(),
});

containersRouter.post('/:id/return', requireRole(...CONTAINER_STAFF, 'CHAUFFEUR'), async (req, res) => {
  const parsed = returnSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const existing = await pool.query(`SELECT status, "assignedDriverId" FROM containers WHERE id = $1`, [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Conteneur introuvable' });
  if (existing.rows[0].status === 'FERME') {
    return res.status(409).json({ error: 'Ce conteneur est déjà clôturé.' });
  }
  // Un chauffeur ne peut clôturer que les conteneurs qui lui sont assignés.
  if (req.user!.role === 'CHAUFFEUR' && existing.rows[0].assignedDriverId !== req.user!.sub) {
    return res.status(403).json({ error: "Ce conteneur ne vous est pas assigné." });
  }

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO container_returns (id, "containerId", "dateRetourVide", "depotRetour", "photoUrl", notes, "filledById")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6)`,
      [req.params.id, d.dateRetourVide, d.depotRetour, d.photoUrl ?? null, d.notes ?? null, req.user!.sub]
    );
    await client.query(`UPDATE containers SET status = 'FERME', "closedAt" = now() WHERE id = $1`, [req.params.id]);
    await client.query(
      `UPDATE container_pipeline_steps SET status = 'DONE', "dateDone" = $1, "agentResponsibleId" = $2, "updatedAt" = now()
       WHERE "containerId" = $3 AND "stepNumber" = 10`,
      [d.dateRetourVide, req.user!.sub, req.params.id]
    );
  });

  const full = await fetchFullContainer(req.params.id);
  res.json(full);
});

// ------------------------------------------------------------------
// RAPPORT PAR CONTENEUR (calculé à la volée, jamais figé en base pour
// toujours refléter les dernières données).
// ------------------------------------------------------------------
containersRouter.get('/:id/report', async (req, res) => {
  const full = await fetchFullContainer(req.params.id);
  if (!full) return res.status(404).json({ error: 'Conteneur introuvable' });

  const openedAt = new Date(full.createdAt);
  const closedAt = full.closedAt ? new Date(full.closedAt) : new Date();
  const totalDays = Math.max(0, Math.round((closedAt.getTime() - openedAt.getTime()) / 86_400_000));

  const dutyStep = full.steps.find((s: any) => s.stepNumber === 3);
  const montantDroitsTaxes = Number(dutyStep?.details?.montantFCFA ?? 0);

  const carrierLabel =
    full.carrierType === 'CHAUFFEUR_INTERNE'
      ? full.driverNom || 'Chauffeur interne (non renseigné)'
      : full.carrierType === 'SOUS_TRAITANT'
      ? `${full.subcontractorNom || 'Sous-traitant'} (${full.subcontractorEntreprise || 'société non renseignée'})`
      : 'Non assigné';

  res.json({
    container: {
      id: full.id,
      numeroReference: full.numeroReference,
      blNumber: full.blNumber,
      containerNumber: full.containerNumber,
      port: full.port,
      terminal: full.terminal,
      size: full.size,
      status: full.status,
    },
    isOuvert: full.status === 'OUVERT',
    dateOuverture: full.createdAt,
    dateFermeture: full.closedAt,
    totalDays,
    carrier: {
      type: full.carrierType,
      label: carrierLabel,
    },
    montantDroitsTaxesFCFA: montantDroitsTaxes,
    stepsCompleted: full.steps.filter((s: any) => s.status === 'DONE').length,
    stepsTotal: full.steps.length,
    stepsBlocked: full.steps.filter((s: any) => s.status === 'BLOCKED').length,
    documentsCount: full.documents.length,
    documentsValidated: full.documents.filter((d: any) => d.status === 'VALIDATED').length,
    timeline: full.steps.map((s: any) => ({
      stepNumber: s.stepNumber,
      stepName: s.stepName,
      status: s.status,
      dateDone: s.dateDone,
      agent: s.agentNom,
      notes: s.notes,
    })),
    pod: full.pod,
    return: full.return,
  });
});
