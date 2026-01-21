export interface Novedad {
  id?: number;
  titulo: string;
  descripcion: string;
  id_etiqueta?: number;
  prioridad: number;
  createdBy: string;
  createdAt?: Date;
}