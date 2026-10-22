import { formatMinutos } from '@/shared/utils/duracion';

/**
 * Formatea la cantidad de días u horas de una solicitud para mostrar en UI.
 * Días: vienen del backend multiplicados por 10. Horas: `cantidadMinutos` es el valor
 * exacto; si no viene (backend anterior), se usa `cantidadHoras` (horas × 10).
 */
export function formatCantidadLicencia(
  cantidadDias: number | null | undefined,
  cantidadHoras: number | null | undefined,
  cantidadMinutos?: number | null,
): string {
  if (cantidadDias != null && cantidadDias > 0) {
    const dias = cantidadDias / 10;
    if (dias === 1) return '1 día';
    return `${dias} días`;
  }
  if (cantidadMinutos != null && cantidadMinutos > 0) {
    return formatMinutos(cantidadMinutos);
  }
  if (cantidadHoras != null && cantidadHoras > 0) {
    const horas = cantidadHoras / 10;
    return `${horas} hs`;
  }
  return '-';
}
