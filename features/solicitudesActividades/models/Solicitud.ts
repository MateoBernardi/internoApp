import { ArchivoDTO } from '@/features/docs/dto/ArchivoDTO';
import type { Archivo } from '@/features/docs/models/Archivo';

// Estado de invitación (valores según el backend)
export type EstadoInvitacionDB = 'SENT' | 'SEEN' | 'MODIFIED' | 'MODIFIED_BY_HOST' | 'ACCEPTED_BY_HOST' | 'ACCEPTED' | 'REJECTED' | 'ACTIVIDAD_CREADA' | 'EXPIRED';
export type EstadoInvitacionUI = 'Pendiente' | 'Visto' | 'Modificado' | 'Modificado por creador' | 'Aceptado por creador' | 'Aceptado' | 'Rechazado' | 'Actividad creada' | 'Expirada';

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
  nombre_creador?: string; // Nombre del creador (respuesta backend)
  apellido_creador?: string; // Apellido del creador (respuesta backend)
  id_usuario_invitado?: number;
  nombre_invitado?: string;
  apellido_invitado?: string;
  archivos?: Archivo[];
}

export interface SolicitudEnviada {
  solicitud_id: number;
  titulo: string;
  descripcion: string;
  fecha_inicio: Date | null;
  fecha_fin: Date | null;
  nombre_creador: string;
  apellido_creador: string;
  created_by: number;
  invitados: SolicitudInvitado[]; // todos los participantes, incluye al creador
  tipo_actividad: string;
  estado: string;
  archivos: ArchivoDTO[];
  is_host: boolean;
}

export interface SolicitudInvitado {
  user_id: number;
  invitado_nombre?: string;
  invitado_apellido?: string;
  estado?: EstadoInvitacionDB;
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
  archivos?: Archivo[];
}

export type TipoActividad = 'PETICION' | 'REUNION' | 'CHAT';
export type TipoActividadDB = 'MANDATO' | 'REUNION' | 'CHAT';

export interface CrearSolicitudRequest {
  titulo: string;
  descripcion: string;
  fecha_inicio?: Date | null;
  fecha_fin?: Date | null;
  tipo_actividad: TipoActividadDB;
  invitados: number[]; // Array de IDs de usuario_entidad
  crear_de_todos_modos?: number;
  archivosIds?: number[]; // Array de IDs de archivos adjuntos (opcional)
  enviar_por_separado?: 0 | 1;
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
  solicitudIds?: number[];
  rangosOcupados?: RangoOcupado[];
}

export interface ActualizarEstadoInvitacionRequest {
  solicitud_id: number;
  estado: EstadoInvitacionDB;
  fecha_inicio_nueva?: Date | null;
  fecha_fin_nueva?: Date | null;
  observacion?: string | null;
  crear_de_todos_modos?: number;
  archivosIds?: number[];
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
  archivosIds?: number[];
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

export interface ActualizarInvitadosSolicitudRequest {
  solicitudId: number;
  action: 'add' | 'remove';
  invitados: number[];
}

export interface ActualizarInvitadosSolicitudResponse {
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
  archivos?: Archivo[];
}