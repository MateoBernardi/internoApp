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
  acepted_at?: string | null;
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

/**
 * Turno propio devuelto por `GET /horarios/user` (columnas SQL crudas de
 * `planificacion_diaria` + `v_interno_users`, ver
 * `appMayorista-backend/src/adapters/db/horariosRepo.ts#getUserShiftsByUser`).
 */
export interface HorarioUsuarioDTO {
  id: number;
  user_context_id: number;
  turno: string; // backend devuelve 'Mañana' | 'Tarde'
  esperado_in: string | null;  // ISO datetime
  esperado_out: string | null; // ISO datetime
  sede_id_in: number;
  sede_id_out: number;
  licencia: boolean;
  acepted_at?: string | null;
  marcado_in_at: string | null;
  marcado_out_at: string | null;
  nombre: string;
  apellido: string;
}

/** Respuesta de `GET /horarios/kiosk-secret?sedeId=`. */
export interface KioskSecretDTO {
  qrSecret: string;
  qrMode: 'ROTATING' | 'STATIC';
  step: number; // segundos, actualmente siempre 30
}

/** Body de `PUT /horarios/scan`. */
export interface ScanPayload {
  fecha: string;   // "YYYY-MM-DD"
  turno: 'MANANA' | 'TARDE';
  time: string;    // ISO datetime, momento del escaneo
  latitud: number;
  longitud: number;
  device_identifier: string; // clave estable del dispositivo, 8-128 chars [A-Za-z0-9._-]
  token: string;   // valor crudo leído del QR (código estático o JSON `{s,c}` rotativo)
}

/** Respuesta 200 de `PUT /horarios/scan`. */
export interface ScanResultDTO {
  success: boolean;
  message: string;
}
