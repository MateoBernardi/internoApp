import { fetchArchivos } from '@/features/docs/services/archivosApi';
import { fetchObjetivos } from '@/features/kanban/services/kanbanApi';
import { fetchReportes } from '@/features/reportes/services/reportesApi';
import {
    getSolicitudesCreadas,
    obtenerMisInvitaciones,
} from '@/features/solicitudesActividades/services/solicitudesApi';
import {
    getSaldosLicencia,
    getSolicitudesLicencias,
    getSolicitudesUsuario,
    getTiposLicencia,
} from '@/features/solicitudesLicencias/services/solicitudesApi';
import { QueryClient } from '@tanstack/react-query';
import { RealtimeQueryKeys } from './querySync';

interface PrefetchContext {
  accessToken: string;
  roleName?: string | null;
  userContextId?: number | string | null;
  reason?: string;
}

function normalizeRole(roleName?: string | null): string {
  return (roleName ?? '').trim().toLowerCase();
}

export async function prefetchCoreRealtimeData(
  queryClient: QueryClient,
  context: PrefetchContext
): Promise<void> {
  if (!context.accessToken) return;

  const role = normalizeRole(context.roleName);
  const userId =
    context.userContextId !== undefined && context.userContextId !== null
      ? String(context.userContextId)
      : undefined;

  if (!userId || !role) {
    return;
  }

  const tasks: Promise<unknown>[] = [];

  tasks.push(
    queryClient.prefetchQuery({
      queryKey: RealtimeQueryKeys.archivosEmpresa,
      queryFn: () => fetchArchivos(context.accessToken),
      staleTime: 1000 * 60,
    })
  );

  tasks.push(
    queryClient.prefetchQuery({
      queryKey: RealtimeQueryKeys.invitaciones,
      queryFn: () => obtenerMisInvitaciones(context.accessToken),
      staleTime: 1000 * 45,
    })
  );

  tasks.push(
    queryClient.prefetchQuery({
      queryKey: RealtimeQueryKeys.solicitudesCreadas,
      queryFn: () => getSolicitudesCreadas(context.accessToken),
      staleTime: 1000 * 45,
    })
  );

  tasks.push(
    queryClient.prefetchQuery({
      queryKey: RealtimeQueryKeys.licenciasAdmin,
      queryFn: () => getSolicitudesLicencias(context.accessToken, {}),
      staleTime: 1000 * 45,
    })
  );

  tasks.push(
    queryClient.prefetchQuery({
      queryKey: RealtimeQueryKeys.licenciasUsuario,
      queryFn: () => getSolicitudesUsuario(context.accessToken),
      staleTime: 1000 * 45,
    })
  );

  if (userId) {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: RealtimeQueryKeys.reportes(userId),
        queryFn: () => fetchReportes(context.accessToken, userId),
        staleTime: 1000 * 45,
      })
    );
  }

  tasks.push(
    queryClient.prefetchQuery({
      queryKey: RealtimeQueryKeys.objetivos,
      queryFn: () => fetchObjetivos(context.accessToken),
      staleTime: 1000 * 45,
    })
  );

  tasks.push(
    queryClient.prefetchQuery({
      queryKey: RealtimeQueryKeys.saldosLicencias,
      queryFn: () => getSaldosLicencia(context.accessToken),
      staleTime: 1000 * 60,
    })
  );

  tasks.push(
    queryClient.prefetchQuery({
      queryKey: RealtimeQueryKeys.tiposLicencias,
      queryFn: () => getTiposLicencia(context.accessToken),
      staleTime: 1000 * 60,
    })
  );

  const results = await Promise.allSettled(tasks);
  const rejected = results.filter((result) => result.status === 'rejected');

  if (rejected.length > 0) {
    console.warn('[Prefetch] Some prefetch tasks failed', {
      reason: context.reason ?? 'unspecified',
      failedTasks: rejected.length,
      totalTasks: results.length,
    });
  } else {
    console.log('[Prefetch] Core realtime prefetch completed', {
      reason: context.reason ?? 'unspecified',
      totalTasks: results.length,
      role,
    });
  }
}
