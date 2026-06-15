import {
  deriveIdempotencyKey,
  generateIdempotencyKey,
  idempotencyHeaders,
  IDEMPOTENCY_HEADER,
  IDEMPOTENT_MUTATION_RETRY,
  isTransportError,
} from '../idempotency';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateIdempotencyKey', () => {
  it('produces RFC 4122 version-4 UUIDs', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(generateIdempotencyKey()).toMatch(UUID_V4_REGEX);
    }
  });

  it('produces unique values across many calls', () => {
    const N = 5000;
    const seen = new Set<string>();
    for (let i = 0; i < N; i += 1) {
      seen.add(generateIdempotencyKey());
    }
    expect(seen.size).toBe(N);
  });
});

describe('idempotencyHeaders', () => {
  it('returns the header object when a key is provided', () => {
    expect(idempotencyHeaders('abc')).toEqual({ [IDEMPOTENCY_HEADER]: 'abc' });
  });

  it('returns undefined when no key is provided (no empty header)', () => {
    expect(idempotencyHeaders(undefined)).toBeUndefined();
    expect(idempotencyHeaders('')).toBeUndefined();
  });
});

describe('deriveIdempotencyKey', () => {
  it('derives a stable per-suffix key from a base key', () => {
    expect(deriveIdempotencyKey('base', 0)).toBe('base:0');
    expect(deriveIdempotencyKey('base', 'x')).toBe('base:x');
  });

  it('returns undefined when there is no base key', () => {
    expect(deriveIdempotencyKey(undefined, 0)).toBeUndefined();
  });
});

describe('isTransportError', () => {
  it.each([
    'La conexión es inestable. Chequeá que la petición se haya completado.',
    'Network request failed',
    'TypeError: Failed to fetch',
    'Load failed',
    'NetworkError when attempting to fetch resource.',
  ])('detects transport failures: %s', (message) => {
    expect(isTransportError(new Error(message))).toBe(true);
  });

  it('rejects errors with a server response (the backend already decided)', () => {
    expect(isTransportError(new Error('usuario_id inválido.'))).toBe(false);
    expect(isTransportError(new Error('Acceso denegado'))).toBe(false);
    expect(isTransportError(new Error('No se pudo completar. Intentá de nuevo en unos minutos.'))).toBe(false);
    expect(isTransportError('not-an-error')).toBe(false);
    expect(isTransportError(undefined)).toBe(false);
  });
});

describe('IDEMPOTENT_MUTATION_RETRY', () => {
  const transportError = new Error('Network request failed');
  const serverError = new Error('Acceso denegado');

  it('retries transport errors up to 2 times', () => {
    expect(IDEMPOTENT_MUTATION_RETRY.retry(0, transportError)).toBe(true);
    expect(IDEMPOTENT_MUTATION_RETRY.retry(1, transportError)).toBe(true);
    expect(IDEMPOTENT_MUTATION_RETRY.retry(2, transportError)).toBe(false);
  });

  it('never retries errors the server answered (4xx/5xx ya respondidos)', () => {
    expect(IDEMPOTENT_MUTATION_RETRY.retry(0, serverError)).toBe(false);
  });

  it('uses exponential backoff capped at 30s', () => {
    expect(IDEMPOTENT_MUTATION_RETRY.retryDelay(0)).toBe(1000);
    expect(IDEMPOTENT_MUTATION_RETRY.retryDelay(1)).toBe(2000);
    expect(IDEMPOTENT_MUTATION_RETRY.retryDelay(10)).toBe(30000);
  });
});
