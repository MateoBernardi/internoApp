import { normalizeTurno, type HorarioDTO } from '@/features/horarios/models/HorarioDTO';
import type { Actividad, Licencia } from '../models/Actividad';
import type { Activity } from '../models/activityTypes';
import { formatDateKey, formatLocalDateTime, formatTimeHHMM } from './dateUtils';

function stripTz(iso: string): Date {
  const stripped = iso.replace(/([+-]\d{2}:?\d{2}|Z)$/, '').replace(' ', 'T');
  return new Date(stripped);
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Expande actividades de la API a celdas `Activity` por día (una entrada por
 * cada día que abarca el rango fecha_inicio→fecha_fin).
 */
export function mapActivities(apiActivities: Actividad[]): Activity[] {
  const expanded: Activity[] = [];

  (apiActivities || []).forEach((act) => {
    const start = act.fecha_inicio;
    const parsedEnd = act.fecha_fin ?? null;
    const hasValidEnd = !!parsedEnd && parsedEnd > start;
    const end = hasValidEnd ? parsedEnd : new Date(start);

    if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
      return;
    }

    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    while (cursor.getTime() <= endDay.getTime()) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);

      const segmentStart = start > dayStart ? new Date(start) : dayStart;
      const segmentEnd = end < dayEnd ? new Date(end) : dayEnd;
      const date = formatDateKey(cursor);

      expanded.push({
        id: `actividad-${act.id ?? act.solicitud_id ?? start.getTime()}-${date}`,
        actividad_id: act.id,
        time: formatTimeHHMM(segmentStart),
        title: act.titulo,
        description: act.descripcion,
        completed: false,
        date,
        rol: act.rol,
        participantes: act.participantes,
        solicitud_id: act.solicitud_id,
        fecha_inicio: formatLocalDateTime(segmentStart),
        fecha_fin: act.fecha_fin ? formatLocalDateTime(segmentEnd) : undefined,
        tipo: 'actividad',
        tipo_actividad: act.tipo_actividad,
      });

      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return expanded;
}

/**
 * Expande licencias de la API a celdas `Activity` por día.
 */
export function mapLicencias(licencias: Licencia[]): Activity[] {
  const expanded: Activity[] = [];

  (licencias || []).forEach((lic) => {
    const start = lic.fecha_inicio;
    const end = lic.fecha_fin;
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    while (cursor.getTime() <= endDay.getTime()) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);
      const segmentStart = start > dayStart ? new Date(start) : dayStart;
      const segmentEnd = end < dayEnd ? new Date(end) : dayEnd;
      const date = formatDateKey(cursor);

      expanded.push({
        id: `licencia-${lic.id}-${date}`,
        time: formatTimeHHMM(segmentStart),
        title: lic.tipo_licencia_nombre || 'Licencia',
        description: lic.tipo_licencia_nombre || '',
        completed: false,
        date,
        tipo: 'licencia',
        tipo_licencia_id: lic.tipo_licencia_id,
        tipo_licencia_nombre: lic.tipo_licencia_nombre,
        usuario_id: lic.usuario_id,
        fecha_inicio: formatLocalDateTime(segmentStart),
        fecha_fin: formatLocalDateTime(segmentEnd),
      });

      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return expanded;
}

/**
 * Convierte HorarioDTO del backend a celdas Activity para la agenda personal.
 */
export function mapTurnos(horarios: HorarioDTO[]): Activity[] {
  return (horarios || []).filter((h) => !(h.licencia ?? h.esta_de_licencia)).map((h) => {
    const inDate = stripTz(h.esperado_in);
    const outDate = stripTz(h.esperado_out);
    const date = `${inDate.getFullYear()}-${pad2(inDate.getMonth() + 1)}-${pad2(inDate.getDate())}`;
    const ingreso = `${pad2(inDate.getHours())}:${pad2(inDate.getMinutes())}`;
    const egreso = `${pad2(outDate.getHours())}:${pad2(outDate.getMinutes())}`;
    const turno = normalizeTurno(h.turno);
    const turnoCode: 'M' | 'T' = turno === 'MANANA' ? 'M' : 'T';
    const turnoLabel = turno === 'MANANA' ? 'Mañana' : 'Tarde';

    return {
      id: `turno-${h.planificacion_id ?? h.id}`,
      time: ingreso,
      title: `Turno ${turnoLabel}`,
      date,
      completed: false,
      tipo: 'turno' as const,
      turno_code: turnoCode,
      // sede_ingreso/egreso omitidos hasta que la agenda tenga lookup de nombres de sede
      fecha_inicio: `${date}T${ingreso}:00`,
      fecha_fin: `${date}T${egreso}:00`,
      // pd.id es bigint → el backend lo serializa como string; coercionamos a number.
      planificacion_id: Number(h.planificacion_id ?? h.id) || undefined,
      acepted_at: h.acepted_at ?? null,
    };
  });
}
