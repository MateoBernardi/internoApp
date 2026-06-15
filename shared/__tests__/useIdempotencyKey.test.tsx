import { act, renderHook } from '@testing-library/react-native';
import { useIdempotencyKey } from '../useIdempotencyKey';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('useIdempotencyKey', () => {
  it('generates a valid key once and keeps it stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useIdempotencyKey());

    const firstKey = result.current.idempotencyKey;
    expect(firstKey).toMatch(UUID_V4_REGEX);

    // Varios re-renders no deben cambiar la key (clave para que los reintentos
    // reutilicen la misma X-Idempotency-Key).
    rerender({});
    rerender({});
    expect(result.current.idempotencyKey).toBe(firstKey);
  });

  it('rotates the key only when regenerate is called (new logical operation)', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const firstKey = result.current.idempotencyKey;

    let returned = '';
    act(() => {
      returned = result.current.regenerateIdempotencyKey();
    });

    expect(result.current.idempotencyKey).not.toBe(firstKey);
    expect(result.current.idempotencyKey).toMatch(UUID_V4_REGEX);
    expect(returned).toBe(result.current.idempotencyKey);
  });
});
