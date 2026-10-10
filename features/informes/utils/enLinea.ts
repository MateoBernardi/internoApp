/** Órdenes de los adjuntos referenciados dentro del HTML (`<div data-adjunto="N">`). */
export function ordenesEnLinea(html: string | null | undefined): Set<number> {
  const ordenes = new Set<number>();
  for (const m of (html ?? '').matchAll(/data-adjunto="(\d+)"/g)) ordenes.add(Number(m[1]));
  return ordenes;
}

/** Marcador de un adjunto en línea, tal como lo guarda el editor. */
export const marcadorAdjunto = (orden: number) => `<div data-adjunto="${orden}"></div>`;
