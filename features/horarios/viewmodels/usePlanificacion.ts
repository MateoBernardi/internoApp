import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CrearTurnoPayload } from '../models/Planificacion';
import {
  confirmarPlanificacion,
  crearTurno,
  getPlanificacionInfo,
  previewPlanificacion,
} from '../services/planificacionService';
import { horariosQueryKeys } from './useHorarios';
import { horasExtraQueryKeys } from './useHorasExtra';

export const planificacionQueryKeys = {
  info: () => ['horarios', 'planificacion', 'info'] as const,
};

export function usePlanificacionInfo() {
  const { tokens } = useAuth();
  return useQuery({
    queryKey: planificacionQueryKeys.info(),
    queryFn: async () => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return getPlanificacionInfo(token);
    },
    staleTime: 1000 * 60,
    retry: 2,
  });
}

/** Mutación (no query): cada "Revisar cambios" lee la planilla de nuevo. Sin reintentos automáticos. */
export function usePreviewPlanificacion() {
  const { tokens } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return previewPlanificacion(token);
    },
    retry: 0,
  });
}

/**
 * `idempotencyKey`: una por preview. Si el usuario toca "Confirmar" de nuevo tras un corte de
 * red, viaja la MISMA key y el backend no aplica dos veces.
 */
export function useConfirmarPlanificacion() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ previewId, idempotencyKey }: { previewId: number; idempotencyKey: string }) => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return confirmarPlanificacion(token, previewId, idempotencyKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: horariosQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: horasExtraQueryKeys.all });
    },
    retry: 0,
  });
}

export function useCrearTurno() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CrearTurnoPayload) => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return crearTurno(token, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: horariosQueryKeys.all });
    },
    retry: 0,
  });
}
