import { useAuth } from '@/features/auth/context/AuthContext';
import type { PeriodoVentana } from '@/features/solicitudesActividades/viewmodels/useActividades';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aceptarTurno, getTurnosPorPeriodo } from '../services/turnosAgendaService';

export const turnosQueryKeys = {
  all: ['turnos'] as const,
  porPeriodo: (monthKey: string) => ['turnos', 'periodo', monthKey] as const,
};

export function useTurnosPorPeriodo(periodo: PeriodoVentana) {
  const { tokens } = useAuth();

  return useQuery({
    queryKey: turnosQueryKeys.porPeriodo(periodo.monthKey),
    queryFn: async () => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return getTurnosPorPeriodo(token, periodo.fechaInicio, periodo.fechaFin);
    },
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: 'always',
    retry: 3,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
  });
}

/**
 * Marca un turno como visto/aceptado por el usuario (POST /horarios/aceptar).
 * Invalida las queries de turnos al terminar para que la agenda refetchee
 * `acepted_at` actualizado.
 */
export function useAceptarTurno() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planificacionId: number) => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return aceptarTurno(token, planificacionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: turnosQueryKeys.all });
    },
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
  });
}
