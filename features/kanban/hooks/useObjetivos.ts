import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateObjetivo, Objetivo, UpdateObjetivo } from '../models/Objetivo';
import {
    archivoObjetivo,
    createObjetivo,
    deleteObjetivo,
    editObjetivo,
    fetchObjetivos,
    invitadosObjetivo,
    updateObjetivo
} from '../services/kanbanApi';

const OBJETIVOS_QUERY_KEY = ['objetivos'];

/**
 * Hook para obtener todos los objetivos del kanban
 */
export function useObjetivos() {
    const { tokens } = useAuth();

    return useQuery({
        queryKey: OBJETIVOS_QUERY_KEY,
        queryFn: async () => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return fetchObjetivos(token);
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos (antes llamado cacheTime)
    });
}

/**
 * Hook para crear un nuevo objetivo
 */
export function useCreateObjetivo() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async (data: CreateObjetivo) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            console.log('Creando objetivo con data:', data);
            return createObjetivo(token, data);
        },
        onSuccess: (newObjetivo) => {
            // Actualizar el cache agregando el nuevo objetivo
            queryClient.setQueryData(OBJETIVOS_QUERY_KEY, (old: Objetivo[] | undefined) => {
                return old ? [...old, newObjetivo] : [newObjetivo];
            });
        },
    });
}

/**
 * Hook para actualizar un objetivo
 */
export function useUpdateObjetivo() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: UpdateObjetivo }) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return updateObjetivo(token, id, data);
        },
        onMutate: async ({ id, data }) => {
            // Cancelar queries pendientes para evitar conflictos
            await queryClient.cancelQueries({ queryKey: OBJETIVOS_QUERY_KEY });

            // Snapshot de los datos viejos
            const previousData = queryClient.getQueryData<Objetivo[]>(OBJETIVOS_QUERY_KEY);

            // Actualización optimista: actualizar el objetivo localmente
            queryClient.setQueryData<Objetivo[]>(OBJETIVOS_QUERY_KEY, (old) => {
                if (!old) return old;

                return old.map((obj) => {
                    if (obj.id !== id) return obj;

                    // Crear la versión optimista del objetivo actualizado
                    const updatedObj = { ...obj, ...data };

                    // Si hay cambio de estado y observación, agregar entrada a bitácora optimista
                    if (data.estado && data.estado !== obj.estado && data.observacion) {
                        const newBitacoraEntry = {
                            id: Date.now(), // ID temporal
                            estado_anterior: obj.estado,
                            estado_nuevo: data.estado,
                            observacion: data.observacion,
                            created_at: new Date().toISOString(),
                            usuario_id: 0, // Se rellena en el servidor
                            usuario_nombre: 'Tú',
                        };
                        updatedObj.bitacora = [newBitacoraEntry, ...(obj.bitacora || [])];
                    }

                    return updatedObj;
                });
            });

            return { previousData };
        },
        onSuccess: (updatedObjetivo) => {
            // Opción A: Reemplazo manual 
            queryClient.setQueryData<Objetivo[]>(OBJETIVOS_QUERY_KEY, (old) => {
                return old?.map((obj) => (obj.id === updatedObjetivo.id ? updatedObjetivo : obj));
            });

            // Opción B: Invalidador de la query para refetch
            queryClient.invalidateQueries({ queryKey: OBJETIVOS_QUERY_KEY });
        },
        onError: (err, variables, context: any) => {
            // Revertir a los datos viejos en caso de error
            if (context?.previousData) {
                queryClient.setQueryData(OBJETIVOS_QUERY_KEY, context.previousData);
            }
        },
    });
}

// useEditObjetivo: mutación para título o descripción
export function useEditObjetivo() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async ({
            id,
            field,
            data,
        }: {
            id: number;
            field: 'titulo' | 'descripcion';
            data: Record<string, any>;
        }) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No hay token de acceso');
            return editObjetivo(token, id, field, data);
        },
        onSuccess: (updatedObjetivo) => {
            queryClient.setQueryData<Objetivo[]>(OBJETIVOS_QUERY_KEY, (old) =>
                old?.map((obj) => (obj.id === updatedObjetivo.id ? updatedObjetivo : obj))
            );
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: OBJETIVOS_QUERY_KEY });
        },
    });
}

// useArchivoObjetivo: mutación para archivos
export function useArchivoObjetivo() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async ({
            id,
            action,
            archivosIds,
        }: {
            id: number;
            action: 'add' | 'remove';
            archivosIds: number[];
        }) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No hay token de acceso');
            return archivoObjetivo(token, id, action, archivosIds);
        },
        onSuccess: (updatedObjetivo) => {
            queryClient.setQueryData<Objetivo[]>(OBJETIVOS_QUERY_KEY, (old) =>
                old?.map((obj) => (obj.id === updatedObjetivo.id ? updatedObjetivo : obj))
            );
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: OBJETIVOS_QUERY_KEY });
        },
    });
}

// useInvitadosObjetivo: mutación para invitados
export function useInvitadosObjetivo() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async ({
            id,
            action,
            invitados,
        }: {
            id: number;
            action: 'add' | 'remove';
            invitados: number[];
        }) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No hay token de acceso');
            return invitadosObjetivo(token, id, action, invitados);
        },
        onSuccess: (updatedObjetivo) => {
            queryClient.setQueryData<Objetivo[]>(OBJETIVOS_QUERY_KEY, (old) =>
                old?.map((obj) => (obj.id === updatedObjetivo.id ? updatedObjetivo : obj))
            );
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: OBJETIVOS_QUERY_KEY });
        },
    });
}

/**
 * Hook para eliminar un objetivo
 */
export function useDeleteObjetivo() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async (id: number) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return deleteObjetivo(token, id);
        },
        onSuccess: (_, deletedId) => {
            // Eliminar del cache
            queryClient.setQueryData(OBJETIVOS_QUERY_KEY, (old: Objetivo[] | undefined) => {
                return old ? old.filter((obj) => obj.id !== deletedId) : undefined;
            });
        },
    });
}

/**
 * Hook para refrescar manualmente los objetivos
 */
export function useRefreshObjetivos() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({ queryKey: OBJETIVOS_QUERY_KEY });
    };
}
