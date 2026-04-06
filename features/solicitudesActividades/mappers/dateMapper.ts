import type { BackendDate } from '../dto/SolicitudDTO';

export function parseBackendDate(value: BackendDate | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toIsoDate(value: Date | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (Number.isNaN(value.getTime())) {
    throw new Error('Invalid Date provided to toIsoDate');
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function toIsoDateOrNull(value: Date | null | undefined): string | null {
  return toIsoDate(value) ?? null;
}
