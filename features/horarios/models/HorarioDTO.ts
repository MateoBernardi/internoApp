export function normalizeTurno(raw: string): 'MANANA' | 'TARDE' {
  const up = raw.toUpperCase();
  if (up === 'MANANA' || up === 'MAÑANA') return 'MANANA';
  return 'TARDE';
}

export interface HorarioDTO {
  id?: number;               // nombre real del backend
  planificacion_id?: number; // alternativa (por si cambia)
  user_context_id: number;
  turno: string; // backend devuelve 'Mañana' | 'Tarde'
  esperado_in: string;   // ISO datetime, e.g. "2026-06-16T08:00:00.000Z"
  esperado_out: string;
  sede_id_in: number;
  sede_id_out: number;
  nombre: string;
  apellido: string;
  relacion: string;
  licencia?: boolean;
  esta_de_licencia?: boolean;
}

export interface SedeDTO {
  id: number;
  nombre: string;
}

export interface UploadShiftsResponse {
  success: boolean;
  message: string;
  totalInsertados: number;
}

export interface UpdateHorarioPayload {
  id: number;            // planificacion_id
  turno: 'MANANA' | 'TARDE';
  horario_in: string;    // "YYYY-MM-DDTHH:MM:00"
  horario_out: string;   // "YYYY-MM-DDTHH:MM:00"
  sede_id_in: number;
  sede_id_out: number;
  licencia: 0 | 1;        // marcado manual: 1 si el empleado está de licencia
}
