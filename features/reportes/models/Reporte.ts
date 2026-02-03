export type EstadoReporte = 'PENDIENTE' | 'DISPUTA' | 'ASENTADO' | 'DESESTIMADO';
export type CategoriaReporte = 'NEGATIVO' | 'POSITIVO';

export interface BitacoraItem {
    id: number;
    reporte_id: number;
    usuario_id: number;
    tipo_accion: string;
    observacion: string;
    created_at: string;
    usuario_nombre: string;
    usuario_apellido?: string;
}

export interface Reporte {
    id: string;
    usuario_reportado_id: number;
    creador_id?: number | null;
    titulo: string;
    descripcion: string;
    categoria: CategoriaReporte;
    estado: EstadoReporte;
    fecha_incidente: string;
    created_at: string;
    updated_at: string;
    usuario_nombre?: string;
    usuario_apellido?: string;
    creador_nombre?: string;
    creador_apellido?: string;
    bitacora?: BitacoraItem[];
}

export interface CreateReportePayload {
    usuario_reportado_id: number;
    titulo: string;
    descripcion: string;
    categoria: CategoriaReporte;
    fecha_incidente?: string; // ISO Date string
}

export interface UpdateReportePayload {
    estado?: EstadoReporte;
    observacion?: string;
}

export interface ReporteStats {
    usuario_id: number;
    nombre: string;
    apellido: string;
    negativos: number;
    positivos: number;
    total_positivos: number;
    total_negativos: number;
    puntos: number;
    zona: 'rojo' | 'amarillo' | 'verde';
}

export interface MostImprovedUser {
    user_context_id: number;          // ID del usuario mejorado
    nombre: string;                   // Nombre
    apellido: string;                 // Apellido
    positivos_recientes: number;      // Reportes positivos últimos 3 meses
    positivos_anteriores: number;     // Reportes positivos entre hace 6 y 3 meses
    mejora_neta: number;              // Diferencia (mejora)
}

export interface TopPositiveUser {
    user_context_id: number;
    nombre: string;
    apellido: string;
    total_positivos: number;          // Total reportes positivos (últimos 6 meses)
}