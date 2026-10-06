import { normalizeTurno, type HorarioDTO, type TurnoEnum, type UpdateHorarioPayload } from './HorarioDTO';

export const TURNO_LABEL: Record<'MANANA' | 'TARDE', TurnoEnum> = {
  MANANA: 'Mañana',
  TARDE: 'Tarde',
};

export const TURNO_CODE: Record<'MANANA' | 'TARDE', string> = {
  MANANA: 'M',
  TARDE: 'T',
};

// UI-layer model used by admin panel components
export interface Turno {
  id: number;            // planificacion_id
  userContextId: number;
  nombre: string;        // "Nombre Apellido"
  fecha: string;         // "DD/MM/AAAA" for display
  fechaISO: string;      // "YYYY-MM-DD" for API queries
  turno: 'MANANA' | 'TARDE';
  /** Nombre exacto del turno en el backend (incluye Noche y Rotativo, que `turno` colapsa a TARDE). */
  turnoNombre: TurnoEnum;
  ingreso: string;       // "HH:MM"
  egreso: string;        // "HH:MM"; vacío en horario corrido (la salida sale del marcado)
  sedeIdIngreso: number;
  sedeIdEgreso: number;
  licencia: boolean;
  feriado: boolean;
  isNew?: boolean;
  aceptedAt?: string | null;
  marcadoInAt?: string | null;
  marcadoOutAt?: string | null;
  reportadoTardanza: boolean;
  horarioCorrido: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

const TURNOS_VALIDOS: TurnoEnum[] = ['Mañana', 'Tarde', 'Noche', 'Rotativo'];

/** 'Mañana' | 'Tarde' | 'Noche' | 'Rotativo' tal como lo guarda el backend (cae a 'Tarde' si no se reconoce). */
export function turnoNombreFromBackend(raw: string): TurnoEnum {
  return TURNOS_VALIDOS.find((t) => t.toUpperCase() === raw.toUpperCase()) ?? 'Tarde';
}

// Strips timezone suffix and parses as local time (same pattern as AgendaDiaria.tsx)
export function parseLocal(iso: string): Date {
  const stripped = iso.replace(/([+-]\d{2}:?\d{2}|Z)$/, '').replace(' ', 'T');
  return new Date(stripped);
}

export function mapHorarioDTOToTurno(dto: HorarioDTO): Turno {
  const inDate = parseLocal(dto.esperado_in);
  const outDate = dto.esperado_out ? parseLocal(dto.esperado_out) : null;

  return {
    id: dto.planificacion_id ?? dto.id ?? 0,
    userContextId: dto.user_context_id,
    nombre: `${dto.nombre} ${dto.apellido}`,
    fecha: `${pad(inDate.getDate())}/${pad(inDate.getMonth() + 1)}/${inDate.getFullYear()}`,
    fechaISO: `${inDate.getFullYear()}-${pad(inDate.getMonth() + 1)}-${pad(inDate.getDate())}`,
    turno: normalizeTurno(dto.turno),
    turnoNombre: turnoNombreFromBackend(dto.turno),
    ingreso: `${pad(inDate.getHours())}:${pad(inDate.getMinutes())}`,
    egreso: outDate ? `${pad(outDate.getHours())}:${pad(outDate.getMinutes())}` : '',
    sedeIdIngreso: dto.sede_id_in,
    sedeIdEgreso: dto.sede_id_out,
    licencia: dto.licencia ?? dto.esta_de_licencia ?? false,
    feriado: dto.feriado ?? false,
    aceptedAt: dto.acepted_at ?? null,
    marcadoInAt: dto.marcado_in_at ?? null,
    marcadoOutAt: dto.marcado_out_at ?? null,
    reportadoTardanza: dto.reportado_tardanza ?? false,
    horarioCorrido: dto.horario_corrido ?? false,
  };
}

/**
 * Body de `PATCH /horarios/update-shift` a partir de un turno de la UI. Un turno de horario corrido
 * (sin egreso) manda `horario_out: null` para conservarlo así. `horario_corrido` solo viaja si se
 * pasa en `extra`: omitirlo hace que el backend conserve el valor actual (enviar `false` lo apagaría).
 */
export function buildUpdatePayload(
  turno: Turno,
  extra: Partial<Pick<UpdateHorarioPayload, 'horario_corrido' | 'feriado' | 'licencia'>> = {},
): UpdateHorarioPayload {
  return {
    id: turno.id,
    turno: turno.turnoNombre,
    horario_in: `${turno.fechaISO}T${turno.ingreso}:00`,
    horario_out: turno.egreso ? `${turno.fechaISO}T${turno.egreso}:00` : null,
    sede_id_in: turno.sedeIdIngreso,
    sede_id_out: turno.sedeIdEgreso,
    licencia: turno.licencia ? 1 : 0,
    feriado: turno.feriado ? 1 : 0,
    ...extra,
  };
}
