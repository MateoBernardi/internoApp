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
  /**
   * Id de la entrada de bitácora más reciente ya cargada (o null si todavía
   * no hay ninguna). Señal en vivo, independiente del prop `solicitud`.
   */
  latestBitacoraId?: number | null;
}

/**
 * Marca automáticamente la solicitud como vista cuando corresponde, usando
 * una key para no reenviar el mismo acuse. Compartido por `Solicitud` y
 * `ConversacionChat`. Usa la misma fuente de verdad que los badges
 * (`tieneNovedadSinVer`), así el creador también manda el acuse de lectura.
 *
 * El prop `solicitud` puede quedar congelado mientras la pantalla sigue
 * montada (`Solicitudes.tsx` guarda un snapshot al abrir el chat/solicitud y
 * no lo resincroniza). Si llega una entrada de bitácora nueva por push
 * mientras la pantalla está abierta, `solicitud.seen`/`estado` no cambian
 * aunque haya algo nuevo para acusar — por eso además re-disparamos el acuse
 * cada vez que cambia `latestBitacoraId`, que sí es una señal en vivo.
 */
export function useMarcarVisto({
  solicitud, solicitudId, invitadosSinCreador, marcarVisto, latestBitacoraId = null,
}: UseMarcarVistoParams) {
  const seenAutoMarkKeyRef = useRef<string | null>(null);
  const lastMarkedBitacoraIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (!solicitud) return;

    const huboBitacoraNueva = latestBitacoraId !== null && latestBitacoraId !== lastMarkedBitacoraIdRef.current;

    if (!tieneNovedadSinVer(solicitud) && !huboBitacoraNueva) {
      seenAutoMarkKeyRef.current = null;
      return;
    }

    const key = `${solicitudId}:${solicitud.seen}:${solicitud.estado}:${latestBitacoraId ?? 'none'}`;
    if (seenAutoMarkKeyRef.current === key) return;
    seenAutoMarkKeyRef.current = key;
    lastMarkedBitacoraIdRef.current = latestBitacoraId;

    marcarVisto(
      { solicitud_id: solicitudId },
      { onError: () => { seenAutoMarkKeyRef.current = null; } },
    );
  }, [solicitud, solicitudId, invitadosSinCreador, marcarVisto, latestBitacoraId]);
}
