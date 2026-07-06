import type { ArchivoDTO } from '@/features/docs/dto/ArchivoDTO';
import { mapArchivoDTOToArchivo } from '@/features/docs/mappers/archivoMapper';
import type { Archivo } from '@/features/docs/models/Archivo';
import { apiRequest, throwApiError } from '@/shared/apiRequest';
import { idempotencyHeaders } from '@/shared/idempotency';
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

export async function crearSolicitud(accessToken: string, data: solicitudes.CrearSolicitudRequest, idempotencyKey?: string): Promise<solicitudes.CrearSolicitudResponse> {
    const dto = mapCrearSolicitudRequestToSolicitudDTO(data);
    const payload = mapSolicitudDTOToCreatePayload(dto);
    const response = await apiRequest({ method: 'POST', endpoint: '/solicitudes-actividades/solicitudes', token: accessToken, body: payload, headers: idempotencyHeaders(idempotencyKey) });

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error('Error en crearSolicitud:', response.status, errorMsg);
        throw new Error(errorMsg);
    }

    const result: CreateSolicitudResult = await response.json();
    return mapCreateSolicitudResultToResponse(result);
}

export async function cancelarSolicitud(accessToken: string, data: solicitudes.CancelarSolicitudRequest): Promise<void> {
    const response = await apiRequest({ method: 'POST', endpoint: `/solicitudes-actividades/solicitudes/cancelar`, token: accessToken, body: data });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en cancelarSolicitud:', response.status, errorText);
        throwApiError(errorText, response);
    }
}

export async function reenviarSolicitud(accessToken: string, data: solicitudes.ReenviarSolicitudRequest, idempotencyKey?: string): Promise<solicitudes.ReenviarSolicitudResponse> {
    const response = await apiRequest({ method: 'POST', endpoint: `/solicitudes-actividades/solicitudes/reenviar`, token: accessToken, body: data, headers: idempotencyHeaders(idempotencyKey) });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en reenviarSolicitud:', response.status, errorText);
        throwApiError(errorText, response);
    }

    return await response.json();
}

export async function getSolicitudBitacora(
    accessToken: string,
    solicitudId: number,
    opts?: { cursor?: number | null; limit?: number; includeSeen?: boolean },
): Promise<solicitudes.BitacoraPage> {
    const params = new URLSearchParams();
    params.set('limit', String(opts?.limit ?? 20));
    if (opts?.cursor != null) params.set('cursor', String(opts.cursor));
    if (opts?.includeSeen) params.set('includeSeen', 'true');
    const endpoint = `/solicitudes-actividades/solicitudes/bitacora/${solicitudId}?${params.toString()}`;
    const response = await apiRequest({ method: 'GET', endpoint, token: accessToken });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en getSolicitudBitacora:', response.status, errorText);
        throwApiError(errorText, response);
    }

    const result: { data?: SolicitudBitacoraDTO[]; nextCursor?: number | null } = await response.json();
    return {
        data: (result.data ?? []).map(mapSolicitudBitacoraDTOToBitacora),
        nextCursor: result.nextCursor ?? null,
    };
}

export async function getChatArchivos(accessToken: string, solicitudId: number): Promise<Archivo[]> {
    const response = await apiRequest({
        method: 'GET',
        endpoint: `/solicitudes-actividades/solicitudes/chat/archivos?solicitud_id=${solicitudId}`,
        token: accessToken,
    });

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error('Error en getChatArchivos:', response.status, errorMsg);
        throw new Error(errorMsg);
    }

    const data: ArchivoDTO[] = await response.json();
    return data.map(mapArchivoDTOToArchivo);
}

/**
 * Devuelve la cantidad de solicitudes sin ver del usuario actual.
 * Endpoint liviano pensado para prefetch / badge de "Mensajes".
 * GET /solicitudes-actividades/solicitudes/unseen
 */
export async function getSolicitudesUnseen(accessToken: string): Promise<number> {
    const response = await apiRequest({
        method: 'GET',
        endpoint: '/solicitudes-actividades/solicitudes/unseen',
        token: accessToken,
    });

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error('Error en getSolicitudesUnseen:', response.status, errorMsg);
        throw new Error(errorMsg);
    }

    // El backend puede responder un número crudo o un objeto envolvente
    // ({ unseen } | { count } | { total } | { cantidad }). Normalizamos a number.
    const data = await response.json();
    if (typeof data === 'number') return Number.isFinite(data) ? data : 0;
    const raw = data?.unseen ?? data?.count ?? data?.total ?? data?.cantidad ?? 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function actualizarEstadoInvitacion(accessToken: string, data: solicitudes.ActualizarEstadoInvitacionRequest, idempotencyKey?: string): Promise<solicitudes.ActualizarEstadoInvitacionResponse> {
    const payload = mapUpdateSolicitudRequestToPayload(data);
    const response = await apiRequest({ method: 'PUT', endpoint: `/solicitudes-actividades/solicitudes/update`, token: accessToken, body: payload, headers: idempotencyHeaders(idempotencyKey) });

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error('Error en actualizarEstadoInvitacion:', response.status, errorMsg);
        throw new Error(errorMsg);
    }

    const result: UpdateSolicitudResult = await response.json();
    return mapUpdateSolicitudResultToResponse(result);
}

export async function actualizarInvitadosSolicitud(
    accessToken: string,
    data: solicitudes.ActualizarInvitadosSolicitudRequest,
): Promise<solicitudes.ActualizarInvitadosSolicitudResponse> {
    const response = await apiRequest({
        method: 'PATCH',
        endpoint: `/solicitudes-actividades/solicitudes/${data.solicitudId}/invitados?action=${data.action}`,
        token: accessToken,
        body: { invitados: data.invitados },
    });

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        throw new Error(errorMsg);
    }

    return await response.json();
}

export async function ocultarSolicitudInvitado(accessToken: string, data: solicitudes.OcultarSolicitudInvitadoRequest): Promise<solicitudes.OcultarSolicitudInvitadoResponse> {
    const response = await apiRequest({ method: 'POST', endpoint: `/solicitudes-actividades/solicitudes/ocultar-invitado`, token: accessToken, body: data });

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error('Error en ocultarSolicitudInvitado:', response.status, errorMsg);
        throw new Error(errorMsg);
    }

    return await response.json();
}

export async function buscarSolicitudes(
    accessToken: string,
    q: string,
    tipoConversacion?: 'CHAT',
): Promise<solicitudes.SolicitudEnviada[]> {
    const params = new URLSearchParams();
    params.set('q', q);
    if (tipoConversacion) params.set('type', tipoConversacion);
    const endpoint = `/solicitudes-actividades/solicitudes/buscar?${params.toString()}`;

    console.info('[solicitudes-actividades] buscarSolicitudes', {
        q,
        tipoConversacion: tipoConversacion ?? 'all',
        endpoint,
    });

    const response = await apiRequest({
        method: 'GET',
        endpoint,
        token: accessToken,
    });

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        throw new Error(errorMsg);
    }

    const data: SolicitudInfoDTO[] = await response.json();
    return data.map(mapSolicitudInfoDTOToSolicitudEnviada);
}

export async function getSolicitudes(
    accessToken: string,
    page: number = 1,
    pageSize: number = 20,
    tipoConversacion?: 'CHAT',
): Promise<{ data: solicitudes.SolicitudEnviada[]; total: number; page: number; pageSize: number }> {
    const typeParam = tipoConversacion ? `&type=${tipoConversacion}` : '';
    const response = await apiRequest({
        method: 'GET',
        endpoint: `/solicitudes-actividades/solicitudes?page=${page}&pageSize=${pageSize}${typeParam}`,
        token: accessToken,
    });

    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error('Error en getSolicitudes:', response.status, errorMsg);
        throw new Error(errorMsg);
    }

    const result = await response.json();
    return {
        data: result.data.map(mapSolicitudInfoDTOToSolicitudEnviada),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
    };
}