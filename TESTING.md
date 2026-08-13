# Ce qui a été testé avant livraison

Ce backend n'a pas été livré "à l'aveugle" — chaque scénario ci-dessous a été
exécuté avec de vraies requêtes HTTP contre une vraie base PostgreSQL locale
avant d'être remis.

## Base de données
- Le schéma complet (23 tables) a été appliqué sans erreur.
- Insertion d'un utilisateur, d'un véhicule, d'un rapport hebdomadaire avec
  trajet + défaut + signature imbriqués, d'une panne liée à une facture
  atelier avec pièce détachée — jointures vérifiées sur toute la chaîne.
- Suppression en cascade vérifiée : supprimer un rapport supprime bien ses
  trajets associés (0 ligne orpheline).

## Authentification
- Connexion avec identifiants corrects → jeton JWT émis.
- Connexion avec mauvais mot de passe → 401, message générique (ne révèle
  pas si l'email existe).

## Rapport hebdomadaire (verrouillage à l'envoi)
- Création d'un brouillon avec trajet et défaut.
- Tentative d'envoi SANS signature chauffeur → rejetée (400).
- Ajout de la signature → autorisé.
- Envoi du rapport → accepté, statut recalculé automatiquement à
  `AVEC_DEFAUTS` (car un défaut était coché).
- Tentative de modification APRÈS envoi → rejetée (423 verrouillé), y
  compris en essayant de changer le nom du chauffeur.

## Workflow de panne (4 étapes)
- Chauffeur déclare une panne → statut `Signalée par chauffeur`.
- Le mécanicien tente de faire avancer le statut trop tôt → rejeté (403,
  mauvais rôle pour cette étape).
- Superviseur transmet au mécanicien → `Transmise au mécanicien`.
- Mécanicien démarre la réparation → `En cours de réparation`.
- Mécanicien termine → `Réparée — en attente de clôture`.
- Superviseur clôture → `Clôturée par superviseur`.
- Tentative de ré-avancer après clôture → rejetée (409, statut final).
- Historique complet horodaté vérifié : les 5 étapes apparaissent dans
  l'ordre avec le bon acteur et le bon rôle.

## Moteur de planification
- Testé isolément avec de vraies coordonnées GPS camerounaises (Douala,
  Yaoundé, Edéa, Bafoussam) : l'algorithme réduit une tournée de 632 km
  (ordre naïf) à 425 km (ordre optimisé).
- Testé via l'API complète avec un véhicule et un chauffeur réellement
  enregistrés en base : la tournée est assignée, optimisée, et la
  consommation carburant estimée à partir de la consommation de référence
  du véhicule.
- Commande matières dangereuses sans véhicule/chauffeur habilité disponible
  → rejetée (400) avant toute création de plan.

## Ce qui n'a PAS pu être testé ici
- `npx prisma generate` : bloqué car ce sandbox n'a pas accès à
  `binaries.prisma.sh`. C'est pourquoi le projet utilise du SQL brut (`pg`)
  en production plutôt que Prisma — zéro dépendance à un téléchargement de
  binaire au démarrage. Le schéma Prisma est conservé en référence
  documentaire uniquement.
- Déploiement réel sur Coolify / le VPS : impossible depuis ce sandbox (pas
  d'accès réseau à votre serveur). Le Dockerfile et docker-compose.yml sont
  prêts et suivent les conventions standard Coolify, mais méritent un
  premier déploiement de test avant la mise en production.
