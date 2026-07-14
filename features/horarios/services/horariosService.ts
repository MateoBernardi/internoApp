import { apiRequest, throwApiError } from '@/shared/apiRequest';
import Constants from 'expo-constants';
import type { HorarioDTO, SedeDTO, UpdateHorarioPayload, UploadShiftsResponse } from '../models/HorarioDTO';

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
