import dotenv from 'dotenv';
import { pool } from './db.js';
import { hashPassword } from './lib/auth.js';

dotenv.config();

const DEMO_USERS = [
  { name: 'El Hadj Sylla', email: 'superadmin@ym-transit.com', role: 'SUPER_ADMIN', password: 'admin123' },
  { name: 'Marc Tremblay (Administration)', email: 'admin@ym-transit.com', role: 'ADMIN', password: 'admin123' },
  { name: 'Ousmane Sow (Superviseur Flotte)', email: 'superviseur@ym-transit.com', role: 'SUPERVISEUR', password: 'super123' },
  { name: 'Antoine Vasseur (Chef Atelier)', email: 'mecanicien@ym-transit.com', role: 'MECANICIEN', password: 'mech123' },
  { name: 'Fatou Ndiaye (Superviseur Conteneurs)', email: 'conteneurs@ym-transit.com', role: 'SUPERVISEUR_CONTENEURS', password: 'cont123' },
  { name: 'Jean-Marc Diallo', email: 'chauffeur@ym-transit.com', role: 'CHAUFFEUR', password: 'driver123', camionAssigne: 'AB-789-XY (Volvo FH 500)' },
];

async function seed() {
  console.log('Insertion des comptes de démonstration…');
  for (const u of DEMO_USERS) {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [u.email]);
    if (existing.rows[0]) {
      console.log(`⏭  ${u.email} existe déjà, ignoré`);
      continue;
    }
    const passwordHash = await hashPassword(u.password);
    await pool.query(
      `INSERT INTO users (id, name, email, "passwordHash", role, "camionAssigne")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)`,
      [u.name, u.email, passwordHash, u.role, (u as any).camionAssigne ?? null]
    );
    console.log(`✔  créé : ${u.email} (${u.role}) — mot de passe temporaire : ${u.password}`);
  }
  console.log('\n⚠  Changez ces mots de passe temporaires dès la première connexion en production.');
  await pool.end();
}

seed();
