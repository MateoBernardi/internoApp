import { getArchivosUnseenCount } from '@/features/docs/services/archivosApi';
import { fetchObjetivos } from '@/features/kanban/services/kanbanApi';
import { getReportesPendingCount } from '@/features/reportes/services/reportesApi';
import { getSolicitudesUnseen } from '@/features/solicitudesActividades/services/solicitudesApi';
import {
  getLicenciasUnseenCount,
  getSaldosLicencia,
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

  // Priority 1: home screen data — await these before returning so the UI can render
  const priority1: { name: string; run: () => Promise<unknown> }[] = [
    { name: 'objetivos',         run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.objetivos,         queryFn: () => fetchObjetivos(context.accessToken),           staleTime: 1000 * 45 }) },
    { name: 'solicitudesUnseen', run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.solicitudesUnseen, queryFn: () => getSolicitudesUnseen(context.accessToken),     staleTime: 1000 * 45 }) },
  ];

  const failed: string[] = [];
  for (const task of priority1) {
    try {
      await task.run();
    } catch {
      failed.push(task.name);
    }
  }

  // Priority 2: badge counts and form data — fire in background without blocking render
  const background: { name: string; run: () => Promise<unknown> }[] = [
    { name: 'archivosUnseenCount',  run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.archivosUnseenCount,  queryFn: () => getArchivosUnseenCount(context.accessToken),  staleTime: 1000 * 45 }) },
    { name: 'licenciasUnseenCount', run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.licenciasUnseenCount, queryFn: () => getLicenciasUnseenCount(context.accessToken), staleTime: 1000 * 45 }) },
    { name: 'reportesPendingCount', run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.reportesPendingCount, queryFn: () => getReportesPendingCount(context.accessToken), staleTime: 1000 * 45 }) },
    { name: 'saldosLicencias',      run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.saldosLicencias,      queryFn: () => getSaldosLicencia(context.accessToken),        staleTime: 1000 * 60 }) },
    { name: 'tiposLicencias',       run: () => queryClient.prefetchQuery({ queryKey: RealtimeQueryKeys.tiposLicencias,       queryFn: () => getTiposLicencia(context.accessToken),         staleTime: 1000 * 60 }) },
  ];

  Promise.all(background.map((task) => task.run().catch(() => { failed.push(task.name); }))).then(() => {
    if (failed.length > 0) {
      console.warn('[Prefetch] Some prefetch tasks failed', {
        reason: context.reason ?? 'unspecified',
        failedTasks: failed,
      });
    }
  });
}
