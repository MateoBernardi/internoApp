import { ThemedText } from '@/components/themed-text';
import { UserSelector } from '@/components/UserSelector';
import { Colors } from '@/constants/theme';
import { RoleUserSelectionModal } from '@/features/solicitudesActividades/components/RoleUserSelectionModal';
import { UserSummary } from '@/shared/users/User';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Carpeta, UpdateCarpetaPayload } from '../models/Carpeta';
import { useCarpetaPermisos } from '../viewmodels/useArchivos';
import { PartialSaveBanner } from './PartialSaveBanner';

const colors = Colors.light;

interface EditCarpetaModalProps {
  visible: boolean;
  carpeta: Carpeta;
  isSaving?: boolean;
  partialWarningMessage?: string | null;
  onDismissPartialWarning?: () => void;
  onClose: () => void;
  onSubmit: (payload: UpdateCarpetaPayload) => void;
}

const allRoles = [
  { label: 'Todos', value: '*' },
  { label: 'Contable', value: 'contable' },
  { label: 'Sistemas', value: 'sistemas' },
  { label: 'Personal Admin', value: 'empleado-admin' },
  { label: 'Personal Insumos', value: 'empleado-insumos' },
  { label: 'Personal Mayorista', value: 'empleado-mayorista' },
  { label: 'Personal Super', value: 'empleado-super' },
  { label: 'Consejo', value: 'consejo' },
  { label: 'Encargado', value: 'encargado' },
  { label: 'Gerencia', value: 'gerencia' },
  { label: 'Personal Limpieza', value: 'empleado-limpieza' },
  { label: 'Personas y Relaciones', value: 'personasRelaciones' },
  { label: 'Presidencia', value: 'presidencia' },
];

const availableRoleValues = allRoles.filter((role) => role.value !== '*').map((role) => role.value);

export function EditCarpetaModal({
  visible,
  carpeta,
  onClose,
  onSubmit,
  isSaving = false,
  partialWarningMessage,
  onDismissPartialWarning,
}: EditCarpetaModalProps) {
  const insets = useSafeAreaInsets();

  const [nombre, setNombre] = useState(carpeta.nombre);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>(
    (carpeta.usuarios_id || []).map((id) => ({
      user_context_id: id,
      id_usuario: id,
      username: `user_${id}`,
      nombre: 'Usuario',
      apellido: `#${id}`,
      email: '',
    }))
  );
  const [allowedRoles, setAllowedRoles] = useState<string[]>(carpeta.allowed_roles || []);

  const [activeRole, setActiveRole] = useState('');
  const [roleUsers, setRoleUsers] = useState<UserSummary[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermisosSection, setShowPermisosSection] = useState(false);
  const [didHydrateFromPermisos, setDidHydrateFromPermisos] = useState(false);

  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
  const { data: roleUsersData, isLoading: isLoadingRole, error: roleError } = useGetUserByRole(activeRole);
  const {
    data: permisosData,
    isLoading: isLoadingPermisos,
    error: permisosError,
  } = useCarpetaPermisos(showPermisosSection ? carpeta.id ?? undefined : undefined);

  const users = searchResults || [];
  const isLoadingUsers = isSearchingUsers || isLoadingRole;

  React.useEffect(() => {
    if (visible) {
      setNombre(carpeta.nombre);
      setAllowedRoles(carpeta.allowed_roles || []);
      setSelectedUsers(
        (carpeta.usuarios_id || []).map((id) => ({
          user_context_id: id,
          id_usuario: id,
          username: `user_${id}`,
          nombre: 'Usuario',
          apellido: `#${id}`,
          email: '',
        }))
      );
      setShowPermisosSection(false);
      setDidHydrateFromPermisos(false);
    }
  }, [visible, carpeta]);

  React.useEffect(() => {
    if (!showPermisosSection || !permisosData || didHydrateFromPermisos) return;

    const incomingRoles = Array.isArray(permisosData.allowed_roles) ? permisosData.allowed_roles : [];
    const incomingIds = Array.isArray(permisosData.user_context_ids)
      ? permisosData.user_context_ids.filter((id) => Number.isInteger(id) && id > 0)
      : [];
    const incomingNames = Array.isArray(permisosData.allowed_users) ? permisosData.allowed_users : [];

    setAllowedRoles(incomingRoles);

    if (incomingIds.length > 0) {
      setSelectedUsers(
        incomingIds.map((id, index) => ({
          user_context_id: id,
          id_usuario: id,
          username: `user_${id}`,
          nombre: incomingNames[index] || 'Usuario',
          apellido: incomingNames[index] ? '' : `#${id}`,
          email: '',
        }))
      );
    }

    setDidHydrateFromPermisos(true);
  }, [didHydrateFromPermisos, permisosData, showPermisosSection]);

  const roleLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    allRoles.forEach((role) => {
      map[role.value] = role.label;
    });
    return map;
  }, []);

  const getRoleLabel = useCallback(
    (roleValue: string) => roleLabelMap[roleValue] || roleValue,
    [roleLabelMap]
  );

  const userNameById = useMemo(() => {
    const map: Record<number, string> = {};

    const addUser = (user: UserSummary) => {
      const fullName = `${user.nombre} ${user.apellido}`.trim();
      if (user.user_context_id > 0 && fullName) {
        map[user.user_context_id] = fullName;
      }
    };

    selectedUsers.forEach(addUser);
    users.forEach(addUser);
    roleUsers.forEach(addUser);

    const fallbackIds = (carpeta.usuarios_id || []).filter((id) => Number.isInteger(id) && id > 0);
    const backendIds = (permisosData?.user_context_ids || []).filter((id) => Number.isInteger(id) && id > 0);
    const names = permisosData?.allowed_users || [];

    names.forEach((name, index) => {
      const id = backendIds[index] || fallbackIds[index];
      if (Number.isInteger(id) && id > 0 && name) {
        map[id] = name;
      }
    });

    return map;
  }, [carpeta.usuarios_id, permisosData?.allowed_users, permisosData?.user_context_ids, roleUsers, selectedUsers, users]);

  const getUserDisplayName = useCallback(
    (user: UserSummary) => {
      const byId = userNameById[user.user_context_id];
      if (byId) return byId;

      const fullName = `${user.nombre} ${user.apellido}`.trim();
      if (fullName && fullName !== 'Usuario') return fullName;
      return `Usuario #${user.user_context_id}`;
    },
    [userNameById]
  );

  const removeAllowedRole = useCallback((roleValue: string) => {
    setAllowedRoles((prev) => prev.filter((role) => role !== roleValue));
  }, []);

  const removeAllowedUser = useCallback((userId: number) => {
    setSelectedUsers((prev) => prev.filter((user) => user.user_context_id !== userId));
  }, []);

  React.useEffect(() => {
    if (activeRole && roleUsersData) {
      setRoleUsers(roleUsersData);
      setShowRoleModal(true);
    } else if (roleError) {
      Alert.alert('Intenta nuevamente');
      setActiveRole('');
    }
  }, [activeRole, roleUsersData, roleError]);

  const handleCloseRoleModal = () => {
    setShowRoleModal(false);
    setActiveRole('');
    setRoleUsers([]);
  };

  const handleToggleUser = useCallback(
    (user: UserSummary) => {
      if (activeRole && allowedRoles.includes(activeRole)) {
        setAllowedRoles((prev) => prev.filter((r) => r !== activeRole));
        setSelectedUsers((prev) => {
          const otherRoleUsers = roleUsers.filter((u) => u.user_context_id !== user.user_context_id);
          const existingIds = new Set(prev.map((u) => u.user_context_id));
          const newUsers = otherRoleUsers.filter((u) => !existingIds.has(u.user_context_id));
          return [...prev, ...newUsers];
        });
        return;
      }

      setSelectedUsers((prev) => {
        const isSelected = prev.some((u) => u.user_context_id === user.user_context_id);
        return isSelected
          ? prev.filter((u) => u.user_context_id !== user.user_context_id)
          : [...prev, user];
      });
    },
    [activeRole, allowedRoles, roleUsers]
  );

  const handleSelectAllRoleUsers = useCallback(
    (usersToSelect: UserSummary[]) => {
      if (activeRole && !allowedRoles.includes(activeRole)) {
        setAllowedRoles((prev) => [...prev, activeRole]);
      }

      setSelectedUsers((prev) => {
        const idsToRemove = new Set(usersToSelect.map((u) => u.user_context_id));
        return prev.filter((u) => !idsToRemove.has(u.user_context_id));
      });
    },
    [activeRole, allowedRoles]
  );

  const handleDeselectAllRoleUsers = useCallback(() => {
    if (activeRole && allowedRoles.includes(activeRole)) {
      setAllowedRoles((prev) => prev.filter((r) => r !== activeRole));
    }
  }, [activeRole, allowedRoles]);

  const selectedRolesForDisplay = useMemo(
    () => allRoles.filter((r) => allowedRoles.includes(r.value)),
    [allowedRoles]
  );

  const isRoleSelected = useMemo(() => allowedRoles.includes(activeRole), [allowedRoles, activeRole]);

  const isFormValid = useMemo(() => nombre.trim().length > 0, [nombre]);

  const handleSubmit = () => {
    if (!isFormValid) {
      Alert.alert('Nombre requerido', 'Ingresa un nombre para la carpeta');
      return;
    }

    onSubmit({
      nombre: nombre.trim(),
      allowed_roles: allowedRoles,
      usuarios_id: selectedUsers.map((u) => u.user_context_id),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top || 12 }]}> 
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={24} color={colors.icon} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Editar Carpeta</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: 120 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {partialWarningMessage ? (
              <PartialSaveBanner message={partialWarningMessage} onClose={onDismissPartialWarning || (() => {})} />
            ) : null}

            <View style={styles.inputSection}>
              <ThemedText style={styles.label}>Nombre de la carpeta</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Nombre"
                placeholderTextColor={colors.secondaryText}
                value={nombre}
                onChangeText={setNombre}
                maxLength={100}
              />
            </View>

            <View style={styles.inputSection}>
              <TouchableOpacity
                style={styles.collapsibleButton}
                onPress={() => setShowPermisosSection((prev) => !prev)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showPermisosSection }}
                accessibilityLabel="Administrar permisos"
              >
                <ThemedText style={styles.collapsibleTitle}>Administrar permisos</ThemedText>
                <Ionicons
                  name={showPermisosSection ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.icon}
                />
              </TouchableOpacity>

              {showPermisosSection ? (
                <View style={styles.permisosPanel}>
                  {isLoadingPermisos ? (
                    <View style={styles.permisosStateRow}>
                      <ActivityIndicator size="small" color={colors.tint} />
                      <ThemedText style={styles.permisosHint}>Cargando permisos actuales...</ThemedText>
                    </View>
                  ) : permisosError ? (
                    <ThemedText style={styles.permisosError}>
                      {(permisosError as any)?.statusCode === 403
                        ? 'Solo el creador puede ver los permisos completos'
                        : permisosError instanceof Error
                          ? permisosError.message
                          : 'No se pudieron cargar los permisos'}
                    </ThemedText>
                  ) : (
                    <>
                      <View style={styles.permisosSection}>
                        <ThemedText style={styles.permisosSectionTitle}>Roles permitidos</ThemedText>
                        {allowedRoles.length > 0 ? (
                          <View style={styles.chipWrap}>
                            {allowedRoles.map((role) => (
                              <View key={role} style={styles.editableChip}>
                                <ThemedText style={styles.chipLabel}>{getRoleLabel(role)}</ThemedText>
                                <TouchableOpacity
                                  style={styles.chipRemoveButton}
                                  onPress={() => removeAllowedRole(role)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Quitar rol ${getRoleLabel(role)}`}
                                >
                                  <Ionicons name="close" size={14} color={colors.secondaryText} />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <ThemedText style={styles.permisosHint}>Sin roles seleccionados.</ThemedText>
                        )}
                      </View>

                      <View style={styles.permisosSection}>
                        <ThemedText style={styles.permisosSectionTitle}>Usuarios permitidos</ThemedText>
                        {selectedUsers.length > 0 ? (
                          <View style={styles.chipWrap}>
                            {selectedUsers.map((user) => (
                              <View key={user.user_context_id} style={styles.editableChip}>
                                <ThemedText style={styles.chipLabel}>{getUserDisplayName(user)}</ThemedText>
                                <TouchableOpacity
                                  style={styles.chipRemoveButton}
                                  onPress={() => removeAllowedUser(user.user_context_id)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Quitar usuario ${getUserDisplayName(user)}`}
                                >
                                  <Ionicons name="close" size={14} color={colors.secondaryText} />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <ThemedText style={styles.permisosHint}>Sin usuarios seleccionados.</ThemedText>
                        )}
                      </View>

                      <View style={styles.permisosSection}>
                        <ThemedText style={styles.label}>Agregar usuarios y roles</ThemedText>
                        <UserSelector
                          selectedUsers={selectedUsers}
                          onSelectUsers={setSelectedUsers}
                          users={users}
                          roles={allRoles}
                          selectedRoles={selectedRolesForDisplay}
                          onRemoveRole={(roleValue) => setAllowedRoles((prev) => prev.filter((r) => r !== roleValue))}
                          isLoadingUsers={isLoadingUsers}
                          isLoadingRoles={false}
                          showSelectedChips={false}
                          onSearch={setSearchQuery}
                          onSelectRole={(role) => {
                            if (role === '*') {
                              setAllowedRoles(availableRoleValues);
                              setActiveRole('');
                              return;
                            }

                            setActiveRole(role);
                          }}
                        />
                      </View>

                      <View style={styles.sectionDivider} />

                      <View style={styles.permisosSection}>
                        <ThemedText style={styles.permisosHint}>
                          Resumen actual a confirmar
                        </ThemedText>
                        <ThemedText style={styles.permisosHint}>
                          Roles: {allowedRoles.length > 0
                            ? allowedRoles.map(getRoleLabel).join(', ')
                            : 'Ninguno'}
                        </ThemedText>
                        <ThemedText style={styles.permisosHint}>
                          Usuarios: {selectedUsers.length > 0
                            ? selectedUsers.map(getUserDisplayName).join(', ')
                            : 'Ninguno'}
                        </ThemedText>
                      </View>
                    </>
                  )}
                </View>
              ) : null}
            </View>

            <RoleUserSelectionModal
              visible={showRoleModal}
              onClose={handleCloseRoleModal}
              roleName={activeRole}
              roleUsers={roleUsers}
              selectedUsers={selectedUsers}
              isRoleSelected={isRoleSelected}
              onToggleUser={handleToggleUser}
              onSelectAll={handleSelectAllRoleUsers}
              onDeselectAll={handleDeselectAllRoleUsers}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 16 }]}> 
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: !isFormValid || isSaving ? colors.icon : colors.lightTint }]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.componentBackground} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={colors.componentBackground} />
                <ThemedText style={styles.saveButtonText}>Guardar Cambios</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '4%',
    paddingBottom: 12,
    backgroundColor: colors.componentBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.icon,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: '4%',
    paddingTop: 12,
    overflow: 'visible',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: colors.componentBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.icon,
  },
  collapsibleButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.icon,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsibleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  permisosPanel: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.icon,
    borderRadius: 8,
    padding: 10,
    gap: 12,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.icon,
  },
  permisosStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permisosSection: {
    gap: 8,
  },
  permisosSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondaryText,
  },
  permisosHint: {
    color: colors.secondaryText,
    fontSize: 13,
  },
  permisosError: {
    color: colors.error,
    fontSize: 13,
  },
  chipList: {
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.icon,
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 6,
  },
  chipLabel: {
    fontSize: 13,
  },
  chipRemoveButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    backgroundColor: colors.componentBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.icon,
    paddingHorizontal: '4%',
    paddingTop: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: colors.componentBackground,
    fontWeight: '600',
    fontSize: 16,
  },
});
