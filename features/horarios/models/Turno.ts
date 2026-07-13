import { normalizeTurno, type HorarioDTO } from './HorarioDTO';

export const TURNO_LABEL: Record<'MANANA' | 'TARDE', string> = {
  MANANA: 'Mañana',
  TARDE: 'Tarde',
};

export const TURNO_CODE: Record<'MANANA' | 'TARDE', string> = {
  MANANA: 'M',
  TARDE: 'T',
};

// UI-layer model used by admin panel components
export interface Turno {
  id: number;            // planificacion_id
  userContextId: number;
  nombre: string;        // "Nombre Apellido"
  fecha: string;         // "DD/MM/AAAA" for display
  fechaISO: string;      // "YYYY-MM-DD" for API queries
  turno: 'MANANA' | 'TARDE';
  ingreso: string;       // "HH:MM"
  egreso: string;        // "HH:MM"
  sedeIdIngreso: number;
  sedeIdEgreso: number;
  licencia: boolean;
  isNew?: boolean;
  aceptedAt?: string | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

// Strips timezone suffix and parses as local time (same pattern as AgendaDiaria.tsx)
function parseLocal(iso: string): Date {
  const stripped = iso.replace(/([+-]\d{2}:?\d{2}|Z)$/, '').replace(' ', 'T');
  return new Date(stripped);
}

export function mapHorarioDTOToTurno(dto: HorarioDTO): Turno {
  const inDate = parseLocal(dto.esperado_in);
  const outDate = parseLocal(dto.esperado_out);

  return {
    id: dto.planificacion_id ?? dto.id ?? 0,
    userContextId: dto.user_context_id,
    nombre: `${dto.nombre} ${dto.apellido}`,
    fecha: `${pad(inDate.getDate())}/${pad(inDate.getMonth() + 1)}/${inDate.getFullYear()}`,
    fechaISO: `${inDate.getFullYear()}-${pad(inDate.getMonth() + 1)}-${pad(inDate.getDate())}`,
    turno: normalizeTurno(dto.turno),
    ingreso: `${pad(inDate.getHours())}:${pad(inDate.getMinutes())}`,
    egreso: `${pad(outDate.getHours())}:${pad(outDate.getMinutes())}`,
    sedeIdIngreso: dto.sede_id_in,
    sedeIdEgreso: dto.sede_id_out,
    licencia: dto.licencia ?? dto.esta_de_licencia ?? false,
    aceptedAt: dto.acepted_at ?? null,
  };
}
