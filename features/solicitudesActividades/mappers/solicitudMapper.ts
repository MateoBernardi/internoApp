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
    Solicitud,
    SolicitudEnviada,
    UpdateSolicitudRequest,
    UpdateSolicitudResponse,
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

export function mapSolicitudInfoDTOToSolicitudEnviada(dto: SolicitudInfoDTO): SolicitudEnviada {
  return {
    solicitud_id: dto.solicitud_id,
    titulo: dto.titulo,
    descripcion: dto.descripcion,
    created_by: dto.created_by,
    fecha_inicio: parseBackendDate(dto.fecha_inicio),
    fecha_fin: parseBackendDate(dto.fecha_fin),
    tipo_actividad: dto.tipo_actividad,
    estado: normalizeEstado(dto.estado),
    nombre_creador: dto.nombre_creador,
    apellido_creador: dto.apellido_creador,
    invitado_nombre: dto.invitado_nombre,
    invitado_apellido: dto.invitado_apellido,
  };
}

export function mapSolicitudInfoDTOToSolicitud(dto: SolicitudInfoDTO): Solicitud {
  return {
    solicitud_id: dto.solicitud_id,
    titulo: dto.titulo,
    descripcion: dto.descripcion,
    created_by: dto.created_by,
    fecha_inicio: parseBackendDate(dto.fecha_inicio),
    fecha_fin: parseBackendDate(dto.fecha_fin),
    tipo_actividad: dto.tipo_actividad,
    estado: normalizeEstado(dto.estado),
    nombre: dto.nombre_creador,
    apellido: dto.apellido_creador,
  };
}

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
    crear_de_todos_modos: request.crear_de_todos_modos ?? 0,
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
    ...(request.crear_de_todos_modos !== undefined
      ? { crear_de_todos_modos: request.crear_de_todos_modos }
      : {}),
  };
}

export function mapCreateSolicitudResultToResponse(result: CreateSolicitudResult): CrearSolicitudResponse {
  return {
    success: result.created,
    solicitudId: result.solicitudId ?? null,
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
