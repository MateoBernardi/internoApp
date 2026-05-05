/**
 * Componente Kanban avanzado con modales para crear, editar y ver detalles
 * Incluye gestión completa: crear, mover con observación, ver bitácora y eliminar
*/

import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
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
    View
} from 'react-native';
import { FormObjetivoModal } from '../components/CrearObjetivo';
import { InfoObjetivo } from '../components/InfoObjetivo';
import { MoveModal } from '../components/MoverObjetivo';
import { DetailModal } from '../components/Objetivo';
import {
    useDeleteObjetivo,
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
// Componente Item
// ============================================

interface ObjetivoItemProps {
    objetivo: Objetivo;
    onPress: (objetivo: Objetivo) => void;
    onMove: (objetivo: Objetivo) => void;
    isOptimisticLoading?: boolean;
}

function ObjetivoItem({ objetivo, onPress, onMove, isOptimisticLoading }: ObjetivoItemProps) {
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
                </View>
                <Text style={styles.cardDescription} numberOfLines={2}>
                    {objetivo.descripcion}
                </Text>
            </TouchableOpacity>

            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => onMove(objetivo)}
                    disabled={isOptimisticLoading}
                >
                    <Text style={styles.cardActionButtonText}>➜ Mover</Text>
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
    const { data: objetivos = [], isLoading, error } = useObjetivos();
    const updateMutation = useUpdateObjetivo();
    const deleteMutation = useDeleteObjetivo();

    // Estados de modales
    const [formModalVisible, setFormModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [moveModalVisible, setMoveModalVisible] = useState(false);
    const [formModalMinimized, setFormModalMinimized] = useState(false);
    const [resumeCreateDraft, setResumeCreateDraft] = useState(false);
    const [resetCreateDraftSignal, setResetCreateDraftSignal] = useState(0);
    const [moveModalMinimized, setMoveModalMinimized] = useState(false);
    const [resumeMoveDraft, setResumeMoveDraft] = useState(false);
    const [resetMoveDraftSignal, setResetMoveDraftSignal] = useState(0);
    const [createDraft, setCreateDraft] = useState<CreateObjetivo>(DEFAULT_CREATE_DRAFT);
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

    const handleShowInfo = useCallback((objetivo: Objetivo) => {
        setSelectedObjetivo(objetivo);
        setDetailModalVisible(false);
        setInfoModalVisible(true);
    }, []);

    const handleOpenCreate = useCallback(() => {
        if (!formModalMinimized) {
            setCreateDraft(DEFAULT_CREATE_DRAFT);
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
        setEditingObjetivo(objetivo);
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
        setSelectedObjetivo(objetivo);
        if (!moveModalMinimized) {
            setMoveDraft(DEFAULT_MOVE_DRAFT);
        }
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
        [updateMutation, handleCloseMoveModal]
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
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Tablero de Actividades</Text>
                    <Text style={styles.headerSubtitle}>
                        {objetivos.length} objetivo{objetivos.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={handleOpenCreate}
                    disabled={formModalVisible}
                >
                    <Text style={styles.createButtonText}>+</Text>
                </TouchableOpacity>
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
                        />
                    ))}
                </View>
            </ScrollView>

            {formModalMinimized && (
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

            {moveModalMinimized && (
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
                onMove={handleOpenMove}
                onDelete={handleDeleteObjetivo}
                onInfo={handleShowInfo}
                currentUserId={user?.user_context_id}
            />

            <InfoObjetivo
                visible={infoModalVisible}
                objetivo={selectedObjetivo}
                onClose={() => {
                    setInfoModalVisible(false);
                    setDetailModalVisible(true);
                }}
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
