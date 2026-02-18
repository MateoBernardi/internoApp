// Tipos para opciones de preguntas
export interface Opcion {
  id: number;
  pregunta_id?: number;
  texto_opcion: string;
  orden?: number;
}

// Tipo de pregunta según el backend
export type TipoPregunta = 'rating' | 'texto' | 'multiple_choice' | 'si_no';

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
  creador_user_context_id?: number; // ID del contexto de usuario que creó la encuesta
  created_by?: number;           // ID del creador (desde el backend)
  creador_nombre?: string;       // Nombre del creador
  creador_apellido?: string;     // Apellido del creador
}

// Encuesta completa con preguntas
export interface EncuestaConPreguntas extends Encuesta {
  preguntas: Pregunta[];
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