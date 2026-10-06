import { ApiError } from '@/shared/apiRequest';

export interface ErrorPlanificacionUI {
  titulo: string;
  mensaje: string;
  /** Errores puntuales de la planilla (fila/columna), si el backend los informa. */
  items: string[];
  /** El usuario tiene que volver a revisar (preview vencido, ya confirmado o con errores de planilla). */
  requiereNuevaRevision: boolean;
}

const erroresDeDetalles = (details: unknown): string[] => {
  const errores = (details as { errores?: unknown } | undefined)?.errores;
  return Array.isArray(errores) ? errores.filter((e): e is string => typeof e === 'string') : [];
};

/**
 * Traduce los errores de preview/confirmar a lo que se muestra en pantalla:
 *  422 → la planilla tiene errores (con la lista), 412 → el preview venció,
 *  409 → ya se confirmó, 403 → sin permisos, 502/503 → servicio de planificación caído.
 */
export function describirErrorPlanificacion(error: unknown): ErrorPlanificacionUI {
  if (error instanceof ApiError) {
    const items = erroresDeDetalles(error.details);
    switch (error.status) {
      case 422:
        return {
          titulo: items.length > 0 ? 'La planilla tiene errores' : 'No se pudo procesar la planilla',
          mensaje: 'Corregí la planilla y volvé a revisar los cambios.',
          items,
          requiereNuevaRevision: true,
        };
      case 412:
        return {
          titulo: 'La revisión venció',
          mensaje: 'Pasó demasiado tiempo desde que revisaste los cambios. Volvé a revisarlos para publicar.',
          items: [],
          requiereNuevaRevision: true,
        };
      case 409:
        return {
          titulo: 'Esta revisión ya no es válida',
          mensaje: 'Ya fue publicada o reemplazada por otra. Volvé a revisar los cambios.',
          items: [],
          requiereNuevaRevision: true,
        };
      case 403:
        return {
          titulo: 'Sin permisos',
          mensaje: 'Tu usuario no puede publicar horarios.',
          items: [],
          requiereNuevaRevision: false,
        };
      case 502:
      case 503:
        return {
          titulo: 'El servicio de planificación no está disponible',
          mensaje: 'Intentá de nuevo en unos minutos. Si sigue fallando, avisá al administrador.',
          items: [],
          requiereNuevaRevision: false,
        };
      default:
        return { titulo: 'No se pudo completar la operación', mensaje: error.message, items: [], requiereNuevaRevision: false };
    }
  }
  const mensaje = error instanceof Error && error.message ? error.message : 'Ocurrió un problema inesperado. Intentá de nuevo.';
  return { titulo: 'No se pudo completar la operación', mensaje, items: [], requiereNuevaRevision: false };
}
