import { sha256 } from 'js-sha256';

/**
 * QR rotativo (TOTP-like), contrato compartido con el backend
 * (`appMayorista-backend/src/utils/qrToken.ts`). DEBE coincidir byte a byte:
 *
 *  - `counter = floor(unixEpochSeconds / STEP_SECONDS)`, codificado como
 *    8 bytes big-endian (uint64).
 *  - `secret` = los bytes crudos del `qr_secret` de la sede (se persiste en
 *    hex; se decodifica a bytes antes del HMAC).
 *  - `hmac = HMAC_SHA256(secretBytes, counterBytes)` → truncamiento dinámico
 *    RFC-4226 → `mod 10^8` → padding a 8 dígitos.
 *  - Backend: Node `crypto.createHmac('sha256', ...)`. Kiosko: `js-sha256`
 *    (`sha256.hmac.array`, pasando arrays de bytes — nunca strings — para que
 *    el resultado sea idéntico byte a byte).
 *
 * Ver `/home/mateo/.claude/plans/rustling-nibbling-trinket.md` (sección
 * "Token contract") para el detalle completo.
 */

export const QR_STEP_SECONDS = 30;

/** Decodifica un string hex (sin "0x", longitud par) a un array de bytes. */
function hexToBytes(hex: string): number[] {
  const clean = hex.trim();
  if (clean.length === 0 || clean.length % 2 !== 0) {
    throw new Error('[qrToken] secretHex inválido: se esperaba hex de longitud par.');
  }

  const bytes: number[] = new Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.substring(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error('[qrToken] secretHex inválido: contiene caracteres no hexadecimales.');
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}

/** Codifica un contador entero no negativo como 8 bytes big-endian (uint64). */
function counterToBytes(counter: number): number[] {
  if (!Number.isFinite(counter) || counter < 0) {
    throw new Error('[qrToken] counter inválido: se esperaba un entero no negativo.');
  }

  const bytes = new Array(8).fill(0);
  let value = Math.floor(counter);
  for (let i = 7; i >= 0; i -= 1) {
    bytes[i] = value % 256;
    value = Math.floor(value / 256);
  }
  return bytes;
}

/** Contador TOTP-like vigente: `floor(epochMs / 1000 / STEP_SECONDS)`. */
export function currentCounter(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / QR_STEP_SECONDS);
}

/**
 * Deriva el código rotativo de 8 dígitos para un `secretHex` y `counter`
 * dados. Pura y determinística: mismo secreto + mismo contador → mismo
 * código, siempre. Debe reproducir exactamente la salida del backend para el
 * mismo par (secreto, contador) — ver contrato arriba.
 */
export function deriveQrCode(secretHex: string, counter: number): string {
  const secretBytes = hexToBytes(secretHex);
  const counterBytes = counterToBytes(counter);

  // Pasamos arrays de bytes (no strings) para que el HMAC opere byte a byte,
  // igual que `crypto.createHmac('sha256', Buffer...)` del lado del backend.
  const mac: number[] = sha256.hmac.array(secretBytes, counterBytes);

  // Truncamiento dinámico RFC-4226.
  const offset = mac[mac.length - 1] & 0x0f;
  const binCode =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);

  const code = binCode % 10 ** 8;
  return code.toString().padStart(8, '0');
}
