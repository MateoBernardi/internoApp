import { apiRequest } from '@/shared/apiRequest';
import type {
    CreateSolicitudResult,
    SolicitudBitacoraDTO,
    SolicitudInfoDTO,
    UpdateSolicitudResult,
} from '../dto/SolicitudDTO';
import {
    mapCrearSolicitudRequestToSolicitudDTO,
    mapCreateSolicitudResultToResponse,
    mapSolicitudBitacoraDTOToBitacora,
    mapSolicitudDTOToCreatePayload,
    mapSolicitudInfoDTOToSolicitudEnviada,
    mapUpdateSolicitudRequestToPayload,
    mapUpdateSolicitudResultToResponse,
} from '../mappers';
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
    const dto = mapCrearSolicitudRequestToSolicitudDTO(data);
    const payload = mapSolicitudDTOToCreatePayload(dto);
    const response = await apiRequest({method: 'POST', endpoint: '/solicitudes-actividades/solicitudes', token: accessToken, body: payload});

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error('Error en crearSolicitud:', response.status, errorMsg);
        throw new Error(errorMsg);
    }

    const result: CreateSolicitudResult = await response.json();
    return mapCreateSolicitudResultToResponse(result);
}

export async function cancelarSolicitud(accessToken: string, data: solicitudes.CancelarSolicitudRequest): Promise<void> {
    const response = await apiRequest({method: 'POST', endpoint: `/solicitudes-actividades/solicitudes/cancelar`, token: accessToken, body: data});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en cancelarSolicitud:', response.status, errorText);
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }
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

    const data: SolicitudBitacoraDTO[] = await response.json();
    return data.map(mapSolicitudBitacoraDTOToBitacora);
}

export async function getSolicitudesCreadas(accessToken: string): Promise<solicitudes.SolicitudEnviada[]> {
    const response = await apiRequest({method: 'GET', endpoint: '/solicitudes-actividades/solicitudes/creador', token: accessToken});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en getSolicitudesCreadas:', response.status, errorText);
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }

    const data: SolicitudInfoDTO[] = await response.json();
    return data.map(mapSolicitudInfoDTOToSolicitudEnviada);
}

export async function obtenerMisInvitaciones(accessToken: string): Promise<solicitudes.SolicitudEnviada[]> {
    const response = await apiRequest({method: 'GET', endpoint: '/solicitudes-actividades/solicitudes/invitados', token: accessToken});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en obtenerMisInvitaciones:', response.status, errorText);
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }

    const data: SolicitudInfoDTO[] = await response.json();
    return data.map(mapSolicitudInfoDTOToSolicitudEnviada);
}

export async function actualizarEstadoInvitacion(accessToken: string, data: solicitudes.ActualizarEstadoInvitacionRequest): Promise<solicitudes.ActualizarEstadoInvitacionResponse> {
    const payload = mapUpdateSolicitudRequestToPayload(data);
    const response = await apiRequest({method: 'PUT', endpoint: `/solicitudes-actividades/solicitudes/update`, token: accessToken, body: payload});

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error('Error en actualizarEstadoInvitacion:', response.status, errorMsg);
        throw new Error(errorMsg);
    }

    const result: UpdateSolicitudResult = await response.json();
    return mapUpdateSolicitudResultToResponse(result);
}

export async function ocultarSolicitudInvitado(accessToken: string, data: solicitudes.OcultarSolicitudInvitadoRequest): Promise<solicitudes.OcultarSolicitudInvitadoResponse> {
    const response = await apiRequest({method: 'POST', endpoint: `/solicitudes-actividades/solicitudes/ocultar-invitado`, token: accessToken, body: data});

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error('Error en ocultarSolicitudInvitado:', response.status, errorMsg);
        throw new Error(errorMsg);
    }

    return await response.json();
}