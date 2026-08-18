-- ============================================================
-- MODULE GESTION DES CONTENEURS
-- Nouveau rôle "Superviseur Conteneurs" + tout le schéma associé :
-- registre des sous-traitants, conteneurs (avec cycle de vie),
-- pipeline en 10 étapes, coffre à documents, retour de conteneur,
-- et extension de la Preuve de Livraison pour les cas sous-traités.
-- ============================================================

-- Nouveau rôle. Ne peut pas être utilisé dans la même transaction
-- que celle qui l'ajoute — c'est pourquoi ce fichier ne fait
-- qu'ajouter la valeur, sans jamais l'utiliser plus bas.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPERVISEUR_CONTENEURS';

-- ------------------------------------------------------------
-- Chauffeurs sous-traitants : de simples fiches d'information,
-- PAS des comptes utilisateurs (ils n'ont jamais accès à l'app).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subcontractor_drivers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom TEXT NOT NULL,
  telephone TEXT,
  "nomEntreprise" TEXT,
  "immatriculationCamion" TEXT,
  notes TEXT,
  "createdById" TEXT NOT NULL REFERENCES users(id),
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Conteneurs : le "dossier de vie" central. Ouvert à la création,
-- fermé uniquement par l'enregistrement d'un retour (voir plus bas).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS containers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "numeroReference" TEXT UNIQUE,
  "blNumber" TEXT NOT NULL,
  port TEXT NOT NULL, -- 'Douala' | 'Kribi'
  terminal TEXT NOT NULL,
  "containerNumber" TEXT NOT NULL,
  size TEXT NOT NULL, -- '20' | '40'
  status TEXT NOT NULL DEFAULT 'OUVERT', -- 'OUVERT' | 'FERME'
  "carrierType" TEXT, -- 'CHAUFFEUR_INTERNE' | 'SOUS_TRAITANT' — défini à l'assignation
  "assignedDriverId" TEXT REFERENCES users(id),
  "assignedSubcontractorId" TEXT REFERENCES subcontractor_drivers(id),
  "createdById" TEXT NOT NULL REFERENCES users(id),
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "closedAt" TIMESTAMP,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_containers_status ON containers(status);
CREATE INDEX IF NOT EXISTS idx_containers_driver ON containers("assignedDriverId");

-- ------------------------------------------------------------
-- Pipeline : 10 lignes créées automatiquement pour chaque conteneur
-- à sa création. "details" porte les champs propres à chaque étape
-- (ex: numéro de déclaration, montant payé...) en JSON pour rester
-- flexible sans multiplier les tables.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS container_pipeline_steps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "containerId" TEXT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  "stepNumber" INT NOT NULL,
  "stepName" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'
  "dateDone" TEXT,
  "agentResponsibleId" TEXT REFERENCES users(id),
  notes TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE ("containerId", "stepNumber")
);

-- ------------------------------------------------------------
-- Coffre à documents par conteneur.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS container_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "containerId" TEXT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'BL_OBL' | 'BL_TELEX' | 'TICKET' | 'AUTRE'
  "fileUrl" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL REFERENCES users(id),
  "uploadedAt" TIMESTAMP NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'PENDING' -- 'PENDING' | 'RECEIVED' | 'VALIDATED'
);
CREATE INDEX IF NOT EXISTS idx_container_documents_container ON container_documents("containerId");

-- ------------------------------------------------------------
-- Retour du conteneur vide : soumettre ce formulaire FERME la vie
-- du conteneur (un seul retour possible par conteneur).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS container_returns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "containerId" TEXT NOT NULL UNIQUE REFERENCES containers(id) ON DELETE CASCADE,
  "dateRetourVide" TEXT NOT NULL,
  "depotRetour" TEXT NOT NULL,
  "photoUrl" TEXT,
  notes TEXT,
  "filledById" TEXT NOT NULL REFERENCES users(id),
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Extension de pod_records : permettre à un Superviseur Conteneurs
-- de remplir la Preuve de Livraison au nom d'un sous-traitant (qui
-- n'a pas de compte), et de lier une preuve à un conteneur précis.
-- ------------------------------------------------------------
ALTER TABLE pod_records ADD COLUMN IF NOT EXISTS "containerId" TEXT REFERENCES containers(id);
ALTER TABLE pod_records ADD COLUMN IF NOT EXISTS "subcontractorDriverId" TEXT REFERENCES subcontractor_drivers(id);
ALTER TABLE pod_records ADD COLUMN IF NOT EXISTS "filledById" TEXT REFERENCES users(id);
