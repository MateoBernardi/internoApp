import { useCallback, useRef } from 'react';
import type { ScrollView } from 'react-native';

interface UseMessagesScrollParams {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

/**
 * Maneja el scroll de la lista de mensajes: pagina hacia atrás al llegar al
 * tope y, al anteponer mensajes viejos, mantiene la posición visible en vez de
 * saltar al final. Compartido por `Solicitud` y `ConversacionChat`.
 */
export function useMessagesScroll({ hasNextPage, isFetchingNextPage, fetchNextPage }: UseMessagesScrollParams) {
  const messagesScrollRef = useRef<ScrollView | null>(null);
  const prevContentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const isPrependingRef = useRef(false);
  // Si el usuario está cerca del final, un crecimiento del contenido (mensaje
  // nuevo propio o ajeno) se sigue auto-scrolleando. Si scrolleó hacia arriba
  // para leer historial, un refetch en segundo plano (invalidateQueries de
  // cualquier mutación, no solo mensajes nuevos) NO debe devolverlo al fondo.
  const isNearBottomRef = useRef(true);

  const handleMessagesScroll = useCallback((e: {
    nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } };
  }) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    scrollOffsetRef.current = contentOffset.y;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    isNearBottomRef.current = distanceFromBottom < 120;
    if (contentOffset.y <= 48 && hasNextPage && !isFetchingNextPage) {
      isPrependingRef.current = true;
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleMessagesContentSizeChange = useCallback((_w: number, h: number) => {
    if (isPrependingRef.current) {
      const delta = h - prevContentHeightRef.current;
      if (delta > 0) messagesScrollRef.current?.scrollTo({ y: scrollOffsetRef.current + delta, animated: false });
      isPrependingRef.current = false;
    } else {
      const isFirstLoad = prevContentHeightRef.current === 0;
      const grew = h > prevContentHeightRef.current;
      if (grew && (isFirstLoad || isNearBottomRef.current)) {
        messagesScrollRef.current?.scrollToEnd({ animated: !isFirstLoad });
      }
    }
    prevContentHeightRef.current = h;
  }, []);

  return { messagesScrollRef, handleMessagesScroll, handleMessagesContentSizeChange };
}
