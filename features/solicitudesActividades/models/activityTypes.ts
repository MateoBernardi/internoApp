import { ParticipanteActividad } from './Actividad';

/**
 * Tipo interno para actividades mapeadas para la UI de la agenda.
 */
export interface Activity {
  id: string;
  actividad_id?: number;
  time: string;
  title: string;
  description?: string;
  completed: boolean;
  date: string;
  rol?: string;
  participantes?: ParticipanteActividad[];
  tipo?: 'actividad' | 'licencia' | 'turno';
  solicitud_id?: number | null;
  tipo_licencia_id?: number;
  tipo_licencia_nombre?: string;
  usuario_id?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  tipo_actividad?: 'MANDATO' | 'REUNION'; // Tipo de actividad heredado de la solicitud
  // turno-specific fields
  turno_code?: 'M' | 'T';
  sede_ingreso?: string;
  sede_egreso?: string;
  planificacion_id?: number;
  acepted_at?: string | null;
}
