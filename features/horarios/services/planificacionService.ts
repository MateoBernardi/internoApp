import { apiRequest, throwApiError } from '@/shared/apiRequest';
import { idempotencyHeaders } from '@/shared/idempotency';
import type {
  CrearTurnoPayload,
  PlanificacionAplicadaDTO,
  PlanificacionInfoDTO,
  PlanificacionPreviewDTO,
} from '../models/Planificacion';

// Se pasa el body CRUDO a throwApiError (no un mensaje ya extraído) para que el ApiError
// conserve `status`, `code` y `details` (p. ej. los errores de planilla de un 422).

export async function getPlanificacionInfo(token: string): Promise<PlanificacionInfoDTO> {
  const res = await apiRequest({ method: 'GET', endpoint: '/horarios/planificacion/info', token });
  if (!res.ok) throwApiError(await res.text(), res);
  return res.json();
}

/** Lee la planilla, la valida y devuelve el diff. No modifica ningún horario. */
export async function previewPlanificacion(token: string): Promise<PlanificacionPreviewDTO> {
  const res = await apiRequest({ method: 'POST', endpoint: '/horarios/planificacion/preview', token });
  if (!res.ok) throwApiError(await res.text(), res);
  return res.json();
}

/** Aplica de forma atómica un preview. La key de idempotencia es una por preview. */
export async function confirmarPlanificacion(
  token: string,
  previewId: number,
  idempotencyKey?: string,
): Promise<PlanificacionAplicadaDTO> {
  const res = await apiRequest({
    method: 'POST',
    endpoint: '/horarios/planificacion/confirmar',
    token,
    body: { previewId },
    headers: idempotencyHeaders(idempotencyKey),
  });
  if (!res.ok) throwApiError(await res.text(), res);
  return res.json();
}

/** Alta de un turno individual (usuarios rotativos que no están en la planilla). */
export async function crearTurno(token: string, payload: CrearTurnoPayload): Promise<void> {
  const res = await apiRequest({ method: 'POST', endpoint: '/horarios/turno', token, body: payload });
  if (!res.ok) throwApiError(await res.text(), res);
}
