import { useAuth } from '@/features/auth/context/AuthContext';
import { deriveIdempotencyKey, generateIdempotencyKey, isTransportError } from '@/shared/idempotency';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { AdjuntoPendiente, UrlAdjunto } from '../dto/InformeDTO';
import * as api from '../services/informesApi';
import { informesKeys } from './keys';

const MAX_REINTENTOS = 2;

async function conReintentos<T>(fn: () => Promise<T>): Promise<T> {
  for (let intento = 0; ; intento++) {
    try {
      return await fn();
    } catch (error) {
      if (intento >= MAX_REINTENTOS || !isTransportError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** intento, 30000)));
    }
  }
}

export interface InformeAcciones {
  crearInforme: (cuerpo: string, adjuntos: AdjuntoPendiente[]) => Promise<string>;
  agregarEntrada: (informeId: string, cuerpo: string, adjuntos: AdjuntoPendiente[]) => Promise<void>;
  editarEntrada: (
    informeId: string,
    entradaId: string,
    cuerpo: string,
    nuevos: AdjuntoPendiente[],
    quitarIds: string[],
  ) => Promise<void>;
  cerrarInforme: (informeId: string, texto?: string) => Promise<void>;
  obtenerUrlAdjunto: (informeId: string, adjuntoId: string) => Promise<UrlAdjunto>;
}

export function useInformeAcciones(): InformeAcciones {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();
  const accessToken = tokens?.accessToken;

  const getToken = useCallback(() => {
    if (!accessToken) throw new Error('No hay token de acceso');
    return accessToken;
  }, [accessToken]);

  const invalidar = useCallback(
    (informeId: string) => {
      queryClient.invalidateQueries({ queryKey: informesKeys.lista() });
      queryClient.invalidateQueries({ queryKey: informesKeys.detalle(informeId) });
    },
    [queryClient],
  );

  const subirAdjuntos = useCallback(
    async (token: string, informeId: string, entradaId: string, adjuntos: AdjuntoPendiente[], baseKey: string) => {
      for (let i = 0; i < adjuntos.length; i++) {
        const key = deriveIdempotencyKey(baseKey, i);
        await conReintentos(() => api.subirAdjunto(token, informeId, entradaId, adjuntos[i]!, key));
      }
    },
    [],
  );

  return useMemo<InformeAcciones>(
    () => ({
      async crearInforme(cuerpo, adjuntos) {
        const token = getToken();
        const key = generateIdempotencyKey();
        const { informe_id, entrada } = await conReintentos(() => api.crearInforme(token, cuerpo, key));
        try {
          await subirAdjuntos(token, informe_id, entrada.id, adjuntos, key);
        } finally {
          invalidar(informe_id);
        }
        return informe_id;
      },

      async agregarEntrada(informeId, cuerpo, adjuntos) {
        const token = getToken();
        const key = generateIdempotencyKey();
        const entrada = await conReintentos(() => api.agregarEntrada(token, informeId, key, { cuerpo }));
        try {
          await subirAdjuntos(token, informeId, entrada.id, adjuntos, key);
        } finally {
          invalidar(informeId);
        }
      },

      async editarEntrada(informeId, entradaId, cuerpo, nuevos, quitarIds) {
        const token = getToken();
        const key = generateIdempotencyKey();
        try {
          await api.editarEntrada(token, informeId, entradaId, cuerpo);
          for (const adjuntoId of quitarIds) {
            await api.eliminarAdjunto(token, informeId, entradaId, adjuntoId);
          }
          await subirAdjuntos(token, informeId, entradaId, nuevos, key);
        } finally {
          invalidar(informeId);
        }
      },

      async cerrarInforme(informeId, texto) {
        const token = getToken();
        const key = generateIdempotencyKey();
        const opts = texto ? { cuerpo: texto, tipo: 'cierre' as const } : { tipo: 'cierre' as const };
        await conReintentos(() => api.agregarEntrada(token, informeId, key, opts));
        invalidar(informeId);
      },

      obtenerUrlAdjunto(informeId, adjuntoId) {
        return api.obtenerUrlAdjunto(getToken(), informeId, adjuntoId);
      },
    }),
    [getToken, invalidar, subirAdjuntos],
  );
}
