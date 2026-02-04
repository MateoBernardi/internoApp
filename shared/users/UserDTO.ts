export interface UsuarioEntidadDTO {
    user_context_id: number;
    id_usuario: number;
    id_entidad_tipo: number;
    id_entidad: number;
    id_rol: number;
    fecha_asociacion: Date;
    username: string;
    email: string;
    nombre: string;
    apellido: string;
    usuario_created_at: Date;
    usuario_updated_at: Date;
    entidad_tipo_nombre: string;
    entorno: 'web' | 'mayorista' | 'interno';
    rol_nombre: string;
}

export interface CuentaDisponibleDTO {
    id: number;
    id_entidad_tipo: number;
    id_entidad: number;
    tabla_origen: 'cliente' | 'personal';
    entorno: 'web' | 'mayorista' | 'interno';
    contact: string;
    nombre?: string;
    apellido?: string;
    cuit?: string;
}

export interface ObtenerCuentasResponse {
    success: boolean;
    entorno: string;
    cuit: string;
    total: number;
    cuentas: CuentaDisponibleDTO[];
}

export interface RequestVerificationTokenResponse {
    success: boolean;
    message: string;
    expiresAt: string;
    contact: string;
}

export interface VerifyAndAssociateResponse {
    success: boolean;
    requiresAssociation: boolean;
    message: string;
    accessToken: string;
    refreshToken?: string;
    csrfToken: string;
    asociacion?: any;
}
