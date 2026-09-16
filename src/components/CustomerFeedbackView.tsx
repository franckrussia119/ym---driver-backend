import React, { useState } from 'react';
import {
  Star,
  MessageSquare,
  Search,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Send,
  Building2,
  Smile,
  Frown,
  Meh,
  Plus,
  X,
  History,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { UserProfile } from '../types';

export interface CustomerFeedbackRecord {
  id: string;
  clientName: string;
  blNumber: string;
  driverName: string;
  date: string;
  rating: number; // 1-5
  punctualityScore: 'Excellente' | 'Correcte' | 'Retard';
  cargoConditionScore: 'Intacte' | 'Dommage Mineur' | 'Avarie Grave';
  comment: string;
  status: 'TRAITE' | 'EN_COURS' | 'RECLAMATION';
}

interface CustomerFeedbackViewProps {
  currentUser: UserProfile | null;
}

export const DEMO_FEEDBACKS: CustomerFeedbackRecord[] = [
  {
    id: 'FB-2026-101',
    clientName: 'Cimenteries du Cameroun (CIMENCAM)',
    blNumber: 'BL-889012-MSC',
    driverName: 'Mamadou Kouyaté',
    date: '12/08/2026',
    rating: 5,
    punctualityScore: 'Excellente',
    cargoConditionScore: 'Intacte',
    comment: 'Livraison parfaitement à l\'heure. Chauffeur très professionnel et courtois lors du déchargement.',
    status: 'TRAITE',
  },
  {
    id: 'FB-2026-102',
    clientName: 'Brasseries du Cameroun (SABC)',
    blNumber: 'BL-991044-MAE',
    driverName: 'Ousmane Sow',
    date: '11/08/2026',
    rating: 4,
    punctualityScore: 'Correcte',
    cargoConditionScore: 'Intacte',
    comment: 'Légère attente à l\'entrée du dépôt mais service très propre.',
    status: 'TRAITE',
  },
  {
    id: 'FB-2026-103',
    clientName: 'SOGEA SATOM Cameroun',
    blNumber: 'BL-771092-CMA',
    driverName: 'Ibrahim Traoré',
    date: '10/08/2026',
    rating: 5,
    punctualityScore: 'Excellente',
    cargoConditionScore: 'Intacte',
    comment: 'Excellente communication par téléphone avant l\'arrivée sur le chantier de Bafoussam.',
    status: 'TRAITE',
  },
];

export const CustomerFeedbackView: React.FC<CustomerFeedbackViewProps> = ({
  currentUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'MENU' | 'CREATE' | 'HISTORY'>('MENU');
  const [feedbacks, setFeedbacks] = useState<CustomerFeedbackRecord[]>(DEMO_FEEDBACKS);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');

  // New Feedback Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [blNumber, setBlNumber] = useState('');
  const [driverName, setDriverName] = useState(currentUser?.name || 'Mamadou Kouyaté');
  const [rating, setRating] = useState(5);
  const [punctualityScore, setPunctualityScore] = useState<CustomerFeedbackRecord['punctualityScore']>('Excellente');
  const [cargoConditionScore, setCargoConditionScore] = useState<CustomerFeedbackRecord['cargoConditionScore']>('Intacte');
  const [comment, setComment] = useState('');

  const filteredFeedbacks = feedbacks.filter((f) => {
    const matchesSearch =
      f.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.blNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = ratingFilter === 'ALL' || f.rating.toString() === ratingFilter;
    return matchesSearch && matchesRating;
  });

  const handleCreateFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !comment.trim()) {
      alert('Veuillez renseigner le nom du client et le commentaire.');
      return;
    }

    const newFeedback: CustomerFeedbackRecord = {
      id: `FB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      clientName,
      blNumber: blNumber || 'BL-DIRECT',
      driverName,
      date: new Date().toLocaleDateString('fr-FR'),
      rating,
      punctualityScore,
      cargoConditionScore,
      comment,
      status: rating >= 4 ? 'TRAITE' : 'RECLAMATION',
    };

    setFeedbacks([newFeedback, ...feedbacks]);
    setIsModalOpen(false);

    // Reset Form
    setClientName('');
    setBlNumber('');
    setComment('');
    setRating(5);

    // Switch view to history automatically
    setActiveSubTab('HISTORY');
    alert('Avis client enregistré avec succès !');
  };

  const avgRating =
    feedbacks.length > 0
      ? (feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / feedbacks.length).toFixed(1)
      : '5.0';

  const handleExportCSV = () => {
    const headers = ['Ref', 'Client', 'BL', 'Chauffeur', 'Date', 'Note /5', 'Ponctualite', 'Cargo', 'Commentaire'];
    const rows = filteredFeedbacks.map((f) => [
      f.id,
      f.clientName,
      f.blNumber,
      f.driverName,
      f.date,
      f.rating,
      f.punctualityScore,
      f.cargoConditionScore,
      f.comment,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Retour_Clients_YM_TRANSIT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>Satisfaction & Qualité de Service</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Retour Client & Évaluations
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Collecte et analyse des avis clients après chaque livraison de conteneur.
            </p>
          </div>

          {activeSubTab !== 'MENU' && (
            <button
              type="button"
              onClick={() => setActiveSubTab('MENU')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-700 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Menu Principal</span>
            </button>
          )}
        </div>

        {/* SUB-MENU TABS (WHEN INSIDE CREATE OR HISTORY) */}
        {activeSubTab !== 'MENU' && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setActiveSubTab('CREATE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'CREATE'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Saisir un avis</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('HISTORY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'HISTORY'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Historique et analyse ({feedbacks.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* MENU LAUNCHER: TWO CLEAN ACTION CARDS (WHEN ACTIVE SUB TAB IS MENU) */}
      {activeSubTab === 'MENU' && (
        <div className="max-w-2xl mx-auto space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ACTION CARD 1: SAISIR UN AVIS */}
            <button
              type="button"
              onClick={() => setActiveSubTab('CREATE')}
              className="group relative bg-white hover:bg-amber-50/50 p-5 rounded-2xl border-2 border-slate-200 hover:border-amber-500 shadow-sm transition-all duration-200 text-left cursor-pointer flex flex-col justify-between min-h-[150px] active:scale-[0.99]"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                  <Star className="w-6 h-6 fill-amber-500 group-hover:fill-slate-950" />
                </div>
                <span className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-amber-100 text-slate-400 group-hover:text-amber-600 flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4" />
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Saisir un Avis / Retour Client
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  Enregistrer l'évaluation du client, la note sur 5 étoiles et les appréciations sur la livraison.
                </p>
              </div>
            </button>

            {/* ACTION CARD 2: HISTORIQUE ET ANALYSE */}
            <button
              type="button"
              onClick={() => setActiveSubTab('HISTORY')}
              className="group relative bg-white hover:bg-blue-50/50 p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-600 shadow-sm transition-all duration-200 text-left cursor-pointer flex flex-col justify-between min-h-[150px] active:scale-[0.99]"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <span className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Historique et Analyse des Avis
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  Consulter la note moyenne ({avgRating}/5), le taux de conformité et tous les commentaires ({feedbacks.length}).
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* SUB-VIEW 1: SAISIR UN AVIS */}
      {activeSubTab === 'CREATE' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto space-y-5">
          <div className="flex items-center space-x-2.5 border-b pb-3 border-slate-100">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Star className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900">Saisie d'un Nouvel Avis / Retour Client</h2>
              <p className="text-xs text-slate-500">Évaluation directe de la prestation de transport et déchargement</p>
            </div>
          </div>

          <form onSubmit={handleCreateFeedback} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nom du Client & Entreprise <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: CIMENCAM Douala"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">N° Bon de Livraison (BL)</label>
                <input
                  type="text"
                  value={blNumber}
                  onChange={(e) => setBlNumber(e.target.value)}
                  placeholder="Ex: BL-2026-890"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Chauffeur Concerné</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Note Globale de Satisfaction (/5) :</label>
              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 inline-flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 cursor-pointer transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="font-extrabold text-slate-800 text-sm font-mono ml-2">{rating} / 5</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ponctualité du Chauffeur</label>
                <select
                  value={punctualityScore}
                  onChange={(e) => setPunctualityScore(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                >
                  <option value="Excellente">Excellente (À l'heure)</option>
                  <option value="Correcte">Correcte (Léger retard acceptable)</option>
                  <option value="Retard">Retard Important</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">État du Conteneur / Marchandise</label>
                <select
                  value={cargoConditionScore}
                  onChange={(e) => setCargoConditionScore(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                >
                  <option value="Intacte">Intacte (Aucun dommage)</option>
                  <option value="Dommage Mineur">Dommage Mineur (Réserves légères)</option>
                  <option value="Avarie Grave">Avarie Grave</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Commentaire & Remarques du Client <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Appréciation détaillée du client sur la livraison, courtoisie du chauffeur, rapidité..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-3">
              <button
                type="submit"
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Enregistrer & Soumettre l'Avis Client</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-VIEW 2: HISTORIQUE ET ANALYSE */}
      {activeSubTab === 'HISTORY' && (
        <>
          {/* KPI SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Note Moyenne Flotte</span>
                <p className="text-2xl font-black text-amber-500 font-mono mt-0.5">{avgRating} / 5</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
                <Star className="w-5 h-5 fill-amber-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Avis Enregistrés</span>
                <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{feedbacks.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Taux Conforme</span>
                <p className="text-2xl font-black text-emerald-600 font-mono mt-0.5">100%</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* SEARCH BAR & FILTERS */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher un avis par client, N° BL ou chauffeur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Toutes les notes</option>
                <option value="5">5 Étoiles (Parfait)</option>
                <option value="4">4 Étoiles (Très bon)</option>
                <option value="3">3 Étoiles (Moyen)</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>
            </div>
          </div>

          {/* FEEDBACK CARDS / TABLE */}
          <div className="space-y-3">
            {filteredFeedbacks.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                Aucun retour client trouvé.
              </div>
            ) : (
              filteredFeedbacks.map((f) => (
                <div
                  key={f.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-amber-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{f.clientName}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded">
                          {f.blNumber}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                        Chauffeur : <strong className="text-slate-800">{f.driverName}</strong> · Date : {f.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-800 font-mono ml-1">{f.rating}/5</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                    "{f.comment}"
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-500 pt-1">
                    <span>Ponctualité : <strong className="text-emerald-700">{f.punctualityScore}</strong></span>
                    <span>·</span>
                    <span>État Marchandise : <strong className="text-emerald-700">{f.cargoConditionScore}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* CREATE FEEDBACK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900">Saisie Retour Client</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFeedback} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nom du Client <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: CIMENCAM Douala"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">N° Bon de Livraison (BL)</label>
                <input
                  type="text"
                  value={blNumber}
                  onChange={(e) => setBlNumber(e.target.value)}
                  placeholder="Ex: BL-2026-890"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Chauffeur Concerné</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Note globale (/5) :</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Commentaire du Client :</label>
                <textarea
                  rows={3}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Appréciation du client, ponctualité, politesse du chauffeur..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Enregistrer l'Avis
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
