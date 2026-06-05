import {
  deriveIdempotencyKey,
  generateIdempotencyKey,
  idempotencyHeaders,
  IDEMPOTENCY_HEADER,
  IDEMPOTENT_MUTATION_RETRY,
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

describe('IDEMPOTENT_MUTATION_RETRY', () => {
  it('retries twice with exponential backoff capped at 30s', () => {
    expect(IDEMPOTENT_MUTATION_RETRY.retry).toBe(2);
    expect(IDEMPOTENT_MUTATION_RETRY.retryDelay(0)).toBe(1000);
    expect(IDEMPOTENT_MUTATION_RETRY.retryDelay(1)).toBe(2000);
    expect(IDEMPOTENT_MUTATION_RETRY.retryDelay(10)).toBe(30000);
  });
});
