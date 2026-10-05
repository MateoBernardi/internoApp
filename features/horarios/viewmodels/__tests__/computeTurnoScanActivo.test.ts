import type { HorarioUsuarioDTO } from '../../models/HorarioDTO';
import { computeTurnoScanActivo } from '../useTurnoScanActivo';

// Fechas locales (el modelo parsea sin zona, igual que el backend guarda hora local AR).
const local = (h: number, m = 0, dia = 6) => new Date(2026, 9, dia, h, m, 0).getTime();
const ts = (h: number, m = 0, dia = 6) => `2026-10-${String(dia).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

const turno = (cambios: Partial<HorarioUsuarioDTO> = {}): HorarioUsuarioDTO => ({
  id: 1,
  user_context_id: 14,
  turno: 'Mañana',
  esperado_in: ts(8),
  esperado_out: ts(12),
  sede_id_in: 1,
  sede_id_out: 1,
  licencia: false,
  feriado: false,
  marcado_in_at: null,
  marcado_out_at: null,
  nombre: 'Ana',
  apellido: 'Gómez',
  ...cambios,
});

describe('computeTurnoScanActivo', () => {
  it('ofrece la entrada desde 20 min antes y conserva el nombre exacto del turno (Rotativo no se colapsa a Tarde)', () => {
    const r = computeTurnoScanActivo([turno({ turno: 'Rotativo' })], local(7, 45));

    expect(r).toMatchObject({ tipo: 'IN', turno: 'TARDE', turnoNombre: 'Rotativo', fecha: '2026-10-06' });
  });

  it('turnos Mañana y Tarde conservan su nombre', () => {
    expect(computeTurnoScanActivo([turno()], local(7, 50))?.turnoNombre).toBe('Mañana');
    expect(computeTurnoScanActivo([turno({ turno: 'Tarde', esperado_in: ts(16), esperado_out: ts(20) })], local(15, 50))?.turnoNombre).toBe('Tarde');
  });

  it('no ofrece nada fuera de ventana ni con licencia', () => {
    expect(computeTurnoScanActivo([turno()], local(6, 0))).toBeNull();
    expect(computeTurnoScanActivo([turno({ licencia: true })], local(8, 0))).toBeNull();
  });

  describe('horario corrido (sin esperado_out)', () => {
    const corrido = (cambios: Partial<HorarioUsuarioDTO> = {}) => turno({ esperado_out: null, ...cambios });

    it('con entrada marcada ofrece la salida en cualquier momento del día del turno', () => {
      const t = corrido({ marcado_in_at: ts(8, 3) });

      expect(computeTurnoScanActivo([t], local(8, 30))).toMatchObject({ tipo: 'OUT', turnoNombre: 'Mañana', fecha: '2026-10-06' });
      expect(computeTurnoScanActivo([t], local(19, 40))).toMatchObject({ tipo: 'OUT' });
    });

    it('sin entrada marcada no ofrece la salida: ofrece la entrada hasta el fin del día del turno', () => {
      expect(computeTurnoScanActivo([corrido()], local(7, 30))).toBeNull();
      expect(computeTurnoScanActivo([corrido()], local(8, 10))).toMatchObject({ tipo: 'IN' });
      expect(computeTurnoScanActivo([corrido()], local(15, 0))).toMatchObject({ tipo: 'IN' });
      expect(computeTurnoScanActivo([corrido()], local(23, 59))).toMatchObject({ tipo: 'IN' });
      expect(computeTurnoScanActivo([corrido()], local(0, 1, 7))).toBeNull();
    });

    it('deja de ofrecerla cuando ya se marcó la salida', () => {
      const t = corrido({ marcado_in_at: ts(8, 3), marcado_out_at: ts(17, 0) });

      expect(computeTurnoScanActivo([t], local(17, 5))).toBeNull();
    });

    it('vence pasada la gracia posterior al día del turno', () => {
      const t = corrido({ marcado_in_at: ts(8, 3) });

      expect(computeTurnoScanActivo([t], local(1, 30, 7))).toMatchObject({ tipo: 'OUT' }); // dentro de las 2 h de gracia
      expect(computeTurnoScanActivo([t], local(3, 0, 7))).toBeNull();
    });
  });
});
