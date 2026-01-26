export interface NovedadDTO {
    id: number;
    titulo: string;
    descripcion: string;
    id_etiqueta: number;
    prioridad: number;
    created_by: number;
    created_at: string; // El backend envía fecha como string
}
