import { useAuth } from '@/features/auth/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { InformeDetalle } from '../dto/InformeDTO';
import * as api from '../services/informesApi';
import { informesKeys } from './keys';

export function useInforme(informeId: string, empleadoId?: number): {
  informe: InformeDetalle | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { tokens } = useAuth();
  const token = tokens?.accessToken;

  const query = useQuery({
    queryKey: [...informesKeys.detalle(informeId), empleadoId ?? null],
    queryFn: ({ signal }) => {
      if (!token) throw new Error('No hay token de acceso');
      return api.obtenerInforme(token, informeId, signal, empleadoId);
    },
    enabled: !!token && !!informeId,
  });

  const { refetch } = query;
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    informe: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? query.error.message : null,
    refresh,
  };
}
