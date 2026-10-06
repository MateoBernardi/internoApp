import type { DiffTurnoDetalle, PlanificacionResumen } from '../../models/Planificacion';
import {
  agruparDiffPorUsuario,
  contarOmitidosRelevantes,
  esOmitidoRelevante,
  omitidosPor2h,
  formatFechaCorta,
  formatFechaHoraLocal,
  formatHorario,
  formatMinSeg,
  segundosRestantes,
  totalCambios,
  totalOmitidos,
} from '../planificacionDiff';

const item = (cambios: Partial<DiffTurnoDetalle>): DiffTurnoDetalle => ({
  userContextId: 1,
  nombre: 'Ana',
  apellido: 'Gómez',
  fecha: '2026-10-03',
  turno: 'Mañana',
  accion: 'alta',
  motivo: null,
  antes: null,
  despues: { in: '08:00', out: '12:00', sede: 1 },
  ...cambios,
});

describe('agruparDiffPorUsuario', () => {
  it('agrupa por empleado separando cambios y omitidos, y ordena por apellido/nombre', () => {
    const grupos = agruparDiffPorUsuario([
      item({ userContextId: 2, nombre: 'Luis', apellido: 'Paz' }),
      item({ userContextId: 1, accion: 'modificacion' }),
      item({ userContextId: 1, accion: 'omitido', motivo: '2H' }),
      item({ userContextId: 3, nombre: 'Beto', apellido: 'Álvarez' }),
    ]);

    expect(grupos.map((g) => g.apellido)).toEqual(['Álvarez', 'Gómez', 'Paz']);
    const gomez = grupos[1];
    expect(gomez.cambios.map((c) => c.accion)).toEqual(['modificacion']);
    expect(gomez.omitidos.map((c) => c.motivo)).toEqual(['2H']);
  });

  it('ordena los turnos de cada empleado por fecha y luego Mañana antes que Tarde', () => {
    const [g] = agruparDiffPorUsuario([
      item({ fecha: '2026-10-03', turno: 'Tarde' }),
      item({ fecha: '2026-10-02', turno: 'Tarde' }),
      item({ fecha: '2026-10-03', turno: 'Mañana' }),
    ]);

    expect(g.cambios.map((c) => `${c.fecha} ${c.turno}`)).toEqual([
      '2026-10-02 Tarde',
      '2026-10-03 Mañana',
      '2026-10-03 Tarde',
    ]);
  });

  it('devuelve vacío sin diff', () => {
    expect(agruparDiffPorUsuario([])).toEqual([]);
  });
});

describe('formatos', () => {
  it('formatHorario muestra "a marcar" cuando no hay salida (horario corrido) y "—" sin horario', () => {
    expect(formatHorario({ in: '08:00', out: '12:00', sede: 1 })).toBe('08:00–12:00');
    expect(formatHorario({ in: '07:00', out: null, sede: 2, horarioCorrido: true })).toBe('07:00–a marcar');
    expect(formatHorario(null)).toBe('—');
  });

  it('formatFechaCorta', () => {
    expect(formatFechaCorta('2026-10-03')).toBe('Sáb 03/10');
    expect(formatFechaCorta('2026-10-05')).toBe('Lun 05/10');
  });

  it('formatFechaHoraLocal formatea en hora local y tolera fechas inválidas', () => {
    const local = new Date(2026, 9, 2, 11, 44).toISOString();
    expect(formatFechaHoraLocal(local)).toBe('02/10/2026 11:44');
    expect(formatFechaHoraLocal('nope')).toBe('');
  });

  it('formatMinSeg', () => {
    expect(formatMinSeg(125)).toBe('2:05');
    expect(formatMinSeg(0)).toBe('0:00');
    expect(formatMinSeg(1800)).toBe('30:00');
  });
});

describe('resumen y vencimiento', () => {
  const resumen: PlanificacionResumen = { altas: 2, modificaciones: 1, bajas: 3, sinCambios: 9, omitidos2h: 4, omitidosLicencia: 1 };

  it('totalCambios suma lo que se escribe y totalOmitidos lo que no', () => {
    expect(totalCambios(resumen)).toBe(6);
    expect(totalOmitidos(resumen)).toBe(5);
  });

  it('segundosRestantes redondea hacia arriba y nunca es negativo', () => {
    const ahora = new Date('2026-10-02T12:00:00.000Z').getTime();
    expect(segundosRestantes('2026-10-02T12:00:30.200Z', ahora)).toBe(31);
    expect(segundosRestantes('2026-10-02T11:59:00.000Z', ahora)).toBe(0);
    expect(segundosRestantes('no-es-fecha', ahora)).toBe(0);
  });
});

describe('omitidos relevantes (solo se avisa de lo que realmente se modificó)', () => {
  const omitido = (cambios: Partial<DiffTurnoDetalle>) =>
    item({ accion: 'omitido', motivo: '2H', antes: { in: '07:00', out: '09:00', sede: 1 }, despues: { in: '08:00', out: '10:00', sede: 1 }, ...cambios });

  it('un turno ya cargado cuyo horario cambia y no se puede aplicar (2 h) sí se informa', () => {
    expect(esOmitidoRelevante(omitido({}))).toBe(true);
  });

  it('un turno que no existe cargado (sin horario previo) NO se informa: no se modificó nada', () => {
    expect(esOmitidoRelevante(omitido({ antes: null }))).toBe(false);
  });

  it('un turno que la planilla elimina y no se puede aplicar sí se informa', () => {
    expect(esOmitidoRelevante(omitido({ despues: null }))).toBe(true);
  });

  it('un cambio solo de sede o que sale de horario corrido también cuenta como modificado', () => {
    expect(esOmitidoRelevante(omitido({ despues: { in: '07:00', out: '09:00', sede: 2 } }))).toBe(true);
    expect(esOmitidoRelevante(omitido({ antes: { in: '07:00', out: null, sede: 1, horarioCorrido: true }, despues: { in: '07:00', out: '09:00', sede: 1 } }))).toBe(true);
  });

  it('un omitido sin diferencia real de horario no se informa', () => {
    const igual = { in: '07:00', out: '09:00', sede: 1 };
    expect(esOmitidoRelevante(omitido({ antes: igual, despues: { ...igual } }))).toBe(false);
  });

  it('el motivo MARCADO sigue la misma regla que 2H', () => {
    expect(esOmitidoRelevante(omitido({ motivo: 'MARCADO', antes: null }))).toBe(false);
    expect(esOmitidoRelevante(omitido({ motivo: 'MARCADO' }))).toBe(true);
  });

  it('las licencias se informan siempre, aunque no haya horario previo', () => {
    expect(esOmitidoRelevante(omitido({ motivo: 'LICENCIA', antes: null }))).toBe(true);
  });

  it('lo que no es un omitido (alta, modificación, baja) no entra', () => {
    expect(esOmitidoRelevante(item({ accion: 'alta' }))).toBe(false);
    expect(esOmitidoRelevante(item({ accion: 'baja', antes: { in: '08:00', out: '12:00', sede: 1 }, despues: null }))).toBe(false);
  });

  it('con muchos empleados con turno hoy, solo cuentan los que realmente cambiaron', () => {
    // Caso real: 20 empleados con turno hoy que aún no estaban cargados + 1 turno cargado que cambia.
    const sinCargar = Array.from({ length: 20 }, (_, i) => omitido({ userContextId: 100 + i, antes: null }));
    const cambiado = omitido({ userContextId: 1 });
    const licencia = omitido({ userContextId: 2, motivo: 'LICENCIA', antes: null });
    const detalle = [...sinCargar, cambiado, licencia];

    expect(omitidosPor2h(detalle)).toEqual([cambiado]);
    expect(contarOmitidosRelevantes(detalle)).toBe(2); // el cambiado + la licencia
  });
});
