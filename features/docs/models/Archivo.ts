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
  ruta_r2?: string;
  tamaño?: number;
  tipo?: string;
  allowed_roles?: string[];

  // relaciones opcionales
  usuarios_asociados?: number[];
  usuarios_compartidos?: number[];
}

export interface PedirUrlCargaRequest {
    fileName: string;
    contentType: string;
}

export interface PedirUrlCargaResponse {
    uploadUrl: string;
    ruta_r2: string;
    fileName: string;
}

export interface MobileFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}