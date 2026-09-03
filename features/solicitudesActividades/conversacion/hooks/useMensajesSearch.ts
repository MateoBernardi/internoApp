import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ScrollView } from 'react-native';
import { useBuscarBitacora } from '../../viewmodels/useSolicitudes';
import { useMessageJump } from './useMessageJump';

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
 * reusando `useMessageJump` para scrollear hasta la coincidencia activa,
 * paginando hacia atrás si todavía no está cargada.
 */
export function useMensajesSearch(
  solicitudId: number,
  mensajesCargados: { id: string | number }[],
  scrollViewRef: React.RefObject<ScrollView | null>,
  pagination: MensajePaginacion,
) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [active, setActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { registerLayout, jumpTo } = useMessageJump(mensajesCargados, scrollViewRef, pagination);

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

  const activeMatchId = matchIds.length > 0 ? matchIds[Math.min(currentIndex, matchIds.length - 1)] : null;

  useEffect(() => {
    if (activeMatchId) jumpTo(activeMatchId);
  }, [activeMatchId, jumpTo]);

  const goNext = useCallback(() => {
    if (matchIds.length === 0) return;
    setCurrentIndex(i => (i + 1) % matchIds.length);
  }, [matchIds.length]);

  const goPrev = useCallback(() => {
    if (matchIds.length === 0) return;
    setCurrentIndex(i => (i - 1 + matchIds.length) % matchIds.length);
  }, [matchIds.length]);

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
    registerLayout, isCurrentMatch, jumpTo,
  };
}
