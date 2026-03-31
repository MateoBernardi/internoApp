import { apiRequest } from '@/shared/apiRequest';
import type { NovedadDTO } from '../dto/NovedadesDTO';
import { mapNovedadDTOToNovedades } from '../mappers/novedadesMapper';
import type { Novedad } from '../models/Novedades';

export async function fetchNovedades(accessToken: string): Promise<Novedad[]> {
    const response = await apiRequest({method: 'GET', endpoint: '/novedades', token: accessToken});

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const data: NovedadDTO[] = await response.json();
    return data.map(mapNovedadDTOToNovedades);
}

export async function crearNovedad(novedadData: Novedad, accessToken: string): Promise<Novedad> {
    const response = await apiRequest({method: 'POST', endpoint: '/novedades', token: accessToken, body: novedadData});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en crearNovedad:', response.status, errorText);
        try {
            const errData = JSON.parse(errorText);
            throw new Error(errData.message || errData.error || errorText);
        } catch (e) {
            if (e instanceof Error && e.message !== errorText) throw e;
            throw new Error(errorText || response.statusText);
        }
    }

    const data: NovedadDTO = await response.json();
    return mapNovedadDTOToNovedades(data);
}

export async function actualizarNovedad(novedadData: Novedad, accessToken: string): Promise<Novedad> {
    const response = await apiRequest({method: 'PUT', endpoint: `/novedades/${novedadData.id}`, token: accessToken, body: novedadData});

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const data: NovedadDTO = await response.json();
    return mapNovedadDTOToNovedades(data);
}

export async function eliminarNovedad(id: number, accessToken: string): Promise<void> {
    const response = await apiRequest({method: 'DELETE', endpoint: `/novedades/${id}`, token: accessToken});

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }
}
