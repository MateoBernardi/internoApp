import { apiRequest } from '@/shared/apiRequest';
import type { ApiOperationResult, ApiOperationStatus, ApiWarningDetail } from '@/shared/types/apiStatus';
import {
    Carpeta,
    CarpetaView,
    CreateCarpetaPayload,
    ListarCarpetasResponse,
    UpdateCarpetaPayload,
} from '../models/Carpeta';
import type { ResourcePermisos } from '../models/Permisos';

export type DocsApiError = Error & {
  status: ApiOperationStatus;
  statusCode: number;
};

const parseWarnings = (body: any): ApiWarningDetail[] => {
  if (!body) return [];

  if (Array.isArray(body.warnings)) {
    return body.warnings;
  }

  if (body.warnings && typeof body.warnings === 'object') {
    return [body.warnings];
  }

  if (body.invalid_roles || body.invalid_users || body.reason) {
    return [
      {
        invalid_roles: body.invalid_roles,
        invalid_users: body.invalid_users,
        reason: body.reason,
      },
    ];
  }

  return [];
};

const parseBody = async (response: Response) => {
  const raw = await response.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
};

const buildApiError = (statusCode: number, fallbackMessage: string, body: any): DocsApiError => {
  const message = body?.message || body?.error || fallbackMessage;
  let status: ApiOperationStatus = 'error';

  if (statusCode === 403) status = 'forbidden';
  if (statusCode === 409) status = 'conflict';
  if (statusCode === 400) status = 'validation_error';

  const err = new Error(message) as DocsApiError;
  err.status = status;
  err.statusCode = statusCode;
  return err;
};

const parseApiError = async (response: Response) => {
  const body = await parseBody(response);

  if (response.status === 403) {
    throw buildApiError(response.status, 'No tenes permisos para esta operacion', body);
  }

  if (response.status === 404) {
    throw buildApiError(response.status, 'Recurso no encontrado', body);
  }

  if (response.status === 409) {
    throw buildApiError(
      response.status,
      'No se puede borrar la carpeta. Primero move el contenido de otros creadores y luego borra.',
      body
    );
  }

  if (response.status === 400) {
    throw buildApiError(response.status, 'Revisa los datos enviados e intenta nuevamente', body);
  }

  throw buildApiError(response.status, response.statusText, body);
};

const normalizeCarpeta = (item: Carpeta): Carpeta => ({
  ...item,
  children: item.children?.map(normalizeCarpeta) ?? [],
});

export async function fetchCarpetas(
  accessToken: string,
  view: CarpetaView = 'tree',
  includeSinCarpeta = true
): Promise<ListarCarpetasResponse> {
  const response = await apiRequest({
    method: 'GET',
    endpoint: `/carpetas?view=${view}&includeSinCarpeta=${includeSinCarpeta ? 'true' : 'false'}`,
    token: accessToken,
  });

  if (!response.ok) {
    await parseApiError(response);
  }

  const data: ListarCarpetasResponse = await response.json();
  return {
    ...data,
    items: (data.items || []).map(normalizeCarpeta),
  };
}

export async function createCarpeta(accessToken: string, payload: CreateCarpetaPayload): Promise<Carpeta> {
  const response = await apiRequest({ method: 'POST', endpoint: '/carpetas', token: accessToken, body: payload });

  if (!response.ok) {
    await parseApiError(response);
  }

  const data: Carpeta = await response.json();
  return normalizeCarpeta(data);
}

export async function updateCarpeta(
  accessToken: string,
  id: number,
  payload: UpdateCarpetaPayload
): Promise<ApiOperationResult<Carpeta>> {
  const response = await apiRequest({ method: 'PUT', endpoint: `/carpetas/${id}`, token: accessToken, body: payload });

  if (!response.ok) {
    await parseApiError(response);
  }

  const body = await parseBody(response);
  const data: Carpeta = body?.carpeta || body?.resource || body?.data || body;

  return {
    status: response.status === 207 ? 'partial_success' : 'success',
    statusCode: response.status,
    data: normalizeCarpeta(data),
    message: body?.message,
    warnings: parseWarnings(body),
  };
}

export async function deleteCarpeta(accessToken: string, id: number): Promise<ApiOperationResult<null>> {
  const response = await apiRequest({ method: 'DELETE', endpoint: `/carpetas/${id}`, token: accessToken });

  if (!response.ok) {
    await parseApiError(response);
  }

  const body = await parseBody(response);
  return {
    status: 'success',
    statusCode: response.status,
    data: null,
    message: body?.message,
  };
}

export async function getCarpetaPermisos(accessToken: string, id: number): Promise<ResourcePermisos> {
  const response = await apiRequest({ method: 'GET', endpoint: `/carpetas/${id}/permisos`, token: accessToken });

  if (!response.ok) {
    const body = await parseBody(response);
    if (response.status === 403) {
      throw buildApiError(response.status, 'Solo el creador puede ver los permisos completos', body);
    }
    throw buildApiError(response.status, response.statusText, body);
  }

  const data = await parseBody(response);
  return data?.data || data;
}
