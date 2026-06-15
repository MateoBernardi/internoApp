import type { ArchivoDTO } from '@/features/docs/dto/ArchivoDTO';
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
  archivosIds?: number[];
  enviar_por_separado?: 0 | 1;
  es_grupo?: boolean;
}

export interface CreateSolicitudResult {
  created: boolean;
  solicitudId: number | null;
  solicitudIds?: number[];
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
  fecha_inicio: Date;
  fecha_fin: Date;
  nombre_creador: string;
  apellido_creador: string;
  created_by: number;
  id_usuario_invitado?: number;
  invitados: SolicitudInvitadoDTO[]; //Todos los participantes, incluyendo el creador
  tipo_actividad: string;
  estado: string;
  archivos: ArchivoDTO[];
  isHost: boolean;
  es_grupo?: boolean;
}

export interface SolicitudBitacoraDTO {
  id?: number;
  solicitud_id?: number;
  fecha_inicio_nueva?: BackendDate | null;
  fecha_fin_nueva?: BackendDate | null;
  observacion?: string;
  created_at?: BackendDate;
  usuario_id?: number;
  usuario_nombre?: string;
  usuario_apellido?: string;
  archivos?: ArchivoDTO[];
  estado: EstadoInvitacionDB | string;
}

export interface SolicitudInvitadoDTO {
  user_id?: number;
  id_usuario_invitado?: number;
  nombre?: string;
  apellido?: string;
  invitado_nombre?: string;
  invitado_apellido?: string;
  estado?: string;
}