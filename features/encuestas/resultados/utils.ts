import { ParticipanteResumen, Pregunta, Respuesta } from '../models/Encuesta';

export interface RespuestaAgrupada {
  encuestaId: number;
  encuestaTitulo: string;
  encuestaDescripcion?: string;
  fecha_creacion?: string;
  fecha_fin?: string;
  es_anonima?: boolean;
  creador_user_context_id?: number;
  created_by?: number;
  creador_nombre?: string;
  creador_apellido?: string;
  destinatarios_count?: number;
  convocados?: number[];
  participantes?: ParticipanteResumen[];
  preguntas: {
    pregunta: Pregunta;
    respuestas: Respuesta[];
  }[];
}

/** Agrupa las encuestas del backend en `RespuestaAgrupada` (pregunta → respuestas). */
export const agruparEncuestas = (encuestas: any[]): RespuestaAgrupada[] => {
  if (!encuestas || !Array.isArray(encuestas)) {
    return [];
  }

  return encuestas
    .filter((encuesta) => encuesta.preguntas && encuesta.preguntas.length > 0)
    .map((encuesta) => {
      const preguntasAgrupadas = encuesta.preguntas?.map((pregunta: any) => ({
        pregunta: pregunta as Pregunta,
        respuestas: pregunta.respuestas || [], // Las respuestas vienen directamente del backend
      })) || [];

      return {
        encuestaId: encuesta.id,
        encuestaTitulo: encuesta.titulo,
        encuestaDescripcion: encuesta.descripcion,
        fecha_creacion: encuesta.fecha_creacion,
        fecha_fin: encuesta.fecha_fin,
        es_anonima: encuesta.es_anonima,
        creador_user_context_id: encuesta.creador_user_context_id,
        created_by: encuesta.created_by,
        creador_nombre: encuesta.creador_nombre,
        creador_apellido: encuesta.creador_apellido,
        destinatarios_count: encuesta.destinatarios_count,
        convocados: encuesta.convocados ?? [],
        participantes: encuesta.participantes ?? [],
        preguntas: preguntasAgrupadas,
      };
    });
};

export const calcularTotalRespuestas = (encuesta: RespuestaAgrupada): number => {
  return encuesta.preguntas.reduce((total, p) => total + p.respuestas.length, 0);
};

export const getTipoPreguntaLabel = (tipo: string): string => {
  const labels: Record<string, string> = {
    rating: '⭐ Rating',
    texto: '📝 Texto',
    multiple_choice: '☑️ Opción múltiple',
    si_no: '✓/✗ Sí/No',
    horario: '🕐 Horario',
  };
  return labels[tipo] || tipo;
};

/** Formatea un ISO datetime string del tipo horario como "dd/mm/aaaa-hh:mm". */
export function formatHorarioSlot(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year}-${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}
