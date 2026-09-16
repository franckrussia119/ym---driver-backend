import React from 'react';
import { UserProfile } from '../types';
import { Truck, Lock, Smartphone } from 'lucide-react';
import { LoginForm } from './LoginForm';

interface LandingPortalProps {
  onLoginSuccess: (user: UserProfile) => void;
  onInstallPWA?: () => void;
  canInstallPWA?: boolean;
}

export const LandingPortal: React.FC<LandingPortalProps> = ({
  onLoginSuccess,
  onInstallPWA,
  canInstallPWA,
}) => {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-950">
      {/* Truck illustration background */}
      <svg
        className="absolute inset-0 w-full h-full object-cover opacity-[0.16]"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="1200" height="800" fill="#020617" />
        {/* Road */}
        <rect x="0" y="620" width="1200" height="180" fill="#0f172a" />
        <g stroke="#334155" strokeWidth="6" strokeDasharray="40 30">
          <line x1="0" y1="705" x2="1200" y2="705" />
        </g>
        {/* Distant hills */}
        <path d="M0 600 Q 200 520 400 600 T 800 600 T 1200 600 V800 H0 Z" fill="#0b1220" />
        {/* Truck body */}
        <g transform="translate(280,380)">
          {/* Trailer */}
          <rect x="0" y="0" width="520" height="200" rx="10" fill="#1e293b" stroke="#3b82f6" strokeWidth="4" />
          <rect x="20" y="20" width="480" height="160" rx="4" fill="#0f172a" />
          {/* Cab */}
          <path d="M520 60 h120 a20 20 0 0 1 20 20 v120 h-140 z" fill="#1e293b" stroke="#3b82f6" strokeWidth="4" />
          <rect x="545" y="90" width="70" height="55" rx="6" fill="#3b82f6" opacity="0.5" />
          {/* Chassis */}
          <rect x="-10" y="195" width="700" height="18" fill="#0f172a" />
          {/* Wheels */}
          <circle cx="90" cy="225" r="42" fill="#020617" stroke="#475569" strokeWidth="8" />
          <circle cx="90" cy="225" r="16" fill="#334155" />
          <circle cx="270" cy="225" r="42" fill="#020617" stroke="#475569" strokeWidth="8" />
          <circle cx="270" cy="225" r="16" fill="#334155" />
          <circle cx="600" cy="225" r="42" fill="#020617" stroke="#475569" strokeWidth="8" />
          <circle cx="600" cy="225" r="16" fill="#334155" />
        </g>
      </svg>

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/70 to-slate-950/95" />

      {/* Install PWA button, top-right */}
      {canInstallPWA && onInstallPWA && (
        <button
          onClick={onInstallPWA}
          className="absolute top-5 right-5 z-10 px-3.5 py-2 bg-blue-600/90 hover:bg-blue-500 backdrop-blur-sm text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Smartphone className="w-4 h-4" />
          <span className="hidden sm:inline">Installer l'application</span>
          <span className="sm:hidden">Installer</span>
        </button>
      )}

      {/* Main login card */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner mb-4">
            <Truck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">YM-TRANSIT</h1>
          <p className="text-xs text-slate-400 mt-1">Gestion Flotte & Logistique — Cameroun</p>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400" />
            <span>Connexion</span>
          </h2>
          <LoginForm onSuccess={onLoginSuccess} variant="page" />
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-5">
          Identifiants créés et gérés par votre Super Administrateur.
        </p>
      </div>
    </div>
  );
};
