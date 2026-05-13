import { Archivo } from "@/features/docs/models/Archivo";

export interface Bitacora {
    id: number;
    estado_anterior: string;
    estado_nuevo: string;
    observacion: string | null;
    created_at: string;
    appointment: 'ASSIGN' | 'DISCHARGE' | null;
    usuario_id: number | null;
    usuario_nombre: string | null;
    assignee_id: number | null;
    assignee_nombre: string | null;
}

export interface Invitado {
    user_id: number;
    invitado_nombre?: string;
    invitado_apellido?: string;
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
    archivos?: Archivo[];
}

export interface CreateObjetivo {
    titulo: string;
    descripcion: string;
    estado: typeof ESTADOS[number];
    solicitud_id?: number;
    invitados?: Invitado[];
    archivosIds?: number[];
}

export interface UpdateObjetivo {
    titulo?: string;
    descripcion?: string;
    estado?: typeof ESTADOS[number];
    rank_position?: string;
    observacion?: string;
    invitados?: Invitado[];
    archivosIds?: number[];
}

export const ESTADOS = ['PENDIENTE', 'PRIORIDAD', 'PROGRESO', 'REALIZADO'] as const;