import { useAuth } from '@/features/auth/context/AuthContext';
import { IDEMPOTENT_MUTATION_RETRY } from '@/shared/idempotency';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createEncuestaCompleta,
    eliminarEncuesta,
    enviarRespuestas,
    fetchEncuestas,
    getRespuestasEncuesta
} from '../services/encuestasApi';

export function useGetEncuestas(enabled: boolean = true) {
    const { tokens } = useAuth();

    return useQuery({
        queryKey: ['encuestas'],
        enabled: enabled && !!tokens?.accessToken,
        queryFn: async () => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return fetchEncuestas(token);
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos 
        retry: 1,
        refetchOnWindowFocus: false,
    });
}   

export function useEnviarRespuestasEncuesta() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async ({ idempotencyKey, ...data }: {respuestas: import('../models/Encuesta').Respuesta[]; idempotencyKey?: string}) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return enviarRespuestas(token, data, idempotencyKey);
        },
        onSuccess: () => {
            // Invalidate queries related to encuestas to refetch updated data
            queryClient.invalidateQueries({ queryKey: ['encuestas'] });
        },
        // Reintentos seguros: el mismo X-Idempotency-Key viaja en cada intento.
        ...IDEMPOTENT_MUTATION_RETRY,
    });
}

export function useGetRespuestasEncuesta() {
    const { tokens } = useAuth();

    return useQuery({
        queryKey: ['encuestas_respuestas'],
        queryFn: async () => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return getRespuestasEncuesta(token);
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos
    });
}

export function useCreateEncuestaCompleta() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async ({ idempotencyKey, ...data }: {encuesta: import('../models/Encuesta').Encuesta, preguntas: import('../models/Encuesta').Pregunta, idempotencyKey?: string}) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return createEncuestaCompleta(token, data, idempotencyKey);
        },
        onSuccess: () => {
            // Invalidar la query para refrescar desde el servidor
            queryClient.invalidateQueries({ queryKey: ['encuestas'] });
            queryClient.invalidateQueries({ queryKey: ['encuestas_respuestas'] });
        },
        // Reintentos seguros: el mismo X-Idempotency-Key viaja en cada intento.
        ...IDEMPOTENT_MUTATION_RETRY,
    });
}

export function useEliminarEncuesta() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async (encuestaId: number) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return eliminarEncuesta(token, encuestaId);
        },
        onSuccess: () => {
            // Invalidar queries para refrescar desde el servidor
            queryClient.invalidateQueries({ queryKey: ['encuestas'] });
            queryClient.invalidateQueries({ queryKey: ['encuestas_respuestas'] });
        },
    });
}

