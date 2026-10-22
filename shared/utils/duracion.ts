/**
 * Duraciones (saldos de horas extra, objetivos, horas trabajadas, licencias por horas).
 * El backend las guarda en minutos exactos y los expone junto a los campos viejos en horas
 * (2 decimales). Mostrar siempre desde los minutos; las horas quedan como fallback para un
 * backend anterior a la migración a minutos.
 */

/** Horas (posiblemente fraccionarias) → minutos enteros. */
export function horasAMinutos(horas: number): number {
  return Math.round(horas * 60);
}

/** Minutos exactos si el backend los manda; si no, los deriva de las horas. */
export function minutosDe(minutos: number | null | undefined, horas: number | null | undefined): number | null {
  if (minutos != null) return minutos;
  if (horas != null) return horasAMinutos(horas);
  return null;
}

/** Minutos → texto: 750 → "12 hs, 30 minutos", 45 → "45 minutos", 480 → "8 hs", -90 → "-1 hs, 30 minutos". */
export function formatMinutos(minutos: number): string {
  const signo = minutos < 0 ? '-' : '';
  const abs = Math.abs(Math.round(minutos));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const textoMinutos = `${m} ${m === 1 ? 'minuto' : 'minutos'}`;
  if (h === 0) return `${signo}${textoMinutos}`;
  if (m === 0) return `${signo}${h} hs`;
  return `${signo}${h} hs, ${textoMinutos}`;
}
