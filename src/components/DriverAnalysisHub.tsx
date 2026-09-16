import React, { useState } from 'react';
import { Users, Truck } from 'lucide-react';
import { DriverAnalysisView } from './DriverAnalysisView';
import { SubcontractorAnalysisView } from './SubcontractorAnalysisView';

type Tab = 'NOS_CHAUFFEURS' | 'SOUS_TRAITANTS';

export const DriverAnalysisHub: React.FC = () => {
  const [tab, setTab] = useState<Tab>('NOS_CHAUFFEURS');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab('NOS_CHAUFFEURS')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
            tab === 'NOS_CHAUFFEURS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Nos Chauffeurs
        </button>
        <button
          onClick={() => setTab('SOUS_TRAITANTS')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
            tab === 'SOUS_TRAITANTS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Sous-traitants
        </button>
      </div>

      {tab === 'NOS_CHAUFFEURS' ? <DriverAnalysisView /> : <SubcontractorAnalysisView />}
    </div>
  );
};
