import Constants from "expo-constants";

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL;
const AUTH_RETRY_EXCLUDED_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
]);

let reactiveRefreshPromise: Promise<void> | null = null;

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  token: string;
  body?: any;      // Opcional
  signal?: AbortSignal; // Opcional
  entorno?: string; // Opcional, por defecto es "interno"
}

async function getAuthSessionService() {
  const module = await import('@/features/auth/services/AuthSessionService');
  return module.authSessionService;
}

async function ensureReactiveRefreshSingleFlight(): Promise<boolean> {
  if (!reactiveRefreshPromise) {
    reactiveRefreshPromise = (async () => {
      const authSessionService = await getAuthSessionService();
      await authSessionService.refreshTokens('reactive:401');
    })().finally(() => {
      reactiveRefreshPromise = null;
    });
  }

  try {
    await reactiveRefreshPromise;
    return true;
  } catch {
    return false;
  }
}

async function getLatestAccessToken(): Promise<string | null> {
  const authSessionService = await getAuthSessionService();
  return authSessionService.getSnapshot().tokens?.accessToken ?? null;
}

function shouldUseReactiveRetry(endpoint: string, token: string): boolean {
  if (!token) {
    return false;
  }

  return !AUTH_RETRY_EXCLUDED_ENDPOINTS.has(endpoint);
}

function isAuthStatus(status: number): boolean {
  return status === 401 || status === 403;
}

function buildRequestInit(
  method: RequestOptions['method'],
  token: string,
  body: RequestOptions['body'],
  signal?: AbortSignal,
  entorno = 'interno'
): RequestInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-app-entorno': entorno,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (signal) {
    options.signal = signal;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  return options;
}

/**
 * Factory funtion for API requests.
 * @param method HTTP Method (GET, POST, PUT, DELETE, etc.)
 * @param endpoint The URL endpoint (e.g., "/novedades"). Should start with /.
 * @param accessToken The Bearer token for authorization. 
 * @param body The data to send in the request body (automatically stringified).
 * @param entorno El entorno a enviar en el header x-app-entorno (default: "interno").
 */
export async function apiRequest({
  method,
  endpoint,
  token,
  body,
  signal,
  entorno = "interno",
}: RequestOptions): Promise<Response> {
  const fullUrl = `${API_BASE_URL}${endpoint}`;

  const executeFetch = async (activeToken: string): Promise<Response> => {
    const options = buildRequestInit(method, activeToken, body, signal, entorno);
    return fetch(fullUrl, options);
  };

  try {
    const response = await executeFetch(token);

    const canRetryReactively = shouldUseReactiveRetry(endpoint, token);
    if (!canRetryReactively || !isAuthStatus(response.status)) {
      return response;
    }

    console.warn('[AuthReactive] Received auth status on non-auth endpoint. Trying one reactive refresh.', {
      endpoint,
      status: response.status,
    });

    const refreshSucceeded = await ensureReactiveRefreshSingleFlight();
    if (!refreshSucceeded) {
      return response;
    }

    const latestAccessToken = await getLatestAccessToken();
    if (!latestAccessToken) {
      return response;
    }

    const retryResponse = await executeFetch(latestAccessToken);
    if (isAuthStatus(retryResponse.status)) {
      console.warn('[AuthReactive] Retry after reactive refresh still returned auth status.', {
        endpoint,
        status: retryResponse.status,
      });
    }

    return retryResponse;
  } catch (error: any) {
    if (error?.message?.toLowerCase().includes('network request failed')) {
      throw new Error('Error desconocido. Intentá nuevamente en unos minutos.');
    }
    throw error;
  }
}
