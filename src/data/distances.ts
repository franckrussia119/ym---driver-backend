// Distances routières approximatives (km) depuis les deux principaux ports
// du Cameroun vers les destinations les plus courantes. Valeurs de
// référence — à ajuster manuellement si besoin pour un trajet précis.

export interface DestinationOption {
  label: string;
  distancesKm: { PAK: number; PAD: number };
}

export const CAMEROON_DESTINATIONS: DestinationOption[] = [
  { label: 'Douala', distancesKm: { PAK: 180, PAD: 15 } },
  { label: 'Yaoundé', distancesKm: { PAK: 175, PAD: 280 } },
  { label: 'Kribi', distancesKm: { PAK: 10, PAD: 180 } },
  { label: 'Édéa', distancesKm: { PAK: 140, PAD: 65 } },
  { label: 'Bafoussam', distancesKm: { PAK: 350, PAD: 290 } },
  { label: 'Bamenda', distancesKm: { PAK: 430, PAD: 366 } },
  { label: 'Bertoua', distancesKm: { PAK: 460, PAD: 490 } },
  { label: 'Ebolowa', distancesKm: { PAK: 110, PAD: 250 } },
  { label: 'Sangmélima', distancesKm: { PAK: 220, PAD: 330 } },
  { label: 'Buea', distancesKm: { PAK: 210, PAD: 70 } },
  { label: 'Limbe', distancesKm: { PAK: 215, PAD: 70 } },
  { label: 'Kumba', distancesKm: { PAK: 250, PAD: 120 } },
  { label: 'Garoua', distancesKm: { PAK: 1250, PAD: 1100 } },
  { label: 'Maroua', distancesKm: { PAK: 1450, PAD: 1300 } },
  { label: 'Ngaoundéré', distancesKm: { PAK: 800, PAD: 650 } },
  { label: "N'Djaména (Tchad)", distancesKm: { PAK: 2000, PAD: 1900 } },
  { label: 'Bangui (RCA)', distancesKm: { PAK: 1550, PAD: 1450 } },
  { label: 'Libreville (Gabon, via Ambam)', distancesKm: { PAK: 620, PAD: 730 } },
  { label: 'Malabo (Guinée Équatoriale, via Kye-Ossi)', distancesKm: { PAK: 320, PAD: 430 } },
];

export function getDistanceKm(destinationLabel: string, port: 'PAK' | 'PAD'): number | null {
  const match = CAMEROON_DESTINATIONS.find((d) => d.label === destinationLabel);
  return match ? match.distancesKm[port] : null;
}
