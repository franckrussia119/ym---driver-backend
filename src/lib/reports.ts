import { api } from './api';
import {
  WeeklyReport,
  InspectionDefectItem,
  ContainerType,
  DefectSeverity,
  DefectAction,
} from '../types';
import { INITIAL_DEFECT_CATEGORIES } from '../data/defaults';

// --------------------------------------------------------------------------
// Le backend stocke les défauts en tableau et NE conserve que ceux
// effectivement constatés (constate = true) — les autres lignes de la
// checklist DVIR n'existent pas côté serveur, elles sont une structure de
// formulaire propre au frontend. Il faut donc, à la lecture, réinjecter les
// défauts reçus dans un modèle vierge complet (toutes les clés), sinon la
// checklist affichée perdrait toutes ses lignes non cochées.
// --------------------------------------------------------------------------
const DEFECT_LOOKUP: Record<string, { id: string; category: string; name: string }> = {};
INITIAL_DEFECT_CATEGORIES.forEach((cat) => {
  cat.items.forEach((item) => {
    DEFECT_LOOKUP[`${cat.category}::${item.name}`] = { id: item.id, category: cat.category, name: item.name };
  });
});

function blankDefectsMap(): Record<string, InspectionDefectItem> {
  const map: Record<string, InspectionDefectItem> = {};
  INITIAL_DEFECT_CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
      map[item.id] = {
        id: item.id,
        category: cat.category,
        name: item.name,
        constate: false,
        gravite: 'Mineure',
        actionPrise: 'Réparé sur place',
        date: '',
        notes: '',
      };
    });
  });
  return map;
}

interface BackendDefect {
  category: string;
  name: string;
  constate: boolean;
  gravite?: DefectSeverity | null;
  actionPrise?: DefectAction | null;
  date?: string | null;
  notes?: string | null;
}

interface BackendSignature {
  role: 'chauffeur' | 'superviseur' | 'logistique';
  nom: string;
  signature: string;
  date: string;
}

interface BackendReport {
  id: string;
  numeroReference?: string;
  createdAt: string;
  submittedAt: string | null;
  isSubmitted: boolean;
  status: 'CONFORME' | 'AVEC_DEFAUTS';
  semaineDu: string;
  semaineAu: string;
  nomChauffeur: string;
  immatriculation: string;
  marqueModele: string;
  noRemorque: string;
  driverPhotoUrl: string | null;
  truckPhotoUrl: string | null;
  totalEnlevesPort: number;
  totalLivresDestinataire: number;
  conteneursVidesRetournes: number;
  aucunDefautConstate: boolean;
  checklist: Record<string, boolean>;
  mechanicVerifNom: string | null;
  mechanicVerifDate: string | null;
  itineraireTrafic: string;
  clientsDestinataires: string;
  suggestionsOperations: string;
  besoinsFormation: string;
  commentairesGeneraux: string;
  trips: Array<{
    id: string;
    date: string;
    client: string;
    noConteneurBL: string;
    typeConteneur: ContainerType;
    depart: string;
    destination: string;
    kmParcourus: number;
    carburantL: number;
    fraisRoute: number;
    source?: 'MANUEL' | 'POD' | 'RETOUR_CONTENEUR';
  }>;
  defects: BackendDefect[];
  signatures: BackendSignature[];
  photos: Array<{ fileUrl: string; caption?: string; date: string; fieldKey?: string }>;
  voiceNotes: Array<{ fileUrl: string; durationSeconds: number; date: string; transcription?: string; fieldKey?: string }>;
}

// Rapport local -> payload attendu par l'API (POST/PATCH)
export function toBackendPayload(report: WeeklyReport) {
  return {
    semaineDu: report.driverInfo.semaineDu,
    semaineAu: report.driverInfo.semaineAu,
    nomChauffeur: report.driverInfo.nomChauffeur,
    immatriculation: report.driverInfo.immatriculation,
    marqueModele: report.driverInfo.marqueModele,
    noRemorque: report.driverInfo.noRemorque,
    driverPhotoUrl: report.driverInfo.driverPhotoUrl ?? null,
    truckPhotoUrl: report.driverInfo.truckPhotoUrl ?? null,
    trips: report.trips.map((t) => ({
      date: t.date,
      client: t.client,
      noConteneurBL: t.noConteneurBL,
      typeConteneur: t.typeConteneur,
      depart: t.depart,
      destination: t.destination,
      kmParcourus: t.kmParcourus,
      carburantL: t.carburantL,
      fraisRoute: t.fraisRoute,
    })),
    totalEnlevesPort: report.tripStats.totalEnlevesPort,
    totalLivresDestinataire: report.tripStats.totalLivresDestinataire,
    conteneursVidesRetournes: report.tripStats.conteneursVidesRetournes,
    aucunDefautConstate: report.aucunDefautConstate,
    defects: Object.values(report.defects).map((d) => ({
      category: d.category,
      name: d.name,
      constate: d.constate,
      gravite: d.gravite,
      actionPrise: d.actionPrise,
      date: d.date,
      notes: d.notes,
    })),
    checklist: report.checklist,
    mechanicVerifNom: report.mechanicVerif?.nomMecanicien || undefined,
    mechanicVerifDate: report.mechanicVerif?.date || undefined,
    itineraireTrafic: report.observations.itineraireTrafic,
    clientsDestinataires: report.observations.clientsDestinataires,
    suggestionsOperations: report.observations.suggestionsOperations,
    besoinsFormation: report.observations.besoinsFormation,
    commentairesGeneraux: report.observations.commentairesGeneraux,
    photos: (report.observations.photos || []).map((p) => ({
      fileUrl: p.dataUrl,
      caption: p.caption,
      date: p.date,
      fieldKey: p.fieldKey,
    })),
    voiceNotes: (report.observations.voiceNotes || []).map((v) => ({
      fileUrl: v.dataUrl,
      durationSeconds: v.durationSeconds,
      date: v.date,
      transcription: v.transcription,
      fieldKey: v.fieldKey,
    })),
  };
}

// Réponse API -> objet WeeklyReport du frontend
export function fromBackendRecord(record: BackendReport): WeeklyReport {
  const defectsMap = blankDefectsMap();
  for (const d of record.defects) {
    const match = DEFECT_LOOKUP[`${d.category}::${d.name}`];
    const key = match?.id ?? `${d.category}-${d.name}`;
    defectsMap[key] = {
      id: key,
      category: d.category,
      name: d.name,
      constate: d.constate,
      gravite: d.gravite ?? undefined,
      actionPrise: d.actionPrise ?? undefined,
      date: d.date ?? undefined,
      notes: d.notes ?? undefined,
    };
  }

  const sigByRole: Record<string, BackendSignature | undefined> = {};
  for (const s of record.signatures) sigByRole[s.role] = s;

  return {
    id: record.id,
    createdAt: record.createdAt,
    submittedAt: record.submittedAt ?? undefined,
    isSubmitted: record.isSubmitted,
    status: record.status,
    driverInfo: {
      semaineDu: record.semaineDu,
      semaineAu: record.semaineAu,
      nomChauffeur: record.nomChauffeur,
      immatriculation: record.immatriculation,
      marqueModele: record.marqueModele,
      noRemorque: record.noRemorque,
      driverPhotoUrl: record.driverPhotoUrl ?? undefined,
      truckPhotoUrl: record.truckPhotoUrl ?? undefined,
    },
    trips: record.trips.map((t) => ({
      id: t.id,
      date: t.date,
      client: t.client,
      noConteneurBL: t.noConteneurBL,
      typeConteneur: t.typeConteneur,
      depart: t.depart,
      destination: t.destination,
      kmParcourus: Number(t.kmParcourus),
      carburantL: Number(t.carburantL),
      fraisRoute: Number(t.fraisRoute),
      source: t.source,
    })),
    tripStats: {
      totalEnlevesPort: record.totalEnlevesPort,
      totalLivresDestinataire: record.totalLivresDestinataire,
      conteneursVidesRetournes: record.conteneursVidesRetournes,
    },
    aucunDefautConstate: record.aucunDefautConstate,
    defects: defectsMap,
    checklist: record.checklist,
    mechanicVerif: {
      nomMecanicien: record.mechanicVerifNom ?? '',
      date: record.mechanicVerifDate ?? '',
    },
    observations: {
      itineraireTrafic: record.itineraireTrafic,
      clientsDestinataires: record.clientsDestinataires,
      suggestionsOperations: record.suggestionsOperations,
      besoinsFormation: record.besoinsFormation,
      commentairesGeneraux: record.commentairesGeneraux,
      photos: (record.photos || []).map((p, i) => ({
        id: `p${i}`,
        dataUrl: p.fileUrl,
        caption: p.caption,
        date: p.date,
        fieldKey: p.fieldKey,
      })),
      voiceNotes: (record.voiceNotes || []).map((v, i) => ({
        id: `v${i}`,
        dataUrl: v.fileUrl,
        durationSeconds: v.durationSeconds,
        date: v.date,
        transcription: v.transcription,
        fieldKey: v.fieldKey,
      })),
    },
    signatures: {
      chauffeur: {
        nom: sigByRole.chauffeur?.nom ?? '',
        signature: sigByRole.chauffeur?.signature ?? '',
        date: sigByRole.chauffeur?.date ?? '',
      },
      superviseur: {
        nom: sigByRole.superviseur?.nom ?? '',
        signature: sigByRole.superviseur?.signature ?? '',
        date: sigByRole.superviseur?.date ?? '',
      },
      logistique: {
        nom: sigByRole.logistique?.nom ?? '',
        signature: sigByRole.logistique?.signature ?? '',
        date: sigByRole.logistique?.date ?? '',
      },
    },
  };
}

export interface ReportListItem {
  id: string;
  createdAt: string;
  submittedAt: string | null;
  isSubmitted: boolean;
  status: 'CONFORME' | 'AVEC_DEFAUTS';
  nomChauffeur: string;
  immatriculation: string;
  semaineDu: string;
  semaineAu: string;
  tripCount: number;
}

export async function listReports(): Promise<ReportListItem[]> {
  return api.get<ReportListItem[]>('/api/reports');
}

export async function getReport(id: string): Promise<WeeklyReport> {
  const record = await api.get<BackendReport>(`/api/reports/${id}`);
  return fromBackendRecord(record);
}

export async function createReport(report: WeeklyReport): Promise<WeeklyReport> {
  const record = await api.post<BackendReport>('/api/reports', toBackendPayload(report));
  return fromBackendRecord(record);
}

export async function updateReport(id: string, report: WeeklyReport): Promise<WeeklyReport> {
  const record = await api.patch<BackendReport>(`/api/reports/${id}`, toBackendPayload(report));
  return fromBackendRecord(record);
}

export async function putDriverSignature(
  id: string,
  data: { nom: string; signature: string; date: string }
): Promise<void> {
  await api.put(`/api/reports/${id}/signature/chauffeur`, data);
}

export async function putValidationSignature(
  id: string,
  role: 'superviseur' | 'logistique',
  data: { nom: string; signature: string; date: string }
): Promise<void> {
  await api.put(`/api/reports/${id}/signature/${role}`, data);
}

export async function submitReport(id: string): Promise<WeeklyReport> {
  const record = await api.post<BackendReport>(`/api/reports/${id}/submit`);
  return fromBackendRecord(record);
}
