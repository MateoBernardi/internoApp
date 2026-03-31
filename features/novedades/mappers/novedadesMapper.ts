import type { NovedadDTO } from '../dto/NovedadesDTO';
import type { Novedad } from '../models/Novedades';

/**
 * Convierte un NovedadDTO a Novedad
 */
export function mapNovedadDTOToNovedades(dto: NovedadDTO): Novedad {
  return {
    id: dto.id,
    titulo: dto.titulo,
    descripcion: dto.descripcion,
    id_etiqueta: dto.id_etiqueta,
    prioridad: dto.prioridad,
    createdBy: dto.created_by,
    createdAt: new Date(dto.created_at), // Convertir string a Date
  };
}
