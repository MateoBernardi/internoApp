// Single source of truth for classifying archivos into preview kinds.
//
// El backend no es 100% consistente con el campo `tipo` (puede venir vacío,
// como 'application/octet-stream', o sin el MIME real), así que toda
// detección cae a la extensión del nombre como respaldo.

const MIME_EXT_MAP: Record<string, string> = {
  jpeg: 'jpg',
  plain: 'txt',
  'vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'vnd.ms-excel': 'xls',
  'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

export const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'bmp']);
export const TEXT_EXTS = new Set(['txt', 'csv', 'log', 'md', 'json', 'xml', 'yaml', 'yml']);

function safeStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Lowercase extension from a file name or storage path (strips query/hash and folders). */
function extFromPath(v: unknown): string {
  const raw = safeStr(v).split(/[?#]/)[0];
  const seg = raw.slice(raw.lastIndexOf('/') + 1);
  const dot = seg.lastIndexOf('.');
  return dot !== -1 ? seg.slice(dot + 1).toLowerCase() : '';
}

/**
 * Lowercase extension for an archivo. Detection order:
 *  1. the MIME subtype, when the backend sent a real one
 *  2. the stored R2 object path (`ruta_r2`) — keeps the original extension even
 *     when the display name was renamed or stripped
 *  3. the display name
 * Falls back to 'bin' when nothing is usable.
 */
export function getExt(tipo: unknown, nombre: unknown, ruta?: unknown): string {
  const mime = safeStr(tipo);
  if (mime.includes('/')) {
    const sub = mime.split('/')[1]?.toLowerCase() ?? '';
    const mapped = MIME_EXT_MAP[sub];
    if (mapped) return mapped;
    if (sub && sub !== 'octet-stream') return sub;
  }
  return extFromPath(ruta) || extFromPath(nombre) || 'bin';
}

/** True when the archivo should be rendered as an image (MIME or extension based). */
export function isImageFile(tipo: unknown, nombre?: unknown, ruta?: unknown): boolean {
  if (safeStr(tipo).toLowerCase().startsWith('image/')) return true;
  return IMAGE_EXTS.has(getExt(tipo, nombre, ruta));
}

/** True when the archivo is a PDF (MIME or extension based). */
export function isPdfFile(tipo: unknown, nombre?: unknown, ruta?: unknown): boolean {
  if (safeStr(tipo).toLowerCase().includes('pdf')) return true;
  return getExt(tipo, nombre, ruta) === 'pdf';
}

/** True when the archivo has an inline-renderable text body. */
export function isTextFile(tipo: unknown, nombre?: unknown, ruta?: unknown): boolean {
  return TEXT_EXTS.has(getExt(tipo, nombre, ruta));
}
