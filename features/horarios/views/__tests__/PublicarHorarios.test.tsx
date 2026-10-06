import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { ApiError } from '@/shared/apiRequest';
import type { PlanificacionAplicadaDTO, PlanificacionInfoDTO, PlanificacionPreviewDTO } from '../../models/Planificacion';

jest.mock('@/hooks/useSafeBottomInset', () => ({ useSafeBottomInset: () => 0 }));
jest.mock('@/shared/ui/confirmAction', () => ({ confirmAction: jest.fn() }));
jest.mock('../../viewmodels/usePlanificacion', () => ({
  usePlanificacionInfo: jest.fn(),
  usePreviewPlanificacion: jest.fn(),
  useConfirmarPlanificacion: jest.fn(),
}));

import { confirmAction } from '@/shared/ui/confirmAction';
import { useConfirmarPlanificacion, usePlanificacionInfo, usePreviewPlanificacion } from '../../viewmodels/usePlanificacion';
import { PublicarHorarios } from '../PublicarHorarios';

const confirmar = jest.mocked(confirmAction);

const INFO: PlanificacionInfoDTO = {
  planillaUrl: 'https://docs.google.com/spreadsheets/d/abc/edit',
  ultimaPublicacion: { snapshotId: 5, aplicadoAt: new Date(2026, 9, 2, 11, 44).toISOString(), publicadoPor: { nombre: 'Mateo', apellido: 'Bernardi' } },
};

const PREVIEW: PlanificacionPreviewDTO = {
  ok: true,
  snapshotId: 9,
  expiraAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
  igualAlVigente: false,
  resumen: { altas: 1, modificaciones: 1, bajas: 1, sinCambios: 4, omitidos2h: 2, omitidosLicencia: 1 },
  detalle: [
    { userContextId: 8, nombre: 'Cristian', apellido: 'Jose', fecha: '2026-10-03', turno: 'Tarde', accion: 'alta', motivo: null, antes: null, despues: { in: '20:00', out: '22:00', sede: 2 } },
    { userContextId: 8, nombre: 'Cristian', apellido: 'Jose', fecha: '2026-10-03', turno: 'Mañana', accion: 'modificacion', motivo: null,
      antes: { in: '07:00', out: null, sede: 2, horarioCorrido: true }, despues: { in: '07:00', out: '09:00', sede: 2 } },
    { userContextId: 15, nombre: 'Victor', apellido: 'Bernardi', fecha: '2026-10-03', turno: 'Mañana', accion: 'baja', motivo: null, antes: { in: '10:00', out: '14:00', sede: 2 }, despues: null },
    // Turno que todavía no estaba cargado y no se pudo crear (2 h): NO debe generar aviso.
    { userContextId: 7, nombre: 'Mateo', apellido: 'Bernardi', fecha: '2026-10-02', turno: 'Mañana', accion: 'omitido', motivo: '2H', antes: null, despues: { in: '08:00', out: '12:00', sede: 1 } },
    // Turno ya cargado cuyo horario cambia y no se puede aplicar (2 h): SÍ se avisa.
    { userContextId: 8, nombre: 'Cristian', apellido: 'Jose', fecha: '2026-10-02', turno: 'Tarde', accion: 'omitido', motivo: '2H',
      antes: { in: '16:00', out: '20:00', sede: 2 }, despues: { in: '17:00', out: '21:00', sede: 2 } },
    { userContextId: 7, nombre: 'Mateo', apellido: 'Bernardi', fecha: '2026-10-03', turno: 'Mañana', accion: 'omitido', motivo: 'LICENCIA', antes: null, despues: { in: '08:00', out: '12:00', sede: 1 } },
  ],
  faltantes: { semanaActual: [], proximaSemana: [{ user_context_id: 15, nombre: 'Victor', apellido: 'Bernardi', horas: 24, objetivo: 30 }] },
  usuariosSinTurnos: [{ userContextId: 53, nombre: 'Mariano', apellido: 'Dominguez' }],
};

const APLICADA: PlanificacionAplicadaDTO = { message: 'ok', snapshotId: 9, altas: 1, modificaciones: 1, bajas: 1, omitidos: 3 };

// Mutación falsa: `mutate` resuelve de inmediato con lo que indique `resultado`.
type Resultado = { ok: unknown } | { error: unknown };
const mutacion = (resultado: Resultado, isPending = false) => ({
  mutate: jest.fn((_vars: unknown, opts?: { onSuccess?: (d: unknown) => void; onError?: (e: unknown) => void }) => {
    if ('ok' in resultado) opts?.onSuccess?.(resultado.ok);
    else opts?.onError?.(resultado.error);
  }),
  isPending,
});

function montar(opts: { info?: PlanificacionInfoDTO; preview?: Resultado; confirmar?: Resultado; onVerTurnos?: () => void } = {}) {
  (usePlanificacionInfo as jest.Mock).mockReturnValue({ data: opts.info ?? INFO, isLoading: false });
  const preview = mutacion(opts.preview ?? { ok: PREVIEW });
  const conf = mutacion(opts.confirmar ?? { ok: APLICADA });
  (usePreviewPlanificacion as jest.Mock).mockReturnValue(preview);
  (useConfirmarPlanificacion as jest.Mock).mockReturnValue(conf);
  render(<PublicarHorarios onVerTurnos={opts.onVerTurnos} />);
  return { preview, conf };
}

beforeEach(() => {
  jest.clearAllMocks();
  confirmar.mockResolvedValue(true);
});

describe('PublicarHorarios', () => {
  it('inicio: explica los pasos, ofrece abrir la planilla y muestra la última publicación', () => {
    montar();

    expect(screen.getByText('Publicá los horarios desde la planilla')).toBeTruthy();
    expect(screen.getByText('Abrir planilla')).toBeTruthy();
    expect(screen.getByText(/Última publicación: 02\/10\/2026 11:44 · Mateo Bernardi/)).toBeTruthy();
    expect(screen.getByText('Revisar cambios')).toBeTruthy();
  });

  it('sin link configurado no muestra "Abrir planilla"; sin publicaciones lo dice', () => {
    montar({ info: { planillaUrl: null, ultimaPublicacion: null } });

    expect(screen.queryByText('Abrir planilla')).toBeNull();
    expect(screen.getByText('Todavía no se publicó ninguna planilla.')).toBeTruthy();
  });

  it('revisar muestra contadores, diff por empleado, avisos y la acción de publicar con la cantidad de cambios', async () => {
    const { preview } = montar();

    fireEvent.press(screen.getByText('Revisar cambios'));

    expect(preview.mutate).toHaveBeenCalledTimes(1);
    // contadores
    expect(screen.getByText('Nuevos')).toBeTruthy();
    expect(screen.getByText('Eliminados')).toBeTruthy();
    // diff: nuevo, modificado (tenía horario corrido) y baja
    expect(screen.getByText(/Jose Cristian/)).toBeTruthy();
    expect(screen.getByText('20:00–22:00')).toBeTruthy();
    expect(screen.getByText('07:00–a marcar')).toBeTruthy();
    expect(screen.getByText(/Tenía horario corrido/)).toBeTruthy();
    expect(screen.getByText('10:00–14:00')).toBeTruthy();
    // avisos
    expect(screen.getByText('1 turno con licencia')).toBeTruthy();
    // solo el turno ya cargado que cambia (el de Mateo, sin cargar, no cuenta aunque el backend lo marque omitido)
    expect(screen.getByText('1 cambio sin aplicar')).toBeTruthy();
    expect(screen.queryByText('2 cambios sin aplicar')).toBeNull();
    expect(screen.getByText('Horas por debajo del objetivo')).toBeTruthy();
    expect(screen.getByText('24 h de 30 h')).toBeTruthy();
    expect(screen.getByText('1 empleado sin turnos en la planilla')).toBeTruthy();
    // acciones
    expect(screen.getByText('Publicar (3)')).toBeTruthy();
    expect(screen.getByText('Volver a revisar')).toBeTruthy();
    expect(screen.getByText(/Revisión vigente por/)).toBeTruthy();
  });

  it('el detalle de "sin aplicar" lista solo los turnos que cambiaron, no los que no estaban cargados', () => {
    montar();
    fireEvent.press(screen.getByText('Revisar cambios'));

    fireEvent.press(screen.getByText('1 cambio sin aplicar')); // expande el bloque

    // una sola línea con el motivo de 2 h (la de Cristian); la de Mateo (sin cargar) no aparece
    expect(screen.getAllByText(/Empieza en menos de 2 h o ya empezó/)).toHaveLength(1);
    expect(screen.getByText(/Vie 02\/10 · Tarde · 17:00–21:00/)).toBeTruthy();
  });

  it('si ningún turno cargado cambia, no aparece el aviso de 2 h aunque el backend marque omitidos', () => {
    const soloSinCargar: PlanificacionPreviewDTO = {
      ...PREVIEW,
      resumen: { ...PREVIEW.resumen, omitidos2h: 3, omitidosLicencia: 0 },
      detalle: [
        { userContextId: 7, nombre: 'Mateo', apellido: 'Bernardi', fecha: '2026-10-02', turno: 'Mañana', accion: 'omitido', motivo: '2H', antes: null, despues: { in: '08:00', out: '12:00', sede: 1 } },
        { userContextId: 15, nombre: 'Victor', apellido: 'Bernardi', fecha: '2026-10-02', turno: 'Mañana', accion: 'omitido', motivo: '2H', antes: null, despues: { in: '10:00', out: '14:00', sede: 2 } },
        { userContextId: 8, nombre: 'Cristian', apellido: 'Jose', fecha: '2026-10-02', turno: 'Mañana', accion: 'omitido', motivo: '2H', antes: null, despues: { in: '07:00', out: '09:00', sede: 2 } },
      ],
    };
    montar({ preview: { ok: soloSinCargar } });

    fireEvent.press(screen.getByText('Revisar cambios'));

    expect(screen.queryByText(/cambios? sin aplicar/)).toBeNull();
  });

  it('publicar pide confirmación y manda el preview con una key de idempotencia; luego muestra el éxito y el atajo a turnos', async () => {
    const onVerTurnos = jest.fn();
    const { conf } = montar({ onVerTurnos });

    fireEvent.press(screen.getByText('Revisar cambios'));
    fireEvent.press(screen.getByText('Publicar (3)'));

    await waitFor(() => expect(conf.mutate).toHaveBeenCalledTimes(1));
    expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({ title: 'Publicar horarios', confirmText: 'Publicar' }));
    const [vars] = conf.mutate.mock.calls[0] as [{ previewId: number; idempotencyKey: string }];
    expect(vars.previewId).toBe(9);
    expect(vars.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);

    expect(await screen.findByText('Horarios publicados')).toBeTruthy();
    // sin aplicar = el cambio por 2 h sobre un turno cargado + la licencia (el turno sin cargar no cuenta)
    expect(screen.getByText(/1 nuevo · 1 modificado · 1 eliminado · 2 sin aplicar/)).toBeTruthy();
    fireEvent.press(screen.getByText('Ver turnos del día'));
    expect(onVerTurnos).toHaveBeenCalled();
  });

  it('si el usuario cancela la confirmación no se publica nada', async () => {
    confirmar.mockResolvedValue(false);
    const { conf } = montar();

    fireEvent.press(screen.getByText('Revisar cambios'));
    fireEvent.press(screen.getByText('Publicar (3)'));

    await waitFor(() => expect(confirmar).toHaveBeenCalled());
    expect(conf.mutate).not.toHaveBeenCalled();
  });

  it('sin cambios: avisa que coincide con lo publicado y deja la publicación deshabilitada', () => {
    const sinCambios: PlanificacionPreviewDTO = {
      ...PREVIEW,
      igualAlVigente: true,
      resumen: { altas: 0, modificaciones: 0, bajas: 0, sinCambios: 6, omitidos2h: 0, omitidosLicencia: 0 },
      detalle: [],
      faltantes: { semanaActual: [], proximaSemana: [] },
      usuariosSinTurnos: [],
    };
    const { conf } = montar({ preview: { ok: sinCambios } });

    fireEvent.press(screen.getByText('Revisar cambios'));

    expect(screen.getByText('La planilla coincide con lo publicado')).toBeTruthy();
    fireEvent.press(screen.getByText('Publicar'));
    expect(conf.mutate).not.toHaveBeenCalled();
  });

  it('un 422 de la planilla muestra el título, la lista de errores y vuelve al inicio para reintentar', () => {
    const error = new ApiError('La planilla tiene errores.', 422, 'UNPROCESSABLE_ENTITY', {
      errores: ['Fila 3, lunes (Mañana, columna C): sede desconocida "Marte".'],
    });
    montar({ preview: { error } });

    fireEvent.press(screen.getByText('Revisar cambios'));

    expect(screen.getByText('La planilla tiene errores')).toBeTruthy();
    expect(screen.getByText('Fila 3, lunes (Mañana, columna C): sede desconocida "Marte".')).toBeTruthy();
    expect(screen.getByText('Revisar cambios')).toBeTruthy(); // se puede reintentar
  });

  it('un 412 al publicar (revisión vencida) informa y pide revisar de nuevo', async () => {
    montar({ confirmar: { error: new ApiError('El preview venció', 412) } });

    fireEvent.press(screen.getByText('Revisar cambios'));
    fireEvent.press(screen.getByText('Publicar (3)'));

    expect(await screen.findByText('La revisión venció')).toBeTruthy();
    expect(screen.getByText('Volver a revisar')).toBeTruthy();
  });
});
