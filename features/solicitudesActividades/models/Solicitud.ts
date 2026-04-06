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
  fecha_inicio: Date | null;
  fecha_fin: Date | null;
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
  fecha_inicio: Date | null;
  fecha_fin: Date | null;
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
  fecha_inicio: Date | null;
  fecha_fin: Date | null;
  tipo_actividad?: TipoActividadDB;
  invitados: InvitadoResumen[];
}

export type TipoActividad = 'PETICION' | 'REUNION';
export type TipoActividadDB = 'MANDATO' | 'REUNION';

export interface CrearSolicitudRequest {
  titulo: string;
  descripcion: string;
  fecha_inicio?: Date | null;
  fecha_fin?: Date | null;
  tipo_actividad: TipoActividadDB;
  invitados: number[]; // Array de IDs de usuario_entidad
  crear_de_todos_modos?: number;
}

export interface RangoOcupado {
  usuario: string;
  tipo: 'solicitud' | 'actividad' | 'licencia';
  desde: Date;
  hasta: Date;
}

export interface CrearSolicitudResponse {
  success: boolean;
  solicitudId: number | null;
  rangosOcupados?: RangoOcupado[];
}

export interface ActualizarEstadoInvitacionRequest {
  solicitud_id: number;
  estado: EstadoInvitacionDB;
  fecha_inicio_nueva?: Date | null;
  fecha_fin_nueva?: Date | null;
  observacion?: string | null;
}

export interface ActualizarEstadoInvitacionResponse {
  success: boolean;
  rangosOcupados?: RangoOcupado[];
}

export interface UpdateSolicitudRequest {
  solicitud_id: number;
  estado: EstadoInvitacionDB;
  fecha_inicio_nueva?: Date | null;
  fecha_fin_nueva?: Date | null;
  observacion?: string | null;
  crear_de_todos_modos?: number;
}

export interface UpdateSolicitudResponse {
  success: boolean;
  rangosOcupados?: RangoOcupado[];
  mensaje?: string;
}

/* ==================== SOLICITUDES ==================== */

export interface ReenviarSolicitudRequest {
  solicitudId: number;
  nuevosInvitadosIds: number[]; // IDs de usuario_entidad
}

export interface ReenviarSolicitudResponse {
  success: boolean;
}

export interface OcultarSolicitudInvitadoRequest {
  solicitudId: number;
}

export interface OcultarSolicitudInvitadoResponse {
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
  mensaje?: string;
}

export interface BitacoraSolicitud {
  id: number | null;
  solicitud_id?: number;
  fecha_inicio_anterior?: Date;
  fecha_fin_anterior?: Date;
  fecha_inicio_nueva?: Date | null;
  fecha_fin_nueva?: Date | null;
  observacion?: string | null;
  modificado_por?: number;
  modificado_por_nombre?: string;
  modificado_por_apellido?: string;
  fecha_modificacion?: Date;
  created_at: Date;
  usuario_id: number | null;
  usuario_nombre: string;
  usuario_apellido: string;
  estado: EstadoInvitacionDB;
}