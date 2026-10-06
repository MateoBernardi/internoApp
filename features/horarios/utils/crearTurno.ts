import type { TurnoEnum } from '../models/HorarioDTO';
import type { CrearTurnoPayload } from '../models/Planificacion';

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface CrearTurnoForm {
  userContextId: number | null;
  fechaISO: string; // "YYYY-MM-DD"
  turno: TurnoEnum;
  ingreso: string; // "HH:MM"
  egreso: string; // "HH:MM"
  sedeIngreso: number | null;
  /** null = igual a la sede de ingreso. */
  sedeEgreso: number | null;
}

export type CrearTurnoValidation =
  | { ok: true; payload: CrearTurnoPayload }
  | { ok: false; error: string };

const aMinutos = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * Valida el alta de un turno individual en el cliente (mismas reglas que el backend, para
 * dar el error antes de ir a la red) y arma el body de `POST /horarios/turno`.
 * `hoyISO` se inyecta para poder testear sin depender del reloj.
 */
export function validarCrearTurno(form: CrearTurnoForm, hoyISO: string): CrearTurnoValidation {
  if (form.userContextId == null) return { ok: false, error: 'Elegí el empleado.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fechaISO)) return { ok: false, error: 'Elegí la fecha.' };
  // "YYYY-MM-DD" ordena igual que las fechas: la comparación de strings alcanza.
  if (form.fechaISO < hoyISO) return { ok: false, error: 'No se pueden crear turnos en fechas pasadas.' };
  if (!HORA_REGEX.test(form.ingreso)) return { ok: false, error: 'Ingresá un horario de ingreso válido (HH:MM).' };
  if (!HORA_REGEX.test(form.egreso)) return { ok: false, error: 'Ingresá un horario de egreso válido (HH:MM).' };
  if (aMinutos(form.egreso) <= aMinutos(form.ingreso)) {
    return { ok: false, error: 'El egreso tiene que ser posterior al ingreso.' };
  }
  if (form.sedeIngreso == null) return { ok: false, error: 'Elegí la sede de ingreso.' };

  const payload: CrearTurnoPayload = {
    user_context_id: form.userContextId,
    turno: form.turno,
    horario_in: `${form.fechaISO}T${form.ingreso}`,
    horario_out: `${form.fechaISO}T${form.egreso}`,
    sede_id_in: form.sedeIngreso,
    sede_id_out: form.sedeEgreso ?? form.sedeIngreso,
  };
  return { ok: true, payload };
}
