// ============================================
// Modal para ver detalles y bitácora
// ============================================

import { Colors } from "@/constants/theme";
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Objetivo } from "../models/Objetivo";


interface DetailModalProps {
    visible: boolean;
    objetivo?: Objetivo;
    onClose: () => void;
    onMove?: (objetivo: Objetivo) => void;
    onDelete?: (id: number) => void;
    onSaveInline?: (id: number, data: { titulo: string; descripcion: string }) => Promise<void>;
    onInfo?: (objetivo: Objetivo) => void;
    currentUserId?: number;
    canManage?: boolean;
}

export function DetailModal({ visible, objetivo, onClose, onMove, onDelete, onSaveInline, onInfo, currentUserId, canManage = true }: DetailModalProps) {
    const [editingTitulo, setEditingTitulo] = useState(false);
    const [editingDescripcion, setEditingDescripcion] = useState(false);
    const [tituloValue, setTituloValue] = useState('');
    const [descripcionValue, setDescripcionValue] = useState('');
    const [saving, setSaving] = useState(false);

    if (!objetivo) return null;

    const isOwner = currentUserId === objetivo.created_by;

    const startEditTitulo = () => {
        setTituloValue(objetivo.titulo);
        setEditingTitulo(true);
    };

    const startEditDescripcion = () => {
        setDescripcionValue(objetivo.descripcion || '');
        setEditingDescripcion(true);
    };

    const handleSaveTitulo = async () => {
        if (!tituloValue.trim()) return;
        setSaving(true);
        try {
            await onSaveInline?.(objetivo.id, { titulo: tituloValue, descripcion: objetivo.descripcion || '' });
            objetivo.titulo = tituloValue;
        } catch (e) {
            Alert.alert('Error', 'No se pudo guardar');
        } finally {
            setSaving(false);
            setEditingTitulo(false);
        }
    };

    const handleSaveDescripcion = async () => {
        setSaving(true);
        try {
            await onSaveInline?.(objetivo.id, { titulo: objetivo.titulo, descripcion: descripcionValue });
            objetivo.descripcion = descripcionValue;
        } catch (e) {
            Alert.alert('Error', 'No se pudo guardar');
        } finally {
            setSaving(false);
            setEditingDescripcion(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.infoBtnFloatingContainer}>
                        <TouchableOpacity onPress={() => onInfo?.(objetivo)} style={styles.infoBtnFloating}>
                            <Text style={styles.infoBtnText}>ⓘ</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="chevron-down" size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>

                        {/* Creador + fecha */}
                        <Text style={styles.metaAuthor}>
                            {objetivo.created_by_username}
                            <Text style={styles.metaDate}>
                                {'  '}
                                {new Date(objetivo.created_at).toLocaleDateString('es-ES', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                })}
                            </Text>
                        </Text>

                        {/* Título editable */}
                        <View style={[styles.inlineEditBlock, { marginTop: 4 }]}>
                            {editingTitulo ? (
                                <View style={styles.inlineEditRow}>
                                    <TextInput
                                        style={styles.inlineInput}
                                        value={tituloValue}
                                        onChangeText={setTituloValue}
                                        autoFocus
                                        multiline
                                    />
                                    <View style={styles.inlineEditActions}>
                                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingTitulo(false)}>
                                            <Text style={styles.cancelBtnText}>✕</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTitulo} disabled={saving}>
                                            <Text style={styles.saveBtnText}>✓</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={isOwner ? startEditTitulo : undefined} activeOpacity={isOwner ? 0.6 : 1}>
                                    <View style={styles.inlineValueRow}>
                                        <Text style={styles.detailTitle}>{objetivo.titulo}</Text>
                                        {isOwner && <Text style={styles.editHint}>✎</Text>}
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Estado badge */}
                        <View style={[styles.estatoBadge, { backgroundColor: getStateColor(objetivo.estado) }]}>
                            <Text style={styles.estatoText}>{objetivo.estado}</Text>
                        </View>

                        {/* Descripción editable */}
                        <View style={[styles.inlineEditBlock, { marginTop: 14 }]}>
                            {editingDescripcion ? (
                                <View style={styles.inlineEditRow}>
                                    <TextInput
                                        style={[styles.inlineInput, styles.inlineInputMulti]}
                                        value={descripcionValue}
                                        onChangeText={setDescripcionValue}
                                        autoFocus
                                        multiline
                                        numberOfLines={4}
                                        placeholder="Sin descripción..."
                                        placeholderTextColor="#bbb"
                                    />
                                    <View style={styles.inlineEditActions}>
                                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingDescripcion(false)}>
                                            <Text style={styles.cancelBtnText}>✕</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDescripcion} disabled={saving}>
                                            <Text style={styles.saveBtnText}>✓</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={isOwner ? startEditDescripcion : undefined} activeOpacity={isOwner ? 0.6 : 1}>
                                    <View style={styles.inlineValueRow}>
                                        <Text style={objetivo.descripcion ? styles.description : styles.descriptionEmpty}>
                                            {objetivo.descripcion || (isOwner ? 'Agregar descripción...' : '—')}
                                        </Text>
                                        {isOwner && <Text style={styles.editHint}>✎</Text>}
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Separador */}
                        {objetivo.bitacora && objetivo.bitacora.length > 0 && (
                            <View style={styles.divider} />
                        )}

                        {/* Bitácora — línea de tiempo */}
                        {objetivo.bitacora && objetivo.bitacora.length > 0 && (
                            <View style={styles.timeline}>
                                {objetivo.bitacora.map((entry, idx) => {
                                    const isLast = idx === objetivo.bitacora.length - 1;
                                    const icon = getEntryIcon(entry);

                                    return (
                                        <View key={idx} style={styles.timelineRow}>
                                            {/* Dot + línea */}
                                            <View style={styles.timelineLeft}>
                                                <View style={styles.timelineDot}>
                                                    <Text style={styles.timelineDotIcon}>{icon}</Text>
                                                </View>
                                                {!isLast && <View style={styles.timelineLine} />}
                                            </View>

                                            {/* Contenido */}
                                            <View style={[styles.timelineContent, isLast && { marginBottom: 0 }]}>
                                                <View style={styles.timelineHeader}>
                                                    <Text style={styles.timelineUser}>{entry.usuario_nombre}</Text>
                                                    <Text style={styles.timelineDate}>
                                                        {new Date(entry.created_at).toLocaleDateString('es-ES', {
                                                            day: '2-digit', month: 'short',
                                                            hour: '2-digit', minute: '2-digit',
                                                        })}
                                                    </Text>
                                                </View>
                                                <View style={styles.timelineChange}>
                                                    <View style={[styles.estadoBubble, { backgroundColor: getStateColor(entry.estado_anterior) + '22', borderColor: getStateColor(entry.estado_anterior) + '55' }]}>
                                                        <Text style={[styles.estadoBubbleText, { color: getStateColor(entry.estado_anterior) }]}>{entry.estado_anterior}</Text>
                                                    </View>
                                                    <Text style={styles.arrow}>→</Text>
                                                    <View style={[styles.estadoBubble, { backgroundColor: getStateColor(entry.estado_nuevo) + '22', borderColor: getStateColor(entry.estado_nuevo) + '55' }]}>
                                                        <Text style={[styles.estadoBubbleText, { color: getStateColor(entry.estado_nuevo) }]}>{entry.estado_nuevo}</Text>
                                                    </View>
                                                </View>
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

                    {/* Botones de acción */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.buttonDanger,
                                !isOwner && styles.buttonDisabled,
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
                            disabled={!isOwner}
                        >
                            <Text style={[styles.buttonDangerText, !isOwner && styles.buttonDisabledText]}>
                                Eliminar
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
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

function getEntryIcon(entry: any): string {
    if (entry.observacion && !entry.estado_nuevo) return '💬';
    const nuevo = entry.estado_nuevo;
    switch (nuevo) {
        case 'REALIZADO': return '✓';
        case 'PROGRESO': return '▶';
        case 'PRIORIDAD': return '!';
        case 'PENDIENTE': return '○';
        default: return '•';
    }
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
        flex: 1,
        marginTop: '5%', // Empuja el modal hacia abajo
        backgroundColor: Colors['light'].componentBackground,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
    },
    modalHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomColor: Colors['light'].icon,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    infoBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
    },
    infoBtnFloatingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: 46,
        paddingBottom: 124,
        pointerEvents: 'box-none',
        zIndex: 20,
    },
    infoBtnFloating: {
        width: 62,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        zIndex: 21,
        elevation: 6,
    },
    infoBtnText: {
        fontSize: 22,
        color: '#1e3a8a',
        lineHeight: 26,
    },
    closeBtn: {
        padding: 6,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        marginLeft: 8,
    },
    closeButton: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 18,
    },

    // ============================================
    // Meta
    // ============================================
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

    // ============================================
    // Inline Edit
    // ============================================
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

    // ============================================
    // Detail Info
    // ============================================
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
        backgroundColor: Colors['light'].background,
        marginVertical: 20,
    },

    // ============================================
    // Estado Badge
    // ============================================
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

    // ============================================
    // Timeline
    // ============================================
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
        backgroundColor: 'rgba(30, 58, 138, 0.12)', // azul oscuro transparente
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
    observacionText: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 18,
        marginTop: 2,
    },

    // ============================================
    // Footer + Buttons
    // ============================================
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 10,
        backgroundColor: '#fff',
    },
    button: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonPrimary: {
        backgroundColor: Colors.light.tint,
    },
    buttonPrimaryText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    buttonDanger: {
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#fecdd3',
    },
    buttonDangerText: {
        color: '#e11d48',
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