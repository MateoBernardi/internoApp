import { validarCrearTurno, type CrearTurnoForm } from '../crearTurno';

const HOY = '2026-10-05';

const form = (cambios: Partial<CrearTurnoForm> = {}): CrearTurnoForm => ({
  userContextId: 14,
  fechaISO: '2026-10-06',
  turno: 'Rotativo',
  ingreso: '09:00',
  egreso: '17:00',
  sedeIngreso: 1,
  sedeEgreso: null,
  ...cambios,
});

describe('validarCrearTurno', () => {
  it('arma el payload de POST /horarios/turno con la sede de egreso igual a la de ingreso por defecto', () => {
    expect(validarCrearTurno(form(), HOY)).toEqual({
      ok: true,
      payload: {
        user_context_id: 14,
        turno: 'Rotativo',
        horario_in: '2026-10-06T09:00',
        horario_out: '2026-10-06T17:00',
        sede_id_in: 1,
        sede_id_out: 1,
      },
    });
  });

  it('respeta una sede de egreso distinta', () => {
    const r = validarCrearTurno(form({ sedeEgreso: 2 }), HOY);
    expect(r.ok && r.payload.sede_id_out).toBe(2);
  });

  it('acepta el turno de hoy (el backend rechaza solo días pasados)', () => {
    expect(validarCrearTurno(form({ fechaISO: HOY }), HOY).ok).toBe(true);
  });

  it.each<[string, Partial<CrearTurnoForm>, string]>([
    ['sin empleado', { userContextId: null }, 'Elegí el empleado.'],
    ['fecha vacía', { fechaISO: '' }, 'Elegí la fecha.'],
    ['fecha pasada', { fechaISO: '2026-10-04' }, 'No se pueden crear turnos en fechas pasadas.'],
    ['ingreso inválido', { ingreso: '25:00' }, 'Ingresá un horario de ingreso válido (HH:MM).'],
    ['ingreso incompleto', { ingreso: '9:0' }, 'Ingresá un horario de ingreso válido (HH:MM).'],
    ['egreso inválido', { egreso: '' }, 'Ingresá un horario de egreso válido (HH:MM).'],
    ['egreso igual al ingreso', { egreso: '09:00' }, 'El egreso tiene que ser posterior al ingreso.'],
    ['egreso anterior al ingreso', { egreso: '08:30' }, 'El egreso tiene que ser posterior al ingreso.'],
    ['sin sede', { sedeIngreso: null }, 'Elegí la sede de ingreso.'],
  ])('rechaza %s', (_caso, cambios, error) => {
    expect(validarCrearTurno(form(cambios), HOY)).toEqual({ ok: false, error });
  });
});
