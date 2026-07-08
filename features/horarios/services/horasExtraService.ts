import { apiRequest, throwApiError } from '@/shared/apiRequest';
import { idempotencyHeaders } from '@/shared/idempotency';
import type { HorasExtraDTO, LiquidarHorasExtraResult, MovimientoDTO } from '../models/HorasExtra';

async function extractError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return json.message || json.error || text;
  } catch {
    return text || res.statusText;
  }
}

export interface HorasExtraFilter {
  // El backend siempre devuelve el saldo actual del usuario (disponible -
  // consumido); sólo se puede filtrar por usuario y/o rol.
  userContextId?: number;
  role?: string;
}

export async function getHorasExtra(
  token: string,
  filter: HorasExtraFilter,
): Promise<HorasExtraDTO[]> {
  const params = new URLSearchParams();
  if (filter.userContextId != null) params.set('user_context_id', String(filter.userContextId));
  if (filter.role) params.set('role', filter.role);

  const qs = params.toString();
  const res = await apiRequest({
    method: 'GET',
    endpoint: qs ? `/horarios/extra?${qs}` : '/horarios/extra',
    token,
  });
  if (!res.ok) throwApiError(await extractError(res), res);
  return res.json();
}

/**
 * GET /horarios/movimientos: desglose de movimientos de un usuario para un
 * mes ("YYYY-MM"), ordenado más reciente primero. Ambos params son
 * obligatorios para el backend.
 */
export async function getMovimientos(
  token: string,
  userContextId: number,
  mes: string,
): Promise<MovimientoDTO[]> {
  const params = new URLSearchParams({ user_context_id: String(userContextId), mes });
  const res = await apiRequest({
    method: 'GET',
    endpoint: `/horarios/movimientos?${params.toString()}`,
    token,
  });
  if (!res.ok) throwApiError(await extractError(res), res);
  return res.json();
}

export async function liquidarHorasExtra(
  token: string,
  userContextId: number,
  horas: number,
  idempotencyKey?: string,
): Promise<LiquidarHorasExtraResult> {
  // El backend lee `horas` de la query string, no del body, y no implementa
  // idempotencia en este endpoint (el header se manda igual por consistencia
  // con el resto de las mutaciones, pero el servidor lo ignora).
  const params = new URLSearchParams({ horas: String(horas) });
  const res = await apiRequest({
    method: 'POST',
    endpoint: `/horarios/liquidar/${userContextId}?${params.toString()}`,
    token,
    headers: idempotencyHeaders(idempotencyKey),
  });
  if (!res.ok) throwApiError(await extractError(res), res);
  return res.json();
}
