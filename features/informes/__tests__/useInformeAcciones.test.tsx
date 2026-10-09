import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => ({ tokens: { accessToken: 'test-token' } }),
}));

jest.mock('@/shared/apiRequest', () => {
  const actual = jest.requireActual('@/shared/apiRequest');
  return { __esModule: true, ...actual, apiRequest: jest.fn() };
});

jest.mock('../services/informesApi', () => {
  const actual = jest.requireActual('../services/informesApi');
  return { __esModule: true, ...actual, subirAdjunto: jest.fn() };
});

import { apiRequest } from '@/shared/apiRequest';
import { IDEMPOTENCY_HEADER } from '@/shared/idempotency';
import type { AdjuntoPendiente } from '../dto/InformeDTO';
import * as api from '../services/informesApi';
import { useInformeAcciones } from '../viewmodels/useInformeAcciones';

const apiRequestMock = apiRequest as jest.Mock;
const subirMock = api.subirAdjunto as jest.Mock;

const ok = (data: unknown, status = 200) => ({ ok: true, status, json: async () => ({ data }) });
const fail = (status: number, message: string) => ({
  ok: false,
  status,
  statusText: 'err',
  text: async () => JSON.stringify({ message }),
});

const adjunto = (nombre: string): AdjuntoPendiente => ({
  uri: `file:///${nombre}`,
  nombre,
  mime: 'image/jpeg',
  tamano: 10,
  tipo: 'imagen',
});

function setup() {
  const queryClient = new QueryClient();
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useInformeAcciones(), { wrapper });
  return { acciones: result.current, invalidate };
}

describe('useInformeAcciones', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    subirMock.mockReset();
  });

  it('crearInforme: crea la entrada, sube adjuntos en orden e invalida listado e hilo', async () => {
    apiRequestMock.mockResolvedValueOnce(ok({ informe_id: 'inf1', entrada: { id: 'e1' } }, 201));
    subirMock.mockResolvedValue({});
    const { acciones, invalidate } = setup();

    const id = await acciones.crearInforme('<p>hola</p>', [adjunto('a.jpg'), adjunto('b.jpg')]);

    expect(id).toBe('inf1');
    const call = apiRequestMock.mock.calls[0]![0];
    expect(call).toMatchObject({ method: 'POST', endpoint: '/informes', body: { cuerpo: '<p>hola</p>' } });
    expect(call.headers[IDEMPOTENCY_HEADER]).toBeTruthy();
    expect(subirMock.mock.calls.map((c) => [c[1], c[2], c[3].nombre])).toEqual([
      ['inf1', 'e1', 'a.jpg'],
      ['inf1', 'e1', 'b.jpg'],
    ]);
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it('agregarEntrada: no sube adjuntos si falla la creación y propaga el mensaje del backend', async () => {
    apiRequestMock.mockResolvedValue(fail(409, 'El informe está cerrado.'));
    const { acciones } = setup();

    await expect(acciones.agregarEntrada('inf1', '<p>x</p>', [adjunto('a.jpg')])).rejects.toThrow(
      'El informe está cerrado.',
    );
    expect(subirMock).not.toHaveBeenCalled();
  });

  it('editarEntrada: PATCH, borra los quitados y sube los nuevos', async () => {
    apiRequestMock.mockResolvedValue(ok({}));
    subirMock.mockResolvedValue({});
    const { acciones } = setup();

    await acciones.editarEntrada('inf1', 'e1', '<p>nuevo</p>', [adjunto('n.jpg')], ['a1', 'a2']);

    expect(apiRequestMock.mock.calls.map(([o]) => [o.method, o.endpoint])).toEqual([
      ['PATCH', '/informes/inf1/entradas/e1'],
      ['DELETE', '/informes/inf1/entradas/e1/adjuntos/a1'],
      ['DELETE', '/informes/inf1/entradas/e1/adjuntos/a2'],
    ]);
    expect(subirMock).toHaveBeenCalledTimes(1);
  });

  it('cerrarInforme: POST de tipo cierre con texto opcional', async () => {
    apiRequestMock.mockResolvedValue(ok({ id: 'c1' }, 201));
    const { acciones } = setup();

    await acciones.cerrarInforme('inf1', '<p>fin</p>');
    await acciones.cerrarInforme('inf1');

    expect(apiRequestMock.mock.calls[0]![0].body).toEqual({ cuerpo: '<p>fin</p>', tipo: 'cierre' });
    expect(apiRequestMock.mock.calls[1]![0].body).toEqual({ tipo: 'cierre' });
  });

  it('reintenta ante error de transporte con la misma X-Idempotency-Key', async () => {
    jest.useFakeTimers();
    apiRequestMock
      .mockRejectedValueOnce(new Error('La conexión es inestable.'))
      .mockResolvedValueOnce(ok({ informe_id: 'inf1', entrada: { id: 'e1' } }, 201));
    const { acciones } = setup();

    const promesa = acciones.crearInforme('<p>x</p>', []);
    await jest.advanceTimersByTimeAsync(1000);
    await promesa;
    jest.useRealTimers();

    const keys = apiRequestMock.mock.calls.map(([o]) => o.headers[IDEMPOTENCY_HEADER]);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('obtenerUrlAdjunto devuelve url y expira_en', async () => {
    apiRequestMock.mockResolvedValue(ok({ url: 'https://r2/x', expira_en: 900 }));
    const { acciones } = setup();

    await expect(acciones.obtenerUrlAdjunto('inf1', 'a1')).resolves.toEqual({
      url: 'https://r2/x',
      expira_en: 900,
    });
    expect(apiRequestMock.mock.calls[0]![0].endpoint).toBe('/informes/inf1/adjuntos/a1');
  });
});
