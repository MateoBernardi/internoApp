/**
 * Interfaz para el perfil básico del usuario
 */
export interface UserProfile {
  id?: number;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interfaz para el contexto extendido del usuario
 * Basado en el endpoint /usuario-contexto
 */
export interface ExtendedUserContext {
  user_context_id: number;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  rol_nombre: string;
  entidad_tipo_nombre: string;
}

/**
 * Information about user contexts (entidades/roles)
 */
export interface UserContextInfo {
  user_context_id: number;
  id_entidad: number;
  id_entidad_tipo: number;
  entorno: 'web' | 'mayorista' | 'interno';
  rol_nombre: string;
  tabla_origen: string;
}

/**
 * Interface for the complete authenticated user context
 * Includes both authentication state and user profile data
 */
export interface AuthenticatedUserContext {
  isAuthenticated: boolean;
  user: UserProfile | null;
  userContext: ExtendedUserContext | null;
  availableContexts?: UserContextInfo[];
}

