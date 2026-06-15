import { apiRequest } from "@/shared/apiRequest";
import { idempotencyHeaders } from "@/shared/idempotency";
import type { CreateObjetivo, Invitado, Objetivo, UpdateObjetivo } from "../models/Objetivo";

export async function fetchObjetivos(accessToken: string): Promise<Objetivo[]> {
    const response = await apiRequest({ method: 'GET', endpoint: '/kanban', token: accessToken });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || data.error || response.statusText);
    }

    const data: Objetivo[] = await response.json();
    return data;
}

export async function createObjetivo(
    accessToken: string,
    data: CreateObjetivo,
    idempotencyKey?: string
): Promise<Objetivo> {
    const response = await apiRequest({ method: 'POST', endpoint: '/kanban', token: accessToken, body: data, headers: idempotencyHeaders(idempotencyKey) });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    return response.json();
}

export async function updateObjetivo(
    accessToken: string,
    objetivoId: number,
    data: UpdateObjetivo
): Promise<Objetivo> {
    const response = await apiRequest({ method: 'PUT', endpoint: `/kanban/${objetivoId}`, token: accessToken, body: data });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    return response.json();
}

// editObjetivo: edita título o descripción
export async function editObjetivo(
    accessToken: string,
    id: number,
    field: 'titulo' | 'descripcion',
    data: string
): Promise<Objetivo> {

    const response = await apiRequest({
        method: 'PATCH',
        endpoint: `/kanban/${id}?field=${field}`,
        token: accessToken,
        body: {
            [field]: data
        },
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    return response.json();
}

// archivoObjetivo: agrega o elimina archivos
export async function archivoObjetivo(
    accessToken: string,
    id: number,
    action: 'add' | 'remove',
    archivosIds: number[]
): Promise<Objetivo> {
    const response = await apiRequest({
        method: 'PATCH',
        endpoint: `/kanban/${id}/archivos?action=${action}`,
        token: accessToken,
        body: { archivosIds },
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    return response.json();
}

// invitadosObjetivo: agrega o elimina invitados
export async function invitadosObjetivo(
    accessToken: string,
    id: number,
    action: 'add' | 'remove',
    invitados: Invitado[]
): Promise<Objetivo> {
    const response = await apiRequest({
        method: 'PATCH',
        endpoint: `/kanban/${id}/invitados?action=${action}`,
        token: accessToken,
        body: { invitados },
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    return response.json();
}

export async function deleteObjetivo(
    accessToken: string,
    objetivoId: number
): Promise<void> {
    const response = await apiRequest({ method: 'DELETE', endpoint: `/kanban/${objetivoId}`, token: accessToken });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }
}