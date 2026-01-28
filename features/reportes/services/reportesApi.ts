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
    const response = await apiRequest({ method: 'GET', endpoint: `/reportes?query=${usuarioId}`, token: accessToken});

    if (!response.ok) {
        throw new Error(`No se pudo obtener los reportes: ${response.statusText}`);
    }

    const data: reporte.Reporte[] = await response.json();
    return data;
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
    const response = await apiRequest({ method: 'GET', endpoint: `/reportes/stats`, token: accessToken});
    console.log('Response status:', response.status);
    if (!response.ok) {
        throw new Error(`No se pudo obtener las estadísticas de reportes: ${response.statusText}`);
    }

    const data: reporte.ReporteStats[] = await response.json();
    console.log("This came back: ", data);
    return data;
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