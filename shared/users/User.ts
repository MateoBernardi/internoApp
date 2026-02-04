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
  id_usuario?: number;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  role?: string[];
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  nombre: string;
  apellido: string;
}

export interface CreateUserResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    username: string;
    email: string;
    nombre: string;
    apellido: string;
    created_at: string;
  };
}

export interface UpdateUserResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    username: string;
    email: string;
    nombre: string;
    apellido: string;
    updated_at: string;
  };
}

export interface UpdatePasswordResponse {
  success: boolean;
  message: string;
}

export interface UpdateUserRoleResponse {
  success: boolean;
  message: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
}

export interface UpdatePasswordRequest {
  newPassword: string;
}

export interface UpdateUserRoleRequest {
  roleId: number;
}

export interface UpdateResponse {
  success: boolean;
  message: string;
}


