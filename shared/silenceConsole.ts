/**
 * En builds de producción silencia la salida de consola no esencial para no
 * pagar el costo en runtime. `console.error` se deja activo a propósito: es la
 * única vía de diagnóstico disponible en producción (no hay reporte remoto de
 * errores configurado) y sin ella fallas como las del escaneo de turno quedan
 * indebuggeables. En desarrollo (`__DEV__`) la consola funciona normalmente.
 *
 * Importar una sola vez, lo antes posible, desde el layout raíz.
 */
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

if (!isDev) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.debug = noop;
}

export {};
