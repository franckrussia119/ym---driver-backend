# YM-TRANSIT — Rapport Hebdomadaire du Chauffeur & Gestion de Flotte

Application web (PWA) de gestion logistique pour YM-TRANSIT : rapports hebdomadaires
chauffeur, inspection véhicule (DVIR), pannes & atelier mécanique, registre de
flotte, maintenance préventive, suivi des cautions de conteneurs, planification de
tournées, analyse carburant et performance chauffeurs.

> **Stockage actuel : navigateur (localStorage).** Il n'y a pas encore de backend
> partagé — chaque utilisateur voit ses propres données locales. Un backend
> (PostgreSQL + API) sera ajouté dans une étape ultérieure une fois les
> fonctionnalités validées.

## Stack

- React 19 + TypeScript + Vite 6
- Tailwind CSS 4
- Lucide icons
- PWA (service worker + manifest, installable sur mobile)

## Lancer en local

**Prérequis :** Node.js 20+

```bash
npm install
npm run dev
```

L'app est servie sur `http://localhost:3000`.

## Build de production

```bash
npm run build
npm run preview   # pour tester le build localement
```

Le résultat est généré dans `dist/`.

## Déploiement Docker / Coolify

Un `Dockerfile` multi-stage (build Node puis service Nginx) est fourni à la racine
du projet.

### Build & run en local (test)

```bash
docker build -t ym-transit .
docker run -p 8080:80 ym-transit
```

L'app est alors accessible sur `http://localhost:8080`. Le endpoint `/healthz`
répond `200 ok` pour la vérification de santé du conteneur.

### Sur Coolify

1. Créer une nouvelle **Application** dans Coolify.
2. Source : ce dépôt GitHub, branche `main`.
3. Build Pack : **Dockerfile** (Coolify détecte automatiquement le `Dockerfile` à
   la racine).
4. Port exposé par le conteneur : **80**.
5. Aucune variable d'environnement obligatoire pour le moment (le build ne dépend
   d'aucune clé au moment de la compilation).
6. Déployer — Coolify build l'image et route le trafic vers le port 80 du
   conteneur.

## Comptes de démonstration

Les comptes utilisateurs actuels (chauffeur, mécanicien, superviseur/admin,
super admin) sont des données de démonstration stockées dans
`src/data/defaults.ts`, à remplacer par de vrais comptes une fois le backend
en place.
