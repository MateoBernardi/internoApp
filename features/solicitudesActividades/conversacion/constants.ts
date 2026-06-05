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
