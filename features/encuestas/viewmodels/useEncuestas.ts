import { useAuth } from '@/features/auth/hooks/useAuthActions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createEncuestaCompleta,
    enviarRespuestas,
    fetchEncuestas,
    getRespuestasEncuesta
} from '../services/encuestasApi';

export function useGetEncuestas() {
    const { getValidAccessToken } = useAuth();

    return useQuery({
        queryKey: ['encuestas'],
        queryFn: async () => {
            const token = await getValidAccessToken();
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
    const { getValidAccessToken } = useAuth();  

    return useMutation({    
        mutationFn: async (data: {respuestas: import('../models/Encuesta').Respuesta[]}) => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return enviarRespuestas(token, data);
        },
        onSuccess: () => {
            // Invalidate queries related to encuestas to refetch updated data
            queryClient.invalidateQueries({ queryKey: ['encuestas'] });
        },
    });
}

export function useGetRespuestasEncuesta() {
    const { getValidAccessToken } = useAuth();

    return useQuery({
        queryKey: ['encuestas_respuestas'],
        queryFn: async () => {
            const token = await getValidAccessToken();
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
    const { getValidAccessToken } = useAuth();

    return useMutation({
        mutationFn: async (data: {encuesta: import('../models/Encuesta').Encuesta, preguntas: import('../models/Encuesta').Pregunta}) => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return createEncuestaCompleta(token, data);
        },
        onSuccess: () => {
            // Invalidar la query para refrescar desde el servidor
            queryClient.invalidateQueries({ queryKey: ['encuestas'] });
        },
    });
}

