import { ApiError, apiRequest } from "../apiRequest";
import { UpdateUserRequest } from "./User";
import type { RequestVerificationTokenResponse, VerifyAndAssociateResponse } from "./UserDTO";

export async function searchUsers(accessToken: string, query: string, signal?: AbortSignal) {
  const response = await apiRequest({method: "GET", endpoint: `/usuarios/search?q=${encodeURIComponent(query)}`, token: accessToken, signal: signal});
  
  if (!response.ok) {
    throw new Error('Error searching users');
  }
  const data = await response.json();
  return data;
}

export async function getUserByRole(accessToken: string, rol_nombre: string) {
    const response = await apiRequest({method: "GET", endpoint: `/usuarios/role/${encodeURIComponent(rol_nombre)}`, token: accessToken});
    if (!response.ok) {
      throw new Error('Error getting users by role');
    }
    const data = await response.json();
    return data;
}

export async function updatePassword(accessToken: string, oldPassword: string, newPassword: string) {
  const response = await apiRequest({ method: "PUT", endpoint: `/usuarios/password`, token: accessToken, body: { oldPassword, newPassword }
  });
  
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Intenta nuevamente');
  }
  
  const data = await response.json();
  return data;
}

export async function updateUserData(accessToken: string, userData: UpdateUserRequest) {
  const response = await apiRequest({ method: "PUT", endpoint: `/usuarios`, token: accessToken, body: userData
  });
  
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Intenta nuevamente');
  }
  
  const data = await response.json();
  return data;
}

export async function updateUserRole(accessToken: string, userId: number, roleId: number) {
  const response = await apiRequest({ method: "PUT", endpoint: `/usuarios/${userId}/role`, token: accessToken, body: { roleId }
  });
  
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Intenta nuevamente');
  }
  
  const data = await response.json();
  return data;
}

/**
 * Dar de baja a un usuario (solo gerencia)
 * DELETE /usuarios/:usuarioId/baja
 */
export async function bajaUsuario(accessToken: string, userId: number) {
  const response = await apiRequest({
    method: "DELETE",
    endpoint: `/usuarios/${userId}/baja`,
    token: accessToken
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error al dar de baja usuario:', response.status, errorText);
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.message || error.error || 'Intenta nuevamente');
    } catch (e) {
      if (e instanceof Error && e.message !== errorText) throw e;
      throw new Error(errorText || 'Intenta nuevamente');
    }
  }
  
  const data = await response.json();
  return data;
}

/** Mensajes de 401 que manda el middleware de auth cuando la sesión readonly no sirve */
const SESION_INVALIDA_RE = /no autorizado|acceso inválido|sesión inválida|iniciá sesión/i;

/**
 * Indica si un error de la asociación corresponde a la sesión readonly vencida/inválida
 * (y no a un código incorrecto).
 */
export function isAsociacionSesionExpirada(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401 && error.code === "SESION_EXPIRADA";
}

/**
 * Lanza un ApiError con un mensaje claro para el flujo de asociación.
 * El backend responde `{ error }` en JSON, salvo el rate limit (429) que llega como texto plano.
 */
async function throwAsociacionError(response: Response, paso: "solicitar" | "verificar"): Promise<never> {
  const text = await response.text();
  let mensaje = text;
  try {
    const data = JSON.parse(text);
    mensaje = data?.error || "";
  } catch {
    // No era JSON (p. ej. el 429 del rate limit): se usa el texto tal cual.
  }
  console.error(`asociar (${paso}) - Status:`, response.status, "Response:", text);

  if (response.status === 429) {
    throw new ApiError("Pediste demasiados códigos. Esperá unos minutos y volvé a intentar.", 429);
  }
  if (response.status === 401) {
    if (paso === "solicitar" || SESION_INVALIDA_RE.test(mensaje)) {
      throw new ApiError("Tu sesión expiró. Iniciá sesión nuevamente.", 401, "SESION_EXPIRADA");
    }
    if (/agotaron/i.test(mensaje)) {
      throw new ApiError("Se agotaron los intentos. Pedí un código nuevo.", 401, "CODIGO_INVALIDO");
    }
    throw new ApiError("Código incorrecto o vencido. Revisá el email o pedí un código nuevo.", 401, "CODIGO_INVALIDO");
  }
  throw new ApiError(mensaje || "Intenta nuevamente", response.status);
}

/**
 * Solicitar códigos de verificación para asociar cuenta
 * PASO 1 del flujo de asociación: solo se manda el CUIT; el servidor busca las cuentas
 * y manda un código distinto al email registrado de cada una.
 */
export async function requestVerificationToken(
  accessToken: string,
  cuit: string,
  entorno: string
): Promise<RequestVerificationTokenResponse> {
  const response = await apiRequest({
    method: "POST",
    endpoint: `/asociar`,
    token: accessToken,
    body: { cuit },
    entorno: entorno,
  });

  if (!response.ok) {
    await throwAsociacionError(response, "solicitar");
  }

  const data = await response.json();
  return data;
}

/**
 * Verificar código y completar asociación
 * PASO 2 del flujo de asociación: el servidor asocia la cuenta a la que se envió ese código.
 */
export async function verifyAndAssociateAccount(
  accessToken: string,
  token: string,
  entorno: string
): Promise<VerifyAndAssociateResponse> {
  const response = await apiRequest({
    method: "POST",
    endpoint: `/asociar/verify`,
    token: accessToken,
    body: { token },
    entorno: entorno,
  });

  if (!response.ok) {
    await throwAsociacionError(response, "verificar");
  }

  const data = await response.json();
  return data;
}

/**
 * Generar token para recuperación de contraseña
 * Se envía email y se obtiene un token que será enviado al correo
 */
export async function generatePasswordToken(email: string) {
  const response = await apiRequest({
    method: "PUT",
    endpoint: `/usuarios/forgot-password`,
    token: "",
    body: { email },
  });

  if (!response.ok) {
    const textResponse = await response.text();
    console.error("generatePasswordToken - Status:", response.statusText, "Response:", textResponse);
    try {
      const error = JSON.parse(textResponse);
      throw new Error(error.message || error.error || 'Intenta nuevamente');
    } catch (e) {
      throw new Error(textResponse || 'Intenta nuevamente');
    }
  }

  const data = await response.json();
  return data;
}

/**
 * Validar token de recuperación de contraseña
 * Devuelve un access token readonly que se usa para cambiar la contraseña
 */
export async function validatePasswordToken(email: string, token: string) {
  const response = await apiRequest({
    method: "PUT",
    endpoint: `/usuarios/forgot-password/token`,
    token: "",
    body: { email, token },
  });

  if (!response.ok) {
    const textResponse = await response.text();
    console.error("validatePasswordToken - Status:", response.statusText, "Response:", textResponse);
    try {
      const error = JSON.parse(textResponse);
      throw new Error(error.message || error.error || 'Intenta nuevamente');
    } catch (e) {
      throw new Error(textResponse || 'Intenta nuevamente');
    }
  }

  const data = await response.json();
  return data;
}

/**
 * Cambiar contraseña usando token de acceso readonly
 * Requiere accessToken con rol readonly (obtenido del paso anterior)
 */
export async function changePasswordWithToken(accessToken: string, newPassword: string) {
  const response = await apiRequest({
    method: "PUT",
    endpoint: `/usuarios/change-password`,
    token: accessToken,
    body: { newPassword },
  });

  if (!response.ok) {
    const textResponse = await response.text();
    console.error("changePasswordWithToken - Status:", response.statusText, "Response:", textResponse);
    try {
      const error = JSON.parse(textResponse);
      throw new Error(error.message || error.error || 'Intenta nuevamente');
    } catch (e) {
      throw new Error(textResponse || 'Intenta nuevamente');
    }
  }

  const data = await response.json();
  return data;
}





