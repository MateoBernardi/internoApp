import { ArchivoDTO } from '@/features/docs/dto/ArchivoDTO';
import type { RolActividad } from '../models/Solicitud';

type BackendDate = string | Date;

export interface CrearActividadDTO {
  titulo: string;
  descripcion: string;
  fecha_inicio: BackendDate;
  fecha_fin?: BackendDate | null;
  solicitud_id?: number;
  participantes?: number[];
}

export interface CrearActividadResultDTO {
  success: boolean;
  id: number;
}

export interface ActividadParticipanteDTO {
  id_usuario_participante: number;
  rol: string;
  nombre: string | null;
  apellido: string | null;
}

export interface ActividadDTO {
  actividad_id?: number;
  id?: number;
  titulo?: string;
  descripcion?: string;
  fecha_inicio: BackendDate;
  fecha_fin?: BackendDate;
  rol?: RolActividad;
  solicitud_id?: number;
}

export interface ActividadDetalleDTO {
  actividad_id: number;
  titulo: string;
  descripcion: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  solicitud_id: number | null;
  participantes: ActividadParticipanteDTO[];
  archivos?: ArchivoDTO[];
}
