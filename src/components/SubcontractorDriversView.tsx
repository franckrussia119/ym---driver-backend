import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Plus,
  Loader2,
  Phone,
  Building2,
  X,
  Mail,
  MapPin,
  ChevronDown,
  ChevronRight,
  UserRound,
  IdCard,
} from 'lucide-react';
import {
  listSubcontractorCompanies,
  createSubcontractorCompany,
  updateSubcontractorCompany,
  listSubcontractorDrivers,
  createSubcontractorDriver,
  updateSubcontractorDriver,
  SubcontractorCompany,
  SubcontractorDriver,
} from '../lib/subcontractors';
import { ApiError } from '../lib/api';
import { usePolling } from '../lib/usePolling';

export const SubcontractorDriversView: React.FC = () => {
  const [companies, setCompanies] = useState<SubcontractorCompany[]>([]);
  const [drivers, setDrivers] = useState<SubcontractorDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [c, d] = await Promise.all([listSubcontractorCompanies(), listSubcontractorDrivers()]);
      setCompanies(c);
      setDrivers(d);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les sous-traitants.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  usePolling(() => {
    Promise.all([listSubcontractorCompanies(), listSubcontractorDrivers()]).then(([c, d]) => { setCompanies(c); setDrivers(d); }).catch(() => {});
  }, 15000);

  // --- Modal société ---
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<SubcontractorCompany | null>(null);
  const [companyNom, setCompanyNom] = useState('');
  const [companyTelephone, setCompanyTelephone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyAdresse, setCompanyAdresse] = useState('');
  const [companyContactNom, setCompanyContactNom] = useState('');
  const [companyNotes, setCompanyNotes] = useState('');
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const openCreateCompany = () => {
    setEditingCompany(null);
    setCompanyNom('');
    setCompanyTelephone('');
    setCompanyEmail('');
    setCompanyAdresse('');
    setCompanyContactNom('');
    setCompanyNotes('');
    setCompanyError(null);
    setIsCompanyModalOpen(true);
  };

  const openEditCompany = (c: SubcontractorCompany) => {
    setEditingCompany(c);
    setCompanyNom(c.nom);
    setCompanyTelephone(c.telephone || '');
    setCompanyEmail(c.email || '');
    setCompanyAdresse(c.adresse || '');
    setCompanyContactNom(c.contactNom || '');
    setCompanyNotes(c.notes || '');
    setCompanyError(null);
    setIsCompanyModalOpen(true);
  };

  const handleSubmitCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyNom.trim()) {
      setCompanyError('Veuillez indiquer le nom de la société.');
      return;
    }
    setIsSavingCompany(true);
    setCompanyError(null);
    try {
      const payload = {
        nom: companyNom,
        telephone: companyTelephone || undefined,
        email: companyEmail || undefined,
        adresse: companyAdresse || undefined,
        contactNom: companyContactNom || undefined,
        notes: companyNotes || undefined,
      };
      if (editingCompany) await updateSubcontractorCompany(editingCompany.id, payload);
      else await createSubcontractorCompany(payload);
      await fetchAll();
      setIsCompanyModalOpen(false);
    } catch (err) {
      setCompanyError(err instanceof ApiError ? err.message : "Échec de l'enregistrement.");
    } finally {
      setIsSavingCompany(false);
    }
  };

  // --- Modal chauffeur ---
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<SubcontractorDriver | null>(null);
  const [driverCompanyId, setDriverCompanyId] = useState('');
  const [driverNom, setDriverNom] = useState('');
  const [driverTelephone, setDriverTelephone] = useState('');
  const [driverPermis, setDriverPermis] = useState('');
  const [driverAdresse, setDriverAdresse] = useState('');
  const [driverImmat, setDriverImmat] = useState('');
  const [driverNotes, setDriverNotes] = useState('');
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [driverError, setDriverError] = useState<string | null>(null);

  const openCreateDriver = (companyId: string) => {
    setEditingDriver(null);
    setDriverCompanyId(companyId);
    setDriverNom('');
    setDriverTelephone('');
    setDriverPermis('');
    setDriverAdresse('');
    setDriverImmat('');
    setDriverNotes('');
    setDriverError(null);
    setIsDriverModalOpen(true);
  };

  const openEditDriver = (d: SubcontractorDriver) => {
    setEditingDriver(d);
    setDriverCompanyId(d.companyId);
    setDriverNom(d.nom);
    setDriverTelephone(d.telephone || '');
    setDriverPermis(d.numeroPermis || '');
    setDriverAdresse(d.adresse || '');
    setDriverImmat(d.immatriculationCamion || '');
    setDriverNotes(d.notes || '');
    setDriverError(null);
    setIsDriverModalOpen(true);
  };

  const handleSubmitDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverNom.trim()) {
      setDriverError('Veuillez indiquer le nom du chauffeur.');
      return;
    }
    setIsSavingDriver(true);
    setDriverError(null);
    try {
      const payload = {
        companyId: driverCompanyId,
        nom: driverNom,
        telephone: driverTelephone || undefined,
        numeroPermis: driverPermis || undefined,
        adresse: driverAdresse || undefined,
        immatriculationCamion: driverImmat || undefined,
        notes: driverNotes || undefined,
      };
      if (editingDriver) await updateSubcontractorDriver(editingDriver.id, payload);
      else await createSubcontractorDriver(payload);
      await fetchAll();
      setIsDriverModalOpen(false);
    } catch (err) {
      setDriverError(err instanceof ApiError ? err.message : "Échec de l'enregistrement.");
    } finally {
      setIsSavingDriver(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span>Sociétés Sous-traitantes & Leurs Chauffeurs</span>
          </h2>
          <p className="text-xs text-slate-500">
            Une société peut avoir plusieurs chauffeurs — aucun n'a de compte dans l'application.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateCompany}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une Société</span>
        </button>
      </div>

      {isLoading && (
        <div className="p-10 flex items-center justify-center text-slate-400 gap-2 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement…
        </div>
      )}
      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-4 flex items-center justify-between">
          {loadError}
          <button onClick={fetchAll} className="underline cursor-pointer">Réessayer</button>
        </div>
      )}
      {!isLoading && companies.length === 0 && !loadError && (
        <div className="p-10 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          Aucune société sous-traitante enregistrée.
        </div>
      )}

      <div className="space-y-3">
        {companies.map((c) => {
          const companyDrivers = drivers.filter((d) => d.companyId === c.id);
          const isExpanded = expandedCompanyId === c.id;
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedCompanyId(isExpanded ? null : c.id)}
                className="w-full text-left p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">{c.nom}</div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      {c.telephone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.telephone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                      <span className="font-semibold text-blue-700">{c.driversCount} chauffeur(s)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); openEditCompany(c); }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Modifier
                  </span>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
                  {c.adresse && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> {c.adresse}
                    </p>
                  )}
                  {c.contactNom && (
                    <p className="text-[11px] text-slate-500">Contact : <span className="font-semibold text-slate-700">{c.contactNom}</span></p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Chauffeurs de cette société</span>
                    <button
                      type="button"
                      onClick={() => openCreateDriver(c.id)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Ajouter un chauffeur
                    </button>
                  </div>

                  {companyDrivers.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Aucun chauffeur pour cette société pour l'instant.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {companyDrivers.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => openEditDriver(d)}
                          className="text-left bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-400 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <UserRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold text-xs text-slate-900">{d.nom}</span>
                          </div>
                          {d.telephone && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1">
                              <Phone className="w-3 h-3" /> {d.telephone}
                            </div>
                          )}
                          {d.numeroPermis && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                              <IdCard className="w-3 h-3" /> Permis: {d.numeroPermis}
                            </div>
                          )}
                          {d.immatriculationCamion && (
                            <div className="text-[10px] font-mono text-slate-400 mt-1">{d.immatriculationCamion}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* COMPANY MODAL */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">{editingCompany ? 'Modifier' : 'Ajouter'} une Société</h3>
              <button onClick={() => setIsCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitCompany} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom de la Société *</label>
                <input type="text" required value={companyNom} onChange={(e) => setCompanyNom(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Téléphone</label>
                <input type="text" value={companyTelephone} onChange={(e) => setCompanyTelephone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Email</label>
                <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Adresse</label>
                <input type="text" value={companyAdresse} onChange={(e) => setCompanyAdresse(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Personne de Contact</label>
                <input type="text" value={companyContactNom} onChange={(e) => setCompanyContactNom(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes</label>
                <textarea value={companyNotes} onChange={(e) => setCompanyNotes(e.target.value)} rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              {companyError && <p className="text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{companyError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCompanyModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium cursor-pointer">Annuler</button>
                <button type="submit" disabled={isSavingCompany}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5">
                  {isSavingCompany && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRIVER MODAL */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">{editingDriver ? 'Modifier' : 'Ajouter'} un Chauffeur</h3>
              <button onClick={() => setIsDriverModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitDriver} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Société</label>
                <select value={driverCompanyId} onChange={(e) => setDriverCompanyId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold">
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom du Chauffeur *</label>
                <input type="text" required value={driverNom} onChange={(e) => setDriverNom(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Téléphone</label>
                <input type="text" value={driverTelephone} onChange={(e) => setDriverTelephone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">N° Permis de Conduire</label>
                <input type="text" value={driverPermis} onChange={(e) => setDriverPermis(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Adresse</label>
                <input type="text" value={driverAdresse} onChange={(e) => setDriverAdresse(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Immatriculation Camion</label>
                <input type="text" value={driverImmat} onChange={(e) => setDriverImmat(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes</label>
                <textarea value={driverNotes} onChange={(e) => setDriverNotes(e.target.value)} rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              {driverError && <p className="text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{driverError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsDriverModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium cursor-pointer">Annuler</button>
                <button type="submit" disabled={isSavingDriver}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5">
                  {isSavingDriver && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
