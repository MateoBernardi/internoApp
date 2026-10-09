import { apiRequest, throwApiError } from '@/shared/apiRequest';
import { IDEMPOTENCY_HEADER, idempotencyHeaders } from '@/shared/idempotency';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type {
  Adjunto,
  AdjuntoPendiente,
  Entrada,
  InformeCreado,
  InformeDetalle,
  InformeListado,
  UrlAdjunto,
} from '../dto/InformeDTO';

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL;

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
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
    headers: idempotencyHeaders(opts.idempotencyKey),
  });
  if (!response.ok) throwApiError(await response.text(), response);
  const json = await response.json();
  return json.data as T;
}

export const listarInformes = (token: string, antes: string | null, signal?: AbortSignal) =>
  request<InformeListado>(
    'GET',
    antes ? `/informes?antes=${encodeURIComponent(antes)}` : '/informes',
    token,
    { signal },
  );

export const obtenerInforme = (token: string, informeId: string, signal?: AbortSignal) =>
  request<InformeDetalle>('GET', `/informes/${informeId}/entradas`, token, { signal });

export const crearInforme = (token: string, cuerpo: string, idempotencyKey: string) =>
  request<InformeCreado>('POST', '/informes', token, { body: { cuerpo }, idempotencyKey });

export const agregarEntrada = (
  token: string,
  informeId: string,
  idempotencyKey: string,
  opts: { cuerpo?: string; tipo?: 'cierre' } = {},
) =>
  request<Entrada>('POST', `/informes/${informeId}/entradas`, token, { body: opts, idempotencyKey });

export const editarEntrada = (token: string, informeId: string, entradaId: string, cuerpo: string) =>
  request<Entrada>('PATCH', `/informes/${informeId}/entradas/${entradaId}`, token, { body: { cuerpo } });

export const obtenerUrlAdjunto = (token: string, informeId: string, adjuntoId: string) =>
  request<UrlAdjunto>('GET', `/informes/${informeId}/adjuntos/${adjuntoId}`, token);

export const eliminarAdjunto = (token: string, informeId: string, entradaId: string, adjuntoId: string) =>
  request<unknown>('DELETE', `/informes/${informeId}/entradas/${entradaId}/adjuntos/${adjuntoId}`, token);

export async function subirAdjunto(
  token: string,
  informeId: string,
  entradaId: string,
  adjunto: AdjuntoPendiente,
  idempotencyKey?: string,
): Promise<Adjunto> {
  const endpoint = `${API_BASE_URL}/informes/${informeId}/entradas/${entradaId}/adjuntos`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'x-app-entorno': 'interno',
    ...(idempotencyKey ? { [IDEMPOTENCY_HEADER]: idempotencyKey } : {}),
  };

  if (Platform.OS !== 'web') {
    const result = await FileSystem.uploadAsync(endpoint, adjunto.uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'archivo',
      mimeType: adjunto.mime,
      headers,
    });
    if (result.status < 200 || result.status >= 300) {
      throwApiError(result.body, new Response(result.body, { status: result.status }));
    }
    return JSON.parse(result.body).data as Adjunto;
  }

  const fileResponse = await fetch(adjunto.uri);
  if (!fileResponse.ok) throw new Error(`No se pudo leer el archivo seleccionado (HTTP ${fileResponse.status})`);
  const blob = await fileResponse.blob();
  if (blob.size === 0) throw new Error('El archivo seleccionado está vacío o ya no está disponible.');

  const formData = new FormData();
  formData.append('archivo', blob, adjunto.nombre);
  const response = await fetch(endpoint, { method: 'POST', headers, body: formData });
  if (!response.ok) throwApiError(await response.text(), response);
  return (await response.json()).data as Adjunto;
}
