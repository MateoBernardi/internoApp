import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createReporte,
    fetchReportes,
    getReporteImagenes,
    getReporteStats,
    getTopEmployee,
    getUpgradedEmployee,
    unlinkReporteImage,
    updateReporte,
    updateReporteImageOrder,
    uploadReporteImage,
} from '../services/reportesApi';

const REPORTES_QUERY_KEY = ['reportes'];
const REPORTES_STATS_QUERY_KEY = ['reportes', 'stats'];
const TOP_EMPLOYEE_QUERY_KEY = ['reportes', 'top-employee'];
const UPGRADED_EMPLOYEE_QUERY_KEY = ['reportes', 'upgraded-employee'];

function normalizeUsuarioId(usuarioId?: string): string | undefined {
    if (typeof usuarioId !== 'string') {
        return undefined;
    }

    const trimmed = usuarioId.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'NaN') {
        return undefined;
    }

    return trimmed;
}

/**
 * Hook para obtener todos los reportes de un usuario en una fecha específica
 */
export function useReportes(usuarioId?: string, enabled: boolean = true) {
    const { tokens } = useAuth();
    const normalizedUsuarioId = normalizeUsuarioId(usuarioId);
    const shouldRunQuery = enabled && (usuarioId === undefined || normalizedUsuarioId !== undefined);
    
    return useQuery({
        queryKey: [...REPORTES_QUERY_KEY, normalizedUsuarioId ?? 'all'],
        enabled: shouldRunQuery,
        queryFn: async () => {
            const token = tokens?.accessToken;
            if (!token) {
                console.error('[useReportes] No hay token de acceso');
                throw new Error('No hay token de acceso');
            }
            const result = await fetchReportes(token, normalizedUsuarioId);
            return result;
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos (antes llamado cacheTime)
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
}

/**
 * Hook para crear un nuevo reporte
 */
export function useCreateReporte() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async (data: any) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return createReporte(token, data);
        },
        onSuccess: (newReporte) => {
            // Actualizar el cache agregando el nuevo reporte
            queryClient.invalidateQueries({ queryKey: REPORTES_QUERY_KEY });
        },
    });
}

/**
 * Hook para actualizar un reporte
 */
export function useUpdateReporte() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();      
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return updateReporte(token, data, id);
        },
        onSuccess: (updatedReporte) => {
            // Invalidar las queries para refrescar los datos
            queryClient.invalidateQueries({ queryKey: REPORTES_QUERY_KEY });
        },
    });
}

/**
 * Hook para obtener las estadísticas de reportes
 */
export function useReporteStats() {
    const { tokens } = useAuth();
    
    return useQuery({
        queryKey: REPORTES_STATS_QUERY_KEY,
        queryFn: async () => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            const result = await getReporteStats(token);
            return result;
        },
        staleTime: 1000 * 60 * 10, // 10 minutos
        gcTime: 1000 * 60 * 20, // 20 minutos
        retry: 2,
    });
}

/**
 * Hook para obtener los mejores empleados
 */
export function useTopEmployee() {
    const { tokens } = useAuth();
    
    return useQuery({
        queryKey: TOP_EMPLOYEE_QUERY_KEY,
        queryFn: async () => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return getTopEmployee(token);
        },
        staleTime: 1000 * 60 * 10, // 10 minutos
        gcTime: 1000 * 60 * 20, // 20 minutos
    });
}

/**
 * Hook para obtener los empleados mejorados
 */
export function useUpgradedEmployee() {
    const { tokens } = useAuth();
    
    return useQuery({
        queryKey: UPGRADED_EMPLOYEE_QUERY_KEY,
        queryFn: async () => {
            const token = tokens?.accessToken;
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return getUpgradedEmployee(token);
        },
        staleTime: 1000 * 60 * 10, // 10 minutos
        gcTime: 1000 * 60 * 20, // 20 minutos
    });
}

// ─── Hooks de Imágenes ────────────────────────────────────────────────────────

const REPORTE_IMAGENES_QUERY_KEY = (reporteId: string | number) =>
    ['reportes', 'imagenes', String(reporteId)];

/**
 * Obtiene las imágenes con metadatos de un reporte (para gestión: delete, reordenar).
 * Solo debería ejecutarse cuando el usuario tiene rol supervisor.
 */
export function useReporteImagenes(reporteId: string | number | undefined) {
    const { tokens } = useAuth();

    return useQuery({
        queryKey: REPORTE_IMAGENES_QUERY_KEY(reporteId ?? ''),
        queryFn: async () => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No hay token de acceso');
            return getReporteImagenes(token, reporteId!);
        },
        enabled: !!reporteId && !!tokens?.accessToken,
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 5,
    });
}

/**
 * Sube una imagen a Cloudflare y la vincula al reporte en un solo request.
 * Invalida la lista de reportes y las imágenes del reporte al completar.
 */
export function useUploadReporteImage() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async ({
            reporteId,
            fileUri,
            fileName,
            mimeType,
            description,
            orden,
        }: {
            reporteId: number | string;
            fileUri: string;
            fileName: string;
            mimeType: string;
            description: string;
            orden: number;
        }) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No hay token de acceso');
            return uploadReporteImage(token, reporteId, fileUri, fileName, mimeType, description, orden);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: REPORTES_QUERY_KEY });
            queryClient.invalidateQueries({
                queryKey: REPORTE_IMAGENES_QUERY_KEY(variables.reporteId),
            });
        },
    });
}

/**
 * Desvincula una imagen de un reporte.
 * Invalida la lista de reportes y las imágenes del reporte al completar.
 */
export function useUnlinkReporteImage() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async ({
            reporteId,
            imageId,
            orden,
        }: {
            reporteId: number | string;
            imageId: number;
            orden: number;
        }) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No hay token de acceso');
            return unlinkReporteImage(token, reporteId, imageId, orden);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: REPORTES_QUERY_KEY });
            queryClient.invalidateQueries({
                queryKey: REPORTE_IMAGENES_QUERY_KEY(variables.reporteId),
            });
        },
    });
}

/**
 * Actualiza el orden de una imagen dentro de un reporte.
 */
export function useUpdateReporteImageOrder() {
    const queryClient = useQueryClient();
    const { tokens } = useAuth();

    return useMutation({
        mutationFn: async ({
            reporteId,
            imageId,
            newOrder,
        }: {
            reporteId: number | string;
            imageId: number;
            newOrder: number;
        }) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No hay token de acceso');
            return updateReporteImageOrder(token, reporteId, imageId, newOrder);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: REPORTE_IMAGENES_QUERY_KEY(variables.reporteId),
            });
        },
    });
}