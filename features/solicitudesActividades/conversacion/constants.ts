import type * as ImagePickerTypes from 'expo-image-picker';
import { EstadoInvitacionDB } from '../models/Solicitud';

/**
 * Constantes y helpers compartidos por las vistas de conversación de una
 * solicitud (`Solicitud` y `ConversacionChat`).
 */

export const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
});

export function formatDateDDMMYYYY(date: Date): string {
  return DATE_FORMATTER.format(date);
}

export function formatTimeHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Hora si es de hoy, fecha corta en caso contrario. Para previews de listas. */
export function formatListTimestamp(date: Date): string {
  const now = new Date();
  const isToday = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  return isToday ? formatTimeHHMM(date) : formatDateDDMMYYYY(date);
}

/** true si ambas fechas caen en el mismo día calendario (hora local). */
export function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/** Etiqueta del separador de día al estilo WhatsApp: "Hoy" / "Ayer" / fecha corta. */
export function formatDayLabel(date: Date): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(date, now)) return 'Hoy';
  if (isSameCalendarDay(date, yesterday)) return 'Ayer';
  return formatDateDDMMYYYY(date);
}

export type UltimoMensajeTipo = 'TEXT' | 'FECHA' | 'IMAGEN' | 'ARCHIVO' | 'APROBACION' | 'RECHAZO';

/**
 * Icono + leyenda para el preview de listas cuando la última entrada de la
 * bitácora no es texto plano (cambio de fechas, imagen, archivo, aprobación,
 * rechazo). `null` para `TEXT` o cuando el backend todavía no manda
 * `ultimo_mensaje_tipo`.
 */
export function getUltimoMensajePreview(
  tipo: UltimoMensajeTipo | undefined,
): { icon: string; legend: string } | null {
  switch (tipo) {
    case 'FECHA': return { icon: 'calendar-outline', legend: 'Propuso un cambio de fechas' };
    case 'IMAGEN': return { icon: 'image-outline', legend: 'Envió una imagen' };
    case 'ARCHIVO': return { icon: 'document-attach-outline', legend: 'Envió un archivo' };
    case 'APROBACION': return { icon: 'checkmark-circle-outline', legend: 'Aprobó la solicitud' };
    case 'RECHAZO': return { icon: 'close-circle-outline', legend: 'Rechazó la solicitud' };
    default: return null;
  }
}

/**
 * Nombre para mostrar como autor del último mensaje en el preview de listas
 * ("Vos" si lo mandó el usuario actual). `null` si no hay autor informado o no
 * se lo puede resolver contra la lista de invitados (self-heals cuando el
 * backend no manda `ultimo_mensaje_autor_id`).
 */
export function getUltimoMensajeAutorLabel(
  autorId: number | null | undefined,
  currentUserId: number | undefined,
  invitados: { user_id: number; invitado_nombre?: string; invitado_apellido?: string }[],
): string | null {
  if (autorId == null) return null;
  if (currentUserId != null && autorId === currentUserId) return 'Vos';
  const autor = invitados.find(inv => inv.user_id === autorId);
  if (!autor) return null;
  const nombre = [autor.invitado_nombre, autor.invitado_apellido].filter(Boolean).join(' ').trim();
  return nombre || null;
}

export interface UltimoMensajePreviewLinea {
  icon: string | null;
  text: string;
}

/**
 * Arma la línea de preview de listas (chats y solicitudes) para la última
 * entrada: autor + leyenda del tipo (cambio de fechas / archivo / imagen /
 * aprobación / rechazo) + el mensaje real, si vino uno adjunto a esa entrada
 * (p. ej. "Propuso un cambio de fechas — Che, ¿puede ser más tarde?"). Si no
 * hay tipo ni mensaje ni descripción, cae al rango de fechas propio de la
 * solicitud (reunión recién creada, todavía sin bitácora) en vez de dejar la
 * línea vacía. Devuelve `null` cuando no hay nada para mostrar.
 */
export function buildUltimoMensajePreview(solicitud: {
  ultimo_mensaje_tipo?: UltimoMensajeTipo;
  ultimo_mensaje: string | null;
  ultimo_mensaje_autor_id?: number | null;
  descripcion: string;
  es_grupo: boolean;
  invitados: { user_id: number; invitado_nombre?: string; invitado_apellido?: string }[];
  fecha_inicio: Date | null;
  fecha_fin: Date | null;
}, currentUserId: number | undefined): UltimoMensajePreviewLinea | null {
  const typePreview = getUltimoMensajePreview(solicitud.ultimo_mensaje_tipo);
  const rawMessage = solicitud.ultimo_mensaje?.trim() || '';

  let body: string | null = null;
  let icon: string | null = null;

  if (solicitud.ultimo_mensaje_tipo === 'FECHA' && solicitud.fecha_inicio && solicitud.fecha_fin) {
    const fechasLabel = `Fechas: ${formatDateDDMMYYYY(solicitud.fecha_inicio)} ${formatTimeHHMM(solicitud.fecha_inicio)} → ${formatDateDDMMYYYY(solicitud.fecha_fin)} ${formatTimeHHMM(solicitud.fecha_fin)}`;
    body = rawMessage ? `${fechasLabel} — ${rawMessage}` : fechasLabel;
    icon = 'calendar-outline';
  } else if (typePreview) {
    body = rawMessage ? `${typePreview.legend} — ${rawMessage}` : typePreview.legend;
    icon = typePreview.icon;
  } else if (rawMessage) {
    body = rawMessage;
  } else if (solicitud.descripcion.trim()) {
    body = solicitud.descripcion.trim();
  } else if (solicitud.fecha_inicio && solicitud.fecha_fin) {
    body = `Fechas: ${formatDateDDMMYYYY(solicitud.fecha_inicio)} ${formatTimeHHMM(solicitud.fecha_inicio)} → ${formatDateDDMMYYYY(solicitud.fecha_fin)} ${formatTimeHHMM(solicitud.fecha_fin)}`;
    icon = 'calendar-outline';
  }

  if (!body) return null;

  // Cambios de fecha muestran quién los propuso siempre (no solo en grupos):
  // sin autor, "Propuso un cambio de fechas" es ambiguo para cualquiera de
  // los dos participantes de un 1 a 1.
  const showAutor = solicitud.es_grupo || solicitud.ultimo_mensaje_tipo === 'FECHA';
  const autorLabel = showAutor
    ? getUltimoMensajeAutorLabel(solicitud.ultimo_mensaje_autor_id, currentUserId, solicitud.invitados)
    : null;

  return { icon, text: autorLabel ? `${autorLabel}: ${body}` : body };
}

// Estados que representan mensajes/cambios relevantes en la conversación.
export const MESSAGE_STATES: EstadoInvitacionDB[] = [
  'MODIFIED', 'MODIFIED_BY_HOST', 'ACCEPTED', 'REJECTED', 'ACCEPTED_BY_HOST',
];

// expo-image-picker se carga de forma perezosa: en algunos entornos (web/SSR)
// el módulo nativo no está disponible y `require` lanza.
let ImagePicker: typeof ImagePickerTypes | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  console.warn('expo-image-picker not available.');
}

export { ImagePicker };
