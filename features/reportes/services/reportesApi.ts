import { apiRequest } from '@/shared/apiRequest';
import Constants from 'expo-constants';
import * as reporte from '../models/Reporte';

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL;

export async function createReporte (accessToken: string, payload: reporte.CreateReportePayload): Promise<reporte.Reporte> {
    const response = await apiRequest({  method: 'POST', endpoint: '/reportes', token: accessToken, body: payload});

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error:', { status: response.status, statusText: response.statusText, body: errorText });
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }

    const data: reporte.Reporte = await response.json();
    return data;
}

export async function fetchReportes (accessToken: string, usuarioId?: string): Promise<reporte.Reporte[]> {    
    try {
        const normalizedUsuarioId =
            typeof usuarioId === 'string' &&
            usuarioId.trim() !== '' &&
            usuarioId !== 'undefined' &&
            usuarioId !== 'null' &&
            usuarioId !== 'NaN'
                ? usuarioId.trim()
                : undefined;

        // Compatibilidad: algunos backends esperan `usuarioId` y otros `user_context_id`.
        const endpoint = normalizedUsuarioId
            ? `/reportes?usuarioId=${encodeURIComponent(normalizedUsuarioId)}&user_context_id=${encodeURIComponent(normalizedUsuarioId)}`
            : '/reportes';        
        const response = await apiRequest({ method: 'GET', endpoint: endpoint, token: accessToken});
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[fetchReportes] Error response:', errorText);
            try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
        }

        const data: reporte.Reporte[] = await response.json();
        return data;
    } catch (error) {
        throw error;
    }
}

export async function updateReporte (accessToken: string, payload: reporte.UpdateReportePayload, id: string): Promise<reporte.Reporte> {
    const response = await apiRequest({ method: 'PUT', endpoint: `/reportes/${id}`, token: accessToken, body: payload});

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const data: reporte.Reporte = await response.json();
    return data;
}

export async function getReporteStats (accessToken: string): Promise<reporte.ReporteStats[]> {    
    try {
        const response = await apiRequest({ 
            method: 'GET', 
            endpoint: `/reportes/stats`, 
            token: accessToken
        });
                
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || response.statusText);
        }

        const rawData: any[] = await response.json();
        
        // Mapear los campos de la API a nuestro modelo
        const data: reporte.ReporteStats[] = (rawData || []).map(item => ({
            usuario_id: item.user_context_id || item.usuario_id,
            nombre: item.nombre,
            apellido: item.apellido,
            negativos: item.negativos_puros ?? item.negativos ?? 0,
            positivos: item.positivos_puros ?? item.positivos ?? 0,
            total_positivos: item.total_positivos ?? 0,
            total_negativos: item.total_negativos ?? 0,
            puntos: item.cantidad_neta ?? item.puntos ?? 0,
            zona: (item.zona_alerta || item.zona) as 'rojo' | 'amarillo' | 'verde',
        }));
        
        return data || [];
    } catch (error) {
        throw error;
    }
}

export async function getTopEmployee (accessToken: string): Promise<reporte.TopPositiveUser> {
    const response = await apiRequest({ method: 'GET', endpoint: `/reportes/top-employee`, token: accessToken});

    if (!response.ok) {
        console.error('Error fetching top employee:', { status: response.status, statusText: response.statusText });
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const data: reporte.TopPositiveUser = await response.json();
    return data;
}

export async function getUpgradedEmployee (accessToken: string): Promise<reporte.MostImprovedUser> {
    const response = await apiRequest({ method: 'GET', endpoint: `/reportes/upgraded-employee`, token: accessToken});

    if (!response.ok) {
        console.error('Error fetching upgraded employee:', { status: response.status, statusText: response.statusText });
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    const data: reporte.MostImprovedUser = await response.json();
    return data;
}

// ─── Reportes Imágenes ────────────────────────────────────────────────────────

/**
 * Obtiene las imágenes (con metadatos) asociadas a un reporte.
 * GET /reportesImagenes/:reporte_id
 */
export async function getReporteImagenes (
    accessToken: string,
    reporteId: string | number,
): Promise<reporte.ReporteImagen[]> {
    const response = await apiRequest({
        method: 'GET',
        endpoint: `/reportesImagenes/${reporteId}`,
        token: accessToken,
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    return response.json();
}

/**
 * Sube una imagen a Cloudflare y la vincula al reporte en una sola llamada.
 * POST /reportesImagenes/upload  (multipart/form-data)
 *
 * @param fileUri   URI local del archivo (resultado de expo-document-picker / expo-image-picker)
 * @param fileName  Nombre del archivo (e.g. "foto.jpg")
 * @param mimeType  MIME type (e.g. "image/jpeg")
 */
export async function uploadReporteImage (
    accessToken: string,
    reporteId: number | string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    description: string,
    orden: number,
): Promise<reporte.UploadReporteImageResponse> {
    const formData = new FormData();
    // React Native FormData acepta un objeto con uri para representar archivos locales
    formData.append('file', { uri: fileUri, name: fileName, type: mimeType } as any);
    formData.append('reporteId', String(reporteId));
    formData.append('description', description);
    formData.append('orden', String(orden));

    const response = await fetch(`${API_BASE_URL}/reportesImagenes/upload`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-app-entorno': 'interno',
            // NO establecer Content-Type — fetch lo agrega automáticamente con el boundary correcto
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }

    return response.json();
}

/**
 * Desvincula una imagen de un reporte (y reordena el resto automáticamente).
 * DELETE /reportesImagenes/unlink/:reporte_id/:image_id/:orden
 */
export async function unlinkReporteImage (
    accessToken: string,
    reporteId: number | string,
    imageId: number,
    orden: number,
): Promise<void> {
    const response = await apiRequest({
        method: 'DELETE',
        endpoint: `/reportesImagenes/unlink/${reporteId}/${imageId}/${orden}`,
        token: accessToken,
    });

    if (!response.ok) {
        const errorText = await response.text();
        try { const errData = JSON.parse(errorText); throw new Error(errData.message || errData.error || errorText); } catch (e) { if (e instanceof Error && e.message !== errorText) throw e; throw new Error(errorText || response.statusText); }
    }
}

/**
 * Actualiza el orden de una imagen dentro de un reporte.
 * PUT /reportesImagenes/update-order/:reporte_id/:image_id
 */
export async function updateReporteImageOrder (
    accessToken: string,
    reporteId: number | string,
    imageId: number,
    newOrder: number,
): Promise<reporte.ReporteImagen> {
    const response = await apiRequest({
        method: 'PUT',
        endpoint: `/reportesImagenes/update-order/${reporteId}/${imageId}`,
        token: accessToken,
        body: { newOrder },
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || response.statusText);
    }

    return response.json();
}