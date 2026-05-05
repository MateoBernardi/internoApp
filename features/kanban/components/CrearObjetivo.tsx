// ============================================
// Modal para crear/editar objetivo
// ============================================

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { UserSummary } from '@/shared/users/User';
import { adminRoles, allRoles } from '@/shared/users/roles';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { UserSelector } from '../../../components/UserSelector';
import { RoleUserSelectionModal } from '../../solicitudesActividades/components/RoleUserSelectionModal';
import { useCreateObjetivo, useUpdateObjetivo } from '../hooks/useObjetivos';
import { CreateObjetivo, ESTADOS, Invitado, Objetivo } from '../models/Objetivo';

const DEFAULT_OBJETIVO_ESTADO = 'PENDIENTE' as const;

interface FormObjetivoModalProps {
    visible: boolean;
    objetivo?: Objetivo;
    onClose: () => void;
    onMinimize?: () => void;
    onSuccess?: () => void;
    draftValues?: CreateObjetivo;
    onDraftChange?: (draft: CreateObjetivo) => void;
    resumeDraft?: boolean;
    onResumeDraftHandled?: () => void;
    resetDraftSignal?: number;
}

export function FormObjetivoModal({
    visible,
    objetivo,
    onClose,
    onMinimize,
    onSuccess,
    draftValues,
    onDraftChange,
    resumeDraft = false,
    onResumeDraftHandled,
    resetDraftSignal = 0,
}: FormObjetivoModalProps) {
    const { user } = useAuth();
    const [titulo, setTitulo] = useState(objetivo?.titulo || '');
    const [descripcion, setDescripcion] = useState(objetivo?.descripcion || '');
    const [estado, setEstado] = useState<(typeof ESTADOS)[number]>(objetivo?.estado || DEFAULT_OBJETIVO_ESTADO);
    const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([]);
    const [rolesByUserId, setRolesByUserId] = useState<Record<number, Invitado['rol']>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [activeRole, setActiveRole] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const createMutation = useCreateObjetivo();
    const updateMutation = useUpdateObjetivo();

    const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
    const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);

    const isEditing = !!objetivo;
    const isLoading = createMutation.isPending || updateMutation.isPending;
    const isKeyboardOpen = keyboardHeight > 0;
    const users = searchResults || [];
    const isLoadingUsers = isSearchingUsers || isLoadingRole;
    const isConsejo = (user?.rol_nombre ?? '').toLowerCase() === 'consejo';
    const rolesForSelector = isConsejo ? adminRoles : allRoles;

    const buildInvitadosPayload = (): Invitado[] => {
        return selectedUsers.map((selectedUser) => ({
            user_id: selectedUser.user_context_id,
            rol: rolesByUserId[selectedUser.user_context_id] ?? 'VISUALIZER',
        }));
    };

    const syncCreateDraft = (partial: Partial<CreateObjetivo>) => {
        if (isEditing || !onDraftChange) return;
        onDraftChange({
            titulo,
            descripcion,
            estado,
            invitados: buildInvitadosPayload(),
            ...partial,
        });
    };

    const handleSelectUsers = (usersToSelect: UserSummary[]) => {
        setSelectedUsers(usersToSelect);
        setRolesByUserId((rolesPrev) => {
            const next: Record<number, Invitado['rol']> = {};
            usersToSelect.forEach((u) => {
                next[u.user_context_id] = rolesPrev[u.user_context_id] ?? 'VISUALIZER';
            });
            return next;
        });
    };

    const handleToggleUser = (selectedUser: UserSummary) => {
        setSelectedUsers((prev) => {
            const exists = prev.some((u) => u.user_context_id === selectedUser.user_context_id);
            if (exists) {
                setRolesByUserId((rolesPrev) => {
                    const next = { ...rolesPrev };
                    delete next[selectedUser.user_context_id];
                    return next;
                });
                return prev.filter((u) => u.user_context_id !== selectedUser.user_context_id);
            }

            setRolesByUserId((rolesPrev) => ({
                ...rolesPrev,
                [selectedUser.user_context_id]: rolesPrev[selectedUser.user_context_id] ?? 'VISUALIZER',
            }));
            return [...prev, selectedUser];
        });
    };

    const handleSelectRole = (role: string) => {
        setActiveRole(role);
        setShowRoleModal(true);
    };

    const handleSelectAllRoleUsers = (usersToSelect: UserSummary[]) => {
        setSelectedUsers((prev) => {
            const prevIds = new Set(prev.map((u) => u.user_context_id));
            const newUsers = usersToSelect.filter((u) => !prevIds.has(u.user_context_id));
            return [...prev, ...newUsers];
        });
        setRolesByUserId((rolesPrev) => {
            const next = { ...rolesPrev };
            usersToSelect.forEach((u) => {
                if (!next[u.user_context_id]) {
                    next[u.user_context_id] = 'VISUALIZER';
                }
            });
            return next;
        });
    };

    const handleDeselectAllRoleUsers = (usersToDeselect: UserSummary[]) => {
        setSelectedUsers((prev) => {
            const idsToRemove = new Set(usersToDeselect.map((u) => u.user_context_id));
            return prev.filter((u) => !idsToRemove.has(u.user_context_id));
        });
        setRolesByUserId((rolesPrev) => {
            const next = { ...rolesPrev };
            usersToDeselect.forEach((u) => {
                delete next[u.user_context_id];
            });
            return next;
        });
    };

    const handleRoleToggle = (userId: number) => {
        setRolesByUserId((prev) => {
            const nextRole = prev[userId] === 'ASSIGNEE' ? 'VISUALIZER' : 'ASSIGNEE';
            return {
                ...prev,
                [userId]: nextRole,
            };
        });
    };

    useEffect(() => {
        const onShow = Keyboard.addListener('keyboardDidShow', (event) => {
            setKeyboardHeight(event.endCoordinates.height);
        });
        const onHide = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });

        return () => {
            onShow.remove();
            onHide.remove();
        };
    }, []);

    // Actualizar estado cuando el modal se abre o el objetivo cambia.
    // Si se está restaurando un borrador minimizado, preservamos el contenido.
    useEffect(() => {
        if (!visible) return;

        if (isEditing && objetivo) {
            setTitulo(objetivo.titulo || '');
            setDescripcion(objetivo.descripcion || '');
            setEstado((objetivo.estado || DEFAULT_OBJETIVO_ESTADO) as (typeof ESTADOS)[number]);
            return;
        }

        if (!resumeDraft) {
            setTitulo(draftValues?.titulo ?? '');
            setDescripcion(draftValues?.descripcion ?? '');
            setEstado((draftValues?.estado ?? DEFAULT_OBJETIVO_ESTADO) as (typeof ESTADOS)[number]);
        }

        if (resumeDraft) {
            setTitulo(draftValues?.titulo ?? '');
            setDescripcion(draftValues?.descripcion ?? '');
            setEstado((draftValues?.estado ?? DEFAULT_OBJETIVO_ESTADO) as (typeof ESTADOS)[number]);
            onResumeDraftHandled?.();
        }
    }, [visible, objetivo, isEditing, resumeDraft, onResumeDraftHandled, draftValues]);

    useEffect(() => {
        if (resetDraftSignal > 0 && !isEditing) {
            setTitulo('');
            setDescripcion('');
            setEstado(DEFAULT_OBJETIVO_ESTADO);
            setSelectedUsers([]);
            setRolesByUserId({});
            setSearchQuery('');
            setActiveRole('');
        }
    }, [resetDraftSignal, isEditing]);

    useEffect(() => {
        if (isEditing) return;
        syncCreateDraft({ invitados: buildInvitadosPayload() });
    }, [selectedUsers, rolesByUserId]);

    const handleSubmit = async () => {
        if (!titulo.trim()) {
            Alert.alert('Error', 'El título es requerido');
            return;
        }

        const invitados = selectedUsers.length > 0 ? buildInvitadosPayload() : undefined;

        try {
            if (isEditing) {
                await updateMutation.mutateAsync({
                    id: objetivo.id,
                    data: { titulo, descripcion, estado, invitados },
                });
            } else {
                await createMutation.mutateAsync({
                    titulo,
                    descripcion,
                    estado,
                    invitados,
                } as CreateObjetivo);
            }

            Alert.alert('Éxito', isEditing ? 'Objetivo actualizado' : 'Objetivo creado');
            handleClose();
            onSuccess?.();
        } catch (error) {
            Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Intenta nuevamente'
            );
        }
    };

    const handleClose = () => {
        if (!isEditing) {
            setTitulo('');
            setDescripcion('');
            setEstado(DEFAULT_OBJETIVO_ESTADO);
            setSelectedUsers([]);
            setRolesByUserId({});
            setSearchQuery('');
            setActiveRole('');
        }
        onClose();
    };

    const handleMinimize = () => {
        if (isEditing || !onMinimize) return;
        onMinimize();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={isEditing ? handleClose : (onMinimize ? handleMinimize : handleClose)}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    style={styles.modalKeyboardAvoiding}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={0}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderActions}>
                                {!isEditing && (
                                    <TouchableOpacity onPress={handleMinimize} style={styles.modalIconButton} disabled={isLoading}>
                                        <Ionicons name="chevron-down" size={24} color="#6b7280" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={handleClose} style={styles.modalIconButton} disabled={isLoading}>
                                    <Ionicons name="close" size={22} color="#999" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView
                            style={styles.modalFormContent}
                            contentContainerStyle={[
                                styles.modalFormContentContainer,
                                { paddingBottom: 88 },
                            ]}
                            keyboardShouldPersistTaps={isKeyboardOpen ? 'handled' : 'never'}
                            keyboardDismissMode={isKeyboardOpen ? 'none' : (Platform.OS === 'ios' ? 'interactive' : 'on-drag')}
                            nestedScrollEnabled
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Título</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ingresa el título"
                                    value={titulo}
                                    onChangeText={(value) => {
                                        setTitulo(value);
                                        syncCreateDraft({ titulo: value });
                                    }}
                                    editable={!isLoading}
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Descripción (opcional)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Ingresa la descripción"
                                    value={descripcion}
                                    onChangeText={(value) => {
                                        setDescripcion(value);
                                        syncCreateDraft({ descripcion: value });
                                    }}
                                    editable={!isLoading}
                                    multiline
                                    numberOfLines={4}
                                    placeholderTextColor="#999"
                                    textAlignVertical="top"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Estado</Text>
                                <View style={styles.estadoButtons}>
                                    {ESTADOS.map((est) => (
                                        <TouchableOpacity
                                            key={est}
                                            style={[
                                                styles.estadoButton,
                                                estado === est && styles.estadoButtonActive,
                                            ]}
                                            onPress={() => {
                                                setEstado(est);
                                                syncCreateDraft({ estado: est });
                                            }}
                                            disabled={isLoading}
                                        >
                                            <Text
                                                style={[
                                                    styles.estadoButtonText,
                                                    estado === est && styles.estadoButtonTextActive,
                                                ]}
                                            >
                                                {est}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Compartir con</Text>
                                <UserSelector
                                    selectedUsers={selectedUsers}
                                    onSelectUsers={handleSelectUsers}
                                    users={users}
                                    roles={rolesForSelector}
                                    isLoadingUsers={isLoadingUsers}
                                    isLoadingRoles={false}
                                    onSearch={setSearchQuery}
                                    onSelectRole={handleSelectRole}
                                    showSelectedChips={false}
                                />
                            </View>

                            {selectedUsers.length > 0 && (
                                <View style={styles.invitedList}>
                                    {selectedUsers.map((selectedUser) => {
                                        const currentRole = rolesByUserId[selectedUser.user_context_id] ?? 'VISUALIZER';
                                        return (
                                            <View key={selectedUser.user_context_id} style={styles.invitedRow}>
                                                <View style={styles.invitedInfo}>
                                                    <Text style={styles.invitedName}>
                                                        {selectedUser.nombre} {selectedUser.apellido}
                                                    </Text>
                                                    <Text style={styles.invitedRoleLabel}>{currentRole}</Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.invitedRoleButton,
                                                        currentRole === 'ASSIGNEE' && styles.invitedRoleButtonActive,
                                                    ]}
                                                    onPress={() => handleRoleToggle(selectedUser.user_context_id)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.invitedRoleButtonText,
                                                            currentRole === 'ASSIGNEE' && styles.invitedRoleButtonTextActive,
                                                        ]}
                                                    >
                                                        {currentRole === 'ASSIGNEE' ? 'Assignee' : 'Visualizer'}
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.invitedRemoveButton}
                                                    onPress={() => handleToggleUser(selectedUser)}
                                                >
                                                    <Ionicons name="close" size={16} color="#9ca3af" />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            <View style={styles.section}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.label}>Archivos enlazados</Text>
                                    <TouchableOpacity style={styles.actionButton} onPress={() => { }}>
                                        <Ionicons name="add" size={16} color={Colors.light.tint} />
                                        <Text style={styles.actionButtonText}>Agregar archivos</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* TODO: renderizar lista de archivos enlazados */}
                                <View style={styles.inviteList}>
                                    {/* TODO: item de archivo con boton abrir */}
                                    <View style={styles.inviteRow}>
                                        <View>
                                            <Text style={styles.inviteName}>Archivo-ejemplo.pdf</Text>
                                            <Text style={styles.inviteMeta}>Documento</Text>
                                        </View>
                                        <View style={styles.inviteRowActions}>
                                            {/* TODO: abrir archivo */}
                                            <TouchableOpacity onPress={() => { }}>
                                                <Ionicons name="open-outline" size={20} color={Colors.light.tint} />
                                            </TouchableOpacity>
                                            {/* TODO: eliminar archivo */}
                                            <TouchableOpacity onPress={() => { }}>
                                                <Ionicons name="trash-outline" size={20} color="#9ca3af" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        <RoleUserSelectionModal
                            visible={showRoleModal}
                            onClose={() => {
                                setShowRoleModal(false);
                                setActiveRole('');
                            }}
                            roleName={activeRole}
                            roleUsers={roleUsersData ?? []}
                            selectedUsers={selectedUsers}
                            onToggleUser={handleToggleUser}
                            onSelectAll={handleSelectAllRoleUsers}
                            onDeselectAll={handleDeselectAllRoleUsers}
                        />
                    </View>

                    <View style={[styles.uploadButtonContainer]}>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            style={[styles.uploadButton, { backgroundColor: isLoading ? '#d1d5db' : Colors['light'].componentBackground }]}
                        >
                            <Ionicons name="cloud-upload" size={20} color={Colors['light'].lightTint} />
                            <ThemedText style={styles.uploadButtonText}>{'Crear'}</ThemedText>

                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}


const styles = StyleSheet.create({
    // ============================================
    // Modal
    // ============================================
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)' // Sombra de fondo
    },
    modalContainer: {
        // Quita el flex: 1, o usa un alto fijo/porcentaje
        flex: 1,
        marginTop: '5%', // Empuja el modal hacia abajo
        backgroundColor: Colors['light'].componentBackground,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
    },
    modalKeyboardAvoiding: {
        flex: 1,
        width: '100%',
    },
    modalHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomColor: Colors['light'].icon,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    modalHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },
    modalIconButton: {
        padding: 6,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        marginLeft: 8,
    },
    modalFormContent: {
        flex: 1,
    },
    modalFormContentContainer: {
        padding: 16,
    },
    uploadButtonContainer: {
        backgroundColor: Colors['light'].componentBackground,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Colors['light'].icon,
        paddingHorizontal: '4%',
        paddingTop: 10,
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
        color: Colors['light'].lightTint,
        fontWeight: '600',
        fontSize: 16,
    },
    // ============================================
    // Forms
    // ============================================
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    textArea: {
        height: 100,
        paddingTop: 10,
    },
    estadoButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    estadoButton: {
        flex: 1,
        minWidth: '30%',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    estadoButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    estadoButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    estadoButtonTextActive: {
        color: '#fff',
    },

    invitedList: {
        gap: 12,
        marginBottom: 16,
    },
    invitedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
        gap: 8,
    },
    invitedInfo: {
        flex: 1,
        gap: 4,
    },
    invitedName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    invitedRoleLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6b7280',
        letterSpacing: 0.3,
    },
    invitedRoleButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#fff',
        alignSelf: 'flex-start',
    },
    invitedRoleButtonActive: {
        borderColor: Colors.light.tint,
        backgroundColor: Colors.light.tint + '12',
    },
    invitedRoleButtonText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6b7280',
    },
    invitedRoleButtonTextActive: {
        color: Colors.light.tint,
    },
    invitedRemoveButton: {
        padding: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    inviteList: {
        gap: 10,
    },
    inviteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    inviteRowActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inviteName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    inviteMeta: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: Colors.light.tint,
        backgroundColor: Colors.light.tint + '12',
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.light.tint,
    },
    section: {
        marginTop: 12,
        gap: 10,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6b7280',
        textTransform: 'uppercase',
        marginBottom: 6,
        letterSpacing: 0.4,
    },
});