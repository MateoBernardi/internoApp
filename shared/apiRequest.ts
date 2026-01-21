// apiRequest.ts - Factory para requests de API en React Native
// Maneja automáticamente: tokens, refresh en 401, y expiración de sesión

export interface ApiConfig {
  baseUrl: string;
  entorno: string;
  getTokens: () => Promise<{ 
    access: string | null; 
    refresh: string | null;
  }>;
  setTokens: (access: string, refresh: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  onExpired: () => void;
}

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/**
 * Crea una función apiRequest configurada con los parámetros de la app móvil
 * Esta función maneja automáticamente:
 * - Inyección del access token como Bearer en headers
 * - Envío del entorno en x-app-entorno
 * - Refresh automático en caso de 401
 * - Eventos de expiración de sesión
 */
export const createApiRequest = (config: ApiConfig) => {
  return async function apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const { getTokens, setTokens, clearTokens, onExpired, baseUrl, entorno } = config;
    const tokens = await getTokens();
    const finalUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    // No establecer Content-Type si el body es FormData
    const isFormData = options.body instanceof FormData;
    
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'x-app-entorno': entorno,
      ...(options.headers as Record<string, string>),
    };

    // Agregar access token si existe
    if (tokens.access) {
      headers['Authorization'] = `Bearer ${tokens.access}`;
    }

    // Request inicial
    let response = await fetch(finalUrl, {
      ...options,
      headers,
    });

    // Manejar 401 (Token expirado) - intentar refresh
    if (response.status === 401) {
      
      if (isRefreshing && refreshPromise) {
        // Esperar a que termine el refresh en curso
        try {
          await refreshPromise;
          const newTokens = await getTokens();
          if (!newTokens.access) {
            throw new Error('Sesión expirada - por favor, inicie sesión de nuevo');
          }
          
          // Reintentar con los nuevos tokens
          const retryHeaders = {
            ...headers,
            'Authorization': `Bearer ${newTokens.access}`,
          };

          return await fetch(finalUrl, {
            ...options,
            headers: retryHeaders,
          });
        } catch (error) {
          throw error;
        }
      }

      // Iniciar nuevo refresh
      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          const currentTokens = await getTokens();
          
          if (!currentTokens.refresh) {
            throw new Error('No hay refresh token disponible');
          }

          // Request de refresh - envía el refresh token
          const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-app-entorno': entorno,
            },
            body: JSON.stringify({
              refreshToken: currentTokens.refresh,
            }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            
            if (refreshData.accessToken && refreshData.refreshToken) {
              setTokens(refreshData.accessToken, refreshData.refreshToken);
            } else {
              throw new Error('Tokens inválidos recibidos del refresh');
            }
          } else {
            // Refresh falló - limpiar tokens y disparar onExpired
            clearTokens();
            onExpired();
            throw new Error('Sesión expirada - por favor, inicie sesión de nuevo');
          }
        } catch (error) {
          clearTokens();
          onExpired();
          throw error;
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      try {
        await refreshPromise;
        
        // Reintentar después del refresh exitoso
        const newTokens = await getTokens();
        const retryHeaders = {
          ...headers,
          'Authorization': `Bearer ${newTokens.access}`,
        };

        return await fetch(finalUrl, {
          ...options,
          headers: retryHeaders,
        });
      } catch (error) {
        throw error;
      }
    }

    return response;
  };
};
