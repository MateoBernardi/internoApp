import { apiRequest } from "@/shared/apiRequest";
import {
    mapActividadDTOToDetalle,
    mapActividadesPorPeriodoDTOToResponse,
    mapCancelarActividadRequestToPayload,
    mapCrearActividadRequestToDTO,
    mapModificarActividadFechasRequestToPayload,
    mapObtenerActividadesPorPeriodoRequestToPayload,
} from "../mappers";
import * as actividades from "../models/Actividad";

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

export async function createActividad(accessToken: string, data: actividades.CrearActividadRequest): Promise<actividades.CrearActividadResponse> {
    const payload = mapCrearActividadRequestToDTO(data);
    const response = await apiRequest({ method: "PUT", endpoint: "/solicitudes-actividades/actividades/crear", token: accessToken, body: payload });    
    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error("Error en createActividad:", response.status, errorMsg);
        throw new Error(errorMsg);
    }
    return await response.json();
}

export async function agregarParticipanteActividad(accessToken: string, data: actividades.AgregarParticipanteRequest): Promise<actividades.AgregarParticipanteResponse> {
    const response = await apiRequest({ method: "POST", endpoint: `/solicitudes-actividades/actividades/participantes`, token: accessToken, body: data });    
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error en agregarParticipanteActividad:", response.status, errorText);
        throw new Error(`No se pudo agregar el participante a la actividad: ${response.status} - ${errorText}`);
    }
    return await response.json();
}   

export async function obtenerActividadesPorPeriodo(
    accessToken: string,
    data: actividades.ObtenerActividadesPorPeriodoRequest
): Promise<actividades.ActividadesPorPeriodoResponse> {
    const payload = mapObtenerActividadesPorPeriodoRequestToPayload(data);
    const response = await apiRequest({
        method: "POST",
        endpoint: "/solicitudes-actividades/actividades/participantes",
        token: accessToken,
        body: payload,
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error en obtenerActividadesPorPeriodo:", response.status, errorText);
        throw new Error(`No se pudo obtener las actividades del período: ${response.status} - ${errorText}`);
    }
    const dto = await response.json();
    return mapActividadesPorPeriodoDTOToResponse(dto);
}

export async function cancelarActividad(accessToken: string, data: actividades.CancelarActividadRequest): Promise<actividades.CancelarActividadResponse> {
    const payload = mapCancelarActividadRequestToPayload(data);
    const response = await apiRequest({ method: "PUT", endpoint: `/solicitudes-actividades/actividades/cancelar`, token: accessToken, body: payload });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error en cancelarActividad:", response.status, errorText);
        throw new Error(`No se pudo cancelar la actividad: ${response.status} - ${errorText}`);
    }
    return await response.json();
}   

export async function modificarActividadFechas(accessToken: string, data: actividades.ModificarActividadFechasRequest): Promise<actividades.ModificarActividadFechasResponse> {
    const payload = mapModificarActividadFechasRequestToPayload(data);
    const response = await apiRequest({ method: "PUT", endpoint: `/solicitudes-actividades/actividades/actualizar-horarios`, token: accessToken, body: payload });
    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error("Error en modificarActividadFechas:", response.status, errorMsg);
        throw new Error(errorMsg);
    }
    return await response.json();
}

export async function obtenerActividadById(accessToken: string, actividadId: number): Promise<actividades.ActividadDetalleResponse> {
    const response = await apiRequest({
        method: "GET",
        endpoint: `/solicitudes-actividades/actividades/${actividadId}`,
        token: accessToken,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error en obtenerActividadById:", response.status, errorText);
        throw new Error(`No se pudo obtener la actividad: ${response.status} - ${errorText}`);
    }

    const dto: actividades.ActividadDetalleDTO = await response.json();
    return mapActividadDTOToDetalle(dto);
}