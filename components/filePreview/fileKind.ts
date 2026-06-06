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

/** Lowercase extension derived from the MIME subtype, falling back to the file name. */
export function getExt(tipo: unknown, nombre: unknown): string {
  const mime = safeStr(tipo);
  const name = safeStr(nombre);
  if (mime.includes('/')) {
    const sub = mime.split('/')[1]?.toLowerCase() ?? '';
    const mapped = MIME_EXT_MAP[sub];
    if (mapped) return mapped;
    if (sub && sub !== 'octet-stream') return sub;
  }
  const dot = name.lastIndexOf('.');
  return dot !== -1 ? name.slice(dot + 1).toLowerCase() : 'bin';
}

/** True when the archivo should be rendered as an image (MIME or extension based). */
export function isImageFile(tipo: unknown, nombre?: unknown): boolean {
  if (safeStr(tipo).toLowerCase().startsWith('image/')) return true;
  return IMAGE_EXTS.has(getExt(tipo, nombre));
}

/** True when the archivo is a PDF (MIME or extension based). */
export function isPdfFile(tipo: unknown, nombre?: unknown): boolean {
  if (safeStr(tipo).toLowerCase().includes('pdf')) return true;
  return getExt(tipo, nombre) === 'pdf';
}

/** True when the archivo has an inline-renderable text body. */
export function isTextFile(tipo: unknown, nombre?: unknown): boolean {
  return TEXT_EXTS.has(getExt(tipo, nombre));
}
