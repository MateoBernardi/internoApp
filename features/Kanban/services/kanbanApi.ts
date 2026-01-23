import { apiRequest } from "@/shared/apiRequest";
import type { CreateObjetivoDTO, Objetivo, UpdateObjetivoDTO } from "../models/Objetivo";

export async function fetchObjetivos(accessToken: string): Promise<Objetivo[]> {
    const response = await apiRequest({method: 'GET', endpoint: '/kanban', token: accessToken});

    if (!response.ok) {
        throw new Error(`No se pudo obtener los objetivos: ${response.statusText}`);
    }

    const data: Objetivo[] = await response.json();
    return data;
}

export async function createObjetivo(
    accessToken: string,
    data: CreateObjetivoDTO
): Promise<Objetivo> {
    const response = await apiRequest({method: 'POST', endpoint: '/kanban', token: accessToken, body: data});

    if (!response.ok) {
        throw new Error(`No se pudo crear el objetivo: ${response.statusText}`);
    }

    return response.json();
}

export async function updateObjetivo(
    accessToken: string,
    objetivoId: number,
    data: UpdateObjetivoDTO
): Promise<Objetivo> {
    const response = await apiRequest({method: 'PUT', endpoint: `/kanban/${objetivoId}`, token: accessToken, body: data});

    if (!response.ok) {
        throw new Error(`No se pudo actualizar el objetivo: ${response.statusText}`);
    }

    return response.json();
}

export async function deleteObjetivo(
    accessToken: string,
    objetivoId: number
): Promise<void> {
    const response = await apiRequest({method: 'DELETE', endpoint: `/kanban/${objetivoId}`, token: accessToken});

    if (!response.ok) {
        throw new Error(`No se pudo eliminar el objetivo: ${response.statusText}`);
    }
}