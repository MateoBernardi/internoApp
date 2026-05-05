import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { UserSummary } from '@/shared/users/User';
import { adminRoles, allRoles } from '@/shared/users/roles';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UserSelector } from '../../../components/UserSelector';
import { RoleUserSelectionModal } from '../../solicitudesActividades/components/RoleUserSelectionModal';
import { useUpdateObjetivo } from '../hooks/useObjetivos';
import type { Invitado, Objetivo } from '../models/Objetivo';

interface InfoObjetivoProps {
    visible: boolean;
    objetivo?: Objetivo;
    onClose: () => void;
}

const ROLE_LABELS: Record<Invitado['rol'], string> = {
    ASSIGNEE: 'Assignee',
    VISUALIZER: 'Visualizer',
};

export function InfoObjetivo({ visible, objetivo, onClose }: InfoObjetivoProps) {
    const { user } = useAuth();
    const updateMutation = useUpdateObjetivo();
    const [invitedUsers, setInvitedUsers] = useState<Invitado[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [activeRole, setActiveRole] = useState('');
    const [showSelector, setShowSelector] = useState(false);
    const [pickerRole, setPickerRole] = useState<Invitado['rol']>('VISUALIZER');

    const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
    const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);

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
        const baseInvited = objetivo.invitados ?? [];
        setInvitedUsers(baseInvited);

        setSelectedUsers((prev) => {
            const byId = new Map(prev.map((u) => [u.user_context_id, u]));
            return baseInvited.map((inv) =>
                byId.get(inv.user_id) ?? makePlaceholderUser(inv.user_id)
            );
        });
    }, [visible, objetivo]);

    if (!objetivo) return null;

    const getDisplayName = (userId: number) => {
        const matched = selectedUsers.find((u) => u.user_context_id === userId);
        if (matched) {
            return `${matched.nombre} ${matched.apellido}`.trim();
        }
        return `Usuario #${userId}`;
    };

    const persistInvitados = async (nextInvited: Invitado[]) => {
        setInvitedUsers(nextInvited);
        setSelectedUsers((prev) => {
            const byId = new Map(prev.map((u) => [u.user_context_id, u]));
            return nextInvited.map((inv) =>
                byId.get(inv.user_id) ?? makePlaceholderUser(inv.user_id)
            );
        });

        try {
            await updateMutation.mutateAsync({
                id: objetivo.id,
                data: { invitados: nextInvited },
            });
        } catch (error) {
            Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Intenta nuevamente'
            );
        }
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
            : [
                ...invitedUsers,
                {
                    user_id: selectedUser.user_context_id,
                    rol: pickerRole,
                },
            ];

        if (!exists) {
            setSelectedUsers((prev) => {
                if (prev.some((u) => u.user_context_id === selectedUser.user_context_id)) return prev;
                return [...prev, selectedUser];
            });
        }

        void persistInvitados(nextInvited);
    };

    const handleRemoveInvitado = (userId: number) => {
        const nextInvited = invitedUsers.filter((inv) => inv.user_id !== userId);
        setSelectedUsers((prev) => prev.filter((u) => u.user_context_id !== userId));
        void persistInvitados(nextInvited);
    };

    const handleAddInvitado = () => {
        if (showSelector && pickerRole === 'VISUALIZER') {
            setShowSelector(false);
            return;
        }
        setPickerRole('VISUALIZER');
        setShowSelector(true);
    };

    const handleAssignMe = () => {
        if (!user?.user_context_id) return;
        const exists = invitedUsers.some((inv) => inv.user_id === user.user_context_id);
        if (exists) {
            const nextInvited: Invitado[] = invitedUsers.map((inv) =>
                inv.user_id === user.user_context_id
                    ? { ...inv, rol: 'ASSIGNEE' }
                    : inv
            );
            void persistInvitados(nextInvited);
            return;
        }

        const nextInvited: Invitado[] = [
            ...invitedUsers,
            { user_id: user.user_context_id, rol: 'ASSIGNEE' },
        ];
        setSelectedUsers((prev) => {
            if (prev.some((u) => u.user_context_id === user.user_context_id)) {
                return prev;
            }
            return [...prev, makePlaceholderUser(user.user_context_id)];
        });
        void persistInvitados(nextInvited);
    };

    const handleAssignOther = () => {
        if (showSelector && pickerRole === 'ASSIGNEE') {
            setShowSelector(false);
            return;
        }
        setPickerRole('ASSIGNEE');
        setShowSelector(true);
    };

    const handleSelectRole = (role: string) => {
        setActiveRole(role);
        setShowRoleModal(true);
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
                            <Text style={styles.label}>Titulo</Text>
                            <Text style={styles.sectionValue}>{objetivo.titulo}</Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.label}>Descripcion</Text>
                            <Text style={styles.sectionValueMuted}>
                                {objetivo.descripcion || 'Sin descripcion'}
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <View style={[styles.statusBadge, { backgroundColor: getStateColor(objetivo.estado) }]}>
                                <Text style={styles.statusText}>{objetivo.estado}</Text>
                            </View>
                        </View>



                        <View style={styles.inviteSection}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.label}>Participantes</Text>
                                <TouchableOpacity style={styles.actionButton} onPress={handleAddInvitado}>
                                    <Ionicons name="add" size={16} color={Colors.light.tint} />
                                    <Text style={styles.actionButtonText}>
                                        {showSelector && pickerRole === 'VISUALIZER'
                                            ? 'Cerrar buscador'
                                            : 'Agregar participantes'}
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
                                <View style={styles.inviteList}>
                                    {visualizers.map((inv) => (
                                        <View key={inv.user_id} style={styles.inviteRow}>
                                            <View>
                                                <Text style={styles.inviteName}>{getDisplayName(inv.user_id)}</Text>
                                                <Text style={styles.inviteMeta}>{ROLE_LABELS[inv.rol]}</Text>
                                            </View>
                                            <View style={styles.inviteRowActions}>
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
                        onSelectAll={(usersToSelect) => handleSelectUsers(mergeUsers(selectedUsers, usersToSelect))}
                        onDeselectAll={(usersToDeselect) =>
                            handleSelectUsers(selectedUsers.filter(
                                (u) => !usersToDeselect.some((r) => r.user_context_id === u.user_context_id)
                            ))
                        }
                    />
                </View>
            </View>
        </Modal>
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
