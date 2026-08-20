-- Nos propres chauffeurs (comptes internes) n'avaient jamais de numéro de
-- téléphone enregistré — contrairement aux chauffeurs sous-traitants, qui
-- en ont un depuis le début. Nécessaire pour l'afficher sur le rapport final.
ALTER TABLE users ADD COLUMN IF NOT EXISTS telephone TEXT;
