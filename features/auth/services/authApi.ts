import { apiRequest } from "@/shared/apiRequest";
import { CreateUserData, CreateUserResponse, UserContext } from "@/shared/users/User";
import Constants from "expo-constants";

const baseUrl = Constants.expoConfig?.extra?.API_BASE_URL;

export async function login(username: string, password: string) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-app-entorno": "interno"
    },
    body: JSON.stringify({ username, password }),
  });
  return await response.json();
}

export async function refresh(refreshToken: string) {
  // User requested refreshToken in body
  const response = await apiRequest({method: "POST", endpoint: "/auth/refresh", token:'', body: { refreshToken }});
  const data = await response.json();
  console.log("Respuesta de /auth/refresh:", data);
  return data;
}

export async function logout(refreshToken: string) {
  return apiRequest({method: "POST", endpoint: "/auth/logout", token:'', body: { refreshToken }});
}

export async function getUserContext(accessToken: string): Promise<UserContext> {
  const response = await apiRequest({method: "GET", endpoint: "/auth/usuario-contexto", token: accessToken});
  if (!response.ok) {
    throw new Error('Error al obtener el contexto del usuario');
  }
  return await response.json();
}

/**
 * Registrar un nuevo usuario
 * Esta ruta NO requiere autenticación
 */
export async function registerUser(
  userData: CreateUserData
): Promise<CreateUserResponse> {
  const response = await fetch(`${baseUrl}/usuarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });

  const data: CreateUserResponse = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error al crear el usuario');
  }

  return data;
}





