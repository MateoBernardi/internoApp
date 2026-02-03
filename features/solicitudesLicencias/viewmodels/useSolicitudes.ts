import { useAuth } from '@/features/auth/hooks/useAuthActions';
import { MobileFile } from '@/features/docs/models/Archivo';
import { uploadArchivo } from '@/features/docs/services/archivosApi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as solicitudesLicencias from '../models/SolicitudLicencia';
import {
    adjuntarArchivo,
    aprobarSolicitudLicencia,
    cancelarSolicitudLicencia,
    createSolicitudLicencia,
    getSaldosLicencia,
    getSolicitudesLicencias,
    getTiposLicencia,
    rechazarSolicitudLicencia
} from "../services/solicitudesApi";

export function useGetTiposLicencias() {
    const { getValidAccessToken } = useAuth();
    return useQuery({
        queryKey: ['tipos-licencias'],
        queryFn: async () => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return getTiposLicencia(token);
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos
    });
}

export function useGetSaldosLicencias() {
    const { getValidAccessToken } = useAuth();

    return useQuery({
        queryKey: ['saldos-licencias'],
        queryFn: async () => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return getSaldosLicencia(token);
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos
    });
}

export function useGetSolicitudesLicencias(filters?: solicitudesLicencias.GetSolicitudesFilters) {
    const { getValidAccessToken } = useAuth();

    return useQuery({
        queryKey: ['solicitudes-licencias', filters],
        queryFn: async () => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return getSolicitudesLicencias(token, filters);
        },
        select: (response: solicitudesLicencias.SolicitudLicencia[]): solicitudesLicencias.SolicitudLicencia[] => {
            // Aquí podrías transformar los datos si es necesario
            return response.map((solicitud): solicitudesLicencias.SolicitudLicencia => ({
                id: solicitud.id,
                usuario_id: solicitud.usuario_id,
                tipo_licencia_id: solicitud.tipo_licencia_id,
                fecha_inicio: solicitud.fecha_inicio,
                fecha_fin: solicitud.fecha_fin,
                cantidad_dias: solicitud.cantidad_dias,
                estado: solicitud.estado,
                aprobador_id: solicitud.aprobador_id,
                fecha_respuesta: solicitud.fecha_respuesta,
                observacion_solicitud: solicitud.observacion_solicitud,
                observacion_respuesta: solicitud.observacion_respuesta,
                created_at: solicitud.created_at,
                usuario_nombre: solicitud.usuario_nombre,
                usuario_apellido: solicitud.usuario_apellido,
                tipo_nombre: solicitud.tipo_nombre,
                archivos_adjuntos: solicitud.archivos_adjuntos,
                archivos: solicitud.archivos,
                aprobador_nombre: solicitud.aprobador_nombre,
                aprobador_apellido: solicitud.aprobador_apellido,
            }));
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos
    });
}

export function useGetSolicitudesUsuario() {
    const { getValidAccessToken } = useAuth();

    return useQuery({
        queryKey: ['solicitudes-licencias', 'usuario'],
        queryFn: async () => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return getSolicitudesLicencias(token, { });
        },
        select: (response: solicitudesLicencias.SolicitudLicencia[]): solicitudesLicencias.SolicitudLicencia[] => {
            return response.map((solicitud): solicitudesLicencias.SolicitudLicencia => ({
                id: solicitud.id,
                usuario_id: solicitud.usuario_id,
                tipo_licencia_id: solicitud.tipo_licencia_id,
                fecha_inicio: solicitud.fecha_inicio,
                fecha_fin: solicitud.fecha_fin,
                cantidad_dias: solicitud.cantidad_dias,
                estado: solicitud.estado,
                aprobador_id: solicitud.aprobador_id,
                fecha_respuesta: solicitud.fecha_respuesta,
                observacion_solicitud: solicitud.observacion_solicitud,
                observacion_respuesta: solicitud.observacion_respuesta,
                created_at: solicitud.created_at,
                usuario_nombre: solicitud.usuario_nombre,
                usuario_apellido: solicitud.usuario_apellido,
                tipo_nombre: solicitud.tipo_nombre,
                archivos_adjuntos: solicitud.archivos_adjuntos,
                archivos: solicitud.archivos,
                aprobador_nombre: solicitud.aprobador_nombre,
                aprobador_apellido: solicitud.aprobador_apellido,
            }));
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos  
    });
}

export function useCreateSolicitudLicencia() {
    const queryClient = useQueryClient();
    const { getValidAccessToken } = useAuth();

    return useMutation({
        mutationFn: async (data: solicitudesLicencias.CreateSolicitudDTO) => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return createSolicitudLicencia(token, data);
        },
        onSuccess: (newSolicitud) => {
            // Actualizar el cache agregando la nueva solicitud
            queryClient.invalidateQueries({ queryKey: ['solicitudes-licencias'] });
        },
    }); 
}

export function useAdjuntarArchivo() {
    const queryClient = useQueryClient();
    const { getValidAccessToken } = useAuth();

    return useMutation({
        mutationFn: async ({ solicitudId, archivo, archivoData }: { solicitudId: number; archivo: MobileFile; archivoData: solicitudesLicencias.ArchivoAdjunto }) => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            // Primero subir el archivo
            const archivoSubido = await uploadArchivo(token, archivo, archivoData);
            // Luego adjuntarlo a la solicitud
            return adjuntarArchivo(token, solicitudId, archivoSubido.id);
        },
        onSuccess: () => {
            // Invalidar las solicitudes para refrescar los datos
            queryClient.invalidateQueries({ queryKey: ['solicitudes-licencias'] });
        },
    });
}

export function useCancelarSolicitudLicencia() {
    const queryClient = useQueryClient();
    const { getValidAccessToken } = useAuth();

    return useMutation({
        mutationFn: async (solicitudId: number) => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return cancelarSolicitudLicencia(token, solicitudId);
        },
        onSuccess: () => {
            // Invalidar las solicitudes para refrescar los datos
            queryClient.invalidateQueries({ queryKey: ['solicitudes-licencias'] });
        },
    });
}

export function useAprobarSolicitudLicencia() {
    const queryClient = useQueryClient();
    const { getValidAccessToken } = useAuth();  

    return useMutation({
        mutationFn: async (data: { solicitudId: number; observacion?: string }) => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            // Llamar al endpoint de aprobar solicitud
            return aprobarSolicitudLicencia(token, data.solicitudId, data.observacion);
        },
        onSuccess: () => {
            // Invalidar las solicitudes para refrescar los datos       
            queryClient.invalidateQueries({ queryKey: ['solicitudes-licencias'] });
        },
    });
}       

export function useRechazarSolicitudLicencia() {
    const queryClient = useQueryClient();
    const { getValidAccessToken } = useAuth();  

    return useMutation({
        mutationFn: async (data: { solicitudId: number; observacion: string }) => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            // Llamar al endpoint de rechazar solicitud
            return rechazarSolicitudLicencia(token, data.solicitudId, data.observacion);
        },
        onSuccess: () => {
            // Invalidar las solicitudes para refrescar los datos       
            queryClient.invalidateQueries({ queryKey: ['solicitudes-licencias'] });
        },
    });
}