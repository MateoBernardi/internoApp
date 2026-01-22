export interface Bitacora {
    id: number;
    estado_anterior: string;
    estado_nuevo: string;
    observacion: string;
    created_at: string; // ISO Date
    usuario_id: number;
    usuario_nombre: string;
}

export interface Objetivo {
    id: number;
    titulo: string;
    descripcion: string;
    estado: 'PENDIENTE' | 'PROGRESO' | 'HECHO' | 'PRIORIDAD';
    rank_position: string; // Lexorank string
    created_by: number;
    created_by_username?: string;
    updated_by?: number;
    created_at: string;
    updated_at: string;
    bitacora: Bitacora[];
}

export interface CreateObjetivoDTO {
    titulo: string;
    descripcion: string;
    estado: string;
}

export interface UpdateObjetivoDTO {
    titulo?: string;
    descripcion?: string;
    estado?: string;
    rank_position?: string;
    observacion?: string;
}