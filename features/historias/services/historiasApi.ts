import { apiRequest, throwApiError } from '@/shared/apiRequest';
import { idempotencyHeaders } from '@/shared/idempotency';
import type {
  ActividadSemanalDTO,
  EntradaDTO,
  GrafoMencionesDTO,
  HistoriaDetalleDTO,
  HistoriaListadoDTO,
  PalabraDTO,
  PersonaMencionadaDTO,
} from '../dto/HistoriaDTO';

/** Hace la request, falla con el mensaje del backend y devuelve `data` del envelope `{success, data}`. */
async function request<T>(
  method: 'GET' | 'POST',
  endpoint: string,
  token: string,
  opts: { body?: unknown; idempotencyKey?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const response = await apiRequest({
    method,
    endpoint,
    token,
    body: opts.body,
    signal: opts.signal,
    headers: opts.idempotencyKey ? idempotencyHeaders(opts.idempotencyKey) : undefined,
  });
  if (!response.ok) throwApiError(await response.text(), response);
  const json = await response.json();
  return json.data as T;
}

export const listarHistorias = (token: string, antes: string | null, signal?: AbortSignal) =>
  request<HistoriaListadoDTO>(
    'GET',
    antes ? `/historias?antes=${encodeURIComponent(antes)}` : '/historias',
    token,
    { signal },
  );

export const obtenerHistoria = (token: string, id: string, signal?: AbortSignal) =>
  request<HistoriaDetalleDTO>('GET', `/historias/${id}`, token, { signal });

export const crearHistoria = (token: string, cuerpo: string, idempotencyKey: string) =>
  request<EntradaDTO>('POST', '/historias', token, { body: { cuerpo }, idempotencyKey });

export const agregarMensaje = (token: string, id: string, cuerpo: string, idempotencyKey: string) =>
  request<EntradaDTO>('POST', `/historias/${id}/entradas`, token, { body: { cuerpo }, idempotencyKey });

export const cerrarHistoria = (token: string, id: string, idempotencyKey: string) =>
  request<EntradaDTO>('POST', `/historias/${id}/cierre`, token, { body: {}, idempotencyKey });

export const getPalabras = (token: string) => request<PalabraDTO[]>('GET', '/analitica/palabras', token);
export const getPersonasMencionadas = (token: string) =>
  request<PersonaMencionadaDTO[]>('GET', '/analitica/menciones', token);
export const getGrafo = (token: string) => request<GrafoMencionesDTO>('GET', '/analitica/grafo', token);
export const getActividad = (token: string) =>
  request<ActividadSemanalDTO[]>('GET', '/analitica/actividad', token);
export const getPalabrasDePersona = (token: string, personaId: number) =>
  request<PalabraDTO[]>('GET', `/analitica/personas/${personaId}/palabras`, token);
