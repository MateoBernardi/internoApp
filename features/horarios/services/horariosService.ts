import { apiRequest, throwApiError } from '@/shared/apiRequest';
import { idempotencyHeaders } from '@/shared/idempotency';
import Constants from 'expo-constants';
import type {
  HorarioDTO,
  HorarioUsuarioDTO,
  KioskSecretDTO,
  ScanPayload,
  ScanResultDTO,
  SedeDTO,
  UpdateHorarioPayload,
  UploadShiftsResponse,
} from '../models/HorarioDTO';

const API_BASE_URL: string = Constants.expoConfig?.extra?.API_BASE_URL ?? '';

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
// (ver buildFilterCondition en horariosRepo.ts): turno, sede, usuario o rol_nombre.
export type HorariosByDateFilter =
  | { key: 'usuario'; value: number }
  | { key: 'rol_nombre'; value: string };

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

export async function uploadShiftsFile(
  token: string,
  fileUri: string,
  fileName: string,
): Promise<UploadShiftsResponse> {
  const form = new FormData();
  form.append('file', { uri: fileUri, name: fileName, type: 'text/plain' } as any);

  const res = await fetch(`${API_BASE_URL}/horarios/upload-shifts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-app-entorno': 'interno',
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await extractError(res);
    throw new Error(errText);
  }
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
 * Lanza un Error con el mensaje del backend en respuestas no-2xx (incluido
 * el 409 de token/geofence/dispositivo inválido).
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
  if (!res.ok) throwApiError(await extractError(res), res);
  return res.json();
}
