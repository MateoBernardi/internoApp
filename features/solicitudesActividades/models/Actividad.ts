import type {
    ActividadDetalleDTO as ActividadDetalleDtoType,
    ActividadDTO as ActividadDtoType,
    ActividadParticipanteDTO as ActividadParticipanteDtoType,
    CrearActividadDTO,
    CrearActividadResultDTO,
} from '../dto/ActividadDTO';
import type { RangoOcupado } from './Solicitud';
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
  fecha_inicio: Date;
  fecha_fin?: Date | null;
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
  fecha_inicio: Date;
  fecha_fin: Date;
  cantidad_dias: number;
  created_at: Date;
  updated_at: Date;
}

export interface AgregarParticipanteRequest {
  id: number;
  rol?: RolActividad; // Default: 'guest'
}

export interface AgregarParticipanteResponse {
  success: boolean;
}

export interface ObtenerActividadesPorPeriodoRequest {
  fechaInicio: Date;
  fechaFin: Date;
}

export interface ActividadesPorPeriodoResponse {
  actividades: Actividad[];
  licencias: Licencia[];
}

// Alias temporal para compatibilidad con código existente.
export type ActividadesSemanalesResponse = ActividadesPorPeriodoResponse;

export interface CrearActividadRequest {
  titulo: string;
  descripcion: string;
  fecha_inicio: Date;
  fecha_fin?: Date;
  solicitud_id?: number; // Si se provee, vincula la actividad a esa solicitud
  participantes?: number[]; // IDs de participantes (para REUNION: todos los aceptados)
}

export interface CrearActividadResponse {
  success: boolean;
  id: number;
  rangosOcupados?: RangoOcupado[];
  mensaje?: string;
}

// DTO aliases para mantener compatibilidad en imports existentes.
export type ActividadDTO = ActividadDtoType;
export type ActividadDetalleDTO = ActividadDetalleDtoType;
export type ActividadParticipanteDTO = ActividadParticipanteDtoType;
export type CrearActividadPayloadDTO = CrearActividadDTO;
export type CrearActividadResponseDTO = CrearActividadResultDTO;

export interface CancelarActividadRequest {
  actividad_id?: number;
  id?: number;
  motivo?: string;
}

export interface CancelarActividadResponse {
  success: boolean;
  mensaje?: string;
}

export interface ModificarActividadFechasRequest {
  actividad_id: number;
  fecha_inicio: Date;
  fecha_fin?: Date;
}

export interface ModificarActividadFechasResponse {
  success: boolean;
  mensaje?: string;
  rangosOcupados?: RangoOcupado[];
}

export interface ActividadDetalleParticipante {
  rol: string;
  nombre: string;
  apellido: string;
}

export interface ActividadDetalleResponse {
  id: number;
  titulo: string;
  descripcion: string;
  fecha_inicio: Date;
  fecha_fin?: Date | null;
  rol?: RolActividad;
  solicitud_id?: number;
  participantes: ActividadDetalleParticipante[];
}