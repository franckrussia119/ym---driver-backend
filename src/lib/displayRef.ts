// Affiche le numéro de référence lisible d'un document (ex: "PANNE-20260818-114037-EGHC").
// Si le document a été créé avant l'ajout de cette fonctionnalité (donc sans
// numeroReference en base), on retombe sur une version courte et lisible de
// l'identifiant technique plutôt que de laisser un champ vide ou "null".
export function displayRef(numeroReference: string | null | undefined, id: string): string {
  if (numeroReference) return numeroReference;
  return `#${id.slice(0, 8).toUpperCase()}`;
}
