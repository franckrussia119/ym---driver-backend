import React from 'react';
import { ReportSignatures, SignatureEntry } from '../types';
import { SignaturePad } from './SignaturePad';
import { Lock, Send, Loader2, CheckCircle2 } from 'lucide-react';

interface Section5SignaturesProps {
  signatures: ReportSignatures;
  onChange: (updated: ReportSignatures) => void;
  onSubmitReport?: () => void;
  isSubmitted?: boolean;
  isSubmitting?: boolean;
}

export const Section5Signatures: React.FC<Section5SignaturesProps> = ({
  signatures,
  onChange,
  onSubmitReport,
  isSubmitted,
  isSubmitting,
}) => {
  const handleSaveRole = (
    roleKey: keyof ReportSignatures,
    nom: string,
    signature: string,
    date: string
  ) => {
    onChange({
      ...signatures,
      [roleKey]: {
        nom,
        signature,
        date,
      },
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Section Header */}
      <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white font-bold text-xs px-2.5 py-1 rounded">SECTION 5</span>
          <h2 className="font-semibold text-sm sm:text-base tracking-wide">Signatures & Validation</h2>
        </div>
        <span className="text-xs text-slate-300 italic">Validation officielle de fin de semaine</span>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        <SignaturePad
          label="Chauffeur"
          nom={signatures.chauffeur.nom}
          value={signatures.chauffeur.signature}
          date={signatures.chauffeur.date}
          onSave={(nom, sig, date) => handleSaveRole('chauffeur', nom, sig, date)}
        />

        <SignaturePad
          label="Superviseur de flotte"
          nom={signatures.superviseur.nom}
          value={signatures.superviseur.signature}
          date={signatures.superviseur.date}
          onSave={(nom, sig, date) => handleSaveRole('superviseur', nom, sig, date)}
        />

        <SignaturePad
          label="Responsable logistique"
          nom={signatures.logistique.nom}
          value={signatures.logistique.signature}
          date={signatures.logistique.date}
          onSave={(nom, sig, date) => handleSaveRole('logistique', nom, sig, date)}
        />
      </div>

      {/* Soumission finale du rapport */}
      {onSubmitReport && (
        <div className="px-5 pb-5">
          {isSubmitted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800">
              <Lock className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Rapport envoyé et verrouillé</p>
                <p className="text-xs text-emerald-700">
                  Ce rapport a été transmis à l'Administration et ne peut plus être modifié.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2 text-blue-900">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-xs">
                  Une fois envoyé, ce rapport sera transmis à l'Administration et au Superviseur, et
                  ne pourra plus être modifié. Assurez-vous d'avoir signé la case « Chauffeur »
                  ci-dessus avant de continuer.
                </p>
              </div>
              <button
                type="button"
                onClick={onSubmitReport}
                disabled={!signatures.chauffeur.signature || isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Envoi en cours…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Soumettre le rapport à l'Administration</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
