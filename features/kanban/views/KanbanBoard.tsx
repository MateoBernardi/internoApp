/**
 * Componente Kanban avanzado con modales para crear, editar y ver detalles
 * Incluye gestión completa: crear, mover con observación (o con los botones
 * de orden/mover), ver bitácora y eliminar.
*/

import { CreateButton } from '@/components/ui/CreateButton';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Breakpoints, Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useSafeBottomInset } from '@/hooks/useSafeBottomInset';
import {
    formatObjectiveDate,
    getObjectiveAssignee,
} from '../kanbanPresentation';
import {
    compareLexoRanks,
    createEvenLexoRanks,
    getLexoRankBetween,
} from '../lexoRank';
import { boxShadow } from '@/shared/ui/boxShadow';
import { glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { FormObjetivoModal } from '../components/CrearObjetivo';
import { MoveModal } from '../components/MoverObjetivo';
import { DetailModal } from '../components/Objetivo';
import {
    useDeleteObjetivo,
    useMarcarObjetivoVisto,
    useObjetivos,
    useUpdateObjetivo
} from '../hooks/useObjetivos';
import { ESTADOS, type CreateObjetivo, type Objetivo } from '../models/Objetivo';

const DEFAULT_OBJETIVO_ESTADO = 'PENDIENTE' as const;

const DEFAULT_CREATE_DRAFT: CreateObjetivo = {
    titulo: '',
    descripcion: '',
    estado: DEFAULT_OBJETIVO_ESTADO,
};

interface MoveDraft {
    nuevoEstado: string;
    observacion: string;
}

const DEFAULT_MOVE_DRAFT: MoveDraft = {
    nuevoEstado: '',
    observacion: '',
};

// ============================================
// Layout de tablero
// ============================================

const VISIBLE_ESTADOS = ESTADOS;
type VisibleEstado = typeof VISIBLE_ESTADOS[number];

const COLUMN_WIDTH = 296;
const COLUMN_GAP = 12;
const BOARD_PADDING = 12;

interface ColumnPresentation {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    accent: string;
    tint: string;
    surface: string;
    border: string;
    emptyTitle: string;
}

const COLUMN_PRESENTATION: Record<VisibleEstado, ColumnPresentation> = {
    PENDIENTE: {
        icon: 'time-outline',
        accent: '#E9A51B',
        tint: '#FFF2C9',
        surface: '#FFFCF2',
        border: '#EBCB72',
        emptyTitle: 'No hay objetivos',
    },
    PRIORIDAD: {
        icon: 'flag',
        accent: '#E5484D',
        tint: '#FDE7E8',
        surface: '#FFF7F7',
        border: '#E9A4A8',
        emptyTitle: 'No hay objetivos',
    },
    PROGRESO: {
        icon: 'stats-chart-outline',
        accent: '#25A9E0',
        tint: '#DCF3FC',
        surface: '#F6FBFE',
        border: '#9CD8EE',
        emptyTitle: 'No hay objetivos',
    },
    REALIZADO: {
        icon: 'checkmark',
        accent: '#2EAD62',
        tint: '#DDF5E7',
        surface: '#F6FCF8',
        border: '#9CD6B5',
        emptyTitle: 'No hay objetivos',
    },
};

function getColumnPresentation(estado: string): ColumnPresentation {
    return COLUMN_PRESENTATION[estado as VisibleEstado] ?? COLUMN_PRESENTATION.PENDIENTE;
}

function sortObjetivosByRank(objetivos: Objetivo[]): Objetivo[] {
    return [...objetivos].sort((left, right) => {
        const rankComparison = compareLexoRanks(left.rank_position, right.rank_position);
        if (rankComparison !== 0) return rankComparison;
        return left.id - right.id;
    });
}

function getRankAtEnd(
    objetivos: Objetivo[],
    estado: string,
    excludedObjetivoId?: number
): string {
    const destination = sortObjetivosByRank(
        objetivos.filter(
            (objetivo) =>
                objetivo.estado === estado && objetivo.id !== excludedObjetivoId
        )
    );
    const lastRank = destination.at(-1)?.rank_position;
    return (
        getLexoRankBetween(lastRank, null) ??
        (lastRank ? lastRank + 'z' : createEvenLexoRanks(1)[0])
    );
}

// ============================================
// Componente Item
// ============================================

interface ObjetivoItemProps {
    objetivo: Objetivo;
    onPress: (objetivo: Objetivo) => void;
    onMove: (objetivo: Objetivo) => void;
    onReorder: (objetivo: Objetivo, direction: 'up' | 'down') => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
    isOptimisticLoading?: boolean;
    compact?: boolean;
}

function ObjetivoItem({
    objetivo,
    onPress,
    onMove,
    onReorder,
    canMoveUp,
    canMoveDown,
    isOptimisticLoading,
    compact = false,
}: ObjetivoItemProps) {
    const assignee = getObjectiveAssignee(objetivo);
    const displayedDate = formatObjectiveDate(objetivo.updated_at || objetivo.created_at);
    const isPriority = objetivo.estado === 'PRIORIDAD';

    return (
        <View
            style={[
                styles.card,
                Platform.OS === 'web' && styles.cardWeb,
                compact && styles.cardCompact,
                isOptimisticLoading && styles.cardOptimistic,
            ]}
        >
            {isOptimisticLoading && (
                <View style={styles.cardLoadingOverlay}>
                    <ActivityIndicator size="small" color={Colors.light.lightTint} />
                    <Text style={styles.loadingText}>Actualizando...</Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.cardContent, compact && styles.cardContentCompact]}
                activeOpacity={0.7}
                disabled={isOptimisticLoading}
                onPress={() => onPress(objetivo)}
                accessibilityRole="button"
                accessibilityLabel={'Abrir objetivo ' + objetivo.titulo}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                        {objetivo.titulo}
                    </Text>
                    {!objetivo.seen && <View style={styles.unseenDot} />}
                </View>

                {Boolean(objetivo.descripcion) && (
                    <Text style={styles.cardDescription} numberOfLines={compact ? 1 : 2}>
                        {objetivo.descripcion}
                    </Text>
                )}

                <View style={styles.cardFooter}>
                    <View style={styles.cardDate}>
                        <Ionicons name="calendar-outline" size={14} color="#667085" />
                        <Text style={styles.cardDateText} numberOfLines={1}>
                            {displayedDate}
                        </Text>
                    </View>

                    {isPriority && (
                        <View style={styles.priorityBadge}>
                            <Ionicons name="flag" size={12} color="#C62828" />
                            <Text style={styles.priorityBadgeText}>Prioritario</Text>
                        </View>
                    )}

                    <View style={styles.assignee}>
                        <View style={styles.assigneeAvatar}>
                            <Text style={styles.assigneeAvatarText}>{assignee.initials}</Text>
                        </View>
                        <Text style={styles.assigneeName} numberOfLines={1}>
                            {assignee.name}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            <View style={[styles.cardActions, compact && styles.cardActionsCompact]}>
                <TouchableOpacity
                    style={styles.moveButton}
                    onPress={() => onMove(objetivo)}
                    disabled={isOptimisticLoading}
                    hitSlop={5}
                    accessibilityRole="button"
                    accessibilityLabel={'Mover ' + objetivo.titulo}
                >
                    <Ionicons name="swap-horizontal" size={15} color="#344054" />
                    <Text style={styles.moveButtonText}>Mover</Text>
                </TouchableOpacity>

                <View style={styles.orderActions}>
                    <TouchableOpacity
                        style={[styles.orderButton, !canMoveUp && styles.orderButtonDisabled]}
                        onPress={() => onReorder(objetivo, 'up')}
                        disabled={!canMoveUp || isOptimisticLoading}
                        hitSlop={5}
                        accessibilityRole="button"
                        accessibilityLabel={'Subir ' + objetivo.titulo}
                    >
                        <Ionicons name="chevron-up" size={16} color="#344054" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.orderButton, !canMoveDown && styles.orderButtonDisabled]}
                        onPress={() => onReorder(objetivo, 'down')}
                        disabled={!canMoveDown || isOptimisticLoading}
                        hitSlop={5}
                        accessibilityRole="button"
                        accessibilityLabel={'Bajar ' + objetivo.titulo}
                    >
                        <Ionicons name="chevron-down" size={16} color="#344054" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// ============================================
// Componente Columna
// ============================================

interface ColumnProps {
    estado: VisibleEstado;
    objetivos: Objetivo[];
    onObjetivoPress: (objetivo: Objetivo) => void;
    onMovePress: (objetivo: Objetivo) => void;
    onReorder: (objetivo: Objetivo, direction: 'up' | 'down') => void;
    onCreate: () => void;
    optimisticObjetivoId?: number | null;
    wide?: boolean;
    compact?: boolean;
    columnWidth?: number;
}

function KanbanColumn({
    estado,
    objetivos,
    onObjetivoPress,
    onMovePress,
    onReorder,
    onCreate,
    optimisticObjetivoId,
    wide = false,
    compact = false,
    columnWidth = COLUMN_WIDTH,
}: ColumnProps) {
    const presentation = getColumnPresentation(estado);

    return (
        <View
            style={[
                wide ? styles.columnWide : styles.column,
                !wide && { width: columnWidth },
                { borderColor: presentation.border, backgroundColor: presentation.surface },
            ]}
        >
            <View
                style={[
                    styles.columnHeader,
                    compact && styles.columnHeaderCompact,
                    { backgroundColor: presentation.surface },
                ]}
            >
                <View style={styles.columnTitleRow}>
                    <View style={[styles.columnIcon, { backgroundColor: presentation.tint }]}>
                        <Ionicons name={presentation.icon} size={17} color={presentation.accent} />
                    </View>
                    <Text style={styles.columnTitle}>{estado}</Text>
                    <View style={styles.columnBadge}>
                        <Text style={styles.columnBadgeText}>{objetivos.length}</Text>
                    </View>
                    <CreateButton onPress={onCreate} accessibilityLabel={`Nuevo objetivo en ${estado}`} />
                </View>
            </View>

            <View
                style={[
                    styles.columnTableHeader,
                    compact && styles.columnTableHeaderCompact,
                    { backgroundColor: presentation.tint },
                ]}
            >
                <Text style={styles.tableObjectiveLabel}>Objetivo</Text>
                <Text style={styles.tableResponsibleLabel}>Responsable</Text>
            </View>

            <View style={styles.columnContent}>
                <ScrollView
                    contentContainerStyle={objetivos.length === 0 ? styles.emptyScrollContent : undefined}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.cardsList, compact && styles.cardsListCompact]}>
                        {objetivos.length === 0 ? (
                            <View style={styles.emptyColumn}>
                                <View style={styles.emptyIcon}>
                                    <Ionicons
                                        name={presentation.icon}
                                        size={28}
                                        color={presentation.accent}
                                    />
                                </View>
                                <Text style={styles.emptyColumnTitle}>{presentation.emptyTitle}</Text>
                                <View style={styles.emptyAction}>
                                    <CreateButton onPress={onCreate} accessibilityLabel="Nuevo objetivo" />
                                </View>
                            </View>
                        ) : (
                            objetivos.map((objetivo, index) => (
                                <ObjetivoItem
                                    key={objetivo.id}
                                    objetivo={objetivo}
                                    onPress={onObjetivoPress}
                                    onMove={onMovePress}
                                    onReorder={onReorder}
                                    canMoveUp={index > 0}
                                    canMoveDown={index < objetivos.length - 1}
                                    isOptimisticLoading={optimisticObjetivoId === objetivo.id}
                                    compact={compact}
                                />
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

// ============================================
// Componente Principal
// ============================================

export function KanbanBoard() {
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktopWide = Platform.OS === 'web' && width >= Breakpoints.desktop;
    const isCompactHeader = width < 640;
    const compactColumnWidth = Math.min(COLUMN_WIDTH, Math.max(272, width - BOARD_PADDING * 2));
    const bottomInset = useSafeBottomInset();
    const { data: objetivos = [], isLoading, error } = useObjetivos();
    const sinVerCount = useMemo(() => objetivos.filter(o => !o.seen).length, [objetivos]);
    const updateMutation = useUpdateObjetivo();
    const deleteMutation = useDeleteObjetivo();
    const marcarVistoMutation = useMarcarObjetivoVisto();

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
    const [createDraft, setCreateDraft] = useState<CreateObjetivo>(DEFAULT_CREATE_DRAFT);
    const [moveDraft, setMoveDraft] = useState<MoveDraft>(DEFAULT_MOVE_DRAFT);

    const [selectedObjetivoId, setSelectedObjetivoId] = useState<number | undefined>();
    const selectedObjetivo = useMemo(
        () => objetivos.find(o => o.id === selectedObjetivoId),
        [objetivos, selectedObjetivoId]
    );

    const [editingObjetivoId, setEditingObjetivoId] = useState<number | undefined>();
    const editingObjetivo = useMemo(
        () => objetivos.find(o => o.id === editingObjetivoId),
        [objetivos, editingObjetivoId]
    );

    // Estado para tracking de operaciones optimistas
    const [optimisticObjetivoId, setOptimisticObjetivoId] = useState<number | null>(null);

    const objetivosPorEstado = useMemo<Record<VisibleEstado, Objetivo[]>>(
        () =>
            ESTADOS.reduce(
                (columns, estado) => {
                    columns[estado] = sortObjetivosByRank(
                        objetivos.filter((objetivo) => objetivo.estado === estado)
                    );
                    return columns;
                },
                {} as Record<VisibleEstado, Objetivo[]>
            ),
        [objetivos]
    );

    const handleShowDetail = useCallback((objetivo: Objetivo) => {
        setSelectedObjetivoId(objetivo.id);
        setDetailModalVisible(true);
        if (!objetivo.seen) {
            marcarVistoMutation.mutate(objetivo.id);
        }
    }, [marcarVistoMutation]);

    const handleOpenCreate = useCallback((estado?: VisibleEstado) => {
        if (!formModalMinimized) {
            setCreateDraft({ ...DEFAULT_CREATE_DRAFT, estado: estado ?? DEFAULT_OBJETIVO_ESTADO });
        }
        setResumeCreateDraft(false);
        setFormModalMinimized(false);
        setFormModalVisible(true);
    }, [formModalMinimized]);

    const handleRestoreCreateDraft = useCallback(() => {
        setResumeCreateDraft(true);
        setFormModalMinimized(false);
        setFormModalVisible(true);
    }, []);

    const handleMinimizeCreateDraft = useCallback(() => {
        setFormModalVisible(false);
        setFormModalMinimized(true);
        setResumeCreateDraft(true);
    }, []);

    const handleDiscardCreateDraft = useCallback(() => {
        setFormModalVisible(false);
        setFormModalMinimized(false);
        setResumeCreateDraft(false);
        setEditingObjetivoId(undefined);
        setCreateDraft(DEFAULT_CREATE_DRAFT);
        setResetCreateDraftSignal((prev) => prev + 1);
    }, []);

    const handleCloseFormModal = useCallback(() => {
        setFormModalVisible(false);
        setFormModalMinimized(false);
        setResumeCreateDraft(false);
        setEditingObjetivoId(undefined);
        setCreateDraft(DEFAULT_CREATE_DRAFT);
        setResetCreateDraftSignal((prev) => prev + 1);
    }, []);

    const handleOpenEdit = useCallback((objetivo: Objetivo) => {
        setEditingObjetivoId(objetivo.id);
        setResumeCreateDraft(false);
        setFormModalMinimized(false);
        setFormModalVisible(true);
        setDetailModalVisible(false);
    }, []);

    const handleMinimizeMoveDraft = useCallback(() => {
        setMoveModalVisible(false);
        setMoveModalMinimized(true);
        setResumeMoveDraft(true);
    }, []);

    const handleRestoreMoveDraft = useCallback(() => {
        setMoveModalMinimized(false);
        setResumeMoveDraft(true);
        setMoveModalVisible(true);
    }, []);

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
        setSelectedObjetivoId(objetivo.id);
        if (!moveModalMinimized) setMoveDraft(DEFAULT_MOVE_DRAFT);
        setMoveModalMinimized(false);
        setResumeMoveDraft(false);
        setMoveModalVisible(true);
        setDetailModalVisible(false);
    }, [moveModalMinimized]);

    const handleMoveObjetivo = useCallback(
        async (objetivoId: number, nuevoEstado: string, observacion: string) => {
            try {
                // Mostrar estado optimista visual
                setOptimisticObjetivoId(objetivoId);

                // Actualizar el estado del objetivo con observación en la bitácora
                await updateMutation.mutateAsync({
                    id: objetivoId,
                    data: {
                        estado: nuevoEstado as 'PENDIENTE' | 'PRIORIDAD' | 'PROGRESO' | 'REALIZADO',
                        rank_position: getRankAtEnd(objetivos, nuevoEstado, objetivoId),
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
        [updateMutation, handleCloseMoveModal, objetivos]
    );

    // Persiste tanto un cambio de columna como un reordenamiento interno,
    // calculando el rank_position destino según la posición objetivo.
    const commitReorder = useCallback(
        async (objetivoId: number, nuevoEstado: string, targetIndex: number) => {
            const objetivo = objetivos.find((item) => item.id === objetivoId);
            if (!objetivo) return;

            const destination = sortObjetivosByRank(
                objetivos.filter(
                    (item) => item.estado === nuevoEstado && item.id !== objetivoId
                )
            );
            const insertionIndex = Math.max(0, Math.min(targetIndex, destination.length));
            const reordered = [...destination];
            reordered.splice(insertionIndex, 0, objetivo);

            const currentColumn = sortObjetivosByRank(
                objetivos.filter((item) => item.estado === objetivo.estado)
            );
            const isSameUnchangedOrder =
                objetivo.estado === nuevoEstado &&
                currentColumn.length === reordered.length &&
                currentColumn.every((item, index) => item.id === reordered[index].id);

            if (isSameUnchangedOrder) return;

            const previousRank = reordered[insertionIndex - 1]?.rank_position;
            const nextRank = reordered[insertionIndex + 1]?.rank_position;
            const newRank = getLexoRankBetween(previousRank, nextRank);

            try {
                setOptimisticObjetivoId(objetivoId);

                if (newRank) {
                    await updateMutation.mutateAsync({
                        id: objetivoId,
                        data: {
                            estado: nuevoEstado as VisibleEstado,
                            rank_position: newRank,
                        },
                    });
                } else {
                    const balancedRanks = createEvenLexoRanks(reordered.length);
                    for (let index = 0; index < reordered.length; index += 1) {
                        const item = reordered[index];
                        const isMovedItem = item.id === objetivoId;
                        await updateMutation.mutateAsync({
                            id: item.id,
                            data: {
                                ...(isMovedItem ? { estado: nuevoEstado as VisibleEstado } : {}),
                                rank_position: balancedRanks[index],
                            },
                        });
                    }
                }
            } catch (err) {
                Alert.alert(
                    'Error',
                    err instanceof Error ? err.message : 'No se pudo mover el objetivo'
                );
            } finally {
                setOptimisticObjetivoId(null);
            }
        },
        [objetivos, updateMutation]
    );

    const handleReorderObjetivo = useCallback(
        (objetivo: Objetivo, direction: 'up' | 'down') => {
            const column = objetivosPorEstado[objetivo.estado];
            const currentIndex = column.findIndex((item) => item.id === objetivo.id);
            const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

            if (currentIndex < 0 || targetIndex < 0 || targetIndex >= column.length) return;
            void commitReorder(objetivo.id, objetivo.estado, targetIndex);
        },
        [commitReorder, objetivosPorEstado]
    );

    const handleDeleteObjetivo = useCallback(
        async (objetivoId: number) => {
            try {
                await deleteMutation.mutateAsync(objetivoId);
                Alert.alert('Éxito', 'Objetivo eliminado correctamente');
                setDetailModalVisible(false);
            } catch (err) {
                Alert.alert('Error', err instanceof Error ? err.message : 'Intenta nuevamente');
            }
        },
        [deleteMutation]
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
            <View style={[styles.header, isCompactHeader && styles.headerCompact]}>
                <View style={[styles.headerCopy, isCompactHeader && styles.headerCopyCompact]}>
                    <Text
                        style={[styles.headerTitle, isCompactHeader && styles.headerTitleCompact]}
                        numberOfLines={1}
                    >
                        Tablero de Actividades
                    </Text>
                    <View style={[styles.headerMeta, isCompactHeader && styles.headerMetaCompact]}>
                        <View style={styles.headerMetaItem}>
                            <Ionicons name="list-outline" size={15} color="#667085" />
                            <Text style={styles.headerMetaText}>
                                {objetivos.length} objetivo{objetivos.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        {sinVerCount > 0 && (
                            <View style={styles.headerMetaItem}>
                                <Ionicons name="alert-circle" size={14} color="#FF3B30" />
                                <Text style={[styles.headerMetaText, styles.headerMetaTextUnseen]}>
                                    {sinVerCount} sin ver
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {isDesktopWide ? (
                <View style={styles.boardWide}>
                    {VISIBLE_ESTADOS.map((estado) => (
                        <KanbanColumn
                            key={estado}
                            estado={estado}
                            objetivos={objetivosPorEstado[estado]}
                            onObjetivoPress={handleShowDetail}
                            onMovePress={handleOpenMove}
                            onReorder={handleReorderObjetivo}
                            onCreate={() => handleOpenCreate(estado)}
                            optimisticObjetivoId={optimisticObjetivoId}
                            wide
                        />
                    ))}
                </View>
            ) : (
                <View style={styles.boardScrollWrapper}>
                    <ScrollView
                        style={styles.boardScroll}
                        horizontal
                        showsHorizontalScrollIndicator={Platform.OS === 'web'}
                    >
                        <View style={styles.board}>
                            {VISIBLE_ESTADOS.map((estado) => (
                                <KanbanColumn
                                    key={estado}
                                    estado={estado}
                                    objetivos={objetivosPorEstado[estado]}
                                    onObjetivoPress={handleShowDetail}
                                    onMovePress={handleOpenMove}
                                    onReorder={handleReorderObjetivo}
                                    onCreate={() => handleOpenCreate(estado)}
                                    optimisticObjetivoId={optimisticObjetivoId}
                                    columnWidth={compactColumnWidth}
                                    compact={isCompactHeader}
                                />
                            ))}
                        </View>
                    </ScrollView>
                </View>
            )}

            {formModalMinimized && (
                <View style={[styles.minimizedDraftContainer, glassStyles.pill, { bottom: bottomInset + 8 }]}>
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

            {moveModalMinimized && (
                <View style={[styles.minimizedDraftContainer, glassStyles.pill, { bottom: bottomInset + 8 }]}>
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
                    setEditingObjetivoId(undefined);
                    setFormModalMinimized(false);
                    setResumeCreateDraft(false);
                    setCreateDraft(DEFAULT_CREATE_DRAFT);
                }}
            />

            <DetailModal
                visible={detailModalVisible}
                objetivo={selectedObjetivo}
                onClose={() => setDetailModalVisible(false)}
                onMove={handleOpenMove}
                onDelete={handleDeleteObjetivo}
                currentUserId={user?.user_context_id}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        marginTop: 8,
        color: '#475467',
        fontSize: 13,
    },
    errorText: {
        color: '#B42318',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    errorSubtext: {
        color: '#667085',
        fontSize: 13,
        marginTop: 8,
        textAlign: 'center',
    },

    // Header
    header: {
        minHeight: 96,
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
    },
    headerCompact: {
        minHeight: 56,
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 10,
    },
    headerCopy: {
        flexShrink: 1,
        gap: 7,
    },
    headerCopyCompact: {
        flex: 1,
        minWidth: 0,
        gap: 0,
    },
    headerTitle: {
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '700',
        color: '#101828',
    },
    headerTitleCompact: {
        fontSize: 18,
        lineHeight: 24,
    },
    headerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    headerMetaCompact: {
        display: 'none',
    },
    headerMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    headerMetaDivider: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#98A2B3',
    },
    headerMetaText: {
        color: '#667085',
        fontSize: 12,
        lineHeight: 17,
    },
    headerMetaTextUnseen: {
        color: '#FF3B30',
        fontWeight: '700',
    },
    // Board
    boardScrollWrapper: {
        flex: 1,
        minHeight: 0,
    },
    boardScroll: {
        flex: 1,
    },
    board: {
        minHeight: '100%',
        flexDirection: 'row',
        paddingHorizontal: BOARD_PADDING,
        paddingBottom: BOARD_PADDING,
        gap: COLUMN_GAP,
    },
    boardWide: {
        flex: 1,
        minHeight: 0,
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: COLUMN_GAP,
    },

    // Columns
    column: {
        borderRadius: 10,
        borderWidth: 1,
        overflow: 'hidden',
    },
    columnWide: {
        flex: 1,
        minWidth: 0,
        borderRadius: 10,
        borderWidth: 1,
        overflow: 'hidden',
    },
    columnHeader: {
        minHeight: 86,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E4E7EC',
    },
    columnHeaderCompact: {
        minHeight: 48,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    columnTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    columnIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    columnTitle: {
        flex: 1,
        color: '#172033',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    columnBadge: {
        minWidth: 24,
        height: 24,
        paddingHorizontal: 7,
        borderRadius: 12,
        backgroundColor: '#F1F3F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    columnBadgeText: {
        color: '#475467',
        fontSize: 12,
        fontWeight: '700',
    },
    columnTableHeader: {
        minHeight: 38,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#E4E7EC',
    },
    columnTableHeaderCompact: {
        minHeight: 32,
        paddingHorizontal: 12,
    },
    tableObjectiveLabel: {
        flex: 1,
        color: '#667085',
        fontSize: 10,
        fontWeight: '700',
    },
    tableResponsibleLabel: {
        width: 86,
        color: '#667085',
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'right',
    },
    columnContent: {
        flex: 1,
    },
    emptyScrollContent: {
        flexGrow: 1,
    },
    cardsList: {
        flexGrow: 1,
        padding: 10,
    },
    cardsListCompact: {
        padding: 8,
    },
    emptyColumn: {
        flex: 1,
        minHeight: 250,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 28,
    },
    emptyIcon: {
        width: 58,
        height: 58,
        borderRadius: 29,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#C8D0DA',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    emptyColumnTitle: {
        color: '#172033',
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptyAction: {
        marginTop: 18,
    },

    // Objective cards
    card: {
        minHeight: 140,
        marginBottom: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.94)',
        borderWidth: 1,
        borderColor: '#C7D0DA',
        borderRadius: 9,
        overflow: 'hidden',
        boxShadow: boxShadow({ width: 0, height: 2 }, 0.08, 6, '#101828'),
    },
    cardWeb: {
        cursor: 'pointer',
    },
    cardCompact: {
        minHeight: 0,
        marginBottom: 8,
        paddingHorizontal: 10,
        paddingVertical: 10,
        boxShadow: 'none',
    },
    cardContent: {
        gap: 7,
    },
    cardContentCompact: {
        gap: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    cardTitle: {
        flex: 1,
        color: '#172033',
        fontWeight: '700',
        fontSize: 13,
        lineHeight: 18,
    },
    unseenDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 4,
        backgroundColor: '#FF3B30',
    },
    cardDescription: {
        color: '#667085',
        fontSize: 11,
        lineHeight: 16,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 2,
    },
    cardDate: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    cardDateText: {
        color: '#667085',
        fontSize: 10,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#FEF3F2',
    },
    priorityBadgeText: {
        color: '#B42318',
        fontSize: 10,
        fontWeight: '700',
    },
    assignee: {
        marginLeft: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        maxWidth: 104,
    },
    assigneeAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#EAF1FF',
        borderWidth: 1,
        borderColor: '#C9D9FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    assigneeAvatarText: {
        color: '#174EA6',
        fontSize: 9,
        fontWeight: '700',
    },
    assigneeName: {
        flexShrink: 1,
        color: '#475467',
        fontSize: 10,
    },
    cardActions: {
        minHeight: 38,
        marginTop: 10,
        paddingTop: 9,
        borderTopWidth: 1,
        borderTopColor: '#E4E7EC',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    cardActionsCompact: {
        marginTop: 7,
        paddingTop: 7,
    },
    moveButton: {
        minHeight: 34,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: '#D0D5DD',
        backgroundColor: 'rgba(255,255,255,0.78)',
    },
    moveButtonText: {
        color: '#344054',
        fontSize: 11,
        fontWeight: '700',
    },
    orderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    orderButton: {
        width: 34,
        height: 34,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: '#D0D5DD',
        backgroundColor: 'rgba(255,255,255,0.78)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderButtonDisabled: {
        opacity: 0.35,
    },
    cardOptimistic: {
        opacity: 0.7,
    },
    cardLoadingOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        zIndex: 10,
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
