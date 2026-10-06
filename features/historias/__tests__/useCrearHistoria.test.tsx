import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => ({ tokens: { accessToken: 'test-token' } }),
}));

jest.mock('@/shared/idempotency', () => {
  const actual = jest.requireActual('@/shared/idempotency');
  return { __esModule: true, ...actual, IDEMPOTENT_MUTATION_RETRY: { retry: 2, retryDelay: 0 } };
});

import { IDEMPOTENCY_HEADER } from '@/shared/idempotency';
import { useCrearHistoria } from '../viewmodels/useHistorias';

function createWrapper() {
  const queryClient = new QueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCrearHistoria', () => {
  const KEY = '11111111-1111-4111-8111-111111111111';
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('envía el cuerpo con @{id} y reutiliza la misma X-Idempotency-Key en los reintentos', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { historia_id: 'h1' } }) });

    const { result } = renderHook(() => useCrearHistoria(KEY), { wrapper: createWrapper() });
    result.current.mutate('hola @{7}');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = fetchMock.mock.calls.map(([, init]) => init?.headers?.[IDEMPOTENCY_HEADER]);
    expect(keys).toEqual([KEY, KEY]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/historias');
    expect(JSON.parse(init.body)).toEqual({ cuerpo: 'hola @{7}' });
  });

  it('propaga el mensaje de error del backend (422)', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable',
      text: async () => JSON.stringify({ message: 'Hay menciones a usuarios que no existen.' }),
    });

    const { result } = renderHook(() => useCrearHistoria(KEY), { wrapper: createWrapper() });
    result.current.mutate('hola @{999}');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Hay menciones a usuarios que no existen.');
  });
});
