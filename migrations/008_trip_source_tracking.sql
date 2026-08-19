-- Distingue les trajets saisis manuellement par le chauffeur de ceux
-- remplis automatiquement par le système (POD, retour de conteneur) —
-- ces derniers ne doivent plus pouvoir être modifiés ou supprimés une
-- fois créés, pour garantir la fiabilité du suivi.
ALTER TABLE trip_log_entries ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'MANUEL';

-- Les entrées déjà créées automatiquement par le passé (liées à un POD)
-- sont ré-étiquetées correctement.
UPDATE trip_log_entries SET source = 'POD'
WHERE id IN (SELECT "linkedTripId" FROM pod_records WHERE "linkedTripId" IS NOT NULL);
