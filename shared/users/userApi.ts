import { apiRequest } from "../apiRequest";
import { UpdateUserRequest } from "./User";
import type { CuentaDisponibleDTO, ObtenerCuentasResponse, RequestVerificationTokenResponse, VerifyAndAssociateResponse } from "./UserDTO";

export async function searchUsers(accessToken: string, query: string, signal?: AbortSignal) {
  console.log("Buscando usuarios con query:", query);
  const response = await apiRequest({method: "GET", endpoint: `/usuarios/search?q=${encodeURIComponent(query)}`, token: accessToken, signal: signal});
  
  if (!response.ok) {
    throw new Error('Error searching users');
  }
  const data = await response.json();
  console.log("Resultados búsqueda:", data);
  return data;
}

export async function getUserByRole(accessToken: string, rol_nombre: string) {
    const response = await apiRequest({method: "GET", endpoint: `/usuarios/role/${encodeURIComponent(rol_nombre)}`, token: accessToken});
    if (!response.ok) {
      throw new Error('Error getting users by role');
    }
    console.log("Se buscó el rol:", rol_nombre);
    const data = await response.json();
    console.log("Usuarios por rol:", data);
    return data;
}

export async function updatePassword(accessToken: string, oldPassword: string, newPassword: string) {
  const response = await apiRequest({ method: "PUT", endpoint: `/usuarios/password`, token: accessToken, body: { oldPassword, newPassword }
  });
  
  if (!response.ok) {
    throw new Error('Error al actualizar contraseña');
  }
  
  const data = await response.json();
  return data;
}

export async function updateUserData(accessToken: string, userData: UpdateUserRequest) {
  const response = await apiRequest({ method: "PUT", endpoint: `/usuarios`, token: accessToken, body: userData
  });
  
  if (!response.ok) {
    throw new Error('Error al actualizar usuario');
  }
  
  const data = await response.json();
  return data;
}

export async function updateUserRole(accessToken: string, userId: number, roleId: number) {
  const response = await apiRequest({ method: "PUT", endpoint: `/usuarios/${userId}/role`, token: accessToken, body: { roleId }
  });
  
  if (!response.ok) {
    throw new Error('Error al actualizar rol del usuario');
  }
  
  const data = await response.json();
  return data;
}

/**
 * Obtener cuentas disponibles para asociar
 * Requiere accessToken con rol readonly y requiresAssociation=true
 */
export async function obtenerCuentasDisponibles(accessToken: string, cuit: string, entorno: string): Promise<ObtenerCuentasResponse> {
  console.log("📋 obtenerCuentasDisponibles - Buscando cuentas para CUIT:", cuit);
  const response = await apiRequest({
    method: "GET",
    endpoint: `/asociar?cuit=${encodeURIComponent(cuit)}`,
    token: accessToken,
    entorno: entorno,
  });

  if (!response.ok) {
    const textResponse = await response.text();
    console.error("❌ obtenerCuentasDisponibles - Status:", response.statusText, "Response:", textResponse);
    try {
      const error = JSON.parse(textResponse);
      throw new Error(error.error || 'Error al obtener cuentas disponibles');
    } catch (e) {
      throw new Error(textResponse || 'Error al obtener cuentas disponibles');
    }
  }

  const data = await response.json();
  console.log("✅ obtenerCuentasDisponibles - Cuentas encontradas");
  console.log(`   Success: ${data.success}`);
  console.log(`   Total: ${data.total}`);
  console.log(`   CUIT: ${data.cuit}`);
  console.log(`   Entorno: ${data.entorno}`);
  console.log(`   Cantidad de cuentas: ${data.cuentas?.length || 0}`);
  console.log(`   Respuesta completa:`, JSON.stringify(data, null, 2));
  return data;
}

/**
 * Solicitar token de verificación para asociar cuenta
 * PASO 1 del flujo de asociación
 */
export async function requestVerificationToken(
  accessToken: string,
  cuenta: CuentaDisponibleDTO,
  entorno: string
): Promise<RequestVerificationTokenResponse> {
  console.log("📧 requestVerificationToken - Solicitando token para cuenta:", cuenta);
  const response = await apiRequest({
    method: "POST",
    endpoint: `/asociar`,
    token: accessToken,
    body: { cuenta },
    entorno: entorno,
  });

  if (!response.ok) {
    const textResponse = await response.text();
    console.error("❌ requestVerificationToken - Status:", response.statusText, "Response:", textResponse);
    try {
      const error = JSON.parse(textResponse);
      throw new Error(error.error || 'Error al enviar token de verificación');
    } catch (e) {
      throw new Error(textResponse || 'Error al enviar token de verificación');
    }
  }

  const data = await response.json();
  console.log("✅ requestVerificationToken - Token enviado a:", data.contact);
  return data;
}

/**
 * Verificar token y completar asociación
 * PASO 2 del flujo de asociación
 */
export async function verifyAndAssociateAccount(
  accessToken: string,
  cuenta: CuentaDisponibleDTO,
  token: string,
  entorno: string
): Promise<VerifyAndAssociateResponse> {
  console.log("🔐 verifyAndAssociateAccount - Verificando token y asociando cuenta:", cuenta);
  const response = await apiRequest({
    method: "POST",
    endpoint: `/asociar/verify`,
    token: accessToken,
    body: { cuenta, token },
    entorno: entorno,
  });

  if (!response.ok) {
    const textResponse = await response.text();
    console.error("❌ verifyAndAssociateAccount - Status:", response.statusText, "Response:", textResponse);
    try {
      const error = JSON.parse(textResponse);
      throw new Error(error.message || error.error || 'Error al verificar y asociar cuenta');
    } catch (e) {
      throw new Error(textResponse || 'Error al verificar y asociar cuenta');
    }
  }

  const data = await response.json();
  console.log("✅ verifyAndAssociateAccount - Cuenta asociada correctamente");
  return data;
}

/**
 * Generar token para recuperación de contraseña
 * Se envía email y se obtiene un token que será enviado al correo
 */
export async function generatePasswordToken(email: string) {
  console.log("📧 generatePasswordToken - Generando token para email:", email);
  const response = await apiRequest({
    method: "PUT",
    endpoint: `/usuarios/forgot-password`,
    token: "",
    body: { email },
  });

  if (!response.ok) {
    const textResponse = await response.text();
    console.error("❌ generatePasswordToken - Status:", response.statusText, "Response:", textResponse);
    try {
      const error = JSON.parse(textResponse);
      throw new Error(error.message || error.error || 'Error al generar token');
    } catch (e) {
      throw new Error(textResponse || 'Error al generar token');
    }
  }

  const data = await response.json();
  console.log("✅ generatePasswordToken - Token generado y enviado");
  return data;
}

/**
 * Validar token de recuperación de contraseña
 * Devuelve un access token readonly que se usa para cambiar la contraseña
 */
export async function validatePasswordToken(email: string, token: string) {
  console.log("🔐 validatePasswordToken - Validando token");
  const response = await apiRequest({
    method: "PUT",
    endpoint: `/usuarios/forgot-password/token`,
    token: "",
    body: { email, token },
  });

  if (!response.ok) {
    const textResponse = await response.text();
    console.error("❌ validatePasswordToken - Status:", response.statusText, "Response:", textResponse);
    try {
      const error = JSON.parse(textResponse);
      throw new Error(error.message || error.error || 'Token inválido o expirado');
    } catch (e) {
      throw new Error(textResponse || 'Token inválido o expirado');
    }
  }

  const data = await response.json();
  console.log("✅ validatePasswordToken - Token validado");
  return data;
}

/**
 * Cambiar contraseña usando token de acceso readonly
 * Requiere accessToken con rol readonly (obtenido del paso anterior)
 */
export async function changePasswordWithToken(accessToken: string, newPassword: string) {
  console.log("🔄 changePasswordWithToken - Cambiando contraseña");
  const response = await apiRequest({
    method: "PUT",
    endpoint: `/usuarios/change-password`,
    token: accessToken,
    body: { newPassword },
  });

  if (!response.ok) {
    const textResponse = await response.text();
    console.error("❌ changePasswordWithToken - Status:", response.statusText, "Response:", textResponse);
    try {
      const error = JSON.parse(textResponse);
      throw new Error(error.message || error.error || 'Error al cambiar contraseña');
    } catch (e) {
      throw new Error(textResponse || 'Error al cambiar contraseña');
    }
  }

  const data = await response.json();
  console.log("✅ changePasswordWithToken - Contraseña cambiada exitosamente");
  return data;
}





