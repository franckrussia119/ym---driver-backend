import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const performanceRouter = Router();
performanceRouter.use(requireAuth);

performanceRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM driver_performance_scores ORDER BY rang ASC`);
  res.json(rows);
});

// Recalcule les scores de tous les chauffeurs pour une période donnée
// (ex: '2026-08') à partir des données déjà en base — pas de saisie manuelle.
performanceRouter.post('/recompute', requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERVISEUR'), async (req, res) => {
  const periode: string = req.body.periode;
  if (!periode) return res.status(400).json({ error: 'periode requise, ex: 2026-08' });

  const { rows: drivers } = await pool.query(`SELECT id, name FROM users WHERE role = 'CHAUFFEUR' AND "isActive" = true`);

  const computed = await Promise.all(
    drivers.map(async (driver) => {
      const trips = await pool.query(
        `SELECT SUM(t."kmParcourus") AS "totalKm", COUNT(*)::int AS "nombreTrajets"
         FROM trip_log_entries t JOIN weekly_reports wr ON wr.id = t."reportId"
         WHERE wr."driverId" = $1 AND to_char(wr."createdAt",'YYYY-MM') = $2`,
        [driver.id, periode]
      );
      const faults = await pool.query(
        `SELECT COUNT(*)::int AS n FROM fault_declarations WHERE "chauffeurId" = $1 AND to_char("createdAt",'YYYY-MM') = $2`,
        [driver.id, periode]
      );
      const fuel = await pool.query(
        `SELECT AVG(f."consommationReelleL100") AS avg
         FROM fuel_analysis_entries f JOIN trip_log_entries t ON t.id = f."tripId"
         JOIN weekly_reports wr ON wr.id = t."reportId"
         WHERE wr."driverId" = $1 AND to_char(wr."createdAt",'YYYY-MM') = $2`,
        [driver.id, periode]
      );
      const cautionsLate = await pool.query(
        `SELECT COUNT(*)::int AS n FROM container_cautions
         WHERE "chauffeurNom" = $1 AND status IN ('En retard - Pénalité','Caution perdue')
         AND to_char("dateLimiteRetour"::date, 'YYYY-MM') = $2`,
        [driver.name, periode]
      );
      const feedback = await pool.query(
        `SELECT AVG(rating) AS avg FROM customer_feedback_records
         WHERE "driverName" = $1 AND to_char(date::date, 'YYYY-MM') = $2`,
        [driver.name, periode]
      );

      const totalKm = Number(trips.rows[0].totalKm ?? 0);
      const nombreTrajets = Number(trips.rows[0].nombreTrajets ?? 0);
      const pannesSignaleesCount = Number(faults.rows[0].n ?? 0);
      const moyenneConsoL100 = Number(fuel.rows[0].avg ?? 0);
      const cautionsEnRetardCount = Number(cautionsLate.rows[0].n ?? 0);
      const noteClientMoyenne = Number(feedback.rows[0].avg ?? 0);

      // Score composite simple et transparent (0-100) : chaque signal pèse
      // pour une part fixe. Ajustable plus tard si besoin métier.
      const faultsPenalty = Math.min(pannesSignaleesCount * 5, 25);
      const cautionsPenalty = Math.min(cautionsEnRetardCount * 10, 30);
      const feedbackScore = noteClientMoyenne ? (noteClientMoyenne / 5) * 25 : 15; // neutre si pas d'avis
      const activityScore = nombreTrajets > 0 ? 20 : 0;
      const scoreGlobalPct = Math.max(
        0,
        Math.min(100, 30 + activityScore + feedbackScore - faultsPenalty - cautionsPenalty)
      );

      return {
        chauffeurId: driver.id,
        chauffeurNom: driver.name,
        periode,
        totalKm,
        nombreTrajets,
        ponctualitePct: 0, // nécessite les check-ins du module planification, calculé séparément
        moyenneConsoL100,
        pannesSignaleesCount,
        cautionsEnRetardCount,
        noteClientMoyenne,
        scoreGlobalPct,
      };
    })
  );

  computed.sort((a, b) => b.scoreGlobalPct - a.scoreGlobalPct);
  computed.forEach((c, idx) => ((c as any).rang = idx + 1));

  for (const c of computed) {
    await pool.query(
      `INSERT INTO driver_performance_scores
        (id, "chauffeurId", "chauffeurNom", periode, "totalKm", "nombreTrajets", "ponctualitePct",
         "moyenneConsoL100", "pannesSignaleesCount", "cautionsEnRetardCount", "noteClientMoyenne", "scoreGlobalPct", rang)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT ("chauffeurId", periode) DO UPDATE SET
         "totalKm" = $4, "nombreTrajets" = $5, "moyenneConsoL100" = $7, "pannesSignaleesCount" = $8,
         "cautionsEnRetardCount" = $9, "noteClientMoyenne" = $10, "scoreGlobalPct" = $11, rang = $12`,
      [
        c.chauffeurId, c.chauffeurNom, c.periode, c.totalKm, c.nombreTrajets, c.ponctualitePct,
        c.moyenneConsoL100, c.pannesSignaleesCount, c.cautionsEnRetardCount, c.noteClientMoyenne,
        c.scoreGlobalPct, (c as any).rang,
      ]
    );
  }

  res.json(computed);
});
