-- Frais engagés pour ramener le conteneur vide au port — doit apparaître
-- dans le rapport final du conteneur.
ALTER TABLE container_returns ADD COLUMN IF NOT EXISTS "fraisRetourFCFA" NUMERIC NOT NULL DEFAULT 0;

-- Accélère la requête "conteneurs disponibles au retour" (ouverts + ayant
-- déjà une preuve de livraison), utilisée par tous les chauffeurs.
CREATE INDEX IF NOT EXISTS idx_pod_records_container ON pod_records("containerId");
