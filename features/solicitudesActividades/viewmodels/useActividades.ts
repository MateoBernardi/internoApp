import { useAuth } from '@/features/auth/hooks/useAuthActions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as actividadesModels from '../models/Actividad';
import * as actividadesApi from '../services/actividadesApi';

// ==================== QUERY KEYS ====================
const actividadesQueryKeys = {
  all: ['actividades'] as const,
  semanales: () => [...actividadesQueryKeys.all, 'semanales'] as const,
  semanaAnterior: () => [...actividadesQueryKeys.all, 'semana-anterior'] as const,
};

// ==================== QUERIES ====================

/**
 * Hook para obtener las actividades semanales futuras del usuario
 */
export function useActividadesSemanales() {
  const { getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: actividadesQueryKeys.semanales(),
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return actividadesApi.obtenerActividadesSemanales(accessToken);
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos (anteriormente cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para obtener las actividades de la semana anterior del usuario
 */
export function useActividadesSemanaAnterior() {
  const { getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: actividadesQueryKeys.semanaAnterior(),
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return actividadesApi.obtenerActividadesSemanaAnterior(accessToken);
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// ==================== MUTATIONS ====================

/**
 * Hook para crear una nueva actividad
 */
export function useCrearActividad() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: actividadesModels.CrearActividadRequest) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return actividadesApi.creatActividad(accessToken, data);
    },
    onSuccess: () => {
      // Invalidar las actividades semanales para refrescar la lista
      queryClient.invalidateQueries({
        queryKey: actividadesQueryKeys.semanales(),
      });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para agregar un participante a una actividad
 */
export function useAgregarParticipante() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: actividadesModels.AgregarParticipanteRequest) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return actividadesApi.agregarParticipanteActividad(accessToken, data);
    },
    onSuccess: () => {
      // Invalidar las listas de actividades para refrescar
      queryClient.invalidateQueries({
        queryKey: actividadesQueryKeys.semanales(),
      });
      queryClient.invalidateQueries({
        queryKey: actividadesQueryKeys.semanaAnterior(),
      });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para cancelar una actividad
 */
export function useCancelarActividad() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: actividadesModels.CancelarActividadRequest) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return actividadesApi.cancelarActividad(accessToken, data);
    },
    onSuccess: () => {
      // Invalidar ambas listas de actividades
      queryClient.invalidateQueries({
        queryKey: actividadesQueryKeys.semanales(),
      });
      queryClient.invalidateQueries({
        queryKey: actividadesQueryKeys.semanaAnterior(),
      });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// ==================== COMPOSABLE HOOKS ====================

/**
 * Hook compuesto para obtener todas las actividades (semanales + semana anterior)
 */
export function useTodasActividades() {
  const actividadesSemanales = useActividadesSemanales();
  const actividadesSemanaAnterior = useActividadesSemanaAnterior();

  const isLoading = actividadesSemanales.isLoading || actividadesSemanaAnterior.isLoading;
  const isError = actividadesSemanales.isError || actividadesSemanaAnterior.isError;
  const error = actividadesSemanales.error || actividadesSemanaAnterior.error;

  const data = {
    semanales: actividadesSemanales.data ?? { actividades: [], licencias: [] },
    semanaAnterior: actividadesSemanaAnterior.data ?? { actividades: [], licencias: [] },
  };

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch: async () => {
      await Promise.all([
        actividadesSemanales.refetch(),
        actividadesSemanaAnterior.refetch(),
      ]);
    },
  };
}
