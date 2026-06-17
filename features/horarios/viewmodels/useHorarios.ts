import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateHorarioPayload } from '../models/HorarioDTO';
import {
  getHorariosByDate,
  getSedes,
  updateHorario,
  uploadShiftsFile,
} from '../services/horariosService';

export const horariosQueryKeys = {
  all: ['horarios'] as const,
  sedes: () => ['horarios', 'sedes'] as const,
  byDate: (diaFecha: string) => ['horarios', 'byDate', diaFecha] as const,
};

export function useSedes() {
  const { tokens } = useAuth();
  return useQuery({
    queryKey: horariosQueryKeys.sedes(),
    queryFn: async () => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return getSedes(token);
    },
    staleTime: 1000 * 60 * 30, // sedes raramente cambian
    gcTime: 1000 * 60 * 60,
    retry: 3,
  });
}

export function useHorariosByDate(diaFecha: string) {
  const { tokens } = useAuth();
  return useQuery({
    queryKey: horariosQueryKeys.byDate(diaFecha),
    queryFn: async () => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return getHorariosByDate(token, diaFecha);
    },
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: 'always',
    retry: 3,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
  });
}

export function useUploadShifts() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, name }: { uri: string; name: string }) => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return uploadShiftsFile(token, uri, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: horariosQueryKeys.all });
    },
  });
}

export function useUpdateHorario() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateHorarioPayload) => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return updateHorario(token, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: horariosQueryKeys.all });
    },
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
  });
}
