-- Ajouts pour le nouveau flux "Preuve de Livraison" :
-- bordereau de livraison (remplace la signature), port de départ,
-- montant perçu, distance calculée, et lien direct au chauffeur (pour le
-- remplissage automatique du journal hebdomadaire).

ALTER TABLE pod_records ADD COLUMN IF NOT EXISTS "driverId" TEXT REFERENCES users(id);
ALTER TABLE pod_records ADD COLUMN IF NOT EXISTS "departurePort" TEXT; -- 'PAK' | 'PAD' | 'Autres'
ALTER TABLE pod_records ADD COLUMN IF NOT EXISTS "departurePortAutre" TEXT;
ALTER TABLE pod_records ADD COLUMN IF NOT EXISTS "bordereauPhotoUrl" TEXT;
ALTER TABLE pod_records ADD COLUMN IF NOT EXISTS "montantRecuFCFA" DOUBLE PRECISION;
ALTER TABLE pod_records ADD COLUMN IF NOT EXISTS "distanceKm" DOUBLE PRECISION;
ALTER TABLE pod_records ADD COLUMN IF NOT EXISTS "linkedReportId" TEXT REFERENCES weekly_reports(id);
ALTER TABLE pod_records ADD COLUMN IF NOT EXISTS "linkedTripId" TEXT REFERENCES trip_log_entries(id);

CREATE INDEX IF NOT EXISTS idx_pod_driver ON pod_records("driverId");
