import type { PoolClient } from 'pg';
import { generateReferenceNumber } from './referenceNumber.js';

// Lundi de la semaine courante, au format YYYY-MM-DD
export function mondayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = dimanche
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  return monday.toISOString().split('T')[0];
}

export function sundayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diffToSunday = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diffToSunday);
  return sunday.toISOString().split('T')[0];
}

// Trouve le rapport hebdomadaire "brouillon" en cours du chauffeur, ou en
// crée un nouveau pour la semaine courante s'il n'en existe pas. Utilisé à
// chaque fois qu'une action du chauffeur (POD, retour de conteneur...) doit
// se répercuter automatiquement dans son journal hebdomadaire.
export async function findOrCreateCurrentReport(client: PoolClient, driverId: string, driverName: string) {
  const existing = await client.query(
    `SELECT id FROM weekly_reports WHERE "driverId" = $1 AND "isSubmitted" = false ORDER BY "createdAt" DESC LIMIT 1`,
    [driverId]
  );
  if (existing.rows[0]) return existing.rows[0].id as string;

  const userRes = await client.query(`SELECT "camionAssigne" FROM users WHERE id = $1`, [driverId]);
  const camionAssigne: string | null = userRes.rows[0]?.camionAssigne ?? null;
  const camionParts = camionAssigne?.split('(') ?? [];
  const immatriculation = camionParts[0]?.trim() || '';
  const marqueModele = camionParts[1] ? camionParts[1].replace(')', '').trim() : '';

  const created = await client.query(
    `INSERT INTO weekly_reports (id, "numeroReference", "driverId", "semaineDu", "semaineAu", "nomChauffeur", immatriculation, "marqueModele", "noRemorque")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, '')
     RETURNING id`,
    [generateReferenceNumber('RAPP'), driverId, mondayOfCurrentWeek(), sundayOfCurrentWeek(), driverName, immatriculation, marqueModele]
  );
  return created.rows[0].id as string;
}
