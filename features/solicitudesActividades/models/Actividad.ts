import { RolActividad } from './Solicitud';

// Participante de una actividad (devuelto por el backend)
export interface ParticipanteActividad {
  user_context_id: number;
  nombre: string;
  apellido: string;
  rol: string;
}

// Actividad
export interface Actividad {
  id: number;
  titulo: string;
  descripcion: string;
  fecha_inicio: string; // ISO 8601 UTC
  fecha_fin: string; // ISO 8601 UTC
  rol: RolActividad;
  participantes?: ParticipanteActividad[]; // Participantes con datos completos
  solicitud_id?: number | null; // ID de la solicitud (null si fue creada directamente)
  tipo_actividad?: 'MANDATO' | 'REUNION'; // Tipo de actividad heredado de la solicitud
}

// Licencia
export interface Licencia {
  id: number;
  usuario_id: number;
  tipo_licencia_id: number;
  tipo_licencia_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  cantidad_dias: number;
  created_at: string;
  updated_at: string;
}

export interface AgregarParticipanteRequest {
  actividadId: number;
  rol?: RolActividad; // Default: 'guest'
}

export interface AgregarParticipanteResponse {
  success: boolean;
}

/**
 * Obtener actividades semanales futuras (desde ahora en adelante)
 * GET /actividades/participantes/semanales
 * Devuelve { actividades: Actividad[], licencias: Licencia[] }
 */
export interface ActividadesSemanalesResponse {
  actividades: Actividad[];
  licencias: Licencia[];
}

export interface CrearActividadRequest {
  titulo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  solicitud_id?: number; // Si se provee, vincula la actividad a esa solicitud
  participantes?: number[]; // IDs de participantes (para REUNION: todos los aceptados)
}

export interface CrearActividadResponse {
  success: boolean;
  actividadId: number;
}

export interface CancelarActividadRequest {
  actividadId: number;
  motivo?: string;
}

export interface CancelarActividadResponse {
  success: boolean;
  mensaje?: string;
}

export interface ModificarActividadFechasRequest {
  actividadId: number;
  nuevaFechaInicio: string; // ISO 8601 UTC
  nuevaFechaFin: string; // ISO 8601 UTC
}

export interface ModificarActividadFechasResponse {
  success: boolean;
  mensaje?: string;
}