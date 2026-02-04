import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createReporte,
    fetchReportes,
    getReporteStats,
    getTopEmployee,
    getUpgradedEmployee,
    updateReporte
} from '../services/reportesApi';

const REPORTES_QUERY_KEY = ['reportes'];
const REPORTES_STATS_QUERY_KEY = ['reportes', 'stats'];
const TOP_EMPLOYEE_QUERY_KEY = ['reportes', 'top-employee'];
const UPGRADED_EMPLOYEE_QUERY_KEY = ['reportes', 'upgraded-employee'];

/**
 * Hook para obtener todos los reportes de un usuario en una fecha específica
 */
export function useReportes(usuarioId?: string) {
    const { tokens } = useAuth();
    
    return useQuery({
        queryKey: [...REPORTES_QUERY_KEY, usuarioId],
        queryFn: async () => {
            console.log('[useReportes] Iniciando query con usuarioId:', usuarioId);
            const token = tokens?.accessToken;
            if (!token) {
                console.error('[useReportes] No hay token de acceso');
                throw new Error('No hay token de acceso');
            }
            console.log('[useReportes] Token obtenido, llamando fetchReportes');
            const result = await fetchReportes(token, usuarioId);
            console.log('[useReportes] Datos obtenidos:', result);
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
            console.log('Fetching reporte stats with token');
            const result = await getReporteStats(token);
            console.log('Reporte stats result:', result);
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