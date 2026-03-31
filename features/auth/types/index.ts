// Tipos para autenticación móvil

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  success: boolean;
  requiresAssociation: boolean;
  accessToken?: string;
  refreshToken?: string;
  availabableContexts: any[];
  message?: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  message?: string;
}

export interface UserContextResponse {
  authenticated: boolean;
  user?: {
    id: number;
    username: string;
    email: string;
    nombre?: string;
    apellido?: string;
    cuentas?: any[];
  };
  message?: string;
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
  userId?: number;
}

export interface CuentaDisponible {
  id: number;
  nombre: string;
  apellido: string;
  direccion: string;
  localidad: string;
  cuit: string;
  tipo_cuenta: string;
  tabla_origen: string;
  id_entidad_tipo: number;
  entorno: string;
  contact: string; // email o teléfono
}

export interface ObtenerCuentasResponse {
  success: boolean;
  entorno: string;
  cuit: string;
  total: number;
  cuentas: CuentaDisponible[];
}

export interface SolicitarVerificacionResponse {
  success: boolean;
  message: string;
  expiresAt: string;
  contact: string; // Enmascarado (341***1234)
}

export interface ValidarVerificacionResponse {
  success: boolean;
  requiresAssociation: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  asociacion?: {
    id: number;
    id_usuario: number;
    id_entidad: number;
    id_entidad_tipo: number;
    id_rol: number;
    fecha_asociacion: string;
  };
  attemptsLeft?: number; // Solo si falla;
}

export type AuthState = 
  | 'not-authenticated'
  | 'requires-association'
  | 'selecting-account'
  | 'waiting-verification'
  | 'authenticated';

export type VerificationStep = 'search' | 'select' | 'verify';

export interface AssociationState {
  step: VerificationStep;
  cuit: string;
  cuentas: CuentaDisponible[];
  selectedAccount: CuentaDisponible | null;
  verificationContact: string;
  codigo: string;
  attemptsLeft: number;
  loading: boolean;
  error: string;
}
