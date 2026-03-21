import { useAuth } from '@/features/auth/context/AuthContext';

type UserRole =
  | 'admin'
  | 'contable'
  | 'sistemas'
  | 'empleado'
  | 'empleado-admin'
  | 'empleado-insumos'
  | 'empleado-mayorista'
  | 'empleado-super'
  | 'gerencia'
  | 'personasRelaciones'
  | 'consejo'
  | 'encargado'
  | 'readonly'
  | 'presidencia';

const PERSONAL_ROLES: UserRole[] = [
  'empleado',
  'empleado-admin',
  'empleado-insumos',
  'empleado-mayorista',
  'empleado-super',
];

const CONTABLE_ROLES: UserRole[] = ['contable', 'sistemas'];

export const ALL_ROLES: UserRole[] = [
  'admin',
  'contable',
  'sistemas',
  'empleado-admin',
  'empleado-insumos',
  'empleado-mayorista',
  'empleado-super',
  'empleado',
  'gerencia',
  'personasRelaciones',
  'consejo',
  'encargado',
  'readonly',
  'presidencia',
];

export function useRoleCheck() {
  const { user } = useAuth();

  const getUserRole = (): UserRole | null => {
    if (!user?.rol_nombre) return null;
    return user.rol_nombre as UserRole;
  };

  const matchesRole = (userRole: UserRole, expectedRole: UserRole): boolean => {
    if (expectedRole === 'empleado') {
      return PERSONAL_ROLES.includes(userRole);
    }

    if (expectedRole === 'contable') {
      return CONTABLE_ROLES.includes(userRole);
    }

    return userRole === expectedRole;
  };

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    const userRole = getUserRole();
    if (!userRole) return false;
    
    if (Array.isArray(role)) {
      return role.some((expectedRole) => matchesRole(userRole, expectedRole));
    }
    return matchesRole(userRole, role);
  };

  const isKnownRole = (): boolean => {
    const rolNombre = user?.rol_nombre;
    if (!rolNombre) return false;
    return ALL_ROLES.includes(rolNombre as UserRole);
  };

  const isEmployeeOrEncargado = (): boolean => {
    return hasRole(['empleado', 'encargado']);
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  return {
    userRole: getUserRole(),
    hasRole,
    isKnownRole,
    isEmployeeOrEncargado,
    isAdmin,
  };
}
