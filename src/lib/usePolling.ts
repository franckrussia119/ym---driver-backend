import { useEffect, useRef } from 'react';

// Ré-exécute périodiquement une fonction de rafraîchissement (ex: un fetch
// de données déjà existant), sans que l'utilisateur ait besoin de recharger
// la page. Pensé pour les écrans où plusieurs personnes peuvent agir sur
// les mêmes données partagées (ex: le pool ouvert de retour de conteneurs) —
// pas une vraie synchronisation temps réel (WebSocket), mais suffisant pour
// que les informations ne restent jamais figées plus de quelques secondes.
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => savedCallback.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
