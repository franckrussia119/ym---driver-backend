export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demandType: 'LIVRAISON' | 'ENLEVEMENT' | 'DEPOT_VIDE';
  adresse: string;
}

// Distance orthodromique (haversine) en kilomètres entre deux points GPS.
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function totalDistance(depot: { lat: number; lng: number } | null, order: Waypoint[]): number {
  let dist = 0;
  let prev = depot;
  for (const wp of order) {
    if (prev) dist += haversineKm(prev, wp);
    prev = wp;
  }
  return dist;
}

// Construction initiale : plus proche voisin à partir du dépôt (ou du premier point).
function nearestNeighborOrder(depot: { lat: number; lng: number } | null, waypoints: Waypoint[]): Waypoint[] {
  const remaining = [...waypoints];
  const ordered: Waypoint[] = [];
  let current = depot;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = current ? haversineKm(current, remaining[i]) : 0;
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    ordered.push(next);
    current = next;
  }
  return ordered;
}

// Amélioration 2-opt : inverse des segments tant que ça réduit la distance totale.
function twoOptImprove(depot: { lat: number; lng: number } | null, order: Waypoint[]): Waypoint[] {
  let improved = true;
  let best = order;
  let bestDist = totalDistance(depot, best);

  let iterations = 0;
  const MAX_ITERATIONS = 200; // garde-fou pour de très grandes tournées

  while (improved && iterations < MAX_ITERATIONS) {
    improved = false;
    iterations++;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const candidateDist = totalDistance(depot, candidate);
        if (candidateDist < bestDist - 1e-9) {
          best = candidate;
          bestDist = candidateDist;
          improved = true;
        }
      }
    }
  }
  return best;
}

export interface OptimizedRoute {
  orderedWaypoints: Waypoint[];
  totalDistanceKm: number;
}

export function optimizeRoute(
  depot: { lat: number; lng: number } | null,
  waypoints: Waypoint[]
): OptimizedRoute {
  if (waypoints.length <= 1) {
    return { orderedWaypoints: waypoints, totalDistanceKm: totalDistance(depot, waypoints) };
  }
  const initial = nearestNeighborOrder(depot, waypoints);
  const improved = twoOptImprove(depot, initial);
  return { orderedWaypoints: improved, totalDistanceKm: totalDistance(depot, improved) };
}
