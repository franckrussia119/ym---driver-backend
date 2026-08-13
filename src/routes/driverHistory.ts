import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const driverHistoryRouter = Router();
driverHistoryRouter.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR'));

// Liste des chauffeurs avec un résumé rapide, pour l'écran de sélection
// de l'analyse par chauffeur (Admin/Superviseur).
driverHistoryRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u."isActive", u."camionAssigne",
            COUNT(DISTINCT wr.id)::int AS "totalRapports",
            COUNT(DISTINCT fd.id)::int AS "totalPannes"
     FROM users u
     LEFT JOIN weekly_reports wr ON wr."driverId" = u.id
     LEFT JOIN fault_declarations fd ON fd."chauffeurId" = u.id
     WHERE u.role = 'CHAUFFEUR'
     GROUP BY u.id
     ORDER BY u.name ASC`
  );
  res.json(rows);
});

// Vue consolidée d'un chauffeur : toutes ses activités (rapports, pannes,
// preuves de livraison, cautions, carburant) + un résumé chiffré de
// performance, pour l'écran d'analyse par chauffeur de l'administration.
driverHistoryRouter.get('/:id', async (req, res) => {
  const driverId = req.params.id;

  const userRes = await pool.query(
    `SELECT id, name, email, role, "isActive", "camionAssigne", "createdAt"
     FROM users WHERE id = $1`,
    [driverId]
  );
  const driver = userRes.rows[0];
  if (!driver) return res.status(404).json({ error: 'Chauffeur introuvable' });

  const [reports, faults, pod, invoices, cautions, fuel, scores, tripAgg] = await Promise.all([
    pool.query(
      `SELECT id, "createdAt", "submittedAt", "isSubmitted", status, "semaineDu", "semaineAu", immatriculation
       FROM weekly_reports WHERE "driverId" = $1 ORDER BY "createdAt" DESC`,
      [driverId]
    ),
    pool.query(
      `SELECT id, "dateSignalement", status, categorie, "niveauUrgence", description, "createdAt"
       FROM fault_declarations WHERE "chauffeurId" = $1 ORDER BY "createdAt" DESC`,
      [driverId]
    ),
    pool.query(
      `SELECT id, "blNumber", "containerNumber", "clientName", status, "dateTime", "createdAt"
       FROM pod_records WHERE "driverName" = $1 ORDER BY "createdAt" DESC`,
      [driver.name]
    ),
    pool.query(
      `SELECT id, "dateIntervention", "totalTTC", status, "createdAt"
       FROM mechanic_invoices WHERE "chauffeurNom" = $1 ORDER BY "createdAt" DESC`,
      [driver.name]
    ),
    pool.query(
      `SELECT id, "noConteneurBL", status, "montantCautionFCFA", "montantPenaliteFCFA", "dateLimiteRetour"
       FROM container_cautions WHERE "chauffeurNom" = $1 ORDER BY "createdAt" DESC`,
      [driver.name]
    ),
    pool.query(
      `SELECT id, date, "consommationReelleL100", "consommationRefL100", "anomalieDetectee", "typeAnomalie"
       FROM fuel_analysis_entries WHERE "chauffeurNom" = $1 ORDER BY date DESC`,
      [driver.name]
    ),
    pool.query(
      `SELECT periode, "scoreGlobalPct", "ponctualitePct", "moyenneConsoL100", rang
       FROM driver_performance_scores WHERE "chauffeurId" = $1 ORDER BY periode DESC LIMIT 6`,
      [driverId]
    ),
    pool.query(
      `SELECT
         COUNT(t.id)::int AS "totalTrajets",
         COALESCE(SUM(t."kmParcourus"), 0) AS "totalKm",
         COALESCE(SUM(t."fraisRoute"), 0) AS "totalFraisRouteFCFA",
         COALESCE(SUM(t."carburantL"), 0) AS "totalCarburantL"
       FROM trip_log_entries t
       JOIN weekly_reports wr ON wr.id = t."reportId"
       WHERE wr."driverId" = $1`,
      [driverId]
    ),
  ]);

  const defectsRes = await pool.query(
    `SELECT count(*)::int AS n FROM inspection_defect_items idi
     JOIN weekly_reports wr ON wr.id = idi."reportId"
     WHERE wr."driverId" = $1 AND idi.constate = true`,
    [driverId]
  );

  const cautionsLate = cautions.rows.filter((c) =>
    ['En retard - Pénalité', 'Caution perdue'].includes(c.status)
  ).length;
  const fuelAnomalies = fuel.rows.filter((f) => f.anomalieDetectee).length;

  res.json({
    driver,
    summary: {
      totalRapports: reports.rows.length,
      rapportsSoumis: reports.rows.filter((r) => r.isSubmitted).length,
      totalPannes: faults.rows.length,
      pannesEnCours: faults.rows.filter((f) => f.status !== 'Clôturée par superviseur').length,
      totalDefautsConstates: defectsRes.rows[0].n,
      totalLivraisons: pod.rows.length,
      totalTrajets: tripAgg.rows[0].totalTrajets,
      totalKm: Number(tripAgg.rows[0].totalKm),
      totalFraisRouteFCFA: Number(tripAgg.rows[0].totalFraisRouteFCFA),
      totalCarburantL: Number(tripAgg.rows[0].totalCarburantL),
      cautionsEnRetard: cautionsLate,
      anomaliesCarburant: fuelAnomalies,
      dernierScoreGlobalPct: scores.rows[0]?.scoreGlobalPct ?? null,
      dernierRang: scores.rows[0]?.rang ?? null,
    },
    reports: reports.rows,
    faults: faults.rows,
    pod: pod.rows,
    invoices: invoices.rows,
    cautions: cautions.rows,
    fuelEntries: fuel.rows,
    scoreHistory: scores.rows,
  });
});
