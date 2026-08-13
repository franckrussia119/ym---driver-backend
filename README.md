# YM-TRANSIT — Backend API

API REST pour YM-TRANSIT : authentification, rapports hebdomadaires, pannes &
atelier mécanique, registre de flotte, maintenance préventive, cautions de
conteneurs, analyse carburant, performance chauffeurs, et planification de
tournées (optimisation plus proche voisin + 2-opt).

> Ce backend a été construit et testé de bout en bout (authentification,
> verrouillage des rapports après envoi, workflow de panne à 4 étapes,
> moteur de planification) avant livraison. Voir `TESTING.md` pour le détail
> des scénarios vérifiés.

## Stack

- Node.js 20 + TypeScript + Express
- PostgreSQL (via `pg`, requêtes SQL paramétrées — pas d'ORM)
- JWT (access token 15 min + refresh token opaque stocké haché en base)
- bcrypt pour les mots de passe

## Lancer en local

**Prérequis :** Node.js 20+, PostgreSQL 16 accessible.

```bash
npm install
cp .env.example .env   # puis renseignez DATABASE_URL et JWT_SECRET
npm run migrate        # applique migrations/001_init.sql
npm run seed           # crée les 5 comptes de démonstration
npm run dev            # démarre sur http://localhost:4000
```

## Comptes de démonstration (créés par `npm run seed`)

| Rôle | Email | Mot de passe |
|---|---|---|
| Super Admin | superadmin@ym-transit.com | admin123 |
| Admin | admin@ym-transit.com | admin123 |
| Superviseur | superviseur@ym-transit.com | super123 |
| Mécanicien | mecanicien@ym-transit.com | mech123 |
| Chauffeur | chauffeur@ym-transit.com | driver123 |

**À changer immédiatement en production** (Super Admin → gestion des
utilisateurs → réinitialiser mot de passe).

## Déploiement sur Coolify

1. Poussez ce dépôt sur GitHub.
2. Dans Coolify, créez une nouvelle **Application** à partir de ce dépôt,
   branche `main`. Coolify détecte `docker-compose.yml` automatiquement
   (Build Pack : Docker Compose).
3. Renseignez les variables d'environnement (voir `.env.example`) dans
   l'interface Coolify : `POSTGRES_PASSWORD`, `JWT_SECRET` (générez une
   valeur forte, ex. `openssl rand -hex 32`), et `CORS_ORIGIN` avec l'URL
   exacte de votre frontend une fois déployé.
4. Déployez. Le conteneur `backend` applique automatiquement les migrations
   au démarrage (`node dist/migrate.js && node dist/index.js`).
5. Une fois en ligne, exécutez le seed une seule fois via le terminal
   Coolify du service `backend` :
   ```bash
   node dist/seed.js
   ```
6. Le endpoint de santé `/health` doit répondre `{"status":"ok"}`.

## Endpoints principaux

Toutes les routes sous `/api/*` (sauf `/api/auth/login`) nécessitent un
header `Authorization: Bearer <accessToken>`.

- `POST /api/auth/login`, `/refresh`, `/logout`, `GET /me`
- `GET/POST/PATCH /api/users` — Super Admin uniquement
- `GET/POST/PATCH /api/reports` — création, verrouillage à l'envoi
- `GET/POST /api/faults`, `POST /api/faults/:id/advance` — workflow à 4 étapes
- `GET/POST /api/invoices` — factures atelier avec pièces détachées
- `GET/POST/PATCH /api/vehicles`, `POST /api/vehicles/:id/documents`
- `GET/POST /api/maintenance/plans`, `/scheduled`
- `GET/POST /api/cautions`, `POST /api/cautions/:id/return`, `/lost`
- `GET/POST /api/fuel` — détection d'anomalie automatique
- `GET /api/performance`, `POST /api/performance/recompute`
- `GET/POST /api/route-planning/plans` — moteur de planification réel
- `GET/POST /api/pod`, `/api/feedback`
- `POST /api/uploads` — upload de fichier (photo, signature, document)

## Notes de conception

- Les champs de statut/catégorie (gravité de défaut, statut de panne, type
  de document...) sont stockés en `TEXT` et validés côté API avec `zod`, en
  utilisant exactement les mêmes chaînes françaises que le frontend
  d'origine — pas de mapping enum à maintenir.
- `migrations/_reference_data_model.prisma.txt` documente le même schéma au
  format Prisma, à titre de référence lisible (le projet utilise du SQL brut
  en production, pas Prisma, pour éviter la dépendance aux binaires moteur
  téléchargés à l'installation).
