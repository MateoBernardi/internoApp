/**
 * Idempotency helpers.
 *
 * Estrategia: cada operación de mutación crítica lleva un header
 * `X-Idempotency-Key` con un UUID v4 generado UNA sola vez por intento lógico
 * del usuario (al montar el formulario). Si la red es lenta y TanStack Query
 * reintenta automáticamente, el MISMO UUID viaja en cada reintento, de modo que
 * un backend idempotente deduplica y nunca crea registros duplicados.
 *
 * La generación del UUID es local (no depende de librerías externas): usa
 * `global.crypto.getRandomValues` y aplica los bits de RFC 4122 (versión 4,
 * variante 1). Si el RNG seguro no está disponible (p. ej. Hermes sin polyfill)
 * cae a `Math.random` para no romper la app, avisando en desarrollo.
 */

declare const __DEV__: boolean | undefined;

export const IDEMPOTENCY_HEADER = 'X-Idempotency-Key';

function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const cryptoObj = (globalThis as any)?.crypto;

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
    return bytes;
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(
      '[idempotency] crypto.getRandomValues no está disponible; usando Math.random como fallback no seguro.'
    );
  }

  for (let i = 0; i < length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

// Tabla de bytes -> hex (00..ff) para evitar padding repetido.
const BYTE_TO_HEX: string[] = Array.from({ length: 256 }, (_, i) =>
  (i + 0x100).toString(16).slice(1)
);

/**
 * Genera un UUID v4 (RFC 4122) como string canónico
 * `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.
 */
export function generateIdempotencyKey(): string {
  const b = getRandomBytes(16);

  // Versión 4 (0100 en los bits altos del byte 6).
  b[6] = (b[6] & 0x0f) | 0x40;
  // Variante RFC 4122 (10xx en los bits altos del byte 8).
  b[8] = (b[8] & 0x3f) | 0x80;

  return (
    BYTE_TO_HEX[b[0]] + BYTE_TO_HEX[b[1]] + BYTE_TO_HEX[b[2]] + BYTE_TO_HEX[b[3]] +
    '-' +
    BYTE_TO_HEX[b[4]] + BYTE_TO_HEX[b[5]] +
    '-' +
    BYTE_TO_HEX[b[6]] + BYTE_TO_HEX[b[7]] +
    '-' +
    BYTE_TO_HEX[b[8]] + BYTE_TO_HEX[b[9]] +
    '-' +
    BYTE_TO_HEX[b[10]] + BYTE_TO_HEX[b[11]] + BYTE_TO_HEX[b[12]] +
    BYTE_TO_HEX[b[13]] + BYTE_TO_HEX[b[14]] + BYTE_TO_HEX[b[15]]
  );
}

/**
 * Construye el objeto de headers de idempotencia, o `undefined` si no hay key
 * (para no inyectar headers vacíos en peticiones que no la necesitan).
 */
export function idempotencyHeaders(key?: string): Record<string, string> | undefined {
  return key ? { [IDEMPOTENCY_HEADER]: key } : undefined;
}

/**
 * Deriva una sub-key estable a partir de una key base y un sufijo. Útil cuando
 * una sola acción del usuario dispara varias peticiones independientes (p. ej.
 * subir N archivos en lote): cada archivo necesita su PROPIA key idempotente,
 * pero derivada de la misma base para mantenerse estable entre reintentos.
 */
export function deriveIdempotencyKey(
  baseKey: string | undefined,
  suffix: string | number
): string | undefined {
  return baseKey ? `${baseKey}:${suffix}` : undefined;
}

/**
 * Política de reintentos recomendada para mutaciones idempotentes: 2 reintentos
 * con backoff exponencial. Pensada para tolerar blips de red y errores 5xx
 * transitorios sin riesgo de duplicar datos (gracias a la idempotency key).
 *
 * Se puede esparcir directamente en las opciones de `useMutation`:
 *   useMutation({ ..., ...IDEMPOTENT_MUTATION_RETRY })
 */
export const IDEMPOTENT_MUTATION_RETRY = {
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;
