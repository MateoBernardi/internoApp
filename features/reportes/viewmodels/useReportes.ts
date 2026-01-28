import { useAuth } from '@/features/auth/hooks/useAuthActions';
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
    const { getValidAccessToken } = useAuth();
    
    return useQuery({
        queryKey: [...REPORTES_QUERY_KEY, usuarioId],
        queryFn: async () => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return fetchReportes(token, usuarioId);
        },
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 10, // 10 minutos (antes llamado cacheTime)
    });
}

/**
 * Hook para crear un nuevo reporte
 */
export function useCreateReporte() {
    const queryClient = useQueryClient();
    const { getValidAccessToken } = useAuth();

    return useMutation({
        mutationFn: async (data: any) => {
            const token = await getValidAccessToken();
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
    const { getValidAccessToken } = useAuth();      
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const token = await getValidAccessToken();
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
    const { getValidAccessToken } = useAuth();
    
    return useQuery({
        queryKey: REPORTES_STATS_QUERY_KEY,
        queryFn: async () => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return getReporteStats(token);
        },
        staleTime: 1000 * 60 * 10, // 10 minutos
        gcTime: 1000 * 60 * 20, // 20 minutos
    });
}

/**
 * Hook para obtener los mejores empleados
 */
export function useTopEmployee() {
    const { getValidAccessToken } = useAuth();
    
    return useQuery({
        queryKey: TOP_EMPLOYEE_QUERY_KEY,
        queryFn: async () => {
            const token = await getValidAccessToken();
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
    const { getValidAccessToken } = useAuth();
    
    return useQuery({
        queryKey: UPGRADED_EMPLOYEE_QUERY_KEY,
        queryFn: async () => {
            const token = await getValidAccessToken();
            if (!token) {
                throw new Error('No hay token de acceso');
            }
            return getUpgradedEmployee(token);
        },
        staleTime: 1000 * 60 * 10, // 10 minutos
        gcTime: 1000 * 60 * 20, // 20 minutos
    });
}