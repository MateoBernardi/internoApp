import { fetchArchivos } from '@/features/docs/services/archivosApi';
import { fetchObjetivos } from '@/features/kanban/services/kanbanApi';
import { fetchReportes } from '@/features/reportes/services/reportesApi';
import { getSolicitudesUnseen } from '@/features/solicitudesActividades/services/solicitudesApi';
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

  const orderedTasks: { name: string; run: () => Promise<unknown> }[] = [
    // --- Priority 1: initial screen ---
    { name: 'solicitudesUnseen', run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.solicitudesUnseen, queryFn: () => getSolicitudesUnseen(context.accessToken), staleTime: 1000 * 45 }) },
    { name: 'archivosEmpresa',   run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.archivosEmpresa,   queryFn: () => fetchArchivos(context.accessToken),             staleTime: 1000 * 60 }) },
    // --- Priority 2: deferred ---
    { name: 'licenciasAdmin',    run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.licenciasAdmin,    queryFn: () => getSolicitudesLicencias(context.accessToken, {}), staleTime: 1000 * 45 }) },
    { name: 'licenciasUsuario',  run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.licenciasUsuario,  queryFn: () => getSolicitudesUsuario(context.accessToken),       staleTime: 1000 * 45 }) },
    ...(userId ? [{ name: 'reportes', run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.reportes(userId), queryFn: () => fetchReportes(context.accessToken, userId), staleTime: 1000 * 45 }) }] : []),
    { name: 'objetivos',         run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.objetivos,         queryFn: () => fetchObjetivos(context.accessToken),             staleTime: 1000 * 45 }) },
    { name: 'saldosLicencias',   run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.saldosLicencias,   queryFn: () => getSaldosLicencia(context.accessToken),          staleTime: 1000 * 60 }) },
    { name: 'tiposLicencias',    run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.tiposLicencias,    queryFn: () => getTiposLicencia(context.accessToken),           staleTime: 1000 * 60 }) },
  ];

  const failed: string[] = [];
  for (const task of orderedTasks) {
    try {
      await task.run();
    } catch {
      failed.push(task.name);
    }
  }

  if (failed.length > 0) {
    console.warn('[Prefetch] Some prefetch tasks failed', {
      reason: context.reason ?? 'unspecified',
      failedTasks: failed,
      totalTasks: orderedTasks.length,
    });
  }
}
