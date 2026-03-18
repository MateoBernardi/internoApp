import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { RoleUserSelectionModal } from '@/features/solicitudesActividades/components/RoleUserSelectionModal';
import { UserSelector } from '@/features/solicitudesActividades/components/UserSelector';
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
  { label: 'Consejo', value: 'consejo' },
  { label: 'Encargado', value: 'encargado' },
  { label: 'Gerencia', value: 'gerencia' },
  { label: 'Personal', value: 'empleado' },
  { label: 'Personas y Relaciones', value: 'personasRelaciones' },
];

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

  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
  const { data: roleUsersData, isLoading: isLoadingRole, error: roleError } = useGetUserByRole(activeRole);

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
    }
  }, [visible, carpeta]);

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
              <ThemedText style={styles.label}>Visibilidad por usuarios y roles</ThemedText>
              <UserSelector
                selectedUsers={selectedUsers}
                onSelectUsers={setSelectedUsers}
                users={users}
                roles={allRoles}
                selectedRoles={selectedRolesForDisplay}
                onRemoveRole={(roleValue) => setAllowedRoles((prev) => prev.filter((r) => r !== roleValue))}
                isLoadingUsers={isLoadingUsers}
                isLoadingRoles={false}
                onSearch={setSearchQuery}
                onSelectRole={setActiveRole}
              />
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
