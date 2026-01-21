import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { AuthTokens } from "../models/AuthTokens";
import { login, logout, refresh } from "../services/authApi";

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
  // exp está en segundos
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + 10; // margen de 10s
}

export function useAuth() {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);

  async function handleLogin(user: string, pass: string) {
    const data = await login(user, pass);
    if (data.accessToken && data.refreshToken) {
      const newTokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
      setTokens(newTokens);
      await SecureStore.setItemAsync("accessToken", newTokens.accessToken);
      await SecureStore.setItemAsync("refreshToken", newTokens.refreshToken);
      return true;
    }
    return false;
  }

  async function handleRefresh() {
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (!refreshToken) return false;
    const data = await refresh(refreshToken);
    if (data.accessToken && data.refreshToken) {
      const newTokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
      setTokens(newTokens);
      await SecureStore.setItemAsync("accessToken", newTokens.accessToken);
      await SecureStore.setItemAsync("refreshToken", newTokens.refreshToken);
      return true;
    } else {
      // Si el refresh falla, cerrar sesión
      await handleLogout();
      return false;
    }
  }
  // Función para obtener un accessToken válido automáticamente
  async function getValidAccessToken() {
    let accessToken = await SecureStore.getItemAsync("accessToken");
    if (!accessToken) return null;
    if (await isAccessTokenExpired(accessToken)) {
      const refreshed = await handleRefresh();
      if (!refreshed) return null;
      accessToken = await SecureStore.getItemAsync("accessToken");
    }
    return accessToken;
  }

  async function handleLogout() {
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (refreshToken) await logout(refreshToken);
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    setTokens(null);
  }

  async function authFetch(input: RequestInfo, init: RequestInit = {}) {
    let token = await getValidAccessToken();
    if (!token) throw new Error("Sesión expirada");
    // Clonar headers o crear nuevos
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    const response = await fetch(input, { ...init, headers });
    // Si el token expiró en el medio y el backend devuelve 401, intentar refrescar una vez
    if (response.status === 401) {
      const refreshed = await handleRefresh();
      if (refreshed) {
        token = await SecureStore.getItemAsync("accessToken");
        headers.set('Authorization', `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      } else {
        throw new Error("Sesión expirada");
      }
    }
    return response;
  }

  return { tokens, handleLogin, handleRefresh, handleLogout, getValidAccessToken, authFetch };
}
