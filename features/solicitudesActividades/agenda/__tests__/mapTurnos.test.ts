import type { HorarioDTO } from '@/features/horarios/models/HorarioDTO';
import { mapTurnos } from '../activityMappers';
import { formatHoraFin } from '../dateUtils';

const dto = (cambios: Partial<HorarioDTO> = {}): HorarioDTO => ({
  id: 7,
  user_context_id: 14,
  turno: 'Mañana',
  esperado_in: '2026-10-06T08:00:00',
  esperado_out: '2026-10-06T12:00:00',
  sede_id_in: 1,
  sede_id_out: 1,
  nombre: 'Ana',
  apellido: 'Gómez',
  relacion: '',
  ...cambios,
});

describe('mapTurnos (agenda personal)', () => {
  it('arma la celda del turno con hora de ingreso y fecha_fin', () => {
    const [a] = mapTurnos([dto()]);

    expect(a).toMatchObject({
      id: 'turno-7',
      time: '08:00',
      title: 'Turno Mañana',
      date: '2026-10-06',
      tipo: 'turno',
      turno_code: 'M',
      fecha_inicio: '2026-10-06T08:00:00',
      fecha_fin: '2026-10-06T12:00:00',
    });
  });

  it('horario corrido (esperado_out null) no rompe la agenda y queda sin fecha_fin', () => {
    const [a] = mapTurnos([dto({ esperado_out: null, horario_corrido: true })]);

    expect(a.fecha_fin).toBeUndefined();
    expect(a.fecha_inicio).toBe('2026-10-06T08:00:00');
  });

  it('un turno Rotativo se muestra como Rotativo y no como Tarde', () => {
    const [a] = mapTurnos([dto({ turno: 'Rotativo' })]);

    expect(a.title).toBe('Turno Rotativo');
  });

  it('omite los turnos con licencia', () => {
    expect(mapTurnos([dto({ licencia: true })])).toEqual([]);
  });

  const sedes = [
    { id: 1, nombre: 'Centro' },
    { id: 2, nombre: 'Norte' },
  ];

  it('resuelve los nombres de sede de entrada y salida', () => {
    const [a] = mapTurnos([dto({ sede_id_in: 1, sede_id_out: 2 })], sedes);

    expect(a.sede_ingreso).toBe('Centro');
    expect(a.sede_egreso).toBe('Norte');
  });

  it('completa ambas sedes aunque sean la misma', () => {
    const [a] = mapTurnos([dto()], sedes);

    expect(a.sede_ingreso).toBe('Centro');
    expect(a.sede_egreso).toBe('Centro');
  });

  it('cae a #id si la sede no está en la lista (o todavía no cargó)', () => {
    const [a] = mapTurnos([dto({ sede_id_in: 9, sede_id_out: 9 })]);

    expect(a.sede_ingreso).toBe('#9');
    expect(a.sede_egreso).toBe('#9');
  });
});

describe('formatHoraFin', () => {
  it('devuelve HH:MM de la fecha_fin', () => {
    expect(formatHoraFin('2026-10-06T16:30:00')).toBe('16:30');
  });

  it("devuelve 'a marcar' sin fecha_fin (horario corrido)", () => {
    expect(formatHoraFin(undefined)).toBe('a marcar');
  });
});
