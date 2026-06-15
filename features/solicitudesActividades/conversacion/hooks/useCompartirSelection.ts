import { UserSummary } from '@/shared/users/User';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { useCallback, useState } from 'react';

/**
 * Estado y handlers de selección de usuarios para "compartir" una solicitud:
 * búsqueda, selección por rol y toggles. La ejecución del compartir
 * (`reenviarSolicitud`) queda en cada componente porque difiere (validación de
 * fechas en `Solicitud`, mensaje distinto). Compartido por ambas vistas.
 */
export function useCompartirSelection() {
  const [showShareModal, setShowShareModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsersToShare, setSelectedUsersToShare] = useState<UserSummary[]>([]);
  const [activeRole, setActiveRole] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
  const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);
  const isLoadingUsers = isSearchingUsers || isLoadingRole;

  const handleToggleUserShare = useCallback((u: UserSummary) => {
    setSelectedUsersToShare(prev => {
      const isSelected = prev.some(p => p.user_context_id === u.user_context_id);
      return isSelected ? prev.filter(p => p.user_context_id !== u.user_context_id) : [...prev, u];
    });
  }, []);

  const handleSelectAllRoleUsers = useCallback((users: UserSummary[]) => {
    setSelectedUsersToShare(prev => {
      const ids = new Set(prev.map(u => u.user_context_id));
      return [...prev, ...users.filter(u => !ids.has(u.user_context_id))];
    });
  }, []);

  const handleDeselectAllRoleUsers = useCallback((users: UserSummary[]) => {
    const ids = new Set(users.map(u => u.user_context_id));
    setSelectedUsersToShare(prev => prev.filter(u => !ids.has(u.user_context_id)));
  }, []);

  return {
    showShareModal, setShowShareModal,
    searchQuery, setSearchQuery,
    selectedUsersToShare, setSelectedUsersToShare,
    activeRole, setActiveRole,
    showRoleModal, setShowRoleModal,
    searchResults, isLoadingUsers,
    roleUsersData,
    handleToggleUserShare,
    handleSelectAllRoleUsers,
    handleDeselectAllRoleUsers,
  };
}
