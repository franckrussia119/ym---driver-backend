import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Package,
  Ship,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Upload,
  Truck,
  UserRound,
  RotateCcw,
  Lock,
  Unlock,
  Ticket,
  Paperclip,
  Wallet,
  Pencil,
  Trash2,
  AlertTriangle,
  History,
  X,
} from 'lucide-react';
import { formatFCFA } from '../types';
import {
  ContainerWithDetails,
  PipelineStep,
  getContainer,
  updatePipelineStep,
  addContainerDocument,
  updateDocumentStatus,
  DocumentType,
  setContainerFees,
  updateContainer,
  deleteContainer,
  createIncident,
} from '../lib/containers';
import { uploadFile, ApiError } from '../lib/api';
import { usePolling } from '../lib/usePolling';
import { PrintableTransportOrderView } from './PrintableTransportOrderView';
import { PrintableReturnOrderView } from './PrintableReturnOrderView';

interface ContainerDetailViewProps {
  containerId: string;
  onBack: () => void;
  onGoToReturn: () => void;
}

const STEP_STATUS_STYLE: Record<string, { badge: string; icon: React.ElementType }> = {
  PENDING: { badge: 'bg-slate-100 text-slate-500 border-slate-200', icon: Clock },
  IN_PROGRESS: { badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: Loader2 },
  DONE: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  BLOCKED: { badge: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
};

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  BL_OBL: 'Bill of Lading (OBL)',
  BL_TELEX: 'Bill of Lading (Telex)',
  TICKET: 'Ticket',
  AUTRE: 'Autre document',
};

export const ContainerDetailView: React.FC<ContainerDetailViewProps> = ({ containerId, onBack, onGoToReturn }) => {
  const [container, setContainer] = useState<ContainerWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchContainer = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setContainer(await getContainer(containerId));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger ce conteneur.');
    } finally {
      setIsLoading(false);
    }
  }, [containerId]);

  useEffect(() => {
    fetchContainer();
  }, [fetchContainer]);

  // Step editing
  const [editingStep, setEditingStep] = useState<number | null>(null);

  // Modifier / Supprimer le conteneur (correction d'erreur de saisie)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editBlNumber, setEditBlNumber] = useState('');
  const [editPort, setEditPort] = useState<'Douala' | 'Kribi'>('Douala');
  const [editTerminal, setEditTerminal] = useState('');
  const [editContainerNumber, setEditContainerNumber] = useState('');
  const [editSize, setEditSize] = useState<'20' | '40'>('20');
  const [editNotes, setEditNotes] = useState('');
  const [editClientNom, setEditClientNom] = useState('');
  const [editClientContact, setEditClientContact] = useState('');
  const [editContenuDescription, setEditContenuDescription] = useState('');
  const [editDestinationDechargement, setEditDestinationDechargement] = useState('');
  const [editDepotRetourPrevu, setEditDepotRetourPrevu] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEdit = () => {
    if (!container) return;
    setEditBlNumber(container.blNumber);
    setEditPort(container.port);
    setEditTerminal(container.terminal);
    setEditContainerNumber(container.containerNumber);
    setEditSize(container.size);
    setEditNotes(container.notes || '');
    setEditClientNom(container.clientNom || '');
    setEditClientContact(container.clientContact || '');
    setEditContenuDescription(container.contenuDescription || '');
    setEditDestinationDechargement(container.destinationDechargement || '');
    setEditDepotRetourPrevu(container.depotRetourPrevu || '');
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await updateContainer(containerId, {
        blNumber: editBlNumber,
        port: editPort,
        terminal: editTerminal,
        containerNumber: editContainerNumber,
        size: editSize,
        notes: editNotes,
        clientNom: editClientNom,
        clientContact: editClientContact,
        contenuDescription: editContenuDescription,
        destinationDechargement: editDestinationDechargement,
        depotRetourPrevu: editDepotRetourPrevu,
      });
      setIsEditOpen(false);
      await fetchContainer();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Échec de l'enregistrement des modifications.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isTransportOrderOpen, setIsTransportOrderOpen] = useState(false);
  const [isReturnOrderOpen, setIsReturnOrderOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteContainer(containerId);
      onBack();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Échec de la suppression.');
      setIsDeleting(false);
    }
  };

  usePolling(() => {
    getContainer(containerId).then(setContainer).catch(() => {});
  }, 15000, editingStep === null);

  const [stepStatus, setStepStatus] = useState<string>('PENDING');
  const [stepDate, setStepDate] = useState('');
  const [stepNotes, setStepNotes] = useState('');
  const [stepAmount, setStepAmount] = useState<number>(0);
  const [stepDeclarationNo, setStepDeclarationNo] = useState('');
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [isUploadingTicket, setIsUploadingTicket] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const openStepEdit = (step: PipelineStep) => {
    setEditingStep(step.stepNumber);
    setStepStatus(step.status);
    setStepDate(step.dateDone || '');
    setStepNotes(step.notes || '');
    setStepAmount(step.details?.montantFCFA || 0);
    setStepDeclarationNo(step.details?.numeroDeclaration || '');
    setStepError(null);
  };

  const handleSaveStep = async (stepNumber: number) => {
    setIsSavingStep(true);
    setStepError(null);
    try {
      const details: Record<string, any> = {};
      if (stepNumber === 2 && stepDeclarationNo) details.numeroDeclaration = stepDeclarationNo;
      if (stepNumber === 3 && stepAmount > 0) details.montantFCFA = stepAmount;

      await updatePipelineStep(containerId, stepNumber, {
        status: stepStatus as any,
        dateDone: stepDate || undefined,
        notes: stepNotes || undefined,
        details: Object.keys(details).length > 0 ? details : undefined,
      });
      await fetchContainer();
      setEditingStep(null);
    } catch (err) {
      setStepError(err instanceof ApiError ? err.message : "Échec de la mise à jour de l'étape.");
    } finally {
      setIsSavingStep(false);
    }
  };

  const handleTicketUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingTicket(true);
    setStepError(null);
    try {
      const url = await uploadFile(file, file.name);
      await updatePipelineStep(containerId, 6, { details: { ticketUrl: url } });
      await addContainerDocument(containerId, { type: 'TICKET', fileUrl: url });
      await fetchContainer();
    } catch (err) {
      setStepError(err instanceof ApiError ? err.message : "Échec de l'envoi du ticket.");
    } finally {
      setIsUploadingTicket(false);
    }
  };

  // Document upload
  const [docType, setDocType] = useState<DocumentType>('BL_OBL');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingDoc(true);
    setDocError(null);
    try {
      const url = await uploadFile(file, file.name);
      await addContainerDocument(containerId, { type: docType, fileUrl: url });
      await fetchContainer();
    } catch (err) {
      setDocError(err instanceof ApiError ? err.message : "Échec de l'envoi du document.");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDocStatusChange = async (docId: string, status: 'PENDING' | 'RECEIVED' | 'VALIDATED') => {
    try {
      await updateDocumentStatus(containerId, docId, status);
      await fetchContainer();
    } catch {
      /* silencieux : re-fetch échoué, l'utilisateur peut réessayer */
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 flex items-center justify-center text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Chargement du conteneur…
      </div>
    );
  }
  if (loadError || !container) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4">
        {loadError || 'Conteneur introuvable.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour au registre
      </button>

      {/* Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="font-mono text-xs text-blue-400">{container.numeroReference}</div>
            <h2 className="text-lg font-bold mt-0.5">{container.containerNumber}</h2>
            <p className="text-xs text-slate-400 mt-0.5">BL: {container.blNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTransportOrderOpen(true)}
              className="px-2.5 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 text-[11px] font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
            >
              <FileText className="w-3 h-3" /> Ordre de Transport
            </button>
            {container.pod.length > 0 && container.status === 'OUVERT' && (
              <button
                onClick={() => setIsReturnOrderOpen(true)}
                className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[11px] font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Ordre de Retour
              </button>
            )}
            <button
              onClick={() => openEdit()}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" /> Modifier
            </button>
            {container.pod.length === 0 && (
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Supprimer
              </button>
            )}
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              container.status === 'OUVERT' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-500/20 text-slate-300'
            }`}>
              {container.status === 'OUVERT' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {container.status === 'OUVERT' ? 'Vie Ouverte' : 'Vie Fermée'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-300">
          <span className="flex items-center gap-1.5"><Ship className="w-3.5 h-3.5 text-blue-400" /> {container.port === 'Douala' ? 'PAD' : 'PAK'} · {container.terminal}</span>
          <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-blue-400" /> {container.size}'</span>
          {container.carrierType === 'CHAUFFEUR_INTERNE' ? (
            <span className="flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5 text-emerald-400" /> {container.driverNom} (chauffeur){container.driverTelephone && <span className="text-slate-500"> · {container.driverTelephone}</span>}</span>
          ) : container.carrierType === 'SOUS_TRAITANT' ? (
            <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-amber-400" /> {container.subcontractorNom} ({container.subcontractorEntreprise || 'société non renseignée'}){container.subcontractorTelephone && <span className="text-slate-500"> · {container.subcontractorTelephone}</span>}</span>
          ) : (
            <span className="text-slate-500 italic">Transporteur non assigné</span>
          )}
        </div>
        {(container.clientNom || container.contenuDescription || container.destinationDechargement) && (
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
            {container.clientNom && (
              <span className="flex items-center gap-1.5">
                <UserRound className="w-3.5 h-3.5 text-slate-500" /> {container.clientNom}
                {container.clientContact && <span> · {container.clientContact}</span>}
              </span>
            )}
            {container.contenuDescription && (
              <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-slate-500" /> {container.contenuDescription}</span>
            )}
            {container.destinationDechargement && (
              <span className="flex items-center gap-1.5"><Ship className="w-3.5 h-3.5 text-slate-500" /> Déchargement : {container.destinationDechargement}</span>
            )}
          </div>
        )}
        {container.status === 'OUVERT' && (
          <button
            onClick={onGoToReturn}
            className="mt-4 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            Enregistrer le Retour du Conteneur (clôture la vie)
          </button>
        )}
      </div>

      {/* Pipeline Tracker */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-sm text-slate-900">Pipeline — Suivi des Étapes</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {container.steps.map((step) => {
            const style = STEP_STATUS_STYLE[step.status];
            const StatusIcon = style.icon;
            const isEditing = editingStep === step.stepNumber;
            return (
              <div key={step.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                      {step.stepNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-900">{step.stepName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {step.dateDone ? `Le ${step.dateDone}` : 'Pas encore fait'}
                        {step.agentNom && ` · ${step.agentNom}`}
                      </div>
                      {step.notes && <div className="text-[11px] text-slate-400 mt-0.5 italic">{step.notes}</div>}
                      {step.stepNumber === 3 && step.details?.montantFCFA > 0 && (
                        <div className="text-[11px] text-emerald-700 font-bold mt-0.5">{formatFCFA(step.details.montantFCFA)}</div>
                      )}
                      {step.stepNumber === 6 && step.details?.ticketUrl && (
                        <a href={step.details.ticketUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 font-bold flex items-center gap-1 mt-1">
                          <Ticket className="w-3 h-3" /> Voir le ticket
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${style.badge}`}>
                      <StatusIcon className="w-3 h-3" />
                      {step.status === 'PENDING' ? 'En attente' : step.status === 'IN_PROGRESS' ? 'En cours' : step.status === 'DONE' ? 'Fait' : 'Bloqué'}
                    </span>
                    <button
                      onClick={() => (isEditing ? setEditingStep(null) : openStepEdit(step))}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      {isEditing ? 'Fermer' : 'Modifier'}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-3 pl-10 space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Statut</label>
                        <select value={stepStatus} onChange={(e) => setStepStatus(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold">
                          <option value="PENDING">En attente</option>
                          <option value="IN_PROGRESS">En cours</option>
                          <option value="DONE">Fait</option>
                          <option value="BLOCKED">Bloqué</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Date</label>
                        <input type="date" max={new Date().toISOString().split('T')[0]} value={stepDate} onChange={(e) => setStepDate(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg" />
                      </div>
                    </div>
                    {step.stepNumber === 2 && (
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">N° Déclaration (GUCE/CAMCIS)</label>
                        <input type="text" value={stepDeclarationNo} onChange={(e) => setStepDeclarationNo(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono" />
                      </div>
                    )}
                    {step.stepNumber === 3 && (
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Montant Payé (FCFA)</label>
                        <input type="number" min={0} value={stepAmount} onChange={(e) => setStepAmount(Number(e.target.value))}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold" />
                      </div>
                    )}
                    {step.stepNumber === 6 && (
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Ticket de Levée</label>
                        <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer w-fit font-bold text-slate-700">
                          {isUploadingTicket ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          <span>{isUploadingTicket ? 'Envoi…' : 'Joindre le ticket'}</span>
                          <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleTicketUpload} disabled={isUploadingTicket} />
                        </label>
                      </div>
                    )}
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">Notes</label>
                      <textarea value={stepNotes} onChange={(e) => setStepNotes(e.target.value)} rows={2}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg" />
                    </div>
                    {stepError && <p className="text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">{stepError}</p>}
                    <button
                      onClick={() => handleSaveStep(step.stepNumber)}
                      disabled={isSavingStep}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                    >
                      {isSavingStep && <Loader2 className="w-3 h-3 animate-spin" />}
                      Enregistrer l'étape
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Frais Supplémentaires */}
      <ContainerFeesSection container={container} onUpdated={fetchContainer} />

      {/* Document Vault */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
            <Paperclip className="w-4 h-4 text-blue-600" /> Coffre à Documents
          </h3>
          <div className="flex items-center gap-2">
            <select value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="px-2.5 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg font-semibold">
              {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg cursor-pointer">
              {isUploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{isUploadingDoc ? 'Envoi…' : 'Téléverser'}</span>
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleDocUpload} disabled={isUploadingDoc} />
            </label>
          </div>
        </div>
        {docError && <p className="text-rose-600 text-xs font-semibold bg-rose-50 border-b border-rose-200 px-4 py-2">{docError}</p>}
        {container.documents.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">Aucun document envoyé pour l'instant.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {container.documents.map((doc) => (
              <div key={doc.id} className="p-3.5 flex items-center justify-between gap-3">
                <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 min-w-0 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 cursor-pointer transition-colors">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold truncate">Voir : {DOC_TYPE_LABELS[doc.type]}</span>
                </a>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400">{doc.uploadedByNom}</span>
                  <select
                    value={doc.status}
                    onChange={(e) => handleDocStatusChange(doc.id, e.target.value as any)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-full border cursor-pointer ${
                      doc.status === 'VALIDATED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      doc.status === 'RECEIVED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <option value="PENDING">En attente</option>
                    <option value="RECEIVED">Reçu</option>
                    <option value="VALIDATED">Validé</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POD History */}
      {container.pod.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Preuve(s) de Livraison</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {container.pod.map((p: any) => (
              <div key={p.id} className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-blue-700 block">{p.numeroReference}</span>
                  <span className="text-slate-500">{p.recipientName} · {p.dateTime}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  p.status === 'LIVRE_CONFORME' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Return info if closed */}
      {container.return && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <h3 className="font-bold text-sm text-slate-900 mb-2">Retour du Conteneur Vide</h3>
          <p className="text-xs text-slate-600">Retourné le {container.return.dateRetourVide} au dépôt {container.return.depotRetour}.</p>
          {container.return.notes && <p className="text-xs text-slate-500 mt-1 italic">{container.return.notes}</p>}
        </div>
      )}

      {/* Incidents / Transferts */}
      <ContainerIncidentsSection container={container} onUpdated={fetchContainer} />

      {/* MODAL: Modifier le conteneur */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5"><Pencil className="w-4 h-4 text-blue-600" /> Modifier le Conteneur</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">N° BL *</label>
                <input type="text" value={editBlNumber} onChange={(e) => setEditBlNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">N° Conteneur *</label>
                <input type="text" value={editContainerNumber} onChange={(e) => setEditContainerNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Port</label>
                  <select value={editPort} onChange={(e) => setEditPort(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold">
                    <option value="Douala">Douala (PAD)</option>
                    <option value="Kribi">Kribi (PAK)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Taille</label>
                  <select value={editSize} onChange={(e) => setEditSize(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold">
                    <option value="20">20'</option>
                    <option value="40">40'</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Terminal</label>
                <input type="text" value={editTerminal} onChange={(e) => setEditTerminal(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Client</label>
                  <input type="text" value={editClientNom} onChange={(e) => setEditClientNom(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Client</label>
                  <input type="text" value={editClientContact} onChange={(e) => setEditClientContact(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Contenu du Conteneur</label>
                <input type="text" value={editContenuDescription} onChange={(e) => setEditContenuDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Destination du Déchargement</label>
                <input type="text" value={editDestinationDechargement} onChange={(e) => setEditDestinationDechargement(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Dépôt de Retour Prévu</label>
                <input type="text" value={editDepotRetourPrevu} onChange={(e) => setEditDepotRetourPrevu(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes</label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              {editError && <p className="text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{editError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium cursor-pointer">
                  Annuler
                </button>
                <button onClick={handleSaveEdit} disabled={isSavingEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5">
                  {isSavingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ordre de Transport imprimable */}
      {isTransportOrderOpen && (
        <PrintableTransportOrderView container={container} onClose={() => setIsTransportOrderOpen(false)} />
      )}

      {/* MODAL: Ordre de Retour imprimable */}
      {isReturnOrderOpen && (
        <PrintableReturnOrderView container={container} onClose={() => setIsReturnOrderOpen(false)} />
      )}

      {/* MODAL: Confirmer la suppression */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Supprimer ce conteneur ?</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Cette action est définitive. Le conteneur <strong>{container.containerNumber}</strong> (BL {container.blNumber}) et toutes ses données associées seront supprimés.
            </p>
            {deleteError && <p className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setIsDeleteConfirmOpen(false); setDeleteError(null); }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium text-xs cursor-pointer">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 text-xs">
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Supprimer Définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Frais de dépôt et frais supplémentaires — distincts des droits/taxes
// (renseignés sur l'étape 3 du pipeline) et des frais de retour (formulaire
// de retour). Éditable directement ici pour que le coût total du conteneur
// reflète vraiment tout ce qui a été dépensé.
const ContainerFeesSection: React.FC<{ container: ContainerWithDetails; onUpdated: () => void }> = ({ container, onUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fraisDepot, setFraisDepot] = useState(container.fraisDepotFCFA);
  const [fraisSupp, setFraisSupp] = useState(container.fraisSupplementairesFCFA);
  const [fraisSuppNote, setFraisSuppNote] = useState(container.fraisSupplementairesNote || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openEdit = () => {
    setFraisDepot(container.fraisDepotFCFA);
    setFraisSupp(container.fraisSupplementairesFCFA);
    setFraisSuppNote(container.fraisSupplementairesNote || '');
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await setContainerFees(container.id, {
        fraisDepotFCFA: fraisDepot,
        fraisSupplementairesFCFA: fraisSupp,
        fraisSupplementairesNote: fraisSuppNote || undefined,
      });
      setIsEditing(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de l'enregistrement des frais.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-emerald-600" /> Frais de Dépôt & Frais Supplémentaires
        </h3>
        {!isEditing && (
          <button onClick={openEdit} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer">
            Modifier
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="p-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">Frais de Dépôt</span>
            <span className="font-bold text-slate-900">{formatFCFA(container.fraisDepotFCFA)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Frais Supplémentaires</span>
            <span className="font-bold text-slate-900">{formatFCFA(container.fraisSupplementairesFCFA)}</span>
            {container.fraisSupplementairesNote && (
              <span className="block text-[11px] text-slate-400 italic mt-0.5">{container.fraisSupplementairesNote}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-600 block mb-1">Frais de Dépôt (FCFA)</label>
              <input type="number" min={0} value={fraisDepot} onChange={(e) => setFraisDepot(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold" />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">Frais Supplémentaires (FCFA)</label>
              <input type="number" min={0} value={fraisSupp} onChange={(e) => setFraisSupp(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold" />
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-600 block mb-1">Note (frais supplémentaires)</label>
            <input type="text" value={fraisSuppNote} onChange={(e) => setFraisSuppNote(e.target.value)}
              placeholder="Ex: Frais de manutention exceptionnels"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
          {error && <p className="text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(false)} className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-medium cursor-pointer">
              Annuler
            </button>
            <button onClick={handleSave} disabled={isSaving}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5">
              {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Incidents / Transferts : pannes, transferts manuels entre chauffeurs ou
// camions — pour garder une trace réelle de ce qui s'est passé sur le
// terrain, plutôt qu'une simple réassignation silencieuse.
const ContainerIncidentsSection: React.FC<{ container: ContainerWithDetails; onUpdated: () => void }> = ({ container, onUpdated }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<'PANNE' | 'TRANSFERT' | 'AUTRE'>('PANNE');
  const [description, setDescription] = useState('');
  const [ancienChauffeurNom, setAncienChauffeurNom] = useState('');
  const [nouveauChauffeurNom, setNouveauChauffeurNom] = useState('');
  const [ancienCamion, setAncienCamion] = useState('');
  const [nouveauCamion, setNouveauCamion] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = () => {
    setType('PANNE');
    setDescription('');
    setAncienChauffeurNom('');
    setNouveauChauffeurNom('');
    setAncienCamion('');
    setNouveauCamion('');
    setError(null);
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!description.trim()) {
      setError("Veuillez décrire l'incident.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await createIncident(container.id, {
        type,
        description,
        ancienChauffeurNom: ancienChauffeurNom || undefined,
        nouveauChauffeurNom: nouveauChauffeurNom || undefined,
        ancienCamion: ancienCamion || undefined,
        nouveauCamion: nouveauCamion || undefined,
      });
      setIsAdding(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de l'enregistrement de l'incident.");
    } finally {
      setIsSaving(false);
    }
  };

  const typeLabel = (t: string) => (t === 'PANNE' ? 'Panne' : t === 'TRANSFERT' ? 'Transfert' : 'Autre');
  const typeColor = (t: string) => (t === 'PANNE' ? 'bg-rose-50 text-rose-700 border-rose-200' : t === 'TRANSFERT' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
          <History className="w-4 h-4 text-amber-600" /> Incidents & Transferts ({container.incidents.length})
        </h3>
        <button onClick={openAdd} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer">
          + Signaler un incident
        </button>
      </div>

      {container.incidents.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400">
          Aucun incident enregistré. Une panne ou un transfert de camion en cours de route peut être signalé ici.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {container.incidents.map((inc) => (
            <div key={inc.id} className="p-3.5 text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeColor(inc.type)}`}>{typeLabel(inc.type)}</span>
                <span className="text-slate-400 text-[11px]">{new Date(inc.createdAt).toLocaleString('fr-FR')}</span>
              </div>
              <p className="text-slate-700">{inc.description}</p>
              {(inc.ancienChauffeurNom || inc.nouveauChauffeurNom) && (
                <p className="text-slate-500 text-[11px]">Chauffeur : {inc.ancienChauffeurNom || '—'} → {inc.nouveauChauffeurNom || '—'}</p>
              )}
              {(inc.ancienCamion || inc.nouveauCamion) && (
                <p className="text-slate-500 text-[11px]">Camion : {inc.ancienCamion || '—'} → {inc.nouveauCamion || '—'}</p>
              )}
              {inc.createdByNom && <p className="text-slate-400 text-[10px] italic">Signalé par {inc.createdByNom}</p>}
            </div>
          ))}
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-600" /> Signaler un Incident</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold">
                  <option value="PANNE">Panne de camion</option>
                  <option value="TRANSFERT">Transfert manuel (chauffeur/camion)</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Description *</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  placeholder="Ex : Panne moteur au PK 45, conteneur transféré sur un autre camion."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ancien chauffeur</label>
                  <input type="text" value={ancienChauffeurNom} onChange={(e) => setAncienChauffeurNom(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nouveau chauffeur</label>
                  <input type="text" value={nouveauChauffeurNom} onChange={(e) => setNouveauChauffeurNom(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ancien camion</label>
                  <input type="text" value={ancienCamion} onChange={(e) => setAncienCamion(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nouveau camion</label>
                  <input type="text" value={nouveauCamion} onChange={(e) => setNouveauCamion(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg" />
                </div>
              </div>
              {error && <p className="text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium cursor-pointer">
                  Annuler
                </button>
                <button onClick={handleSave} disabled={isSaving}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5">
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
