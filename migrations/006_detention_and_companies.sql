-- ============================================================
-- 1. SUIVI DE LA DÉTENTION / SURESTARIE
-- Directement lié au problème métier : coûts de détention au port
-- non maîtrisés faute de suivi des retours de conteneurs.
-- ============================================================
ALTER TABLE containers ADD COLUMN IF NOT EXISTS "dateLimiteRetour" TEXT;

-- ============================================================
-- 2. RESTRUCTURATION SOUS-TRAITANTS : société + chauffeurs
-- Avant : une seule table plate (nom, société en texte libre).
-- Après : une société sous-traitante peut avoir plusieurs chauffeurs.
-- ============================================================
CREATE TABLE IF NOT EXISTS subcontractor_companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  adresse TEXT,
  "contactNom" TEXT,
  notes TEXT,
  "createdById" TEXT NOT NULL REFERENCES users(id),
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- Migre les données existantes : crée une société pour chaque valeur
-- distincte de l'ancien champ "nomEntreprise" (ou une société par défaut
-- si aucune société n'était renseignée), puis relie chaque chauffeur.
DO $$
DECLARE
  default_creator TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subcontractor_drivers' AND column_name = 'nomEntreprise') THEN
    SELECT id INTO default_creator FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN') ORDER BY "createdAt" ASC LIMIT 1;

    IF default_creator IS NOT NULL THEN
      INSERT INTO subcontractor_companies (id, nom, "createdById")
      SELECT gen_random_uuid()::text, COALESCE(NULLIF(TRIM(sd."nomEntreprise"), ''), 'Société non renseignée'), sd."createdById"
      FROM subcontractor_drivers sd
      GROUP BY COALESCE(NULLIF(TRIM(sd."nomEntreprise"), ''), 'Société non renseignée'), sd."createdById"
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

ALTER TABLE subcontractor_drivers ADD COLUMN IF NOT EXISTS "companyId" TEXT REFERENCES subcontractor_companies(id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subcontractor_drivers' AND column_name = 'nomEntreprise') THEN
    UPDATE subcontractor_drivers sd
    SET "companyId" = sc.id
    FROM subcontractor_companies sc
    WHERE sc.nom = COALESCE(NULLIF(TRIM(sd."nomEntreprise"), ''), 'Société non renseignée')
      AND sc."createdById" = sd."createdById"
      AND sd."companyId" IS NULL;
  END IF;
END $$;

-- Informations personnelles du chauffeur, en plus de ce qui existait déjà.
ALTER TABLE subcontractor_drivers ADD COLUMN IF NOT EXISTS "numeroPermis" TEXT;
ALTER TABLE subcontractor_drivers ADD COLUMN IF NOT EXISTS adresse TEXT;
