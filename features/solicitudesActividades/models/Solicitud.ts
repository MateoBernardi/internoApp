// Estado de invitación (valores según el backend)
export type EstadoInvitacionDB = 'SENT' | 'SEEN' | 'MODIFIED' | 'MODIFIED_BY_HOST' | 'ACCEPTED_BY_HOST' | 'ACCEPTED' | 'REJECTED' | 'ACTIVIDAD_CREADA' | 'EXPIRED';
export type EstadoInvitacionUI = 'Pendiente' | 'Visto' | 'Modificado' | 'Modificado por creador' |'Aceptado por creador' | 'Aceptado' | 'Rechazado' | 'Actividad creada' | 'Expirada';

// Mapeo de estados de DB a UI
export const estadoInvitacionMapping: Record<EstadoInvitacionDB, EstadoInvitacionUI> = {
  'SENT': 'Pendiente',
  'SEEN': 'Visto',
  'MODIFIED': 'Modificado',
  'MODIFIED_BY_HOST': 'Modificado por creador',
  'ACCEPTED_BY_HOST': 'Aceptado por creador',
  'ACCEPTED': 'Aceptado',
  'REJECTED': 'Rechazado',
  'ACTIVIDAD_CREADA': 'Actividad creada',
  'EXPIRED': 'Expirada'
};

// Mapeo de estados de UI a DB
export const estadoInvitacionReverseMapping: Record<EstadoInvitacionUI, EstadoInvitacionDB> = {
  'Pendiente': 'SENT',
  'Visto': 'SEEN',
  'Modificado': 'MODIFIED',
  'Modificado por creador': 'MODIFIED_BY_HOST',
  'Aceptado por creador': 'ACCEPTED_BY_HOST',
  'Aceptado': 'ACCEPTED',
  'Rechazado': 'REJECTED',
  'Actividad creada': 'ACTIVIDAD_CREADA',
  'Expirada': 'EXPIRED'
};

// Rol en actividad
export type RolActividad = 'host' | 'guest';

// Solicitud
export interface Solicitud {
  solicitud_id: number;
  titulo: string;
  descripcion: string;
  created_by: number;
  fecha_inicio: string | null; // ISO 8601 UTC — null para MANDATOs sin fechas
  fecha_fin: string | null; // ISO 8601 UTC — null para MANDATOs sin fechas
  tipo_actividad?: TipoActividadDB;
  estado: EstadoInvitacionDB; // Estado de la invitación
  nombre: string; // Opcional: nombre del creador de la solicitud
  apellido: string; // Opcional: apellido del creador de la solicitud
}

export interface SolicitudEnviada{
  solicitud_id: number;
  titulo: string;
  descripcion: string;
  created_by: number;
  fecha_inicio: string | null; // ISO 8601 UTC — null para MANDATOs sin fechas
  fecha_fin: string | null; // ISO 8601 UTC — null para MANDATOs sin fechas
  tipo_actividad?: TipoActividadDB;
  estado: EstadoInvitacionDB; // Estado de la invitación
  nombre_creador: string; // Nombre del creador de la solicitud
  apellido_creador: string; // Apellido del creador de la solicitud
  invitado_nombre: string; // Nombre del invitado
  invitado_apellido: string; // Apellido del invitado
}

export interface InvitadoResumen {
  nombre: string;
  apellido: string;
  estado: EstadoInvitacionDB;
}

export interface SolicitudEnviadaAgrupada {
  solicitud_id: number;
  titulo: string;
  descripcion: string;
  created_by: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  tipo_actividad?: TipoActividadDB;
  invitados: InvitadoResumen[];
}

export type TipoActividad = 'PETICION' | 'REUNION';
export type TipoActividadDB = 'MANDATO' | 'REUNION';

export interface CrearSolicitudRequest {
  titulo: string;
  descripcion: string;
  fecha_inicio?: string; // ISO 8601 UTC — obligatorio para REUNION, opcional para MANDATO
  fecha_fin?: string; // ISO 8601 UTC — obligatorio para REUNION, opcional para MANDATO
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

/* ==================== VALIDACIÓN DE FECHAS ==================== */

export interface ValidarFechasRequest {
  fecha_inicio: string; // ISO 8601
  fecha_fin: string; // ISO 8601
  participantes: number[]; // IDs de usuario_entidad
  solicitudIdExcluir?: number; // Excluir esta solicitud de la validación (para modificaciones)
}

export interface RangoOcupado {
  usuario: string;
  tipo: string;
  desde: string;
  hasta: string;
}

export interface ValidarFechasResponse {
  success: boolean;
  avisos: string[];
  rangosOcupados?: RangoOcupado[];
}