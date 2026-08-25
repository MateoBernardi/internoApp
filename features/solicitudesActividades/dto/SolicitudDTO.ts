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
  tipo_actividad?: TipoActividadDB;
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
  ultimo_mensaje?: string | null;
  // Metadatos del último mensaje/entrada de la bitácora, para el preview de las
  // listas (icono/leyenda por tipo, flecha enviado/recibido, hora). Opcionales:
  // se degrada al preview de texto plano si el backend todavía no los envía.
  ultimo_mensaje_tipo?: 'TEXT' | 'FECHA' | 'IMAGEN' | 'ARCHIVO' | 'APROBACION' | 'RECHAZO';
  ultimo_mensaje_at?: BackendDate | null;
  ultimo_mensaje_autor_id?: number | null;
  fecha_inicio: Date;
  fecha_fin: Date;
  created_at: BackendDate;
  nombre_creador: string;
  apellido_creador: string;
  created_by: number;
  id_usuario_invitado?: number;
  invitados: SolicitudInvitadoDTO[]; //Todos los participantes, incluyendo el creador
  tipo_actividad: string;
  estado: string;
  seen?: boolean;
  archivos: ArchivoDTO[];
  isHost: boolean;
  es_grupo?: boolean;
}

export interface SolicitudBitacoraVistoDTO {
  id_usuario: number;
  nombre?: string;
  apellido?: string;
  seen_at: BackendDate;
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
  // Participantes que ya vieron esta entrada. Opcional: el mensaje simplemente
  // no muestra la marca de visto si el backend no lo envía.
  seen_by?: SolicitudBitacoraVistoDTO[];
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