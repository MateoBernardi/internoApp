import Constants from "expo-constants";

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface RequestOptions {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    endpoint: string;
    token: string;
    body?: any;      // Opcional
    signal?: AbortSignal; // Opcional
}

/**
 * Factory funtion for API requests.
 * @param method HTTP Method (GET, POST, PUT, DELETE, etc.)
 * @param endpoint The URL endpoint (e.g., "/novedades"). Should start with /.
 * @param accessToken The Bearer token for authorization. 
 * @param body The data to send in the request body (automatically stringified).
 */
export async function apiRequest({
  method,
  endpoint,
  token,
  body,
  signal,
}: RequestOptions): Promise<Response> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "x-app-entorno": "interno",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if(signal) {
    options.signal = signal;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  
  return fetch(fullUrl, options);
}
