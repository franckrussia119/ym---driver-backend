import React from 'react';
import { DriverInfo } from '../types';
import { User, Truck, Calendar, Tag, Lock, ShieldCheck } from 'lucide-react';

interface Section1DriverInfoProps {
  driverInfo: DriverInfo;
  onChange: (updated: DriverInfo) => void;
  isSubmitted?: boolean;
}

export const Section1DriverInfo: React.FC<Section1DriverInfoProps> = ({ driverInfo, onChange, isSubmitted }) => {
  const handleChange = (field: keyof DriverInfo, value: string) => {
    onChange({
      ...driverInfo,
      [field]: value,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Section Header */}
      <div className="bg-slate-900 text-white px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white font-bold text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded shrink-0">SECTION 1</span>
          <div>
            <h2 className="font-semibold text-xs sm:text-base tracking-wide flex items-center gap-1.5">
              <span>Identification du Chauffeur & Véhicule</span>
              <span className="bg-blue-950 text-blue-200 border border-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-400" /> Profil Compte Admin
              </span>
            </h2>
          </div>
        </div>

        {/* Semaine du ... au ... */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
          <div className="flex items-center gap-1 text-slate-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Semaine du</span>
          </div>
          <input
            type="date"
            value={driverInfo.semaineDu}
            onChange={(e) => handleChange('semaineDu', e.target.value)}
            disabled={isSubmitted}
            className="bg-slate-900 text-white px-1.5 py-0.5 rounded border border-slate-600 focus:outline-none focus:border-blue-500 text-[11px] sm:text-xs font-mono"
          />
          <span className="text-slate-400 font-medium">au</span>
          <input
            type="date"
            value={driverInfo.semaineAu}
            onChange={(e) => handleChange('semaineAu', e.target.value)}
            disabled={isSubmitted}
            className="bg-slate-900 text-white px-1.5 py-0.5 rounded border border-slate-600 focus:outline-none focus:border-blue-500 text-[11px] sm:text-xs font-mono"
          />
        </div>
      </div>

      {/* Info Notice Bar */}
      <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs text-slate-600 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Informations enregistrées sur votre compte (Créées par l'Administration). Mode lecture seule.</span>
        </span>
      </div>

      {/* Grid of Read-Only Profile Card Displays */}
      <div className="p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Nom & Prénom Chauffeur */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-600" /> Nom & Prénom Chauffeur
          </label>
          <div className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800 flex items-center justify-between">
            <span className="truncate">{driverInfo.nomChauffeur || 'Compte Chauffeur'}</span>
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </div>
        </div>

        {/* Immatriculation / N° de flotte du camion */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-600" /> Immatriculation / Flotte
          </label>
          <div className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 flex items-center justify-between uppercase">
            <span className="truncate">{driverInfo.immatriculation || 'AB-789-XY'}</span>
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </div>
        </div>

        {/* Marque et Modèle du camion */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-600" /> Marque et Modèle Camion
          </label>
          <div className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-800 flex items-center justify-between">
            <span className="truncate">{driverInfo.marqueModele || 'Volvo FH 500'}</span>
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </div>
        </div>

        {/* N° de Remorque / Châssis */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-600" /> Remorque / Châssis Assigné
          </label>
          <div className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 flex items-center justify-between">
            <span className="truncate">{driverInfo.noRemorque || 'REM-904 (Standard)'}</span>
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </div>
        </div>
      </div>
    </div>
  );
};

