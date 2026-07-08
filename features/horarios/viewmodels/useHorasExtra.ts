import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getHorasExtra,
  getMovimientos,
  liquidarHorasExtra,
  type HorasExtraFilter,
} from '../services/horasExtraService';

export const horasExtraQueryKeys = {
  all: ['horasExtra'] as const,
  list: (filter: HorasExtraFilter) =>
    [
      'horasExtra',
      'list',
      filter.userContextId ?? null,
      filter.role ?? null,
    ] as const,
  movimientos: (userContextId: number, mes: string) =>
    ['horasExtra', 'movimientos', userContextId, mes] as const,
};

export function useHorasExtra(filter: HorasExtraFilter) {
  const { tokens } = useAuth();
  return useQuery({
    queryKey: horasExtraQueryKeys.list(filter),
    queryFn: async () => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return getHorasExtra(token, filter);
    },
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: 'always',
    retry: 3,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
  });
}

/**
 * Desglose de movimientos del mes para el modal de detalle. `enabled` debe
 * reflejar si el modal está abierto: no tiene sentido pedir el desglose
 * mientras está cerrado.
 */
export function useMovimientos(userContextId: number | undefined, mes: string, enabled: boolean) {
  const { tokens } = useAuth();
  return useQuery({
    queryKey: horasExtraQueryKeys.movimientos(userContextId ?? 0, mes),
    queryFn: async () => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      if (userContextId == null) throw new Error('No user context id');
      return getMovimientos(token, userContextId, mes);
    },
    enabled: enabled && userContextId != null,
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 15000),
  });
}

export function useLiquidarHorasExtra() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userContextId,
      horas,
      idempotencyKey,
    }: {
      userContextId: number;
      horas: number;
      idempotencyKey?: string;
    }) => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return liquidarHorasExtra(token, userContextId, horas, idempotencyKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: horasExtraQueryKeys.all });
    },
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
  });
}
