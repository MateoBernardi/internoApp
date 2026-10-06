import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/hooks/useSafeBottomInset', () => ({ useSafeBottomInset: () => 0 }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/shared/ui/confirmAction', () => ({ confirmAction: jest.fn() }));
jest.mock('../../viewmodels/useHorarios', () => ({ useScanHistory: () => ({ data: [], isFetching: false, isError: false }) }));

import { confirmAction } from '@/shared/ui/confirmAction';
import type { Turno } from '../../models/Turno';
import { EditarTurnoSheet } from '../EditarTurnoSheet';

const confirmar = jest.mocked(confirmAction);

const turno = (cambios: Partial<Turno> = {}): Turno => ({
  id: 237,
  userContextId: 8,
  nombre: 'Cristian Jose',
  fecha: '06/10/2026',
  fechaISO: '2026-10-06',
  turno: 'MANANA',
  turnoNombre: 'Mañana',
  ingreso: '07:00',
  egreso: '09:00',
  sedeIdIngreso: 2,
  sedeIdEgreso: 2,
  licencia: false,
  feriado: false,
  reportadoTardanza: false,
  horarioCorrido: false,
  ...cambios,
});

function montar(draft: Turno, otrosTurnosDelDia = 1) {
  const onField = jest.fn();
  const onSave = jest.fn();
  const utils = render(
    <EditarTurnoSheet
      visible
      draft={draft}
      sedes={[{ id: 2, nombre: 'Administración' }]}
      isSaving={false}
      editKey={1}
      otrosTurnosDelDia={otrosTurnosDelDia}
      onClose={jest.fn()}
      onField={onField}
      onSave={onSave}
    />,
  );
  return { onField, onSave, ...utils };
}

// Los botones No/Sí de HORARIO CORRIDO son los últimos "No"/"Sí" del formulario (después de AUSENCIA y FERIADO).
const botonCorrido = (texto: 'No' | 'Sí') => screen.getAllByText(texto)[2];

beforeEach(() => {
  jest.clearAllMocks();
  confirmar.mockResolvedValue(true);
});

describe('EditarTurnoSheet — horario corrido', () => {
  it('al activarlo avisa cuántos turnos se eliminan y recién al confirmar cambia el valor', async () => {
    const { onField } = montar(turno(), 1);

    fireEvent.press(botonCorrido('Sí'));

    await waitFor(() => expect(onField).toHaveBeenCalledWith('horarioCorrido', true));
    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Horario corrido', message: expect.stringContaining('se eliminan el otro turno'), destructive: true }),
    );
  });

  it('si el usuario cancela el aviso no cambia nada', async () => {
    confirmar.mockResolvedValue(false);
    const { onField } = montar(turno());

    fireEvent.press(botonCorrido('Sí'));

    await waitFor(() => expect(confirmar).toHaveBeenCalled());
    expect(onField).not.toHaveBeenCalled();
  });

  it('sin otros turnos el aviso no es destructivo', async () => {
    montar(turno(), 0);

    fireEvent.press(botonCorrido('Sí'));

    await waitFor(() => expect(confirmar).toHaveBeenCalled());
    expect(confirmar.mock.calls[0][0]).toMatchObject({ destructive: false });
  });

  it('activar el horario corrido y guardar manda egreso vacío y horario_corrido: true', async () => {
    const { onField, onSave, rerender } = montar(turno());

    fireEvent.press(botonCorrido('Sí'));
    await waitFor(() => expect(onField).toHaveBeenCalledWith('horarioCorrido', true));
    // El padre aplica el cambio al draft (misma edición: mismo editKey).
    rerender(
      <EditarTurnoSheet
        visible
        draft={turno({ horarioCorrido: true })}
        sedes={[{ id: 2, nombre: 'Administración' }]}
        isSaving={false}
        editKey={1}
        otrosTurnosDelDia={1}
        onClose={jest.fn()}
        onField={onField}
        onSave={onSave}
      />,
    );
    expect(screen.getByText('Al marcar salida')).toBeTruthy();

    fireEvent.press(screen.getByText('Guardar cambios'));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ horarioCorrido: true, egreso: '', ingreso: '07:00' }), { horario_corrido: true });
  });

  it('guardar sin tocar el toggle no manda horario_corrido (el backend conserva el valor actual)', () => {
    const { onSave } = montar(turno());

    fireEvent.press(screen.getByText('Guardar cambios'));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ egreso: '09:00' }), undefined);
  });

  it('un turno que ya era corrido y no se toca tampoco manda horario_corrido', () => {
    const { onSave } = montar(turno({ horarioCorrido: true, egreso: '' }));

    fireEvent.press(screen.getByText('Guardar cambios'));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ egreso: '' }), undefined);
  });

  it('sin horario corrido un egreso inválido bloquea el guardado y lo explica', () => {
    const { onSave } = montar(turno({ egreso: '' }));

    fireEvent.press(screen.getByText('Guardar cambios'));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Ingresá un horario de egreso válido (HH:MM) o activá el horario corrido.')).toBeTruthy();
  });

  it('con licencia el horario corrido no está disponible y se explica por qué', () => {
    montar(turno({ licencia: true }));

    expect(screen.getByText('No disponible con licencia o con la salida ya marcada.')).toBeTruthy();
  });
});
