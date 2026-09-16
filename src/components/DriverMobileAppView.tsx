import React, { useState } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  MapPin,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Phone,
  Navigation,
  FileText,
  QrCode,
  Truck,
  Check
} from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  timeWindow: string;
  timeWindowStatus: 'valid' | 'warning' | 'alert';
  time: string;
  etaOffset: string;
  address: string;
  mileage: string;
  duration: string;
  status: 'pending' | 'confirmed' | 'rejected';
}

// Aucune commande fictive : la liste démarre vide. Les arrêts réels
// apparaissent une fois qu'une tournée leur a été assignée (module
// "Planification").
const SAMPLE_ORDERS: OrderItem[] = [];

interface DriverMobileAppViewProps {
  onBackToDashboard?: () => void;
  onOpenPODModal?: (orderName: string) => void;
  onOpenScanModal?: () => void;
}

export const DriverMobileAppView: React.FC<DriverMobileAppViewProps> = ({
  onBackToDashboard,
  onOpenPODModal,
  onOpenScanModal,
}) => {
  const [orders, setOrders] = useState<OrderItem[]>(SAMPLE_ORDERS);
  const [activeMenuOrderId, setActiveMenuOrderId] = useState<string | null>(null);

  const handleConfirm = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'confirmed' } : o))
    );
    setActiveMenuOrderId(null);
  };

  const handleReject = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'rejected' } : o))
    );
    setActiveMenuOrderId(null);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-100 min-h-[680px] rounded-2xl shadow-xl overflow-hidden border border-slate-300 flex flex-col my-2">
      {/* Smartphone Top App Bar (Matches Screenshot 3) */}
      <div className="bg-[#4a636e] text-white px-4 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="p-1 hover:bg-slate-700/50 rounded-full cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <h1 className="font-bold text-lg text-white tracking-wide">All orders</h1>
        </div>

        <button className="p-1.5 hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors relative">
          <MessageSquare className="w-5 h-5 text-white" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1 right-1"></span>
        </button>
      </div>

      {/* Summary Header Bar (Matches Screenshot 3) */}
      <div className="bg-slate-200/90 px-4 py-2.5 border-b border-slate-300 grid grid-cols-2 text-xs text-slate-700">
        <div>
          <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
            Estimated mileage
          </span>
          <span className="font-extrabold text-sm text-slate-900 font-mono">46.3 km</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
            Duration (estimated/actual)
          </span>
          <span className="font-extrabold text-sm text-slate-900 font-mono">42 min / 14 min</span>
        </div>
      </div>

      {/* Order Cards List */}
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        {orders.map((order) => {
          const isMenuOpen = activeMenuOrderId === order.id;

          return (
            <div
              key={order.id}
              className={`bg-white rounded-xl p-3.5 border shadow-2xs transition-all relative ${
                order.status === 'confirmed'
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : order.status === 'rejected'
                  ? 'border-rose-300 bg-rose-50/30'
                  : 'border-slate-200'
              }`}
            >
              {/* Card Header Row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      order.timeWindowStatus === 'valid'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    {order.timeWindow}
                  </span>
                  <span className="font-bold text-xs font-mono text-slate-800">{order.time}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="bg-emerald-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded shadow-2xs font-mono">
                    {order.etaOffset}
                  </span>
                  <button
                    onClick={() => setActiveMenuOrderId(isMenuOpen ? null : order.id)}
                    className="p-1 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Order Title */}
              <h3 className="font-extrabold text-sm text-slate-900 mb-1 flex items-center justify-between">
                <span>{order.name}</span>
                {order.status === 'confirmed' && (
                  <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Confirmé
                  </span>
                )}
              </h3>

              {/* Address */}
              <p className="text-xs text-slate-600 mb-3 line-clamp-2">{order.address}</p>

              {/* Footer Metrics */}
              <div className="grid grid-cols-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Estimated mileage</span>
                  <span className="font-bold text-slate-700">{order.mileage}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Estimated duration</span>
                  <span className="font-bold text-slate-700">{order.duration}</span>
                </div>
              </div>

              {/* Context Action Menu Popover (Matches Screenshot 3) */}
              {isMenuOpen && (
                <div className="absolute right-3 top-10 z-30 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-xs font-semibold text-slate-800 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => handleConfirm(order.id)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-emerald-700 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Confirm</span>
                  </button>

                  <button
                    onClick={() => handleReject(order.id)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-rose-700 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => {
                      alert(`Appel au client pour : ${order.name}`);
                      setActiveMenuOrderId(null);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-400 cursor-not-allowed"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call</span>
                  </button>

                  <button
                    onClick={() => {
                      alert(`Lancement GPS vers : ${order.address}`);
                      setActiveMenuOrderId(null);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 text-blue-600" />
                    <span>Navigate to</span>
                  </button>

                  {onOpenPODModal && (
                    <button
                      onClick={() => {
                        onOpenPODModal(order.name);
                        setActiveMenuOrderId(null);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-700 border-t border-slate-100 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-teal-600" />
                      <span>Preuve (POD)</span>
                    </button>
                  )}

                  {onOpenScanModal && (
                    <button
                      onClick={() => {
                        onOpenScanModal();
                        setActiveMenuOrderId(null);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2 text-slate-700 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4 text-purple-600" />
                      <span>Scan code-barres</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
