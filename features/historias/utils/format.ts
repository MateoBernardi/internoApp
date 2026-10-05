export function nombreCompleto(p?: { nombre?: string | null; apellido?: string | null } | null): string {
  return [p?.nombre, p?.apellido].filter(Boolean).join(' ').trim();
}

export function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
