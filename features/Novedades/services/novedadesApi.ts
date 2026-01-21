import { apiRequest } from '@/shared/apiRequest';
import type { NovedadDTO } from '../dto/NovedadesDTO';
import { mapNovedadDTOToNovedades } from '../mappers/novedadesMapper';
import type { Novedad } from '../models/Novedades';

export async function fetchNovedades(accessToken: string): Promise<Novedad[]> {
    const response = await apiRequest('GET', '/novedades', accessToken);

    if (!response.ok) {
        throw new Error(`No se pudo obtener las novedades: ${response.statusText}`);
    }

    const data: NovedadDTO[] = await response.json();
    return data.map(mapNovedadDTOToNovedades);
}

export async function crearNovedad(novedadData: Novedad, accessToken: string): Promise<Novedad> {
    const response = await apiRequest('POST', '/novedades', accessToken, novedadData);

    if (!response.ok) {
        throw new Error(`No se pudo crear la novedad: ${response.statusText}`);
    }

    const data: NovedadDTO = await response.json();
    return mapNovedadDTOToNovedades(data);
}

export async function actualizarNovedad(novedadData: Novedad, accessToken: string): Promise<Novedad> {
    const response = await apiRequest('PUT', `/novedades/${novedadData.id}`, accessToken, novedadData);

    if (!response.ok) {
        throw new Error(`No se pudo actualizar: ${response.statusText}`);
    }

    const data: NovedadDTO = await response.json();
    return mapNovedadDTOToNovedades(data);
}

export async function eliminarNovedad(id: number, accessToken: string): Promise<void> {
    const response = await apiRequest('DELETE', `/novedades/${id}`, accessToken);

    if (!response.ok) {
        throw new Error(`No se pudo eliminar: ${response.statusText}`);
    }
}
