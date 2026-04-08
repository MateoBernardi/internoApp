import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as actividadesModels from '../models/Actividad';
import * as actividadesApi from '../services/actividadesApi';

export interface PeriodoVentana {
  fechaInicio: Date;
  fechaFin: Date;
  monthKey: string;
}

function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function buildPeriodoVentanaFromMonth(date: Date): PeriodoVentana {
  // Ventana requerida: mes anterior | mes actual | mes siguiente.
  const inicio = new Date(date.getFullYear(), date.getMonth() - 1, 1, 0, 0, 0, 0);
  const fin = new Date(date.getFullYear(), date.getMonth() + 2, 0, 23, 59, 59, 999);
  return {
    fechaInicio: inicio,
    fechaFin: fin,
    monthKey: formatMonthKey(date),
  };
}

// ==================== QUERY KEYS ====================
export const actividadesQueryKeys = {
  all: ['actividades'] as const,
  semanales: () => [...actividadesQueryKeys.all, 'semanales'] as const,
  porPeriodo: (monthKey: string) => [...actividadesQueryKeys.all, 'periodo', monthKey] as const,
  detalle: (actividadId: number) => [...actividadesQueryKeys.all, 'detalle', actividadId] as const,
};

const solicitudesQueryKeys = {
  all: ['solicitudes'] as const,
  creadas: () => [...solicitudesQueryKeys.all, 'creadas'] as const,
  invitaciones: () => [...solicitudesQueryKeys.all, 'invitaciones'] as const,
};

// ==================== QUERIES ====================

/**
 * Hook para obtener las actividades semanales futuras del usuario
 */
export function useActividadesSemanales() {
  const periodoDefault = buildPeriodoVentanaFromMonth(new Date());
  return useActividadesPorPeriodo(periodoDefault);
}

export function useActividadesPorPeriodo(periodo: PeriodoVentana) {
  const { tokens } = useAuth();

  return useQuery({
    queryKey: actividadesQueryKeys.porPeriodo(periodo.monthKey),
    queryFn: async () => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return actividadesApi.obtenerActividadesPorPeriodo(accessToken, {
        fechaInicio: periodo.fechaInicio,
        fechaFin: periodo.fechaFin,
      });
    },
    // Siempre revalidar contra el backend al entrar/cambiar de mes.
    staleTime: 0,
    gcTime: 1000 * 60 * 10, // 10 minutos (anteriormente cacheTime)
    refetchOnMount: 'always',
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useActividadById(actividadId?: number) {
  const { tokens } = useAuth();
  const hasValidId = Number.isFinite(actividadId) && (actividadId ?? 0) > 0;

  return useQuery({
    queryKey: actividadesQueryKeys.detalle(actividadId ?? 0),
    queryFn: async () => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      if (!hasValidId) {
        throw new Error('Actividad inválida');
      }
      return actividadesApi.obtenerActividadById(accessToken, actividadId as number);
    },
    enabled: hasValidId,
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// ==================== MUTATIONS ==

/**
 * Hook para crear una nueva actividad (con actualización optimista)
 */
export function useCrearActividad() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: actividadesModels.CrearActividadRequest) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return actividadesApi.createActividad(accessToken, data);
    },
    onSettled: () => {
      // Siempre revalidar con el servidor
      queryClient.invalidateQueries({ queryKey: actividadesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: solicitudesQueryKeys.creadas() });
      queryClient.invalidateQueries({ queryKey: solicitudesQueryKeys.invitaciones() });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para agregar un participante a una actividad
 */
export function useAgregarParticipante() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: actividadesModels.AgregarParticipanteRequest) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return actividadesApi.agregarParticipanteActividad(accessToken, data);
    },
    onSuccess: () => {
      // Invalidar las listas de actividades para refrescar
      queryClient.invalidateQueries({
        queryKey: actividadesQueryKeys.all,
      });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para cancelar una actividad (con actualización optimista)
 */
export function useCancelarActividad() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: actividadesModels.CancelarActividadRequest) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return actividadesApi.cancelarActividad(accessToken, data);
    },
    onMutate: async (cancelData) => {
      // Cancelar refetches en curso
      await queryClient.cancelQueries({ queryKey: actividadesQueryKeys.all });
      return { cancelData };
    },
    onSettled: () => {
      // Siempre revalidar con el servidor
      queryClient.invalidateQueries({ queryKey: actividadesQueryKeys.all });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// ==================== COMPOSABLE HOOKS ====================

/**
 * Hook para modificar las fechas de una actividad (solo para el creador/host)
 */
export function useModificarActividadFechas() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: actividadesModels.ModificarActividadFechasRequest) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return actividadesApi.modificarActividadFechas(accessToken, data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: actividadesQueryKeys.all });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
