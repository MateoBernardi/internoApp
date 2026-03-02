import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as actividadesModels from '../models/Actividad';
import * as actividadesApi from '../services/actividadesApi';

// ==================== QUERY KEYS ====================
const actividadesQueryKeys = {
  all: ['actividades'] as const,
  semanales: () => [...actividadesQueryKeys.all, 'semanales'] as const,
};

// ==================== QUERIES ====================

/**
 * Hook para obtener las actividades semanales futuras del usuario
 */
export function useActividadesSemanales() {
  const { tokens } = useAuth();

  return useQuery({
    queryKey: actividadesQueryKeys.semanales(),
    queryFn: async () => {
      const accessToken = tokens?.accessToken;
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
    onMutate: async (newData) => {
      // Cancelar refetches en curso
      await queryClient.cancelQueries({ queryKey: actividadesQueryKeys.semanales() });

      // Snapshot del estado previo
      const previousData = queryClient.getQueryData<actividadesModels.ActividadesSemanalesResponse>(
        actividadesQueryKeys.semanales()
      );

      // Actualización optimista
      queryClient.setQueryData<actividadesModels.ActividadesSemanalesResponse>(
        actividadesQueryKeys.semanales(),
        (old) => {
          if (!old) return { actividades: [], licencias: [] };
          const optimisticActividad: actividadesModels.Actividad = {
            id: Date.now(), // ID temporal
            titulo: newData.titulo,
            descripcion: newData.descripcion,
            fecha_inicio: newData.fecha_inicio,
            fecha_fin: newData.fecha_fin,
            rol: 'host',
            participantes: [],
            solicitud_id: newData.solicitud_id ?? null,
          };
          return {
            ...old,
            actividades: [...old.actividades, optimisticActividad],
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _newData, context) => {
      // Revertir al estado previo en caso de error
      if (context?.previousData) {
        queryClient.setQueryData(actividadesQueryKeys.semanales(), context.previousData);
      }
    },
    onSettled: () => {
      // Siempre revalidar con el servidor
      queryClient.invalidateQueries({ queryKey: actividadesQueryKeys.semanales() });
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
        queryKey: actividadesQueryKeys.semanales(),
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
      await queryClient.cancelQueries({ queryKey: actividadesQueryKeys.semanales() });

      // Snapshot del estado previo
      const previousData = queryClient.getQueryData<actividadesModels.ActividadesSemanalesResponse>(
        actividadesQueryKeys.semanales()
      );

      // Actualización optimista: remover la actividad de la lista
      queryClient.setQueryData<actividadesModels.ActividadesSemanalesResponse>(
        actividadesQueryKeys.semanales(),
        (old) => {
          if (!old) return { actividades: [], licencias: [] };
          return {
            ...old,
            actividades: old.actividades.filter((a) => a.id !== cancelData.actividadId),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _cancelData, context) => {
      // Revertir al estado previo en caso de error
      if (context?.previousData) {
        queryClient.setQueryData(actividadesQueryKeys.semanales(), context.previousData);
      }
    },
    onSettled: () => {
      // Siempre revalidar con el servidor
      queryClient.invalidateQueries({ queryKey: actividadesQueryKeys.semanales() });
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
      queryClient.invalidateQueries({ queryKey: actividadesQueryKeys.semanales() });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
