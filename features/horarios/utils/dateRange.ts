export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDDMM(iso: string): string {
  const d = parseISO(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function dayName(iso: string): string {
  return DAY_NAMES[parseISO(iso).getDay()];
}

export function addDays(iso: string, delta: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + delta);
  return toISO(d);
}

export function daysBetween(fromISO: string, toISOStr: string): string[] {
  const out: string[] = [];
  let cur = parseISO(fromISO);
  const end = parseISO(toISOStr);
  let guard = 0;
  while (cur <= end && guard < 62) {
    out.push(toISO(cur));
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    guard++;
  }
  return out;
}

/** Lunes de la semana que contiene `d` (semana Lun→Dom). */
function mondayOf(d: Date): Date {
  const dow = d.getDay(); // 0=domingo..6=sábado
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return monday;
}

export interface WeekRange {
  from: string;
  to: string;
}

/** Semana actual: lunes→domingo que contiene hoy. */
export function currentWeek(today: Date = new Date()): WeekRange {
  const monday = mondayOf(today);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { from: toISO(monday), to: toISO(sunday) };
}

/** Última semana cerrada: la semana lunes→domingo inmediatamente anterior a la actual. */
export function lastWeek(today: Date = new Date()): WeekRange {
  const monday = mondayOf(today);
  const prevMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7);
  const prevSunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 1);
  return { from: toISO(prevMonday), to: toISO(prevSunday) };
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** "YYYY-MM" del mes que contiene `today` (por defecto, hoy). */
export function currentMonthISO(today: Date = new Date()): string {
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
}

/** Desplaza un mes "YYYY-MM" por `delta` meses (puede ser negativo). */
export function shiftMonth(mes: string, delta: number): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Etiqueta legible en español para un mes "YYYY-MM", p. ej. "Julio 2026". */
export function monthLabel(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}
