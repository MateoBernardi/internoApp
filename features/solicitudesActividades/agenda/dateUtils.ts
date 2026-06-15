/**
 * Helpers puros de fecha/calendario para la vista de Agenda Personal.
 * Sin dependencias de React ni de estilos.
 */

export const WEEKDAY_LABELS = ['d', 'l', 'm', 'm', 'j', 'v', 's'];

export type MonthGridCell = {
  day: number;
  esMesActual: boolean;
  date: Date;
};

export type NewActivityState = {
  date: string;
  endDate: string;
  startTime: Date;
  endTime: Date;
  title: string;
  description: string;
};

export function getMonthNameEs(date: Date): string {
  return date.toLocaleDateString('es-ES', { month: 'long' });
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function generarGrillaMes(year: number, month: number): MonthGridCell[] {
  const primerDiaDelMes = new Date(year, month, 1).getDay();
  const primerDiaGrilla = new Date(year, month, 1 - primerDiaDelMes);
  const dias: MonthGridCell[] = [];

  // Matriz fija de 6x7, usando Date de JS (month: 0 = enero).
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(primerDiaGrilla);
    date.setDate(primerDiaGrilla.getDate() + i);
    dias.push({
      day: date.getDate(),
      esMesActual: date.getMonth() === month,
      date,
    });
  }

  return dias;
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function normalizeToMinute(date: Date): Date {
  const normalized = new Date(date);
  normalized.setSeconds(0, 0);
  return normalized;
}

export function ceilToNextMinute(date: Date): Date {
  const normalized = new Date(date);
  if (normalized.getSeconds() > 0 || normalized.getMilliseconds() > 0) {
    normalized.setMinutes(normalized.getMinutes() + 1);
  }
  normalized.setSeconds(0, 0);
  return normalized;
}

export function buildDateTimeFromDateAndTime(date: string, time: Date): Date {
  const [year, month, day] = date.split('-').map(Number);
  const merged = new Date(year, (month ?? 1) - 1, day ?? 1, time.getHours(), time.getMinutes(), 0, 0);
  return normalizeToMinute(merged);
}

export function formatTimeHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function buildDefaultNewActivityState(viewMode: 'month' | 'day' | 'week', selectedDate: string): NewActivityState {
  const nowPlusTenMinutes = new Date(Date.now() + 10 * 60 * 1000);
  const baseTime = ceilToNextMinute(nowPlusTenMinutes);
  const baseDate = viewMode === 'day'
    ? selectedDate
    : `${baseTime.getFullYear()}-${String(baseTime.getMonth() + 1).padStart(2, '0')}-${String(baseTime.getDate()).padStart(2, '0')}`;

  const [year, month, day] = baseDate.split('-').map(Number);
  const startTime = new Date(
    year,
    (month ?? 1) - 1,
    day ?? 1,
    baseTime.getHours(),
    baseTime.getMinutes(),
    0,
    0
  );
  const endTime = new Date(startTime.getTime() + 3600000);

  return {
    date: baseDate,
    endDate: baseDate,
    startTime,
    endTime,
    title: '',
    description: '',
  };
}
