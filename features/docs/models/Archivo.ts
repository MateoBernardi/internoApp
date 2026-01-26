export interface Archivo {
    id: number;
    nombre: string;
    url: string;
    tamaño: number;
    tipo: string;
    creadorId: number;
    nombreCreador: string;
    apellidoCreador: string;
    createdAt: Date;
}

export interface UpdateArchivoPayload {
  nombre?: string;
  allowed_roles?: string[];

  // operaciones incrementales
  usuarios_compartidos?: number[];
  usuarios_asociados?: number[];
}

export interface UploadArchivoPayload {
  nombre: string;
  allowed_roles?: string[];

  // relaciones opcionales
  usuarios_asociados?: number[];
  usuarios_compartidos?: number[];
}

export interface PedirUrlCargaRequest {
    nombreArchivo: string;
    tipoArchivo: string;
}

export interface PedirUrlCargaResponse {
    uploadUrl: string;
    ruta_r2: string;
    key: string;
}

export interface MobileFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}