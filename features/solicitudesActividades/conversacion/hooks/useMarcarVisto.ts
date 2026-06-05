import { useEffect, useRef } from 'react';
import type { SolicitudEnviada, SolicitudInvitado } from '../../models/Solicitud';
import type { useActualizarEstadoInvitacion } from '../../viewmodels/useSolicitudes';

type ActualizarEstadoMutate = ReturnType<typeof useActualizarEstadoInvitacion>['mutate'];

interface UseMarcarVistoParams {
  solicitud: SolicitudEnviada;
  solicitudId: number;
  isHost: boolean;
  invitadosSinCreador: SolicitudInvitado[];
  actualizarEstado: ActualizarEstadoMutate;
}

/**
 * Marca automáticamente la solicitud como "vista" (SEEN) cuando corresponde,
 * usando una key para no reenviar el mismo estado. Compartido por `Solicitud`
 * y `ConversacionChat`.
 */
export function useMarcarVisto({
  solicitud, solicitudId, isHost, invitadosSinCreador, actualizarEstado,
}: UseMarcarVistoParams) {
  const seenAutoMarkKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!solicitud) return;
    const hasModifiedInvitados = invitadosSinCreador.some(inv => inv.estado === 'MODIFIED');
    const shouldMarkSeen = isHost
      ? hasModifiedInvitados
      : ['SENT', 'MODIFIED_BY_HOST', 'ACCEPTED_BY_HOST'].includes(solicitud.estado);

    if (!shouldMarkSeen) { seenAutoMarkKeyRef.current = null; return; }

    const key = isHost
      ? `${solicitudId}:host:${hasModifiedInvitados}`
      : `${solicitudId}:${solicitud.estado}`;
    if (seenAutoMarkKeyRef.current === key) return;
    seenAutoMarkKeyRef.current = key;

    actualizarEstado(
      { solicitud_id: solicitudId, estado: 'SEEN' },
      { onError: () => { seenAutoMarkKeyRef.current = null; } },
    );
  }, [solicitud, solicitudId, isHost, invitadosSinCreador, actualizarEstado]);
}
