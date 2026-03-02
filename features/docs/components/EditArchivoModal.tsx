import { ThemedText } from '@/components/themed-text';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Archivo, UpdateArchivoPayload } from '../models/Archivo';
import { useUpdateArchivo } from '../viewmodels/useArchivos';

const colors = Colors['light'];

interface EditArchivoModalProps {
  visible: boolean;
  onClose: () => void;
  archivo: Archivo;
}

export function EditArchivoModal({ visible, onClose, archivo }: EditArchivoModalProps) {
  const insets = useSafeAreaInsets();

  const [nombre, setNombre] = useState(archivo.nombre);
  const [descripcion, setDescripcion] = useState(archivo.titulo ?? '');

  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
  const users = searchResults || [];

  const [activeRole, setActiveRole] = useState('');
  const [roleUsers, setRoleUsers] = useState<UserSummary[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { data: roleUsersData, isLoading: isLoadingRole, error: roleError } = useGetUserByRole(activeRole);

  const [usuariosCompartidos, setUsuariosCompartidos] = useState<UserSummary[]>([]);
  const [usuariosAsociados, setUsuariosAsociados] = useState<UserSummary[]>([]);
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [showRolesDropdown, setShowRolesDropdown] = useState(false);

  const { hasRole } = useRoleCheck();
  const isSupervisor = hasRole(['gerencia', 'personasRelaciones', 'encargado']);

  const isLoadingUsers = isSearchingUsers || isLoadingRole;
  const { mutate: updateArchivo, isPending: isUpdating } = useUpdateArchivo();

  const BUTTON_HEIGHT = 48;
  const BUTTON_MARGIN = 16;
  const bottomBarHeight = BUTTON_HEIGHT + BUTTON_MARGIN * 2 + insets.bottom;

  React.useEffect(() => {
    if (activeRole && roleUsersData) {
      setRoleUsers(roleUsersData);
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
      return isSelected
        ? prev.filter((u) => u.user_context_id !== user.user_context_id)
        : [...prev, user];
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

  const handleSearchUsers = useCallback((query: string) => setSearchQuery(query), []);
  const handleRoleSelect = useCallback((role: string) => setActiveRole(role), []);

  const allRoles = [
    { label: 'Todos', value: '*' },
    { label: 'Contable', value: 'contable' },
    { label: 'Consejo', value: 'consejo' },
    { label: 'Encargado', value: 'encargado' },
    { label: 'Gerencia', value: 'gerencia' },
    { label: 'Personal', value: 'empleado' },
    { label: 'Personas y Relaciones', value: 'personasRelaciones' },
  ];

  const isFormValid = useMemo(() => nombre.trim().length > 0, [nombre]);

  const resetForm = useCallback(() => {
    setNombre(archivo.nombre);
    setDescripcion(archivo.titulo ?? '');
    setUsuariosCompartidos([]);
    setUsuariosAsociados([]);
    setAllowedRoles([]);
  }, [archivo.nombre, archivo.titulo]);

  const handleActualizarArchivo = useCallback(() => {
    if (!isFormValid) {
      Alert.alert('Formulario incompleto', 'Por favor proporciona un título');
      return;
    }
    const payload: UpdateArchivoPayload = {
      nombre: nombre.trim(),
      titulo: descripcion.trim() || undefined,
      usuarios_compartidos: usuariosCompartidos.map((u) => u.user_context_id),
      usuarios_asociados: isSupervisor ? usuariosAsociados.map((u) => u.user_context_id) : [],
      allowed_roles: allowedRoles,
    };
    updateArchivo(
      { id: archivo.id, data: payload },
      {
        onSuccess: () => { Alert.alert('Éxito', 'Archivo actualizado correctamente'); onClose(); },
        onError: (error: any) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
        },
      }
    );
  }, [isFormValid, archivo.id, nombre, descripcion, usuariosCompartidos, usuariosAsociados, allowedRoles, isSupervisor, updateArchivo, onClose]);

  const handleCancel = useCallback(() => {
    const hasChanges =
      nombre !== archivo.nombre ||
      descripcion !== (archivo.titulo ?? '') ||
      usuariosCompartidos.length > 0;
    if (hasChanges) {
      Alert.alert('Descartar cambios', '¿Deseas descartar los cambios?', [
        { text: 'Cancelar', onPress: () => {} },
        { text: 'Descartar', onPress: () => { onClose(); resetForm(); } },
      ]);
    } else {
      onClose();
    }
  }, [nombre, descripcion, archivo.nombre, archivo.titulo, usuariosCompartidos, onClose, resetForm]);

  return (
    <>
    <Modal visible={visible} animationType="slide" onRequestClose={handleCancel}>
      {/*
        Misma estructura que CrearDocumento:
          <View> raíz
            <Header> con insets.top
            <KeyboardAvoidingView> solo el scroll
            <Botón fijo> con insets.bottom
      */}
      <View style={styles.container}>
        {/* Header con safe-area top */}
        <View style={[styles.header, { paddingTop: insets.top || 12 }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
            <Ionicons name="close" size={24} color={colors.icon} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Editar Archivo</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        {/* KAV solo envuelve el scroll */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomBarHeight + 8 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Título */}
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

            {/* Descripción */}
            <View style={styles.inputSection}>
              <ThemedText style={styles.label}>
                Descripción <ThemedText style={styles.labelOptional}>(opcional)</ThemedText>
              </ThemedText>
              <TextInput
                style={[styles.input, styles.inputMultiline, { color: colors.text }]}
                placeholder="Agregá una descripción del archivo..."
                placeholderTextColor={colors.secondaryText}
                value={descripcion}
                onChangeText={setDescripcion}
                maxLength={500}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/*
              zIndex escalonado:
              selectorZ20 → compartidos (dropdown flota sobre asociados)
              selectorZ10 → asociados
            */}
            <View style={[styles.inputSection, styles.selectorZ20]}>
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

            {isSupervisor && (
              <View style={[styles.inputSection, styles.selectorZ10]}>
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

            {/* Roles Permitidos — zIndex 5 para no interferir con selectores */}
            <View style={[styles.inputSection, styles.selectorZ5]}>
              <ThemedText style={styles.label}>Roles permitidos</ThemedText>
              <TouchableOpacity
                style={[styles.rolesButton, { backgroundColor: colors.componentBackground, borderColor: colors.icon }]}
                onPress={() => setShowRolesDropdown(!showRolesDropdown)}
              >
                <ThemedText style={{ color: colors.text }}>
                  {allowedRoles.length > 0 ? `${allowedRoles.length} rol(es) seleccionado(s)` : 'Seleccionar roles'}
                </ThemedText>
                <Ionicons name={showRolesDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={colors.icon} />
              </TouchableOpacity>

              {showRolesDropdown && (
                <View style={[styles.rolesDropdown, { backgroundColor: colors.componentBackground }]}>
                  {allRoles.map((role) => (
                    <TouchableOpacity
                      key={role.value}
                      style={styles.roleOption}
                      onPress={() => {
                        if (role.value === '*') {
                          setAllowedRoles((prev) => (prev.includes('*') ? [] : ['*']));
                        } else {
                          setAllowedRoles((prev) => {
                            const withoutTodos = prev.includes('*') ? prev.filter((r) => r !== '*') : prev;
                            return withoutTodos.includes(role.value)
                              ? withoutTodos.filter((r) => r !== role.value)
                              : [...withoutTodos, role.value];
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
        </KeyboardAvoidingView>

        {/* Botón fijo fuera del KAV — con safe-area bottom */}
        <View style={[styles.updateButtonContainer, { paddingBottom: insets.bottom || BUTTON_MARGIN }]}>
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: !isFormValid || isUpdating ? colors.icon : colors.lightTint }]}
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
        </View>
      </View>
    </Modal>
    <OperacionPendienteModal visible={isUpdating} />
    </>
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
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    paddingTop: 12,
    overflow: 'visible',
  },
  inputSection: {
    marginBottom: 20,
  },
  selectorZ20: {
    zIndex: 20,
    elevation: 20,
  },
  selectorZ10: {
    zIndex: 10,
    elevation: 10,
  },
  selectorZ5: {
    zIndex: 5,
    elevation: 5,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 14,
  },
  labelOptional: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.secondaryText,
  },
  input: {
    backgroundColor: colors.componentBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.icon,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: 10,
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
  updateButtonContainer: {
    backgroundColor: colors.componentBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.icon,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  updateButtonText: {
    color: colors.componentBackground,
    fontWeight: '600',
    fontSize: 16,
  },
});