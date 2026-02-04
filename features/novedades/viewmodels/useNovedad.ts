import { useAuth } from '@/features/auth/context/AuthContext';
import { useCallback, useState } from 'react';
import type { Novedad } from '../models/Novedades';
import * as novedadesApi from '../services/novedadesApi';

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
  const { tokens } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obtener todas las novedades
   */
  const obtenerNovedades = useCallback(async (): Promise<{ success: boolean; data?: Novedad[]; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = tokens?.accessToken;
      if(!token) throw new Error('No hay token de acceso');
      const novedades = await novedadesApi.fetchNovedades(token);
      
      setIsLoading(false);
      return { success: true, data: novedades };
    } catch (err: any) {
      const errorMsg = err.message || 'Error al obtener las novedades';
      setError(errorMsg);
      setIsLoading(false);
      console.error('Error en obtenerNovedades:', err);
      return { success: false, error: errorMsg };
    }
  }, [tokens]);

  /**
   * Crear una nueva novedad
   */
  const crearNovedad = useCallback(
    async (novedadData: Novedad): Promise<{ success: boolean; data?: Novedad; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const token = tokens?.accessToken;
        if(!token) throw new Error('No hay token de acceso');
        const nuevaNovedad = await novedadesApi.crearNovedad(novedadData, token);
        
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
    [tokens]
  );

  /**
   * Actualizar una novedad existente
   */
  const actualizarNovedad = useCallback(
    async (novedadData: Novedad): Promise<{ success: boolean; data?: Novedad; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const token = tokens?.accessToken;
        if(!token) throw new Error('No hay token de acceso');
        const novedadActualizada = await novedadesApi.actualizarNovedad(novedadData, token);
        
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
    [tokens]
  );

  /**
   * Eliminar una novedad
   */
  const eliminarNovedad = useCallback(
    async (id: number): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const token = tokens?.accessToken;
        if(!token) throw new Error('No hay token de acceso');
        await novedadesApi.eliminarNovedad(id, token);
        
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
    [tokens]
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
