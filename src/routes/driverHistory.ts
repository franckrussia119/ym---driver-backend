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
// Accepte des paramètres optionnels ?from=YYYY-MM-DD&to=YYYY-MM-DD pour
// filtrer l'analyse sur une période précise.
driverHistoryRouter.get('/:id', async (req, res) => {
  const driverId = req.params.id;
  const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
  const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;

  const userRes = await pool.query(
    `SELECT id, name, email, role, "isActive", "camionAssigne", "createdAt"
     FROM users WHERE id = $1`,
    [driverId]
  );
  const driver = userRes.rows[0];
  if (!driver) return res.status(404).json({ error: 'Chauffeur introuvable' });

  // Filtre de date générique : (createdAt >= from) AND (createdAt < to + 1 jour)
  const dateFilter = (column: string, params: unknown[]) => {
    let clause = '';
    if (from) { params.push(from); clause += ` AND ${column} >= $${params.length}`; }
    if (to) { params.push(to); clause += ` AND ${column} <= ($${params.length}::date + interval '1 day')`; }
    return clause;
  };

  const reportsParams: unknown[] = [driverId];
  const reportsClause = dateFilter('wr."createdAt"', reportsParams);
  const faultsParams: unknown[] = [driverId];
  const faultsClause = dateFilter('fd."createdAt"', faultsParams);
  const podParams: unknown[] = [driverId, driver.name];
  const podClause = dateFilter('pr."createdAt"', podParams);
  const invoicesParams: unknown[] = [driver.name];
  const invoicesClause = dateFilter('mi."createdAt"', invoicesParams);
  const cautionsParams: unknown[] = [driver.name];
  const cautionsClause = dateFilter('cc."createdAt"', cautionsParams);
  const fuelParams: unknown[] = [driver.name];
  const fuelClause = dateFilter('fae.date::timestamp', fuelParams);
  const tripParams: unknown[] = [driverId];
  const tripClause = dateFilter('wr."createdAt"', tripParams);
  const defectsParams: unknown[] = [driverId];
  const defectsClause = dateFilter('wr."createdAt"', defectsParams);

  const [reports, faults, pod, invoices, cautions, fuel, scores, tripAgg] = await Promise.all([
    pool.query(
      `SELECT wr.id, wr."createdAt", wr."submittedAt", wr."isSubmitted", wr.status, wr."semaineDu", wr."semaineAu", wr.immatriculation
       FROM weekly_reports wr WHERE wr."driverId" = $1 ${reportsClause} ORDER BY wr."createdAt" DESC`,
      reportsParams
    ),
    pool.query(
      `SELECT fd.id, fd."dateSignalement", fd.status, fd.categorie, fd."niveauUrgence", fd.description, fd."createdAt"
       FROM fault_declarations fd WHERE fd."chauffeurId" = $1 ${faultsClause} ORDER BY fd."createdAt" DESC`,
      faultsParams
    ),
    pool.query(
      `SELECT pr.id, pr."blNumber", pr."containerNumber", pr."clientName", pr.status, pr."dateTime", pr."createdAt",
              pr."departurePort", pr."departurePortAutre", pr."montantRecuFCFA", pr."distanceKm"
       FROM pod_records pr WHERE (pr."driverId" = $1 OR pr."driverName" = $2) ${podClause} ORDER BY pr."createdAt" DESC`,
      podParams
    ),
    pool.query(
      `SELECT mi.id, mi."dateIntervention", mi."totalTTC", mi.status, mi."createdAt"
       FROM mechanic_invoices mi WHERE mi."chauffeurNom" = $1 ${invoicesClause} ORDER BY mi."createdAt" DESC`,
      invoicesParams
    ),
    pool.query(
      `SELECT cc.id, cc."noConteneurBL", cc.status, cc."montantCautionFCFA", cc."montantPenaliteFCFA", cc."dateLimiteRetour"
       FROM container_cautions cc WHERE cc."chauffeurNom" = $1 ${cautionsClause} ORDER BY cc."createdAt" DESC`,
      cautionsParams
    ),
    pool.query(
      `SELECT fae.id, fae.date, fae."consommationReelleL100", fae."consommationRefL100", fae."anomalieDetectee", fae."typeAnomalie"
       FROM fuel_analysis_entries fae WHERE fae."chauffeurNom" = $1 ${fuelClause} ORDER BY fae.date DESC`,
      fuelParams
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
       WHERE wr."driverId" = $1 ${tripClause}`,
      tripParams
    ),
  ]);

  const defectsRes = await pool.query(
    `SELECT count(*)::int AS n FROM inspection_defect_items idi
     JOIN weekly_reports wr ON wr.id = idi."reportId"
     WHERE wr."driverId" = $1 AND idi.constate = true ${defectsClause}`,
    defectsParams
  );

  const cautionsLate = cautions.rows.filter((c) =>
    ['En retard - Pénalité', 'Caution perdue'].includes(c.status)
  ).length;
  const fuelAnomalies = fuel.rows.filter((f) => f.anomalieDetectee).length;
  const totalMontantRecuFCFA = pod.rows.reduce((sum, p) => sum + Number(p.montantRecuFCFA || 0), 0);
  const totalDistancePodKm = pod.rows.reduce((sum, p) => sum + Number(p.distanceKm || 0), 0);

  res.json({
    driver,
    periode: { from, to },
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
      totalMontantRecuFCFA,
      totalDistancePodKm,
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
