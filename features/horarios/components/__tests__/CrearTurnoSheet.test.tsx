import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/hooks/useSafeBottomInset', () => ({ useSafeBottomInset: () => 0 }));
jest.mock('@/shared/users/useUser', () => ({
  useSearchUsers: (q: string) => ({
    isFetching: false,
    data: q.trim()
      ? [{ user_context_id: 14, nombre: 'Juan', apellido: 'Juan', username: 'j', email: 'j@x.com' }]
      : [],
  }),
}));
// El selector de fecha nativo/web no se necesita en estos casos.
jest.mock('@/components/ui/CrossPlatformDateTimePicker', () => ({ __esModule: true, default: () => null }));

import { CrearTurnoSheet } from '../CrearTurnoSheet';

function montar(submitError?: string | null) {
  const onSubmit = jest.fn();
  render(
    <CrearTurnoSheet
      visible
      defaultDateISO="2099-10-06"
      sedes={[{ id: 1, nombre: 'Súper' }, { id: 2, nombre: 'Administración' }]}
      isSaving={false}
      submitError={submitError}
      onClose={jest.fn()}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit };
}

describe('CrearTurnoSheet', () => {
  it('muestra la fecha del día visible y arranca con turno Rotativo', () => {
    montar();

    expect(screen.getByText(/06\/10\/2099/)).toBeTruthy();
    expect(screen.getByText('Rotativo')).toBeTruthy();
    expect(screen.getByText('Igual a la de ingreso')).toBeTruthy();
  });

  it('no deja crear sin empleado y lo explica', () => {
    const { onSubmit } = montar();

    fireEvent.press(screen.getByText('Crear turno'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Elegí el empleado.')).toBeTruthy();
  });

  it('busca y elige un empleado; luego pide los horarios', () => {
    const { onSubmit } = montar();

    fireEvent.changeText(screen.getByLabelText('Buscador'), 'jua');
    fireEvent.press(screen.getByText('Juan Juan'));
    fireEvent.press(screen.getByText('Crear turno'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Ingresá un horario de ingreso válido (HH:MM).')).toBeTruthy();
  });

  it('muestra el error que devolvió el backend dentro de la hoja', () => {
    montar('No se pudo crear el turno: la fecha ya pasó.');

    expect(screen.getByText('No se pudo crear el turno: la fecha ya pasó.')).toBeTruthy();
  });
});
