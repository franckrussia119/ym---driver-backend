import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Edit2,
  CheckCircle2,
  XCircle,
  Truck,
  Eye,
  EyeOff,
  UserCheck,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { UserRole } from '../types';
import { listUsers, createUser, updateUser, BackendUser } from '../lib/users';
import { ApiError } from '../lib/api';
import { usePolling } from '../lib/usePolling';

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<BackendUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('CHAUFFEUR');
  const [password, setPassword] = useState('');
  const [camionAssigne, setCamionAssigne] = useState('');
  const [telephone, setTelephone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Impossible de charger les utilisateurs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  usePolling(() => {
    listUsers().then(setUsers).catch(() => {});
  }, 15000);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('CHAUFFEUR');
    setPassword('');
    setCamionAssigne('');
    setTelephone('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: BackendUser) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setPassword(''); // Laissé vide = mot de passe inchangé
    setCamionAssigne(u.camionAssigne || '');
    setTelephone(u.telephone || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!editingUser && (!password || password.length < 6)) {
      setFormError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name,
          role,
          camionAssigne: role === 'CHAUFFEUR' ? camionAssigne : null,
          telephone: telephone || null,
          ...(password ? { password } : {}),
        });
      } else {
        await createUser({
          name,
          email,
          password,
          role,
          camionAssigne: role === 'CHAUFFEUR' ? camionAssigne : undefined,
          telephone: telephone || undefined,
        });
      }
      setIsModalOpen(false);
      await fetchUsers();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserActive = async (u: BackendUser) => {
    try {
      await updateUser(u.id, { isActive: !u.isActive });
      await fetchUsers();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Impossible de modifier ce compte.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Gestion des Utilisateurs & Accès Flotte</span>
          </h2>
          <p className="text-xs text-slate-500">
            Espace Super Admin — Créer, désactiver et gérer les comptes utilisateurs (Chauffeur, Mécanicien, Superviseur, Admin).
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nouvel Utilisateur</span>
        </button>
      </div>

      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-3.5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{loadError}</span>
          <button onClick={fetchUsers} className="ml-auto underline cursor-pointer">Réessayer</button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            Comptes enregistrés ({users.length})
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Sécurité : Mots de passe chiffrés côté serveur</span>
        </div>

        {isLoading ? (
          <div className="p-10 flex items-center justify-center text-slate-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement des utilisateurs…
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Aucun utilisateur pour le moment.</div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-normal uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-3">Rôle</th>
                <th className="py-3 px-3">Véhicule Assigné</th>
                <th className="py-3 px-3 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500 font-normal">{u.email}</div>
                        {u.telephone && <div className="text-[11px] text-slate-400 font-normal">{u.telephone}</div>}
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'SUPER_ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'ADMIN'
                          ? 'bg-blue-100 text-blue-800'
                          : u.role === 'SUPERVISEUR'
                          ? 'bg-indigo-100 text-indigo-800'
                          : u.role === 'SUPERVISEUR_CONTENEURS'
                          ? 'bg-cyan-100 text-cyan-800'
                          : u.role === 'MECANICIEN'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {u.role === 'SUPERVISEUR_CONTENEURS' ? 'Superviseur Conteneurs' : u.role}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-slate-700 font-medium">
                    {u.camionAssigne ? (
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        {u.camionAssigne}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">—</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <button
                      onClick={() => handleToggleUserActive(u)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                        u.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      {u.isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Actif</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Désactivé</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                      title="Modifier compte"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* User Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>{editingUser ? 'Modifier Utilisateur' : 'Créer un Utilisateur'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nom complet</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ex: Moussa Diop"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Adresse E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!!editingUser}
                  placeholder="Ex: m.diop@ym-transit.com"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
                {editingUser && (
                  <p className="text-[10px] text-slate-400 mt-1">L'email ne peut pas être modifié.</p>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Ex: 677001122"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rôle dans l'entreprise</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none font-semibold cursor-pointer"
                >
                  <option value="CHAUFFEUR">Chauffeur</option>
                  <option value="MECANICIEN">Mécanicien</option>
                  <option value="SUPERVISEUR">Superviseur de Flotte</option>
                  <option value="SUPERVISEUR_CONTENEURS">Superviseur Conteneurs</option>
                  <option value="ADMIN">Administration</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              {role === 'CHAUFFEUR' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Camion Assigné</label>
                  <input
                    type="text"
                    value={camionAssigne}
                    onChange={(e) => setCamionAssigne(e.target.value)}
                    placeholder="Ex: AB-789-XY (Volvo FH 500)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Mot de Passe {editingUser && '(laisser vide pour ne pas changer)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    required={!editingUser}
                    minLength={6}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingUser ? 'Mettre à jour' : 'Enregistrer Utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
