// Les 10 étapes fixes du pipeline conteneur. Créées automatiquement (statut
// PENDING) pour chaque nouveau conteneur. Le champ `detailsSchema` sert de
// documentation pour les champs attendus dans la colonne JSONB `details` de
// chaque étape — non appliqué strictement côté serveur, pour rester flexible.

export const CONTAINER_PIPELINE_STEPS = [
  { number: 1, name: 'Pré-arrivée', detailsSchema: ['manifesteDepose', 'blOriginalRecu'] },
  { number: 2, name: 'Déclaration Douanière (GUCE/CAMCIS)', detailsSchema: ['numeroDeclaration', 'dateDepot'] },
  { number: 3, name: 'Paiement Droits & Taxes', detailsSchema: ['montantFCFA', 'recuUrl', 'datePaiement'] },
  { number: 4, name: 'Vérification des Documents', detailsSchema: ['validationDouane', 'rendezVousScanner'] },
  { number: 5, name: 'Inspection Physique', detailsSchema: ['date', 'resultat', 'rapportUrl'] },
  { number: 6, name: 'Levée en Terminal', detailsSchema: ['ordreLeveeEmis', 'confirmationTerminal', 'ticketUrl'] },
  { number: 7, name: 'Sortie de Terminal (Gate-Out)', detailsSchema: ['dateHeureSortie'] },
  { number: 8, name: 'Transport Terrestre', detailsSchema: ['transporteurAssigne', 'immatriculationCamion', 'dateDepart'] },
  { number: 9, name: 'Livraison Finale', detailsSchema: ['dateLivraison', 'nomRecepteur', 'preuveLivraisonId'] },
  { number: 10, name: 'Retour de Conteneur', detailsSchema: ['dateRetourVide', 'depot'] },
] as const;

export type ContainerPipelineStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
