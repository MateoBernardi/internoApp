export type ResourcePermisos = {
  resource_type: 'carpeta' | 'archivo';
  resource_id: number;
  owner_id: number;
  allowed_roles: string[];
  allowed_users: string[];
};
