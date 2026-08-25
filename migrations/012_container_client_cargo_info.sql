-- L'administration a besoin de savoir, dès l'enregistrement du conteneur :
-- à quel client il appartient, comment le joindre, ce qu'il contient, et
-- où la marchandise doit être déchargée.
ALTER TABLE containers ADD COLUMN IF NOT EXISTS "clientNom" TEXT;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS "clientContact" TEXT;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS "contenuDescription" TEXT;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS "destinationDechargement" TEXT;
