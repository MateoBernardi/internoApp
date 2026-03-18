import { apiRequest } from "@/shared/apiRequest";
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
    const response = await apiRequest({ method: "PUT", endpoint: "/solicitudes-actividades/actividades/crear", token: accessToken, body: data });    
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

export async function obtenerActividadesSemanales(accessToken: string): Promise<actividades.ActividadesSemanalesResponse> {
    const response = await apiRequest({ method: "GET", endpoint: "/solicitudes-actividades/actividades/participantes/semanales", token: accessToken });    
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error en obtenerActividadesSemanales:", response.status, errorText);
        throw new Error(`No se pudo obtener las actividades semanales: ${response.status} - ${errorText}`);
    }
    return await response.json();
}

export async function cancelarActividad(accessToken: string, data: actividades.CancelarActividadRequest): Promise<actividades.CancelarActividadResponse> {
    const response = await apiRequest({ method: "PUT", endpoint: `/solicitudes-actividades/actividades/cancelar`, token: accessToken, body: data });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error en cancelarActividad:", response.status, errorText);
        throw new Error(`No se pudo cancelar la actividad: ${response.status} - ${errorText}`);
    }
    return await response.json();
}   

export async function modificarActividadFechas(accessToken: string, data: actividades.ModificarActividadFechasRequest): Promise<actividades.ModificarActividadFechasResponse> {
    const response = await apiRequest({ method: "PUT", endpoint: `/solicitudes-actividades/actividades/actualizar-horarios`, token: accessToken, body: data });
    if (!response.ok) {
        const errorMsg = await extractErrorText(response);
        console.error("Error en modificarActividadFechas:", response.status, errorMsg);
        throw new Error(errorMsg);
    }
    return await response.json();
}