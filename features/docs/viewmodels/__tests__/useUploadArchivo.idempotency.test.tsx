import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

// --- Mocks ------------------------------------------------------------------

jest.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => ({ tokens: { accessToken: 'test-token' } }),
}));

// Lógica real de idempotencia, pero sin backoff para reintentos instantáneos.
jest.mock('@/shared/idempotency', () => {
  const actual = jest.requireActual('@/shared/idempotency');
  return {
    __esModule: true,
    ...actual,
    IDEMPOTENT_MUTATION_RETRY: { retry: 2, retryDelay: 0 },
  };
});

import { IDEMPOTENCY_HEADER } from '@/shared/idempotency';
import { useUploadArchivo } from '../useArchivos';

const BASE_KEY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createWrapper() {
  const queryClient = new QueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// Dos archivos a subir.
function makeItems() {
  return [0, 1].map((i) => ({
    archivo: { uri: `file://test/${i}`, name: `file${i}.png`, type: 'image/png', size: 10 },
    archivoData: { nombre: `file${i}.png`, tamaño: 10, tipo: 'image/png', uso: 'TAREA', usuarios_compartidos: [] },
  })) as any;
}

// Router de fetch que cubre los 4 pasos del flujo de subida:
//  1) POST /archivos/upload  -> URLs firmadas
//  2) fetch(file://...)      -> blob (uriToBlob)
//  3) PUT https://r2...      -> subida a R2
//  4) POST /archivos/metadata-> confirmación (lleva la X-Idempotency-Key)
function installFetchRouter(opts: { failFirstUpload?: boolean } = {}) {
  let uploadCalls = 0;
  const fetchMock = jest.fn(async (url: string, init?: any) => {
    const u = String(url);
    const method = init?.method ?? 'GET';

    if (u.endsWith('/archivos/upload') && method === 'POST') {
      uploadCalls += 1;
      if (opts.failFirstUpload && uploadCalls === 1) {
        throw new Error('Network request failed'); // blip de red -> dispara el retry de la mutación
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          urls: [
            { uploadUrl: 'https://r2.example/up/0', ruta_r2: 'ruta/0' },
            { uploadUrl: 'https://r2.example/up/1', ruta_r2: 'ruta/1' },
          ],
        }),
      };
    }

    if (u.startsWith('file://')) {
      return { ok: true, status: 200, blob: async () => ({ size: 10 }) };
    }

    if (u.startsWith('https://r2.example/up/') && method === 'PUT') {
      return { ok: true, status: 200, text: async () => '' };
    }

    if (u.endsWith('/archivos/metadata') && method === 'POST') {
      return { ok: true, status: 200, text: async () => JSON.stringify({ archivo: { id: 1 } }) };
    }

    throw new Error(`unexpected fetch ${method} ${u}`);
  });

  // @ts-expect-error: override global fetch for the test
  global.fetch = fetchMock;
  return { fetchMock, getUploadCalls: () => uploadCalls };
}

function getMetadataKeys(fetchMock: jest.Mock): (string | undefined)[] {
  return fetchMock.mock.calls
    .filter(([u, init]) => String(u).endsWith('/archivos/metadata') && init?.method === 'POST')
    .map(([, init]) => init?.headers?.[IDEMPOTENCY_HEADER]);
}

describe('useUploadArchivo — per-file derived idempotency keys', () => {
  // El servicio loguea el fallo de red forzado del test de reintento; lo
  // silenciamos para no ensuciar la salida (es un error esperado).
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('sends a distinct derived key per file (base:index)', async () => {
    const { fetchMock } = installFetchRouter();

    const { result } = renderHook(() => useUploadArchivo(BASE_KEY), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ item: makeItems() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.exitosos).toHaveLength(2);

    const metaKeys = getMetadataKeys(fetchMock);
    expect(metaKeys).toHaveLength(2);
    // El orden entre archivos no es determinista (corren en paralelo), pero el
    // conjunto debe ser exactamente las sub-keys derivadas de la base.
    expect(new Set(metaKeys)).toEqual(new Set([`${BASE_KEY}:0`, `${BASE_KEY}:1`]));
  });

  it('reuses the SAME derived keys when the mutation is retried', async () => {
    const { fetchMock, getUploadCalls } = installFetchRouter({ failFirstUpload: true });

    const { result } = renderHook(() => useUploadArchivo(BASE_KEY), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ item: makeItems() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Hubo un reintento real: el endpoint de URLs se llamó dos veces.
    expect(getUploadCalls()).toBe(2);

    // Tras el reintento, los metadata siguen llevando las mismas sub-keys
    // estables derivadas de la misma base (no se regeneraron por intento).
    const metaKeys = getMetadataKeys(fetchMock);
    expect(new Set(metaKeys)).toEqual(new Set([`${BASE_KEY}:0`, `${BASE_KEY}:1`]));
  });
});
