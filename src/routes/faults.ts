import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const faultsRouter = Router();
faultsRouter.use(requireAuth);

const FAULT_STATUSES = [
  'Signalée par chauffeur',
  'Transmise au mécanicien',
  'En cours de réparation',
  'Réparée — en attente de clôture',
  'Clôturée par superviseur',
] as const;

// Qui peut faire passer une panne de quel statut à quel statut suivant.
const ALLOWED_TRANSITIONS: Record<string, { next: string; roles: string[] }> = {
  'Signalée par chauffeur': { next: 'Transmise au mécanicien', roles: ['SUPERVISEUR', 'ADMIN', 'SUPER_ADMIN'] },
  'Transmise au mécanicien': { next: 'En cours de réparation', roles: ['MECANICIEN'] },
  'En cours de réparation': { next: 'Réparée — en attente de clôture', roles: ['MECANICIEN'] },
  'Réparée — en attente de clôture': { next: 'Clôturée par superviseur', roles: ['SUPERVISEUR', 'ADMIN', 'SUPER_ADMIN'] },
};

faultsRouter.get('/', async (req, res) => {
  const isDriver = req.user!.role === 'CHAUFFEUR';
  const isMechanic = req.user!.role === 'MECANICIEN';
  let query = `SELECT * FROM fault_declarations`;
  const params: unknown[] = [];
  if (isDriver) {
    query += ` WHERE "chauffeurId" = $1`;
    params.push(req.user!.sub);
  } else if (isMechanic) {
    query += ` WHERE status IN ('Transmise au mécanicien','En cours de réparation','Réparée — en attente de clôture')`;
  }
  query += ` ORDER BY "createdAt" DESC`;
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

faultsRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM fault_declarations WHERE id = $1`, [req.params.id]);
  const fault = rows[0];
  if (!fault) return res.status(404).json({ error: 'Panne introuvable' });
  if (req.user!.role === 'CHAUFFEUR' && fault.chauffeurId !== req.user!.sub) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  const history = await pool.query(
    `SELECT * FROM fault_history_entries WHERE "faultId" = $1 ORDER BY "timestamp" ASC`,
    [req.params.id]
  );
  res.json({ ...fault, history: history.rows });
});

const createFaultSchema = z.object({
  immatriculation: z.string(),
  niveauUrgence: z.enum(['Faible', 'Moyenne', 'Élevée / Immobilisation']),
  categorie: z.string(),
  description: z.string(),
  localisation: z.string(),
});

faultsRouter.post('/', requireRole('CHAUFFEUR'), async (req, res) => {
  const parsed = createFaultSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  }
  const d = parsed.data;

  const faultId = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO fault_declarations
        (id, "dateSignalement", "chauffeurId", "chauffeurNom", immatriculation, "niveauUrgence", categorie, description, localisation, status)
       VALUES (gen_random_uuid()::text, to_char(now(), 'YYYY-MM-DD'), $1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [req.user!.sub, req.user!.name, d.immatriculation, d.niveauUrgence, d.categorie, d.description, d.localisation, FAULT_STATUSES[0]]
    );
    const id = rows[0].id;
    await client.query(
      `INSERT INTO fault_history_entries (id, "faultId", "actorName", "actorRole", status)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4)`,
      [id, req.user!.name, req.user!.role, FAULT_STATUSES[0]]
    );
    return id;
  });

  const { rows } = await pool.query(`SELECT * FROM fault_declarations WHERE id = $1`, [faultId]);
  res.status(201).json(rows[0]);
});

const advanceSchema = z.object({ comment: z.string().optional() });

// Fait avancer une panne à l'étape suivante du workflow. Le statut cible
// n'est jamais fourni par le client : il est déterminé par le statut actuel,
// pour empêcher de sauter des étapes.
faultsRouter.post('/:id/advance', async (req, res) => {
  const parsed = advanceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Commentaire invalide' });

  const { rows } = await pool.query(`SELECT status FROM fault_declarations WHERE id = $1`, [req.params.id]);
  const fault = rows[0];
  if (!fault) return res.status(404).json({ error: 'Panne introuvable' });

  const transition = ALLOWED_TRANSITIONS[fault.status];
  if (!transition) {
    return res.status(409).json({ error: 'Cette panne est déjà à son statut final' });
  }
  if (!transition.roles.includes(req.user!.role)) {
    return res.status(403).json({ error: 'Votre rôle ne peut pas valider cette étape' });
  }

  await withTransaction(async (client) => {
    const noteColumn =
      transition.roles[0] === 'MECANICIEN' ? '"notesMecanicien"' : '"notesSuperviseur"';
    await client.query(
      `UPDATE fault_declarations SET status = $1, "updatedAt" = now()${
        parsed.data.comment ? `, ${noteColumn} = $3` : ''
      } WHERE id = $2`,
      parsed.data.comment
        ? [transition.next, req.params.id, parsed.data.comment]
        : [transition.next, req.params.id]
    );
    await client.query(
      `INSERT INTO fault_history_entries (id, "faultId", "actorName", "actorRole", status, comment)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)`,
      [req.params.id, req.user!.name, req.user!.role, transition.next, parsed.data.comment ?? null]
    );
  });

  const { rows: updated } = await pool.query(`SELECT * FROM fault_declarations WHERE id = $1`, [req.params.id]);
  res.json(updated[0]);
});

// Lie une facture atelier déjà créée à cette panne (utilisé par le mécanicien).
faultsRouter.put('/:id/invoice', requireRole('MECANICIEN', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const schema = z.object({ invoiceId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invoiceId requis' });

  const { rows } = await pool.query(
    `UPDATE fault_declarations SET "invoiceId" = $1, "updatedAt" = now() WHERE id = $2 RETURNING *`,
    [parsed.data.invoiceId, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Panne introuvable' });
  res.json(rows[0]);
});
