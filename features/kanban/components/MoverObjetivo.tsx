// ============================================
// Modal para mover objetivo con observación
// ============================================

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Keyboard,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ESTADOS, Objetivo } from "../models/Objetivo";

interface MoveDraft {
    nuevoEstado: string;
    observacion: string;
}

const DEFAULT_MOVE_DRAFT: MoveDraft = {
    nuevoEstado: '',
    observacion: '',
};

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

export function MoveModal({
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
    const insets = useSafeAreaInsets();
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

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <ModalKeyboardView style={styles.modalKeyboardAvoiding}>
                    <View style={[styles.modalContainer, { paddingBottom: insets.bottom }]}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderActions}>
                                <TouchableOpacity onPress={handleClose} style={styles.modalIconButton} disabled={isLoading}>
                                    <Ionicons name="chevron-down" size={24} color="#999" />
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

                        <View style={[styles.uploadButtonContainer]}>
                            <TouchableOpacity
                                onPress={handleMove}
                                style={[styles.uploadButton, { backgroundColor: isLoading ? '#d1d5db' : Colors['light'].componentBackground }]}
                            >
                                <Ionicons name="cloud-upload" size={20} color={Colors['light'].lightTint} />
                                <ThemedText style={styles.uploadButtonText}>{'Mover'}</ThemedText>

                            </TouchableOpacity>
                        </View>
                    </View>
                </ModalKeyboardView>
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
        flex: 1,
        marginTop: '10%', // Empuja el modal hacia abajo
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
        padding: 6,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        marginLeft: 8,
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
});