-- Le camion/remorque habituel d'un chauffeur peut différer du véhicule
-- réellement utilisé pour CE trajet précis (panne, remplacement...) — on
-- capture donc l'un ET l'autre séparément. Le tarif convenu et les
-- documents requis sont nécessaires pour un Ordre de Transport complet,
-- imprimable et remis au chauffeur avant tout déplacement.
ALTER TABLE containers ADD COLUMN IF NOT EXISTS "immatriculationCamionTrajet" TEXT;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS "remorqueTrajet" TEXT;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS "tarifConvenuFCFA" NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS "documentsRequis" TEXT;
