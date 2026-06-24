import type { EstadoInvitacionDB, SolicitudEnviada } from './models/Solicitud';

/**
 * Indica si la solicitud tiene una novedad sin ver para el usuario actual,
 * según SU PROPIO estado.
 *
 * Importante: NO se mira el estado agregado de los invitados, porque el backend
 * no actualiza esos estados al marcar SEEN → el badge del host nunca se apagaba.
 * Se usa el estado propio, igual que `useMarcarVisto`, para que badge y visto
 * automático queden alineados.
 *
 *   - host:     MODIFIED          (un invitado modificó/escribió)
 *   - invitado: SENT              (recién invitado)
 *               MODIFIED_BY_HOST  (el creador respondió)
 *
 * Regla única para todos los badges/dots/realces, tanto en chats como en el
 * resto de los tipos de solicitud.
 */
export function tieneNovedadSinVer(
  solicitud: Pick<SolicitudEnviada, 'estado' | 'is_host'>,
): boolean {
  const estado = solicitud.estado as EstadoInvitacionDB;
  return solicitud.is_host
    ? estado === 'MODIFIED'
    : estado === 'SENT' || estado === 'MODIFIED_BY_HOST';
}
