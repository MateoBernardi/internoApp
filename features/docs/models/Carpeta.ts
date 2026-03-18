export type CarpetaView = 'tree' | 'list';

export interface Carpeta {
  id: number | null;
  nombre: string;
  id_carpeta_padre?: number | null;
  type?: 'folder' | 'virtual';
  allowed_roles?: string[];
  usuarios_id?: number[];
  children?: Carpeta[];
}

export interface ListarCarpetasResponse {
  view: CarpetaView;
  items: Carpeta[];
}

export interface CreateCarpetaPayload {
  nombre: string;
  id_carpeta_padre?: number;
  allowed_roles?: string[];
  usuarios_id?: number[];
}

export interface UpdateCarpetaPayload {
  nombre?: string;
  allowed_roles?: string[];
  usuarios_id?: number[];
}
