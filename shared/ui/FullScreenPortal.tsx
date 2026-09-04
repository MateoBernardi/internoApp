import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Portal manual (sin dependencias nuevas) para que las pantallas completas
 * conviertidas desde <Modal> puedan montarse en la raíz de la app en vez de
 * en el subárbol local donde se declaran. RN no tiene createPortal: sin esto,
 * un `position:'absolute'` anidado dentro de un tab (p.ej. KanbanBoard, que
 * vive debajo de otras secciones en HomeScreen) solo cubre el contenedor
 * local, no la pantalla ni la tab bar. <FullScreenPortalHost> se monta una
 * vez en app/_layout.tsx, por encima del <Stack>, así el contenido de
 * cualquier <FullScreenPortal> tapa literalmente todo (incluida la tab bar).
 */

interface PortalContextValue {
  mount: (id: string, node: React.ReactNode) => void;
  unmount: (id: string) => void;
}

const PortalContext = createContext<PortalContextValue | null>(null);

let nextPortalId = 0;

export function FullScreenPortalHost({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Record<string, React.ReactNode>>({});

  // Si el nodo es idéntico al ya montado devolvemos el mismo objeto: un `setEntries`
  // con un objeto nuevo re-renderiza el Host, y eso vuelve a disparar el efecto de
  // cada <FullScreenPortal> (ver abajo), encadenando renders sin fin.
  const mount = useCallback((id: string, node: React.ReactNode) => {
    setEntries((prev) => (prev[id] === node ? prev : { ...prev, [id]: node }));
  }, []);

  const unmount = useCallback((id: string) => {
    setEntries((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // Memoizado: un value nuevo en cada render re-renderiza a todos los consumidores.
  const contextValue = useMemo(() => ({ mount, unmount }), [mount, unmount]);

  return (
    <PortalContext.Provider value={contextValue}>
      {children}
      {Object.entries(entries).map(([id, node]) => (
        <React.Fragment key={id}>{node}</React.Fragment>
      ))}
    </PortalContext.Provider>
  );
}

/** Envolvé el contenido full-screen de un modal convertido con esto en vez de renderizarlo directo. */
export function FullScreenPortal({ children }: { children: React.ReactNode }) {
  const ctx = useContext(PortalContext);
  const idRef = useRef(`fsp-${++nextPortalId}`);

  useEffect(() => {
    if (!ctx) return;
    ctx.mount(idRef.current, children);
  }, [ctx, children]);

  useEffect(() => {
    return () => ctx?.unmount(idRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ctx) {
    // Fallback defensivo si por algún motivo no hay Host montado (no debería pasar en runtime real).
    return <>{children}</>;
  }
  return null;
}
