import type { BackendDate } from '../dto/SolicitudDTO';

// Matches the backend's "YYYY-MM-DD HH:mm:ss" (or "...THH:mm:ss", with optional
// fractional seconds of any length) format. Not all JS engines parse the
// space-separated, non-ISO variant reliably via `new Date(string)`, so it's
// parsed manually into local-time components instead of relying on Date.parse.
const BACKEND_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/;

export function parseBackendDate(value: BackendDate | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  const match = BACKEND_DATE_REGEX.exec(value.trim());
  if (match) {
    const [, year, month, day, hours, minutes, seconds] = match;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds)
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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
