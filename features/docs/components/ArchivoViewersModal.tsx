import { ThemedText } from '@/components/themed-text';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArchivoViewerResponse } from '../models/Archivo';
import { formatDateTimeDDMMYYYYHHMM } from '../utils/dateTime';

type ArchivoViewersModalProps = {
    visible: boolean;
    fileName: string;
    viewers: ArchivoViewerResponse[];
    isLoading: boolean;
    errorMessage?: string | null;
    onClose: () => void;
};

export function ArchivoViewersModal({
    visible,
    fileName,
    viewers,
    isLoading,
    errorMessage,
    onClose,
}: ArchivoViewersModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                <Pressable style={styles.overlay} onPress={onClose}>
                    <Pressable style={styles.sheet}>
                        <View style={styles.headerRow}>
                            <View style={styles.headerTextWrap}>
                                <ThemedText style={styles.title}>Quienes abrieron el archivo</ThemedText>
                                <ThemedText numberOfLines={1} style={styles.subtitle}>{fileName}</ThemedText>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={18} color={glassColors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.body}>
                            {isLoading ? (
                                <View style={styles.centerBox}>
                                    <ActivityIndicator size="small" color={glassColors.link} />
                                    <ThemedText style={styles.loadingText}>Cargando visualizaciones...</ThemedText>
                                </View>
                            ) : errorMessage ? (
                                <View style={styles.centerBox}>
                                    <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                                </View>
                            ) : viewers.length === 0 ? (
                                <View style={styles.centerBox}>
                                    <ThemedText style={styles.emptyText}>Nadie abrio el archivo aun</ThemedText>
                                </View>
                            ) : (
                                viewers.map((viewer) => (
                                    <View key={`${viewer.user_context_id}-${new Date(viewer.visto_en).getTime()}`} style={styles.viewerRow}>
                                        <View style={styles.viewerMain}>
                                            <ThemedText style={styles.viewerName}>{viewer.nombre} {viewer.apellido}</ThemedText>
                                            <ThemedText style={styles.viewerDate}>{formatDateTimeDDMMYYYYHHMM(viewer.visto_en)}</ThemedText>
                                        </View>
                                        <Ionicons name="eye-outline" size={16} color={glassColors.textMuted} />
                                    </View>
                                ))
                            )}
                        </View>

                        <TouchableOpacity style={styles.closeCtaButton} onPress={onClose}>
                            <ThemedText style={styles.closeCtaText}>Cerrar</ThemedText>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    overlay: {
        ...glassStyles.modalOverlay,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 22,
        maxHeight: '74%',
        gap: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTextWrap: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 13,
        color: glassColors.textMuted,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(17,24,28,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(17,24,28,0.12)',
    },
    body: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(17,24,28,0.08)',
        overflow: 'hidden',
    },
    centerBox: {
        minHeight: 92,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        gap: 8,
    },
    loadingText: {
        fontSize: 13,
        color: glassColors.textMuted,
    },
    emptyText: {
        fontSize: 13,
        color: glassColors.textMuted,
    },
    errorText: {
        fontSize: 13,
        color: glassColors.error,
        textAlign: 'center',
    },
    viewerRow: {
        minHeight: 54,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(17,24,28,0.08)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        gap: 10,
    },
    viewerMain: {
        flex: 1,
        gap: 2,
    },
    viewerName: {
        fontSize: 14,
        fontWeight: '600',
    },
    viewerDate: {
        fontSize: 12,
        color: glassColors.textMuted,
    },
    closeCtaButton: {
        minHeight: 44,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(17,24,28,0.12)',
        backgroundColor: 'rgba(17,24,28,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeCtaText: {
        fontSize: 15,
        fontWeight: '600',
        color: glassColors.text,
    },
});
