export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  username: string;
  email: string;
  rol?: string[];
}

export interface UserContext {
  user_context_id: number;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  rol_nombre: string;
  entidad_tipo_nombre: string;
}

export interface UserSummary {
  user_context_id: number;
  id_usuario: number;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  role?: string[];
}

