import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { withReferenceNumberRetry } from '../lib/referenceNumber.js';
import { CONTAINER_PIPELINE_STEPS } from '../lib/containerPipeline.js';
import { findOrCreateCurrentReport } from '../lib/weeklyReportHelper.js';

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
      ? `SELECT c.*, sd.nom AS "subcontractorNom", sc.nom AS "subcontractorEntreprise", u.name AS "driverNom", creator.name AS "createdByNom"
         FROM containers c
         LEFT JOIN subcontractor_drivers sd ON sd.id = c."assignedSubcontractorId"
         LEFT JOIN subcontractor_companies sc ON sc.id = sd."companyId"
         LEFT JOIN users u ON u.id = c."assignedDriverId"
         LEFT JOIN users creator ON creator.id = c."createdById"
         WHERE c."assignedDriverId" = $1
         ORDER BY c."createdAt" DESC`
      : `SELECT c.*, sd.nom AS "subcontractorNom", sc.nom AS "subcontractorEntreprise", u.name AS "driverNom", creator.name AS "createdByNom"
         FROM containers c
         LEFT JOIN subcontractor_drivers sd ON sd.id = c."assignedSubcontractorId"
         LEFT JOIN subcontractor_companies sc ON sc.id = sd."companyId"
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
            sc.nom AS "subcontractorEntreprise", u.name AS "driverNom", u.telephone AS "driverTelephone"
     FROM containers c
     LEFT JOIN subcontractor_drivers sd ON sd.id = c."assignedSubcontractorId"
     LEFT JOIN subcontractor_companies sc ON sc.id = sd."companyId"
     LEFT JOIN users u ON u.id = c."assignedDriverId"
     WHERE c.id = $1`,
    [id]
  );
  const container = containerRes.rows[0];
  if (!container) return null;

  const [steps, documents, pod, ret, incidents] = await Promise.all([
    pool.query(`SELECT s.*, u.name AS "agentNom" FROM container_pipeline_steps s LEFT JOIN users u ON u.id = s."agentResponsibleId" WHERE s."containerId" = $1 ORDER BY s."stepNumber" ASC`, [id]),
    pool.query(`SELECT d.*, u.name AS "uploadedByNom" FROM container_documents d LEFT JOIN users u ON u.id = d."uploadedById" WHERE d."containerId" = $1 ORDER BY d."uploadedAt" DESC`, [id]),
    pool.query(`SELECT * FROM pod_records WHERE "containerId" = $1 ORDER BY "createdAt" DESC`, [id]),
    pool.query(`SELECT r.*, u.name AS "filledByNom", u.telephone AS "filledByTelephone" FROM container_returns r LEFT JOIN users u ON u.id = r."filledById" WHERE r."containerId" = $1`, [id]),
    pool.query(`SELECT * FROM container_incidents WHERE "containerId" = $1 ORDER BY "createdAt" ASC`, [id]),
  ]);

  return {
    ...container,
    steps: steps.rows,
    documents: documents.rows,
    pod: pod.rows,
    return: ret.rows[0] ?? null,
    incidents: incidents.rows,
  };
}

// ------------------------------------------------------------------
// CONTENEURS DISPONIBLES POUR RETOUR : le "pool ouvert". Une fois la
// preuve de livraison faite, N'IMPORTE QUEL chauffeur peut ramener le
// conteneur vide au port — pas seulement celui qui a livré. Doit être
// déclaré AVANT /:id pour ne pas être intercepté par cette route.
// ------------------------------------------------------------------
containersRouter.get('/pending-return', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT c.*, sd.nom AS "subcontractorNom", u.name AS "driverNom"
     FROM containers c
     JOIN pod_records p ON p."containerId" = c.id
     LEFT JOIN subcontractor_drivers sd ON sd.id = c."assignedSubcontractorId"
     LEFT JOIN users u ON u.id = c."assignedDriverId"
     WHERE c.status = 'OUVERT'
     ORDER BY c."createdAt" DESC`
  );
  res.json(rows);
});

// ------------------------------------------------------------------
// CONTENEURS EN ATTENTE DE LIVRAISON : assignés au chauffeur, encore
// ouverts, et n'ayant PAS ENCORE de preuve de livraison. C'est cette
// liste — pas la liste générale des conteneurs assignés — qui doit
// alimenter le formulaire de création de POD, pour qu'un conteneur déjà
// livré ne puisse plus être "livré" une seconde fois.
// ------------------------------------------------------------------
containersRouter.get('/pending-delivery', requireRole('CHAUFFEUR', ...CONTAINER_STAFF), async (req, res) => {
  const isDriver = req.user!.role === 'CHAUFFEUR';
  const { rows } = await pool.query(
    isDriver
      ? `SELECT c.* FROM containers c
         WHERE c.status = 'OUVERT'
           AND c."assignedDriverId" = $1
           AND NOT EXISTS (SELECT 1 FROM pod_records p WHERE p."containerId" = c.id)
         ORDER BY c."createdAt" DESC`
      : `SELECT c.*, sd.nom AS "subcontractorNom", sc.nom AS "subcontractorEntreprise" FROM containers c
         JOIN subcontractor_drivers sd ON sd.id = c."assignedSubcontractorId"
         LEFT JOIN subcontractor_companies sc ON sc.id = sd."companyId"
         WHERE c.status = 'OUVERT'
           AND c."carrierType" = 'SOUS_TRAITANT'
           AND NOT EXISTS (SELECT 1 FROM pod_records p WHERE p."containerId" = c.id)
         ORDER BY c."createdAt" DESC`,
    isDriver ? [req.user!.sub] : []
  );
  res.json(rows);
});

// ------------------------------------------------------------------
// HISTORIQUE DES RETOURS : un chauffeur voit les retours qu'il a
// lui-même effectués ; le personnel conteneur voit tout.
// ------------------------------------------------------------------
containersRouter.get('/returns-history', async (req, res) => {
  const isDriver = req.user!.role === 'CHAUFFEUR';
  const { rows } = await pool.query(
    isDriver
      ? `SELECT r.*, c."numeroReference" AS "containerNumeroReference", c."containerNumber", c."blNumber", c.port, c.terminal, c.size
         FROM container_returns r
         JOIN containers c ON c.id = r."containerId"
         WHERE r."filledById" = $1
         ORDER BY r."createdAt" DESC`
      : `SELECT r.*, c."numeroReference" AS "containerNumeroReference", c."containerNumber", c."blNumber", c.port, c.terminal, c.size
         FROM container_returns r
         JOIN containers c ON c.id = r."containerId"
         ORDER BY r."createdAt" DESC`,
    isDriver ? [req.user!.sub] : []
  );
  res.json(rows);
});

// ------------------------------------------------------------------
// REGROUPEMENT PAR BL : un même BL peut couvrir plusieurs conteneurs.
// Doit être déclaré AVANT /:id pour ne pas être intercepté par cette route.
// ------------------------------------------------------------------
containersRouter.get('/bls', requireRole(...CONTAINER_STAFF), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
       "blNumber",
       count(*)::int AS "totalContainers",
       count(*) FILTER (WHERE status = 'OUVERT')::int AS "ouverts",
       count(*) FILTER (WHERE status = 'FERME')::int AS "fermes",
       min("createdAt") AS "premiereDateCreation",
       array_agg(port) AS ports
     FROM containers
     GROUP BY "blNumber"
     ORDER BY min("createdAt") DESC`
  );
  res.json(
    rows.map((r: any) => ({
      blNumber: r.blNumber,
      totalContainers: r.totalContainers,
      ouverts: r.ouverts,
      fermes: r.fermes,
      premiereDateCreation: r.premiereDateCreation,
      ports: [...new Set(r.ports)],
    }))
  );
});

containersRouter.get('/bl/:blNumber', requireRole(...CONTAINER_STAFF), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, sd.nom AS "subcontractorNom", sc.nom AS "subcontractorEntreprise", u.name AS "driverNom"
     FROM containers c
     LEFT JOIN subcontractor_drivers sd ON sd.id = c."assignedSubcontractorId"
     LEFT JOIN subcontractor_companies sc ON sc.id = sd."companyId"
     LEFT JOIN users u ON u.id = c."assignedDriverId"
     WHERE lower(trim(c."blNumber")) = lower(trim($1))
     ORDER BY c."createdAt" ASC`,
    [req.params.blNumber]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Aucun conteneur trouvé pour ce BL' });
  res.json(rows);
});

containersRouter.get('/:id', async (req, res) => {
  const full = await fetchFullContainer(req.params.id);
  if (!full) return res.status(404).json({ error: 'Conteneur introuvable' });

  // Un chauffeur peut voir un conteneur qui lui est assigné (livraison à
  // faire), OU un conteneur déjà livré (pool ouvert de retour à vide).
  if (req.user!.role === 'CHAUFFEUR' && full.assignedDriverId !== req.user!.sub) {
    const hasPod = full.pod && full.pod.length > 0;
    if (!hasPod) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
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
  dateLimiteRetour: z.string().optional(),
  notes: z.string().optional(),
  clientNom: z.string().optional(),
  clientContact: z.string().optional(),
  contenuDescription: z.string().optional(),
  destinationDechargement: z.string().optional(),
});

containersRouter.post('/', requireRole(...CONTAINER_STAFF), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  // Un même BL couvre souvent plusieurs conteneurs — ce n'est PAS une
  // erreur. Ce qui doit réellement être unique, c'est le numéro de
  // conteneur PARMI LES CONTENEURS ENCORE OUVERTS : un même conteneur
  // physique ne peut pas être engagé sur deux dossiers actifs à la fois.
  // Une fois fermé, son numéro redevient disponible pour un futur envoi.
  const existingOpen = await pool.query(
    `SELECT id, "numeroReference", "blNumber" FROM containers
     WHERE lower(trim("containerNumber")) = lower(trim($1)) AND status = 'OUVERT'`,
    [d.containerNumber]
  );
  if (existingOpen.rows[0]) {
    return res.status(409).json({
      error: `Le conteneur "${d.containerNumber}" est déjà engagé sur un dossier ouvert (BL ${existingOpen.rows[0].blNumber}, ${existingOpen.rows[0].numeroReference}). Un même conteneur ne peut pas être ouvert sur deux dossiers à la fois.`,
    });
  }

  const containerId = await withReferenceNumberRetry('CONT', async (numeroReference) =>
    withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO containers (id, "numeroReference", "blNumber", port, terminal, "containerNumber", size, "dateLimiteRetour", "createdById", notes, "clientNom", "clientContact", "contenuDescription", "destinationDechargement")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          numeroReference, d.blNumber, d.port, d.terminal, d.containerNumber, d.size, d.dateLimiteRetour ?? null, req.user!.sub, d.notes ?? null,
          d.clientNom ?? null, d.clientContact ?? null, d.contenuDescription ?? null, d.destinationDechargement ?? null,
        ]
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
// MODIFIER : corriger une erreur de saisie (BL, N° conteneur, port...).
// Re-vérifie l'unicité du BL si celui-ci change.
// ------------------------------------------------------------------
const updateSchema = z.object({
  blNumber: z.string().min(1).optional(),
  port: z.enum(['Douala', 'Kribi']).optional(),
  terminal: z.string().min(1).optional(),
  containerNumber: z.string().min(1).optional(),
  size: z.enum(['20', '40']).optional(),
  notes: z.string().optional(),
  clientNom: z.string().optional(),
  clientContact: z.string().optional(),
  contenuDescription: z.string().optional(),
  destinationDechargement: z.string().optional(),
  tarifConvenuFCFA: z.number().nonnegative().optional(),
  documentsRequis: z.string().optional(),
  immatriculationCamionTrajet: z.string().optional(),
  remorqueTrajet: z.string().optional(),
});

containersRouter.patch('/:id', requireRole(...CONTAINER_STAFF), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  if (d.containerNumber !== undefined) {
    const dup = await pool.query(
      `SELECT id, "numeroReference", "blNumber" FROM containers
       WHERE lower(trim("containerNumber")) = lower(trim($1)) AND status = 'OUVERT' AND id != $2`,
      [d.containerNumber, req.params.id]
    );
    if (dup.rows[0]) {
      return res.status(409).json({
        error: `Le conteneur "${d.containerNumber}" est déjà engagé sur un dossier ouvert (BL ${dup.rows[0].blNumber}, ${dup.rows[0].numeroReference}).`,
      });
    }
  }

  const colMap: Record<string, string> = {
    blNumber: '"blNumber"', port: 'port', terminal: 'terminal',
    containerNumber: '"containerNumber"', size: 'size', notes: 'notes',
    clientNom: '"clientNom"', clientContact: '"clientContact"',
    contenuDescription: '"contenuDescription"', destinationDechargement: '"destinationDechargement"',
    tarifConvenuFCFA: '"tarifConvenuFCFA"', documentsRequis: '"documentsRequis"',
    immatriculationCamionTrajet: '"immatriculationCamionTrajet"', remorqueTrajet: '"remorqueTrajet"',
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(colMap)) {
    if ((d as any)[key] !== undefined) { sets.push(`${col} = $${i++}`); values.push((d as any)[key]); }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Aucune modification fournie' });
  values.push(req.params.id);

  const { rows } = await pool.query(`UPDATE containers SET ${sets.join(', ')} WHERE id = $${i} RETURNING id`, values);
  if (!rows[0]) return res.status(404).json({ error: 'Conteneur introuvable' });

  const full = await fetchFullContainer(req.params.id);
  res.json(full);
});

// ------------------------------------------------------------------
// SUPPRIMER : uniquement si rien d'opérationnel n'a encore eu lieu (aucune
// preuve de livraison, aucun retour) — pour ne jamais effacer un
// historique réel de chauffeur. Au-delà, seule la modification est permise.
// ------------------------------------------------------------------
containersRouter.delete('/:id', requireRole(...CONTAINER_STAFF), async (req, res) => {
  const podCheck = await pool.query(`SELECT id FROM pod_records WHERE "containerId" = $1 LIMIT 1`, [req.params.id]);
  if (podCheck.rows.length > 0) {
    return res.status(409).json({
      error: "Ce conteneur a déjà une preuve de livraison enregistrée — il ne peut plus être supprimé, seulement modifié, pour ne pas perdre l'historique du chauffeur.",
    });
  }

  const deleted = await withTransaction(async (client) => {
    await client.query(`DELETE FROM container_documents WHERE "containerId" = $1`, [req.params.id]);
    await client.query(`DELETE FROM container_pipeline_steps WHERE "containerId" = $1`, [req.params.id]);
    await client.query(`DELETE FROM container_returns WHERE "containerId" = $1`, [req.params.id]);
    const { rowCount } = await client.query(`DELETE FROM containers WHERE id = $1`, [req.params.id]);
    return (rowCount ?? 0) > 0;
  });

  if (!deleted) return res.status(404).json({ error: 'Conteneur introuvable' });
  res.json({ success: true });
});

containersRouter.patch('/:id/deadline', requireRole(...CONTAINER_STAFF), async (req, res) => {
  const dateLimiteRetour = req.body?.dateLimiteRetour;
  if (typeof dateLimiteRetour !== 'string' || !dateLimiteRetour) {
    return res.status(400).json({ error: 'Date invalide' });
  }
  const { rows } = await pool.query(
    `UPDATE containers SET "dateLimiteRetour" = $1 WHERE id = $2 RETURNING *`,
    [dateLimiteRetour, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Conteneur introuvable' });
  res.json(rows[0]);
});

// Frais de dépôt et frais supplémentaires — distincts des droits/taxes
// (étape 3 du pipeline) et des frais de retour (formulaire de retour), pour
// que le coût total reflète vraiment tout ce qui a été dépensé.
const feesSchema = z.object({
  fraisDepotFCFA: z.number().nonnegative().optional(),
  fraisSupplementairesFCFA: z.number().nonnegative().optional(),
  fraisSupplementairesNote: z.string().optional(),
});

containersRouter.patch('/:id/fees', requireRole(...CONTAINER_STAFF), async (req, res) => {
  const parsed = feesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (d.fraisDepotFCFA !== undefined) { sets.push(`"fraisDepotFCFA" = $${i++}`); values.push(d.fraisDepotFCFA); }
  if (d.fraisSupplementairesFCFA !== undefined) { sets.push(`"fraisSupplementairesFCFA" = $${i++}`); values.push(d.fraisSupplementairesFCFA); }
  if (d.fraisSupplementairesNote !== undefined) { sets.push(`"fraisSupplementairesNote" = $${i++}`); values.push(d.fraisSupplementairesNote); }
  if (sets.length === 0) return res.status(400).json({ error: 'Aucune modification fournie' });
  values.push(req.params.id);

  const { rows } = await pool.query(`UPDATE containers SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values);
  if (!rows[0]) return res.status(404).json({ error: 'Conteneur introuvable' });
  res.json(rows[0]);
});

// ------------------------------------------------------------------
// ASSIGNATION du transporteur : notre chauffeur OU un sous-traitant.
// ------------------------------------------------------------------
const assignSchema = z.object({
  carrierType: z.enum(['CHAUFFEUR_INTERNE', 'SOUS_TRAITANT']),
  driverId: z.string().optional(),
  subcontractorId: z.string().optional(),
  immatriculationCamionTrajet: z.string().optional(),
  remorqueTrajet: z.string().optional(),
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

  // On récupère l'assignation précédente AVANT de la remplacer, pour savoir
  // s'il s'agit d'une VRAIE réassignation (conteneur déjà confié à quelqu'un
  // d'autre) — auquel cas on garde une trace, au lieu d'écraser silencieusement.
  const before = await fetchFullContainer(req.params.id);
  if (!before) return res.status(404).json({ error: 'Conteneur introuvable' });
  const ancienChauffeurNom =
    before.carrierType === 'CHAUFFEUR_INTERNE' ? before.driverNom
    : before.carrierType === 'SOUS_TRAITANT' ? before.subcontractorNom
    : null;

  const { rows } = await pool.query(
    `UPDATE containers SET "carrierType" = $1, "assignedDriverId" = $2, "assignedSubcontractorId" = $3,
       "immatriculationCamionTrajet" = COALESCE($5, "immatriculationCamionTrajet"), "remorqueTrajet" = COALESCE($6, "remorqueTrajet")
     WHERE id = $4 RETURNING id`,
    [
      d.carrierType,
      d.carrierType === 'CHAUFFEUR_INTERNE' ? d.driverId : null,
      d.carrierType === 'SOUS_TRAITANT' ? d.subcontractorId : null,
      req.params.id,
      d.immatriculationCamionTrajet ?? null,
      d.remorqueTrajet ?? null,
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
  const nouveauChauffeurNom =
    full!.carrierType === 'CHAUFFEUR_INTERNE' ? full!.driverNom
    : full!.carrierType === 'SOUS_TRAITANT' ? full!.subcontractorNom
    : null;

  if (ancienChauffeurNom && nouveauChauffeurNom && ancienChauffeurNom !== nouveauChauffeurNom) {
    await pool.query(
      `INSERT INTO container_incidents (id, "containerId", type, description, "ancienChauffeurNom", "nouveauChauffeurNom", "createdById", "createdByNom")
       VALUES (gen_random_uuid()::text, $1, 'TRANSFERT', $2, $3, $4, $5, $6)`,
      [
        req.params.id,
        `Conteneur réassigné de ${ancienChauffeurNom} à ${nouveauChauffeurNom}.`,
        ancienChauffeurNom,
        nouveauChauffeurNom,
        req.user!.sub,
        req.user!.name,
      ]
    );
  }

  res.json(full);
});

// ------------------------------------------------------------------
// INCIDENTS / TRANSFERTS : panne, transfert manuel entre chauffeurs ou
// camions, ou tout autre événement affectant le transport — pour ne
// jamais perdre la trace de ce qui s'est réellement passé.
// ------------------------------------------------------------------
const incidentSchema = z.object({
  type: z.enum(['PANNE', 'TRANSFERT', 'AUTRE']),
  description: z.string().min(1),
  ancienChauffeurNom: z.string().optional(),
  nouveauChauffeurNom: z.string().optional(),
  ancienCamion: z.string().optional(),
  nouveauCamion: z.string().optional(),
});

containersRouter.post('/:id/incidents', requireRole(...CONTAINER_STAFF), async (req, res) => {
  const parsed = incidentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const containerCheck = await pool.query(`SELECT id FROM containers WHERE id = $1`, [req.params.id]);
  if (!containerCheck.rows[0]) return res.status(404).json({ error: 'Conteneur introuvable' });

  const { rows } = await pool.query(
    `INSERT INTO container_incidents
      (id, "containerId", type, description, "ancienChauffeurNom", "nouveauChauffeurNom", "ancienCamion", "nouveauCamion", "createdById", "createdByNom")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      req.params.id, d.type, d.description,
      d.ancienChauffeurNom ?? null, d.nouveauChauffeurNom ?? null,
      d.ancienCamion ?? null, d.nouveauCamion ?? null,
      req.user!.sub, req.user!.name,
    ]
  );
  res.status(201).json(rows[0]);
});

// ------------------------------------------------------------------
// MISE À JOUR D'UNE ÉTAPE DU PIPELINE
// ------------------------------------------------------------------
const stepUpdateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED']).optional(),
  dateDone: z.string().refine((v) => v <= new Date().toISOString().split('T')[0], {
    message: 'Cette date ne peut pas être dans le futur.',
  }).optional(),
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
// RETOUR DU CONTENEUR VIDE : ferme la vie du conteneur. Ne peut se faire
// qu'APRÈS la preuve de livraison (pipeline respecté), et n'importe quel
// chauffeur peut s'en charger — pas seulement celui qui a livré.
// ------------------------------------------------------------------
const returnSchema = z.object({
  dateRetourVide: z.string().refine((v) => v <= new Date().toISOString().split('T')[0], {
    message: "La date de retour ne peut pas être dans le futur.",
  }),
  depotRetour: z.string().min(1),
  fraisRetourFCFA: z.number().nonnegative().default(0),
  photoUrl: z.string().optional(),
  notes: z.string().optional(),
});

containersRouter.post('/:id/return', requireRole(...CONTAINER_STAFF, 'CHAUFFEUR'), async (req, res) => {
  const parsed = returnSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  const d = parsed.data;

  const existing = await pool.query(
    `SELECT status, "blNumber", "containerNumber", size FROM containers WHERE id = $1`,
    [req.params.id]
  );
  if (!existing.rows[0]) return res.status(404).json({ error: 'Conteneur introuvable' });
  if (existing.rows[0].status === 'FERME') {
    return res.status(409).json({ error: 'Ce conteneur est déjà clôturé.' });
  }

  // Étape obligatoire du pipeline : la preuve de livraison (conteneur plein)
  // doit exister avant qu'un retour (conteneur vide) puisse être enregistré.
  const podCheck = await pool.query(`SELECT id FROM pod_records WHERE "containerId" = $1 LIMIT 1`, [req.params.id]);
  if (podCheck.rows.length === 0) {
    return res.status(409).json({
      error: "La preuve de livraison doit d'abord être complétée pour ce conteneur avant de pouvoir enregistrer son retour.",
    });
  }

  const isSelfFiled = req.user!.role === 'CHAUFFEUR';

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO container_returns (id, "containerId", "dateRetourVide", "depotRetour", "fraisRetourFCFA", "photoUrl", notes, "filledById")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7)`,
      [req.params.id, d.dateRetourVide, d.depotRetour, d.fraisRetourFCFA, d.photoUrl ?? null, d.notes ?? null, req.user!.sub]
    );
    await client.query(`UPDATE containers SET status = 'FERME', "closedAt" = now() WHERE id = $1`, [req.params.id]);
    await client.query(
      `UPDATE container_pipeline_steps SET status = 'DONE', "dateDone" = $1, "agentResponsibleId" = $2, "updatedAt" = now()
       WHERE "containerId" = $3 AND "stepNumber" = 10`,
      [d.dateRetourVide, req.user!.sub, req.params.id]
    );

    // Remplissage automatique du journal hebdomadaire du chauffeur — c'est
    // précisément ce qui manquait sur le papier : le retour est maintenant
    // tracé immédiatement, sans effort supplémentaire du chauffeur.
    if (isSelfFiled) {
      const reportId = await findOrCreateCurrentReport(client, req.user!.sub, req.user!.name);
      await client.query(
        `INSERT INTO trip_log_entries
          (id, "reportId", date, client, "noConteneurBL", "typeConteneur", depart, destination, "kmParcourus", "carburantL", "fraisRoute", source)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, 0, 0, $8, 'RETOUR_CONTENEUR')`,
        [
          reportId, d.dateRetourVide, 'Retour Conteneur Vide',
          existing.rows[0].containerNumber || existing.rows[0].blNumber,
          existing.rows[0].size === '40' ? '40' : '20',
          'Site de livraison', d.depotRetour, d.fraisRetourFCFA,
        ]
      );
    }
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

  // Détention réelle côté client : du jour où le conteneur a été livré
  // (preuve de livraison) jusqu'au jour où sa vie est terminée (retour) —
  // c'est la période qui compte vraiment pour la détention/surestarie,
  // distincte du temps administratif avant livraison.
  let joursDetentionClient: number | null = null;
  let dateLivraisonClient: string | null = null;
  if (full.pod.length > 0) {
    const earliestPod = [...full.pod].sort(
      (a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    )[0];
    dateLivraisonClient = earliestPod.dateTime;
    const livraisonAt = new Date(earliestPod.dateTime);
    const referenceAt = full.closedAt ? new Date(full.closedAt) : new Date();
    joursDetentionClient = Math.max(0, Math.round((referenceAt.getTime() - livraisonAt.getTime()) / 86_400_000));
  }

  // Suivi de détention : combien de jours au-delà (ou avant) la date limite
  // de retour — directement lié au problème de coûts de détention non maîtrisés.
  let detentionJours: number | null = null;
  let detentionStatut: 'DANS_LES_DELAIS' | 'EN_RETARD' | 'NON_DEFINI' = 'NON_DEFINI';
  if (full.dateLimiteRetour) {
    const limite = new Date(full.dateLimiteRetour);
    const reference = full.closedAt ? new Date(full.closedAt) : new Date();
    detentionJours = Math.round((reference.getTime() - limite.getTime()) / 86_400_000);
    detentionStatut = detentionJours > 0 ? 'EN_RETARD' : 'DANS_LES_DELAIS';
  }

  const dutyStep = full.steps.find((s: any) => s.stepNumber === 3);
  const montantDroitsTaxes = Number(dutyStep?.details?.montantFCFA ?? 0);
  const montantFraisRetour = Number(full.return?.fraisRetourFCFA ?? 0);
  const montantFraisDepot = Number(full.fraisDepotFCFA ?? 0);
  const montantFraisSupplementaires = Number(full.fraisSupplementairesFCFA ?? 0);

  const carrierLabel =
    full.carrierType === 'CHAUFFEUR_INTERNE'
      ? full.driverNom || 'Chauffeur interne (non renseigné)'
      : full.carrierType === 'SOUS_TRAITANT'
      ? `${full.subcontractorNom || 'Sous-traitant'} (${full.subcontractorEntreprise || 'société non renseignée'})`
      : 'Non assigné';

  const carrierTelephone =
    full.carrierType === 'CHAUFFEUR_INTERNE'
      ? full.driverTelephone || null
      : full.carrierType === 'SOUS_TRAITANT'
      ? full.subcontractorTelephone || null
      : null;

  // Le retour peut être fait par un chauffeur différent de celui qui a
  // livré (pool ouvert) — les deux sont donc rapportés séparément.
  const retourParLabel = full.return?.filledByNom || null;
  const retourParTelephone = full.return?.filledByTelephone || null;

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
      dateLimiteRetour: full.dateLimiteRetour,
      clientNom: full.clientNom,
      clientContact: full.clientContact,
      contenuDescription: full.contenuDescription,
      destinationDechargement: full.destinationDechargement,
    },
    detention: {
      jours: detentionJours,
      statut: detentionStatut,
    },
    isOuvert: full.status === 'OUVERT',
    dateOuverture: full.createdAt,
    dateFermeture: full.closedAt,
    totalDays,
    dateLivraisonClient,
    joursDetentionClient,
    carrier: {
      type: full.carrierType,
      label: carrierLabel,
      telephone: carrierTelephone,
    },
    retourPar: retourParLabel,
    retourParTelephone,
    incidents: full.incidents.map((inc: any) => ({
      id: inc.id,
      type: inc.type,
      description: inc.description,
      ancienChauffeurNom: inc.ancienChauffeurNom,
      nouveauChauffeurNom: inc.nouveauChauffeurNom,
      ancienCamion: inc.ancienCamion,
      nouveauCamion: inc.nouveauCamion,
      createdByNom: inc.createdByNom,
      createdAt: inc.createdAt,
    })),
    montantDroitsTaxesFCFA: montantDroitsTaxes,
    montantFraisRetourFCFA: montantFraisRetour,
    montantFraisDepotFCFA: montantFraisDepot,
    montantFraisSupplementairesFCFA: montantFraisSupplementaires,
    fraisSupplementairesNote: full.fraisSupplementairesNote ?? null,
    montantTotalFCFA: montantDroitsTaxes + montantFraisRetour + montantFraisDepot + montantFraisSupplementaires,
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
