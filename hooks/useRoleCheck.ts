import { useAuth } from '@/features/auth/context/AuthContext';

type UserRole = 'admin' | 'contable' | 'gerencia' | 'personasRelaciones' | 'consejo' | 'encargado' | 'empleado';

const ALL_ROLES: UserRole[] = ['admin', 'contable', 'gerencia', 'personasRelaciones', 'consejo', 'encargado', 'empleado'];

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

  const isEmployeeOrEncargado = (): boolean => {
    return hasRole(['empleado', 'encargado']);
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  return {
    userRole: getUserRole(),
    hasRole,
    isEmployeeOrEncargado,
    isAdmin,
  };
}
