export interface Bitacora {
    id: number;
    estado_anterior: string;
    estado_nuevo: string;
    observacion: string;
    created_at: string; // ISO Date
    usuario_id: number;
    usuario_nombre: string;
}

export interface Invitado {
    user_id: number;
    rol: 'ASSIGNEE' | 'VISUALIZER';
}

export interface Objetivo {
    id: number;
    titulo: string;
    descripcion: string;
    estado: typeof ESTADOS[number];
    rank_position: string; // Lexorank string
    created_by: number;
    created_by_username?: string;
    updated_by?: number;
    created_at: string;
    updated_at: string;
    bitacora: Bitacora[];
    invitados?: Invitado[];
}

export interface CreateObjetivo {
    titulo: string;
    descripcion: string;
    estado: typeof ESTADOS[number];
    invitados?: Invitado[];
}

export interface UpdateObjetivo {
    titulo?: string;
    descripcion?: string;
    estado?: typeof ESTADOS[number];
    rank_position?: string;
    observacion?: string;
    invitados?: Invitado[];
}

export const ESTADOS = ['PENDIENTE', 'PRIORIDAD', 'PROGRESO', 'REALIZADO'] as const;