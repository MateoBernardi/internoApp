import { createApiRequest } from '@/shared/apiRequest';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useState } from 'react';
import type { Novedad } from '../models/Novedades';
import * as novedadesApi from '../services/novedadesApi';

const TOKEN_KEYS = {
  ACCESS: 'accessToken',
  REFRESH: 'refreshToken',
};

const BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:3000';
const ENTORNO = 'interno';

/**
 * Hook para gestionar las operaciones de Novedades
 * 
 * Proporciona métodos para:
 * - Obtener todas las novedades
 * - Crear una nueva novedad
 * - Actualizar una novedad existente
 * - Eliminar una novedad
 * 
 * Incluye manejo de estados de carga y errores
 */
export function useNovedad() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Crear instancia de apiRequest configurada
   * IMPORTANTE: getTokens siempre lee desde SecureStore
   */
  const createApiRequestInstance = useCallback(() => {
    return createApiRequest({
      baseUrl: BASE_URL,
      entorno: ENTORNO,
      getTokens: async () => {
        // SIEMPRE leer tokens actuales desde SecureStore
        const [access, refresh] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEYS.ACCESS),
          SecureStore.getItemAsync(TOKEN_KEYS.REFRESH),
        ]);
        return { access, refresh };
      },
      setTokens: async (newAccess: string, newRefresh: string) => {
        await Promise.all([
          SecureStore.setItemAsync(TOKEN_KEYS.ACCESS, newAccess),
          SecureStore.setItemAsync(TOKEN_KEYS.REFRESH, newRefresh),
        ]);
      },
      clearTokens: async () => {
        await Promise.all([
          SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS),
          SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH),
        ]);
      },
      onExpired: () => {
        // Aquí podrías agregar lógica adicional cuando expira la sesión
        console.warn('Sesión expirada al intentar acceder a novedades');
      },
    });
  }, []);

  /**
   * Obtener todas las novedades
   */
  const obtenerNovedades = useCallback(async (): Promise<{ success: boolean; data?: Novedad[]; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiRequest = createApiRequestInstance();
      const novedades = await novedadesApi.fetchNovedades(apiRequest);
      
      setIsLoading(false);
      return { success: true, data: novedades };
    } catch (err: any) {
      const errorMsg = err.message || 'Error al obtener las novedades';
      setError(errorMsg);
      setIsLoading(false);
      console.error('Error en obtenerNovedades:', err);
      return { success: false, error: errorMsg };
    }
  }, [createApiRequestInstance]);

  /**
   * Crear una nueva novedad
   */
  const crearNovedad = useCallback(
    async (novedadData: Novedad): Promise<{ success: boolean; data?: Novedad; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const apiRequest = createApiRequestInstance();
        const nuevaNovedad = await novedadesApi.crearNovedad(novedadData, apiRequest);
        
        setIsLoading(false);
        return { success: true, data: nuevaNovedad };
      } catch (err: any) {
        const errorMsg = err.message || 'Error al crear la novedad';
        setError(errorMsg);
        setIsLoading(false);
        console.error('Error en crearNovedad:', err);
        return { success: false, error: errorMsg };
      }
    },
    [createApiRequestInstance]
  );

  /**
   * Actualizar una novedad existente
   */
  const actualizarNovedad = useCallback(
    async (novedadData: Novedad): Promise<{ success: boolean; data?: Novedad; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const apiRequest = createApiRequestInstance();
        const novedadActualizada = await novedadesApi.actualizarNovedad(novedadData, apiRequest);
        
        setIsLoading(false);
        return { success: true, data: novedadActualizada };
      } catch (err: any) {
        const errorMsg = err.message || 'Error al actualizar la novedad';
        setError(errorMsg);
        setIsLoading(false);
        console.error('Error en actualizarNovedad:', err);
        return { success: false, error: errorMsg };
      }
    },
    [createApiRequestInstance]
  );

  /**
   * Eliminar una novedad
   */
  const eliminarNovedad = useCallback(
    async (id: number): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const apiRequest = createApiRequestInstance();
        await novedadesApi.eliminarNovedad(id, apiRequest);
        
        setIsLoading(false);
        return { success: true };
      } catch (err: any) {
        const errorMsg = err.message || 'Error al eliminar la novedad';
        setError(errorMsg);
        setIsLoading(false);
        console.error('Error en eliminarNovedad:', err);
        return { success: false, error: errorMsg };
      }
    },
    [createApiRequestInstance]
  );

  return {
    isLoading,
    error,
    obtenerNovedades,
    crearNovedad,
    actualizarNovedad,
    eliminarNovedad,
  };
}
