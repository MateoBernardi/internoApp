import type { EstadoInvitacionDB, SolicitudEnviada } from './models/Solicitud';

/**
 * Indica si la solicitud tiene una novedad sin ver para el usuario actual.
 *
 * Fuente primaria: `seen`, que el backend calcula con los acuses de lectura
 * (solicitudes_bitacora_vistas). Si el backend todavía no envía el campo, se
 * cae al estado propio, que es la regla que usan `useMarcarVisto` y las
 * versiones anteriores de la app:
 *
 *   - host:     MODIFIED          (un invitado modificó/escribió)
 *   - invitado: SENT              (recién invitado)
 *               MODIFIED_BY_HOST  (el creador respondió)
 *
 * Regla única para todos los badges/dots/realces, tanto en chats como en el
 * resto de los tipos de solicitud.
 */
export function tieneNovedadSinVer(
  solicitud: Pick<SolicitudEnviada, 'estado' | 'is_host' | 'seen'>,
): boolean {
  if (typeof solicitud.seen === 'boolean') {
    return !solicitud.seen;
  }

  const estado = solicitud.estado as EstadoInvitacionDB;
  return solicitud.is_host
    ? estado === 'MODIFIED'
    : estado === 'SENT' || estado === 'MODIFIED_BY_HOST';
}

/**
 * Estado de "visto" para el preview de listas, solo en solicitudes grupales
 * (más de 2 participantes contando al creador). Aproximado: el backend no
 * expone todavía quién vio puntualmente la ÚLTIMA entrada de la bitácora a
 * nivel de listado (esa granularidad por-mensaje solo existe en la bitácora
 * detallada, vía `seen_by`); acá se usa el estado propio de cada invitado
 * -cualquier valor distinto de `SENT` implica que ya abrió la conversación
 * al menos una vez- como aproximación de "vio la conversación".
 *
 * `null` en chats/solicitudes 1 a 1 (no aplica) o si no hay invitados aparte
 * del creador contra quién medir.
 */
export function getGroupSeenState(
  solicitud: Pick<SolicitudEnviada, 'invitados' | 'created_by'>,
): 'all' | 'partial' | null {
  if (solicitud.invitados.length <= 2) return null;

  const otros = solicitud.invitados.filter(inv => inv.user_id !== solicitud.created_by);
  if (otros.length === 0) return null;

  const allSeen = otros.every(inv => !!inv.estado && inv.estado !== 'SENT');
  return allSeen ? 'all' : 'partial';
}
