import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('../../viewmodels/useHorasExtra', () => ({ useHorasSemanaProyeccion: jest.fn() }));

import type { HorasSemanaProyeccionDTO } from '../../models/HorasExtra';
import { HorasSemanalCard } from '../HorasSemanalesList';

const empleado = (overrides: Partial<HorasSemanaProyeccionDTO> = {}): HorasSemanaProyeccionDTO => ({
  userContextId: 7,
  nombre: 'Mateo',
  apellido: 'Bernardi',
  minutosObjetivo: 2190,
  minutosObjetivoPendiente: null,
  minutosRealizados: 270,
  minutosProyectados: 600,
  minutosSaldoFrancos: 570,
  turnos: [
    { fecha: '2026-10-19', turno: 'Mañana', estado: 'realizado', minutos: 270 },
    { fecha: '2026-10-20', turno: 'Mañana', estado: 'en_curso', minutos: 240 },
    { fecha: '2026-10-21', turno: 'Mañana', estado: 'proyectado', minutos: 90 },
  ],
  ...overrides,
});

describe('HorasSemanalCard', () => {
  it('muestra lo que lleva, la proyección contra el objetivo y el saldo de francos en "x hs, y minutos"', () => {
    render(<HorasSemanalCard empleado={empleado()} />);

    expect(screen.getByText('4 hs, 30 minutos')).toBeTruthy(); // lleva
    expect(screen.getByText('10 hs')).toBeTruthy(); // proyección
    expect(screen.getByText(/de 36 hs, 30 minutos semanales/)).toBeTruthy(); // objetivo
    expect(screen.getByText('Le faltan 26 hs, 30 minutos')).toBeTruthy();
    expect(screen.getByText('9 hs, 30 minutos')).toBeTruthy(); // saldo de francos
  });

  it('indica cuando la proyección supera el objetivo', () => {
    render(<HorasSemanalCard empleado={empleado({ minutosProyectados: 2250 })} />);

    expect(screen.getByText('Supera el objetivo por 1 hs')).toBeTruthy();
  });

  it('despliega el detalle por día con el estado de cada turno', () => {
    render(<HorasSemanalCard empleado={empleado()} />);

    expect(screen.queryByText(/Lun 19\/10/)).toBeNull();
    fireEvent.press(screen.getByText('Ver días'));

    expect(screen.getByText('Lun 19/10 · Mañana')).toBeTruthy();
    expect(screen.getByText('(Realizado)')).toBeTruthy();
    expect(screen.getByText('(En curso)')).toBeTruthy();
    expect(screen.getByText('(Planificado)')).toBeTruthy();
  });
});
