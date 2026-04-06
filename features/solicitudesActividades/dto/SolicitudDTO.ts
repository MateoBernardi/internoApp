import type { EstadoInvitacionDB, TipoActividadDB } from '../models/Solicitud';

export type BackendDate = string | Date;

export interface RangoOcupadoDTO {
  usuario: string;
  tipo: 'solicitud' | 'actividad' | 'licencia';
  desde: BackendDate;
  hasta: BackendDate;
}

export interface SolicitudDTO {
  solicitud_id?: number;
  titulo: string;
  descripcion: string;
  created_by?: number;
  fecha_inicio: BackendDate | null;
  fecha_fin: BackendDate | null;
  tipo_actividad: TipoActividadDB;
  invitados: number[];
  estado?: EstadoInvitacionDB | string;
  crear_de_todos_modos: number;
}

export interface CreateSolicitudResult {
  created: boolean;
  solicitudId: number | null;
  rangosOcupados: RangoOcupadoDTO[];
}

export interface UpdateSolicitudResult {
  updated: boolean;
  rangosOcupados: RangoOcupadoDTO[];
}

export interface SolicitudInfoDTO {
  solicitud_id: number;
  titulo: string;
  descripcion: string;
  fecha_inicio: BackendDate | null;
  fecha_fin: BackendDate | null;
  nombre_creador: string;
  apellido_creador: string;
  created_by: number;
  invitado_nombre: string;
  invitado_apellido: string;
  tipo_actividad: TipoActividadDB;
  estado: EstadoInvitacionDB | string;
}

export interface SolicitudBitacoraDTO {
  id?: number;
  solicitud_id?: number;
  fecha_inicio_nueva?: BackendDate | null;
  fecha_fin_nueva?: BackendDate | null;
  observacion?: string | null;
  created_at?: BackendDate;
  usuario_id?: number;
  usuario_nombre?: string;
  usuario_apellido?: string;
  estado: EstadoInvitacionDB | string;
}
