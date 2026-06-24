import { UserSelector } from '@/components/UserSelector';
import { Colors } from '@/constants/theme';
import { RoleUserSelectionModal } from '@/features/solicitudesActividades/components/RoleUserSelectionModal';
import { UserSummary } from '@/shared/users/User';
import { allRoles } from '@/shared/users/roles';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { ParticipanteResumen } from '../models/Encuesta';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActualizarParticipantesEncuesta } from '../viewmodels/useEncuestas';
import { styles } from './styles';

const colors = Colors['light'];

type Tab = 'agregar' | 'quitar';

interface GestionParticipantesModalProps {
  visible: boolean;
  encuestaId: number;
  participantesActuales: ParticipanteResumen[];
  onClose: () => void;
}

export const GestionParticipantesModal: React.FC<GestionParticipantesModalProps> = ({
  visible,
  encuestaId,
  participantesActuales,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { mutate: actualizarParticipantes, isPending } = useActualizarParticipantesEncuesta();

  const [tab, setTab] = useState<Tab>('agregar');

  // Tab Agregar
  const [usersToAdd, setUsersToAdd] = useState<UserSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [activeRole, setActiveRole] = useState('');

  const { data: searchResults, isLoading: isSearching } = useSearchUsers(searchQuery);
  const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);
  const isLoadingUsers = isSearching || isLoadingRole;

  // Tab Quitar
  const [selectedToRemove, setSelectedToRemove] = useState<Set<number>>(new Set());

  const handleToggleAdd = useCallback((user: UserSummary) => {
    setUsersToAdd((prev) => {
      const exists = prev.some((u) => u.user_context_id === user.user_context_id);
      return exists
        ? prev.filter((u) => u.user_context_id !== user.user_context_id)
        : [...prev, user];
    });
  }, []);

  const handleSelectAllRole = useCallback((users: UserSummary[]) => {
    setUsersToAdd((prev) => {
      const ids = new Set(prev.map((u) => u.user_context_id));
      return [...prev, ...users.filter((u) => !ids.has(u.user_context_id))];
    });
  }, []);

  const handleDeselectAllRole = useCallback((users: UserSummary[]) => {
    const ids = new Set(users.map((u) => u.user_context_id));
    setUsersToAdd((prev) => prev.filter((u) => !ids.has(u.user_context_id)));
  }, []);

  const toggleRemove = (uid: number) => {
    setSelectedToRemove((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const handleAgregar = () => {
    if (usersToAdd.length === 0) return;
    actualizarParticipantes(
      { encuestaId, action: 'add', invitados: usersToAdd.map((u) => u.user_context_id) },
      {
        onSuccess: () => {
          Alert.alert('Éxito', `${usersToAdd.length} participante${usersToAdd.length > 1 ? 's' : ''} agregado${usersToAdd.length > 1 ? 's' : ''}`);
          setUsersToAdd([]);
          onClose();
        },
        onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Intenta nuevamente'),
      }
    );
  };

  const handleQuitar = () => {
    if (selectedToRemove.size === 0) return;
    actualizarParticipantes(
      { encuestaId, action: 'remove', invitados: Array.from(selectedToRemove) },
      {
        onSuccess: () => {
          Alert.alert('Éxito', `${selectedToRemove.size} participante${selectedToRemove.size > 1 ? 's' : ''} quitado${selectedToRemove.size > 1 ? 's' : ''}`);
          setSelectedToRemove(new Set());
          onClose();
        },
        onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Intenta nuevamente'),
      }
    );
  };

  const handleClose = () => {
    setUsersToAdd([]);
    setSelectedToRemove(new Set());
    setSearchQuery('');
    setTab('agregar');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.convocarOverlay}>
        <View style={[styles.convocarSheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.convocarHandle} />

          <View style={styles.convocarHeader}>
            <Text style={styles.convocarTitle}>Gestionar participantes</Text>
            <TouchableOpacity onPress={handleClose} style={{ position: 'absolute', right: 20, top: 14 }}>
              <Ionicons name="close" size={22} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, tab === 'agregar' && styles.tabButtonActive]}
              onPress={() => setTab('agregar')}
            >
              <Text style={[styles.tabButtonText, tab === 'agregar' && styles.tabButtonTextActive]}>
                Agregar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, tab === 'quitar' && styles.tabButtonActive]}
              onPress={() => setTab('quitar')}
            >
              <Text style={[styles.tabButtonText, tab === 'quitar' && styles.tabButtonTextActive]}>
                Quitar ({participantesActuales.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Agregar */}
          {tab === 'agregar' && (
            <>
              <ScrollView
                style={{ paddingHorizontal: 20, marginTop: 12 }}
                contentContainerStyle={{ paddingBottom: 12 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <UserSelector
                  selectedUsers={usersToAdd}
                  onSelectUsers={setUsersToAdd}
                  users={searchResults ?? []}
                  roles={allRoles}
                  isLoadingUsers={isLoadingUsers}
                  isLoadingRoles={false}
                  onSearch={setSearchQuery}
                  onSelectRole={(role) => { setActiveRole(role); setShowRoleModal(true); }}
                />

                <View style={styles.invitadosSection}>
                  <Text style={styles.invitadosSectionTitle}>
                    Invitados{participantesActuales.length > 0 ? ` (${participantesActuales.length})` : ''}
                  </Text>
                  {participantesActuales.length === 0 ? (
                    <View style={styles.invitadoRow}>
                      <Ionicons name="people-outline" size={18} color={colors.secondaryText} />
                      <Text style={styles.invitadoNombre}>Todos los empleados</Text>
                    </View>
                  ) : (
                    participantesActuales.map((p) => (
                      <View key={p.user_context_id} style={styles.invitadoRow}>
                        <Ionicons name="person-circle-outline" size={20} color={colors.secondaryText} />
                        <Text style={styles.invitadoNombre}>
                          {p.nombre} {p.apellido}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>

              <View style={styles.gestionFooter}>
                <Text style={styles.gestionFooterLabel}>
                  {usersToAdd.length > 0
                    ? `${usersToAdd.length} seleccionado${usersToAdd.length > 1 ? 's' : ''}`
                    : 'Ninguno seleccionado'}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.gestionActionButton,
                    styles.gestionAddButton,
                    (usersToAdd.length === 0 || isPending) && styles.gestionButtonDisabled,
                  ]}
                  onPress={handleAgregar}
                  disabled={usersToAdd.length === 0 || isPending}
                >
                  {isPending ? (
                    <ActivityIndicator color={colors.componentBackground} size="small" />
                  ) : (
                    <Text style={styles.gestionButtonText}>Agregar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Tab Quitar */}
          {tab === 'quitar' && (
            <>
              {participantesActuales.length === 0 ? (
                <View style={styles.emptyParticipantes}>
                  <Ionicons name="people-outline" size={40} color={colors.secondaryText} />
                  <Text style={[styles.emptyText, { textAlign: 'center' }]}>
                    No hay participantes registrados
                  </Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                  {participantesActuales.map((p) => {
                    const isSelected = selectedToRemove.has(p.user_context_id);
                    return (
                      <TouchableOpacity
                        key={p.user_context_id}
                        style={[styles.participanteRow, isSelected && styles.votanteRowSelected]}
                        onPress={() => toggleRemove(p.user_context_id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.participanteNombre}>
                            {p.nombre} {p.apellido}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <View style={styles.gestionFooter}>
                <Text style={styles.gestionFooterLabel}>
                  {selectedToRemove.size > 0
                    ? `${selectedToRemove.size} seleccionado${selectedToRemove.size > 1 ? 's' : ''}`
                    : 'Ninguno seleccionado'}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.gestionActionButton,
                    styles.gestionRemoveButton,
                    (selectedToRemove.size === 0 || isPending) && styles.gestionButtonDisabled,
                  ]}
                  onPress={handleQuitar}
                  disabled={selectedToRemove.size === 0 || isPending}
                >
                  {isPending ? (
                    <ActivityIndicator color={colors.componentBackground} size="small" />
                  ) : (
                    <Text style={styles.gestionButtonText}>Quitar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      <RoleUserSelectionModal
        visible={showRoleModal}
        onClose={() => { setShowRoleModal(false); setActiveRole(''); }}
        roleName={activeRole}
        roleUsers={roleUsersData ?? []}
        selectedUsers={usersToAdd}
        onToggleUser={handleToggleAdd}
        onSelectAll={handleSelectAllRole}
        onDeselectAll={handleDeselectAllRole}
      />
    </Modal>
  );
};
