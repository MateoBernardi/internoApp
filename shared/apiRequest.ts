import Constants from "expo-constants";

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL;

/**
 * Factory funtion for API requests.
 * @param method HTTP Method (GET, POST, PUT, DELETE, etc.)
 * @param endpoint The URL endpoint (e.g., "/novedades"). Should start with /.
 * @param accessToken The Bearer token for authorization. 
 * @param body The data to send in the request body (automatically stringified).
 */
export async function apiRequest(
  method: string,
  endpoint: string,
  accessToken: string | null = null,
  body?: any
): Promise<Response> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "x-app-entorno": "interno",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  
  return fetch(fullUrl, options);
}
