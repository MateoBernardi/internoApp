import { useAuth } from '@/features/auth/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchPrefetchBadges } from './badgesApi';

export const BADGES_QUERY_KEY = ['badges', 'prefetch'];

/**
 * Contadores "sin ver / pendientes" de todos los módulos en un solo request.
 * Se invalida junto con cada dominio en features/realtime/querySync.ts, así
 * que un push de cualquier módulo también refresca las badges combinadas.
 */
export function usePrefetchBadges(enabled: boolean = true) {
    const { tokens } = useAuth();

    return useQuery({
        queryKey: BADGES_QUERY_KEY,
        queryFn: async ({ signal }) => {
            const token = tokens?.accessToken;
            if (!token) throw new Error('No hay token de acceso');
            return fetchPrefetchBadges(token, signal);
        },
        enabled: enabled && !!tokens?.accessToken,
        staleTime: 1000 * 45,
    });
}
