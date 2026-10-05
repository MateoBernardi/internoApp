import type { QueryClient } from '@tanstack/react-query';
import { syncPushPayloadToCache } from '../querySync';

const fakeClient = () => {
  const invalidateQueries = jest.fn();
  return { client: { invalidateQueries } as unknown as QueryClient, invalidateQueries };
};

const keysInvalidadas = (fn: jest.Mock) => fn.mock.calls.map(([arg]) => arg.queryKey);

describe('syncPushPayloadToCache — dominio horarios', () => {
  // Payloads reales del backend: planilla publicada (cola de notificaciones) y turno asignado/modificado.
  it.each([
    ['planilla publicada', { type: 'turnos_actualizados_masivo', domain: 'horarios', event: 'updated', updated_at: '2026-10-02T12:00:00Z' }],
    ['turno asignado', { type: 'turno_actualizado', domain: 'horarios', event: 'created', updated_at: '2026-10-02T12:00:00Z' }],
  ])('%s invalida horarios y horasExtra, y nada más', (_nombre, payload) => {
    const { client, invalidateQueries } = fakeClient();

    const dominios = syncPushPayloadToCache(client, { data: payload });

    expect(dominios).toEqual(['horarios']);
    expect(keysInvalidadas(invalidateQueries)).toEqual([['horarios'], ['horasExtra']]);
  });

  it('también resuelve el dominio por el tipo cuando falta el campo domain', () => {
    const { client, invalidateQueries } = fakeClient();

    const dominios = syncPushPayloadToCache(client, { data: { type: 'turnos_actualizados_masivo', updated_at: 'x' } });

    expect(dominios).toEqual(['horarios']);
    expect(keysInvalidadas(invalidateQueries)).toContainEqual(['horarios']);
  });

  it('"all" incluye horarios', () => {
    const { client, invalidateQueries } = fakeClient();

    syncPushPayloadToCache(client, { data: { domains: ['all'], event: 'updated', updated_at: 'x' } });

    expect(keysInvalidadas(invalidateQueries)).toContainEqual(['horarios']);
  });
});
