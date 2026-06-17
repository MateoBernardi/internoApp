import { useAuth } from '@/features/auth/context/AuthContext';
import type { PeriodoVentana } from '@/features/solicitudesActividades/viewmodels/useActividades';
import { useQuery } from '@tanstack/react-query';
import { getTurnosPorPeriodo } from '../services/turnosAgendaService';

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
