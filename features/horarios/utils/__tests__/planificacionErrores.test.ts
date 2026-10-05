import { ApiError } from '@/shared/apiRequest';
import { describirErrorPlanificacion } from '../planificacionErrores';

describe('describirErrorPlanificacion', () => {
  it('422 con errores de planilla: título, lista y pide revisar de nuevo', () => {
    const error = new ApiError('La planilla tiene errores.', 422, 'UNPROCESSABLE_ENTITY', {
      errores: ['Fila 3, lunes (Mañana, columna C): sede desconocida "Marte".', 'Fila 4: ID inválido "abc".'],
    });

    expect(describirErrorPlanificacion(error)).toEqual({
      titulo: 'La planilla tiene errores',
      mensaje: 'Corregí la planilla y volvé a revisar los cambios.',
      items: ['Fila 3, lunes (Mañana, columna C): sede desconocida "Marte".', 'Fila 4: ID inválido "abc".'],
      requiereNuevaRevision: true,
    });
  });

  it('422 sin lista usa un título genérico', () => {
    const r = describirErrorPlanificacion(new ApiError('x', 422));
    expect(r.titulo).toBe('No se pudo procesar la planilla');
    expect(r.items).toEqual([]);
  });

  it.each([
    [412, 'La revisión venció', true],
    [409, 'Esta revisión ya no es válida', true],
    [403, 'Sin permisos', false],
    [502, 'El servicio de planificación no está disponible', false],
    [503, 'El servicio de planificación no está disponible', false],
  ])('HTTP %i → "%s" (nueva revisión: %s)', (status, titulo, requiereNuevaRevision) => {
    const r = describirErrorPlanificacion(new ApiError('detalle', status));
    expect(r.titulo).toBe(titulo);
    expect(r.requiereNuevaRevision).toBe(requiereNuevaRevision);
  });

  it('otro status conserva el mensaje del backend', () => {
    expect(describirErrorPlanificacion(new ApiError('Algo falló', 500)).mensaje).toBe('Algo falló');
  });

  it('un Error común (por ejemplo, de red) usa su mensaje; sin mensaje, uno genérico', () => {
    expect(describirErrorPlanificacion(new Error('La conexión es inestable.')).mensaje).toBe('La conexión es inestable.');
    expect(describirErrorPlanificacion('???').mensaje).toBe('Ocurrió un problema inesperado. Intentá de nuevo.');
  });
});
