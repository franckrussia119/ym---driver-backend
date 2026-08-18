import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { withReferenceNumberRetry } from '../lib/referenceNumber.js';

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

const partSchema = z.object({
  name: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

const createInvoiceSchema = z.object({
  faultId: z.string().optional(),
  truckImmatriculation: z.string(),
  chauffeurNom: z.string().optional(),
  dateIntervention: z.string(),
  descriptionTravaux: z.string(),
  parts: z.array(partSchema).default([]),
  mainOeuvreHeures: z.number().nonnegative(),
  tauxHoraire: z.number().nonnegative(),
  tva: z.number().nonnegative().default(0),
  partsPhotoUrls: z.array(z.string()).default([]),
});

invoicesRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM mechanic_invoices ORDER BY "createdAt" DESC`);
  const withParts = await Promise.all(
    rows.map(async (inv) => {
      const parts = await pool.query(`SELECT * FROM spare_part_items WHERE "invoiceId" = $1`, [inv.id]);
      return { ...inv, parts: parts.rows };
    })
  );
  res.json(withParts);
});

invoicesRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM mechanic_invoices WHERE id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Facture introuvable' });
  const parts = await pool.query(`SELECT * FROM spare_part_items WHERE "invoiceId" = $1`, [req.params.id]);
  res.json({ ...rows[0], parts: parts.rows });
});

invoicesRouter.post('/', requireRole('MECANICIEN', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  }
  const d = parsed.data;

  const totalPieces = d.parts.reduce((sum, p) => sum + p.qty * p.unitPrice, 0);
  const totalMainOeuvre = d.mainOeuvreHeures * d.tauxHoraire;
  const totalHT = totalPieces + totalMainOeuvre;
  const totalTTC = totalHT * (1 + d.tva / 100);

  const invoiceId = await withReferenceNumberRetry('FACT', async (numeroReference) =>
    withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO mechanic_invoices
          (id, "numeroReference", "truckImmatriculation", "chauffeurNom", "mecanicienNom", "dateIntervention", "descriptionTravaux",
           "mainOeuvreHeures", "tauxHoraire", "totalPieces", "totalMainOeuvre", "totalHT", tva, "totalTTC",
           "partsPhotoUrls", status)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Brouillon')
         RETURNING id`,
        [
          numeroReference, d.truckImmatriculation, d.chauffeurNom ?? null, req.user!.name, d.dateIntervention, d.descriptionTravaux,
          d.mainOeuvreHeures, d.tauxHoraire, totalPieces, totalMainOeuvre, totalHT, d.tva, totalTTC, d.partsPhotoUrls,
        ]
      );
      const id = rows[0].id;
      for (const p of d.parts) {
        await client.query(
          `INSERT INTO spare_part_items (id, "invoiceId", name, qty, "unitPrice", total)
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)`,
          [id, p.name, p.qty, p.unitPrice, p.qty * p.unitPrice]
        );
      }
      if (d.faultId) {
        await client.query(`UPDATE fault_declarations SET "invoiceId" = $1 WHERE id = $2`, [id, d.faultId]);
      }
      return id;
    })
  );

  const { rows } = await pool.query(`SELECT * FROM mechanic_invoices WHERE id = $1`, [invoiceId]);
  const parts = await pool.query(`SELECT * FROM spare_part_items WHERE "invoiceId" = $1`, [invoiceId]);
  res.status(201).json({ ...rows[0], parts: parts.rows });
});

const statusSchema = z.object({ status: z.enum(['Brouillon', 'Transmis Administration', 'Payé']) });

invoicesRouter.patch('/:id/status', requireRole('ADMIN', 'SUPER_ADMIN', 'MECANICIEN'), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Statut invalide' });
  const { rows } = await pool.query(
    `UPDATE mechanic_invoices SET status = $1 WHERE id = $2 RETURNING *`,
    [parsed.data.status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Facture introuvable' });
  res.json(rows[0]);
});
