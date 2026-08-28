import { ARCHIVOS_KEYS } from '@/features/docs/viewmodels/useArchivos';
import { getArchivosUnseenCount } from '@/features/docs/services/archivosApi';
import { fetchEncuestas } from '@/features/encuestas/services/encuestasApi';
import { getMisHorarios } from '@/features/horarios/services/horariosService';
import { toISO } from '@/features/horarios/utils/dateRange';
import { horariosUserQueryKeys } from '@/features/horarios/viewmodels/useTurnoScanActivo';
import { OBJETIVOS_QUERY_KEY } from '@/features/kanban/hooks/useObjetivos';
import { fetchObjetivos } from '@/features/kanban/services/kanbanApi';
import { NOVEDADES_KEYS } from '@/features/novedades/viewmodels/useNovedades';
import * as novedadesApi from '@/features/novedades/services/novedadesApi';
import { getReportesPendingCount } from '@/features/reportes/services/reportesApi';
import { getSolicitudesUnseen } from '@/features/solicitudesActividades/services/solicitudesApi';
import { solicitudesQueryKeys } from '@/features/solicitudesActividades/viewmodels/useSolicitudes';
import { getLicenciasUnseenCount } from '@/features/solicitudesLicencias/services/solicitudesApi';
import { canRoleRespondEncuestas, LICENCIAS_UNSEEN_ROLES } from '@/hooks/useRoleCheck';
import { QueryClient } from '@tanstack/react-query';

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

  const today = toISO(new Date());

  const tasks: { name: string; run: () => Promise<unknown> }[] = [
    { name: 'objetivos', run: () => queryClient.prefetchQuery({ queryKey: OBJETIVOS_QUERY_KEY, queryFn: () => fetchObjetivos(context.accessToken) }) },
    { name: 'novedades', run: () => queryClient.prefetchQuery({ queryKey: NOVEDADES_KEYS.all, queryFn: () => novedadesApi.fetchNovedades(context.accessToken) }) },
    { name: 'horariosHoy', run: () => queryClient.prefetchQuery({ queryKey: horariosUserQueryKeys.hoy(today), queryFn: () => getMisHorarios(context.accessToken, today, today) }) },
    { name: 'solicitudesUnseen', run: () => queryClient.prefetchQuery({ queryKey: solicitudesQueryKeys.unseen(), queryFn: () => getSolicitudesUnseen(context.accessToken), staleTime: 1000 * 45 }) },
    { name: 'archivosUnseenCount', run: () => queryClient.prefetchQuery({ queryKey: ARCHIVOS_KEYS.unseenCount(), queryFn: () => getArchivosUnseenCount(context.accessToken), staleTime: 1000 * 45 }) },
    { name: 'reportesPendingCount', run: () => queryClient.prefetchQuery({ queryKey: ['reportes', 'pending-count'], queryFn: () => getReportesPendingCount(context.accessToken), staleTime: 1000 * 45 }) },
  ];

  if (canRoleRespondEncuestas(role)) {
    tasks.push({ name: 'encuestas', run: () => queryClient.prefetchQuery({ queryKey: ['encuestas'], queryFn: () => fetchEncuestas(context.accessToken) }) });
  }

  if (LICENCIAS_UNSEEN_ROLES.some((allowed) => allowed.toLowerCase() === role)) {
    tasks.push({ name: 'licenciasUnseenCount', run: () => queryClient.prefetchQuery({ queryKey: ['solicitudes-licencias', 'unseen-count'], queryFn: () => getLicenciasUnseenCount(context.accessToken), staleTime: 1000 * 45 }) });
  }

  const failed: string[] = [];
  await Promise.all(
    tasks.map((task) =>
      task.run().catch(() => {
        failed.push(task.name);
      })
    )
  );

  if (failed.length > 0) {
    console.warn('[Prefetch] Some prefetch tasks failed', {
      reason: context.reason ?? 'unspecified',
      failedTasks: failed,
    });
  }
}
