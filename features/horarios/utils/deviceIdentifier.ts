import { generateIdempotencyKey } from '@/shared/idempotency';
import { secureStorage } from '@/shared/secureStorage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

/**
 * Identificador estable de dispositivo físico: clave del contrato
 * `device_identifier` de `POST /devices` (reemplaza al push token como
 * clave de identidad, porque en Expo Go no siempre hay push token
 * disponible). Reglas de contrato: 8-128 caracteres, charset
 * `[A-Za-z0-9._-]`.
 *
 * Estrategia:
 *  - Android: SSAID (`Application.getAndroidId()`). Estable mientras no se
 *    resetee de fábrica el dispositivo; no requiere storage.
 *  - iOS/web, y fallback de Android si el SSAID no está disponible: UUID v4
 *    generado una única vez y persistido en `secureStorage` bajo la key
 *    `device_identifier` (en iOS eso es Keychain: sobrevive a la
 *    reinstalación de la app).
 */

const DEVICE_IDENTIFIER_STORAGE_KEY = 'device_identifier';
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;
const INVALID_CHARS_REGEX = /[^A-Za-z0-9._-]/g;

// Memoiza en memoria de módulo para no releer storage en cada llamada.
let memoizedIdentifier: string | null = null;
let inFlightPromise: Promise<string> | null = null;

/** Recorta al charset/longitud permitidos por el contrato del backend. */
function sanitize(raw: string): string {
  return raw.replace(INVALID_CHARS_REGEX, '').slice(0, MAX_LENGTH);
}

function isValidIdentifier(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length >= MIN_LENGTH && value.length <= MAX_LENGTH;
}

/** SSAID de Android, saneado. `null` si no está disponible o es inválido. */
function getSanitizedAndroidId(): string | null {
  try {
    const rawId = Application.getAndroidId();
    if (!rawId) return null;

    const normalized = rawId.trim().toLowerCase();
    if (!normalized || normalized === 'unknown') return null;

    const sanitized = sanitize(normalized);
    return isValidIdentifier(sanitized) ? sanitized : null;
  } catch (error) {
    console.warn('[Devices] No se pudo obtener el Android ID (SSAID), se usará UUID persistido:', error);
    return null;
  }
}

/** Lee el UUID persistido o genera uno nuevo (una sola vez) y lo persiste. */
async function getOrCreatePersistedUuid(): Promise<string> {
  const stored = await secureStorage.getItem(DEVICE_IDENTIFIER_STORAGE_KEY);
  const sanitizedStored = stored ? sanitize(stored) : null;

  if (isValidIdentifier(sanitizedStored)) {
    return sanitizedStored;
  }

  const generated = sanitize(generateIdempotencyKey());
  await secureStorage.setItem(DEVICE_IDENTIFIER_STORAGE_KEY, generated);
  return generated;
}

/**
 * Devuelve el `device_identifier` estable de este dispositivo, generándolo
 * y/o persistiéndolo si es la primera vez que se pide.
 */
export async function getDeviceIdentifier(): Promise<string> {
  if (memoizedIdentifier) {
    return memoizedIdentifier;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    const identifier =
      Platform.OS === 'android'
        ? getSanitizedAndroidId() ?? (await getOrCreatePersistedUuid())
        : await getOrCreatePersistedUuid();

    memoizedIdentifier = identifier;
    return identifier;
  })();

  try {
    return await inFlightPromise;
  } finally {
    inFlightPromise = null;
  }
}
