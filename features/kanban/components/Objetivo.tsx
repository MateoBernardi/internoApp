import { Colors } from "@/constants/theme";
import { AppBackButton } from '@/shared/ui/AppBackButton';
import { GlassButton } from '@/shared/ui/GlassButton';
import { GlassTabSelector } from '@/components/ui/GlassTabSelector';
import { FullScreenPortal } from '@/shared/ui/FullScreenPortal';
import { focusBorderStyles, glassColors, glassStyles } from '@/shared/ui/glass';
import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { useFocusBorder } from '@/shared/ui/useFocusBorder';
import { useSafeBottomInset } from '@/hooks/useSafeBottomInset';
import { useAuth } from '@/features/auth/context/AuthContext';
import { DocsList, PendingFile } from '@/features/docs/components/DocsList';
import { Archivo, ArchivoUso } from '@/features/docs/models/Archivo';
import { FilePreview, useOpenFilePreview } from '@/components/filePreview';
import { useUploadArchivo } from '@/features/docs/viewmodels/useArchivos';
import { ApiOperationResult } from '@/shared/types/apiStatus';
import { UserSummary } from '@/shared/users/User';
import { adminRoles, allRoles } from '@/shared/users/roles';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { ParticipantesBlock } from '@/features/solicitudesActividades/components/ParticipantesBlock';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from "react";
import {
    Alert,
    BackHandler,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserSelector } from '../../../components/UserSelector';
import { RoleUserSelectionModal } from '../../solicitudesActividades/components/RoleUserSelectionModal';
import {
    useArchivoObjetivo,
    useEditObjetivo,
    useInvitadosObjetivo,
    useUpdateObjetivo,
} from '../hooks/useObjetivos';
import { Bitacora, Invitado, Objetivo } from "../models/Objetivo";

interface DetailModalProps {
    visible: boolean;
    objetivo?: Objetivo;
    onClose: () => void;
    onDelete?: (id: number) => void;
    onMove?: (objetivo: Objetivo) => void;
    currentUserId?: number;
}

type ObjetivoTab = 'historial' | 'participantes' | 'archivos';

const TABS: { key: ObjetivoTab; label: string }[] = [
    { key: 'historial', label: 'Historial' },
    { key: 'participantes', label: 'Participantes' },
    { key: 'archivos', label: 'Archivos' },
];

const ROLE_LABELS: Record<Invitado['rol'], string> = {
    ASSIGNEE: 'Asignado',
    VISUALIZER: 'Participante',
};

export function DetailModal({ visible, objetivo, onClose, onDelete, onMove, currentUserId }: DetailModalProps) {
    const insets = useSafeAreaInsets();
    const bottomInset = useSafeBottomInset();
    const tituloFocus = useFocusBorder();
    const descripcionFocus = useFocusBorder();
    const commentFocus = useFocusBorder();
    const { user } = useAuth();
    const { mutateAsync: uploadArchivo } = useUploadArchivo();

    const [localObjetivo, setLocalObjetivo] = useState<Objetivo | null>(null);
    const [activeTab, setActiveTab] = useState<ObjetivoTab>('historial');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [showCommentComposer, setShowCommentComposer] = useState(false);
    const [commentText, setCommentText] = useState('');

    const [invitedUsers, setInvitedUsers] = useState<Invitado[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [activeRole, setActiveRole] = useState('');
    const [showSelector, setShowSelector] = useState(false);
    const [pickerRole, setPickerRole] = useState<Invitado['rol']>('VISUALIZER');

    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [isUploadingFile, setIsUploadingFile] = useState(false);

    const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
    const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);

    const editMutation = useEditObjetivo();
    const archivoMutation = useArchivoObjetivo();
    const invitadosMutation = useInvitadosObjetivo();
    const commentMutation = useUpdateObjetivo();
    const { previewFile, openFile, closePreview } = useOpenFilePreview();

    const users = searchResults || [];
    const isLoadingUsers = isSearchingUsers || isLoadingRole;
    const isConsejo = (user?.rol_nombre ?? '').toLowerCase() === 'consejo';
    const rolesForSelector = isConsejo ? adminRoles : allRoles;

    // Limpieza al cerrar
    useEffect(() => {
        if (visible) return;
        setLocalObjetivo(null);
        setActiveTab('historial');
        setIsEditingTitle(false);
        setIsEditingDescription(false);
        setShowCommentComposer(false);
        setCommentText('');
        setInvitedUsers([]);
        setSelectedUsers([]);
        setSearchQuery('');
        setShowSelector(false);
        setShowRoleModal(false);
        setActiveRole('');
        setPendingFiles([]);
    }, [visible]);

    // Inicialización y sincronización con cache
    useEffect(() => {
        if (!visible || !objetivo) return;
        // No pisar una edición de título/descripción en curso con un refetch en segundo plano.
        if (isEditingTitle || isEditingDescription) return;

        setLocalObjetivo(objetivo);
        setInvitedUsers(objetivo.invitados ?? []);
        setSelectedUsers(
            (objetivo.invitados ?? []).map(inv =>
                inv.invitado_nombre
                    ? {
                        user_context_id: inv.user_id,
                        username: '',
                        nombre: inv.invitado_nombre,
                        apellido: inv.invitado_apellido ?? '',
                        email: '',
                        role: [],
                    }
                    : makePlaceholderUser(inv.user_id)
            )
        );
    }, [visible, objetivo, isEditingTitle, isEditingDescription]);

    useEffect(() => {
        if (!visible) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            onClose();
            return true;
        });
        return () => sub.remove();
    }, [visible, onClose]);

    const currentObjetivo = localObjetivo ?? objetivo;
    if (!visible || !currentObjetivo) return null;

    const isOwner = currentUserId === currentObjetivo.created_by;

    // ─── Helpers ────────────────────────────────────────────────────────────────

    const helpers = {
        editarTitulo: (titulo: string) => editMutation.mutateAsync({ id: currentObjetivo.id, field: 'titulo', data: titulo }),

        editarDescripcion: (descripcion: string) => editMutation.mutateAsync({ id: currentObjetivo.id, field: 'descripcion', data: descripcion }),

        agregarArchivos: (archivosIds: number[]) =>
            archivoMutation.mutateAsync({ id: currentObjetivo.id, action: 'add', archivosIds }),

        quitarArchivo: (archivosIds: number[]) =>
            archivoMutation.mutateAsync({ id: currentObjetivo.id, action: 'remove', archivosIds }),

        sincronizarInvitados: (invitados: Invitado[]) =>
            invitadosMutation.mutateAsync({ id: currentObjetivo.id, action: 'add', invitados }),

        quitarInvitado: (invitados: Invitado[]) =>
            invitadosMutation.mutateAsync({ id: currentObjetivo.id, action: 'remove', invitados }),
    };

    // ─── Título / Descripción ───────────────────────────────────────────────────

    const handleCancelTitle = () => {
        setIsEditingTitle(false);
        setLocalObjetivo(objetivo ?? null);
    };

    const handleSaveTitle = () => {
        setIsEditingTitle(false);
        void helpers.editarTitulo(localObjetivo!.titulo);
    };

    const handleCancelDescripcion = () => {
        setIsEditingDescription(false);
        setLocalObjetivo(objetivo ?? null);
    };

    const handleSaveDescripcion = () => {
        setIsEditingDescription(false);
        void helpers.editarDescripcion(localObjetivo!.descripcion);
    };

    // ─── Comentarios (bitácora sin cambio de estado) ───────────────────────────

    const handleSubmitComment = async () => {
        const text = commentText.trim();
        if (!text) return;
        try {
            await commentMutation.mutateAsync({ id: currentObjetivo.id, data: { observacion: text } });
            setCommentText('');
            setShowCommentComposer(false);
        } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo agregar el comentario');
        }
    };

    // ─── Invitados ───────────────────────────────────────────────────────────────

    const getDisplayName = (userId: number) => {
        const inv = invitedUsers.find((i) => i.user_id === userId);
        if (inv?.invitado_nombre) return `${inv.invitado_nombre} ${inv.invitado_apellido ?? ''}`.trim();
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
        await helpers.sincronizarInvitados(nextInvited);
    };

    const handleSelectUsers = (usersToSelect: UserSummary[]) => {
        const existingRoles = new Map(invitedUsers.map((inv) => [inv.user_id, inv.rol]));

        const incomingIds = new Set(usersToSelect.map(u => u.user_context_id));
        const nextInvited: Invitado[] = [
            ...invitedUsers.filter(inv => !incomingIds.has(inv.user_id)),
            ...usersToSelect.map((u) => ({
                user_id: u.user_context_id,
                rol: (existingRoles.get(u.user_context_id) ?? pickerRole) as Invitado['rol'],
            })),
        ];

        setSelectedUsers(prev => mergeUsers(prev, usersToSelect));
        void persistInvitados(nextInvited);
    };

    const handleSelectRole = (role: string) => {
        setActiveRole(role);
        setShowRoleModal(true);
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
        } else {
            setSelectedUsers((prev) =>
                prev.filter((u) => u.user_context_id !== selectedUser.user_context_id)
            );
        }

        void persistInvitados(nextInvited);
    };

    const handleRemoveInvitado = (userId: number) => {
        const toRemove = invitedUsers.filter((inv) => inv.user_id === userId);
        const nextInvited = invitedUsers.filter((inv) => inv.user_id !== userId);

        setSelectedUsers((prev) => prev.filter((u) => u.user_context_id !== userId));
        setInvitedUsers(nextInvited);

        void helpers.quitarInvitado(toRemove);
    };

    const handleAddInvitado = () => setShowSelector((prev) => !prev);

    const handleToggleInvitadoRole = (userId: number, nextRole: Invitado['rol']) => {
        const nextInvited = invitedUsers.map((inv) =>
            inv.user_id === userId ? { ...inv, rol: nextRole } : inv
        );
        void persistInvitados(nextInvited);
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

    const handleOpenArchivo = (archivoId: number) => {
        const archivo = (currentObjetivo.archivos ?? []).find(a => a.id === archivoId);
        if (!archivo) {
            Alert.alert('Error', 'No se pudo encontrar el archivo');
            return;
        }
        void openFile(archivo);
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

    // ─── Añadir por tab ─────────────────────────────────────────────────────────

    const handleTabAddPress = () => {
        if (activeTab === 'historial') setShowCommentComposer((prev) => !prev);
        else if (activeTab === 'participantes') handleAddInvitado();
        else void handleSeleccionarArchivo();
    };

    const tabAddLabel =
        activeTab === 'historial' ? 'Añadir comentario' :
        activeTab === 'participantes' ? 'Añadir participante' :
        isUploadingFile ? 'Subiendo...' : 'Añadir archivo';

    const tabAddDisabled = activeTab === 'archivos' && isUploadingFile;

    // ─── Eliminar ───────────────────────────────────────────────────────────────

    const handleDeletePress = () => {
        Alert.alert(
            'Eliminar',
            '¿Estás seguro de que deseas eliminar este objetivo?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => { onDelete?.(currentObjetivo.id); onClose(); },
                },
            ]
        );
    };

    return (
        <FullScreenPortal>
        <View style={styles.fullScreen}>
                <View style={[styles.modalContainer, { paddingBottom: bottomInset }]}>

                    <View style={[styles.modalHeader, glassStyles.sheetHeader, { paddingTop: insets.top + 12 }]}>
                        <AppBackButton onPress={onClose} iconName="chevron-back" />
                        <TouchableOpacity
                            onPress={handleDeletePress}
                            disabled={!isOwner}
                            style={[glassStyles.buttonSecondary, styles.deleteHeaderBtn, !isOwner && styles.deleteHeaderBtnDisabled]}
                        >
                            <Ionicons name="trash-outline" size={20} color={isOwner ? glassColors.error : glassColors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ModalKeyboardView style={{ flex: 1 }}>
                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                        <View style={[glassStyles.card, styles.summaryCard]}>
                        <Text style={styles.metaAuthor}>
                            {currentObjetivo.created_by_username}
                            <Text style={styles.metaDate}>
                                {'  '}
                                {new Date(currentObjetivo.created_at).toLocaleDateString('es-ES', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                })}
                            </Text>
                        </Text>

                        {isEditingTitle ? (
                            <View style={[styles.inlineEditRow, { marginTop: 8 }]}>
                                <TextInput
                                    value={currentObjetivo.titulo}
                                    onChangeText={(text) =>
                                        setLocalObjetivo((prev) => (prev ? { ...prev, titulo: text } : prev))
                                    }
                                    style={[
                                        styles.inlineInput,
                                        focusBorderStyles.inputNoOutline,
                                        !tituloFocus.isFocused && { borderColor: 'rgba(17,24,28,0.12)' },
                                    ]}
                                    onFocus={tituloFocus.onFocus}
                                    onBlur={tituloFocus.onBlur}
                                    autoFocus
                                />
                                <View style={styles.inlineEditActions}>
                                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelTitle}>
                                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTitle}>
                                        <Text style={styles.saveBtnText}>Guardar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => setIsEditingTitle(true)} activeOpacity={0.6}>
                                <View style={styles.inlineValueRow}>
                                    <Text style={[styles.detailTitle, { marginTop: 4 }]}>
                                        {currentObjetivo.titulo || 'Sin título'}
                                    </Text>
                                    <Text style={styles.editHint}>✎</Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        <View style={[styles.estatoBadge, { backgroundColor: getStateColor(currentObjetivo.estado) }]}>
                            <Text style={styles.estatoText}>{currentObjetivo.estado}</Text>
                        </View>

                        {isEditingDescription ? (
                            <View style={[styles.inlineEditRow, { marginTop: 14 }]}>
                                <TextInput
                                    value={currentObjetivo.descripcion}
                                    onChangeText={(text) =>
                                        setLocalObjetivo((prev) => (prev ? { ...prev, descripcion: text } : prev))
                                    }
                                    style={[
                                        styles.inlineInput,
                                        styles.inlineInputMulti,
                                        focusBorderStyles.inputNoOutline,
                                        !descripcionFocus.isFocused && { borderColor: 'rgba(17,24,28,0.12)' },
                                    ]}
                                    onFocus={descripcionFocus.onFocus}
                                    onBlur={descripcionFocus.onBlur}
                                    multiline
                                    autoFocus
                                />
                                <View style={styles.inlineEditActions}>
                                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelDescripcion}>
                                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDescripcion}>
                                        <Text style={styles.saveBtnText}>Guardar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => setIsEditingDescription(true)} activeOpacity={0.6} style={{ marginTop: 14 }}>
                                <View style={styles.inlineValueRow}>
                                    <Text style={currentObjetivo.descripcion ? styles.description : styles.descriptionEmpty}>
                                        {currentObjetivo.descripcion || 'Sin descripción'}
                                    </Text>
                                    <Text style={styles.editHint}>✎</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        </View>

                        <View style={styles.tabsWrapper}>
                            <GlassTabSelector tabs={TABS} activeKey={activeTab} onChange={(key) => setActiveTab(key as ObjetivoTab)} />
                        </View>

                        <View style={styles.tabAddRow}>
                            <TouchableOpacity style={styles.actionButton} onPress={handleTabAddPress} disabled={tabAddDisabled}>
                                <Ionicons name="add" size={16} color={glassColors.link} />
                                <Text style={styles.actionButtonText}>{tabAddLabel}</Text>
                            </TouchableOpacity>
                        </View>

                        {activeTab === 'historial' && (
                            <View style={styles.tabSection}>
                                {showCommentComposer && (
                                    <View style={[styles.inlineEditRow, { marginBottom: 16 }]}>
                                        <TextInput
                                            value={commentText}
                                            onChangeText={setCommentText}
                                            placeholder="Escribí un comentario..."
                                            placeholderTextColor="#9ca3af"
                                            style={[
                                                styles.inlineInput,
                                                styles.inlineInputMulti,
                                                focusBorderStyles.inputNoOutline,
                                                !commentFocus.isFocused && { borderColor: 'rgba(17,24,28,0.12)' },
                                            ]}
                                            onFocus={commentFocus.onFocus}
                                            onBlur={commentFocus.onBlur}
                                            multiline
                                            autoFocus
                                        />
                                        <View style={styles.inlineEditActions}>
                                            <TouchableOpacity
                                                style={styles.cancelBtn}
                                                onPress={() => { setShowCommentComposer(false); setCommentText(''); }}
                                            >
                                                <Text style={styles.cancelBtnText}>Cancelar</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.saveBtn}
                                                onPress={handleSubmitComment}
                                                disabled={commentMutation.isPending}
                                            >
                                                <Text style={styles.saveBtnText}>
                                                    {commentMutation.isPending ? 'Enviando...' : 'Publicar'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {currentObjetivo.bitacora && currentObjetivo.bitacora.length > 0 ? (
                                    <View style={styles.timeline}>
                                        {currentObjetivo.bitacora.map((entry, idx) => {
                                            const isLast = idx === currentObjetivo.bitacora.length - 1;

                                            return (
                                                <View key={idx} style={styles.timelineRow}>
                                                    <View style={styles.timelineLeft}>
                                                        <View style={styles.timelineDot}>
                                                            {getEntryIcon(entry)}
                                                        </View>
                                                        {!isLast && <View style={styles.timelineLine} />}
                                                    </View>

                                                    <View style={[styles.timelineContent, isLast && { marginBottom: 0 }]}>
                                                        <View style={styles.timelineHeader}>
                                                            <Text style={styles.timelineUser}>
                                                                {entry.usuario_nombre ?? 'Sistema'}
                                                            </Text>
                                                            <Text style={styles.timelineDate}>
                                                                {new Date(entry.created_at).toLocaleDateString('es-ES', {
                                                                    day: '2-digit', month: 'short',
                                                                    hour: '2-digit', minute: '2-digit',
                                                                })}
                                                            </Text>
                                                        </View>

                                                        {entry.estado_nuevo ? (
                                                            <View style={styles.timelineChange}>
                                                                <View style={[styles.estadoBubble, {
                                                                    backgroundColor: getStateColor(entry.estado_anterior) + '22',
                                                                    borderColor: getStateColor(entry.estado_anterior) + '55',
                                                                }]}>
                                                                    <Text style={[styles.estadoBubbleText, { color: getStateColor(entry.estado_anterior) }]}>
                                                                        {entry.estado_anterior}
                                                                    </Text>
                                                                </View>
                                                                <Text style={styles.arrow}>→</Text>
                                                                <View style={[styles.estadoBubble, {
                                                                    backgroundColor: getStateColor(entry.estado_nuevo) + '22',
                                                                    borderColor: getStateColor(entry.estado_nuevo) + '55',
                                                                }]}>
                                                                    <Text style={[styles.estadoBubbleText, { color: getStateColor(entry.estado_nuevo) }]}>
                                                                        {entry.estado_nuevo}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        ) : entry.appointment ? (
                                                            <Text style={styles.assignmentText}>
                                                                {getAssignmentLabel(entry)}
                                                            </Text>
                                                        ) : null}

                                                        {entry.observacion ? (
                                                            <Text style={styles.observacionText}>{entry.observacion}</Text>
                                                        ) : null}
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : (
                                    <Text style={styles.descriptionEmpty}>Todavía no hay actividad registrada.</Text>
                                )}
                            </View>
                        )}

                        {activeTab === 'participantes' && (
                            <View style={styles.tabSection}>
                                <ParticipantesBlock
                                    participantes={invitedUsers.map(inv => ({
                                        id: inv.user_id,
                                        nombre: getDisplayName(inv.user_id),
                                    }))}
                                    onRemove={handleRemoveInvitado}
                                    canManage={true}
                                    initialExpanded
                                    extraContent={
                                        showSelector ? (
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
                                        ) : null
                                    }
                                    renderRowSub={(id) => {
                                        const inv = invitedUsers.find(i => i.user_id === id);
                                        if (!inv) return null;
                                        return (
                                            <View style={styles.roleToggleRow}>
                                                {(['ASSIGNEE', 'VISUALIZER'] as Invitado['rol'][]).map((r) => (
                                                    <TouchableOpacity
                                                        key={r}
                                                        style={[
                                                            styles.rolePill,
                                                            inv.rol === r && styles.rolePillActive,
                                                        ]}
                                                        onPress={() => {
                                                            if (inv.rol !== r) handleToggleInvitadoRole(inv.user_id, r);
                                                        }}
                                                    >
                                                        <Text style={[
                                                            styles.rolePillText,
                                                            inv.rol === r && styles.rolePillTextActive,
                                                        ]}>
                                                            {ROLE_LABELS[r]}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        );
                                    }}
                                />
                            </View>
                        )}

                        {activeTab === 'archivos' && (
                            <View style={styles.tabSection}>
                                <DocsList
                                    archivos={currentObjetivo.archivos ?? []}
                                    pendingFiles={pendingFiles}
                                    onOpen={handleOpenArchivo}
                                    onRemove={handleRemoveArchivo}
                                />
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <GlassButton
                            label="Mover objetivo"
                            onPress={() => onMove?.(currentObjetivo)}
                            icon={(color) => <Ionicons name="swap-horizontal-outline" size={18} color={color} />}
                            style={styles.footerButton}
                            textStyle={styles.footerButtonText}
                        />
                    </View>
                    </ModalKeyboardView>

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

            <FilePreview file={previewFile} onClose={closePreview} />
        </View>
        </FullScreenPortal>
    );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function getAssignmentLabel(entry: Bitacora): string {
    const actor = entry.usuario_nombre ?? 'Alguien';
    const asignee = entry.assignee_nombre ?? 'usuario desconocido';
    const esSelfAction = entry.usuario_id === entry.assignee_id;

    if (entry.appointment === 'ASSIGN') {
        return esSelfAction
            ? `${actor} se asignó a sí mismo esta tarea`
            : `${actor} le asignó esta tarea a ${asignee}`;
    }

    if (entry.appointment === 'DISCHARGE') {
        return esSelfAction
            ? `${actor} se quitó la asignación`
            : `${actor} quitó la asignación de ${asignee}`;
    }

    return '';
}

function getEntryIcon(entry: Bitacora): React.ReactNode {
    if (entry.estado_nuevo) {
        return <Ionicons name="git-commit-outline" size={11} color="#1e3a8a" />;
    }
    if (entry.appointment === 'ASSIGN') {
        return <Ionicons name="person-add-outline" size={11} color="#1e3a8a" />;
    }
    if (entry.appointment === 'DISCHARGE') {
        return <Ionicons name="person-remove-outline" size={11} color="#1e3a8a" />;
    }
    return <Ionicons name="settings-outline" size={11} color="#1e3a8a" />;
}

function getStateColor(estado: string): string {
    switch (estado) {
        case 'PENDIENTE': return '#f59e0b';
        case 'PROGRESO': return '#3b82f6';
        case 'REALIZADO': return '#22c55e';
        case 'PRIORIDAD': return '#f97316';
        default: return '#9ca3af';
    }
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    fullScreen: {
        ...StyleSheet.absoluteFill,
        ...glassStyles.sheet,
        zIndex: 1000,
    },
    modalContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    modalHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    deleteHeaderBtn: {
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 19,
        paddingHorizontal: 0,
        paddingVertical: 0,
    },
    deleteHeaderBtnDisabled: {
        opacity: 0.4,
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 18,
    },
    summaryCard: {
        padding: 16,
        marginBottom: 16,
        gap: 4,
    },
    metaAuthor: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
    },
    metaDate: {
        fontSize: 12,
        fontWeight: '400',
        color: '#9ca3af',
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
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        borderWidth: 1.5,
        borderColor: Colors.light.tint,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: Colors.light.tint + '10',
        letterSpacing: -0.3,
    },
    inlineInputMulti: {
        fontSize: 14,
        fontWeight: '400',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    inlineEditActions: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'flex-end',
    },
    saveBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: Colors.light.tint,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#6b7280',
        fontWeight: '600',
        fontSize: 14,
    },
    editHint: {
        fontSize: 14,
        color: '#d1d5db',
        marginTop: 4,
    },
    detailTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
        lineHeight: 26,
    },
    description: {
        flex: 1,
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 22,
    },
    descriptionEmpty: {
        flex: 1,
        fontSize: 14,
        color: '#d1d5db',
        fontStyle: 'italic',
    },
    estatoBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    estatoText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
    },
    tabsWrapper: {
        marginBottom: 14,
    },
    tabAddRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 14,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: glassColors.link,
    },
    tabSection: {
        gap: 10,
    },
    selectorCard: {
        ...glassStyles.card,
        marginTop: 12,
        marginBottom: 12,
        padding: 12,
    },
    roleToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rolePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(17,24,28,0.12)',
        backgroundColor: 'rgba(17,24,28,0.03)',
    },
    rolePillActive: {
        borderColor: 'rgba(26,115,232,0.5)',
        backgroundColor: 'rgba(26,115,232,0.18)',
    },
    rolePillText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6b7280',
    },
    rolePillTextActive: {
        color: glassColors.link,
    },
    timeline: {
        paddingLeft: 4,
        paddingBottom: 8,
    },
    timelineRow: {
        flexDirection: 'row',
        gap: 12,
    },
    timelineLeft: {
        alignItems: 'center',
        width: 26,
    },
    timelineDot: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(30, 58, 138, 0.12)',
        borderWidth: 1,
        borderColor: '#1e3a8a',
    },
    timelineLine: {
        backgroundColor: 'rgba(30, 58, 138, 0.12)',
        flex: 1,
        marginTop: 2,
        marginBottom: 2,
    },
    timelineContent: {
        flex: 1,
        paddingBottom: 20,
    },
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        marginTop: 3,
    },
    timelineUser: {
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
    },
    timelineDate: {
        fontSize: 11,
        color: '#9ca3af',
    },
    timelineChange: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    estadoBubble: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
    },
    estadoBubbleText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    arrow: {
        fontSize: 12,
        color: '#9ca3af',
    },
    assignmentText: {
        fontSize: 12,
        color: '#374151',
        fontWeight: '500',
        lineHeight: 18,
    },
    observacionText: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 18,
        marginTop: 2,
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(17,24,28,0.08)',
        gap: 14,
        backgroundColor: '#ffffff',
    },
    footerButton: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 15,
    },
    footerButtonText: {
        fontWeight: '500',
    },
});
