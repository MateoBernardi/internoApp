export type TipoEntrada = 'relato' | 'mensaje' | 'cierre';
export type TipoAdjunto = 'imagen' | 'video' | 'documento';

export interface Adjunto {
  id: string;
  entrada_id: string;
  tipo: TipoAdjunto;
  nombre: string;
  mime: string;
  tamano: number;
  orden: number;
}

export interface Entrada {
  id: string;
  informe_id: string;
  tipo: TipoEntrada;
  autor_id: number;
  menciones: number[];
  creado_en: string;
  editado_en: string | null;
  cuerpo: string;
  adjuntos: Adjunto[];
}

export interface Persona {
  id: number;
  nombre: string;
  apellido: string;
}

export interface InformeResumen {
  informe_id: string;
  creador: number;
  creador_nombre: string | null;
  creador_apellido: string | null;
  creada_en: string;
  cerrada: boolean;
  entradas: number;
  adjuntos: number;
  ultima_actividad: string;
  titulo: string;
  preview: string;
  mencionado: boolean;
}

export interface InformeListado {
  informes: InformeResumen[];
  nextCursor: string | null;
}

export interface InformeDetalle {
  informe_id: string;
  creador: number;
  cerrada: boolean;
  entradas: Entrada[];
  personas: Record<number, Persona>;
}

export interface InformeCreado {
  informe_id: string;
  entrada: Entrada;
}

export interface UrlAdjunto {
  url: string;
  expira_en: number;
}

export interface AdjuntoPendiente {
  uri: string;
  nombre: string;
  mime: string;
  tamano: number;
  tipo: TipoAdjunto;
}
