import { ThemedText } from '@/components/themed-text';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { RoleUserSelectionModal } from '@/features/solicitudesActividades/components/RoleUserSelectionModal';
import { UserSelector } from '@/features/solicitudesActividades/components/UserSelector';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { showGlobalToast } from '@/shared/ui/toast';
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
import { formatPartialWarnings } from '../utils/partialWarnings';
import { useArchivoPermisos, useUpdateArchivo } from '../viewmodels/useArchivos';
import { PartialSaveBanner } from './PartialSaveBanner';

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
  const [allowedRoles, setAllowedRoles] = useState<string[]>(archivo.allowed_roles || []);
  const [showPermisosSection, setShowPermisosSection] = useState(false);
  const [didHydrateFromPermisos, setDidHydrateFromPermisos] = useState(false);
  const [partialWarning, setPartialWarning] = useState<string | null>(null);
  const [didPartialSuccess, setDidPartialSuccess] = useState(false);

  const {
    data: permisosData,
    isLoading: isLoadingPermisos,
    error: permisosError,
  } = useArchivoPermisos(showPermisosSection ? archivo.id : undefined);

  const { hasRole } = useRoleCheck();
  const isSupervisor = hasRole(['gerencia', 'personasRelaciones', 'encargado']);

  const isLoadingUsers = isSearchingUsers || isLoadingRole;
  const { mutate: updateArchivo, isPending: isUpdating } = useUpdateArchivo();

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

  const availableRoleValues = useMemo(
    () => allRoles.filter((role) => role.value !== '*').map((role) => role.value),
    [allRoles]
  );

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

  React.useEffect(() => {
    if (!visible) return;

    setNombre(archivo.nombre);
    setDescripcion(archivo.titulo ?? '');
    setAllowedRoles(archivo.allowed_roles || []);
    setUsuariosCompartidos(
      (archivo.usuarios_compartidos || []).map((id) => ({
        user_context_id: id,
        id_usuario: id,
        username: `user_${id}`,
        nombre: 'Usuario',
        apellido: `#${id}`,
        email: '',
      }))
    );
    setUsuariosAsociados(
      (archivo.usuarios_asociados || []).map((id) => ({
        user_context_id: id,
        id_usuario: id,
        username: `user_${id}`,
        nombre: 'Usuario',
        apellido: `#${id}`,
        email: '',
      }))
    );
    setPartialWarning(null);
    setDidPartialSuccess(false);
    setShowPermisosSection(false);
    setDidHydrateFromPermisos(false);
  }, [visible, archivo]);

  React.useEffect(() => {
    if (!showPermisosSection || !permisosData || didHydrateFromPermisos) return;

    const incomingRoles = Array.isArray(permisosData.allowed_roles) ? permisosData.allowed_roles : [];
    const incomingIds = Array.isArray(permisosData.user_context_ids)
      ? permisosData.user_context_ids.filter((id) => Number.isInteger(id) && id > 0)
      : [];
    const incomingNames = Array.isArray(permisosData.allowed_users) ? permisosData.allowed_users : [];

    setAllowedRoles(incomingRoles);

    if (incomingIds.length > 0) {
      setUsuariosCompartidos(
        incomingIds.map((id, index) => ({
          user_context_id: id,
          id_usuario: id,
          username: `user_${id}`,
          nombre: incomingNames[index] || 'Usuario',
          apellido: incomingNames[index] ? '' : `#${id}`,
          email: '',
        }))
      );
      setUsuariosAsociados([]);
    }

    setDidHydrateFromPermisos(true);
  }, [didHydrateFromPermisos, permisosData, showPermisosSection]);

  const handleCloseRoleModal = () => {
    setShowRoleModal(false);
    setActiveRole('');
    setRoleUsers([]);
  };

  const handleToggleUser = useCallback((user: UserSummary) => {
    if (activeRole && allowedRoles.includes(activeRole)) {
      setAllowedRoles((prev) => prev.filter((r) => r !== activeRole));
      setUsuariosCompartidos((prev) => {
        const otherRoleUsers = roleUsers.filter((u) => u.user_context_id !== user.user_context_id);
        const existingIds = new Set(prev.map((u) => u.user_context_id));
        const newUsers = otherRoleUsers.filter((u) => !existingIds.has(u.user_context_id));
        return [...prev, ...newUsers];
      });
      return;
    }

    setUsuariosCompartidos((prev) => {
      const isSelected = prev.some((u) => u.user_context_id === user.user_context_id);
      return isSelected
        ? prev.filter((u) => u.user_context_id !== user.user_context_id)
        : [...prev, user];
    });
  }, [activeRole, allowedRoles, roleUsers]);

  const handleSelectAllRoleUsers = useCallback((usersToSelect: UserSummary[]) => {
    if (activeRole && !allowedRoles.includes(activeRole)) {
      setAllowedRoles((prev) => [...prev, activeRole]);
    }

    setUsuariosCompartidos((prev) => {
      const idsToRemove = new Set(usersToSelect.map((u) => u.user_context_id));
      return prev.filter((u) => !idsToRemove.has(u.user_context_id));
    });
  }, [activeRole, allowedRoles]);

  const handleDeselectAllRoleUsers = useCallback((usersToDeselect: UserSummary[]) => {
    if (activeRole && allowedRoles.includes(activeRole)) {
      setAllowedRoles((prev) => prev.filter((r) => r !== activeRole));
      return;
    }

    setUsuariosCompartidos((prev) => {
      const idsToRemove = new Set(usersToDeselect.map((u) => u.user_context_id));
      return prev.filter((u) => !idsToRemove.has(u.user_context_id));
    });
  }, [activeRole, allowedRoles]);

  const handleSearchUsers = useCallback((query: string) => setSearchQuery(query), []);
  const handleRoleSelect = useCallback((role: string) => {
    if (role === '*') {
      setAllowedRoles(availableRoleValues);
      setActiveRole('');
      return;
    }

    setActiveRole(role);
  }, [availableRoleValues]);

  const roleLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    allRoles.forEach((role) => {
      map[role.value] = role.label;
    });
    return map;
  }, [allRoles]);

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

    usuariosCompartidos.forEach(addUser);
    usuariosAsociados.forEach(addUser);
    users.forEach(addUser);
    roleUsers.forEach(addUser);

    const fallbackIds = [
      ...(archivo.usuarios_compartidos || []),
      ...(archivo.usuarios_asociados || []),
    ].filter((id) => Number.isInteger(id) && id > 0);
    const backendIds = (permisosData?.user_context_ids || []).filter((id) => Number.isInteger(id) && id > 0);
    const names = permisosData?.allowed_users || [];

    names.forEach((name, index) => {
      const id = backendIds[index] || fallbackIds[index];
      if (Number.isInteger(id) && id > 0 && name) {
        map[id] = name;
      }
    });

    return map;
  }, [archivo.usuarios_asociados, archivo.usuarios_compartidos, permisosData?.allowed_users, permisosData?.user_context_ids, roleUsers, users, usuariosAsociados, usuariosCompartidos]);

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

  const removeSharedUser = useCallback((userId: number) => {
    setUsuariosCompartidos((prev) => prev.filter((user) => user.user_context_id !== userId));
  }, []);

  const removeAssociatedUser = useCallback((userId: number) => {
    setUsuariosAsociados((prev) => prev.filter((user) => user.user_context_id !== userId));
  }, []);

  const isFormValid = useMemo(() => nombre.trim().length > 0, [nombre]);
  const selectedRolesForDisplay = useMemo(
    () => allRoles.filter((r) => allowedRoles.includes(r.value)),
    [allowedRoles, allRoles]
  );
  const isRoleSelected = useMemo(() => allowedRoles.includes(activeRole), [allowedRoles, activeRole]);

  const resetForm = useCallback(() => {
    setNombre(archivo.nombre);
    setDescripcion(archivo.titulo ?? '');
    setUsuariosCompartidos(
      (archivo.usuarios_compartidos || []).map((id) => ({
        user_context_id: id,
        id_usuario: id,
        username: `user_${id}`,
        nombre: 'Usuario',
        apellido: `#${id}`,
        email: '',
      }))
    );
    setUsuariosAsociados(
      (archivo.usuarios_asociados || []).map((id) => ({
        user_context_id: id,
        id_usuario: id,
        username: `user_${id}`,
        nombre: 'Usuario',
        apellido: `#${id}`,
        email: '',
      }))
    );
    setAllowedRoles(archivo.allowed_roles || []);
    setPartialWarning(null);
    setDidPartialSuccess(false);
  }, [archivo]);

  const handleActualizarArchivo = useCallback(() => {
    if (didPartialSuccess) {
      onClose();
      resetForm();
      return;
    }

    if (!isFormValid) {
      Alert.alert('Formulario incompleto', 'Por favor proporciona un título');
      return;
    }
    const usuariosCompartidosIds = usuariosCompartidos.map((u) => u.user_context_id);
    const usuariosAsociadosIds = usuariosAsociados.map((u) => u.user_context_id);

    const payload: UpdateArchivoPayload = {
      nombre: nombre.trim(),
      titulo: descripcion.trim() || undefined,
      usuarios_compartidos: usuariosCompartidosIds,
      ...(isSupervisor ? { usuarios_asociados: usuariosAsociadosIds } : {}),
      allowed_roles: allowedRoles,
    };
    updateArchivo(
      { id: archivo.id, data: payload },
      {
        onSuccess: (result) => {
          if (result.status === 'partial_success') {
            setDidPartialSuccess(true);
            setPartialWarning(formatPartialWarnings(result.warnings));
            showGlobalToast('Guardado parcial');
            return;
          }

          Alert.alert('Éxito', 'Archivo actualizado correctamente');
          onClose();
        },
        onError: (error: any) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
        },
      }
    );
  }, [didPartialSuccess, isFormValid, archivo.id, nombre, descripcion, usuariosCompartidos, usuariosAsociados, allowedRoles, isSupervisor, updateArchivo, onClose, resetForm]);

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
            {partialWarning ? (
              <PartialSaveBanner message={partialWarning} onClose={() => setPartialWarning(null)} />
            ) : null}

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

                      <View style={styles.sectionDivider} />

                      <View style={styles.permisosSection}>
                        <ThemedText style={styles.permisosSectionTitle}>Usuarios compartidos</ThemedText>
                        {usuariosCompartidos.length > 0 ? (
                          <View style={styles.chipWrap}>
                            {usuariosCompartidos.map((user) => (
                              <View key={user.user_context_id} style={styles.editableChip}>
                                <ThemedText style={styles.chipLabel}>{getUserDisplayName(user)}</ThemedText>
                                <TouchableOpacity
                                  style={styles.chipRemoveButton}
                                  onPress={() => removeSharedUser(user.user_context_id)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Quitar usuario ${getUserDisplayName(user)}`}
                                >
                                  <Ionicons name="close" size={14} color={colors.secondaryText} />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <ThemedText style={styles.permisosHint}>Sin usuarios compartidos.</ThemedText>
                        )}
                      </View>

                      <View style={[styles.permisosSection, styles.selectorZ20]}>
                        <ThemedText style={styles.label}>Agregar usuarios y roles</ThemedText>
                        <UserSelector
                          selectedUsers={usuariosCompartidos}
                          onSelectUsers={setUsuariosCompartidos}
                          users={users}
                          roles={allRoles}
                          selectedRoles={selectedRolesForDisplay}
                          onRemoveRole={(roleValue) => setAllowedRoles((prev) => prev.filter((r) => r !== roleValue))}
                          isLoadingUsers={isLoadingUsers}
                          isLoadingRoles={false}
                          showSelectedChips={false}
                          onSearch={handleSearchUsers}
                          onSelectRole={handleRoleSelect}
                        />
                      </View>

                      {isSupervisor && (
                        <>
                          <View style={styles.permisosSection}>
                            <ThemedText style={styles.permisosSectionTitle}>Usuarios asociados (seguidos)</ThemedText>
                            {usuariosAsociados.length > 0 ? (
                              <View style={styles.chipWrap}>
                                {usuariosAsociados.map((user) => (
                                  <View key={user.user_context_id} style={styles.editableChip}>
                                    <ThemedText style={styles.chipLabel}>{getUserDisplayName(user)}</ThemedText>
                                    <TouchableOpacity
                                      style={styles.chipRemoveButton}
                                      onPress={() => removeAssociatedUser(user.user_context_id)}
                                      accessibilityRole="button"
                                      accessibilityLabel={`Quitar usuario asociado ${getUserDisplayName(user)}`}
                                    >
                                      <Ionicons name="close" size={14} color={colors.secondaryText} />
                                    </TouchableOpacity>
                                  </View>
                                ))}
                              </View>
                            ) : (
                              <ThemedText style={styles.permisosHint}>Sin usuarios asociados.</ThemedText>
                            )}
                          </View>

                          <View style={[styles.permisosSection, styles.selectorZ10]}>
                            <ThemedText style={styles.label}>Agregar usuarios asociados</ThemedText>
                            <UserSelector
                              selectedUsers={usuariosAsociados}
                              onSelectUsers={setUsuariosAsociados}
                              users={users}
                              roles={allRoles}
                              isLoadingUsers={isLoadingUsers}
                              isLoadingRoles={false}
                              showSelectedChips={false}
                              onSearch={handleSearchUsers}
                              onSelectRole={handleRoleSelect}
                            />
                          </View>
                        </>
                      )}

                      <View style={styles.sectionDivider} />

                      <View style={styles.permisosSection}>
                        <ThemedText style={styles.permisosHint}>Resumen actual a confirmar</ThemedText>
                        <ThemedText style={styles.permisosHint}>
                          Roles: {allowedRoles.length > 0 ? allowedRoles.map(getRoleLabel).join(', ') : 'Ninguno'}
                        </ThemedText>
                        <ThemedText style={styles.permisosHint}>
                          Compartidos: {usuariosCompartidos.length > 0
                            ? usuariosCompartidos.map(getUserDisplayName).join(', ')
                            : 'Ninguno'}
                        </ThemedText>
                        {isSupervisor ? (
                          <ThemedText style={styles.permisosHint}>
                            Asociados: {usuariosAsociados.length > 0
                              ? usuariosAsociados.map(getUserDisplayName).join(', ')
                              : 'Ninguno'}
                          </ThemedText>
                        ) : null}
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
              selectedUsers={usuariosCompartidos}
              isRoleSelected={isRoleSelected}
              onToggleUser={handleToggleUser}
              onSelectAll={handleSelectAllRoleUsers}
              onDeselectAll={handleDeselectAllRoleUsers}
            />
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
                <ThemedText style={styles.updateButtonText}>
                  {didPartialSuccess ? 'Cerrar' : 'Actualizar Archivo'}
                </ThemedText>
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
  updateButtonContainer: {
    backgroundColor: colors.componentBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.icon,
    paddingHorizontal: '4%',
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