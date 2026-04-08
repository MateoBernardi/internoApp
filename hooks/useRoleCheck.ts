import { useAuth } from '@/features/auth/context/AuthContext';

type UserRole =
  | 'admin'
  | 'contable'
  | 'sistemas'
  | 'empleado-limpieza'
  | 'empleado-admin'
  | 'empleado-insumos'
  | 'empleado-mayorista'
  | 'empleado-super'
  | 'gerencia'
  | 'personasRelaciones'
  | 'consejo'
  | 'encargado'
  | 'estudio-contable'
  | 'readonly'
  | 'presidencia';

const PERSONAL_ROLES: UserRole[] = [
  'empleado-limpieza',
  'empleado-admin',
  'empleado-insumos',
  'empleado-mayorista',
  'empleado-super',
  'estudio-contable',
];

const CONTABLE_ROLES: UserRole[] = ['contable', 'sistemas'];

const isEmployeeRole = (role: UserRole): boolean => PERSONAL_ROLES.includes(role);
const isContableRole = (role: UserRole): boolean => CONTABLE_ROLES.includes(role);

export const ALL_ROLES: UserRole[] = [
  'admin',
  'contable',
  'sistemas',
  'empleado-admin',
  'empleado-insumos',
  'empleado-mayorista',
  'empleado-super',
  'empleado-limpieza',
  'gerencia',
  'personasRelaciones',
  'consejo',
  'encargado',
  'estudio-contable',
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
    if (isEmployeeRole(expectedRole)) {
      return PERSONAL_ROLES.includes(userRole);
    }

    if (isContableRole(expectedRole)) {
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

  const isEmployee = (): boolean => {
    const userRole = getUserRole();
    if (!userRole) return false;
    return isEmployeeRole(userRole);
  };

  const isContableOrSistemas = (): boolean => {
    const userRole = getUserRole();
    if (!userRole) return false;
    return isContableRole(userRole);
  };

  const isEmployeeOrEncargado = (): boolean => {
    return isEmployee() || hasRole('encargado');
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  return {
    userRole: getUserRole(),
    hasRole,
    isKnownRole,
    isEmployee,
    isContableOrSistemas,
    isEmployeeOrEncargado,
    isAdmin,
  };
}
