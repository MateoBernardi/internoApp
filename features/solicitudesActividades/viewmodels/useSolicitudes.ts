import { useAuth } from '@/features/auth/context/AuthContext';
import { IDEMPOTENT_MUTATION_RETRY } from '@/shared/idempotency';
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as solicitudModels from '../models/Solicitud';
import * as solicitudesApi from '../services/solicitudesApi';

export const solicitudesQueryKeys = {
  all: ['solicitudes'] as const,
  lista: (page: number, pageSize: number, tipoConversacion?: 'CHAT') =>
    [...solicitudesQueryKeys.all, 'lista', page, pageSize, tipoConversacion ?? 'all'] as const,
  creadas: () => [...solicitudesQueryKeys.all, 'creadas'] as const,
  invitaciones: () => [...solicitudesQueryKeys.all, 'invitaciones'] as const,
  bitacora: (solicitudId: number) => [...solicitudesQueryKeys.all, 'bitacora', solicitudId] as const,
  chatArchivos: (solicitudId: number) => [...solicitudesQueryKeys.all, 'chatArchivos', solicitudId] as const,
  unseen: () => [...solicitudesQueryKeys.all, 'unseen'] as const,
};

const BITACORA_PAGE_SIZE = 20;

/**
 * Hook para obtener la bitácora de cambios de una solicitud.
 * Paginado por cursor: cada página trae las más recientes y `nextCursor`
 * apunta a las más antiguas. El `select` invierte el orden de las páginas
 * para que la más antigua quede primero (cronológico de arriba a abajo).
 */
export function useSolicitudBitacora(solicitudId: number) {
  const { tokens } = useAuth();

  return useInfiniteQuery({
    queryKey: solicitudesQueryKeys.bitacora(solicitudId),
    queryFn: ({ pageParam }) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return solicitudesApi.getSolicitudBitacora(accessToken, solicitudId, {
        cursor: pageParam,
        limit: BITACORA_PAGE_SIZE,
      });
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    select: (data) => ({
      ...data,
      pages: [...data.pages].reverse(),
    }),
    enabled: !!solicitudId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para obtener los archivos de una conversación (chat).
 * Se habilita bajo demanda (p. ej. al abrir el modal de archivos).
 */
export function useChatArchivos(solicitudId: number, enabled: boolean) {
  const { tokens } = useAuth();

  return useQuery({
    queryKey: solicitudesQueryKeys.chatArchivos(solicitudId),
    enabled: enabled && !!solicitudId,
    queryFn: async () => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return solicitudesApi.getChatArchivos(accessToken, solicitudId);
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook para el contador de solicitudes sin ver (badge de "Mensajes").
 * Refresca periódicamente y al volver el foco para mantener el badge al día.
 */
export function useSolicitudesUnseen(enabled = true) {
  const { tokens } = useAuth();

  return useQuery({
    queryKey: solicitudesQueryKeys.unseen(),
    enabled: enabled && !!tokens?.accessToken,
    queryFn: async () => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return solicitudesApi.getSolicitudesUnseen(accessToken);
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Hook para crear una nueva solicitud
 */
export function useCrearSolicitud(idempotencyKey?: string) {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: solicitudModels.CrearSolicitudRequest) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return solicitudesApi.crearSolicitud(accessToken, data, idempotencyKey);
    },
    onSuccess: () => {
      // Invalidar las solicitudes creadas para refrescar la lista
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.all,
      });
    },
    // Reintentos seguros: el mismo X-Idempotency-Key viaja en cada intento.
    ...IDEMPOTENT_MUTATION_RETRY,
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
        queryKey: solicitudesQueryKeys.all,
      });
    },
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
        queryKey: solicitudesQueryKeys.all,
      });
    },
  });
}

/**
 * Hook para agregar o quitar invitados de una solicitud existente
 */
export function useActualizarInvitadosSolicitud() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: solicitudModels.ActualizarInvitadosSolicitudRequest) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) throw new Error('No access token available');
      return solicitudesApi.actualizarInvitadosSolicitud(accessToken, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: solicitudesQueryKeys.all });
    },
  });
}

/**
 * Hook para ocultar una solicitud recibida por el invitado
 */
export function useOcultarSolicitudInvitado() {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: solicitudModels.OcultarSolicitudInvitadoRequest) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return solicitudesApi.ocultarSolicitudInvitado(accessToken, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.all,
      });
    },
  });
}

/**
 * Hook para actualizar el estado de una invitación (aceptar, rechazar, etc.)
 */
export function useActualizarEstadoInvitacion(opts?: { retry?: number }) {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    // La idempotency key viaja por variable (no por argumento del hook) para que
    // quede fijada a ESTA operación: estable entre los reintentos automáticos,
    // pero distinta de otras mutaciones concurrentes (p. ej. el "SEEN" automático
    // que dispara useMarcarVisto en paralelo a una acción del usuario).
    mutationFn: async ({
      idempotencyKey,
      ...data
    }: solicitudModels.ActualizarEstadoInvitacionRequest & { idempotencyKey?: string }) => {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        throw new Error('No access token available');
      }
      return solicitudesApi.actualizarEstadoInvitacion(accessToken, data, idempotencyKey);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.bitacora(variables.solicitud_id),
      });
      // Invalidar las invitaciones para refrescar la lista
      queryClient.invalidateQueries({
        queryKey: solicitudesQueryKeys.all,
      });
    },
    // Reintentos seguros: el mismo X-Idempotency-Key viaja en cada intento.
    // `retry` se puede sobreescribir por instancia (p. ej. retry:0 en el envío
    // de chat, donde el optimista + refetch en onSettled ya reconcilian y los
    // reintentos solo desperdician red sobre falsos negativos de red nativos).
    ...IDEMPOTENT_MUTATION_RETRY,
    retry: opts?.retry ?? IDEMPOTENT_MUTATION_RETRY.retry,
  });
}

export function useBuscarSolicitudes(q: string, tipoConversacion?: 'CHAT') {
  const { tokens } = useAuth();

  return useQuery({
    queryKey: [...solicitudesQueryKeys.all, 'buscar', q, tipoConversacion ?? 'all'] as const,
    enabled: q.trim().length > 0,
    queryFn: async () => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token available');
      return solicitudesApi.buscarSolicitudes(token, q, tipoConversacion);
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useSolicitudes(page: number = 1, pageSize: number = 20, enabled: boolean = true, tipoConversacion?: 'CHAT') {
  const { tokens } = useAuth();

  return useQuery({
    queryKey: solicitudesQueryKeys.lista(page, pageSize, tipoConversacion),
    enabled,
    queryFn: async () => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token available');
      return solicitudesApi.getSolicitudes(token, page, pageSize, tipoConversacion);
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
