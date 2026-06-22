// Tipos para opciones de preguntas
export interface Opcion {
  id: number;
  pregunta_id?: number;
  texto_opcion: string; // Para tipo horario: ISO datetime string (ej. "2026-06-23T09:00:00.000Z")
  orden?: number;
  respuestas_count?: number; // Para tipo horario: cantidad de respuestas ya elegidas (slot ocupado)
}

// Tipo de pregunta según el backend
export type TipoPregunta = 'rating' | 'texto' | 'multiple_choice' | 'si_no' | 'horario';

// Pregunta de encuesta
export interface Pregunta {
  id?: number;
  encuesta_id?: number;
  titulo: string;
  tipo_pregunta: TipoPregunta;
  orden: number;
  es_obligatoria: boolean;
  opciones?: string[]; // Array de strings para crear opciones
  opcionesCompletas?: Opcion[]; // Opciones completas devueltas por el backend
}

// Encuesta base
export interface Encuesta {
  id: number;
  titulo: string;
  descripcion?: string;
  categoria: 'interna' | 'externa' | 'feedback_empleado';
  es_anonima: boolean;
  fecha_creacion: string;
  fecha_fin: string;
  preguntas: Pregunta[];
  creador_user_context_id?: number;
  created_by?: number;
  creador_nombre?: string;
  creador_apellido?: string;
  invitados?: number[];          // IDs de usuario_entidad invitados ([] = todos los empleados)
  destinatarios_count?: number;  // Total de destinatarios (devuelto por el backend)
  convocados?: number[];         // user_context_ids que ya recibieron solicitud de reunión desde esta encuesta
  participantes?: ParticipanteResumen[]; // Usuarios que ya respondieron (devuelto por GET /encuestas/respuestas)
}

// Encuesta completa con preguntas
export interface EncuestaConPreguntas extends Encuesta {
  preguntas: Pregunta[];
}

// Participante tal como lo devuelve el backend en GET /encuestas/respuestas
export interface ParticipanteResumen {
  user_context_id: number;
  nombre: string;
  apellido: string;
}

// Respuesta individual a una pregunta
export interface Respuesta {
  id?: number;
  pregunta_id: number;
  valor_rating?: number; // Para tipo rating (1-5)
  respuesta_texto?: string; // Para tipo texto
  opcion_id?: number; // Para tipo multiple_choice
  evaluado_id?: number; // ID de la entidad evaluada (empleado, sucursal, etc.)
  evaluado_tipo?: 'empleado' | 'sucursal' | 'local' | 'producto'; // Tipo de entidad evaluada
  fecha_respuesta?: string;
  usuario_id?: number; // ID del usuario que responde
  nombre?: string; // Nombre del usuario que responde
  apellido?: string; // Apellido del usuario que responde
}