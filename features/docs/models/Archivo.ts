export enum ArchivoUso {
  EMPRESA = 'EMPRESA',
  LICENCIA = 'LICENCIA',
  MAYORISTA = 'MAYORISTA',
  WEB = 'WEB',
}

export interface Archivo {
    id: number;
    nombre: string;
    titulo?: string;
    url: string;
    tamaño: number;
    tipo: string;
    creadorId: number;
    nombreCreador: string;
    apellidoCreador: string;
    createdAt: Date;
    id_carpeta?: number | null;
    allowed_roles?: string[];
    usuarios_compartidos?: number[];
    usuarios_asociados?: number[];
}

export interface UpdateArchivoPayload {
  nombre?: string;
  titulo?: string;
  allowed_roles?: string[];

  // operaciones incrementales
  usuarios_compartidos?: number[];
  usuarios_asociados?: number[];
}

export interface UploadArchivoPayload {
  nombre: string;
  titulo?: string;
  ruta_r2?: string;
  tamaño?: number;
  tipo?: string;
  uso?: ArchivoUso;
  allowed_roles?: string[];

  // relaciones opcionales
  usuarios_asociados?: number[];
  usuarios_compartidos?: number[];
  id_carpeta?: number | null;
}

export interface MoverArchivoPayload {
  id_carpeta: number | null;
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