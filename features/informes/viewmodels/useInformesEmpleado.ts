import { useAuth } from '@/features/auth/context/AuthContext';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { InformeResumen } from '../dto/InformeDTO';
import * as api from '../services/informesApi';
import { informesKeys } from './keys';

/** Informes donde se mencionó al empleado (vista de management; el backend valida el rol). */
export function useInformesEmpleado(empleadoId: number): {
  informes: InformeResumen[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
} {
  const { tokens } = useAuth();
  const token = tokens?.accessToken;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const query = useInfiniteQuery({
    queryKey: informesKeys.empleado(empleadoId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      if (!token) throw new Error('No hay token de acceso');
      return api.listarInformesDeEmpleado(token, empleadoId, pageParam, signal);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!token && empleadoId > 0,
  });

  const { refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const loadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    await fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    informes: query.data?.pages.flatMap((p) => p.informes) ?? [],
    isLoading: query.isLoading,
    isRefreshing,
    error: query.error ? query.error.message : null,
    refresh,
    loadMore,
    hasMore: !!hasNextPage,
  };
}
