import { useEffect } from 'react';
import { Platform } from 'react-native';

const PREFIJO = /^\((?:\d+|99\+)\) /;

/** Título con el contador al frente: "(3) Mensajes". Quita un prefijo previo y no pone nada en 0. */
export function conContador(titulo: string, cantidad: number): string {
  const base = titulo.replace(PREFIJO, '');
  if (cantidad <= 0) return base;
  return `(${cantidad > 99 ? '99+' : cantidad}) ${base}`;
}

/**
 * Web: muestra `cantidad` entre paréntesis en el título de la pestaña, como WhatsApp o Gmail.
 * La navegación (expo-router) reescribe `document.title` en cada pantalla, así que se observa el
 * <head> y se reaplica el contador; al desmontar se restaura el título sin él.
 */
export function useTabTitleBadge(cantidad: number): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const aplicar = () => {
      const siguiente = conContador(document.title, cantidad);
      if (document.title !== siguiente) document.title = siguiente;
    };
    aplicar();

    const observador = new MutationObserver(aplicar);
    observador.observe(document.head, { childList: true, subtree: true, characterData: true });

    return () => {
      observador.disconnect();
      document.title = conContador(document.title, 0);
    };
  }, [cantidad]);
}
