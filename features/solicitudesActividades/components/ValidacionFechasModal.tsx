import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

const colors = Colors['light'];

export type ValidacionState = 'idle' | 'validating' | 'success' | 'warnings' | 'error';

interface ValidacionFechasModalProps {
    state: ValidacionState;
    avisos: string[];
    errorMessage?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ValidacionFechasModal({
    state,
    avisos,
    errorMessage,
    onConfirm,
    onCancel,
}: ValidacionFechasModalProps) {
    const visible = state !== 'idle';

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.content}>
                    {/* Estado: Validando */}
                    {state === 'validating' && (
                        <View style={styles.centerContent}>
                            <ActivityIndicator size="large" color={colors.lightTint} />
                            <ThemedText style={styles.validatingText}>
                                Validando fechas...
                            </ThemedText>
                        </View>
                    )}

                    {/* Estado: Éxito (sin avisos) */}
                    {state === 'success' && (
                        <View style={styles.centerContent}>
                            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                            <ThemedText style={styles.successText}>
                                Fechas válidas
                            </ThemedText>
                        </View>
                    )}

                    {/* Estado: Avisos */}
                    {state === 'warnings' && (
                        <>
                            <View style={styles.headerRow}>
                                <Ionicons name="warning" size={24} color={colors.warning} />
                                <ThemedText type="subtitle" style={styles.warningTitle}>
                                    Conflictos encontrados
                                </ThemedText>
                            </View>

                            <ThemedText style={styles.warningSubtitle}>
                                Los siguientes usuarios tienen actividades en ese rango horario:
                            </ThemedText>

                            <ScrollView style={styles.avisosContainer} showsVerticalScrollIndicator={false}>
                                {avisos.map((aviso, index) => (
                                    <View key={index} style={styles.avisoItem}>
                                        <Ionicons name="person-circle-outline" size={18} color={colors.warning} style={{ marginRight: 8, marginTop: 1 }} />
                                        <ThemedText style={styles.avisoText}>{aviso}</ThemedText>
                                    </View>
                                ))}
                            </ScrollView>

                            <ThemedText style={styles.confirmQuestion}>
                                ¿Desea continuar de todos modos?
                            </ThemedText>

                            <View style={styles.actions}>
                                <TouchableOpacity onPress={onCancel} style={styles.btnCancel}>
                                    <ThemedText style={{ color: colors.lightTint }}>Modificar fechas</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onConfirm} style={styles.btnConfirm}>
                                    <ThemedText style={{ color: colors.componentBackground }}>Continuar</ThemedText>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* Estado: Error */}
                    {state === 'error' && (
                        <View style={styles.centerContent}>
                            <Ionicons name="alert-circle" size={48} color={colors.error} />
                            <ThemedText style={styles.errorText}>
                                {errorMessage || 'Error al validar las fechas'}
                            </ThemedText>
                            <TouchableOpacity onPress={onCancel} style={[styles.btnConfirm, { marginTop: 16 }]}>
                                <ThemedText style={{ color: colors.componentBackground }}>Volver</ThemedText>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '85%',
        maxWidth: 400,
        maxHeight: '70%',
        backgroundColor: colors.componentBackground,
        borderRadius: 16,
        padding: 24,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    centerContent: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    validatingText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.secondaryText,
    },
    successText: {
        marginTop: 12,
        fontSize: 18,
        fontWeight: '600',
        color: colors.success,
    },
    errorText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.error,
        textAlign: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    warningTitle: {
        marginLeft: 8,
        color: colors.warning,
    },
    warningSubtitle: {
        fontSize: 13,
        color: colors.secondaryText,
        marginBottom: 12,
    },
    avisosContainer: {
        maxHeight: 200,
        marginBottom: 12,
    },
    avisoItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 4,
        backgroundColor: colors.warning + '10',
        borderRadius: 8,
        marginBottom: 6,
        paddingLeft: 8,
    },
    avisoText: {
        flex: 1,
        fontSize: 13,
        color: colors.text,
    },
    confirmQuestion: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 4,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 16,
    },
    btnCancel: {
        padding: 10,
        marginRight: 10,
    },
    btnConfirm: {
        backgroundColor: colors.lightTint,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
});
