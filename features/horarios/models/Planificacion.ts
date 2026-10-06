import type { TurnoEnum } from './HorarioDTO';

/**
 * Contrato de la publicación de horarios por planilla
 * (appMayorista-backend: `POST /horarios/planificacion/preview|confirmar`,
 * `GET /horarios/planificacion/info`, `POST /horarios/turno`).
 */

export type AccionDiff = 'alta' | 'modificacion' | 'baja' | 'omitido';

/**
 * Por qué un cambio no se aplica: `2H` = el turno empieza en menos de 2 horas (o ya empezó),
 * `MARCADO` = ya tiene marcado, `LICENCIA` = día con licencia (se cambia a mano).
 */
export type MotivoOmitido = '2H' | 'MARCADO' | 'LICENCIA';

export interface DiffHorario {
  in: string; // "HH:mm"
  out: string | null; // null en horario corrido (la salida sale del marcado)
  sede: number;
  horarioCorrido?: boolean;
}

export interface DiffTurnoDetalle {
  userContextId: number;
  nombre: string;
  apellido: string;
  fecha: string; // "YYYY-MM-DD"
  turno: string; // 'Mañana' | 'Tarde'
  accion: AccionDiff;
  motivo: MotivoOmitido | null;
  antes: DiffHorario | null;
  despues: DiffHorario | null;
}

export interface FaltanteHoras {
  user_context_id: number;
  nombre: string;
  apellido: string;
  horas: number;
  objetivo: number;
}

export interface UsuarioSinTurnos {
  userContextId: number;
  nombre: string;
  apellido: string;
}

export interface PlanificacionResumen {
  altas: number;
  modificaciones: number;
  bajas: number;
  sinCambios: number;
  omitidos2h: number;
  omitidosLicencia: number;
}

/** Respuesta de `POST /horarios/planificacion/preview`. */
export interface PlanificacionPreviewDTO {
  ok: true;
  snapshotId: number;
  expiraAt: string; // ISO
  igualAlVigente: boolean;
  resumen: PlanificacionResumen;
  detalle: DiffTurnoDetalle[];
  faltantes: { semanaActual: FaltanteHoras[]; proximaSemana: FaltanteHoras[] };
  usuariosSinTurnos: UsuarioSinTurnos[];
}

/** Respuesta de `POST /horarios/planificacion/confirmar`. */
export interface PlanificacionAplicadaDTO {
  message: string;
  snapshotId: number;
  altas: number;
  modificaciones: number;
  bajas: number;
  omitidos: number;
}

/** Respuesta de `GET /horarios/planificacion/info`. */
export interface PlanificacionInfoDTO {
  planillaUrl: string | null;
  ultimaPublicacion: {
    snapshotId: number;
    aplicadoAt: string | null; // ISO
    publicadoPor: { nombre: string; apellido: string } | null;
  } | null;
}

/** Body de `POST /horarios/turno` (alta de un turno individual, p. ej. rotativos). */
export interface CrearTurnoPayload {
  user_context_id: number;
  turno?: TurnoEnum; // default del backend: 'Rotativo'
  horario_in: string; // "YYYY-MM-DDTHH:mm"
  horario_out: string; // "YYYY-MM-DDTHH:mm"
  sede_id_in: number;
  sede_id_out?: number; // default: igual a la de ingreso
}
