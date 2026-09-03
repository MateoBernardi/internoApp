import { apiRequest, throwApiError } from '@/shared/apiRequest';

export interface PrefetchBadges {
    solicitudes: number | null;
    documentos: number | null;
    licencias: {
        mine: number | null;
        managed: number | null;
    };
    reportes: {
        mine: number | null;
        managed: number | null;
    };
    errors: string[];
}

/**
 * Un solo request que junta los contadores "sin ver / pendientes" de todos
 * los módulos (ver GET /badges/prefetch en el backend). Cada módulo puede
 * fallar de forma independiente: el backend devuelve `null` para ese campo
 * y un mensaje en `errors`, en vez de tirar todo el response.
 */
export async function fetchPrefetchBadges(accessToken: string, signal?: AbortSignal): Promise<PrefetchBadges> {
    const response = await apiRequest({ method: 'GET', endpoint: '/badges/prefetch', token: accessToken, signal });

    if (!response.ok) {
        const errorText = await response.text();
        throwApiError(errorText, response);
    }

    return response.json();
}
