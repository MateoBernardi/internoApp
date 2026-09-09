import type { FileItem } from '@/components/filePreview';
import { getExt, isImageFile } from '@/components/filePreview';

// Stored R2 object key; recovers the real extension when the display name was
// renamed or stripped. Raw DTOs expose it as `ruta_r2`, mapped models as `url`.
export const rutaR2 = (a: any): unknown => a?.ruta_r2 ?? a?.url;

/**
 * `url`/`ruta_r2` is only a genuinely fetchable link when the endpoint
 * resolved a signed URL (e.g. the bitácora). Otherwise it's just the bare R2
 * object key, which never starts with `http`. Returns `undefined` when there's
 * nothing usable, so callers fall back to their own on-demand resolution.
 */
export function resolvedArchivoUri(a: any): string | undefined {
  const candidate = a?.url ?? a?.ruta_r2;
  return typeof candidate === 'string' && /^https?:\/\//.test(candidate) ? candidate : undefined;
}

export function buildArchivoFileItem(archivo: any): FileItem {
  const tipo: string = typeof archivo.tipo === 'string' ? archivo.tipo : '';
  const nombre: string = typeof archivo.nombre === 'string' ? archivo.nombre : 'Archivo';
  const ruta = rutaR2(archivo);
  return {
    id: String(archivo.id),
    kind: isImageFile(tipo, nombre, ruta) ? 'image' : 'file',
    name: nombre,
    ext: getExt(tipo, nombre, ruta),
    size: archivo.tamaño ? formatBytes(archivo.tamaño) : undefined,
    uri: typeof archivo._resolvedUri === 'string' ? archivo._resolvedUri : '',
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
