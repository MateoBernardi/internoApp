import { ParticipanteActividad } from '../models/Actividad';

/**
 * Tipo interno para actividades mapeadas para la UI de la agenda.
 */
export interface Activity {
  id: string;
  time: string;
  title: string;
  description?: string;
  completed: boolean;
  date: string;
  rol?: string;
  participantes?: ParticipanteActividad[];
  tipo?: 'actividad' | 'licencia';
  solicitud_id?: number | null;
  tipo_licencia_id?: number;
  tipo_licencia_nombre?: string;
  usuario_id?: number;
  fecha_fin?: string;
  tipo_actividad?: 'MANDATO' | 'REUNION'; // Tipo de actividad heredado de la solicitud
}
