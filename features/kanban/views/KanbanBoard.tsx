/**
 * Componente Kanban avanzado con modales para crear, editar y ver detalles
 * Incluye gestión completa: crear, mover con observación, ver bitácora y eliminar
*/

import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { AppFab } from '@/shared/ui/AppFab';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
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
import {
    useCreateObjetivo,
    useDeleteObjetivo,
    useObjetivos,
    useUpdateObjetivo,
} from '../hooks/useObjetivos';
import type { CreateObjetivoDTO, Objetivo } from '../models/Objetivo';

const ESTADOS = ['PENDIENTE', 'PRIORIDAD', 'PROGRESO', 'REALIZADO'] as const;
const DEFAULT_OBJETIVO_ESTADO = 'PENDIENTE' as const;

interface ObjetivoCreateDraft {
    titulo: string;
    descripcion: string;
    estado: (typeof ESTADOS)[number];
}

interface MoveDraft {
    nuevoEstado: string;
    observacion: string;
}

const DEFAULT_CREATE_DRAFT: ObjetivoCreateDraft = {
    titulo: '',
    descripcion: '',
    estado: DEFAULT_OBJETIVO_ESTADO,
};

const DEFAULT_MOVE_DRAFT: MoveDraft = {
    nuevoEstado: '',
    observacion: '',
};

// ============================================
// Modal para crear/editar objetivo
// ============================================

interface FormObjetivoModalProps {
    visible: boolean;
    objetivo?: Objetivo;
    onClose: () => void;
    onMinimize?: () => void;
    onSuccess?: () => void;
    draftValues?: ObjetivoCreateDraft;
    onDraftChange?: (draft: ObjetivoCreateDraft) => void;
    resumeDraft?: boolean;
    onResumeDraftHandled?: () => void;
    resetDraftSignal?: number;
}

function FormObjetivoModal({
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
    const [titulo, setTitulo] = useState(objetivo?.titulo || '');
    const [descripcion, setDescripcion] = useState(objetivo?.descripcion || '');
    const [estado, setEstado] = useState<(typeof ESTADOS)[number]>(objetivo?.estado || DEFAULT_OBJETIVO_ESTADO);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const createMutation = useCreateObjetivo();
    const updateMutation = useUpdateObjetivo();

    const isEditing = !!objetivo;
    const isLoading = createMutation.isPending || updateMutation.isPending;
    const isKeyboardOpen = keyboardHeight > 0;

    const syncCreateDraft = (partial: Partial<ObjetivoCreateDraft>) => {
        if (isEditing || !onDraftChange) return;
        onDraftChange({
            titulo,
            descripcion,
            estado,
            ...partial,
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
        }
    }, [resetDraftSignal, isEditing]);

    const handleSubmit = async () => {
        if (!titulo.trim()) {
            Alert.alert('Error', 'El título es requerido');
            return;
        }

        try {
            if (isEditing) {
                await updateMutation.mutateAsync({
                    id: objetivo.id,
                    data: { titulo, descripcion, estado },
                });
            } else {
                await createMutation.mutateAsync({
                    titulo,
                    descripcion,
                    estado,
                } as CreateObjetivoDTO);
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
            transparent={false}
            onRequestClose={isEditing ? handleClose : (onMinimize ? handleMinimize : handleClose)}
        >
            <KeyboardAvoidingView
                style={styles.modalKeyboardAvoiding}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {isEditing ? 'Editar Objetivo' : 'Crear Objetivo'}
                        </Text>
                        <View style={styles.modalHeaderActions}>
                            {!isEditing && (
                                <TouchableOpacity onPress={handleMinimize} style={styles.modalIconButton} disabled={isLoading}>
                                    <Ionicons name="chevron-down" size={24} color="#999" />
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
                            { paddingBottom: 88 + keyboardHeight },
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
                    </ScrollView>

                    <AppFab
                        icon="checkmark"
                        floating={false}
                        onPress={handleSubmit}
                        disabled={isLoading || !titulo.trim()}
                        isLoading={isLoading}
                        style={styles.modalSubmitFab}
                    />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ============================================
// Modal para ver detalles y bitácora
// ============================================

interface DetailModalProps {
    visible: boolean;
    objetivo?: Objetivo;
    onClose: () => void;
    onEdit?: (objetivo: Objetivo) => void;
    onMove?: (objetivo: Objetivo) => void;
    onDelete?: (id: number) => void;
    currentUserId?: number;
    canManage?: boolean;
}

function DetailModal({ visible, objetivo, onClose, onEdit, onMove, onDelete, currentUserId, canManage = true }: DetailModalProps) {
    if (!objetivo) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Detalles</Text>
                    <View style={{ width: 30 }} />
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                    {/* Información del objetivo */}
                    <View style={styles.detailSection}>
                        <Text style={styles.detailTitle}>{objetivo.titulo}</Text>
                        <View style={styles.detailMeta}>
                            <View style={[styles.estatoBadge, { backgroundColor: getStateColor(objetivo.estado) }]}>
                                <Text style={styles.estatoText}>{objetivo.estado}</Text>
                            </View>
                            {objetivo.created_by_username && (
                                <Text style={styles.detailMetaText}>
                                    Creado por: {objetivo.created_by_username}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Descripción */}
                    {objetivo.descripcion && (
                        <View style={styles.detailSection}>
                            <Text style={styles.sectionTitle}>Descripción</Text>
                            <Text style={styles.description}>{objetivo.descripcion}</Text>
                        </View>
                    )}

                    {/* Bitácora */}
                    {objetivo.bitacora && objetivo.bitacora.length > 0 && (
                        <View style={styles.detailSection}>
                            <Text style={styles.sectionTitle}>
                                Historial de Cambios ({objetivo.bitacora.length})
                            </Text>
                            <View style={styles.bitacoraList}>
                                {objetivo.bitacora.map((entry, idx) => (
                                    <View key={idx} style={styles.bitacoraItem}>
                                        <View style={styles.bitacoraHeader}>
                                            <Text style={styles.bitacoraUser}>
                                                {entry.usuario_nombre}
                                            </Text>
                                            <Text style={styles.bitacoraDate}>
                                                {new Date(entry.created_at).toLocaleDateString('es-ES', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </Text>
                                        </View>
                                        <View style={styles.bitacoraChange}>
                                            <Text style={styles.estadoAnterior}>
                                                {entry.estado_anterior}
                                            </Text>
                                            <Text style={styles.arrow}>→</Text>
                                            <Text style={styles.estadoNuevo}>
                                                {entry.estado_nuevo}
                                            </Text>
                                        </View>
                                        {entry.observacion && (
                                            <Text style={styles.bitacoraObservacion}>
                                                📝 {entry.observacion}
                                            </Text>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Botones de acción */}
                {canManage ? (
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.buttonDanger,
                                currentUserId !== objetivo.created_by && styles.buttonDisabled,
                            ]}
                            onPress={() => {
                                Alert.alert(
                                    'Eliminar',
                                    '¿Estás seguro de que deseas eliminar este objetivo?',
                                    [
                                        { text: 'Cancelar', style: 'cancel' },
                                        {
                                            text: 'Eliminar',
                                            style: 'destructive',
                                            onPress: () => {
                                                onDelete?.(objetivo.id);
                                                onClose();
                                            },
                                        },
                                    ]
                                );
                            }}
                            disabled={currentUserId !== objetivo.created_by}
                        >
                            <Text style={[styles.buttonDangerText, currentUserId !== objetivo.created_by && styles.buttonDisabledText]}>
                                Eliminar
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.buttonSecondary]}
                            onPress={() => {
                                onEdit?.(objetivo);
                                onClose();
                            }}
                        >
                            <Text style={styles.buttonSecondaryText}>Editar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.buttonPrimary]}
                            onPress={() => {
                                onMove?.(objetivo);
                                onClose();
                            }}
                        >
                            <Text style={styles.buttonPrimaryText}>➜ Mover</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonSecondary]}
                            onPress={onClose}
                        >
                            <Text style={styles.buttonSecondaryText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
}

// ============================================
// Modal para mover objetivo con observación
// ============================================

interface MoveModalProps {
    visible: boolean;
    objetivo?: Objetivo;
    onClose: () => void;
    onMinimize?: () => void;
    onMove: (objetivoId: number, nuevoEstado: string, observacion: string) => void;
    isLoading?: boolean;
    draftValues?: MoveDraft;
    onDraftChange?: (draft: MoveDraft) => void;
    resumeDraft?: boolean;
    onResumeDraftHandled?: () => void;
    resetDraftSignal?: number;
}

function MoveModal({
    visible,
    objetivo,
    onClose,
    onMinimize,
    onMove,
    isLoading,
    draftValues,
    onDraftChange,
    resumeDraft = false,
    onResumeDraftHandled,
    resetDraftSignal = 0,
}: MoveModalProps) {
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [observacion, setObservacion] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const isKeyboardOpen = keyboardHeight > 0;

    const syncMoveDraft = (partial: Partial<MoveDraft>) => {
        if (!onDraftChange) return;
        onDraftChange({
            nuevoEstado,
            observacion,
            ...partial,
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

    useEffect(() => {
        if (!visible) return;
        if (!resumeDraft) {
            setNuevoEstado(draftValues?.nuevoEstado ?? '');
            setObservacion(draftValues?.observacion ?? '');
        } else {
            setNuevoEstado(draftValues?.nuevoEstado ?? '');
            setObservacion(draftValues?.observacion ?? '');
            onResumeDraftHandled?.();
        }
    }, [visible, resumeDraft, onResumeDraftHandled, draftValues]);

    useEffect(() => {
        if (resetDraftSignal > 0) {
            setNuevoEstado('');
            setObservacion('');
        }
    }, [resetDraftSignal]);

    if (!objetivo) return null;

    const handleMove = () => {
        if (!nuevoEstado) {
            Alert.alert('Error', 'Debes seleccionar un estado');
            return;
        }

        onMove(objetivo.id, nuevoEstado, observacion);
        setNuevoEstado('');
        setObservacion('');
    };

    const handleClose = () => {
        setNuevoEstado('');
        setObservacion('');
        onClose();
    };

    const handleMinimize = () => {
        if (!onMinimize) return;
        onMinimize();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onMinimize ? handleMinimize : handleClose}
        >
            <KeyboardAvoidingView
                style={styles.modalKeyboardAvoiding}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Mover Objetivo</Text>
                    <View style={styles.modalHeaderActions}>
                        <TouchableOpacity onPress={handleMinimize} style={styles.modalIconButton} disabled={isLoading}>
                            <Ionicons name="chevron-down" size={24} color="#999" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleClose} style={styles.modalIconButton} disabled={isLoading}>
                            <Ionicons name="close" size={22} color="#999" />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView
                    style={styles.modalFormContent}
                    contentContainerStyle={[
                        styles.modalFormContentContainer,
                        { paddingBottom: 88 + keyboardHeight },
                    ]}
                    keyboardShouldPersistTaps={isKeyboardOpen ? 'handled' : 'never'}
                    keyboardDismissMode={isKeyboardOpen ? 'none' : (Platform.OS === 'ios' ? 'interactive' : 'on-drag')}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Objetivo Actual</Text>
                        <View style={styles.objetivoInfo}>
                            <Text style={styles.infoTitle}>{objetivo.titulo}</Text>
                            <Text style={styles.infoEstado}>Estado actual: {objetivo.estado}</Text>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Mover a</Text>
                        <View style={styles.estadoButtons}>
                            {ESTADOS.filter((e) => e !== objetivo.estado).map((est) => (
                                <TouchableOpacity
                                    key={est}
                                    style={[
                                        styles.estadoButton,
                                        nuevoEstado === est && styles.estadoButtonActive,
                                    ]}
                                    onPress={() => {
                                        setNuevoEstado(est);
                                        syncMoveDraft({ nuevoEstado: est });
                                    }}
                                    disabled={isLoading}
                                >
                                    <Text
                                        style={[
                                            styles.estadoButtonText,
                                            nuevoEstado === est && styles.estadoButtonTextActive,
                                        ]}
                                    >
                                        {est}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Observación (opcional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Añade una nota sobre este cambio"
                            value={observacion}
                            onChangeText={(value) => {
                                setObservacion(value);
                                syncMoveDraft({ observacion: value });
                            }}
                            editable={!isLoading}
                            multiline
                            numberOfLines={3}
                            placeholderTextColor="#999"
                            textAlignVertical="top"
                        />
                    </View>
                </ScrollView>

                <AppFab
                    icon="checkmark"
                    floating={false}
                    onPress={handleMove}
                    disabled={!!isLoading || !nuevoEstado}
                    isLoading={!!isLoading}
                    style={styles.modalSubmitFab}
                />
            </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ============================================
// Componente Item
// ============================================

interface ObjetivoItemProps {
    objetivo: Objetivo;
    onPress: (objetivo: Objetivo) => void;
    onMove: (objetivo: Objetivo) => void;
    isOptimisticLoading?: boolean;
    canManage?: boolean;
}

function ObjetivoItem({ objetivo, onPress, onMove, isOptimisticLoading, canManage = true }: ObjetivoItemProps) {
    return (
        <View style={[styles.card, isOptimisticLoading && styles.cardOptimistic]}>
            {isOptimisticLoading && (
                <View style={styles.cardLoadingOverlay}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.loadingText}>Actualizando...</Text>
                </View>
            )}
            <TouchableOpacity 
                onPress={() => onPress(objetivo)} 
                activeOpacity={0.7}
                disabled={isOptimisticLoading}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                        {objetivo.titulo}
                    </Text>
                    <Text style={styles.cardMeta}>{objetivo.estado}</Text>
                </View>
                <Text style={styles.cardDescription} numberOfLines={2}>
                    {objetivo.descripcion}
                </Text>
            </TouchableOpacity>

            <View style={styles.cardActions}>
                {canManage && (
                    <TouchableOpacity
                        style={styles.cardActionButton}
                        onPress={() => onMove(objetivo)}
                        disabled={isOptimisticLoading}
                    >
                        <Text style={styles.cardActionButtonText}>➜ Mover</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.cardActionButton, styles.cardActionInfo]}
                    onPress={() => onPress(objetivo)}
                    disabled={isOptimisticLoading}
                >
                    <Text style={styles.cardActionButtonText}>ℹ️ Ver</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ============================================
// Componente Columna
// ============================================

interface ColumnProps {
    estado: string;
    objetivos: Objetivo[];
    onObjetivoPress: (objetivo: Objetivo) => void;
    onMovePress: (objetivo: Objetivo) => void;
    optimisticObjetivoId?: number | null;
    canManage?: boolean;
}

function KanbanColumn({ estado, objetivos, onObjetivoPress, onMovePress, optimisticObjetivoId, canManage = true }: ColumnProps) {
    return (
        <View style={[styles.column, { backgroundColor: getColumnColor(estado) }]}>
            <View style={styles.columnHeader}>
                <Text style={styles.columnTitle}>{estado}</Text>
                <View style={styles.columnBadge}>
                    <Text style={styles.columnBadgeText}>{objetivos.length}</Text>
                </View>
            </View>

            <ScrollView
                style={styles.columnContent}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={false}
            >
                {objetivos.length === 0 ? (
                    <View style={styles.emptyColumn}>
                        <Text style={styles.emptyColumnText}>Sin objetivos</Text>
                    </View>
                ) : (
                    <View style={styles.cardsList}>
                        {objetivos.map((objetivo) => (
                            <ObjetivoItem
                                key={objetivo.id}
                                objetivo={objetivo}
                                onPress={onObjetivoPress}
                                onMove={onMovePress}
                                isOptimisticLoading={optimisticObjetivoId === objetivo.id}
                                canManage={canManage}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

// ============================================
// Componente Principal
// ============================================

export function KanbanBoard() {
    const { user } = useAuth();
    const { hasRole } = useRoleCheck();
    const isConsejo = hasRole('consejo');
    const canManage = !isConsejo;
    const { data: objetivos = [], isLoading, error } = useObjetivos();
    const updateMutation = useUpdateObjetivo();
    const deleteMutation = useDeleteObjetivo();

    // Estados de modales
    const [formModalVisible, setFormModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [moveModalVisible, setMoveModalVisible] = useState(false);
    const [formModalMinimized, setFormModalMinimized] = useState(false);
    const [resumeCreateDraft, setResumeCreateDraft] = useState(false);
    const [resetCreateDraftSignal, setResetCreateDraftSignal] = useState(0);
    const [moveModalMinimized, setMoveModalMinimized] = useState(false);
    const [resumeMoveDraft, setResumeMoveDraft] = useState(false);
    const [resetMoveDraftSignal, setResetMoveDraftSignal] = useState(0);
    const [createDraft, setCreateDraft] = useState<ObjetivoCreateDraft>(DEFAULT_CREATE_DRAFT);
    const [moveDraft, setMoveDraft] = useState<MoveDraft>(DEFAULT_MOVE_DRAFT);

    const [selectedObjetivo, setSelectedObjetivo] = useState<Objetivo | undefined>();
    const [editingObjetivo, setEditingObjetivo] = useState<Objetivo | undefined>();
    
    // Estado para tracking de operaciones optimistas
    const [optimisticObjetivoId, setOptimisticObjetivoId] = useState<number | null>(null);

    // Agrupar objetivos por estado
    const objetivosPorEstado = useMemo(() => {
        return ESTADOS.reduce(
            (acc, estado) => {
                acc[estado] = objetivos.filter((obj) => obj.estado === estado);
                return acc;
            },
            {} as Record<string, Objetivo[]>
        );
    }, [objetivos]);

    const handleShowDetail = useCallback((objetivo: Objetivo) => {
        setSelectedObjetivo(objetivo);
        setDetailModalVisible(true);
    }, []);

    const handleOpenCreate = useCallback(() => {
        if (!canManage) return;
        setEditingObjetivo(undefined);
        if (!formModalMinimized) {
            setCreateDraft(DEFAULT_CREATE_DRAFT);
        }
        setResumeCreateDraft(false);
        setFormModalMinimized(false);
        setFormModalVisible(true);
    }, [canManage, formModalMinimized]);

    const handleRestoreCreateDraft = useCallback(() => {
        if (!canManage) return;
        setResumeCreateDraft(true);
        setFormModalMinimized(false);
        setFormModalVisible(true);
    }, [canManage]);

    const handleMinimizeCreateDraft = useCallback(() => {
        setFormModalVisible(false);
        setFormModalMinimized(true);
        setResumeCreateDraft(true);
    }, []);

    const handleDiscardCreateDraft = useCallback(() => {
        setFormModalVisible(false);
        setFormModalMinimized(false);
        setResumeCreateDraft(false);
        setEditingObjetivo(undefined);
        setCreateDraft(DEFAULT_CREATE_DRAFT);
        setResetCreateDraftSignal((prev) => prev + 1);
    }, []);

    const handleCloseFormModal = useCallback(() => {
        setFormModalVisible(false);
        setFormModalMinimized(false);
        setResumeCreateDraft(false);
        setEditingObjetivo(undefined);
        setCreateDraft(DEFAULT_CREATE_DRAFT);
        setResetCreateDraftSignal((prev) => prev + 1);
    }, []);

    const handleOpenEdit = useCallback((objetivo: Objetivo) => {
        if (!canManage) return;
        setEditingObjetivo(objetivo);
        setResumeCreateDraft(false);
        setFormModalMinimized(false);
        setFormModalVisible(true);
        setDetailModalVisible(false);
    }, [canManage]);

    const handleMinimizeMoveDraft = useCallback(() => {
        setMoveModalVisible(false);
        setMoveModalMinimized(true);
        setResumeMoveDraft(true);
    }, []);

    const handleRestoreMoveDraft = useCallback(() => {
        if (!canManage) return;
        setMoveModalMinimized(false);
        setResumeMoveDraft(true);
        setMoveModalVisible(true);
    }, [canManage]);

    const handleCloseMoveModal = useCallback(() => {
        setMoveModalVisible(false);
        setMoveModalMinimized(false);
        setResumeMoveDraft(false);
        setMoveDraft(DEFAULT_MOVE_DRAFT);
        setResetMoveDraftSignal((prev) => prev + 1);
    }, []);

    const handleDiscardMoveDraft = useCallback(() => {
        setMoveModalVisible(false);
        setMoveModalMinimized(false);
        setResumeMoveDraft(false);
        setMoveDraft(DEFAULT_MOVE_DRAFT);
        setResetMoveDraftSignal((prev) => prev + 1);
    }, []);

    const handleOpenMove = useCallback((objetivo: Objetivo) => {
        if (!canManage) return;
        setSelectedObjetivo(objetivo);
        if (!moveModalMinimized) {
            setMoveDraft(DEFAULT_MOVE_DRAFT);
        }
        setMoveModalMinimized(false);
        setResumeMoveDraft(false);
        setMoveModalVisible(true);
        setDetailModalVisible(false);
    }, [canManage, moveModalMinimized]);

    const handleMoveObjetivo = useCallback(
        async (objetivoId: number, nuevoEstado: string, observacion: string) => {
            if (!canManage) {
                setMoveModalVisible(false);
                return;
            }

            try {
                // Mostrar estado optimista visual
                setOptimisticObjetivoId(objetivoId);
                
                // Actualizar el estado del objetivo con observación en la bitácora
                await updateMutation.mutateAsync({
                    id: objetivoId,
                    data: {
                        estado: nuevoEstado as 'PENDIENTE' |'PRIORIDAD' | 'PROGRESO' | 'REALIZADO',
                        observacion: observacion,
                    },
                });

                // Éxito - limpiar estado optimista
                setOptimisticObjetivoId(null);
                handleCloseMoveModal();
            } catch (err) {
                // Error - limpiar estado optimista (el cache ya revirtió automáticamente)
                setOptimisticObjetivoId(null);
                Alert.alert(
                    'Error',
                    err instanceof Error ? err.message : 'Intenta nuevamente'
                );
                handleCloseMoveModal();
            }
        },
        [canManage, updateMutation, handleCloseMoveModal]
    );

    const handleDeleteObjetivo = useCallback(
        async (objetivoId: number) => {
            if (!canManage) return;

            try {
                await deleteMutation.mutateAsync(objetivoId);
                Alert.alert('Éxito', 'Objetivo eliminado correctamente');
                setDetailModalVisible(false);
            } catch (err) {
                Alert.alert('Error', err instanceof Error ? err.message : 'Intenta nuevamente');
            }
        },
        [canManage, deleteMutation]
    );

    if (isLoading) {
        return (
            <ScreenSkeleton rows={6} />
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorSubtext}>
                    {error instanceof Error ? error.message : 'Intenta nuevamente'}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Tablero de Actividades</Text>
                    <Text style={styles.headerSubtitle}>
                        Total: {objetivos.length} objetivo{objetivos.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                {canManage && (
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={handleOpenCreate}
                        disabled={formModalVisible}
                    >
                        <Text style={styles.createButtonText}>+ Crear</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={styles.boardScroll}
                horizontal
                showsHorizontalScrollIndicator={Platform.OS === 'web'}
                scrollEventThrottle={16}
            >
                <View style={styles.board}>
                    {ESTADOS.map((estado) => (
                        <KanbanColumn
                            key={estado}
                            estado={estado}
                            objetivos={objetivosPorEstado[estado]}
                            onObjetivoPress={handleShowDetail}
                            onMovePress={handleOpenMove}
                            optimisticObjetivoId={optimisticObjetivoId}
                            canManage={canManage}
                        />
                    ))}
                </View>
            </ScrollView>

            {canManage && formModalMinimized && (
                <View style={styles.minimizedDraftContainer}>
                    <TouchableOpacity style={styles.minimizedDraftMain} onPress={handleRestoreCreateDraft}>
                        <Ionicons name="chevron-up" size={18} color={Colors.light.tint} />
                        <Text style={styles.minimizedDraftText}>
                            {editingObjetivo ? 'Edicion de objetivo' : 'Borrador de objetivo'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.minimizedDraftClose} onPress={handleDiscardCreateDraft}>
                        <Ionicons name="close" size={16} color="#999" />
                    </TouchableOpacity>
                </View>
            )}

            {canManage && moveModalMinimized && (
                <View style={styles.minimizedDraftContainer}>
                    <TouchableOpacity style={styles.minimizedDraftMain} onPress={handleRestoreMoveDraft}>
                        <Ionicons name="chevron-up" size={18} color={Colors.light.tint} />
                        <Text style={styles.minimizedDraftText}>Borrador de movimiento</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.minimizedDraftClose} onPress={handleDiscardMoveDraft}>
                        <Ionicons name="close" size={16} color="#999" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Modales */}
            <FormObjetivoModal
                visible={formModalVisible}
                objetivo={editingObjetivo}
                onClose={handleCloseFormModal}
                onMinimize={!editingObjetivo ? handleMinimizeCreateDraft : undefined}
                draftValues={!editingObjetivo ? createDraft : undefined}
                onDraftChange={!editingObjetivo ? setCreateDraft : undefined}
                resumeDraft={resumeCreateDraft}
                onResumeDraftHandled={() => setResumeCreateDraft(false)}
                resetDraftSignal={resetCreateDraftSignal}
                onSuccess={() => {
                    setFormModalVisible(false);
                    setEditingObjetivo(undefined);
                    setFormModalMinimized(false);
                    setResumeCreateDraft(false);
                    setCreateDraft(DEFAULT_CREATE_DRAFT);
                }}
            />

            <DetailModal
                visible={detailModalVisible}
                objetivo={selectedObjetivo}
                onClose={() => setDetailModalVisible(false)}
                onEdit={handleOpenEdit}
                onMove={handleOpenMove}
                onDelete={handleDeleteObjetivo}
                currentUserId={user?.user_context_id}
                canManage={canManage}
            />

            <MoveModal
                visible={moveModalVisible}
                objetivo={selectedObjetivo}
                onClose={handleCloseMoveModal}
                onMinimize={handleMinimizeMoveDraft}
                onMove={handleMoveObjetivo}
                isLoading={updateMutation.isPending}
                draftValues={moveDraft}
                onDraftChange={setMoveDraft}
                resumeDraft={resumeMoveDraft}
                onResumeDraftHandled={() => setResumeMoveDraft(false)}
                resetDraftSignal={resetMoveDraftSignal}
            />

            {/* Modal operación pendiente */}
            <OperacionPendienteModal visible={updateMutation.isPending || deleteMutation.isPending} />
        </View>
    );
}

// ============================================
// Funciones auxiliares
// ============================================

function getColumnColor(estado: string): string {
    switch (estado) {
        case 'PENDIENTE':
            return '#ffecb3';
        case 'PROGRESO':
            return '#b3e5fc';
        case 'REALIZADO':
            return '#c8e6c9';
        case 'PRIORIDAD':
            return '#ffccbc';
        default:
            return '#f5f5f5';
    }
}

function getStateColor(estado: string): string {
    switch (estado) {
        case 'PENDIENTE':
            return '#ffc107';
        case 'PROGRESO':
            return '#2196f3';
        case 'REALIZADO':
            return '#4caf50';
        case 'PRIORIDAD':
            return '#ff9800';
        default:
            return '#999';
    }
}

const styles = StyleSheet.create({
    // ============================================
    // Main Container
    // ============================================
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fafafa',
    },
    loadingText: {
        marginTop: 8,
        color: '#666',
        fontSize: 14,
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    errorSubtext: {
        color: '#999',
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },

    // ============================================
    // Header
    // ============================================
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    createButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },

    // ============================================
    // Board
    // ============================================
    boardScroll: {
        flex: 1,
    },
    board: {
        flexDirection: 'row',
        padding: 12,
        gap: 12,
    },

    // ============================================
    // Column
    // ============================================
    column: {
        width: 320,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
    },
    columnHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    columnTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    columnBadge: {
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    columnBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    columnContent: {
        flex: 1,
    },
    emptyColumn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
    },
    emptyColumnText: {
        color: '#999',
        fontSize: 13,
        fontStyle: 'italic',
    },

    // ============================================
    // Card
    // ============================================
    cardsList: {
        padding: 8,
        gap: 8,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
        elevation: 2,
        gap: 8,
    },
    cardHeader: {
        gap: 4,
    },
    cardTitle: {
        fontWeight: '600',
        fontSize: 13,
        color: '#1a1a1a',
    },
    cardMeta: {
        fontSize: 10,
        color: '#999',
    },
    cardDescription: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    cardActionButton: {
        flex: 1,
        backgroundColor: '#e3f2fd',
        paddingVertical: 6,
        borderRadius: 4,
        alignItems: 'center',
    },
    cardActionInfo: {
        backgroundColor: '#f5f5f5',
    },
    cardActionButtonText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1976d2',
    },
    cardOptimistic: {
        opacity: 0.7,
    },
    cardLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        zIndex: 10,
    },

    // ============================================
    // Modal
    // ============================================
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
        paddingBottom: 16,
    },
    modalKeyboardAvoiding: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    modalHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },
    modalIconButton: {
        padding: 8,
    },
    closeButton: {
        fontSize: 24,
        fontWeight: '600',
        color: '#999',
        width: 30,
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    modalFormContent: {
        flex: 1,
    },
    modalFormContentContainer: {
        padding: 16,
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: '10%',
        paddingBottom: '20%',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        gap: 12,
    },
    modalSubmitFab: {
        alignSelf: 'flex-end',
        marginRight: 20,
        marginBottom: 20,
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

    // ============================================
    // Buttons
    // ============================================
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonPrimary: {
        backgroundColor: '#007AFF',
    },
    buttonPrimaryText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    buttonSecondary: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    buttonSecondaryText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
    },
    buttonDanger: {
        backgroundColor: Colors.light.error,
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    buttonDangerText: {
        color: Colors.light.componentBackground,
        fontWeight: '600',
        fontSize: 14,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonDisabledText: {
        opacity: 0.6,
    },

    // ============================================
    // Detail View
    // ============================================
    detailSection: {
        marginBottom: 24,
    },
    detailTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    detailMeta: {
        gap: 12,
    },
    detailMetaText: {
        fontSize: 12,
        color: '#666',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    description: {
        fontSize: 13,
        color: '#666',
        lineHeight: 20,
    },

    // ============================================
    // Bitácora
    // ============================================
    bitacoraList: {
        gap: 12,
    },
    bitacoraItem: {
        backgroundColor: '#f5f5f5',
        borderRadius: 6,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#007AFF',
    },
    bitacoraHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    bitacoraUser: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    bitacoraDate: {
        fontSize: 10,
        color: '#999',
    },
    bitacoraChange: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    estadoAnterior: {
        fontSize: 11,
        fontWeight: '600',
        color: '#d32f2f',
    },
    arrow: {
        fontSize: 12,
        color: '#999',
    },
    estadoNuevo: {
        fontSize: 11,
        fontWeight: '600',
        color: '#4caf50',
    },
    bitacoraObservacion: {
        fontSize: 11,
        color: '#666',
        fontStyle: 'italic',
    },

    // ============================================
    // Estado Badge
    // ============================================
    estatoBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    estatoText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },

    // ============================================
    // Objetivo Info
    // ============================================
    objetivoInfo: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#007AFF',
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    infoEstado: {
        fontSize: 12,
        color: '#666',
    },

    // ============================================
    // Loading Overlay
    // ============================================
    loadingOverlay: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
    },
    minimizedDraftContainer: {
        position: 'absolute',
        right: 16,
        bottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        paddingLeft: 10,
        paddingRight: 6,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    minimizedDraftMain: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 6,
    },
    minimizedDraftText: {
        marginLeft: 6,
        color: '#1a1a1a',
        fontSize: 12,
        fontWeight: '600',
    },
    minimizedDraftClose: {
        marginLeft: 6,
        padding: 4,
    },
});
