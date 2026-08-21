// ============================================
// Modal para mover objetivo con observación
// ============================================

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/shared/ui/GlassButton';
import { focusBorderStyles, glassColors, glassStyles } from '@/shared/ui/glass';
import { useFocusBorder } from '@/shared/ui/useFocusBorder';
import { useSafeBottomInset } from '@/hooks/useSafeBottomInset';
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
    const bottomInset = useSafeBottomInset();
    const observacionFocus = useFocusBorder();
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
            <View style={[glassStyles.modalOverlay, styles.overlay]}>
                <ModalKeyboardView style={styles.modalKeyboardAvoiding}>
                    <View style={[glassStyles.sheet, styles.modalContainer, { paddingBottom: bottomInset }]}>
                        <View style={[styles.modalHeader, glassStyles.sheetHeader]}>
                            <ThemedText style={styles.modalTitle}>Mover objetivo</ThemedText>
                            <TouchableOpacity onPress={handleClose} style={styles.modalIconButton} disabled={isLoading}>
                                <Ionicons name="chevron-down" size={24} color={glassColors.textMuted} />
                            </TouchableOpacity>
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
                                <View style={[glassStyles.card, styles.objetivoInfo]}>
                                    <Text style={styles.infoTitle}>{objetivo.titulo}</Text>
                                    <Text style={styles.infoEstado}>
                                        Estado actual: <Text style={styles.infoEstadoStrong}>{objetivo.estado}</Text>
                                    </Text>
                                </View>

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
                                    style={[
                                        glassStyles.fieldGlass,
                                        styles.input,
                                        styles.textArea,
                                        focusBorderStyles.inputNoOutline,
                                        observacionFocus.isFocused && { borderColor: glassColors.link },
                                    ]}
                                    placeholder="Añade una nota sobre este cambio"
                                    value={observacion}
                                    onChangeText={(value) => {
                                        setObservacion(value);
                                        syncMoveDraft({ observacion: value });
                                    }}
                                    onFocus={observacionFocus.onFocus}
                                    onBlur={observacionFocus.onBlur}
                                    editable={!isLoading}
                                    multiline
                                    numberOfLines={3}
                                    placeholderTextColor={glassColors.placeholder}
                                    textAlignVertical="top"
                                />
                            </View>
                        </ScrollView>

                        <View style={[styles.uploadButtonContainer, { paddingBottom: bottomInset }]}>
                            <GlassButton
                                label="Mover objetivo"
                                onPress={handleMove}
                                loading={isLoading}
                                icon={(color) => <Ionicons name="swap-horizontal-outline" size={20} color={color} />}
                                style={styles.uploadButton}
                            />
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
    },
    modalContainer: {
        flex: 1,
        marginTop: '10%', // Empuja el modal hacia abajo
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(17,24,28,0.08)',
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: glassColors.text,
    },
    modalIconButton: {
        padding: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(17,24,28,0.06)',
        marginLeft: 8,
    },
    modalFormContent: {
        flex: 1,
    },
    modalFormContentContainer: {
        padding: 16,
    },
    uploadButtonContainer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(17,24,28,0.08)',
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
    // ============================================
    // Forms
    // ============================================
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: glassColors.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(17,24,28,0.03)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: glassColors.text,
        borderWidth: 1,
        borderColor: 'rgba(17,24,28,0.12)',
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
        backgroundColor: 'rgba(17,24,28,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(17,24,28,0.12)',
        alignItems: 'center',
    },
    estadoButtonActive: {
        backgroundColor: 'rgba(26,115,232,0.18)',
        borderColor: 'rgba(26,115,232,0.5)',
    },
    estadoButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: glassColors.textMuted,
    },
    estadoButtonTextActive: {
        color: glassColors.link,
    },
    // ============================================
    // Objetivo Info
    // ============================================
    objetivoInfo: {
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: glassColors.link,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: glassColors.text,
        marginBottom: 4,
    },
    infoEstado: {
        fontSize: 12,
        color: glassColors.textMuted,
    },
    infoEstadoStrong: {
        color: glassColors.text,
        fontWeight: '800',
    },
});