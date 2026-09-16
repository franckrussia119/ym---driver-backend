import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight, Loader2, Mail } from 'lucide-react';
import { UserProfile } from '../types';
import { login } from '../lib/auth';
import { ApiError } from '../lib/api';

interface LoginFormProps {
  onSuccess: (user: UserProfile) => void;
  /** Style de conteneur : 'page' pour un écran plein, 'modal' pour un formulaire compact */
  variant?: 'page' | 'modal';
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, variant = 'page' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      onSuccess(user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue. Réessayez.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isModal = variant === 'modal';

  return (
    <form
      onSubmit={handleSubmit}
      className={isModal ? 'space-y-4' : 'space-y-5'}
      autoComplete="on"
    >
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Adresse email
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@ym-transit.com"
            autoComplete="username"
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-medium text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Mot de passe
        </label>
        <div className="relative">
          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Votre mot de passe"
            autoComplete="current-password"
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-medium text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 font-semibold bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold rounded-xl shadow-xl flex items-center justify-center space-x-2 text-sm transition-all cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connexion en cours…</span>
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            <span>Se connecter</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};
