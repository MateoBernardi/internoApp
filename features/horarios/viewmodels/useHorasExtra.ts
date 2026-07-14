import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createObjetivoHoras,
  getHorasExtra,
  getMovimientos,
  getObjetivosHoras,
  liquidarHorasExtra,
  updateObjetivoHoras,
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
  objetivos: ['horasExtra', 'objetivos'] as const,
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

/**
 * Objetivos semanales de horas ya cargados (GET /horarios/objetivos). Sólo
 * incluye usuarios que ya tienen uno; `enabled` debe reflejar si el modal de
 * detalle está abierto. Cambia poco, así que se le da un staleTime moderado.
 */
export function useObjetivosHoras(enabled: boolean) {
  const { tokens } = useAuth();
  return useQuery({
    queryKey: horasExtraQueryKeys.objetivos,
    queryFn: async () => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return getObjetivosHoras(token);
    },
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 15000),
  });
}

/**
 * Alta o modificación del objetivo semanal de un usuario: hace POST si
 * `exists` es `false` (todavía no tiene objetivo), PATCH si es `true`. No se
 * reintenta: un reintento del POST tras un éxito daría 409. Sólo invalida la
 * query de objetivos, no la de horas extra (editar el objetivo no cambia el
 * saldo actual, sólo el próximo cálculo del batch semanal).
 */
export function useUpsertObjetivoHoras() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userContextId,
      horas,
      exists,
    }: {
      userContextId: number;
      horas: number;
      exists: boolean;
    }) => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return exists
        ? updateObjetivoHoras(token, userContextId, horas)
        : createObjetivoHoras(token, userContextId, horas);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: horasExtraQueryKeys.objetivos });
    },
    retry: 0,
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
