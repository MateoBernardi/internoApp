import { apiRequest } from '@/shared/apiRequest';
import * as solicitudes from '../models/Solicitud';

/** Extrae el mensaje de error del body JSON del backend (si aplica) */
async function extractErrorText(response: Response): Promise<string> {
    const text = await response.text();
    try {
        const json = JSON.parse(text);
        return json.error || json.message || text;
    } catch {
        return text;
    }
}

export async function crearSolicitud(accessToken: string, data: solicitudes.CrearSolicitudRequest): Promise<solicitudes.CrearSolicitudResponse> {
    const response = await apiRequest({method: 'POST', endpoint: '/solicitudes-actividades/solicitudes', token: accessToken, body: data});
    console.log('Solicitud enviada: ', data);

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error('Error en crearSolicitud:', response.status, errorMsg);
        throw new Error(errorMsg);
    }

    return await response.json();
}

export async function validarFechas(accessToken: string, data: solicitudes.ValidarFechasRequest): Promise<solicitudes.ValidarFechasResponse> {
    const response = await apiRequest({method: 'POST', endpoint: '/solicitudes-actividades/solicitudes/validar-fechas', token: accessToken, body: data});

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error('Error en validarFechas:', response.status, errorMsg);
        throw new Error(errorMsg);
    }

    return await response.json();
}

export async function cancelarSolicitud(accessToken: string, data: solicitudes.CancelarSolicitudRequest): Promise<void> {
    const response = await apiRequest({method: 'DELETE', endpoint: `/solicitudes-actividades/solicitudes/cancelar`, token: accessToken, body: data});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en cancelarSolicitud:', response.status, errorText);
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }
}

export async function modificarSolicitudFechas(accessToken: string, data: solicitudes.ModificarSolicitudFechasRequest): Promise<solicitudes.ModificarSolicitudFechasResponse> {
    const response = await apiRequest({method: 'PUT', endpoint: `/solicitudes-actividades/solicitudes/modificar-fechas`, token: accessToken, body: data});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en modificarSolicitudFechas:', response.status, errorText);
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }

    return await response.json();
}

export async function aceptarModificaciones(accessToken: string, solicitudId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiRequest({method: 'PUT', endpoint: `/solicitudes-actividades/solicitudes/aceptar-modificaciones/${solicitudId}`, token: accessToken});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en aceptarModificaciones:', response.status, errorText);
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }

    return await response.json();
}

export async function reenviarSolicitud(accessToken: string, data: solicitudes.ReenviarSolicitudRequest): Promise<solicitudes.ReenviarSolicitudResponse> {
    const response = await apiRequest({method: 'POST', endpoint: `/solicitudes-actividades/solicitudes/reenviar`, token: accessToken, body: data});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en reenviarSolicitud:', response.status, errorText);
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }

    return await response.json();
}

export async function getSolicitudBitacora(accessToken: string, solicitudId: number): Promise<solicitudes.BitacoraSolicitud[]> {
    const response = await apiRequest({method: 'GET', endpoint: `/solicitudes-actividades/solicitudes/bitacora/${solicitudId}`, token: accessToken});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en getSolicitudBitacora:', response.status, errorText);
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }

    return await response.json();
}

export async function getSolicitudesCreadas(accessToken: string): Promise<solicitudes.SolicitudEnviada[]> {
    const response = await apiRequest({method: 'GET', endpoint: '/solicitudes-actividades/solicitudes/creador', token: accessToken});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en getSolicitudesCreadas:', response.status, errorText);
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }

    return await response.json();
}

export async function obtenerMisInvitaciones(accessToken: string): Promise<solicitudes.SolicitudEnviada[]> {
    const response = await apiRequest({method: 'GET', endpoint: '/solicitudes-actividades/solicitudes/invitados', token: accessToken});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en obtenerMisInvitaciones:', response.status, errorText);
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }

    return await response.json();
}

export async function actualizarEstadoInvitacion(accessToken: string, data: solicitudes.ActualizarEstadoInvitacionRequest): Promise<solicitudes.ActualizarEstadoInvitacionResponse> {
    const response = await apiRequest({method: 'PUT', endpoint: `/solicitudes-actividades/solicitudes/invitados/estado`, token: accessToken, body: data});

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error('Error en actualizarEstadoInvitacion:', response.status, errorMsg);
        throw new Error(errorMsg);
    }

    return await response.json();
}