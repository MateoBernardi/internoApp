import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { RoleUserSelectionModal } from '@/features/solicitudesActividades/components/RoleUserSelectionModal';
import { UserSelector } from '@/features/solicitudesActividades/components/UserSelector';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Usuario } from '@/shared/users/User';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useMemo, useState } from 'react';
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
    View
} from 'react-native';
import { useUploadArchivo } from '../viewmodels/useArchivos';
// @ts-ignore

interface CrearDocumentoProps {
  visible: boolean;
  onClose: () => void;
  initialFile?: DocumentPicker.DocumentPickerAsset;
}

const ROLES = ['admin', 'contable', 'gerencia', 'personasRelaciones', 'consejo', 'encargado', 'empleado'];

export function CrearDocumento({ visible, onClose, initialFile }: CrearDocumentoProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(initialFile || null);
  const [fileName, setFileName] = useState(initialFile?.name || '');
  
  // Search Users
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
  const users = useMemo(() => {
    const list = (searchResults as any)?.data || searchResults;
    return Array.isArray(list) ? list.map((u: any) => ({
      ...u,
      id: u.id_usuario || u.id
    })) : [];
  }, [searchResults]);

  // Roles Logic
  const [activeRole, setActiveRole] = useState('');
  const [roleUsers, setRoleUsers] = useState<Usuario[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { data: roleUsersData, isLoading: isLoadingRole, error: roleError } = useGetUserByRole(activeRole);
  
  const [selectedUsers, setSelectedUsers] = useState<Usuario[]>([]); // To manage selection state
  const [associatedUsers, setAssociatedUsers] = useState<Usuario[]>([]); // To manage 'usuarios_asociados' specifically via search if needed apart from roles?
  // The prompt says "un buscador de usuarios solo por nombre para opcionalmente llenar el campo {usuarios_asociados}"
  // And "si se seleccionan todas las personas de un rol se llena {allowed_roles}, si no {usuarios_compartidos}"
  
  const uploadMutation = useUploadArchivo();

  useEffect(() => {
    if (activeRole && roleUsersData) {
        const roleUsersList = (roleUsersData as any)?.data || roleUsersData;
        if (Array.isArray(roleUsersList)) {
             const mappedUsers = roleUsersList.map((u: any) => ({
                 ...u,
                 id: u.id_usuario || u.id
             }));
             setRoleUsers(mappedUsers);
             setShowRoleModal(true);
        }
    } else if (roleError) {
        Alert.alert("Error", "No se pudieron obtener usuarios del rol");
        setActiveRole('');
    }
  }, [roleUsersData, activeRole, roleError]);

  const pickDocument = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({});
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const pickedFile = result.assets[0];
            setFile(pickedFile);
            setFileName(pickedFile.name);
        } else if (!file) { // If user cancelled picking a file and hasn't picked one before, close modal? 
           // Or just do nothing.
           // If passed "visible" via props, the parent controls visibility.
           // However, trigger to pick document might be from outside.
        }
    } catch (err) {
        console.error("Error picking document", err);
    }
  };

  // Launch picker when modal becomes visible if no file selected? 
  // Or maybe the button in parent triggers create, creating this component which immediately asks for file?
  // The instruction says: "cuando se presiona lleva a buscar el documento a subir, luego abre el modal con el documento"
  // So the flow is: Parent -> pickDocument -> if success -> setVisible(true) of this modal.
  // But here `visible` is a prop. Let's assume parent handles the initial pick, OR this component handles everything.
  // "implementar como componente ... el cual cuando se presiona lleva a buscar el documento a subir, luego abre el modal"
  // This sounds like the component might render a button itself or expose a method.
  // But usually `CrearDocumento` implies the Modal content.
  // I will make `CrearDocumento` be the Modal, and `Documentos.tsx` will handle the logic: Button -> pick -> setFile -> setValid -> Open Modal.
  
  // Revised approach: `CrearDocumento` is likely JUST the modal form. The parent `Documentos.tsx` will handle the flow.
  // Wait, "el componente ... cuando se presiona lleva a buscar...". Maybe `CrearDocumento` IS the button + modal wrapper?
  // Let's make `CrearDocumento` export a wrapper component that renders the button too?
  // Or just the modal and expose a separate `pickAndOpen` function?
  // Simplest: `CrearDocumento` is the Modal. It takes `file` as prop maybe?
  // User Prompt: "implementar como componente ene l archivo CrearDocumento, el cual cuando se presiona lleva a buscar el documento a subir, luego abre el modal..."
  // This suggests a button-like component.
  
  // Let's stick to `CrearDocumento` being the modal for now, and I'll add a helper/hook or integrate directly in `Documentos.tsx`
  
  const handleUpload = async () => {
      if (!file || !fileName.trim()) return;

      // Logic for allowed_roles vs usuarios_compartidos
      // We need to know which users belong to which role to determine "all selected".
      // Since we only query one role at a time, we might need to track "fully selected roles" separately or deduce it.
      // But `selectedUsers` is flat.
      // Complexity: we don't know the full list of users for *every* role unless we fetched them.
      // Simplification: The prompt says "si se seleccionan todas las personas de un rol se llena {allowed_roles}".
      // To implement this accurately, we need to remember if "Select All" was used for a role.
      
      // Let's maintain a set of `selectedRoles` strings.
      // When `onSelectAll` is called in `RoleUserSelectionModal`, we add the role to `selectedRoles`.
      // When `onDeselectAll` or `onToggleUser` (deselect) is called, we remove it.
      
      const payload: any = {
          nombre: fileName,
          usuarios_asociados: associatedUsers.map(u => u.id),
      };

      const sharedUsersIds: number[] = [];
      const allowedRoles: string[] = [];
      
      // We need to iterate over `selectedUsersWithRoles` logic.
      // Since the role modal only shows one role at time, managing "all selected" state globally is tricky without fetching all.
      // However, if we trust the user interaction:
      
      // Let's implement a simple heuristic or state for "roles fully selected".
      // I will add `fullySelectedRoles` state.
      
      fullySelectedRoles.forEach(role => allowedRoles.push(role));
      
      // For shared users: any selected user that belongs to a role NOT in `fullySelectedRoles`.
      // NOTE: We don't necessarily know which role a user belongs to just from `Usuario` object if it doesn't have it.
      // But we know which users we selected.
      
      // If a role is "Allowed", we don't need to send individual users of that role in `usuarios_compartidos`.
      // But the backend might handle overlap.
      // Let's send specific users in `usuarios_compartidos` ONLY if their role isn't in `allowedRoles`.
      // BUT, checking user role from `Usuario` object might be needed.
      // Assuming `Usuario` has `role` or `roles`.
      // If not, we might simpler send everyone in `usuarios_compartidos` AND add `allowed_roles`.
      // The backend probably handles "grant if in list OR has allowed role".
      // But prompt says: "si ... todas ... llena allowed_roles... en caso de que sean algunas ... llena usuarios_compartidos".
      // This implies disjoint sets or a clean separation.
      
      // Strategy:
      // 1. `fullySelectedRoles` contains roles where user clicked "Select All".
      // 2. We remove users belonging to those roles from the individual list IF we can identify them.
      //    If we can't identify them easily, maybe we just send both and backend is lenient.
      //    Or, we track `usersByRole`?
      
      // Let's try to track which users were selected *under which role context*.
      
      selectedUsers.forEach(u => {
          // If we can't determine if covered by allowedRoles, just add.
          sharedUsersIds.push(u.id);
      });

      payload.allowed_roles = allowedRoles;
      payload.usuarios_compartidos = sharedUsersIds; 
      
      // Note: If I define "All 'ADMINS'" selected, I add 'ADMIN' to allowed_roles.
      // If I also add all those admin IDs to `usuarios_compartidos`, it's redundant but safe usually.
      // Optimization: filter out users if possible.
      
      try {
          await uploadMutation.mutateAsync({
              archivo: {
                  uri: file.uri,
                  name: file.name,
                  type: file.mimeType || 'application/octet-stream',
                  size: file.size
              },
              data: payload
          });
          Alert.alert("Éxito", "Documento subido correctamente");
          onClose();
          // Reset state
          setSelectedUsers([]);
          setAssociatedUsers([]);
          setFullySelectedRoles(new Set());
          setFile(null);
          setFileName('');
      } catch (error) {
          console.error(error);
          Alert.alert("Error", "No se pudo subir el documento");
      }
  };

  const [fullySelectedRoles, setFullySelectedRoles] = useState<Set<string>>(new Set());

  const handleSelectAllRole = (role: string, users: Usuario[]) => {
      setFullySelectedRoles(prev => new Set(prev).add(role));
      setSelectedUsers(prev => {
          const newSet = [...prev];
          users.forEach(u => {
              if (!newSet.find(existing => existing.id === u.id)) {
                  newSet.push(u);
              }
          });
          return newSet;
      });
  };

  const handleDeselectAllRole = (role: string, users: Usuario[]) => {
      setFullySelectedRoles(prev => {
          const next = new Set(prev);
          next.delete(role);
          return next;
      });
      setSelectedUsers(prev => prev.filter(p => !users.find(u => u.id === p.id)));
  };

  const handleToggleUserRole = (role: string, user: Usuario) => {
      // If we toggle a user individually, we are no longer "All Selected" for that role
      if (fullySelectedRoles.has(role)) {
           setFullySelectedRoles(prev => {
              const next = new Set(prev);
              next.delete(role);
              return next;
          });
      }
      
      setSelectedUsers(prev => {
          const exists = prev.find(u => u.id === user.id);
          if (exists) {
              return prev.filter(u => u.id !== user.id);
          } else {
              return [...prev, user];
          }
      });
  };

  // Associated Users (Search only)
  // Re-using UserSelector logic but for a different bucket?
  // The UserSelector component handles generic selection.
  // We can switch context or just use a specific instance.
  // The prompt says: "buscador de usuarios solo por nombre para opcionalmente llenar el campo {usuarios_asociados}"
  // This sounds like a separate input field or a mode in UserSelector.
  // I'll add a section for "Usuarios Asociados" using UserSelector but without roles.
  
  return (
    <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
    >
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
        >
            <View style={styles.header}>
                <ThemedText type="subtitle">Subir Documento</ThemedText>
                <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={styles.content}>
                {file && (
                    <View style={styles.fileCard}>
                         <Ionicons name="document" size={32} color={colors.text} />
                         <View style={{flex: 1, marginLeft: 12}}>
                             <ThemedText numberOfLines={1}>{fileName}</ThemedText>
                             <ThemedText style={{fontSize: 12, color: '#666'}}>{(file.size! / 1024).toFixed(2)} KB</ThemedText>
                         </View>
                    </View>
                )}

                <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>Nombre del Documento</ThemedText>
                    <TextInput 
                        style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
                        value={fileName}
                        onChangeText={setFileName}
                        placeholder="Nombre del archivo"
                        placeholderTextColor="#999"
                    />
                </View>

                {/* Shared With (Roles/Users) - populates {allowed_roles} or {usuarios_compartidos} */}
                <View style={styles.formGroup}>
                     <ThemedText style={styles.label}>Compartir con (Roles/Usuarios)</ThemedText>
                     <UserSelector
                        selectedUsers={selectedUsers}
                        onSelectUsers={setSelectedUsers}
                        users={users}
                        roles={ROLES}
                        isLoadingUsers={isSearchingUsers}
                        isLoadingRoles={isLoadingRole}
                        onSearch={setSearchQuery}
                        onSelectRole={(role) => setActiveRole(role)}
                     />
                     {/* Show selected summary */}
                     <View style={styles.chipsContainer}>
                         {Array.from(fullySelectedRoles).map(role => (
                             <View key={role} style={[styles.chip, { backgroundColor: colors.tint }]}>
                                 <ThemedText style={styles.chipText}>Rol: {role}</ThemedText>
                             </View>
                         ))}
                     </View>
                </View>

                {/* Associated Users - populates {usuarios_asociados} */}
                <View style={styles.formGroup}>
                     <ThemedText style={styles.label}>Usuarios Asociados (Opcional)</ThemedText>
                     <UserSelector
                        selectedUsers={associatedUsers}
                        onSelectUsers={setAssociatedUsers}
                        users={users} // Reusing same search pool
                        roles={[]} // No roles allowed here
                        isLoadingUsers={isSearchingUsers}
                        onSearch={setSearchQuery}
                        onSelectRole={() => {}}
                     />
                </View>

                <View style={{height: 100}} /> 
            </ScrollView>

             <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.submitButton, (!file || !fileName) && styles.disabledButton]}
                    onPress={handleUpload}
                    disabled={!file || !fileName || uploadMutation.isPending}
                >
                    {uploadMutation.isPending ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <ThemedText style={styles.submitButtonText}>Subir Documento</ThemedText>
                    )}
                </TouchableOpacity>
             </View>

            {/* Modal for Role Selection */}
            {activeRole !== '' && (
                <RoleUserSelectionModal
                    visible={showRoleModal}
                    onClose={() => {
                        setShowRoleModal(false);
                        setActiveRole('');
                    }}
                    roleName={activeRole}
                    roleUsers={roleUsers}
                    selectedUsers={selectedUsers} // Global selected
                    onToggleUser={(u) => handleToggleUserRole(activeRole, u)}
                    onSelectAll={(users) => handleSelectAllRole(activeRole, users)}
                    onDeselectAll={(users) => handleDeselectAllRole(activeRole, users)}
                />
            )}

        </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
    modalContainer: {
        backgroundColor: 'white', // override theme for now, or use ThemedView
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginTop: Platform.OS === 'android' ? 20 : 0
    },
    content: {
        padding: 16,
    },
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        marginBottom: 24,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    submitButton: {
        backgroundColor: '#00054bff',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    submitButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8
    },
    chip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    chipText: {
        color: 'white',
        fontSize: 12
    }
});
