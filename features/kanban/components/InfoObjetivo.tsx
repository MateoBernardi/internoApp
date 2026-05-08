import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Archivo, ArchivoUso } from '@/features/docs/models/Archivo';
import { useUploadArchivo } from '@/features/docs/viewmodels/useArchivos';
import { ApiOperationResult } from '@/shared/types/apiStatus';
import { UserSummary } from '@/shared/users/User';
import { adminRoles, allRoles } from '@/shared/users/roles';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { UserSelector } from '../../../components/UserSelector';
import { RoleUserSelectionModal } from '../../solicitudesActividades/components/RoleUserSelectionModal';
import { useArchivoObjetivo, useEditObjetivo, useInvitadosObjetivo } from '../hooks/useObjetivos';
import type { Invitado, Objetivo } from '../models/Objetivo';

interface InfoObjetivoProps {
    visible: boolean;
    objetivo?: Objetivo;
    onClose: () => void;
}

interface PendingFile {
    name: string;
    uri: string;
    type: string;
    size?: number;
}

const ROLE_LABELS: Record<Invitado['rol'], string> = {
    ASSIGNEE: 'Assignee',
    VISUALIZER: 'Visualizer',
};

export function InfoObjetivo({ visible, objetivo, onClose }: InfoObjetivoProps) {
    const { user } = useAuth();
    const { mutateAsync: uploadArchivo } = useUploadArchivo();
    const [localObjetivo, setLocalObjetivo] = useState<Objetivo | null>(null);
    const [invitedUsers, setInvitedUsers] = useState<Invitado[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [activeRole, setActiveRole] = useState('');
    const [showSelector, setShowSelector] = useState(false);
    const [pickerRole, setPickerRole] = useState<Invitado['rol']>('VISUALIZER');
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
    const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);

    const editMutation = useEditObjetivo();
    const archivoMutation = useArchivoObjetivo();
    const invitadosMutation = useInvitadosObjetivo();

    const users = searchResults || [];
    const isLoadingUsers = isSearchingUsers || isLoadingRole;
    const isConsejo = (user?.rol_nombre ?? '').toLowerCase() === 'consejo';
    const rolesForSelector = isConsejo ? adminRoles : allRoles;

    const assignees = useMemo(
        () => invitedUsers.filter((inv) => inv.rol === 'ASSIGNEE'),
        [invitedUsers]
    );
    const visualizers = useMemo(
        () => invitedUsers.filter((inv) => inv.rol === 'VISUALIZER'),
        [invitedUsers]
    );

    useEffect(() => {
        if (!visible || !objetivo) return;
        setLocalObjetivo(objetivo);
    }, [visible, objetivo]);

    const currentObjetivo = localObjetivo ?? objetivo;
    if (!currentObjetivo) return null;

    // ─── Helpers ────────────────────────────────────────────────────────────────

    const helpers = {
        editarTitulo: (titulo: string) =>
            editMutation.mutateAsync({ id: currentObjetivo.id, field: 'titulo', data: { titulo } }),

        editarDescripcion: (descripcion: string) =>
            editMutation.mutateAsync({ id: currentObjetivo.id, field: 'descripcion', data: { descripcion } }),

        agregarArchivos: (archivosIds: number[]) =>
            archivoMutation.mutateAsync({ id: currentObjetivo.id, action: 'add', archivosIds }),

        quitarArchivo: (archivosIds: number[]) =>
            archivoMutation.mutateAsync({ id: currentObjetivo.id, action: 'remove', archivosIds }),

        agregarInvitados: (invitados: number[]) =>
            invitadosMutation.mutateAsync({ id: currentObjetivo.id, action: 'add', invitados }),

        quitarInvitado: (invitados: number[]) =>
            invitadosMutation.mutateAsync({ id: currentObjetivo.id, action: 'remove', invitados }),
    };

    // ─── Invitados ───────────────────────────────────────────────────────────────

    const getDisplayName = (userId: number) => {
        const matched = selectedUsers.find((u) => u.user_context_id === userId);
        if (matched) return `${matched.nombre} ${matched.apellido}`.trim();
        return `Usuario #${userId}`;
    };

    const persistInvitados = async (nextInvited: Invitado[]) => {
        setInvitedUsers(nextInvited);
        setSelectedUsers((prev) => {
            const byId = new Map(prev.map((u) => [u.user_context_id, u]));
            return nextInvited.map((inv) => byId.get(inv.user_id) ?? makePlaceholderUser(inv.user_id));
        });
        await helpers.agregarInvitados(nextInvited.map((inv) => inv.user_id));
    };

    const handleSelectUsers = (usersToSelect: UserSummary[]) => {
        const existingRoles = new Map(invitedUsers.map((inv) => [inv.user_id, inv.rol]));
        const nextInvited: Invitado[] = usersToSelect.map((u) => ({
            user_id: u.user_context_id,
            rol: (existingRoles.get(u.user_context_id) ?? pickerRole) as Invitado['rol'],
        }));
        setSelectedUsers(usersToSelect);
        void persistInvitados(nextInvited);
    };

    const handleToggleUser = (selectedUser: UserSummary) => {
        const exists = invitedUsers.some((inv) => inv.user_id === selectedUser.user_context_id);
        const nextInvited: Invitado[] = exists
            ? invitedUsers.filter((inv) => inv.user_id !== selectedUser.user_context_id)
            : [...invitedUsers, { user_id: selectedUser.user_context_id, rol: pickerRole }];

        if (!exists) {
            setSelectedUsers((prev) =>
                prev.some((u) => u.user_context_id === selectedUser.user_context_id)
                    ? prev
                    : [...prev, selectedUser]
            );
        }

        void persistInvitados(nextInvited);
    };

    const handleRemoveInvitado = (userId: number) => {
        const removed = invitedUsers.filter((inv) => inv.user_id === userId);
        const nextInvited = invitedUsers.filter((inv) => inv.user_id !== userId);
        setSelectedUsers((prev) => prev.filter((u) => u.user_context_id !== userId));
        setInvitedUsers(nextInvited);
        void helpers.quitarInvitado(removed.map((inv) => inv.user_id));
    };

    const handleAddInvitado = () => setShowSelector((prev) => !prev);

    const handleAssignMe = () => {
        if (!user?.user_context_id) return;
        const exists = invitedUsers.some((inv) => inv.user_id === user.user_context_id);
        const nextInvited: Invitado[] = exists
            ? invitedUsers.map((inv) =>
                inv.user_id === user.user_context_id ? { ...inv, rol: 'ASSIGNEE' } : inv
            )
            : [...invitedUsers, { user_id: user.user_context_id, rol: 'ASSIGNEE' }];

        if (!exists) {
            setSelectedUsers((prev) =>
                prev.some((u) => u.user_context_id === user.user_context_id)
                    ? prev
                    : [...prev, makePlaceholderUser(user.user_context_id)]
            );
        }

        Alert.alert('Asignarme', 'Quieres asignarte a ti mismo?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Asignar', onPress: () => void persistInvitados(nextInvited) },
        ]);
    };

    const handleSelectRole = (role: string) => {
        setActiveRole(role);
        setShowRoleModal(true);
    };

    const handleToggleInvitadoRole = (userId: number, nextRole: Invitado['rol']) => {
        const nextInvited = invitedUsers.map((inv) =>
            inv.user_id === userId ? { ...inv, rol: nextRole } : inv
        );
        void persistInvitados(nextInvited);
    };

    const handlePromoteToAssignee = (userId: number) => {
        Alert.alert('Asignar', 'Asignar a este participante?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Asignar', onPress: () => handleToggleInvitadoRole(userId, 'ASSIGNEE') },
        ]);
    };

    const handleMoveToVisualizer = (userId: number) => {
        Alert.alert('Mover', 'Mover a visualizador?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Mover', onPress: () => handleToggleInvitadoRole(userId, 'VISUALIZER') },
        ]);
    };

    // ─── Archivos ────────────────────────────────────────────────────────────────

    const isSuccess = <T,>(r: ApiOperationResult<T>): r is ApiOperationResult<T> & { data: T } =>
        r.status === 'success' && r.data !== undefined;

    const handleSeleccionarArchivo = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                multiple: true,
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) return;

            const nuevosArchivos: PendingFile[] = result.assets.map((asset) => ({
                name: asset.name,
                uri: asset.uri,
                type: asset.mimeType ?? 'application/octet-stream',
                size: asset.size,
            }));

            setPendingFiles((prev) => [...prev, ...nuevosArchivos]);
            setIsUploadingFile(true);

            try {
                const response = await uploadArchivo({
                    item: nuevosArchivos.map((file) => ({
                        archivo: { uri: file.uri, name: file.name, type: file.type, size: file.size },
                        archivoData: { nombre: file.name, tamaño: file.size, tipo: file.type, uso: ArchivoUso.TAREA },
                    })),
                });

                const resultados = response?.exitosos ?? [];
                const fallidos = response?.fallidos ?? [];
                const validos = resultados.filter(isSuccess);
                const nuevosIds = validos.map((r) => r.data.id);
                const nuevosArchivosData = validos.map((r) => r.data) as Archivo[];

                if (validos.length === 0) {
                    Alert.alert('Error de archivos', 'No se pudo subir ningun archivo.');
                } else if (fallidos.length > 0) {
                    Alert.alert('Archivos parciales', `Se subieron ${validos.length} de ${nuevosArchivos.length}`);
                }

                if (nuevosIds.length > 0) {
                    setLocalObjetivo((prev) => {
                        if (!prev) return prev;
                        return { ...prev, archivos: [...(prev.archivos ?? []), ...nuevosArchivosData] };
                    });
                    await helpers.agregarArchivos(nuevosIds);
                }
            } catch {
                Alert.alert('Error de archivos', 'No se pudieron subir los archivos.');
            } finally {
                setIsUploadingFile(false);
                setPendingFiles((prev) =>
                    prev.filter((file) => !nuevosArchivos.some((nuevo) => nuevo.uri === file.uri))
                );
            }
        } catch (err) {
            console.error('Error seleccionando documento', err);
            Alert.alert('Error', 'No se pudo seleccionar el documento. Intenta nuevamente.');
        }
    };

    const handleOpenArchivo = (url?: string) => {
        if (!url) return;
        Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el archivo'));
    };

    const handleRemoveArchivo = (archivoId: number) => {
        if (!currentObjetivo) return;
        Alert.alert('Eliminar archivo', 'Quieres quitar este archivo?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () => {
                    setLocalObjetivo((prev) => {
                        if (!prev) return prev;
                        return { ...prev, archivos: (prev.archivos ?? []).filter((a) => a.id !== archivoId) };
                    });
                    void helpers.quitarArchivo([archivoId]);
                },
            },
        ]);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="chevron-down" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.section}>
                            {isEditing ? (
                                <View style={styles.inlineEditRow}>
                                    <TextInput
                                        value={currentObjetivo.titulo}
                                        onChangeText={(text) =>
                                            setLocalObjetivo((prev) =>
                                                prev ? { ...prev, titulo: text } : prev
                                            )
                                        }
                                        style={styles.inlineInput}
                                        autoFocus
                                    />
                                    <View style={styles.inlineEditActions}>
                                        <TouchableOpacity
                                            style={styles.cancelBtn}
                                            onPress={() => {
                                                setIsEditing(false);
                                                setLocalObjetivo(objetivo ?? null);
                                            }}
                                        >
                                            <Text style={styles.cancelBtnText}>X</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.saveBtn}
                                            onPress={() => {
                                                setIsEditing(false);
                                                void helpers.editarTitulo(currentObjetivo.titulo);
                                            }}
                                        >
                                            <Text style={styles.saveBtnText}>✓</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={() => setIsEditing(true)} activeOpacity={0.6}>
                                    <View style={styles.inlineValueRow}>
                                        <Text style={currentObjetivo.descripcion ? styles.sectionValueMuted : styles.descriptionEmpty}>
                                            {currentObjetivo.descripcion || 'Sin descripcion'}
                                        </Text>
                                        <Text style={styles.editHint}>✎</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.section}>
                            {isEditing ? (
                                <View style={styles.inlineEditRow}>
                                    <TextInput
                                        value={currentObjetivo.descripcion}
                                        onChangeText={(text) =>
                                            setLocalObjetivo((prev) =>
                                                prev ? { ...prev, descripcion: text } : prev
                                            )
                                        }
                                        style={styles.inlineInput}
                                        autoFocus
                                    />
                                    <View style={styles.inlineEditActions}>
                                        <TouchableOpacity
                                            style={styles.cancelBtn}
                                            onPress={() => {
                                                setIsEditing(false);
                                                setLocalObjetivo(objetivo ?? null);
                                            }}
                                        >
                                            <Text style={styles.cancelBtnText}>X</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.saveBtn}
                                            onPress={() => {
                                                setIsEditing(false);
                                                void helpers.editarDescripcion(currentObjetivo.descripcion);
                                            }}
                                        >
                                            <Text style={styles.saveBtnText}>✓</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={() => setIsEditing(true)} activeOpacity={0.6}>
                                    <View style={styles.inlineValueRow}>
                                        <Text style={currentObjetivo.descripcion ? styles.sectionValueMuted : styles.descriptionEmpty}>
                                            {currentObjetivo.descripcion || 'Sin descripcion'}
                                        </Text>
                                        <Text style={styles.editHint}>✎</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.section}>
                            <View style={[styles.statusBadge, { backgroundColor: getStateColor(currentObjetivo.estado) }]}>
                                <Text style={styles.statusText}>{currentObjetivo.estado}</Text>
                            </View>
                        </View>

                        <View style={styles.inviteSection}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.label}>Participantes</Text>
                                <TouchableOpacity style={styles.actionButton} onPress={handleAddInvitado}>
                                    <Ionicons name="add" size={16} color={Colors.light.tint} />
                                    <Text style={styles.actionButtonText}>
                                        {showSelector ? 'Cerrar buscador' : 'Agregar participantes'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {showSelector && (
                                <View style={styles.selectorCard}>
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
                            )}
                            {visualizers.length === 0 ? (
                                <Text style={styles.sectionValueMuted}>Sin participantes</Text>
                            ) : (
                                // Acá hay que agregar el botón de togglear rol entre visualizador y assignee, y el botón de eliminar participante
                                <View style={styles.inviteList}>
                                    {visualizers.map((inv) => (
                                        <View key={inv.user_id} style={styles.inviteRow}>
                                            <View>
                                                <Text style={styles.inviteName}>{getDisplayName(inv.user_id)}</Text>
                                                <Text style={styles.inviteMeta}>{ROLE_LABELS[inv.rol]}</Text>
                                            </View>
                                            <View style={styles.inviteRowActions}>
                                                <TouchableOpacity
                                                    style={styles.roleAction}
                                                    onPress={() => handlePromoteToAssignee(inv.user_id)}
                                                >
                                                    <Text style={styles.roleActionText}>→ Assignee</Text>
                                                </TouchableOpacity>
                                                <View style={styles.roleBadge}>
                                                    <Text style={styles.roleBadgeText}>{ROLE_LABELS[inv.rol]}</Text>
                                                </View>
                                                <TouchableOpacity onPress={() => handleRemoveInvitado(inv.user_id)}>
                                                    <Ionicons name="close-circle" size={20} color="#9ca3af" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.inviteSection}>
                            <View style={styles.inviteHeaderRow}>
                                <Text style={styles.inviteTitle}>Asignados</Text>
                                <View style={styles.inviteActions}>
                                    <TouchableOpacity style={styles.inlineAction} onPress={handleAssignMe}>
                                        <Text style={styles.inlineActionText}>Asignarme a mi mismo</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {assignees.length === 0 ? (
                                <Text style={styles.sectionValueMuted}>No se ha asignado a nadie</Text>
                            ) : (
                                <View style={styles.inviteList}>
                                    {assignees.map((inv) => (
                                        <View key={inv.user_id} style={styles.inviteRow}>
                                            <View>
                                                <Text style={styles.inviteName}>{getDisplayName(inv.user_id)}</Text>
                                                <Text style={styles.inviteMeta}>{ROLE_LABELS[inv.rol]}</Text>
                                            </View>
                                            <View style={styles.inviteRowActions}>
                                                <TouchableOpacity
                                                    style={styles.roleAction}
                                                    onPress={() => handleMoveToVisualizer(inv.user_id)}
                                                >
                                                    <Text style={styles.roleActionText}>→ Visualizer</Text>
                                                </TouchableOpacity>
                                                <View style={styles.roleBadge}>
                                                    <Text style={styles.roleBadgeText}>{ROLE_LABELS[inv.rol]}</Text>
                                                </View>
                                                <TouchableOpacity onPress={() => handleRemoveInvitado(inv.user_id)}>
                                                    <Ionicons name="close-circle" size={20} color="#9ca3af" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.label}>Archivos enlazados</Text>
                                <TouchableOpacity style={styles.actionButton} onPress={handleSeleccionarArchivo}>
                                    <Ionicons name="add" size={16} color={Colors.light.tint} />
                                    <Text style={styles.actionButtonText}>
                                        {isUploadingFile ? 'Subiendo...' : 'Agregar archivos'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.inviteList}>
                                {((currentObjetivo.archivos ?? []).length === 0 && pendingFiles.length === 0) ? (
                                    <Text style={styles.sectionValueMuted}>Sin archivos enlazados</Text>
                                ) : (
                                    <>
                                        {(currentObjetivo.archivos ?? []).map((archivo) => (
                                            <View key={archivo.id} style={styles.inviteRow}>
                                                <View>
                                                    <Text style={styles.inviteName}>{archivo.nombre}</Text>
                                                    <Text style={styles.inviteMeta}>{archivo.tipo}</Text>
                                                </View>
                                                <View style={styles.inviteRowActions}>
                                                    <TouchableOpacity onPress={() => handleOpenArchivo(archivo.url)}>
                                                        <Ionicons name="open-outline" size={20} color={Colors.light.tint} />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => handleRemoveArchivo(archivo.id)}>
                                                        <Ionicons name="trash-outline" size={20} color="#9ca3af" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                        {pendingFiles.map((archivo, index) => (
                                            <View key={`${archivo.uri}-${index}`} style={styles.inviteRow}>
                                                <View>
                                                    <Text style={styles.inviteName}>{archivo.name}</Text>
                                                    <Text style={styles.inviteMeta}>Subiendo...</Text>
                                                </View>
                                                <View style={styles.inviteRowActions}>
                                                    <ActivityIndicator size="small" color={Colors.light.tint} />
                                                </View>
                                            </View>
                                        ))}
                                    </>
                                )}
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
                        onSelectAll={(usersToSelect) => handleSelectUsers(mergeUsers(selectedUsers, usersToSelect))}
                        onDeselectAll={(usersToDeselect) =>
                            handleSelectUsers(selectedUsers.filter(
                                (u) => !usersToDeselect.some((r) => r.user_context_id === u.user_context_id)
                            ))
                        }
                    />
                </View>
            </View >
        </Modal >
    );
}

function makePlaceholderUser(userId: number): UserSummary {
    return {
        user_context_id: userId,
        username: `user-${userId}`,
        nombre: 'Usuario',
        apellido: `#${userId}`,
        email: '',
        role: [],
    };
}

function mergeUsers(current: UserSummary[], incoming: UserSummary[]): UserSummary[] {
    const byId = new Map(current.map((u) => [u.user_context_id, u]));
    incoming.forEach((u) => {
        if (!byId.has(u.user_context_id)) {
            byId.set(u.user_context_id, u);
        }
    });
    return Array.from(byId.values());
}

function getStateColor(estado: string): string {
    switch (estado) {
        case 'PENDIENTE':
            return '#f59e0b';
        case 'PROGRESO':
            return '#3b82f6';
        case 'REALIZADO':
            return '#22c55e';
        case 'PRIORIDAD':
            return '#f97316';
        default:
            return '#9ca3af';
    }
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)' // Sombra de fondo
    },
    container: {
        // Quita el flex: 1, o usa un alto fijo/porcentaje
        flex: 1,
        marginTop: '5%', // Empuja el modal hacia abajo
        backgroundColor: Colors['light'].componentBackground,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomColor: Colors['light'].icon,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    closeButton: {
        padding: 6,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        marginLeft: 8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    section: {
        marginTop: 10,
        gap: 8,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6b7280',
        textTransform: 'uppercase',
        marginBottom: 6,
        letterSpacing: 0.4,
    },
    sectionValue: {
        fontSize: 16,
        color: '#111827',
        fontWeight: '600',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    sectionValueMuted: {
        fontSize: 14,
        color: '#6b7280',
    },
    descriptionEmpty: {
        fontSize: 14,
        color: '#9ca3af',
        fontStyle: 'italic',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    inlineValueRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    inlineEditRow: {
        gap: 8,
    },
    inlineInput: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        borderWidth: 1.5,
        borderColor: Colors.light.tint,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: Colors.light.tint + '10',
        letterSpacing: -0.2,
    },
    inlineInputMulti: {
        minHeight: 100,
        textAlignVertical: 'top',
        fontSize: 14,
        fontWeight: '500',
    },
    inlineEditActions: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    cancelBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#9ca3af',
    },
    saveBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.light.tint,
    },
    saveBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    editHint: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    roleToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    roleToggleButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    roleToggleButtonActive: {
        borderColor: Colors.light.tint,
        backgroundColor: Colors.light.tint + '12',
    },
    roleToggleText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
    },
    roleToggleTextActive: {
        color: Colors.light.tint,
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
    selectorCard: {
        marginTop: 12,
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
    },
    inviteSection: {
        marginTop: 12,
        gap: 8,
    },
    inviteHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    inviteActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inlineAction: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    inlineActionText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#374151',
    },
    inviteTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
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
    roleAction: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    roleActionText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#374151',
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
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: Colors.light.tint,
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
});
