import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { withReferenceNumberRetry } from '../lib/referenceNumber.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

const tripSchema = z.object({
  date: z.string(),
  client: z.string(),
  noConteneurBL: z.string(),
  typeConteneur: z.enum(['20', '40', 'Reefer', 'Autre']),
  depart: z.string(),
  destination: z.string(),
  kmParcourus: z.number(),
  carburantL: z.number(),
  fraisRoute: z.number(),
});

const defectSchema = z.object({
  category: z.string(),
  name: z.string(),
  constate: z.boolean(),
  gravite: z.enum(['Mineure', 'Majeure', 'Critique']).optional(),
  actionPrise: z.enum(['Réparé sur place', 'Signalé au mécanicien', 'Immobilisation']).optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
});

const photoSchema = z.object({
  fileUrl: z.string(),
  caption: z.string().optional(),
  date: z.string(),
  fieldKey: z.string().optional(),
});

const voiceNoteSchema = z.object({
  fileUrl: z.string(),
  durationSeconds: z.number(),
  date: z.string(),
  transcription: z.string().optional(),
  fieldKey: z.string().optional(),
});

const reportUpsertSchema = z.object({
  semaineDu: z.string(),
  semaineAu: z.string(),
  nomChauffeur: z.string(),
  immatriculation: z.string(),
  marqueModele: z.string(),
  noRemorque: z.string(),
  driverPhotoUrl: z.string().nullable().optional(),
  truckPhotoUrl: z.string().nullable().optional(),
  trips: z.array(tripSchema).default([]),
  totalEnlevesPort: z.number().default(0),
  totalLivresDestinataire: z.number().default(0),
  conteneursVidesRetournes: z.number().default(0),
  aucunDefautConstate: z.boolean().default(false),
  defects: z.array(defectSchema).default([]),
  checklist: z.record(z.boolean()).default({}),
  mechanicVerifNom: z.string().optional(),
  mechanicVerifDate: z.string().optional(),
  itineraireTrafic: z.string().default(''),
  clientsDestinataires: z.string().default(''),
  suggestionsOperations: z.string().default(''),
  besoinsFormation: z.string().default(''),
  commentairesGeneraux: z.string().default(''),
  photos: z.array(photoSchema).default([]),
  voiceNotes: z.array(voiceNoteSchema).default([]),
});

async function fetchFullReport(reportId: string) {
  const { rows: reportRows } = await pool.query(`SELECT * FROM weekly_reports WHERE id = $1`, [reportId]);
  const report = reportRows[0];
  if (!report) return null;

  const [trips, defects, signatures, photos, voiceNotes] = await Promise.all([
    pool.query(`SELECT * FROM trip_log_entries WHERE "reportId" = $1 ORDER BY date`, [reportId]),
    pool.query(`SELECT * FROM inspection_defect_items WHERE "reportId" = $1`, [reportId]),
    pool.query(`SELECT * FROM report_signatures WHERE "reportId" = $1`, [reportId]),
    pool.query(`SELECT * FROM photo_evidence WHERE "reportId" = $1`, [reportId]),
    pool.query(`SELECT * FROM audio_notes WHERE "reportId" = $1`, [reportId]),
  ]);

  return {
    ...report,
    trips: trips.rows,
    defects: defects.rows,
    signatures: signatures.rows,
    photos: photos.rows,
    voiceNotes: voiceNotes.rows,
  };
}

// Liste : le chauffeur ne voit que ses propres rapports ; les autres rôles voient tout.
reportsRouter.get('/', async (req, res) => {
  const isDriver = req.user!.role === 'CHAUFFEUR';
  const { rows } = await pool.query(
    isDriver
      ? `SELECT wr.id, wr."createdAt", wr."submittedAt", wr."isSubmitted", wr.status, wr."nomChauffeur", wr.immatriculation, wr."semaineDu", wr."semaineAu",
                (SELECT COUNT(*)::int FROM trip_log_entries t WHERE t."reportId" = wr.id) AS "tripCount"
         FROM weekly_reports wr WHERE wr."driverId" = $1 ORDER BY wr."createdAt" DESC`
      : `SELECT wr.id, wr."createdAt", wr."submittedAt", wr."isSubmitted", wr.status, wr."nomChauffeur", wr.immatriculation, wr."semaineDu", wr."semaineAu",
                (SELECT COUNT(*)::int FROM trip_log_entries t WHERE t."reportId" = wr.id) AS "tripCount"
         FROM weekly_reports wr ORDER BY wr."createdAt" DESC`,
    isDriver ? [req.user!.sub] : []
  );
  res.json(rows);
});

reportsRouter.get('/:id', async (req, res) => {
  const report = await fetchFullReport(req.params.id);
  if (!report) return res.status(404).json({ error: 'Rapport introuvable' });
  if (req.user!.role === 'CHAUFFEUR' && report.driverId !== req.user!.sub) {
    return res.status(403).json({ error: 'Accès refusé à ce rapport' });
  }
  res.json(report);
});

reportsRouter.post('/', requireRole('CHAUFFEUR'), async (req, res) => {
  const parsed = reportUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  }
  const d = parsed.data;

  const reportId = await withReferenceNumberRetry('RAPP', async (numeroReference) =>
    withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO weekly_reports (
          id, "numeroReference", "driverId", "semaineDu", "semaineAu", "nomChauffeur", immatriculation, "marqueModele", "noRemorque",
          "driverPhotoUrl", "truckPhotoUrl",
          "totalEnlevesPort", "totalLivresDestinataire", "conteneursVidesRetournes",
          "aucunDefautConstate", checklist, "mechanicVerifNom", "mechanicVerifDate",
          "itineraireTrafic", "clientsDestinataires", "suggestionsOperations", "besoinsFormation", "commentairesGeneraux"
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) RETURNING id`,
        [
          numeroReference, req.user!.sub, d.semaineDu, d.semaineAu, d.nomChauffeur, d.immatriculation, d.marqueModele, d.noRemorque,
          d.driverPhotoUrl ?? null, d.truckPhotoUrl ?? null,
          d.totalEnlevesPort, d.totalLivresDestinataire, d.conteneursVidesRetournes,
          d.aucunDefautConstate, JSON.stringify(d.checklist), d.mechanicVerifNom ?? null, d.mechanicVerifDate ?? null,
          d.itineraireTrafic, d.clientsDestinataires, d.suggestionsOperations, d.besoinsFormation, d.commentairesGeneraux,
        ]
      );
      const id = rows[0].id;
      await insertNestedRows(client, id, d);
      return id;
    })
  );

  const full = await fetchFullReport(reportId);
  res.status(201).json(full);
});

reportsRouter.patch('/:id', requireRole('CHAUFFEUR'), async (req, res) => {
  const existing = await pool.query(`SELECT "driverId", "isSubmitted" FROM weekly_reports WHERE id = $1`, [req.params.id]);
  const current = existing.rows[0];
  if (!current) return res.status(404).json({ error: 'Rapport introuvable' });
  if (current.driverId !== req.user!.sub) return res.status(403).json({ error: 'Accès refusé' });
  if (current.isSubmitted) {
    return res.status(423).json({ error: 'Ce rapport a déjà été envoyé et ne peut plus être modifié' });
  }

  const parsed = reportUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  }
  const d = parsed.data;

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE weekly_reports SET
        "semaineDu" = $1, "semaineAu" = $2, "nomChauffeur" = $3, immatriculation = $4,
        "marqueModele" = $5, "noRemorque" = $6, "driverPhotoUrl" = $7, "truckPhotoUrl" = $8,
        "totalEnlevesPort" = $9, "totalLivresDestinataire" = $10,
        "conteneursVidesRetournes" = $11, "aucunDefautConstate" = $12, checklist = $13,
        "mechanicVerifNom" = $14, "mechanicVerifDate" = $15, "itineraireTrafic" = $16,
        "clientsDestinataires" = $17, "suggestionsOperations" = $18, "besoinsFormation" = $19,
        "commentairesGeneraux" = $20
       WHERE id = $21`,
      [
        d.semaineDu, d.semaineAu, d.nomChauffeur, d.immatriculation, d.marqueModele, d.noRemorque,
        d.driverPhotoUrl ?? null, d.truckPhotoUrl ?? null,
        d.totalEnlevesPort, d.totalLivresDestinataire, d.conteneursVidesRetournes,
        d.aucunDefautConstate, JSON.stringify(d.checklist), d.mechanicVerifNom ?? null, d.mechanicVerifDate ?? null,
        d.itineraireTrafic, d.clientsDestinataires, d.suggestionsOperations, d.besoinsFormation, d.commentairesGeneraux,
        req.params.id,
      ]
    );
    await client.query(`DELETE FROM trip_log_entries WHERE "reportId" = $1`, [req.params.id]);
    await client.query(`DELETE FROM inspection_defect_items WHERE "reportId" = $1`, [req.params.id]);
    await client.query(`DELETE FROM photo_evidence WHERE "reportId" = $1`, [req.params.id]);
    await client.query(`DELETE FROM audio_notes WHERE "reportId" = $1`, [req.params.id]);
    await insertNestedRows(client, req.params.id, d);
  });

  const full = await fetchFullReport(req.params.id);
  res.json(full);
});

async function insertNestedRows(
  client: import('pg').PoolClient,
  reportId: string,
  d: z.infer<typeof reportUpsertSchema>
) {
  for (const t of d.trips) {
    await client.query(
      `INSERT INTO trip_log_entries
        (id, "reportId", date, client, "noConteneurBL", "typeConteneur", depart, destination, "kmParcourus", "carburantL", "fraisRoute")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [reportId, t.date, t.client, t.noConteneurBL, t.typeConteneur, t.depart, t.destination, t.kmParcourus, t.carburantL, t.fraisRoute]
    );
  }
  for (const defect of d.defects) {
    if (!defect.constate) continue; // on ne stocke que les défauts effectivement constatés
    await client.query(
      `INSERT INTO inspection_defect_items (id, "reportId", category, name, constate, gravite, "actionPrise", date, notes)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8)`,
      [reportId, defect.category, defect.name, defect.constate, defect.gravite ?? null, defect.actionPrise ?? null, defect.date ?? null, defect.notes ?? null]
    );
  }
  for (const photo of d.photos) {
    await client.query(
      `INSERT INTO photo_evidence (id, "reportId", "fileUrl", caption, date, "fieldKey")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)`,
      [reportId, photo.fileUrl, photo.caption ?? null, photo.date, photo.fieldKey ?? null]
    );
  }
  for (const note of d.voiceNotes) {
    await client.query(
      `INSERT INTO audio_notes (id, "reportId", "fileUrl", "durationSeconds", date, transcription, "fieldKey")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6)`,
      [reportId, note.fileUrl, note.durationSeconds, note.date, note.transcription ?? null, note.fieldKey ?? null]
    );
  }
}

const signatureSchema = z.object({
  nom: z.string(),
  signature: z.string(),
  date: z.string(),
});

// Le chauffeur signe son propre rapport avant/à la soumission.
reportsRouter.put('/:id/signature/chauffeur', requireRole('CHAUFFEUR'), async (req, res) => {
  const existing = await pool.query(`SELECT "driverId", "isSubmitted" FROM weekly_reports WHERE id = $1`, [req.params.id]);
  const current = existing.rows[0];
  if (!current) return res.status(404).json({ error: 'Rapport introuvable' });
  if (current.driverId !== req.user!.sub) return res.status(403).json({ error: 'Accès refusé' });
  if (current.isSubmitted) return res.status(423).json({ error: 'Rapport déjà envoyé' });

  const parsed = signatureSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Signature invalide' });

  await upsertSignature(req.params.id, 'chauffeur', parsed.data);
  res.status(204).send();
});

// Le superviseur et l'administration signent après réception du rapport soumis.
reportsRouter.put('/:id/signature/:role(superviseur|logistique)', requireRole('SUPERVISEUR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const existing = await pool.query(`SELECT "isSubmitted" FROM weekly_reports WHERE id = $1`, [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Rapport introuvable' });
  if (!existing.rows[0].isSubmitted) {
    return res.status(400).json({ error: 'Le rapport doit être envoyé par le chauffeur avant validation' });
  }

  const parsed = signatureSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Signature invalide' });

  await upsertSignature(req.params.id, req.params.role, parsed.data);
  res.status(204).send();
});

async function upsertSignature(reportId: string, role: string, data: z.infer<typeof signatureSchema>) {
  await pool.query(
    `INSERT INTO report_signatures (id, "reportId", role, nom, signature, date)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)
     ON CONFLICT ("reportId", role) DO UPDATE SET nom = $3, signature = $4, date = $5`,
    [reportId, role, data.nom, data.signature, data.date]
  );
}

// Soumission : verrouille le rapport définitivement pour le chauffeur et
// l'envoie vers l'Administration / le Superviseur.
reportsRouter.post('/:id/submit', requireRole('CHAUFFEUR'), async (req, res) => {
  const existing = await pool.query(
    `SELECT "driverId", "isSubmitted", "aucunDefautConstate" FROM weekly_reports WHERE id = $1`,
    [req.params.id]
  );
  const current = existing.rows[0];
  if (!current) return res.status(404).json({ error: 'Rapport introuvable' });
  if (current.driverId !== req.user!.sub) return res.status(403).json({ error: 'Accès refusé' });
  if (current.isSubmitted) return res.status(423).json({ error: 'Ce rapport a déjà été envoyé' });

  const sig = await pool.query(
    `SELECT 1 FROM report_signatures WHERE "reportId" = $1 AND role = 'chauffeur'`,
    [req.params.id]
  );
  if (!sig.rows[0]) {
    return res.status(400).json({ error: 'La signature du chauffeur est requise avant l\'envoi' });
  }

  const defectCount = await pool.query(
    `SELECT count(*)::int AS n FROM inspection_defect_items WHERE "reportId" = $1 AND constate = true`,
    [req.params.id]
  );
  const status = defectCount.rows[0].n > 0 ? 'AVEC_DEFAUTS' : 'CONFORME';

  await pool.query(
    `UPDATE weekly_reports SET "isSubmitted" = true, "submittedAt" = now(), status = $1 WHERE id = $2`,
    [status, req.params.id]
  );

  const full = await fetchFullReport(req.params.id);
  res.json(full);
});
