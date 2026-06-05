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

  const handleMessagesScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollOffsetRef.current = y;
    if (y <= 48 && hasNextPage && !isFetchingNextPage) {
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
      messagesScrollRef.current?.scrollToEnd({ animated: false });
    }
    prevContentHeightRef.current = h;
  }, []);

  return { messagesScrollRef, handleMessagesScroll, handleMessagesContentSizeChange };
}
