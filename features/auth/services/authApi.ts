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
  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-app-entorno": "interno"
    },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await response.json();
  console.log("Respuesta de /auth/refresh:", data);
  return data;
}

export async function logout(refreshToken: string) {
  return fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-app-entorno": "interno"
    },
    body: JSON.stringify({ refreshToken }),
  });
}

export async function getValidAccessToken() {
  let accessToken = await SecureStore.getItemAsync("accessToken");
  if (!accessToken) return null;
  if (await isAccessTokenExpired(accessToken)) {
    console.log("Access token expirado, intentando refresh...");
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (!refreshToken) return null;
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
  }
  return accessToken;
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  let token = await getValidAccessToken();
  if (!token) throw new Error("Sesión expirada");
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  let response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    console.log("Recibido 401, intentando refrescar access token...");
    token = await getValidAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      response = await fetch(input, { ...init, headers });
    } else {
      throw new Error("Sesión expirada");
    }
  }
  return response;
}

export async function getUserContext() {
  const response = await authFetch(`${baseUrl}/auth/usuario-contexto`);
  if (!response.ok) {
    throw new Error('Error al obtener el contexto del usuario');
  }
  return await response.json();
}


