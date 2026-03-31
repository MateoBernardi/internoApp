/**
 * Formatea la cantidad de días u horas de una solicitud para mostrar en UI.
 * Los valores vienen del backend multiplicados por 10.
 */
export function formatCantidadLicencia(
  cantidadDias: number | null | undefined,
  cantidadHoras: number | null | undefined
): string {
  if (cantidadDias != null && cantidadDias > 0) {
    const dias = cantidadDias / 10;
    if (dias === 1) return '1 día';
    return `${dias} días`;
  }
  if (cantidadHoras != null && cantidadHoras > 0) {
    const horas = cantidadHoras / 10;
    return `${horas} hs`;
  }
  return '-';
}
