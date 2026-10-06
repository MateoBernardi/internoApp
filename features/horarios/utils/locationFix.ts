import type { LocationObject } from 'expo-location';

/** Radio de incertidumbre máximo (m) aceptado para enviar un escaneo. */
export const MAX_ACCURACY_M = 50;
/** Antigüedad máxima (ms) de una lectura para considerarla actual. */
export const MAX_FIX_AGE_MS = 15_000;
/** Tiempo máximo (ms) que se espera una lectura precisa al escanear. */
export const FIX_TIMEOUT_MS = 15_000;

const isFresh = (fix: LocationObject, now: number) => now - fix.timestamp <= MAX_FIX_AGE_MS;

/** Una lectura sirve si es reciente y su precisión está dentro del umbral. */
export function isFixUsable(fix: LocationObject | null, now: number): fix is LocationObject {
  if (!fix) return false;
  const { accuracy } = fix.coords;
  return accuracy != null && accuracy <= MAX_ACCURACY_M && isFresh(fix, now);
}

/**
 * Elige la mejor lectura entre la actual y una nueva: si la actual ya venció
 * se queda la nueva; si no, la de menor radio de incertidumbre.
 */
export function pickBetterFix(
  current: LocationObject | null,
  candidate: LocationObject,
  now: number
): LocationObject {
  if (!current || !isFresh(current, now)) return candidate;
  const currentAccuracy = current.coords.accuracy ?? Infinity;
  const candidateAccuracy = candidate.coords.accuracy ?? Infinity;
  return candidateAccuracy <= currentAccuracy ? candidate : current;
}
