import { useAuth } from '@/features/auth/context/AuthContext';
import { generateIdempotencyKey, IDEMPOTENT_MUTATION_RETRY } from '@/shared/idempotency';
import { crearSolicitud } from '@/features/solicitudesActividades/services/solicitudesApi';
import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    actualizarParticipantesEncuesta,
    createEncuestaCompleta,
    eliminarEncuesta,
    eliminarOpcionEncuesta,
    enviarRespuestas,
    fetchEncuestas,
    getRespuestasEncuesta,
    registrarConvocatorias,
} from '../services/encuestasApi';
import { Respuesta } from '../models/Encuesta';

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
        onSettled: () => {
            // Invalida tanto en éxito como en error: si el backend rechaza porque
            // un slot ya fue tomado, la encuesta se refresca y muestra el estado real.
            queryClient.invalidateQueries({ queryKey: ['encuestas'] });
            queryClient.invalidateQueries({ queryKey: ['encuestas_respuestas'] });
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
        mutationFn: async ({ idempotencyKey, encuesta, preguntas, invitados }: {encuesta: import('../models/Encuesta').Encuesta, preguntas: import('../models/Encuesta').Pregunta, invitados?: number[], idempotencyKey?: string}) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return createEncuestaCompleta(token, { encuesta, preguntas, invitados }, idempotencyKey);
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
            queryClient.invalidateQueries({ queryKey: ['encuestas'] });
            queryClient.invalidateQueries({ queryKey: ['encuestas_respuestas'] });
        },
    });
}

export function useEliminarOpcion() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async (opcionId: number) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return eliminarOpcionEncuesta(token, opcionId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['encuestas'] });
            queryClient.invalidateQueries({ queryKey: ['encuestas_respuestas'] });
        },
    });
}

export function useActualizarParticipantesEncuesta() {
    const { tokens } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            encuestaId,
            action,
            invitados,
        }: {
            encuestaId: number;
            action: 'add' | 'remove';
            invitados: number[];
        }) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No hay token de acceso');
            return actualizarParticipantesEncuesta(token, encuestaId, action, invitados);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['encuestas_respuestas'] });
        },
    });
}

export interface ReunionPersonaRequest {
    voter: Respuesta;
    titulo: string;
    descripcion: string;
    fechaInicio: Date;  // ISO datetime del slot elegido
    fechaFin: Date;     // editable por el supervisor (default: fechaInicio + 1h)
}

export interface ConvocarReunionesResult {
    exitosas: number;
    fallidas: { nombre: string; apellido: string; error: string }[];
}

const BATCH_SIZE = 5;

export function useConvocarReuniones() {
    const { tokens } = useAuth();
    const queryClient = useQueryClient();
    const [isPending, setIsPending] = useState(false);

    const enviar = useCallback(
        async (encuestaId: number, requests: ReunionPersonaRequest[]): Promise<ConvocarReunionesResult> => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No hay token de acceso');

            setIsPending(true);
            const exitosasIds: number[] = [];
            const fallidas: ConvocarReunionesResult['fallidas'] = [];

            try {
                for (let i = 0; i < requests.length; i += BATCH_SIZE) {
                    const batch = requests.slice(i, i + BATCH_SIZE);

                    const results = await Promise.allSettled(
                        batch.map((req) =>
                            crearSolicitud(
                                token,
                                {
                                    titulo: req.titulo,
                                    descripcion: req.descripcion,
                                    tipo_actividad: 'REUNION',
                                    invitados: [req.voter.usuario_id!],
                                    fecha_inicio: req.fechaInicio,
                                    fecha_fin: req.fechaFin,
                                },
                                generateIdempotencyKey()
                            )
                        )
                    );

                    results.forEach((result, idx) => {
                        if (result.status === 'fulfilled') {
                            exitosasIds.push(batch[idx].voter.usuario_id!);
                        } else {
                            fallidas.push({
                                nombre: batch[idx].voter.nombre ?? '',
                                apellido: batch[idx].voter.apellido ?? '',
                                error: result.reason instanceof Error
                                    ? result.reason.message
                                    : 'Error desconocido',
                            });
                        }
                    });
                }

                // Registrar convocatorias solo para los envíos exitosos
                if (exitosasIds.length > 0) {
                    await registrarConvocatorias(token, encuestaId, exitosasIds).catch(() => {
                        // No propagamos el error: las solicitudes ya fueron creadas.
                        // El supervisor puede reintentar desde resultados.
                    });
                }
            } finally {
                setIsPending(false);
                queryClient.invalidateQueries({ queryKey: ['encuestas_respuestas'] });
            }

            return { exitosas: exitosasIds.length, fallidas };
        },
        [tokens, queryClient]
    );

    return { enviar, isPending };
}

