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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileFile, UploadArchivoPayload } from '../models/Archivo';
import { useUploadArchivo } from '../viewmodels/useArchivos';

const colors = Colors['light'];

interface CrearDocumentoProps {
  visible: boolean;
  onClose: () => void;
  initialFile?: MobileFile;
}

export function CrearDocumento({ visible, onClose, initialFile }: CrearDocumentoProps) {
  const insets = useSafeAreaInsets();

  const [titulo, setTitulo] = useState(initialFile?.name.split('.')[0] || '');
  const [descripcion, setDescripcion] = useState('');
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
  const [selectorContext, setSelectorContext] = useState<'compartidos' | 'asociados'>('compartidos');

  const { hasRole } = useRoleCheck();
  const isSupervisor = hasRole(['gerencia', 'personasRelaciones', 'encargado']);

  const isLoadingUsers = isSearchingUsers || isLoadingRole;
  const { mutate: uploadArchivo, isPending: isUploading } = useUploadArchivo();

  React.useEffect(() => {
    if (activeRole && roleUsersData) {
      setRoleUsers(roleUsersData);
      setShowRoleModal(true);
    } else if (roleError) {
      Alert.alert('Intenta nuevamente');
      setActiveRole('');
    }
  }, [roleUsersData, activeRole, roleError]);

  const handleCloseRoleModal = () => {
    setShowRoleModal(false);
    setActiveRole('');
    setRoleUsers([]);
  };

  const handleToggleUser = useCallback((user: UserSummary) => {
    if (selectorContext === 'asociados') {
      setUsuariosAsociados((prev) => {
        const isSelected = prev.some((u) => u.user_context_id === user.user_context_id);
        return isSelected
          ? prev.filter((u) => u.user_context_id !== user.user_context_id)
          : [...prev, user];
      });
    } else {
      // compartidos: if the role was fully selected, deselect it and add remaining users individually
      if (activeRole && allowedRoles.includes(activeRole)) {
        setAllowedRoles((prev) => prev.filter((r) => r !== activeRole));
        setUsuariosCompartidos((prev) => {
          const otherRoleUsers = roleUsers.filter((u) => u.user_context_id !== user.user_context_id);
          const existingIds = new Set(prev.map((u) => u.user_context_id));
          const newUsers = otherRoleUsers.filter((u) => !existingIds.has(u.user_context_id));
          return [...prev, ...newUsers];
        });
      } else {
        setUsuariosCompartidos((prev) => {
          const isSelected = prev.some((u) => u.user_context_id === user.user_context_id);
          return isSelected
            ? prev.filter((u) => u.user_context_id !== user.user_context_id)
            : [...prev, user];
        });
      }
    }
  }, [selectorContext, activeRole, allowedRoles, roleUsers]);

  const handleSelectAllRoleUsers = useCallback((usersToSelect: UserSummary[]) => {
    if (selectorContext === 'asociados') {
      // asociados: add all users individually
      setUsuariosAsociados((prev) => {
        const existingIds = new Set(prev.map((u) => u.user_context_id));
        const newUsers = usersToSelect.filter((u) => !existingIds.has(u.user_context_id));
        return [...prev, ...newUsers];
      });
    } else {
      // compartidos: add role to allowedRoles, remove individual users of this role
      if (activeRole && !allowedRoles.includes(activeRole)) {
        setAllowedRoles((prev) => [...prev, activeRole]);
      }
      setUsuariosCompartidos((prev) => {
        const idsToRemove = new Set(usersToSelect.map((u) => u.user_context_id));
        return prev.filter((u) => !idsToRemove.has(u.user_context_id));
      });
    }
  }, [selectorContext, activeRole, allowedRoles]);

  const handleDeselectAllRoleUsers = useCallback((_: UserSummary[]) => {
    if (selectorContext === 'asociados') {
      // asociados: remove all role users
      setUsuariosAsociados((prev) => {
        const idsToRemove = new Set(roleUsers.map((u) => u.user_context_id));
        return prev.filter((u) => !idsToRemove.has(u.user_context_id));
      });
    } else {
      // compartidos: remove role from allowedRoles
      if (activeRole && allowedRoles.includes(activeRole)) {
        setAllowedRoles((prev) => prev.filter((r) => r !== activeRole));
      }
    }
  }, [selectorContext, activeRole, allowedRoles, roleUsers]);

  const handleSearchUsers = useCallback((query: string) => setSearchQuery(query), []);

  const handleRoleSelectCompartidos = useCallback((role: string) => {
    setSelectorContext('compartidos');
    setActiveRole(role);
  }, []);

  const handleRoleSelectAsociados = useCallback((role: string) => {
    setSelectorContext('asociados');
    setActiveRole(role);
  }, []);

  const modalSelectedUsers = useMemo(() => {
    return selectorContext === 'asociados' ? usuariosAsociados : usuariosCompartidos;
  }, [selectorContext, usuariosAsociados, usuariosCompartidos]);

  const isRoleSelected = useMemo(() => {
    return selectorContext === 'compartidos' && allowedRoles.includes(activeRole);
  }, [selectorContext, allowedRoles, activeRole]);

  const allRoles = [
    { label: 'Todos', value: '*' },
    { label: 'Contable', value: 'contable' },
    { label: 'Consejo', value: 'consejo' },
    { label: 'Encargado', value: 'encargado' },
    { label: 'Gerencia', value: 'gerencia' },
    { label: 'Personal', value: 'empleado' },
    { label: 'Personas y Relaciones', value: 'personasRelaciones' },
  ];

  const selectedRolesForDisplay = useMemo(() => {
    return allRoles.filter((r) => allowedRoles.includes(r.value));
  }, [allRoles, allowedRoles]);

  const handleRemoveRole = useCallback((roleValue: string) => {
    setAllowedRoles((prev) => prev.filter((r) => r !== roleValue));
  }, []);

  const isFormValid = useMemo(
    () => titulo.trim().length > 0 && initialFile != null,
    [titulo, initialFile]
  );

  const BUTTON_HEIGHT = 48;
  const BUTTON_MARGIN = 16;
  const bottomBarHeight = BUTTON_HEIGHT + BUTTON_MARGIN * 2 + insets.bottom;

  const resetForm = useCallback(() => {
    setTitulo('');
    setDescripcion('');
    setUsuariosCompartidos([]);
    setUsuariosAsociados([]);
    setAllowedRoles([]);
  }, []);

  const handleCrearDocumento = useCallback(() => {
    if (!isFormValid || !initialFile) {
      Alert.alert('Formulario incompleto', 'Por favor proporciona un archivo y título');
      return;
    }
    const uploadPayload: UploadArchivoPayload = {
      nombre: titulo.trim(),
      titulo: descripcion.trim(),
      usuarios_compartidos: usuariosCompartidos.map((u) => u.user_context_id),
      usuarios_asociados: isSupervisor ? usuariosAsociados.map((u) => u.user_context_id) : undefined,
      allowed_roles: allowedRoles.length > 0 ? allowedRoles : undefined,
    };
    const mobileFile: MobileFile = {
      uri: initialFile.uri,
      name: initialFile.name,
      type: initialFile.type,
      size: initialFile.size,
    };
    uploadArchivo(
      { archivo: mobileFile, data: uploadPayload },
      {
        onSuccess: () => { Alert.alert('Éxito', 'Archivo subido correctamente'); onClose(); resetForm(); },
        onError: (error: any) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
        },
      }
    );
  }, [isFormValid, initialFile, titulo, descripcion, usuariosCompartidos, usuariosAsociados, allowedRoles, isSupervisor, uploadArchivo, onClose, resetForm]);

  const handleCancel = useCallback(() => {
    if (titulo.trim() || descripcion.trim() || usuariosCompartidos.length > 0) {
      Alert.alert('Descartar cambios', '¿Deseas descartar los cambios?', [
        { text: 'Cancelar', onPress: () => {} },
        { text: 'Descartar', onPress: () => { onClose(); resetForm(); } },
      ]);
    } else {
      onClose();
    }
  }, [titulo, descripcion, usuariosCompartidos, onClose, resetForm]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleCancel}>
      {/*
        Estructura:
          <View> (raíz, flex:1)
            <Header> (fijo arriba, con insets.top)
            <KeyboardAvoidingView> (ocupa el espacio restante entre header y botón)
              <ScrollView> (contenido scrolleable)
            <View botón fijo> (fijo abajo, con insets.bottom)

        Así el teclado empuja solo el scroll, nunca el botón.
      */}
      <View style={styles.container}>
        {/* Header fijo con safe-area top */}
        <View style={[styles.header, { paddingTop: insets.top || 12 }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
            <Ionicons name="close" size={24} color={colors.icon} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Subir Archivo</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        {/* KAV solo envuelve el scroll — el botón queda fuera */}
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
            {/* File Info */}
            {initialFile && (
              <View style={styles.fileInfoSection}>
                <Ionicons name="document-text" size={32} color={colors.tint} />
                <View style={styles.fileInfoText}>
                  <ThemedText type="defaultSemiBold" numberOfLines={2}>{initialFile.name}</ThemedText>
                  <ThemedText style={{ color: colors.secondaryText, fontSize: 12 }}>{initialFile.type}</ThemedText>
                </View>
              </View>
            )}

            {/* Título */}
            <View style={styles.inputSection}>
              <ThemedText style={styles.label}>Título del archivo</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Título"
                placeholderTextColor={colors.secondaryText}
                value={titulo}
                onChangeText={setTitulo}
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
              Selectores de usuarios: zIndex escalonado para que el dropdown
              del primero flote por encima del segundo.
              zIndex 20 → compartidos (primero en pantalla, dropdown flota hacia abajo)
              zIndex 10 → asociados (debajo)
            */}
            <View style={[styles.inputSection, styles.selectorZ20]}>
              <ThemedText style={styles.label}>Compartir con usuarios</ThemedText>
              <UserSelector
                selectedUsers={usuariosCompartidos}
                onSelectUsers={setUsuariosCompartidos}
                users={users}
                roles={allRoles}
                selectedRoles={selectedRolesForDisplay}
                onRemoveRole={handleRemoveRole}
                isLoadingUsers={isLoadingUsers}
                isLoadingRoles={false}
                onSearch={handleSearchUsers}
                onSelectRole={handleRoleSelectCompartidos}
              />
            </View>

            <RoleUserSelectionModal
              visible={showRoleModal}
              onClose={handleCloseRoleModal}
              roleName={activeRole}
              roleUsers={roleUsers}
              selectedUsers={modalSelectedUsers}
              isRoleSelected={isRoleSelected}
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
                  onSelectRole={handleRoleSelectAsociados}
                />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Botón fijo fuera del KAV — nunca se mueve con el teclado */}
        <View style={[styles.uploadButtonContainer, { paddingBottom: (insets.bottom || 0) + BUTTON_MARGIN }]}>
          <TouchableOpacity
            style={[styles.uploadButton, { backgroundColor: !isFormValid || isUploading ? colors.icon : colors.lightTint }]}
            onPress={handleCrearDocumento}
            disabled={!isFormValid || isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={colors.componentBackground} />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color={colors.componentBackground} />
                <ThemedText style={styles.uploadButtonText}>Subir Archivo</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const BUTTON_MARGIN = 16;

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
    // overflow visible necesario para que los dropdowns salgan del scroll
    overflow: 'visible',
  },
  fileInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.componentBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  fileInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  inputSection: {
    marginBottom: 20,
  },
  // zIndex escalonado para los selectores de usuarios
  selectorZ20: {
    zIndex: 20,
    elevation: 20,
  },
  selectorZ10: {
    zIndex: 10,
    elevation: 10,
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
  uploadButtonContainer: {
    backgroundColor: colors.componentBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.icon,
    paddingHorizontal: '4%',
    paddingTop: 24,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: colors.componentBackground,
    fontWeight: '600',
    fontSize: 16,
  },
});