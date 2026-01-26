import { apiRequest } from '@/shared/apiRequest';
import * as solicitudes from '../models/Solicitud';

export async function crearSolicitud(accessToken: string, data: solicitudes.CrearSolicitudRequest): Promise<solicitudes.CrearSolicitudResponse> {
    const response = await apiRequest({method: 'POST', endpoint: '/solicitudes-actividades/solicitudes', token: accessToken, body: data});
    console.log('Solicitud enviada: ', data);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en crearSolicitud:', response.status, errorText);
        throw new Error(`No se pudo crear la solicitud: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

export async function cancelarSolicitud(accessToken: string, data: solicitudes.CancelarSolicitudRequest): Promise<void> {
    const response = await apiRequest({method: 'DELETE', endpoint: `/solicitudes-actividades/solicitudes/cancelar`, token: accessToken});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en cancelarSolicitud:', response.status, errorText);
        throw new Error(`No se pudo cancelar la solicitud: ${response.status} - ${errorText}`);
    }
}

export async function modificarSolicitudFechas(accessToken: string, data: solicitudes.ModificarSolicitudFechasRequest): Promise<solicitudes.ModificarSolicitudFechasResponse> {
    const response = await apiRequest({method: 'PUT', endpoint: `/solicitudes-actividades/solicitudes/modificar-fechas`, token: accessToken, body: data});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en modificarSolicitudFechas:', response.status, errorText);
        throw new Error(`No se pudo modificar las fechas de la solicitud: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

export async function aceptarModificaciones(accessToken: string, solicitudId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiRequest({method: 'POST', endpoint: `/solicitudes-actividades/solicitudes/aceptar-modificaciones/${solicitudId}`, token: accessToken});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en aceptarModificaciones:', response.status, errorText);
        throw new Error(`No se pudo aceptar las modificaciones de la solicitud: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

export async function reenviarSolicitud(accessToken: string, data: solicitudes.ReenviarSolicitudRequest): Promise<solicitudes.ReenviarSolicitudResponse> {
    const response = await apiRequest({method: 'POST', endpoint: `/solicitudes-actividades/solicitudes/reenviar`, token: accessToken, body: data});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en reenviarSolicitud:', response.status, errorText);
        throw new Error(`No se pudo reenviar la solicitud: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

export async function getSolicitudBitacora(accessToken: string, solicitudId: number): Promise<solicitudes.BitacoraSolicitud[]> {
    const response = await apiRequest({method: 'GET', endpoint: `/solicitudes-actividades/solicitudes/bitacora/${solicitudId}`, token: accessToken});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en getSolicitudBitacora:', response.status, errorText);
        throw new Error(`No se pudo obtener la bitácora de la solicitud: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

export async function getSolicitudesCreadas(accessToken: string): Promise<solicitudes.Solicitud[]> {
    const response = await apiRequest({method: 'GET', endpoint: '/solicitudes-actividades/solicitudes/creador', token: accessToken});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en getSolicitudesCreadas:', response.status, errorText);
        throw new Error(`No se pudo obtener las solicitudes creadas: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

export async function obtenerMisInvitaciones(accessToken: string): Promise<solicitudes.Solicitud[]> {
    const response = await apiRequest({method: 'GET', endpoint: '/solicitudes-actividades/solicitudes/invitados', token: accessToken});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en obtenerMisInvitaciones:', response.status, errorText);
        throw new Error(`No se pudo obtener mis invitaciones: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

export async function actualizarEstadoInvitacion(accessToken: string, data: solicitudes.ActualizarEstadoInvitacionRequest): Promise<solicitudes.ActualizarEstadoInvitacionResponse> {
    const response = await apiRequest({method: 'PUT', endpoint: `/solicitudes-actividades/solicitudes/invitados/estado`, token: accessToken, body: data});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en actualizarEstadoInvitacion:', response.status, errorText);
        throw new Error(`No se pudo actualizar el estado de la invitación: ${response.status} - ${errorText}`);
    }

    return await response.json();
}