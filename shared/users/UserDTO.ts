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

export interface RequestVerificationTokenResponse {
    success: boolean;
    message: string;
    /** Emails enmascarados a los que se mandó un código (uno por cuenta del CUIT) */
    destinos: string[];
}

export interface VerifyAndAssociateResponse {
    success: boolean;
    requiresAssociation: boolean;
    message: string;
    accessToken: string;
    refreshToken?: string;
    csrfToken?: string;
    asociacion?: any;
}
