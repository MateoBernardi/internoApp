import { Colors } from "@/constants/theme";
import { AppBackButton } from '@/shared/ui/AppBackButton';
import { GlassButton } from '@/shared/ui/GlassButton';
import { FullScreenPortal } from '@/shared/ui/FullScreenPortal';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from "react";
import { Alert, BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bitacora, Objetivo } from "../models/Objetivo";

interface DetailModalProps {
    visible: boolean;
    objetivo?: Objetivo;
    onClose: () => void;
    onDelete?: (id: number) => void;
    onInfo?: (objetivo: Objetivo) => void;
    onMove?: (objetivo: Objetivo) => void;
    currentUserId?: number;
}

export function DetailModal({ visible, objetivo, onClose, onDelete, onInfo, onMove, currentUserId }: DetailModalProps) {
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (!visible) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            onClose();
            return true;
        });
        return () => sub.remove();
    }, [visible, onClose]);

    if (!visible || !objetivo) return null;

    const isOwner = currentUserId === objetivo.created_by;

    return (
        <FullScreenPortal>
        <View style={styles.fullScreen}>
                <View style={[styles.modalContainer, { paddingBottom: insets.bottom }]}>

                    <View style={[styles.modalHeader, glassStyles.sheetHeader, { paddingTop: insets.top + 12 }]}>
                        <AppBackButton onPress={onClose} />
                        <TouchableOpacity onPress={() => onInfo?.(objetivo)} style={[glassStyles.buttonSecondary, styles.infoBtn]}>
                            <Ionicons name="information-circle-outline" size={22} color={glassColors.link} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                        <View style={[glassStyles.card, styles.summaryCard]}>
                        <Text style={styles.metaAuthor}>
                            {objetivo.created_by_username}
                            <Text style={styles.metaDate}>
                                {'  '}
                                {new Date(objetivo.created_at).toLocaleDateString('es-ES', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                })}
                            </Text>
                        </Text>

                        <Text style={[styles.detailTitle, { marginTop: 4 }]}>{objetivo.titulo}</Text>

                        <View style={[styles.estatoBadge, { backgroundColor: getStateColor(objetivo.estado) }]}>
                            <Text style={styles.estatoText}>{objetivo.estado}</Text>
                        </View>

                        <Text style={[objetivo.descripcion ? styles.description : styles.descriptionEmpty, { marginTop: 14 }]}>
                            {objetivo.descripcion || '—'}
                        </Text>
                        </View>

                        {objetivo.bitacora && objetivo.bitacora.length > 0 && (
                            <View style={styles.divider} />
                        )}

                        {objetivo.bitacora && objetivo.bitacora.length > 0 && (
                            <View style={styles.timeline}>
                            <Text style={styles.timelineTitle}>Actividad</Text>
                                {objetivo.bitacora.map((entry, idx) => {
                                    const isLast = idx === objetivo.bitacora.length - 1;

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

                                                {/* Cambio de estado */}
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
                                                    /* Asignación o descarga */
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
                        )}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <GlassButton
                            label="Mover objetivo"
                            onPress={() => onMove?.(objetivo)}
                            icon={(color) => <Ionicons name="swap-horizontal-outline" size={18} color={color} />}
                            style={styles.footerButton}
                        />
                        <GlassButton
                            label="Eliminar"
                            variant="danger"
                            disabled={!isOwner}
                            icon={(color) => <Ionicons name="trash-outline" size={18} color={color} />}
                            style={styles.footerButton}
                            onPress={() => {
                                Alert.alert(
                                    'Eliminar',
                                    '¿Estás seguro de que deseas eliminar este objetivo?',
                                    [
                                        { text: 'Cancelar', style: 'cancel' },
                                        {
                                            text: 'Eliminar',
                                            style: 'destructive',
                                            onPress: () => { onDelete?.(objetivo.id); onClose(); },
                                        },
                                    ]
                                );
                            }}
                        />
                    </View>
                </View>
        </View>
        </FullScreenPortal>
    );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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
        ...StyleSheet.absoluteFillObject,
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
    infoBtn: {
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 19,
        padding: 0,
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 18,
    },
    summaryCard: {
        padding: 16,
        marginBottom: 4,
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
    inlineEditBlock: {
        marginBottom: 2,
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
    divider: {
        height: 1,
        backgroundColor: 'rgba(17,24,28,0.08)',
        marginVertical: 20,
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
    timelineTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: glassColors.text,
        marginBottom: 14,
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
    timelineDotIcon: {
        fontSize: 11,
        color: '#1e3a8a',
        fontWeight: '700',
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
        gap: 10,
        backgroundColor: '#ffffff',
    },
    footerButton: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    buttonPrimary: {
        backgroundColor: Colors.light.tint,
    },
    buttonPrimaryText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    buttonDanger: {},
    buttonDangerText: {
        color: glassColors.error,
        fontWeight: '600',
        fontSize: 13,
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    buttonDisabledText: {
        opacity: 0.6,
    },
});