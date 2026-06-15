import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArchivoViewerResponse } from '../models/Archivo';
import { formatDateTimeDDMMYYYYHHMM } from '../utils/dateTime';

const colors = Colors.light;

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
                                <Ionicons name="close" size={20} color={colors.icon} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.body}>
                            {isLoading ? (
                                <View style={styles.centerBox}>
                                    <ActivityIndicator size="small" color={colors.tint} />
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
                                        <Ionicons name="eye-outline" size={16} color={colors.secondaryText} />
                                    </View>
                                ))
                            )}
                        </View>

                        <TouchableOpacity style={styles.closeCta} onPress={onClose}>
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
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.42)',
    },
    sheet: {
        backgroundColor: colors.componentBackground,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
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
        color: colors.secondaryText,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.icon,
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
        color: colors.secondaryText,
    },
    emptyText: {
        fontSize: 13,
        color: colors.secondaryText,
    },
    errorText: {
        fontSize: 13,
        color: colors.error,
        textAlign: 'center',
    },
    viewerRow: {
        minHeight: 54,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.icon,
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
        color: colors.secondaryText,
    },
    closeCta: {
        minHeight: 44,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.icon,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeCtaText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
