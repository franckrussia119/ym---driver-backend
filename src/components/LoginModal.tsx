import React from 'react';
import { UserProfile } from '../types';
import { Truck, Lock } from 'lucide-react';
import { LoginForm } from './LoginForm';

interface LoginModalProps {
  onLogin: (user: UserProfile) => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative border-b border-slate-800">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Fermer"
            >
              ✕
            </button>
          )}
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">YM-TRANSIT FLEET</h2>
              <p className="text-xs text-slate-400">Portail Logistique, Transport & Maintenance</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Connexion sécurisée à votre espace.
          </p>
        </div>

        {/* Real login form */}
        <div className="p-6 bg-slate-900">
          <LoginForm onSuccess={onLogin} variant="modal" />
        </div>
      </div>
    </div>
  );
};
