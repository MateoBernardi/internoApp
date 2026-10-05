// Tipos de la API /historias y /analitica (JSON: las fechas llegan como ISO string).

export type TipoEntrada = 'relato' | 'mensaje' | 'cierre';

export interface EntradaDTO {
  id: string;
  historia_id: string;
  tipo: TipoEntrada;
  autor_id: number;
  menciones: number[];
  creado_en: string;
  cuerpo: string;
}

export interface PersonaResumenDTO {
  id: number;
  nombre: string;
  apellido: string;
}

export interface HistoriaResumenDTO {
  historia_id: string;
  creador: number;
  creador_nombre: string | null;
  creador_apellido: string | null;
  creada_en: string;
  cerrada: boolean;
  entradas: number;
  ultima_actividad: string;
  preview: string;
}

export interface HistoriaListadoDTO {
  historias: HistoriaResumenDTO[];
  nextCursor: string | null;
}

export interface HistoriaDetalleDTO {
  historia_id: string;
  creador: number;
  cerrada: boolean;
  entradas: EntradaDTO[];
  personas: Record<number, PersonaResumenDTO>;
}

export interface PalabraDTO {
  palabra: string;
  apariciones: number;
  entradas: number;
}

export interface PersonaMencionadaDTO {
  persona_id: number;
  nombre: string | null;
  apellido: string | null;
  menciones: number;
  mencionada_por: number;
}

export interface AristaMencionDTO {
  de: number;
  a: number;
  menciones: number;
  historias: number;
}

export interface GrafoMencionesDTO {
  nodos: PersonaResumenDTO[];
  aristas: AristaMencionDTO[];
}

export interface ActividadSemanalDTO {
  semana: string;
  historias: number;
  entradas: number;
}
