import { apiRequest } from "@/shared/apiRequest";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const baseUrl = Constants.expoConfig?.extra?.API_BASE_URL;

function decodeJWT(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

async function isAccessTokenExpired(token: string): Promise<boolean> {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + 10;
}

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
  console.log("Llamando a /auth/refresh con refreshToken", refreshToken);
  // User requested refreshToken in body
  const response = await apiRequest("POST", "/auth/refresh", null, { refreshToken });
  const data = await response.json();
  console.log("Respuesta de /auth/refresh:", data);
  return data;
}

export async function logout(refreshToken: string) {
  return apiRequest("POST", "/auth/logout", null, { refreshToken });
}

export async function getValidAccessToken() {
  let accessToken = await SecureStore.getItemAsync("accessToken");
  if (!accessToken) return null;
  if (await isAccessTokenExpired(accessToken)) {
    console.log("Access token expirado, intentando refresh...");
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (!refreshToken) return null;
    
    try {
      const data = await refresh(refreshToken);
      if (data.accessToken && data.refreshToken) {
        await SecureStore.setItemAsync("accessToken", data.accessToken);
        await SecureStore.setItemAsync("refreshToken", data.refreshToken);
        accessToken = data.accessToken;
        console.log("Access token refrescado correctamente");
      } else {
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
        console.log("Refresh token inválido o expirado, sesión cerrada");
        return null;
      }
    } catch (e) {
      console.error("Error during refresh:", e);
      return null;
    }
  }
  return accessToken;
}

export async function getUserContext(accessToken: string) {
  const response = await apiRequest("GET", "/auth/usuario-contexto", accessToken);
  if (!response.ok) {
    throw new Error('Error al obtener el contexto del usuario');
  }
  return await response.json();
}


