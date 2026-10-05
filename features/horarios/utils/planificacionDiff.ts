import type {
  DiffHorario,
  DiffTurnoDetalle,
  MotivoOmitido,
  PlanificacionResumen,
} from '../models/Planificacion';

export interface GrupoUsuarioDiff {
  userContextId: number;
  nombre: string;
  apellido: string;
  /** Altas, modificaciones y bajas que se van a aplicar. */
  cambios: DiffTurnoDetalle[];
  /** Cambios que NO se aplican (regla de 2 h, marcado o licencia). */
  omitidos: DiffTurnoDetalle[];
}

const ORDEN_TURNO: Record<string, number> = { Mañana: 0, Tarde: 1 };

const compararDetalle = (a: DiffTurnoDetalle, b: DiffTurnoDetalle): number =>
  a.fecha.localeCompare(b.fecha) || (ORDEN_TURNO[a.turno] ?? 9) - (ORDEN_TURNO[b.turno] ?? 9);

/** Agrupa el diff por empleado (apellido, nombre), con los cambios y los omitidos por separado y ordenados por fecha. */
export function agruparDiffPorUsuario(detalle: DiffTurnoDetalle[]): GrupoUsuarioDiff[] {
  const grupos = new Map<number, GrupoUsuarioDiff>();
  for (const d of detalle) {
    const grupo =
      grupos.get(d.userContextId) ??
      ({ userContextId: d.userContextId, nombre: d.nombre, apellido: d.apellido, cambios: [], omitidos: [] } as GrupoUsuarioDiff);
    (d.accion === 'omitido' ? grupo.omitidos : grupo.cambios).push(d);
    grupos.set(d.userContextId, grupo);
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, cambios: [...g.cambios].sort(compararDetalle), omitidos: [...g.omitidos].sort(compararDetalle) }))
    .sort((a, b) => a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
}

/** "08:00–12:00", o "07:00–a marcar" si es horario corrido (sin salida prevista). */
export function formatHorario(h: DiffHorario | null): string {
  if (!h) return '—';
  return `${h.in}–${h.out ?? 'a marcar'}`;
}

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** "2026-10-03" → "Sáb 03/10". */
export function formatFechaCorta(fechaISO: string): string {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const dia = DIAS_CORTOS[new Date(y, m - 1, d).getDay()];
  return `${dia} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

export const MOTIVO_OMITIDO_TEXTO: Record<MotivoOmitido, string> = {
  '2H': 'Empieza en menos de 2 h o ya empezó',
  MARCADO: 'Ya tiene marcado',
  LICENCIA: 'Día con licencia: cambialo a mano',
};

/**
 * ¿Vale la pena avisar de este cambio que NO se aplica? Un cambio omitido por la regla de 2 h
 * (o por marcado) solo se informa si había un horario ya cargado que se modifica o se elimina:
 * un turno que todavía no existe y no se pudo crear no es una "modificación", y avisarlo hacía
 * que saliera el mensaje para todos los empleados con turno ese día. Las licencias se informan siempre.
 */
export function esOmitidoRelevante(d: DiffTurnoDetalle): boolean {
  if (d.accion !== 'omitido') return false;
  if (d.motivo === 'LICENCIA') return true;
  if (!d.antes) return false; // no había horario cargado: no se modificó nada
  if (!d.despues) return true; // la planilla lo elimina
  return (
    d.antes.in !== d.despues.in ||
    d.antes.out !== d.despues.out ||
    d.antes.sede !== d.despues.sede ||
    Boolean(d.antes.horarioCorrido)
  );
}

/** Cambios omitidos por la regla de 2 h (o por marcado) sobre horarios que realmente se modificaron. */
export function omitidosPor2h(detalle: DiffTurnoDetalle[]): DiffTurnoDetalle[] {
  return detalle.filter((d) => d.motivo !== 'LICENCIA' && esOmitidoRelevante(d));
}

/** Total de cambios que no se aplican y vale la pena informar (2 h/marcado relevantes + licencias). */
export const contarOmitidosRelevantes = (detalle: DiffTurnoDetalle[]): number =>
  detalle.filter(esOmitidoRelevante).length;

/** Cantidad de turnos que realmente se van a escribir (alta + modificación + baja). */
export function totalCambios(resumen: PlanificacionResumen): number {
  return resumen.altas + resumen.modificaciones + resumen.bajas;
}

export const totalOmitidos = (resumen: PlanificacionResumen): number =>
  resumen.omitidos2h + resumen.omitidosLicencia;

/** Segundos que faltan para `expiraAt` (nunca negativo). `ahora` se inyecta para poder testear. */
export function segundosRestantes(expiraAtISO: string, ahora: number = Date.now()): number {
  const ms = new Date(expiraAtISO).getTime() - ahora;
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 1000)) : 0;
}

/** 125 → "2:05". */
export function formatMinSeg(totalSegundos: number): string {
  const min = Math.floor(totalSegundos / 60);
  const seg = totalSegundos % 60;
  return `${min}:${String(seg).padStart(2, '0')}`;
}

/** ISO → "02/10/2026 11:44" en hora local del dispositivo. */
export function formatFechaHoraLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
