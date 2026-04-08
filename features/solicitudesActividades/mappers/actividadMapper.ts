import type {
    ActividadDetalleDTO,
    ActividadDTO,
    CrearActividadDTO,
} from '../dto/ActividadDTO';
import type {
    Actividad,
    ActividadDetalleResponse,
    ActividadesPorPeriodoResponse,
    CancelarActividadRequest,
    CrearActividadRequest,
    Licencia,
    ModificarActividadFechasRequest,
    ObtenerActividadesPorPeriodoRequest,
} from '../models/Actividad';
import { parseBackendDate, toIsoDate } from './dateMapper';

function toValidDateOrUndefined(value: string | Date | null | undefined): Date | undefined {
  const parsed = parseBackendDate(value);
  return parsed ?? undefined;
}

function normalizeRolActividad(value: unknown): 'host' | 'guest' {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  return normalized === 'host' ? 'host' : 'guest';
}

export function mapCrearActividadRequestToDTO(request: CrearActividadRequest): CrearActividadDTO {
  return {
    titulo: request.titulo,
    descripcion: request.descripcion,
    fecha_inicio: toIsoDate(request.fecha_inicio)!,
    ...(request.fecha_fin
      ? { fecha_fin: toIsoDate(request.fecha_fin)! }
      : {}),
    ...(request.solicitud_id !== undefined ? { solicitud_id: request.solicitud_id } : {}),
    ...(request.participantes !== undefined ? { participantes: request.participantes } : {}),
  };
}

export function mapModificarActividadFechasRequestToPayload(
  request: ModificarActividadFechasRequest
): Record<string, unknown> {
  const actividadId = request.actividad_id;

  return {
    actividad_id: actividadId,
    id: actividadId,
    fecha_inicio: toIsoDate(request.fecha_inicio),
    ...(request.fecha_fin
      ? {
          fecha_fin: toIsoDate(request.fecha_fin),
        }
      : {}),
  };
}

export function mapCancelarActividadRequestToPayload(
  request: CancelarActividadRequest
): Record<string, unknown> {
  const actividadId = request.actividad_id ?? request.id;
  if (!actividadId || !Number.isFinite(actividadId)) {
    throw new Error('Actividad invalida para cancelar');
  }

  return {
    actividad_id: actividadId,
    id: actividadId,
    ...(request.motivo ? { motivo: request.motivo } : {}),
  };
}

export function mapObtenerActividadesPorPeriodoRequestToPayload(
  request: ObtenerActividadesPorPeriodoRequest
): Record<string, unknown> {
  return {
    fechaInicio: toIsoDate(request.fechaInicio),
    fechaFin: toIsoDate(request.fechaFin),
  };
}

export function mapActividadDTOToActividad(dto: ActividadDTO): Actividad | null {
  const fechaInicio = toValidDateOrUndefined(dto.fecha_inicio);
  if (!fechaInicio) {
    return null;
  }

  const fechaFin = toValidDateOrUndefined(dto.fecha_fin);

  return {
    id: dto.actividad_id ?? dto.id ?? 0,
    titulo: dto.titulo ?? 'Sin titulo',
    descripcion: dto.descripcion ?? '',
    fecha_inicio: fechaInicio,
    ...(fechaFin ? { fecha_fin: fechaFin } : {}),
    rol: normalizeRolActividad(dto.rol),
    solicitud_id: dto.solicitud_id,
  };
}

export function mapLicenciaDTOToLicencia(dto: any): Licencia | null {
  const fechaInicio = toValidDateOrUndefined(dto?.fecha_inicio);
  const fechaFin = toValidDateOrUndefined(dto?.fecha_fin);
  const createdAt = toValidDateOrUndefined(dto?.created_at);
  const updatedAt = toValidDateOrUndefined(dto?.updated_at);

  if (!fechaInicio || !fechaFin || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id: Number(dto?.id ?? 0),
    usuario_id: Number(dto?.usuario_id ?? 0),
    tipo_licencia_id: Number(dto?.tipo_licencia_id ?? 0),
    tipo_licencia_nombre: String(dto?.tipo_licencia_nombre ?? ''),
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    cantidad_dias: Number(dto?.cantidad_dias ?? 0),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export function mapActividadesPorPeriodoDTOToResponse(dto: any): ActividadesPorPeriodoResponse {
  const actividades = (dto?.actividades ?? [])
    .map((item: ActividadDTO) => mapActividadDTOToActividad(item))
    .filter((item: Actividad | null): item is Actividad => item !== null);

  const licencias = (dto?.licencias ?? [])
    .map((item: any) => mapLicenciaDTOToLicencia(item))
    .filter((item: Licencia | null): item is Licencia => item !== null);

  return { actividades, licencias };
}

export function mapActividadDTOToDetalle(dto: ActividadDetalleDTO): ActividadDetalleResponse {
  const fechaInicio = toValidDateOrUndefined(dto.fecha_inicio) ?? new Date(0);
  const fechaFin = toValidDateOrUndefined(dto.fecha_fin);

  return {
    id: dto.actividad_id ?? dto.id ?? 0,
    titulo: dto.titulo ?? 'Sin titulo',
    descripcion: dto.descripcion ?? '',
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    rol: dto.rol,
    solicitud_id: dto.solicitud_id,
    participantes: (dto.participantes ?? []).map((participante) => ({
      rol: participante.rol,
      nombre: participante.nombre ?? '',
      apellido: participante.apellido ?? '',
    })),
  };
}
