import { mapArchivoDTOToArchivo } from '@/features/docs/mappers/archivoMapper';
import type {
  CreateSolicitudResult,
  RangoOcupadoDTO,
  SolicitudBitacoraDTO,
  SolicitudDTO,
  SolicitudInfoDTO,
  UpdateSolicitudResult,
} from '../dto/SolicitudDTO';
import type {
  BitacoraSolicitud,
  CrearSolicitudRequest,
  CrearSolicitudResponse,
  EstadoInvitacionDB,
  RangoOcupado,
  SolicitudEnviada,
  UpdateSolicitudRequest,
  UpdateSolicitudResponse
} from '../models/Solicitud';
import { parseBackendDate, toIsoDate, toIsoDateOrNull } from './dateMapper';

const ESTADOS_VALIDOS = new Set<EstadoInvitacionDB>([
  'SENT',
  'SEEN',
  'MODIFIED',
  'MODIFIED_BY_HOST',
  'ACCEPTED_BY_HOST',
  'ACCEPTED',
  'REJECTED',
  'ACTIVIDAD_CREADA',
  'EXPIRED',
]);

function normalizeEstado(value: string | EstadoInvitacionDB | undefined): EstadoInvitacionDB {
  if (value && ESTADOS_VALIDOS.has(value as EstadoInvitacionDB)) {
    return value as EstadoInvitacionDB;
  }

  return 'SENT';
}

export function mapRangoOcupadoDTOToRangoOcupado(dto: RangoOcupadoDTO): RangoOcupado {
  const desde = parseBackendDate(dto.desde);
  const hasta = parseBackendDate(dto.hasta);
  const tipo = dto.tipo === 'actividad' || dto.tipo === 'licencia' || dto.tipo === 'solicitud'
    ? dto.tipo
    : 'solicitud';

  return {
    usuario: dto.usuario,
    tipo,
    desde: desde ?? new Date(0),
    hasta: hasta ?? new Date(0),
  };
}

export const mapSolicitudInfoDTOToSolicitudEnviada = (dto: SolicitudInfoDTO): SolicitudEnviada => ({
  solicitud_id: dto.solicitud_id,
  titulo: dto.titulo,
  descripcion: dto.descripcion,
  fecha_inicio: dto.fecha_inicio ? new Date(dto.fecha_inicio) : null,
  fecha_fin: dto.fecha_fin ? new Date(dto.fecha_fin) : null,
  nombre_creador: dto.nombre_creador,
  apellido_creador: dto.apellido_creador,
  created_by: dto.created_by,
  invitados: (dto.invitados ?? []).map(inv => ({
    ...inv,
    user_id: inv.user_id || (inv as any).id_usuario_invitado,
    invitado_nombre: (inv as any).nombre ?? inv.invitado_nombre,
    invitado_apellido: (inv as any).apellido ?? inv.invitado_apellido,
  })),
  tipo_actividad: dto.tipo_actividad,
  estado: dto.estado as EstadoInvitacionDB,
  archivos: dto.archivos ?? [],
  is_host: dto.isHost,
});

export function mapSolicitudBitacoraDTOToBitacora(dto: SolicitudBitacoraDTO): BitacoraSolicitud {
  return {
    id: dto.id ?? null,
    solicitud_id: dto.solicitud_id,
    fecha_inicio_nueva: parseBackendDate(dto.fecha_inicio_nueva),
    fecha_fin_nueva: parseBackendDate(dto.fecha_fin_nueva),
    observacion: dto.observacion ?? null,
    created_at: parseBackendDate(dto.created_at) ?? new Date(0),
    usuario_id: dto.usuario_id ?? null,
    usuario_nombre: dto.usuario_nombre ?? '',
    usuario_apellido: dto.usuario_apellido ?? '',
    estado: normalizeEstado(dto.estado),
    archivos: (dto.archivos ?? []).map(mapArchivoDTOToArchivo),
  };
}

export function mapCrearSolicitudRequestToSolicitudDTO(request: CrearSolicitudRequest): SolicitudDTO {
  return {
    titulo: request.titulo,
    descripcion: request.descripcion,
    fecha_inicio: request.fecha_inicio ?? null,
    fecha_fin: request.fecha_fin ?? null,
    tipo_actividad: request.tipo_actividad,
    invitados: request.invitados,
    archivosIds: request.archivosIds,
    crear_de_todos_modos: request.crear_de_todos_modos ?? 0,
    enviar_por_separado: request.enviar_por_separado,
  };
}

export function mapSolicitudDTOToCreatePayload(dto: SolicitudDTO): Record<string, unknown> {
  return {
    titulo: dto.titulo,
    descripcion: dto.descripcion,
    created_by: dto.created_by,
    fecha_inicio: toIsoDateOrNull(parseBackendDate(dto.fecha_inicio)),
    fecha_fin: toIsoDateOrNull(parseBackendDate(dto.fecha_fin)),
    tipo_actividad: dto.tipo_actividad,
    invitados: dto.invitados,
    estado: dto.estado,
    crear_de_todos_modos: dto.crear_de_todos_modos,
    archivosIds: dto.archivosIds,
    ...(dto.enviar_por_separado !== undefined ? { enviar_por_separado: dto.enviar_por_separado } : {}),
  };
}

export function mapUpdateSolicitudRequestToPayload(
  request: UpdateSolicitudRequest
): Record<string, unknown> {
  return {
    solicitud_id: request.solicitud_id,
    estado: request.estado,
    ...(request.fecha_inicio_nueva !== undefined
      ? {
        fecha_inicio_nueva:
          request.fecha_inicio_nueva === null ? null : toIsoDate(request.fecha_inicio_nueva),
      }
      : {}),
    ...(request.fecha_fin_nueva !== undefined
      ? {
        fecha_fin_nueva:
          request.fecha_fin_nueva === null ? null : toIsoDate(request.fecha_fin_nueva),
      }
      : {}),
    ...(request.observacion !== undefined ? { observacion: request.observacion } : {}),
    ...(request.archivosIds && request.archivosIds.length > 0
      ? { archivosIds: request.archivosIds }
      : {}),
    ...(request.crear_de_todos_modos !== undefined
      ? { crear_de_todos_modos: request.crear_de_todos_modos }
      : {}),
  };
}

export function mapCreateSolicitudResultToResponse(result: CreateSolicitudResult): CrearSolicitudResponse {
  return {
    success: result.created,
    solicitudId: result.solicitudId ?? null,
    solicitudIds: result.solicitudIds,
    rangosOcupados: (result.rangosOcupados ?? []).map(mapRangoOcupadoDTOToRangoOcupado),
  };
}

export function mapUpdateSolicitudResultToResponse(
  result: UpdateSolicitudResult
): UpdateSolicitudResponse {
  return {
    success: result.updated,
    rangosOcupados: (result.rangosOcupados ?? []).map(mapRangoOcupadoDTOToRangoOcupado),
  };
}
