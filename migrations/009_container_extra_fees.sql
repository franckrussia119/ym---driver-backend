-- Frais de dépôt (stockage/consignation) et frais supplémentaires divers —
-- jusqu'ici seuls les droits/taxes et les frais de retour étaient suivis,
-- laissant une partie réelle des coûts hors du rapport final.
ALTER TABLE containers ADD COLUMN IF NOT EXISTS "fraisDepotFCFA" NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS "fraisSupplementairesFCFA" NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS "fraisSupplementairesNote" TEXT;
