import { useAuth } from '@/features/auth/context/AuthContext';
import { IDEMPOTENT_MUTATION_RETRY } from '@/shared/idempotency';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/historiasApi';

export const historiasKeys = {
  all: ['historias'] as const,
  lista: () => [...historiasKeys.all, 'lista'] as const,
  detalle: (id: string) => [...historiasKeys.all, 'detalle', id] as const,
};

export const analiticaKeys = {
  all: ['historias-analitica'] as const,
  palabras: () => [...analiticaKeys.all, 'palabras'] as const,
  menciones: () => [...analiticaKeys.all, 'menciones'] as const,
  grafo: () => [...analiticaKeys.all, 'grafo'] as const,
  actividad: () => [...analiticaKeys.all, 'actividad'] as const,
  personaPalabras: (id: number) => [...analiticaKeys.all, 'persona', id, 'palabras'] as const,
};


/** Historias visibles, paginadas por keyset (`nextCursor` = último `ultima_actividad`). */
export function useHistorias() {
  const { tokens } = useAuth();
  return useInfiniteQuery({
    queryKey: historiasKeys.lista(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      if (!tokens?.accessToken) throw new Error('No hay token de acceso');
      return api.listarHistorias(tokens.accessToken, pageParam, signal);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!tokens?.accessToken,
  });
}

export function useHistoria(id: string | undefined) {
  const { tokens } = useAuth();
  return useQuery({
    queryKey: historiasKeys.detalle(id ?? ''),
    queryFn: ({ signal }) => {
      if (!tokens?.accessToken) throw new Error('No hay token de acceso');
      return api.obtenerHistoria(tokens.accessToken, id as string, signal);
    },
    enabled: !!tokens?.accessToken && !!id,
  });
}

export function useCrearHistoria(idempotencyKey: string) {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cuerpo: string) => {
      if (!tokens?.accessToken) throw new Error('No hay token de acceso');
      return api.crearHistoria(tokens.accessToken, cuerpo, idempotencyKey);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: historiasKeys.lista() }),
    ...IDEMPOTENT_MUTATION_RETRY,
  });
}

export function useAgregarMensaje(historiaId: string, idempotencyKey: string) {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cuerpo: string) => {
      if (!tokens?.accessToken) throw new Error('No hay token de acceso');
      return api.agregarMensaje(tokens.accessToken, historiaId, cuerpo, idempotencyKey);
    },
    // La respuesta no trae el mapa de personas (nuevas menciones): se refetchea el detalle.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: historiasKeys.detalle(historiaId) });
      queryClient.invalidateQueries({ queryKey: historiasKeys.lista() });
    },
    ...IDEMPOTENT_MUTATION_RETRY,
  });
}

export function useCerrarHistoria(historiaId: string, idempotencyKey: string) {
  const { tokens } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!tokens?.accessToken) throw new Error('No hay token de acceso');
      return api.cerrarHistoria(tokens.accessToken, historiaId, idempotencyKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: historiasKeys.detalle(historiaId) });
      queryClient.invalidateQueries({ queryKey: historiasKeys.lista() });
    },
    ...IDEMPOTENT_MUTATION_RETRY,
  });
}

// --- Analítica (solo gerencia / personasRelaciones; el backend lo exige) ---

function useAnaliticaQuery<T>(queryKey: readonly unknown[], fn: (token: string) => Promise<T>, enabled = true) {
  const { tokens } = useAuth();
  return useQuery({
    queryKey,
    queryFn: () => {
      if (!tokens?.accessToken) throw new Error('No hay token de acceso');
      return fn(tokens.accessToken);
    },
    enabled: enabled && !!tokens?.accessToken,
    staleTime: 1000 * 60 * 5, // las vistas se refrescan cada hora
  });
}

export const usePalabras = () => useAnaliticaQuery(analiticaKeys.palabras(), api.getPalabras);
export const usePersonasMencionadas = () =>
  useAnaliticaQuery(analiticaKeys.menciones(), api.getPersonasMencionadas);
export const useGrafoMenciones = () => useAnaliticaQuery(analiticaKeys.grafo(), api.getGrafo);
export const useActividadSemanal = () => useAnaliticaQuery(analiticaKeys.actividad(), api.getActividad);
export const usePalabrasDePersona = (personaId: number | null) =>
  useAnaliticaQuery(
    analiticaKeys.personaPalabras(personaId ?? 0),
    (token) => api.getPalabrasDePersona(token, personaId as number),
    personaId !== null,
  );
