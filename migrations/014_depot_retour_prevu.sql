-- Le dépôt de retour prévu peut être décidé une fois (à la création ou
-- lors de l'assignation) et réutilisé automatiquement au moment du retour
-- réel, plutôt que ressaisi à chaque fois avec un risque d'incohérence.
ALTER TABLE containers ADD COLUMN IF NOT EXISTS "depotRetourPrevu" TEXT;
