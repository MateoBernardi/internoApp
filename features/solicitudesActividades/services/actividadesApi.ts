import { apiRequest } from "@/shared/apiRequest";
import * as actividades from "../models/Actividad";

export async function createActividad(accessToken: string, data: actividades.CrearActividadRequest): Promise<actividades.CrearActividadResponse> {
    const response = await apiRequest({ method: "PUT", endpoint: "/solicitudes-actividades/actividades/crear", token: accessToken, body: data });    
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error en createActividad:", response.status, errorText);
        throw new Error(`No se pudo crear la actividad: ${response.status} - ${errorText}`);
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

export async function obtenerActividadesSemanaAnterior(accessToken: string): Promise<actividades.ActividadesSemanalesResponse> {
    const response = await apiRequest({ method: "GET", endpoint: "/solicitudes-actividades/actividades/participantes/semana-anterior", token: accessToken });
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error en obtenerActividadesSemanaAnterior:", response.status, errorText);
        throw new Error(`No se pudo obtener las actividades de la semana anterior: ${response.status} - ${errorText}`);
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