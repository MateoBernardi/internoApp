import { useAuth } from '@/features/auth/context/AuthContext';

type UserRole = 'admin' | 'contable' | 'gerencia' | 'personasRelaciones' | 'consejo' | 'encargado' | 'empleado' | 'readonly';

export const ALL_ROLES: UserRole[] = ['admin', 'contable', 'gerencia', 'personasRelaciones', 'consejo', 'encargado', 'empleado', 'readonly'];

export function useRoleCheck() {
  const { user } = useAuth();

  const getUserRole = (): UserRole | null => {
    if (!user?.rol_nombre) return null;
    return user.rol_nombre as UserRole;
  };

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    const userRole = getUserRole();
    if (!userRole) return false;
    
    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    return userRole === role;
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
