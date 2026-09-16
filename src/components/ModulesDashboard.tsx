import React, { useState } from 'react';
import {
  Navigation,
  Smartphone,
  CheckCircle2,
  QrCode,
  Star,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Play,
  Upload,
  Camera,
  Mic,
  Check,
  AlertTriangle,
  RotateCcw,
  Search,
  MapPin,
  Clock,
  Layers,
  Award
} from 'lucide-react';
import { SidebarTab } from './Sidebar';

interface ModulesDashboardProps {
  onSelectModule: (tab: SidebarTab) => void;
  onOpenPODModal?: (name: string) => void;
}

export const ModulesDashboard: React.FC<ModulesDashboardProps> = ({
  onSelectModule,
  onOpenPODModal,
}) => {
  const [activeModuleModal, setActiveModuleModal] = useState<string | null>(null);

  // Barcode Scanner Modal State
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Customer Feedback State
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Hazmat Planner State
  const [hazmatClass, setHazmatClass] = useState('3 - Liquides Inflammables');
  const [truckWeightTons, setTruckWeightTons] = useState(38);

  const modulesList = [
    {
      id: 'realtime_eta',
      icon: Navigation,
      title: 'Suivi en temps réel et ETA',
      desc: 'Suivez la position de vos conducteurs et obtenez des heures d’arrivée précises.',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      tab: 'realtime_eta' as SidebarTab,
    },
    {
      id: 'driver_mobile_app',
      icon: Smartphone,
      title: 'Application mobile pour les conducteurs',
      desc: 'Envoyez les itinéraires directement aux conducteurs et recevez des mises à jour en temps réel.',
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      tab: 'driver_mobile_app' as SidebarTab,
    },
    {
      id: 'barcode_scan',
      icon: QrCode,
      title: 'Scan de codes-barres',
      desc: 'Scannez les codes-barres pour confirmer la fin d’une commande dans l’application Conducteur.',
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      tab: 'barcode_scan' as SidebarTab,
    },
    {
      id: 'customer_feedback',
      icon: Star,
      title: 'Retour client',
      desc: 'Recueillez et analysez les avis clients après la réalisation d’une mission.',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      tab: 'customer_feedback' as SidebarTab,
    },
    {
      id: 'hazmat_routing',
      icon: ShieldAlert,
      title: 'Itinéraires pour camions et matières dangereuses',
      desc: 'Optimisez les itinéraires pour les poids lourds et les véhicules transportant des matières dangereuses.',
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      tab: 'hazmat_routing' as SidebarTab,
    },
  ];

  const handleSimulateScan = () => {
    setIsScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setIsScanning(false);
      setScanResult('BL-2026-9048-MSCU-DELIVERED-OK');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Plateforme Logistique Complète YM-TRANSIT</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            5 Modules & Services d'Optimisation
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Gestion automatisée des itinéraires, preuve de livraison numérique (POD), scan de codes-barres, guidage poids lourd Hazmat et suivi client.
          </p>
        </div>

        <button
          onClick={() => onSelectModule('routes_overview')}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>Accéder au Dispatch GPS</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 12 MODULES GRID MATCHING SCREENSHOT 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modulesList.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              onClick={() => {
                if (m.tab === 'barcode_scan' || m.tab === 'customer_feedback' || m.tab === 'hazmat_routing') {
                  setActiveModuleModal(m.id);
                } else {
                  onSelectModule(m.tab);
                }
              }}
              className="p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 relative group flex flex-col justify-between bg-white border-slate-200 hover:border-blue-400"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs ${m.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-extrabold group-hover:text-blue-600 transition-colors">
                    Lancer &rarr;
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {m.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{m.desc}</p>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span className="text-blue-600 font-bold">Actif & Déployé</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">Module ERP</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL FOR BARCODE SCANNER SIMULATION */}
      {activeModuleModal === 'barcode_scan' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-slate-900">Scan de code-barres / QR</h3>
              </div>
              <button
                onClick={() => setActiveModuleModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Scannez le code-barres du colis ou du conteneur pour valider la fin de la commande.
            </p>

            <div className="bg-slate-900 rounded-xl p-8 text-center text-white relative overflow-hidden flex flex-col items-center justify-center min-h-[180px]">
              {isScanning ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-purple-300 font-mono animate-pulse">Lecture du code-barres en cours...</p>
                </div>
              ) : scanResult ? (
                <div className="space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-xs text-emerald-300 font-bold">Code scanné avec succès !</p>
                  <p className="text-xs font-mono bg-slate-800 text-white px-3 py-1 rounded border border-slate-700">
                    {scanResult}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <QrCode className="w-12 h-12 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">Positionnez le vœu ou le code-barres devant le viseur</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSimulateScan}
                disabled={isScanning}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                {isScanning ? 'Numérisation...' : 'Lancer le scan'}
              </button>

              <button
                onClick={() => setActiveModuleModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR CUSTOMER FEEDBACK */}
      {activeModuleModal === 'customer_feedback' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="font-bold text-base text-slate-900">Avis & Retour Client</h3>
              </div>
              <button
                onClick={() => setActiveModuleModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {feedbackSubmitted ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm text-emerald-900">Merci pour votre évaluation !</h4>
                <p className="text-xs text-emerald-700">Votre avis a été directement enregistré dans le rapport de livraison.</p>
                <button
                  onClick={() => {
                    setFeedbackSubmitted(false);
                    setActiveModuleModal(null);
                  }}
                  className="mt-2 px-4 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  Terminer
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Note de satisfaction :</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Remarques ou commentaires :</label>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Livraison dans les temps, chauffeur très professionnel..."
                    rows={3}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                  ></textarea>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setFeedbackSubmitted(true)}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Envoyer l'évaluation
                  </button>
                  <button
                    onClick={() => setActiveModuleModal(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL FOR HAZMAT ROUTING */}
      {activeModuleModal === 'hazmat_routing' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-base text-slate-900">Guidage Camion & Matières Dangereuses</h3>
              </div>
              <button
                onClick={() => setActiveModuleModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Catégorie Matière Dangereuse (ADR) :</label>
                <select
                  value={hazmatClass}
                  onChange={(e) => setHazmatClass(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="1 - Explosifs">Classe 1 - Explosifs</option>
                  <option value="2 - Gaz Inflammables">Classe 2 - Gaz Inflammables</option>
                  <option value="3 - Liquides Inflammables">Classe 3 - Liquides Inflammables (Carburant)</option>
                  <option value="8 - Corrosifs">Classe 8 - Produits Corrosifs</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Poids Total Autorisé en Charge (Tonnes) :</label>
                <input
                  type="number"
                  value={truckWeightTons}
                  onChange={(e) => setTruckWeightTons(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  Restrictions actives calculées
                </p>
                <p className="text-[11px] text-orange-800">
                  Évitement automatique des tunnels réservés de catégorie E, ponts limités à 30T et zones résidentielles.
                </p>
              </div>

              <button
                onClick={() => {
                  alert(`Itinéraire poids lourd Hazmat (${hazmatClass}) recalculé avec succès !`);
                  setActiveModuleModal(null);
                }}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Appliquer à la carte GPS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
