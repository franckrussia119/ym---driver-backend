import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation } from 'lucide-react';

export interface RouteWaypoint {
  id: number;
  name: string;
  address: string;
  eta: string;
  actualArrival?: string;
  etaOffset: string; // ex: "+05 min"
  status: 'pending' | 'completed' | 'delayed' | 'failed';
  lat: number;
  lng: number;
}

interface RouteMapProps {
  waypoints: RouteWaypoint[];
  selectedWaypointId: number | null;
  onSelectWaypoint: (id: number) => void;
  /** Position actuelle du camion (GPS réel si disponible, sinon non affiché) */
  truckPosition?: { lat: number; lng: number } | null;
}

// Centre par défaut : Port Autonome de Douala — point de départ logique de
// la majorité des tournées de conteneurs.
const DEFAULT_CENTER: [number, number] = [4.0483, 9.7043];
const DEFAULT_ZOOM = 7; // cadre l'essentiel du Cameroun

function statusColor(status: RouteWaypoint['status'], isSelected: boolean): string {
  if (isSelected) return '#1d4ed8';
  switch (status) {
    case 'delayed':
      return '#f59e0b';
    case 'failed':
      return '#e11d48';
    case 'completed':
      return '#059669';
    default:
      return '#2563eb';
  }
}

function makeNumberedIcon(label: string, color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 34 : 28;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;background:${color};
      display:flex;align-items:center;justify-content:center;color:white;
      font-weight:800;font-size:12px;border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    ">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makeTruckIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;border-radius:9999px;background:#059669;
      display:flex;align-items:center;justify-content:center;color:white;
      border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);
    ">🚚</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// Recentre la carte lorsque les arrêts changent (nouveaux arrêts ajoutés,
// tournée différente sélectionnée).
const FitToWaypoints: React.FC<{ waypoints: RouteWaypoint[] }> = ({ waypoints }) => {
  const map = useMap();
  React.useEffect(() => {
    if (waypoints.length === 0) return;
    if (waypoints.length === 1) {
      map.setView([waypoints[0].lat, waypoints[0].lng], 12);
      return;
    }
    const bounds = L.latLngBounds(waypoints.map((w) => [w.lat, w.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [waypoints, map]);
  return null;
};

export const RouteMap: React.FC<RouteMapProps> = ({
  waypoints,
  selectedWaypointId,
  onSelectWaypoint,
  truckPosition,
}) => {
  const routeLine = waypoints.map((w) => [w.lat, w.lng] as [number, number]);

  return (
    <div className="relative w-full h-full min-h-[380px] bg-slate-100 rounded-xl overflow-hidden border border-slate-300 shadow-inner flex flex-col">
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-xs font-bold text-slate-800">
        <Navigation className="w-4 h-4 text-blue-600" />
        <span>Carte GPS — Cameroun / Afrique Centrale</span>
      </div>

      <div className="relative flex-1 w-full h-full">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          style={{ width: '100%', height: '100%', minHeight: 380 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {waypoints.length > 0 && <FitToWaypoints waypoints={waypoints} />}

          {routeLine.length > 1 && (
            <Polyline
              positions={routeLine}
              pathOptions={{ color: '#2563eb', weight: 4, dashArray: '6,6' }}
            />
          )}

          {waypoints.map((wp) => {
            const isSelected = selectedWaypointId === wp.id;
            return (
              <Marker
                key={wp.id}
                position={[wp.lat, wp.lng]}
                icon={makeNumberedIcon(String(wp.id), statusColor(wp.status, isSelected), isSelected)}
                eventHandlers={{ click: () => onSelectWaypoint(wp.id) }}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-bold">{wp.name}</div>
                    <div className="text-slate-500">{wp.address}</div>
                    <div className="mt-1">ETA : {wp.eta} ({wp.etaOffset})</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {truckPosition && (
            <Marker position={[truckPosition.lat, truckPosition.lng]} icon={makeTruckIcon()}>
              <Popup>Position actuelle du camion</Popup>
            </Marker>
          )}
        </MapContainer>

        {waypoints.length === 0 && (
          <div className="absolute inset-0 z-[900] flex items-center justify-center bg-white/70 pointer-events-none">
            <div className="text-center text-slate-500 text-sm font-medium px-6">
              Aucun arrêt sur cette tournée pour le moment.
              <br />
              Ajoutez des commandes puis lancez la planification.
            </div>
          </div>
        )}
      </div>

      <div className="bg-white px-3 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Étape
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Camion en route
          </span>
          <span className="flex items-center gap-1 text-blue-600 font-semibold">
            ---- Itinéraire optimisé
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          {truckPosition ? 'Position GPS active' : 'Aucune position GPS reçue'}
        </span>
      </div>
    </div>
  );
};
