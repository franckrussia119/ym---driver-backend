// Génère un numéro de référence lisible, basé sur la date et l'heure
// exactes de création (jusqu'à la seconde), avec un court suffixe
// aléatoire pour éviter toute collision en cas de créations simultanées.
//
// Exemple : generateReferenceNumber('PANNE') -> "PANNE-20260818-143052-X7K"
export function generateReferenceNumber(prefix: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');

  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const suffixChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans caractères ambigus (0/O, 1/I)
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += suffixChars[Math.floor(Math.random() * suffixChars.length)];
  }

  return `${prefix}-${datePart}-${timePart}-${suffix}`;
}

// Exécute une fonction d'insertion (qui doit lever une erreur Postgres
// 23505 "unique_violation" en cas de collision) en réessayant avec un
// nouveau numéro de référence si nécessaire. Filet de sécurité : en usage
// réel, une collision est extrêmement improbable, mais ne doit jamais faire
// échouer une création pour l'utilisateur.
export async function withReferenceNumberRetry<T>(
  prefix: string,
  insertFn: (referenceNumber: string) => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await insertFn(generateReferenceNumber(prefix));
    } catch (err: any) {
      if (err?.code === '23505' && attempt < maxAttempts - 1) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
