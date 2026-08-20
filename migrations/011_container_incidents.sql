CREATE TABLE IF NOT EXISTS container_incidents (
  id TEXT PRIMARY KEY,
  "containerId" TEXT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('PANNE', 'TRANSFERT', 'AUTRE')),
  description TEXT NOT NULL,
  "ancienChauffeurNom" TEXT,
  "nouveauChauffeurNom" TEXT,
  "ancienCamion" TEXT,
  "nouveauCamion" TEXT,
  "createdById" TEXT REFERENCES users(id),
  "createdByNom" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_container_incidents_container ON container_incidents("containerId");
