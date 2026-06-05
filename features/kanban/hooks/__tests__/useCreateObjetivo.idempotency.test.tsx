import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

// --- Mocks ------------------------------------------------------------------

// Token de auth fijo: evita montar el AuthContext real.
jest.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => ({ tokens: { accessToken: 'test-token' } }),
}));

// Mantenemos la lógica real de idempotencia (header + generador) pero anulamos
// el backoff para que los reintentos sean instantáneos en el test.
jest.mock('@/shared/idempotency', () => {
  const actual = jest.requireActual('@/shared/idempotency');
  return {
    __esModule: true,
    ...actual,
    IDEMPOTENT_MUTATION_RETRY: { retry: 2, retryDelay: 0 },
  };
});

import { IDEMPOTENCY_HEADER } from '@/shared/idempotency';
import { useCreateObjetivo } from '../useObjetivos';

function createWrapper() {
  const queryClient = new QueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function getSentKeys(fetchMock: jest.Mock): (string | undefined)[] {
  return fetchMock.mock.calls.map(([, init]) => init?.headers?.[IDEMPOTENCY_HEADER]);
}

describe('useCreateObjetivo — idempotency invariant', () => {
  const FIXED_KEY = '11111111-1111-4111-8111-111111111111';
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    // @ts-expect-error: override global fetch for the test
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reuses the SAME X-Idempotency-Key across all retry attempts', async () => {
    // Falla dos veces (blip de red) y luego responde OK al tercer intento.
    fetchMock
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, titulo: 'Objetivo' }),
      });

    const { result } = renderHook(() => useCreateObjetivo(FIXED_KEY), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ titulo: 'Objetivo' } as any);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 1 intento original + 2 reintentos = 3 llamadas a fetch.
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const keys = getSentKeys(fetchMock);
    expect(keys).toEqual([FIXED_KEY, FIXED_KEY, FIXED_KEY]);
    // Y de hecho fue una sola key distinta en todo el reintento.
    expect(new Set(keys).size).toBe(1);
  });

  it('sends no idempotency header when no key is provided (backwards compatible)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 2, titulo: 'Sin key' }),
    });

    const { result } = renderHook(() => useCreateObjetivo(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ titulo: 'Sin key' } as any);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getSentKeys(fetchMock)).toEqual([undefined]);
  });
});
