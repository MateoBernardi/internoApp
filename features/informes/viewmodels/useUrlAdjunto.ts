import { useAuth } from '@/features/auth/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import * as api from '../services/informesApi';
import { informesKeys } from './keys';

// La URL firmada dura 15 min (backend: URL_ADJUNTO_SEGUNDOS); se renueva antes de que venza.
const STALE_MS = 10 * 60 * 1000;

/** URL firmada de un adjunto (p. ej. para mostrar la miniatura de una imagen), con su estado de carga. */
export function useUrlAdjunto(informeId: string, adjuntoId: string, empleadoId?: number, enabled = true) {
  const { tokens } = useAuth();
  const token = tokens?.accessToken;
  const query = useQuery({
    queryKey: [...informesKeys.adjuntoUrl(informeId, adjuntoId), empleadoId ?? null],
    queryFn: () => {
      if (!token) throw new Error('No hay token de acceso');
      return api.obtenerUrlAdjunto(token, informeId, adjuntoId, empleadoId);
    },
    enabled: enabled && !!token,
    staleTime: STALE_MS,
    gcTime: STALE_MS,
  });
  return {
    url: query.data?.url ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
