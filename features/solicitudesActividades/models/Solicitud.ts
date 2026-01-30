// Estado de invitación (valores según el backend)
export type EstadoInvitacionDB = 'SENT' | 'SEEN' | 'MODIFIED' | 'MODIFIED_BY_HOST' | 'ACCEPTED_BY_HOST' | 'ACCEPTED' | 'REJECTED';
export type EstadoInvitacionUI = 'Pendiente' | 'Visto' | 'Modificado' | 'Modificado por creador' |'Aceptado por creador' | 'Aceptado' | 'Rechazado';

// Mapeo de estados de DB a UI
export const estadoInvitacionMapping: Record<EstadoInvitacionDB, EstadoInvitacionUI> = {
  'SENT': 'Pendiente',
  'SEEN': 'Visto',
  'MODIFIED': 'Modificado',
  'MODIFIED_BY_HOST': 'Modificado por creador',
  'ACCEPTED_BY_HOST': 'Aceptado por creador',
  'ACCEPTED': 'Aceptado',
  'REJECTED': 'Rechazado'
};

// Mapeo de estados de UI a DB
export const estadoInvitacionReverseMapping: Record<EstadoInvitacionUI, EstadoInvitacionDB> = {
  'Pendiente': 'SENT',
  'Visto': 'SEEN',
  'Modificado': 'MODIFIED',
  'Modificado por creador': 'MODIFIED_BY_HOST',
  'Aceptado por creador': 'ACCEPTED_BY_HOST',
  'Aceptado': 'ACCEPTED',
  'Rechazado': 'REJECTED'
};

// Rol en actividad
export type RolActividad = 'host' | 'guest';

// Solicitud
export interface Solicitud {
  solicitud_id: number;
  titulo: string;
  descripcion: string;
  created_by: number;
  fecha_inicio: string; // ISO 8601 UTC
  fecha_fin: string; // ISO 8601 UTC
  estado: EstadoInvitacionDB; // Estado de la invitación
  nombre: string; // Opcional: nombre del creador de la solicitud
  apellido: string; // Opcional: apellido del creador de la solicitud
}

export interface SolicitudEnviada{
  solicitud_id: number;
  titulo: string;
  descripcion: string;
  created_by: number;
  fecha_inicio: string; // ISO 8601 UTC
  fecha_fin: string; // ISO 8601 UTC
  estado: EstadoInvitacionDB; // Estado de la invitación
  creador_nombre: string; // Opcional: nombre del creador de la solicitud
  creador_apellido: string; // Opcional: apellido del creador de la solicitud
  invitado_nombre: string; // Opcional: nombre del creador de la solicitud
  invitado_apellido: string; // Opcional: apellido del creador de la solicitud
}

export type TipoActividad = 'PETICION' | 'REUNION';
export type TipoActividadDB = 'MANDATO' | 'REUNION';

export interface CrearSolicitudRequest {
  titulo: string;
  descripcion: string;
  fecha_inicio: string; // ISO 8601 UTC
  fecha_fin: string; // ISO 8601 UTC
  tipo_actividad: TipoActividadDB;
  invitados: number[]; // Array de IDs de usuario_entidad
}

export interface CrearSolicitudResponse {
  success: boolean;
  solicitudId: number;
}

export interface ActualizarEstadoInvitacionRequest {
  solicitudId: number;
  estado: EstadoInvitacionDB;
  prioridad?: number; // 1=Alta, 2=Media, 3=Baja (requerido al aceptar)
}

export interface ActualizarEstadoInvitacionResponse {
  success: boolean;
}

/* ==================== SOLICITUDES ==================== */

export interface ReenviarSolicitudRequest {
  solicitudId: number;
  nuevosInvitadosIds: number[]; // IDs de usuario_entidad
}

export interface ReenviarSolicitudResponse {
  success: boolean;
}

export interface CancelarActividadRequest {
  actividadId: number;
  motivo?: string;
}

export interface CancelarActividadResponse {
  success: boolean;
  mensaje?: string;
}

/**
 * Cancelar una solicitud existente
 * POST /solicitudes/cancelar
 */
export interface CancelarSolicitudRequest {
  solicitudId: number;
}

export interface CancelarSolicitudResponse {
  success: boolean;
}

export interface ModificarSolicitudFechasRequest {
  solicitudId: number;
  nuevaFechaInicio: string; // ISO 8601 UTC
  nuevaFechaFin: string; // ISO 8601 UTC
  observacion?: string;
}

export interface ModificarSolicitudFechasResponse {
  success: boolean;
  mensaje?: string;
}

export interface BitacoraSolicitud {
  id: number;
  solicitud_id?: number;
  fecha_inicio_anterior?: string;
  fecha_fin_anterior?: string;
  fecha_inicio_nueva?: string | null;
  fecha_fin_nueva?: string | null;
  observacion?: string | null;
  modificado_por?: number;
  modificado_por_nombre?: string;
  modificado_por_apellido?: string;
  fecha_modificacion?: string;
  created_at: string;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  estado: EstadoInvitacionDB;
}