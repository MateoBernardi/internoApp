import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as solicitudModels from '../models/Solicitud';
import * as solicitudesApi from '../services/solicitudesApi';

const solicitudesQueryKeys = {
  all: ['solicitudes'] as const,
  creadas: () => [...solicitudesQueryKeys.all, 'creadas'] as const,
  invitaciones: () => [...solicitudesQueryKeys.all, 'invitaciones'] as const,
  bitacora: (solicitudId: number) => [...solicitudesQueryKeys.all, 'bitacora', solicitudId] as const,
};

/**
 * Hook para obtener las solicitudes creadas por el usuario
 */
export function useSolicitudesCreadas() {
    const { tokens } = useAuth();
    return useQuery({
        queryKey: solicitudesQueryKeys.creadas(),
        queryFn: async () => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No access token available');
            }
            return solicitudesApi.getSolicitudesCreadas(token);
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos (anteriormente cacheTime)
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
}

/**
 * Hook para obtener las invitaciones recibidas por el usuario
 */
export function useInvitaciones() {
    const { tokens } = useAuth();

    return useQuery({
        queryKey: solicitudesQueryKeys.invitaciones(),
        queryFn: async () => {
            const accessToken = tokens?.accessToken;
            if (!accessToken) {
                throw new Error('No access token available');
            }
            return solicitudesApi.obtenerMisInvitaciones(accessToken);
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
}

/**
 * Hook para obtener la bitácora de cambios de una solicitud
 */
export function useSolicitudBitacora(solicitudId: number) {
  const { tokens } = useAuth();

  return useQuery({
    queryKey: solicitudesQueryKeys.bitacora(solicitudId),
    queryFn: async () => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return solicitudesApi.getSolicitudBitacora(accessToken, solicitudId);
    },
    enabled: !!solicitudId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para crear una nueva solicitud
 */
export function useCrearSolicitud() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: solicitudModels.CrearSolicitudRequest) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return solicitudesApi.crearSolicitud(accessToken, data);
    },
    onSuccess: () => {
      // Invalidar las solicitudes creadas para refrescar la lista
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.creadas(),
      });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para cancelar una solicitud existente
 */
export function useCancelarSolicitud() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: solicitudModels.CancelarSolicitudRequest) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return solicitudesApi.cancelarSolicitud(accessToken, data);
    },
    onSuccess: () => {
      // Invalidar ambas listas de solicitudes
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.creadas(),
      });
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.invitaciones(),
      });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para modificar las fechas de una solicitud
 */
export function useModificarSolicitudFechas() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: solicitudModels.ModificarSolicitudFechasRequest) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return solicitudesApi.modificarSolicitudFechas(accessToken, data);
    },
    onSuccess: (_, variables) => {
      // Invalidar la bitácora de la solicitud modificada
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.bitacora(variables.solicitudId),
      });
      // Invalidar las listas de solicitudes
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.creadas(),
      });
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.invitaciones(),
      });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para aceptar modificaciones en una solicitud
 */
export function useAceptarModificaciones() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (solicitudId: number) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return solicitudesApi.aceptarModificaciones(accessToken, solicitudId);
    },
    onSuccess: (_, solicitudId) => {
      // Invalidar la bitácora y las listas
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.bitacora(solicitudId),
      });
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.creadas(),
      });
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.invitaciones(),
      });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para reenviar una solicitud a nuevos invitados
 */
export function useReenviarSolicitud() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: solicitudModels.ReenviarSolicitudRequest) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return solicitudesApi.reenviarSolicitud(accessToken, data);
    },
    onSuccess: () => {
      // Invalidar las solicitudes creadas
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.creadas(),
      });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para actualizar el estado de una invitación (aceptar, rechazar, etc.)
 */
export function useActualizarEstadoInvitacion() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: solicitudModels.ActualizarEstadoInvitacionRequest) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return solicitudesApi.actualizarEstadoInvitacion(accessToken, data);
    },
    onSuccess: () => {
      // Invalidar las invitaciones para refrescar la lista
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.invitaciones(),
      });
      // Invalidar también las creadas por si estamos actualizando una enviada (ej. SEEN)
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.creadas(),
      });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
