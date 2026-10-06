import { useAuth } from '@/features/auth/context/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useQuery } from '@tanstack/react-query';
import { normalizeTurno, type HorarioUsuarioDTO, type TurnoEnum } from '../models/HorarioDTO';
import { parseLocal, turnoNombreFromBackend } from '../models/Turno';
import { toISO } from '../utils/dateRange';
import { getMisHorarios } from '../services/horariosService';

/** El card de escaneo aparece 20 min antes del horario esperado (entrada y salida). */
const WINDOW_BEFORE_MS = 20 * 60 * 1000;
/** La salida queda habilitada hasta 2h después del horario esperado. */
const OUT_WINDOW_AFTER_MS = 2 * 60 * 60 * 1000;

export interface TurnoScanActivo {
  visible: true;
  tipo: 'IN' | 'OUT';
  turno: 'MANANA' | 'TARDE';
  /** Nombre exacto del turno (incluye Rotativo y Noche): es el que identifica la planificación al escanear. */
  turnoNombre: TurnoEnum;
  fecha: string; // "YYYY-MM-DD"
  msLeft: number; // ms hasta esperado_in/esperado_out; negativo si la hora esperada ya pasó
}

export const horariosUserQueryKeys = {
  hoy: (fecha: string) => ['horarios', 'user', fecha] as const,
};

function useMisHorariosHoy(fecha: string) {
  const { tokens } = useAuth();
  const { canTenerHorariosPropios } = useRoleCheck();
  return useQuery({
    queryKey: horariosUserQueryKeys.hoy(fecha),
    queryFn: async () => {
      const token = tokens?.accessToken;
      if (!token) throw new Error('No access token');
      return getMisHorarios(token, fecha, fecha);
    },
    enabled: !!tokens?.accessToken && canTenerHorariosPropios(),
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
 *    marca `marcado_in_at` o al llegar a `esperado_out - 20min` sin marcar
 *    (en horario corrido, sin `esperado_out`, al terminar el día del turno).
 *  - Ventana de salida: solo puede abrir si ya se marcó `marcado_in_at` (si
 *    la entrada nunca se marcó, la salida no se ofrece). Abre en
 *    `esperado_out - 20min`, cierra cuando se marca `marcado_out_at` o
 *    pasadas `esperado_out + 2h` sin marcar.
 *  - Un intento vencido deja de contar: no bloquea el siguiente turno del
 *    día, que pasa a mostrarse en cuanto abre su propia ventana.
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

    // Horario corrido: no hay salida esperada (esperado_out null), así que la salida se ofrece desde
    // que se marcó la entrada hasta el fin del día del turno (más la gracia de la ventana de salida).
    if (!shift.esperado_out && shift.esperado_in && shift.marcado_in_at && !shift.marcado_out_at) {
      const marcadoInMs = parseLocal(shift.marcado_in_at).getTime();
      const inicio = parseLocal(shift.esperado_in);
      const finDelDia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 1).getTime();
      if (
        !Number.isNaN(marcadoInMs) &&
        now >= marcadoInMs &&
        now <= finDelDia + OUT_WINDOW_AFTER_MS &&
        marcadoInMs < bestEsperadoMs
      ) {
        bestEsperadoMs = marcadoInMs;
        best = {
          visible: true,
          tipo: 'OUT',
          turno: normalizeTurno(shift.turno),
          turnoNombre: turnoNombreFromBackend(shift.turno),
          fecha: toISO(inicio),
          msLeft: 0, // sin hora esperada
        };
      }
      continue;
    }

    const attempts: { tipo: 'IN' | 'OUT'; esperado: string | null; marcado: string | null }[] = [
      { tipo: 'IN', esperado: shift.esperado_in, marcado: shift.marcado_in_at },
      { tipo: 'OUT', esperado: shift.esperado_out, marcado: shift.marcado_out_at },
    ];

    for (const attempt of attempts) {
      if (!attempt.esperado || attempt.marcado) continue;
      // La salida solo puede ofrecerse si ya se marcó la entrada.
      if (attempt.tipo === 'OUT' && !shift.marcado_in_at) continue;

      const esperadoDate = parseLocal(attempt.esperado);
      const esperadoMs = esperadoDate.getTime();
      if (Number.isNaN(esperadoMs)) continue;

      let windowOpensAt: number;
      let windowClosesAt: number;

      if (attempt.tipo === 'IN') {
        windowOpensAt = esperadoMs - WINDOW_BEFORE_MS;
        // La entrada se sigue ofreciendo hasta 20min antes de la salida
        // esperada (o, en horario corrido, hasta el fin del día del turno).
        const esperadoOutMs = shift.esperado_out ? parseLocal(shift.esperado_out).getTime() : NaN;
        windowClosesAt = !Number.isNaN(esperadoOutMs)
          ? esperadoOutMs - WINDOW_BEFORE_MS
          : new Date(esperadoDate.getFullYear(), esperadoDate.getMonth(), esperadoDate.getDate() + 1).getTime();
      } else {
        windowOpensAt = esperadoMs - WINDOW_BEFORE_MS;
        windowClosesAt = esperadoMs + OUT_WINDOW_AFTER_MS;
      }

      if (now < windowOpensAt || now > windowClosesAt) continue;
      if (esperadoMs >= bestEsperadoMs) continue;

      bestEsperadoMs = esperadoMs;
      best = {
        visible: true,
        tipo: attempt.tipo,
        turno: normalizeTurno(shift.turno),
        turnoNombre: turnoNombreFromBackend(shift.turno),
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
