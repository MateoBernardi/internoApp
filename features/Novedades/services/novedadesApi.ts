import Constants from "expo-constants";
import type { NovedadDTO } from '../dto/NovedadesDTO';
import { mapNovedadDTOToNovedades } from '../mappers/novedadesMapper';
import type { Novedad } from '../models/Novedades';

const baseUrl = Constants.expoConfig?.extra?.API_BASE_URL;

export async function fetchNovedades(
  apiRequest: (url: string, options?: RequestInit) => Promise<Response>
): Promise<Novedad[]> {
    const response = await apiRequest('/novedades', {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(`No se pudo obtener las novedades: ${response.statusText}`);
    }

    const data: NovedadDTO[] = await response.json();
    return data.map(mapNovedadDTOToNovedades);
}

export async function crearNovedad(novedadData: Novedad,
  apiRequest: (url: string, options?: RequestInit) => Promise<Response>
): Promise<Novedad> {
    const response = await apiRequest('/novedades', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(novedadData),
    });

    if (!response.ok) {
        throw new Error(`No se pudo crear la novedad: ${response.statusText}`);
    }

    const data: NovedadDTO = await response.json();
    return mapNovedadDTOToNovedades(data);
}

export async function actualizarNovedad(
  novedadData: Novedad,
  apiRequest: (url: string, options?: RequestInit) => Promise<Response>
): Promise<Novedad> {
    const response = await apiRequest(`/novedades/${novedadData.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(novedadData),
    });

    if (!response.ok) {
        throw new Error(`No se pudo actualizar: ${response.statusText}`);
    }

    const data: NovedadDTO = await response.json();
    return mapNovedadDTOToNovedades(data);
}

export async function eliminarNovedad(
  id: number,
  apiRequest: (url: string, options?: RequestInit) => Promise<Response>
): Promise<void> {
    const response = await apiRequest(`/novedades/${id}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error(`No se pudo eliminar: ${response.statusText}`);
    }
}