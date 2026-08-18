import { useEffect, useRef } from 'react';
import type { SolicitudEnviada, SolicitudInvitado } from '../../models/Solicitud';
import type { useMarcarSolicitudVisto } from '../../viewmodels/useSolicitudes';
import { tieneNovedadSinVer } from '../../badgeState';

type MarcarVistoMutate = ReturnType<typeof useMarcarSolicitudVisto>['mutate'];

interface UseMarcarVistoParams {
  solicitud: SolicitudEnviada;
  solicitudId: number;
  invitadosSinCreador: SolicitudInvitado[];
  marcarVisto: MarcarVistoMutate;
}

/**
 * Marca automáticamente la solicitud como vista cuando corresponde, usando
 * una key para no reenviar el mismo acuse. Compartido por `Solicitud` y
 * `ConversacionChat`. Usa la misma fuente de verdad que los badges
 * (`tieneNovedadSinVer`), así el creador también manda el acuse de lectura.
 */
export function useMarcarVisto({
  solicitud, solicitudId, invitadosSinCreador, marcarVisto,
}: UseMarcarVistoParams) {
  const seenAutoMarkKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!solicitud) return;

    if (!tieneNovedadSinVer(solicitud)) { seenAutoMarkKeyRef.current = null; return; }

    const key = `${solicitudId}:${solicitud.seen}:${solicitud.estado}`;
    if (seenAutoMarkKeyRef.current === key) return;
    seenAutoMarkKeyRef.current = key;

    marcarVisto(
      { solicitud_id: solicitudId },
      { onError: () => { seenAutoMarkKeyRef.current = null; } },
    );
  }, [solicitud, solicitudId, invitadosSinCreador, marcarVisto]);
}
