import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { reportsRouter } from './routes/reports.js';
import { faultsRouter } from './routes/faults.js';
import { invoicesRouter } from './routes/invoices.js';
import { vehiclesRouter } from './routes/vehicles.js';
import { maintenanceRouter } from './routes/maintenance.js';
import { cautionsRouter } from './routes/cautions.js';
import { fuelRouter } from './routes/fuel.js';
import { performanceRouter } from './routes/performance.js';
import { routePlanningRouter } from './routes/routePlanning.js';
import { driverHistoryRouter } from './routes/driverHistory.js';
import { podRouter } from './routes/pod.js';
import { feedbackRouter } from './routes/feedback.js';
import { uploadsRouter } from './routes/uploads.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Nécessaire derrière le proxy Traefik de Coolify : sans ceci, express-rate-limit
// ne peut pas identifier correctement les utilisateurs via X-Forwarded-For.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }));
// Les photos passent désormais par /api/uploads (multipart, fichier réel sur
// disque) plutôt que par du base64 intégré au JSON — cette limite reste
// basse intentionnellement pour éviter les abus, pas pour bloquer des photos.
app.use(express.json({ limit: '3mb' }));
app.use(morgan('tiny'));

// Anti brute-force sur la connexion : 20 tentatives / 15 min / IP.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth/login', loginLimiter);

// Limite générale de l'API pour éviter les abus.
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/uploads', express.static(process.env.UPLOAD_DIR ?? path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/faults', faultsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/cautions', cautionsRouter);
app.use('/api/fuel', fuelRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/route-planning', routePlanningRouter);
app.use('/api/driver-history', driverHistoryRouter);
app.use('/api/pod', podRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/uploads', uploadsRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({ error: 'Fichier ou requête trop volumineux. Réduisez la taille de la photo.' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Requête invalide (JSON mal formé).' });
  }
  if (err?.message === 'Type de fichier non autorisé') {
    return res.status(400).json({ error: err.message });
  }
  // Erreur inattendue : message générique côté client, détail complet dans
  // les logs serveur (ci-dessus) pour ne jamais exposer de détails internes
  // (ex: structure de la base de données) au navigateur.
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`YM-TRANSIT API démarrée sur le port ${port}`);
});
