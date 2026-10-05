import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

// Token de auth fijo: evita montar el AuthContext real.
jest.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => ({ tokens: { accessToken: 'test-token' } }),
}));

import { ApiError } from '@/shared/apiRequest';
import { IDEMPOTENCY_HEADER } from '@/shared/idempotency';
import {
  confirmarPlanificacion,
  crearTurno,
  getPlanificacionInfo,
  previewPlanificacion,
} from '../services/planificacionService';
import { useConfirmarPlanificacion, useCrearTurno } from '../viewmodels/usePlanificacion';

// Respuesta mínima que usan los servicios (ok, status, text() y json()).
const respuesta = (status: number, body: unknown): Response => {
  const texto = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'x',
    text: async () => texto,
    json: async () => body,
  } as unknown as Response;
};

const KEY = '22222222-2222-4222-8222-222222222222';
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});

afterEach(() => jest.clearAllMocks());

const ultimaLlamada = () => {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: String(url), init };
};

describe('planificacionService', () => {
  it('getPlanificacionInfo hace GET a /horarios/planificacion/info con el token', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { planillaUrl: 'https://x', ultimaPublicacion: null }));

    expect(await getPlanificacionInfo('tk')).toEqual({ planillaUrl: 'https://x', ultimaPublicacion: null });

    const { url, init } = ultimaLlamada();
    expect(url).toContain('/horarios/planificacion/info');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer tk');
  });

  it('previewPlanificacion hace POST sin body', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { ok: true, snapshotId: 4 }));

    await previewPlanificacion('tk');

    const { url, init } = ultimaLlamada();
    expect(url).toContain('/horarios/planificacion/preview');
    expect(init.method).toBe('POST');
  });

  it('un 422 del preview llega como ApiError con status y la lista de errores de planilla', async () => {
    fetchMock.mockResolvedValue(
      respuesta(422, {
        error: 'La planilla tiene errores. Corregilos y volvé a intentar.',
        code: 'UNPROCESSABLE_ENTITY',
        details: { errores: ['Fila 3: ID inválido "abc".'] },
      }),
    );

    const error = await previewPlanificacion('tk').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.details).toEqual({ errores: ['Fila 3: ID inválido "abc".'] });
  });

  it('confirmarPlanificacion manda { previewId } y la key de idempotencia', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { message: 'ok', snapshotId: 4, altas: 1, modificaciones: 0, bajas: 0, omitidos: 0 }));

    await confirmarPlanificacion('tk', 4, KEY);

    const { url, init } = ultimaLlamada();
    expect(url).toContain('/horarios/planificacion/confirmar');
    expect(JSON.parse(init.body)).toEqual({ previewId: 4 });
    expect(init.headers[IDEMPOTENCY_HEADER]).toBe(KEY);
  });

  it.each([
    [412, 'El preview venció, generá uno nuevo.'],
    [409, 'El preview no existe o ya fue confirmado.'],
  ])('confirmar con HTTP %i lanza ApiError con ese status', async (status, mensaje) => {
    fetchMock.mockResolvedValue(respuesta(status, { error: mensaje, message: mensaje, code: 'X' }));

    const error = await confirmarPlanificacion('tk', 4, KEY).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(status);
    expect(error.message).toBe(mensaje);
  });

  it('crearTurno hace POST a /horarios/turno con el payload y expone el mensaje del backend si falla', async () => {
    const payload = { user_context_id: 14, horario_in: '2026-10-06T09:00', horario_out: '2026-10-06T17:00', sede_id_in: 1 };
    fetchMock.mockResolvedValueOnce(respuesta(201, { message: 'Turno creado correctamente.' }));

    await crearTurno('tk', payload);

    const { url, init } = ultimaLlamada();
    expect(url).toContain('/horarios/turno');
    expect(JSON.parse(init.body)).toEqual(payload);

    fetchMock.mockResolvedValueOnce(respuesta(400, { error: 'No se pudo crear el turno: la fecha ya pasó.' }));
    await expect(crearTurno('tk', payload)).rejects.toThrow('No se pudo crear el turno: la fecha ya pasó.');
  });
});

function crearWrapper() {
  // gcTime 0: sin timers de recolección pendientes, para que jest termine solo.
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, invalidate };
}

describe('useConfirmarPlanificacion', () => {
  it('al publicar invalida los turnos y las horas, para que la app muestre lo nuevo', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { message: 'ok', snapshotId: 4, altas: 2, modificaciones: 1, bajas: 0, omitidos: 3 }));
    const { Wrapper, invalidate } = crearWrapper();

    const { result } = renderHook(() => useConfirmarPlanificacion(), { wrapper: Wrapper });
    result.current.mutate({ previewId: 4, idempotencyKey: KEY });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const claves = invalidate.mock.calls.map(([f]) => f?.queryKey);
    expect(claves).toContainEqual(['horarios']);
    expect(claves).toContainEqual(['horasExtra']);
  });

  it('un segundo intento sobre el mismo preview viaja con la MISMA key (el backend deduplica)', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce(respuesta(200, { message: 'ok', snapshotId: 4, altas: 1, modificaciones: 0, bajas: 0, omitidos: 0 }));
    const { Wrapper } = crearWrapper();

    const { result } = renderHook(() => useConfirmarPlanificacion(), { wrapper: Wrapper });
    result.current.mutate({ previewId: 4, idempotencyKey: KEY });
    await waitFor(() => expect(result.current.isError).toBe(true));
    result.current.mutate({ previewId: 4, idempotencyKey: KEY });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = fetchMock.mock.calls.map(([, init]) => init.headers[IDEMPOTENCY_HEADER]);
    expect(keys).toEqual([KEY, KEY]);
  });

  it('si falla no invalida nada y deja el ApiError accesible para la pantalla', async () => {
    fetchMock.mockResolvedValue(respuesta(412, { message: 'El preview venció' }));
    const { Wrapper, invalidate } = crearWrapper();

    const { result } = renderHook(() => useConfirmarPlanificacion(), { wrapper: Wrapper });
    result.current.mutate({ previewId: 4, idempotencyKey: KEY });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(412);
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useCrearTurno', () => {
  it('al crear un turno invalida los turnos', async () => {
    fetchMock.mockResolvedValue(respuesta(201, { message: 'Turno creado correctamente.' }));
    const { Wrapper, invalidate } = crearWrapper();

    const { result } = renderHook(() => useCrearTurno(), { wrapper: Wrapper });
    result.current.mutate({ user_context_id: 14, horario_in: '2026-10-06T09:00', horario_out: '2026-10-06T17:00', sede_id_in: 1 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toContainEqual(['horarios']);
  });
});
