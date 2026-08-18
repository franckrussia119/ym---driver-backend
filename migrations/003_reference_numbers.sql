-- Numéros de référence lisibles (date + heure de création), en plus de
-- l'identifiant technique (UUID) déjà utilisé en clé primaire. Affichés à
-- la place de l'UUID brut partout où un "N°" ou "Dossier #" est montré à
-- l'utilisateur.

ALTER TABLE fault_declarations ADD COLUMN IF NOT EXISTS "numeroReference" TEXT UNIQUE;
ALTER TABLE mechanic_invoices ADD COLUMN IF NOT EXISTS "numeroReference" TEXT UNIQUE;
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS "numeroReference" TEXT UNIQUE;
ALTER TABLE container_cautions ADD COLUMN IF NOT EXISTS "numeroReference" TEXT UNIQUE;
ALTER TABLE scheduled_maintenance ADD COLUMN IF NOT EXISTS "numeroReference" TEXT UNIQUE;
ALTER TABLE maintenance_plan_items ADD COLUMN IF NOT EXISTS "numeroReference" TEXT UNIQUE;
