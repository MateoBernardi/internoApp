import type { ArchivoDTO } from '../dto/ArchivoDTO';
import type { Archivo } from '../models/Archivo';

/**
 * Convierte un ArchivoDTO a Archivo
 */
export function mapArchivoDTOToArchivo(dto: ArchivoDTO): Archivo {
  return {
    id: dto.id,
    nombre: dto.nombre,
    url: dto.ruta_r2,
    tamaño: dto.tamaño,
    tipo: dto.tipo,
    creadorId: dto.created_by,
    nombreCreador: dto.creador_nombre,
    apellidoCreador: dto.creador_apellido,
    createdAt: new Date(dto.created_at),
  };
}

/**
 * Convierte un Archivo a los datos para actualizar (sin campos de solo lectura)
 */
export function mapArchivoToUpdateData(archivo: Partial<Pick<Archivo, 'nombre'>>): Partial<Pick<ArchivoDTO, 'nombre'>> {
  return {
    nombre: archivo.nombre,
  };
}