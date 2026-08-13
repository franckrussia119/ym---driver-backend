import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { optimizeRoute, Waypoint } from '../lib/routeOptimizer.js';

export const routePlanningRouter = Router();
routePlanningRouter.use(requireAuth);

// Ports de départ par défaut — point de départ des tournées.
const DEPOTS: Record<string, { lat: number; lng: number }> = {
  'Douala Port': { lat: 4.0483, lng: 9.7043 },
  'Kribi Port': { lat: 2.9333, lng: 9.9167 },
};

const orderSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  demandType: z.enum(['LIVRAISON', 'ENLEVEMENT', 'DEPOT_VIDE']),
  adresse: z.string(),
  isHazmat: z.boolean().default(false),
});

const planRequestSchema = z.object({
  dateExecution: z.string(),
  depot: z.enum(['Douala Port', 'Kribi Port']).default('Douala Port'),
  orders: z.array(orderSchema).min(1),
  vehicleIds: z.array(z.string()).min(1),
});

routePlanningRouter.get('/plans', async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM route_plans ORDER BY "createdAt" DESC`);
  res.json(rows);
});

routePlanningRouter.get('/plans/:id', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM route_plans WHERE id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Plan introuvable' });
  const assignments = await pool.query(
    `SELECT ra.*, u.name AS "driverName", fv.immatriculation
     FROM route_assignments ra
     JOIN users u ON u.id = ra."driverId"
     JOIN fleet_vehicles fv ON fv.id = ra."vehicleId"
     WHERE ra."routePlanId" = $1 ORDER BY ra."orderIndex" ASC`,
    [req.params.id]
  );
  res.json({ ...rows[0], assignments: assignments.rows });
});

// Lance l'algorithme de planification automatisée : répartit les commandes
// entre les camions disponibles (en respectant l'habilitation matières
// dangereuses), puis optimise l'ordre des arrêts de chaque camion.
routePlanningRouter.post('/plans', requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR'), async (req, res) => {
  const parsed = planRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' });
  }
  const d = parsed.data;
  const depotCoords = DEPOTS[d.depot];

  const { rows: vehicles } = await pool.query(
    `SELECT fv.id, fv.immatriculation, fv."consommationReferenceL100", fv."habiliteMatieresDangereuses",
            fv."chauffeurHabituelId", u.id AS "driverId", u.name AS "driverName",
            u."habiliteMatieresDangereuses" AS "driverHazmat"
     FROM fleet_vehicles fv
     LEFT JOIN users u ON u.id = fv."chauffeurHabituelId"
     WHERE fv.id = ANY($1::text[]) AND fv.statut = 'En service'`,
    [d.vehicleIds]
  );

  const usableVehicles = vehicles.filter((v) => v.driverId); // il faut un chauffeur habituel assigné
  if (usableVehicles.length === 0) {
    return res.status(400).json({
      error: "Aucun des véhicules sélectionnés n'a de chauffeur assigné dans le registre de flotte",
    });
  }

  const hazmatOrders = d.orders.filter((o) => o.isHazmat);
  const normalOrders = d.orders.filter((o) => !o.isHazmat);

  const hazmatVehicles = usableVehicles.filter((v) => v.habiliteMatieresDangereuses && v.driverHazmat);
  if (hazmatOrders.length > 0 && hazmatVehicles.length === 0) {
    return res.status(400).json({
      error:
        "Des commandes matières dangereuses sont présentes mais aucun véhicule/chauffeur sélectionné n'est habilité",
    });
  }

  // Répartition round-robin simple : matières dangereuses uniquement vers les
  // véhicules habilités, le reste réparti sur tous les véhicules disponibles.
  const buckets = new Map<string, Waypoint[]>();
  usableVehicles.forEach((v) => buckets.set(v.id, []));

  hazmatOrders.forEach((o, idx) => {
    const v = hazmatVehicles[idx % hazmatVehicles.length];
    buckets.get(v.id)!.push(o);
  });
  normalOrders.forEach((o, idx) => {
    const v = usableVehicles[idx % usableVehicles.length];
    buckets.get(v.id)!.push(o);
  });

  const planId = await withTransaction(async (client) => {
    let totalDistanceKm = 0;
    let totalFuelL = 0;

    const { rows: planRows } = await client.query(
      `INSERT INTO route_plans (id, "createdById", "dateExecution", statut, "totalDistanceKm", "estimatedDurationHours", "estimatedFuelL")
       VALUES (gen_random_uuid()::text, $1, $2, 'BROUILLON', 0, 0, 0) RETURNING id`,
      [req.user!.sub, d.dateExecution]
    );
    const planId = planRows[0].id;

    let orderIndex = 0;
    for (const v of usableVehicles) {
      const orders = buckets.get(v.id) ?? [];
      if (orders.length === 0) continue;

      const { orderedWaypoints, totalDistanceKm: dist } = optimizeRoute(depotCoords, orders);
      const durationH = dist / 45; // vitesse moyenne estimée 45 km/h (routes + trafic)
      const fuelL = (dist / 100) * (v.consommationReferenceL100 ?? 35);

      totalDistanceKm += dist;
      totalFuelL += fuelL;

      await client.query(
        `INSERT INTO route_assignments (id, "routePlanId", "vehicleId", "driverId", "orderIndex", waypoints, "distanceKm", "durationH")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7)`,
        [planId, v.id, v.driverId, orderIndex++, JSON.stringify(orderedWaypoints), dist, durationH]
      );
    }

    const totalDurationH = totalDistanceKm / 45;
    await client.query(
      `UPDATE route_plans SET "totalDistanceKm" = $1, "estimatedDurationHours" = $2, "estimatedFuelL" = $3 WHERE id = $4`,
      [totalDistanceKm, totalDurationH, totalFuelL, planId]
    );

    return planId;
  });

  const { rows } = await pool.query(`SELECT * FROM route_plans WHERE id = $1`, [planId]);
  const assignments = await pool.query(
    `SELECT ra.*, u.name AS "driverName", fv.immatriculation
     FROM route_assignments ra JOIN users u ON u.id = ra."driverId" JOIN fleet_vehicles fv ON fv.id = ra."vehicleId"
     WHERE ra."routePlanId" = $1 ORDER BY ra."orderIndex" ASC`,
    [planId]
  );
  res.status(201).json({ ...rows[0], assignments: assignments.rows });
});

const statutSchema = z.object({ statut: z.enum(['BROUILLON', 'VALIDE', 'EN_COURS', 'TERMINE']) });

routePlanningRouter.patch('/plans/:id/statut', requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR'), async (req, res) => {
  const parsed = statutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Statut invalide' });
  const { rows } = await pool.query(`UPDATE route_plans SET statut = $1 WHERE id = $2 RETURNING *`, [parsed.data.statut, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Plan introuvable' });
  res.json(rows[0]);
});

// Tournées assignées au chauffeur actuellement connecté (vue mobile).
routePlanningRouter.get('/my-assignments', requireRole('CHAUFFEUR'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ra.*, rp."dateExecution", rp.statut AS "planStatut"
     FROM route_assignments ra JOIN route_plans rp ON rp.id = ra."routePlanId"
     WHERE ra."driverId" = $1 AND rp.statut IN ('VALIDE','EN_COURS')
     ORDER BY rp."dateExecution" DESC`,
    [req.user!.sub]
  );
  res.json(rows);
});
