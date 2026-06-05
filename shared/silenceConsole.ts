/**
 * En builds de producción silencia la salida de consola para no filtrar
 * cuerpos de respuesta a los logs del dispositivo ni pagar el costo en runtime.
 * En desarrollo (`__DEV__`) la consola funciona normalmente.
 *
 * Importar una sola vez, lo antes posible, desde el layout raíz.
 */
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

if (!isDev) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
}

export {};
