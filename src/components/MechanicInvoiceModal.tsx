import React, { useState } from 'react';
import {
  X,
  Wrench,
  Plus,
  Trash2,
  Printer,
  Save,
  Truck,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { SparePartItem, formatFCFA, UserProfile } from '../types';
import { createInvoice } from '../lib/invoices';
import { ApiError } from '../lib/api';

interface MechanicInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentUser: UserProfile | null;
  initialTruck?: string;
  initialChauffeur?: string;
  initialFaultId?: string;
}

export const MechanicInvoiceModal: React.FC<MechanicInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  currentUser,
  initialTruck = '',
  initialChauffeur = '',
  initialFaultId,
}) => {
  const [truckImmatriculation, setTruckImmatriculation] = useState(initialTruck);
  const [chauffeurNom, setChauffeurNom] = useState(initialChauffeur);
  const [descriptionTravaux, setDescriptionTravaux] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [parts, setParts] = useState<SparePartItem[]>([]);

  const [mainOeuvreHeures, setMainOeuvreHeures] = useState<number>(0);
  const [tauxHoraire, setTauxHoraire] = useState<number>(0);

  if (!isOpen) return null;

  const handlePartChange = (id: string, field: keyof SparePartItem, value: any) => {
    setParts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'unitPrice') {
          const qty = Number(updated.qty) || 0;
          const price = Number(updated.unitPrice) || 0;
          updated.total = qty * price;
        }
        return updated;
      })
    );
  };

  const handleAddPart = () => {
    setParts((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}`,
        name: '',
        qty: 1,
        unitPrice: 0,
        total: 0,
      },
    ]);
  };

  const handleRemovePart = (id: string) => {
    setParts((prev) => prev.filter((p) => p.id !== id));
  };

  const totalPieces = parts.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  const totalMainOeuvre = (Number(mainOeuvreHeures) || 0) * (Number(tauxHoraire) || 0);
  const totalHT = totalPieces + totalMainOeuvre;
  const totalTTC = totalHT; // 0% TVA or TTC directly in FCFA

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!truckImmatriculation.trim() || !descriptionTravaux.trim() || parts.length === 0) {
      setSaveError('Veuillez renseigner le camion, la description et au moins une pièce.');
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    try {
      await createInvoice({
        faultId: initialFaultId,
        truckImmatriculation,
        chauffeurNom: chauffeurNom || undefined,
        dateIntervention: new Date().toISOString().split('T')[0],
        descriptionTravaux,
        parts: parts.map((p) => ({ name: p.name, qty: p.qty, unitPrice: p.unitPrice })),
        mainOeuvreHeures,
        tauxHoraire,
        tva: 0,
      });
      onSaved();
      onClose();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Échec de l'enregistrement de la facture.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Modal Top Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Facture Atelier Mécanique</h3>
              <p className="text-[10px] text-slate-400">Montants calculés exclusivement en FCFA</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          
          {/* Truck & Driver Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Véhicule / Immatriculation
              </label>
              <input
                type="text"
                value={truckImmatriculation}
                onChange={(e) => setTruckImmatriculation(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Chauffeur Référent
              </label>
              <input
                type="text"
                value={chauffeurNom}
                onChange={(e) => setChauffeurNom(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description of work */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
              Description des travaux & interventions
            </label>
            <textarea
              rows={2}
              value={descriptionTravaux}
              onChange={(e) => setDescriptionTravaux(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* SPARE PARTS TABLE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Pièces Détachées Remplacées
              </span>
              <button
                type="button"
                onClick={handleAddPart}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter Pièce</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-normal uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Désignation Pièce</th>
                    <th className="py-2 px-2 w-16 text-center">Qté</th>
                    <th className="py-2 px-3 text-right">P.U. (FCFA)</th>
                    <th className="py-2 px-3 text-right">Total FCFA</th>
                    <th className="py-2 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parts.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handlePartChange(item.id, 'name', e.target.value)}
                          placeholder="Ex: Pneu 315/80 R22.5, Filtre à huile..."
                          required
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handlePartChange(item.id, 'qty', Number(e.target.value))}
                          required
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-center font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={item.unitPrice}
                          onChange={(e) => handlePartChange(item.id, 'unitPrice', Number(e.target.value))}
                          required
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-right font-mono font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatFCFA(item.total)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemovePart(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right text-xs text-slate-600 font-medium">
              Sous-total pièces : <span className="font-bold font-mono text-slate-900">{formatFCFA(totalPieces)}</span>
            </div>
          </div>

          {/* LABOR SECTION */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              2. Main d'Œuvre & Taux Horaire
            </span>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">
                  Nombre d'heures
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={mainOeuvreHeures}
                  onChange={(e) => setMainOeuvreHeures(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">
                  Taux Horaire (FCFA / h)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={tauxHoraire}
                  onChange={(e) => setTauxHoraire(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="text-right text-xs text-slate-600 font-medium">
              Sous-total main d'œuvre : <span className="font-bold font-mono text-slate-900">{formatFCFA(totalMainOeuvre)}</span>
            </div>
          </div>

          {/* TOTAL SUMMARY CARD */}
          <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Total Pièces détachées :</span>
              <span className="font-mono">{formatFCFA(totalPieces)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Total Main d'Œuvre :</span>
              <span className="font-mono">{formatFCFA(totalMainOeuvre)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
              <span>MONTANT TOTAL FACTURE :</span>
              <span className="font-mono text-blue-400 text-base">{formatFCFA(totalTTC)}</span>
            </div>
          </div>

          {/* Form Submit Footer */}
          {saveError && (
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isSaving ? 'Enregistrement…' : 'Valider & Transmettre Facture (FCFA)'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
