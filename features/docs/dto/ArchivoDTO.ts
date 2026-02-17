export interface ArchivoDTO {
  id: number;
  nombre: string;
  ruta_r2: string;
  tipo: string;
  tamaño: number;
  titulo?: string;
  created_by: number;
  creador_nombre: string;
  creador_apellido: string;
  created_at: Date;
  id_usuario_asociado?: number;
}