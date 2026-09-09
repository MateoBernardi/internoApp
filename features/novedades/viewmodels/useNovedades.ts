import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Novedad } from '../models/Novedades';
import * as novedadesApi from '../services/novedadesApi';

export const NOVEDADES_KEYS = {
  all: ['novedades'] as const,
};

export function useGetNovedades(enabled = true) {
  const { tokens } = useAuth();

  return useQuery({
    queryKey: NOVEDADES_KEYS.all,
    queryFn: async () => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No hay token de acceso');
      return novedadesApi.fetchNovedades(token);
    },
    enabled: enabled && !!tokens?.accessToken,
  });
}

export function useCrearNovedad() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data, idempotencyKey }: { data: Novedad; idempotencyKey?: string }) => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No hay token de acceso');
      return novedadesApi.crearNovedad(data, token, idempotencyKey);
    },
    onSuccess: (nuevaNovedad) => {
      queryClient.setQueryData(NOVEDADES_KEYS.all, (old: Novedad[] | undefined) =>
        old ? [nuevaNovedad, ...old] : [nuevaNovedad]
      );
      queryClient.invalidateQueries({ queryKey: NOVEDADES_KEYS.all });
    },
  });
}

export function useActualizarNovedad() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Novedad) => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No hay token de acceso');
      return novedadesApi.actualizarNovedad(data, token);
    },
    onSuccess: (novedadActualizada) => {
      queryClient.setQueryData(NOVEDADES_KEYS.all, (old: Novedad[] | undefined) =>
        old?.map((n) => (n.id === novedadActualizada.id ? novedadActualizada : n))
      );
      queryClient.invalidateQueries({ queryKey: NOVEDADES_KEYS.all });
    },
  });
}

export function useEliminarNovedad() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No hay token de acceso');
      await novedadesApi.eliminarNovedad(id, token);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData(NOVEDADES_KEYS.all, (old: Novedad[] | undefined) =>
        old?.filter((n) => n.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: NOVEDADES_KEYS.all });
    },
  });
}
