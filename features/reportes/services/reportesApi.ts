import { apiRequest } from '@/shared/apiRequest';
import * as reporte from '../models/Reporte';

export async function createReporte (accessToken: string, payload: reporte.CreateReportePayload): Promise<reporte.Reporte> {
    const response = await apiRequest({  method: 'POST', endpoint: '/reportes', token: accessToken, body: JSON.stringify(payload)});

    if (!response.ok) {
        throw new Error(`No se pudo crear el reporte: ${response.statusText}`);
    }

    const data: reporte.Reporte = await response.json();
    return data;
}

export async function fetchReportes (accessToken: string, usuarioId?: string): Promise<reporte.Reporte[]> {
    console.log('[fetchReportes] Iniciando con usuarioId:', usuarioId);
    
    try {
        // Si hay usuarioId, agregarlo como parámetro de query
        const endpoint = usuarioId ? `/reportes?usuarioId=${usuarioId}` : '/reportes';
        console.log('[fetchReportes] Endpoint construido:', endpoint);
        
        const response = await apiRequest({ method: 'GET', endpoint: endpoint, token: accessToken});

        console.log('[fetchReportes] Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[fetchReportes] Error response:', errorText);
            throw new Error(`No se pudo obtener los reportes: ${response.statusText}`);
        }

        const data: reporte.Reporte[] = await response.json();
        console.log('[fetchReportes] Data received:', data);
        return data;
    } catch (error) {
        console.error('[fetchReportes] Error caught:', error);
        throw error;
    }
}

export async function updateReporte (accessToken: string, payload: reporte.UpdateReportePayload, id: string): Promise<reporte.Reporte> {
    const response = await apiRequest({ method: 'PUT', endpoint: `/reportes/${id}`, token: accessToken, body: JSON.stringify(payload)});

    if (!response.ok) {
        throw new Error(`No se pudo actualizar el reporte: ${response.statusText}`);
    }

    const data: reporte.Reporte = await response.json();
    return data;
}

export async function getReporteStats (accessToken: string): Promise<reporte.ReporteStats[]> {
    console.log('[getReporteStats] Iniciando solicitud con token:', !!accessToken);
    
    try {
        const response = await apiRequest({ 
            method: 'GET', 
            endpoint: `/reportes/stats`, 
            token: accessToken
        });
        
        console.log('[getReporteStats] Response status:', response.status);
        console.log('[getReporteStats] Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[getReporteStats] Error response:', errorText);
            throw new Error(`No se pudo obtener las estadísticas de reportes: ${response.statusText}`);
        }

        const rawData: any[] = await response.json();
        console.log('[getReporteStats] Raw data received:', rawData, 'Total items:', rawData?.length);
        
        // Mapear los campos de la API a nuestro modelo
        const data: reporte.ReporteStats[] = (rawData || []).map(item => ({
            usuario_id: item.user_context_id || item.usuario_id,
            nombre: item.nombre,
            apellido: item.apellido,
            negativos: item.negativos_puros ?? item.negativos ?? 0,
            positivos: item.positivos_puros ?? item.positivos ?? 0,
            puntos: item.cantidad_neta ?? item.puntos ?? 0,
            zona: (item.zona_alerta || item.zona) as 'rojo' | 'amarillo' | 'verde',
        }));
        
        console.log('[getReporteStats] Mapped data:', data);
        return data || [];
    } catch (error) {
        console.error('[getReporteStats] Error caught:', error);
        throw error;
    }
}

export async function getTopEmployee (accessToken: string): Promise<reporte.ReporteStats[]> {
    const response = await apiRequest({ method: 'GET', endpoint: `/reportes/top-employee`, token: accessToken});

    if (!response.ok) {
        throw new Error(`No se pudo obtener los mejores empleados: ${response.statusText}`);
    }

    const data: reporte.ReporteStats[] = await response.json();
    return data;
}

export async function getUpgradedEmployee (accessToken: string): Promise<reporte.ReporteStats[]> {
    const response = await apiRequest({ method: 'GET', endpoint: `/reportes/upgraded-employee`, token: accessToken});

    if (!response.ok) {
        throw new Error(`No se pudo obtener los empleados mejorados: ${response.statusText}`);
    }

    const data: reporte.ReporteStats[] = await response.json();
    return data;
}