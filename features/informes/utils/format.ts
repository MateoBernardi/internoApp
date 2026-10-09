export function nombreCompleto(p?: { nombre?: string | null; apellido?: string | null } | null): string {
  return [p?.nombre, p?.apellido].filter(Boolean).join(' ').trim();
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const dosDigitos = (n: number) => String(n).padStart(2, '0');

function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** `6 oct 09:52` */
export function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MESES[d.getMonth()]} ${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
}

/** `recién`, `hace N min`, `hace N h`, `ayer`, `6 oct` */
export function tiempoRelativo(iso: string, ahora: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const min = Math.floor((ahora.getTime() - d.getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  if (mismoDia(d, ahora)) return `hace ${Math.floor(min / 60)} h`;
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (mismoDia(d, ayer)) return 'ayer';
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function extensionDe(nombre: string): string {
  const i = nombre.lastIndexOf('.');
  return i >= 0 ? nombre.slice(i + 1).toLowerCase() : '';
}

const COLOR_EXT: Record<string, string> = {
  pdf: '#d64545',
  doc: '#2f6fd6',
  docx: '#2f6fd6',
  xls: '#1f9d57',
  xlsx: '#1f9d57',
  csv: '#1f9d57',
  txt: '#5b6b7a',
};

export function colorExtension(ext: string): string {
  return COLOR_EXT[ext] ?? '#7a8087';
}
