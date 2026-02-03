import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { RoleUserSelectionModal } from '@/features/solicitudesActividades/components/RoleUserSelectionModal';
import { UserSelector } from '@/features/solicitudesActividades/components/UserSelector';
import { useRoleCheck } from '@/hooks/useRoleCheck';
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
import { Archivo, UpdateArchivoPayload } from '../models/Archivo';
import { useUpdateArchivo } from '../viewmodels/useArchivos';

const colors = Colors['light'];

interface EditArchivoModalProps {
  visible: boolean;
  onClose: () => void;
  archivo: Archivo;
}

export function EditArchivoModal({ visible, onClose, archivo }: EditArchivoModalProps) {
  // Form State
  const [nombre, setNombre] = useState(archivo.nombre);

  // User Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
  const users = searchResults || [];

  // Role Selection Logic
  const [activeRole, setActiveRole] = useState('');
  const [roleUsers, setRoleUsers] = useState<UserSummary[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { data: roleUsersData, isLoading: isLoadingRole, error: roleError } = useGetUserByRole(activeRole);

  // Selected Users State
  const [usuariosCompartidos, setUsuariosCompartidos] = useState<UserSummary[]>([]);
  const [usuariosAsociados, setUsuariosAsociados] = useState<UserSummary[]>([]);
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);

  // UI State
  const [showRolesDropdown, setShowRolesDropdown] = useState(false);

  // Check user role
  const { hasRole } = useRoleCheck();
  const isSupervisor = hasRole(['gerencia', 'personasRelaciones', 'encargado']);

  const isLoadingUsers = isSearchingUsers || isLoadingRole;
  const { mutate: updateArchivo, isPending: isUpdating } = useUpdateArchivo();

  // Handle Role Selection
  React.useEffect(() => {
    if (activeRole && roleUsersData) {
      const roleUsersList = roleUsersData;
      setRoleUsers(roleUsersList);
      setShowRoleModal(true);
    } else if (roleError) {
      Alert.alert('No se encontraron usuarios con ese rol');
      setActiveRole('');
    }
  }, [roleUsersData, activeRole, roleError]);

  const handleCloseRoleModal = () => {
    setShowRoleModal(false);
    setActiveRole('');
    setRoleUsers([]);
  };

  const handleToggleUser = useCallback((user: UserSummary) => {
    setUsuariosCompartidos((prev) => {
      const isSelected = prev.some((u) => u.user_context_id === user.user_context_id);
      if (isSelected) {
        return prev.filter((u) => u.user_context_id !== user.user_context_id);
      } else {
        return [...prev, user];
      }
    });
  }, []);

  const handleSelectAllRoleUsers = useCallback((usersToSelect: UserSummary[]) => {
    setUsuariosCompartidos((prev) => {
      const prevIds = new Set(prev.map((u) => u.user_context_id));
      const newUsers = usersToSelect.filter((u) => !prevIds.has(u.user_context_id));
      return [...prev, ...newUsers];
    });
  }, []);

  const handleDeselectAllRoleUsers = useCallback((usersToDeselect: UserSummary[]) => {
    setUsuariosCompartidos((prev) => {
      const idsToRemove = new Set(usersToDeselect.map((u) => u.user_context_id));
      return prev.filter((u) => !idsToRemove.has(u.user_context_id));
    });
  }, []);

  const handleSearchUsers = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleRoleSelect = useCallback((role: string) => {
    setActiveRole(role);
  }, []);

  // Roles disponibles para seleccionar
  const allRoles = [
    { label: 'Todos', value: '*' },
    { label: 'Contable', value: 'contable' },
    { label: 'Consejo', value: 'consejo' },
    { label: 'Encargado', value: 'encargado' },
    { label: 'Gerencia', value: 'gerencia' },
    { label: 'Personal', value: 'empleado' },
    { label: 'Personas y Relaciones', value: 'personasRelaciones' },
  ];

  const isFormValid = useMemo(() => {
    return nombre.trim().length > 0;
  }, [nombre]);

  const handleActualizarArchivo = useCallback(() => {
    if (!isFormValid) {
      Alert.alert('Formulario incompleto', 'Por favor proporciona un título');
      return;
    }

    const payload: UpdateArchivoPayload = {
      nombre: nombre.trim(),
      usuarios_compartidos: usuariosCompartidos.map((u) => u.user_context_id),
      usuarios_asociados: isSupervisor ? usuariosAsociados.map((u) => u.user_context_id) : [],
      allowed_roles: allowedRoles,
    };

    updateArchivo(
      { id: archivo.id, data: payload },
      {
        onSuccess: () => {
          Alert.alert('Éxito', 'Archivo actualizado correctamente');
          onClose();
        },
        onError: (error: any) => {
          Alert.alert(
            'Error',
            error instanceof Error ? error.message : 'No se pudo actualizar el archivo'
          );
        },
      }
    );
  }, [isFormValid, archivo.id, nombre, usuariosCompartidos, usuariosAsociados, allowedRoles, isSupervisor, updateArchivo, onClose]);

  const handleCancel = useCallback(() => {
    if (nombre !== archivo.nombre || usuariosCompartidos.length > 0) {
      Alert.alert('Descartar cambios', '¿Deseas descartar los cambios?', [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Descartar',
          onPress: () => {
            onClose();
            setNombre(archivo.nombre);
            setUsuariosCompartidos([]);
            setUsuariosAsociados([]);
            setAllowedRoles([]);
          },
        },
      ]);
    } else {
      onClose();
    }
  }, [nombre, archivo.nombre, usuariosCompartidos, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
              <Ionicons name="close" size={24} color={colors.icon} />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Editar Archivo</ThemedText>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Title Input */}
            <View style={styles.inputSection}>
              <ThemedText style={styles.label}>Título del archivo</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Título"
                placeholderTextColor={colors.secondaryText}
                value={nombre}
                onChangeText={setNombre}
                maxLength={100}
              />
            </View>

            {/* Users Compartidos Selector */}
            <View style={styles.inputSection}>
              <ThemedText style={styles.label}>Compartir con usuarios</ThemedText>
              <UserSelector
                selectedUsers={usuariosCompartidos}
                onSelectUsers={setUsuariosCompartidos}
                users={users}
                roles={allRoles}
                isLoadingUsers={isLoadingUsers}
                isLoadingRoles={false}
                onSearch={handleSearchUsers}
                onSelectRole={handleRoleSelect}
              />
            </View>

            <RoleUserSelectionModal
              visible={showRoleModal}
              onClose={handleCloseRoleModal}
              roleName={activeRole}
              roleUsers={roleUsers}
              selectedUsers={usuariosCompartidos}
              onToggleUser={handleToggleUser}
              onSelectAll={handleSelectAllRoleUsers}
              onDeselectAll={handleDeselectAllRoleUsers}
            />

            {/* Usuarios Asociados (Solo para Supervisores) */}
            {isSupervisor && (
              <View style={styles.inputSection}>
                <ThemedText style={styles.label}>Usuarios Asociados (Seguidos)</ThemedText>
                <UserSelector
                  selectedUsers={usuariosAsociados}
                  onSelectUsers={setUsuariosAsociados}
                  users={users}
                  roles={allRoles}
                  isLoadingUsers={isLoadingUsers}
                  isLoadingRoles={false}
                  onSearch={handleSearchUsers}
                  onSelectRole={handleRoleSelect}
                />
              </View>
            )}

            {/* Roles Permitidos */}
            <View style={styles.inputSection}>
              <ThemedText style={styles.label}>Roles permitidos</ThemedText>
              <TouchableOpacity
                style={[
                  styles.rolesButton,
                  { backgroundColor: colors.componentBackground, borderColor: colors.icon },
                ]}
                onPress={() => setShowRolesDropdown(!showRolesDropdown)}
              >
                <ThemedText style={{ color: colors.text }}>
                  {allowedRoles.length > 0
                    ? `${allowedRoles.length} rol(es) seleccionado(s)`
                    : 'Seleccionar roles'}
                </ThemedText>
                <Ionicons
                  name={showRolesDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.icon}
                />
              </TouchableOpacity>

              {showRolesDropdown && (
                <View style={[styles.rolesDropdown, { backgroundColor: colors.componentBackground }]}>
                  {allRoles.map((role) => (
                    <TouchableOpacity
                      key={role.value}
                      style={styles.roleOption}
                      onPress={() => {
                        // Handle "Todos" selection logic
                        if (role.value === '*') {
                          setAllowedRoles((prev) =>
                            prev.includes('*') ? [] : ['*']
                          );
                        } else {
                          // If "Todos" is selected, deselect it when selecting a specific role
                          setAllowedRoles((prev) => {
                            const newRoles = prev.includes('*')
                              ? prev.filter((r) => r !== '*')
                              : prev;
                            
                            return newRoles.includes(role.value)
                              ? newRoles.filter((r) => r !== role.value)
                              : [...newRoles, role.value];
                          });
                        }
                      }}
                    >
                      <Ionicons
                        name={allowedRoles.includes(role.value) ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={allowedRoles.includes(role.value) ? colors.tint : colors.secondaryText}
                      />
                      <ThemedText style={{ marginLeft: 8 }}>{role.label}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Update Button */}
          <TouchableOpacity
            style={[
              styles.updateButton,
              {
                backgroundColor: !isFormValid || isUpdating ? colors.icon : colors.lightTint,
              },
            ]}
            onPress={handleActualizarArchivo}
            disabled={!isFormValid || isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={colors.componentBackground} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={colors.componentBackground} />
                <ThemedText style={styles.updateButtonText}>Actualizar Archivo</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  rolesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  rolesDropdown: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.icon,
    overflow: 'hidden',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.icon,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  updateButtonText: {
    color: colors.componentBackground,
    fontWeight: '600',
    fontSize: 16,
  },
});
