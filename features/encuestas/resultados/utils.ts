import { Pregunta, Respuesta } from '../models/Encuesta';

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
  };
  return labels[tipo] || tipo;
};
