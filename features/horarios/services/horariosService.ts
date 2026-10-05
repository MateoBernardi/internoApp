import { apiRequest, throwApiError } from '@/shared/apiRequest';
import { idempotencyHeaders } from '@/shared/idempotency';
import type {
  HorarioDTO,
  HorarioUsuarioDTO,
  KioskSecretDTO,
  ScanEventDTO,
  ScanPayload,
  ScanResultDTO,
  SedeDTO,
  UpdateHorarioPayload,
} from '../models/HorarioDTO';
import { TURNO_LABEL } from '../models/Turno';

async function extractError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return json.message || json.error || text;
  } catch {
    return text || res.statusText;
  }
}

export async function getSedes(token: string): Promise<SedeDTO[]> {
  const res = await apiRequest({ method: 'GET', endpoint: '/horarios/sedes', token });
  if (!res.ok) throwApiError(await extractError(res), res);
  return res.json();
}

// El backend solo soporta UN filtro por request, como string "clave:valor"
// (ver buildFilterCondition en horariosRepo.ts): turno, sede, usuario, rol_nombre o feriado.
export type HorariosByDateFilter =
  | { key: 'usuario'; value: number }
  | { key: 'rol_nombre'; value: string }
  | { key: 'feriado'; value: 1 };

export async function getHorariosByDate(
  token: string,
  diaFecha: string, // "YYYY-MM-DD"
  filter?: HorariosByDateFilter,
): Promise<HorarioDTO[]> {
  const params = new URLSearchParams({ dia_fecha: diaFecha });
  if (filter) {
    params.set('filter', `${filter.key}:${filter.value}`);
  }
  const res = await apiRequest({
    method: 'GET',
    endpoint: `/horarios/?${params.toString()}`,
    token,
  });
  if (!res.ok) throwApiError(await extractError(res), res);
  return res.json();
}

/** Filtro opcional por empleado y/o rol, combinables entre sí (a diferencia de HorariosByDateFilter). */
export interface FeriadosRangeFilter {
  userContextId?: number;
  role?: string;
}

/** Turnos marcados como feriado dentro de un rango de fechas ("YYYY-MM-DD"), para todos los usuarios. */
export async function getFeriadosByRange(
  token: string,
  fechaInicio: string,
  fechaFin: string,
  filter: FeriadosRangeFilter = {},
): Promise<HorarioDTO[]> {
  const params = new URLSearchParams({ fechaInicio, fechaFin });
  if (filter.userContextId != null) params.set('user_context_id', String(filter.userContextId));
  if (filter.role) params.set('role', filter.role);

  const res = await apiRequest({
    method: 'GET',
    endpoint: `/horarios/feriados?${params.toString()}`,
    token,
  });
  if (!res.ok) throwApiError(await extractError(res), res);
  return res.json();
}

export async function updateHorario(
  token: string,
  payload: UpdateHorarioPayload,
): Promise<void> {
  const res = await apiRequest({
    method: 'PATCH',
    endpoint: '/horarios/update-shift',
    token,
    body: payload,
  });
  if (!res.ok) throwApiError(await extractError(res), res);
}

/** Marca (o desmarca) como feriado todos los turnos de un día calendario de una vez,
 *  o solo los de un turno puntual si se pasa `turno`. */
export async function marcarFeriadoDia(
  token: string,
  fechaISO: string, // "YYYY-MM-DD"
  feriado: boolean,
  turno?: 'MANANA' | 'TARDE',
): Promise<{ message: string; affected: number }> {
  const res = await apiRequest({
    method: 'PATCH',
    endpoint: '/horarios/dia/feriado',
    token,
    body: { fecha: fechaISO, feriado, turno: turno ? TURNO_LABEL[turno] : undefined },
  });
  if (!res.ok) throwApiError(await extractError(res), res);
  return res.json();
}

/** Turnos propios del usuario autenticado en un rango de fechas ("YYYY-MM-DD"). */
export async function getMisHorarios(
  token: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<HorarioUsuarioDTO[]> {
  const params = new URLSearchParams({ fechaInicio, fechaFin });
  const res = await apiRequest({
    method: 'GET',
    endpoint: `/horarios/user?${params.toString()}`,
    token,
  });
  if (!res.ok) throwApiError(await extractError(res), res);
  return res.json();
}

/** Secreto QR rotativo de una sede (solo cuentas `kiosco`). */
export async function getKioskSecret(token: string, sedeId: number): Promise<KioskSecretDTO> {
  const res = await apiRequest({
    method: 'GET',
    endpoint: `/horarios/kiosk-secret?sedeId=${sedeId}`,
    token,
  });
  if (!res.ok) throwApiError(await extractError(res), res);
  return res.json();
}

/**
 * Envía un escaneo de entrada/salida. `idempotencyKey` viaja en
 * `X-Idempotency-Key` para que reintentos de red no dupliquen el marcado.
 * Lanza un Error con el mensaje del backend en respuestas no-2xx. Ojo: un
 * escaneo rechazado (QR/geofence inválido, turno ya completo) responde 200
 * con `{ success: false, message }`, no un status de error — el caller debe
 * revisar `success`, no solo si la promesa resolvió.
 */
export async function enviarScan(
  token: string,
  payload: ScanPayload,
  idempotencyKey: string,
): Promise<ScanResultDTO> {
  const res = await apiRequest({
    method: 'PUT',
    endpoint: '/horarios/scan',
    token,
    body: payload,
    headers: idempotencyHeaders(idempotencyKey),
  });
  if (!res.ok) {
    const errText = await extractError(res);
    console.error('[enviarScan] scan failed', {
      status: res.status,
      statusText: res.statusText,
      body: errText,
      idempotencyKey,
      fecha: payload.fecha,
      turno: payload.turno,
      time: payload.time,
    });
    throwApiError(errText, res);
  }
  return res.json();
}

/** Historial de escaneos (IN/OUT) de un turno puntual (GET /horarios/:id/scans). */
export async function getScanHistory(token: string, planificacionId: number): Promise<ScanEventDTO[]> {
  const res = await apiRequest({
    method: 'GET',
    endpoint: `/horarios/${planificacionId}/scans`,
    token,
  });
  if (!res.ok) throwApiError(await extractError(res), res);
  return res.json();
}
