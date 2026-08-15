import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import { useBuscarBitacora } from '../../viewmodels/useSolicitudes';

interface MensajePaginacion {
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

/**
 * Búsqueda de texto sobre el historial completo de la conversación, vía el
 * endpoint de búsqueda de bitácora del backend (a diferencia del filtro
 * cliente-side anterior, encuentra coincidencias más allá de lo ya paginado
 * en pantalla). Compartido por `ConversacionChat`: navega entre coincidencias
 * scrolleando el `ScrollView` de mensajes a la posición registrada por cada
 * `MessageBubble` en su `onLayout`; si la coincidencia activa todavía no está
 * cargada en pantalla, sigue paginando hacia atrás hasta encontrarla.
 */
export function useMensajesSearch(
  solicitudId: number,
  mensajesCargados: { id: string | number }[],
  scrollViewRef: React.RefObject<ScrollView | null>,
  { hasNextPage, isFetchingNextPage, fetchNextPage }: MensajePaginacion,
) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [active, setActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const layoutsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchResults, isFetching: isSearching } = useBuscarBitacora(solicitudId, debouncedQuery);

  // El backend devuelve las coincidencias de la más nueva a la más vieja; las
  // invertimos para navegar en el mismo orden cronológico en que se pintan.
  const matchIds = useMemo(
    () => [...(searchResults ?? [])].reverse().map(m => String(m.id)),
    [searchResults],
  );

  useEffect(() => { setCurrentIndex(0); }, [matchIds]);

  const cargadosIds = useMemo(
    () => new Set(mensajesCargados.map(m => String(m.id))),
    [mensajesCargados],
  );

  const activeMatchId = matchIds.length > 0 ? matchIds[Math.min(currentIndex, matchIds.length - 1)] : null;

  // Si la coincidencia activa todavía no está en la ventana cargada, seguimos
  // paginando hacia atrás hasta encontrarla (o hasta agotar el historial).
  useEffect(() => {
    if (!activeMatchId || cargadosIds.has(activeMatchId)) return;
    if (isFetchingNextPage || !hasNextPage) return;
    fetchNextPage();
  }, [activeMatchId, cargadosIds, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!activeMatchId) return;
    const y = layoutsRef.current.get(activeMatchId);
    if (y != null) scrollViewRef.current?.scrollTo({ y: Math.max(y - 40, 0), animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMatchId, cargadosIds]);

  const goNext = useCallback(() => {
    if (matchIds.length === 0) return;
    setCurrentIndex(i => (i + 1) % matchIds.length);
  }, [matchIds.length]);

  const goPrev = useCallback(() => {
    if (matchIds.length === 0) return;
    setCurrentIndex(i => (i - 1 + matchIds.length) % matchIds.length);
  }, [matchIds.length]);

  const registerLayout = useCallback((id: string, y: number) => {
    layoutsRef.current.set(id, y);
  }, []);

  const close = useCallback(() => {
    setActive(false);
    setQuery('');
    setDebouncedQuery('');
  }, []);

  const isCurrentMatch = useCallback(
    (id: string) => activeMatchId === id,
    [activeMatchId],
  );

  return {
    query, setQuery, active, setActive, close,
    matchIds, currentIndex, goNext, goPrev, isSearching,
    registerLayout, isCurrentMatch,
  };
}
