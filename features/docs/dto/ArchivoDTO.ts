export interface ArchivoDTO {
  id: number;
  nombre: string;
  ruta_r2: string;
  id_carpeta?: number | null;
  tipo: string;
  tamaño: number;
  titulo?: string;
  id_tipo?: number;
  uso?: string;
  created_by: number;
  creador_nombre: string;
  creador_apellido: string;
  opened_at?: Date | null;
  created_at: Date;
  id_usuario_asociado?: number;
  allowed_roles?: string[];
  usuarios_compartidos?: number[];
  usuarios_asociados?: number[];
  // URL firmada lista para usar, cuando el endpoint ya la resuelve (p. ej. la
  // bitácora de una solicitud). Ausente en los listados que la resuelven bajo
  // demanda vía GET /archivos/:id/url.
  url?: string;
}