import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';

interface MensajePaginacion {
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

/**
 * Scrollea el `ScrollView` de mensajes hasta la posición registrada por cada
 * `MessageBubble` en su `onLayout`; si el mensaje buscado todavía no está
 * cargado en pantalla, sigue paginando hacia atrás hasta encontrarlo. Común
 * a la búsqueda de texto y al "ir al mensaje citado" desde una cita.
 */
export function useMessageJump(
  mensajesCargados: { id: string | number }[],
  scrollViewRef: React.RefObject<ScrollView | null>,
  { hasNextPage, isFetchingNextPage, fetchNextPage }: MensajePaginacion,
) {
  const layoutsRef = useRef<Map<string, number>>(new Map());
  const [targetId, setTargetId] = useState<string | null>(null);

  const cargadosIds = useMemo(
    () => new Set(mensajesCargados.map(m => String(m.id))),
    [mensajesCargados],
  );

  useEffect(() => {
    if (!targetId || cargadosIds.has(targetId)) return;
    if (isFetchingNextPage || !hasNextPage) return;
    fetchNextPage();
  }, [targetId, cargadosIds, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!targetId) return;
    const y = layoutsRef.current.get(targetId);
    if (y != null) {
      scrollViewRef.current?.scrollTo({ y: Math.max(y - 40, 0), animated: true });
      setTargetId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, cargadosIds]);

  const registerLayout = useCallback((id: string, y: number) => {
    layoutsRef.current.set(id, y);
  }, []);

  const jumpTo = useCallback((id: string) => setTargetId(id), []);

  return { registerLayout, jumpTo, layoutsRef };
}
