import { RolActividad } from '../models/Solicitud';

// Actividad
export interface Actividad {
  id: number;
  titulo: string;
  descripcion: string;
  fecha_inicio: string; // ISO 8601 UTC
  fecha_fin: string; // ISO 8601 UTC
  rol: RolActividad;
  prioridad: number; // 1=Alta, 2=Media, 3=Baja
  participantes?: number[]; // IDs de los participantes (usuario_entidad)
  solicitud_id?: number | null; // ID de la solicitud (null si fue creada directamente)
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
  prioridad?: number; // Default: 3
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
  prioridad?: number;
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