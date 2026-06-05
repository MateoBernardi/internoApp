import { UserSummary } from '@/shared/users/User';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { useCallback, useMemo, useState } from 'react';
import type { SolicitudEnviada, SolicitudInvitado } from '../../models/Solicitud';
import type { useActualizarInvitadosSolicitud } from '../../viewmodels/useSolicitudes';

type ActualizarInvitadosMutate = ReturnType<typeof useActualizarInvitadosSolicitud>['mutate'];

interface UseParticipantesManagerParams {
  solicitud: SolicitudEnviada;
  solicitudId: number;
  actualizarInvitados: ActualizarInvitadosMutate;
}

/**
 * Gestiona el alta/baja de participantes (invitados) de una solicitud con
 * actualización optimista y rollback en error. Incluye el estado del selector
 * por búsqueda/rol. Compartido por `Solicitud` y `ConversacionChat`.
 */
export function useParticipantesManager({
  solicitud, solicitudId, actualizarInvitados,
}: UseParticipantesManagerParams) {
  const [localParticipantes, setLocalParticipantes] = useState<SolicitudInvitado[]>(() => solicitud.invitados);
  const [participantesSelectedUsers, setParticipantesSelectedUsers] = useState<UserSummary[]>(() =>
    solicitud.invitados.map(inv => ({
      user_context_id: inv.user_id,
      username: '',
      nombre: inv.invitado_nombre ?? '',
      apellido: inv.invitado_apellido ?? '',
      email: '',
      role: [],
    }))
  );
  const [showParticipantesSelector, setShowParticipantesSelector] = useState(false);
  const [participantesSearchQuery, setParticipantesSearchQuery] = useState('');
  const [participantesActiveRole, setParticipantesActiveRole] = useState('');
  const [showParticipantesRoleModal, setShowParticipantesRoleModal] = useState(false);
  const [participantesExpanded, setParticipantesExpanded] = useState(false);
  const { data: participantesSearchResults, isLoading: isSearchingParticipantes } = useSearchUsers(participantesSearchQuery);
  const { data: participantesRoleUsersData, isLoading: isLoadingParticipantesRole } = useGetUserByRole(participantesActiveRole);

  const displayParticipantes = useMemo(
    () => localParticipantes.filter(inv => inv.user_id !== solicitud.created_by),
    [localParticipantes, solicitud.created_by],
  );

  const getParticipanteDisplayName = useCallback((inv: SolicitudInvitado): string => {
    if (inv.invitado_nombre) return `${inv.invitado_nombre} ${inv.invitado_apellido ?? ''}`.trim();
    const matched = participantesSelectedUsers.find(u => u.user_context_id === inv.user_id);
    if (matched?.nombre) return `${matched.nombre} ${matched.apellido}`.trim();
    return `Usuario #${inv.user_id}`;
  }, [participantesSelectedUsers]);

  const handleSelectParticipantes = useCallback((newSelection: UserSummary[]) => {
    const currentIds = new Set(localParticipantes.map(inv => inv.user_id));
    const newIds = new Set(newSelection.map(u => u.user_context_id));
    const toAdd = newSelection.filter(u => !currentIds.has(u.user_context_id));
    const toRemove = localParticipantes.filter(inv => !newIds.has(inv.user_id));
    const snapshot = [...localParticipantes];

    const nextList: SolicitudInvitado[] = [
      ...localParticipantes.filter(inv => newIds.has(inv.user_id)),
      ...toAdd.map(u => ({ user_id: u.user_context_id })),
    ];
    setLocalParticipantes(nextList);
    setParticipantesSelectedUsers(prev => {
      const byId = new Map(prev.map(u => [u.user_context_id, u]));
      newSelection.forEach(u => byId.set(u.user_context_id, u));
      toRemove.forEach(inv => byId.delete(inv.user_id));
      return Array.from(byId.values());
    });

    if (toAdd.length > 0) {
      actualizarInvitados(
        { solicitudId, action: 'add', invitados: toAdd.map(u => u.user_context_id) },
        { onError: () => setLocalParticipantes(snapshot) },
      );
    }
    if (toRemove.length > 0) {
      actualizarInvitados(
        { solicitudId, action: 'remove', invitados: toRemove.map(inv => inv.user_id) },
        { onError: () => setLocalParticipantes(snapshot) },
      );
    }
  }, [localParticipantes, solicitudId, actualizarInvitados]);

  const handleQuitarParticipante = useCallback((userId: number) => {
    const snapshot = [...localParticipantes];
    setLocalParticipantes(prev => prev.filter(inv => inv.user_id !== userId));
    setParticipantesSelectedUsers(prev => prev.filter(u => u.user_context_id !== userId));
    actualizarInvitados(
      { solicitudId, action: 'remove', invitados: [userId] },
      { onError: () => setLocalParticipantes(snapshot) },
    );
  }, [localParticipantes, solicitudId, actualizarInvitados]);

  const handleToggleUserParticipante = useCallback((u: UserSummary) => {
    const snapshot = [...localParticipantes];
    const isInList = localParticipantes.some(inv => inv.user_id === u.user_context_id);
    if (isInList) {
      setLocalParticipantes(prev => prev.filter(inv => inv.user_id !== u.user_context_id));
      setParticipantesSelectedUsers(prev => prev.filter(p => p.user_context_id !== u.user_context_id));
      actualizarInvitados(
        { solicitudId, action: 'remove', invitados: [u.user_context_id] },
        { onError: () => setLocalParticipantes(snapshot) },
      );
    } else {
      setLocalParticipantes(prev => [...prev, { user_id: u.user_context_id }]);
      setParticipantesSelectedUsers(prev =>
        prev.some(p => p.user_context_id === u.user_context_id) ? prev : [...prev, u]
      );
      actualizarInvitados(
        { solicitudId, action: 'add', invitados: [u.user_context_id] },
        { onError: () => setLocalParticipantes(snapshot) },
      );
    }
  }, [localParticipantes, solicitudId, actualizarInvitados]);

  const handleSelectAllParticipantes = useCallback((users: UserSummary[]) => {
    const byId = new Map(participantesSelectedUsers.map(u => [u.user_context_id, u]));
    users.forEach(u => { if (!byId.has(u.user_context_id)) byId.set(u.user_context_id, u); });
    handleSelectParticipantes(Array.from(byId.values()));
  }, [participantesSelectedUsers, handleSelectParticipantes]);

  const handleDeselectAllParticipantes = useCallback((users: UserSummary[]) => {
    const idsToRemove = new Set(users.map(u => u.user_context_id));
    handleSelectParticipantes(participantesSelectedUsers.filter(u => !idsToRemove.has(u.user_context_id)));
  }, [participantesSelectedUsers, handleSelectParticipantes]);

  return {
    localParticipantes,
    participantesSelectedUsers,
    showParticipantesSelector, setShowParticipantesSelector,
    participantesSearchQuery, setParticipantesSearchQuery,
    participantesActiveRole, setParticipantesActiveRole,
    showParticipantesRoleModal, setShowParticipantesRoleModal,
    participantesExpanded, setParticipantesExpanded,
    participantesSearchResults, isSearchingParticipantes,
    participantesRoleUsersData, isLoadingParticipantesRole,
    displayParticipantes,
    getParticipanteDisplayName,
    handleSelectParticipantes,
    handleQuitarParticipante,
    handleToggleUserParticipante,
    handleSelectAllParticipantes,
    handleDeselectAllParticipantes,
  };
}
