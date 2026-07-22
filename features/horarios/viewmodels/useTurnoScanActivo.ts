import { useAuth } from '@/features/auth/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { normalizeTurno, type HorarioUsuarioDTO } from '../models/HorarioDTO';
import { parseLocal } from '../models/Turno';
import { toISO } from '../utils/dateRange';
import { getMisHorarios } from '../services/horariosService';

/** El card de escaneo aparece 20 min antes del horario esperado (entrada o salida). */
const WINDOW_BEFORE_MS = 20 * 60 * 1000;

export interface TurnoScanActivo {
  visible: true;
  tipo: 'IN' | 'OUT';
  turno: 'MANANA' | 'TARDE';
  fecha: string; // "YYYY-MM-DD"
  msLeft: number; // ms hasta esperado_in/esperado_out; negativo si la hora esperada ya pasó
}

export const horariosUserQueryKeys = {
  hoy: (fecha: string) => ['horarios', 'user', fecha] as const,
};

function useMisHorariosHoy(fecha: string) {
  const { tokens } = useAuth();
  return useQuery({
    queryKey: horariosUserQueryKeys.hoy(fecha),
    queryFn: async () => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return getMisHorarios(token, fecha, fecha);
    },
    enabled: !!tokens?.accessToken,
    // Corto: marcado_in_at/marcado_out_at cambian tras cada escaneo y el card
    // debe reflejar eso (esconderse / pasar de "entrada" a "salida") pronto.
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    refetchInterval: 1000 * 60,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 15000),
  });
}

/**
 * Puro: computa el prompt de escaneo activo (si lo hay) a partir de los
 * turnos de hoy y el instante `now`. Recibe `now` en vez de usar `Date.now()`
 * internamente para que el componente pueda re-tickear el countdown sin
 * volver a pegarle al backend.
 *
 * Reglas (ver plan "Rotating/Static QR + Kiosk + Employee Scan UI"):
 *  - Ventana de entrada: abre en `esperado_in - 20min`, cierra cuando se
 *    marca `marcado_in_at`.
 *  - Ventana de salida: abre en `esperado_out - 20min`, cierra cuando se
 *    marca `marcado_out_at`.
 *  - Si hay más de un turno/ventana activa a la vez, se muestra la de
 *    horario esperado más próximo.
 */
export function computeTurnoScanActivo(
  shifts: HorarioUsuarioDTO[] | undefined,
  now: number,
): TurnoScanActivo | null {
  if (!shifts || shifts.length === 0) return null;

  let best: TurnoScanActivo | null = null;
  let bestEsperadoMs = Infinity;

  for (const shift of shifts) {
    if (shift.licencia) continue;

    const attempts: { tipo: 'IN' | 'OUT'; esperado: string | null; marcado: string | null }[] = [
      { tipo: 'IN', esperado: shift.esperado_in, marcado: shift.marcado_in_at },
      { tipo: 'OUT', esperado: shift.esperado_out, marcado: shift.marcado_out_at },
    ];

    for (const attempt of attempts) {
      if (!attempt.esperado || attempt.marcado) continue;

      const esperadoDate = parseLocal(attempt.esperado);
      const esperadoMs = esperadoDate.getTime();
      if (Number.isNaN(esperadoMs)) continue;

      const windowOpensAt = esperadoMs - WINDOW_BEFORE_MS;
      if (now < windowOpensAt) continue;
      if (esperadoMs >= bestEsperadoMs) continue;

      bestEsperadoMs = esperadoMs;
      best = {
        visible: true,
        tipo: attempt.tipo,
        turno: normalizeTurno(shift.turno),
        fecha: toISO(esperadoDate),
        msLeft: esperadoMs - now,
      };
    }
  }

  return best;
}

/**
 * Hook de react-query + cálculo puro: trae los turnos de hoy del usuario
 * autenticado y devuelve el prompt de escaneo activo para el instante `now`
 * (o `null` si no corresponde mostrar nada ahora mismo).
 */
export function useTurnoScanActivo(now: number = Date.now()): TurnoScanActivo | null {
  const fechaHoy = toISO(new Date(now));
  const { data } = useMisHorariosHoy(fechaHoy);
  return computeTurnoScanActivo(data, now);
}
