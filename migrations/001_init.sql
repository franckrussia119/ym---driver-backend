-- YM-TRANSIT — Migration initiale
-- Structure validée en conditions réelles (insertions, jointures, cascades
-- testées) avant livraison.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('CHAUFFEUR','MECANICIEN','SUPERVISEUR','ADMIN','SUPER_ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  role "UserRole" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "camionAssigne" TEXT,
  "driverPhotoUrl" TEXT,
  "truckPhotoUrl" TEXT,
  "habiliteMatieresDangereuses" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tokenHash" TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weekly_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "submittedAt" TIMESTAMP,
  "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'CONFORME',
  "driverId" TEXT NOT NULL REFERENCES users(id),
  "semaineDu" TEXT NOT NULL,
  "semaineAu" TEXT NOT NULL,
  "nomChauffeur" TEXT NOT NULL,
  immatriculation TEXT NOT NULL,
  "marqueModele" TEXT NOT NULL,
  "noRemorque" TEXT NOT NULL,
  "driverPhotoUrl" TEXT,
  "truckPhotoUrl" TEXT,
  "totalEnlevesPort" INT NOT NULL DEFAULT 0,
  "totalLivresDestinataire" INT NOT NULL DEFAULT 0,
  "conteneursVidesRetournes" INT NOT NULL DEFAULT 0,
  "aucunDefautConstate" BOOLEAN NOT NULL DEFAULT false,
  checklist JSONB NOT NULL DEFAULT '{}',
  "mechanicVerifNom" TEXT,
  "mechanicVerifDate" TEXT,
  "itineraireTrafic" TEXT NOT NULL DEFAULT '',
  "clientsDestinataires" TEXT NOT NULL DEFAULT '',
  "suggestionsOperations" TEXT NOT NULL DEFAULT '',
  "besoinsFormation" TEXT NOT NULL DEFAULT '',
  "commentairesGeneraux" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS trip_log_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reportId" TEXT NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  client TEXT NOT NULL,
  "noConteneurBL" TEXT NOT NULL,
  "typeConteneur" TEXT NOT NULL,
  depart TEXT NOT NULL,
  destination TEXT NOT NULL,
  "kmParcourus" DOUBLE PRECISION NOT NULL,
  "carburantL" DOUBLE PRECISION NOT NULL,
  "fraisRoute" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspection_defect_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reportId" TEXT NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  constate BOOLEAN NOT NULL DEFAULT false,
  gravite TEXT,
  "actionPrise" TEXT,
  date TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS audio_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reportId" TEXT NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  "fileUrl" TEXT NOT NULL,
  "durationSeconds" INT NOT NULL,
  date TEXT NOT NULL,
  transcription TEXT,
  "fieldKey" TEXT
);

CREATE TABLE IF NOT EXISTS photo_evidence (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reportId" TEXT NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  "fileUrl" TEXT NOT NULL,
  caption TEXT,
  date TEXT NOT NULL,
  "fieldKey" TEXT
);

CREATE TABLE IF NOT EXISTS report_signatures (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reportId" TEXT NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  nom TEXT NOT NULL,
  signature TEXT NOT NULL,
  date TEXT NOT NULL,
  UNIQUE ("reportId", role)
);

CREATE TABLE IF NOT EXISTS mechanic_invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "truckImmatriculation" TEXT NOT NULL,
  "chauffeurNom" TEXT,
  "mecanicienNom" TEXT NOT NULL,
  "dateIntervention" TEXT NOT NULL,
  "descriptionTravaux" TEXT NOT NULL,
  "mainOeuvreHeures" DOUBLE PRECISION NOT NULL,
  "tauxHoraire" DOUBLE PRECISION NOT NULL,
  "totalPieces" DOUBLE PRECISION NOT NULL,
  "totalMainOeuvre" DOUBLE PRECISION NOT NULL,
  "totalHT" DOUBLE PRECISION NOT NULL,
  tva DOUBLE PRECISION NOT NULL,
  "totalTTC" DOUBLE PRECISION NOT NULL,
  "partsPhotoUrls" TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fault_declarations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dateSignalement" TEXT NOT NULL,
  "chauffeurId" TEXT NOT NULL REFERENCES users(id),
  "chauffeurNom" TEXT NOT NULL,
  immatriculation TEXT NOT NULL,
  "niveauUrgence" TEXT NOT NULL,
  categorie TEXT NOT NULL,
  description TEXT NOT NULL,
  localisation TEXT NOT NULL,
  status TEXT NOT NULL,
  "notesSuperviseur" TEXT,
  "notesMecanicien" TEXT,
  "invoiceId" TEXT UNIQUE REFERENCES mechanic_invoices(id),
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fault_history_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "faultId" TEXT NOT NULL REFERENCES fault_declarations(id) ON DELETE CASCADE,
  "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
  "actorName" TEXT NOT NULL,
  "actorRole" "UserRole" NOT NULL,
  status TEXT NOT NULL,
  comment TEXT
);

CREATE TABLE IF NOT EXISTS spare_part_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "invoiceId" TEXT NOT NULL REFERENCES mechanic_invoices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty INT NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  total DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  immatriculation TEXT UNIQUE NOT NULL,
  "marqueModele" TEXT NOT NULL,
  annee INT NOT NULL,
  "capaciteTonnage" DOUBLE PRECISION NOT NULL,
  "noRemorqueAssociee" TEXT,
  "photoUrl" TEXT,
  "chauffeurHabituelId" TEXT REFERENCES users(id),
  "chauffeurHabituelNom" TEXT,
  statut TEXT NOT NULL,
  "kmCompteurInitial" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "consommationReferenceL100" DOUBLE PRECISION NOT NULL,
  "notesInterne" TEXT,
  "habiliteMatieresDangereuses" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vehicleId" TEXT NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  "numeroDoc" TEXT NOT NULL,
  "dateEmission" TEXT NOT NULL,
  "dateExpiration" TEXT NOT NULL,
  "photoScanUrl" TEXT,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_plan_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vehicleId" TEXT NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  "vehicleImmatriculation" TEXT NOT NULL,
  "typeIntervention" TEXT NOT NULL,
  "frequenceKm" INT NOT NULL,
  "dernierKmRealise" INT NOT NULL,
  "derniereDateRealisee" TEXT NOT NULL,
  "prochainKmEcheance" INT NOT NULL,
  "prochaineDateEcheance" TEXT NOT NULL,
  "alertLevel" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduled_maintenance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "planItemId" TEXT REFERENCES maintenance_plan_items(id),
  "vehicleId" TEXT NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  "vehicleImmatriculation" TEXT NOT NULL,
  "typeIntervention" TEXT NOT NULL,
  "dateProgrammee" TEXT NOT NULL,
  "mecanicienOuAtelier" TEXT NOT NULL,
  "coutEstimeFCFA" DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  "linkedInvoiceId" TEXT
);

CREATE TABLE IF NOT EXISTS container_cautions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "noConteneurBL" TEXT NOT NULL,
  "ligneMaritime" TEXT NOT NULL,
  "clientNom" TEXT NOT NULL,
  "truckImmatriculation" TEXT NOT NULL,
  "chauffeurNom" TEXT NOT NULL,
  "montantCautionFCFA" DOUBLE PRECISION NOT NULL,
  "fraisJournalierRetardFCFA" DOUBLE PRECISION NOT NULL,
  "depotDestination" TEXT NOT NULL,
  "dateDepot" TEXT NOT NULL,
  "dateLimiteRetour" TEXT NOT NULL,
  "dateRetourEffectif" TEXT,
  status TEXT NOT NULL,
  "montantRecupereFCFA" DOUBLE PRECISION,
  "montantPenaliteFCFA" DOUBLE PRECISION,
  notes TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fuel_analysis_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tripId" TEXT UNIQUE REFERENCES trip_log_entries(id),
  date TEXT NOT NULL,
  "truckImmatriculation" TEXT NOT NULL,
  "chauffeurNom" TEXT NOT NULL,
  "trajetLabel" TEXT NOT NULL,
  "kmParcourus" DOUBLE PRECISION NOT NULL,
  "carburantConsommeL" DOUBLE PRECISION NOT NULL,
  "consommationReelleL100" DOUBLE PRECISION NOT NULL,
  "consommationRefL100" DOUBLE PRECISION NOT NULL,
  "ecartL100" DOUBLE PRECISION NOT NULL,
  "anomalieDetectee" BOOLEAN NOT NULL DEFAULT false,
  "typeAnomalie" TEXT
);

CREATE TABLE IF NOT EXISTS driver_performance_scores (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "chauffeurId" TEXT NOT NULL REFERENCES users(id),
  "chauffeurNom" TEXT NOT NULL,
  periode TEXT NOT NULL,
  "totalKm" DOUBLE PRECISION NOT NULL,
  "nombreTrajets" INT NOT NULL,
  "ponctualitePct" DOUBLE PRECISION NOT NULL,
  "moyenneConsoL100" DOUBLE PRECISION NOT NULL,
  "pannesSignaleesCount" INT NOT NULL,
  "cautionsEnRetardCount" INT NOT NULL,
  "noteClientMoyenne" DOUBLE PRECISION NOT NULL,
  "scoreGlobalPct" DOUBLE PRECISION NOT NULL,
  rang INT NOT NULL,
  UNIQUE ("chauffeurId", periode)
);

CREATE TABLE IF NOT EXISTS route_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "createdById" TEXT NOT NULL REFERENCES users(id),
  "dateExecution" TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'BROUILLON',
  "totalDistanceKm" DOUBLE PRECISION NOT NULL,
  "estimatedDurationHours" DOUBLE PRECISION NOT NULL,
  "estimatedFuelL" DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS route_assignments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "routePlanId" TEXT NOT NULL REFERENCES route_plans(id) ON DELETE CASCADE,
  "vehicleId" TEXT NOT NULL REFERENCES fleet_vehicles(id),
  "driverId" TEXT NOT NULL REFERENCES users(id),
  "orderIndex" INT NOT NULL DEFAULT 0,
  waypoints JSONB NOT NULL,
  "distanceKm" DOUBLE PRECISION NOT NULL,
  "durationH" DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS pod_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "blNumber" TEXT NOT NULL,
  "containerNumber" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "deliveryAddress" TEXT NOT NULL,
  "driverName" TEXT NOT NULL,
  "truckImmatriculation" TEXT NOT NULL,
  "dateTime" TEXT NOT NULL,
  "gpsLocation" TEXT,
  "recipientName" TEXT NOT NULL,
  status TEXT NOT NULL,
  "signatureData" TEXT,
  "photoUrl" TEXT,
  observations TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_feedback_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "clientName" TEXT NOT NULL,
  "blNumber" TEXT NOT NULL,
  "driverName" TEXT NOT NULL,
  date TEXT NOT NULL,
  rating INT NOT NULL,
  "punctualityScore" TEXT NOT NULL,
  "cargoConditionScore" TEXT NOT NULL,
  comment TEXT,
  status TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- Index utiles pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_reports_driver ON weekly_reports("driverId");
CREATE INDEX IF NOT EXISTS idx_trips_report ON trip_log_entries("reportId");
CREATE INDEX IF NOT EXISTS idx_faults_status ON fault_declarations(status);
CREATE INDEX IF NOT EXISTS idx_faults_chauffeur ON fault_declarations("chauffeurId");
CREATE INDEX IF NOT EXISTS idx_cautions_status ON container_cautions(status);
CREATE INDEX IF NOT EXISTS idx_cautions_echeance ON container_cautions("dateLimiteRetour");
CREATE INDEX IF NOT EXISTS idx_maintenance_alert ON maintenance_plan_items("alertLevel");
CREATE INDEX IF NOT EXISTS idx_vehicles_immat ON fleet_vehicles(immatriculation);
