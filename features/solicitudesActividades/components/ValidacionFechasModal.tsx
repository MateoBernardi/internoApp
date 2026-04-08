import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import type { RangoOcupado } from '../models/Solicitud';

const colors = Colors['light'];

export type ValidacionState = 'idle' | 'validating' | 'success' | 'warnings' | 'error';

interface ValidacionFechasModalProps {
    state: ValidacionState;
    avisos: string[];
    rangosOcupados?: RangoOcupado[];
    errorMessage?: string;
    onConfirm: () => void;
    onCancel: () => void;
    showConfirmAction?: boolean;
    confirmLabel?: string;
    cancelLabel?: string;
    questionText?: string;
}

type TipoRangoFusionado = RangoOcupado['tipo'] | 'mixto';

interface RangoFusionado {
    usuario: string;
    tipo: TipoRangoFusionado;
    desde: Date;
    hasta: Date;
}

function isOverlappingOrContiguous(current: RangoFusionado, next: RangoOcupado): boolean {
    const nextStart = new Date(next.desde).getTime();
    return nextStart <= current.hasta.getTime();
}

function mergeTipos(current: TipoRangoFusionado, next: RangoOcupado['tipo']): TipoRangoFusionado {
    if (current === 'mixto') return 'mixto';
    return current === next ? current : 'mixto';
}

function getRangoBadgeStyle(tipo: TipoRangoFusionado): { text: string; bgColor: string; textColor: string } {
    if (tipo === 'licencia') {
        return {
            text: 'Licencia aprobada',
            bgColor: colors.warning + '20',
            textColor: colors.warning,
        };
    }

    if (tipo === 'solicitud') {
        return {
            text: 'Solicitud',
            bgColor: colors.info + '20',
            textColor: colors.info,
        };
    }

    if (tipo === 'mixto') {
        return {
            text: 'Mixto',
            bgColor: colors.secondaryText + '20',
            textColor: colors.secondaryText,
        };
    }

    return {
        text: 'Actividad',
        bgColor: colors.lightTint + '20',
        textColor: colors.lightTint,
    };
}

export function ValidacionFechasModal({
    state,
    avisos,
    rangosOcupados,
    errorMessage,
    onConfirm,
    onCancel,
    showConfirmAction = true,
    confirmLabel = 'Continuar',
    cancelLabel = 'Modificar fechas',
    questionText = '¿Desea continuar de todos modos?',
}: ValidacionFechasModalProps) {
    const responsiveLayout = useResponsiveLayout();
    const visible = state !== 'idle';
    const modalMaxWidth =
        Platform.OS === 'web'
            ? (responsiveLayout.isDesktopXl ? 760 : responsiveLayout.isDesktop ? 600 : 400)
            : 400;

    const rangosAgrupadosPorUsuario = React.useMemo(() => {
        const grouped = new Map<string, RangoFusionado[]>();

        (rangosOcupados ?? []).forEach((rango) => {
            const current = grouped.get(rango.usuario) ?? [];
            current.push({
                usuario: rango.usuario,
                tipo: rango.tipo,
                desde: new Date(rango.desde),
                hasta: new Date(rango.hasta),
            });
            grouped.set(rango.usuario, current);
        });

        grouped.forEach((rangos, usuario) => {
            const sorted = [...rangos].sort((a, b) => a.desde.getTime() - b.desde.getTime());
            const merged: RangoFusionado[] = [];

            sorted.forEach((rango) => {
                const last = merged[merged.length - 1];

                if (!last) {
                    merged.push({ ...rango });
                    return;
                }

                if (!isOverlappingOrContiguous(last, rango)) {
                    merged.push({ ...rango });
                    return;
                }

                if (rango.hasta.getTime() > last.hasta.getTime()) {
                    last.hasta = rango.hasta;
                }

                last.tipo = mergeTipos(last.tipo, rango.tipo);
            });

            grouped.set(usuario, merged);
        });

        return Array.from(grouped.entries()).map(([usuario, rangos]) => ({
            usuario,
            rangos,
        }));
    }, [rangosOcupados]);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={[styles.overlay, Platform.OS === 'web' && styles.overlayWeb]}>
                <View style={[styles.content, { maxWidth: modalMaxWidth }]}>
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
                                Se detectaron cruces de agenda (actividades y/o licencias aprobadas) en ese rango:
                            </ThemedText>

                            <ScrollView style={styles.avisosContainer} showsVerticalScrollIndicator={false}>
                                {avisos.map((aviso, index) => (
                                    <View key={index} style={styles.avisoItem}>
                                        <Ionicons name="person-circle-outline" size={18} color={colors.warning} style={{ marginRight: 8, marginTop: 1 }} />
                                        <ThemedText style={styles.avisoText}>{aviso}</ThemedText>
                                    </View>
                                ))}

                                {/* Rangos ocupados detallados */}
                                {rangosAgrupadosPorUsuario.length > 0 && (
                                    <View style={styles.rangosContainer}>
                                        <ThemedText style={styles.rangosTitle}>Detalle de solapamientos:</ThemedText>
                                        {rangosAgrupadosPorUsuario.map(({ usuario, rangos }) => {
                                            return (
                                                <View key={usuario} style={styles.rangoUsuarioGroup}>
                                                    <View style={styles.rangoHeader}>
                                                        <Ionicons name="person" size={14} color={colors.lightTint} />
                                                        <ThemedText style={styles.rangoUsuario}>{usuario}</ThemedText>
                                                    </View>

                                                    {rangos.map((rango, idx) => {
                                                        const badge = getRangoBadgeStyle(rango.tipo);

                                                        return (
                                                            <View key={`${usuario}-${idx}`} style={styles.rangoItem}>
                                                                <View style={styles.rangoItemHeader}>
                                                                    <View style={[styles.rangoTipoBadge, { backgroundColor: badge.bgColor }]}> 
                                                                        <ThemedText style={[styles.rangoTipoText, { color: badge.textColor }]}> 
                                                                            {badge.text}
                                                                        </ThemedText>
                                                                    </View>
                                                                </View>
                                                                <ThemedText style={styles.rangoFechas}>
                                                                    {rango.desde.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} {rango.desde.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} → {rango.hasta.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                                </ThemedText>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </ScrollView>

                            <ThemedText style={styles.confirmQuestion}>{questionText}</ThemedText>

                            <View style={styles.actions}>
                                <TouchableOpacity onPress={onCancel} style={styles.btnCancel}>
                                    <ThemedText style={{ color: colors.lightTint }}>{cancelLabel}</ThemedText>
                                </TouchableOpacity>
                                {showConfirmAction && (
                                    <TouchableOpacity onPress={onConfirm} style={styles.btnConfirm}>
                                        <ThemedText style={{ color: colors.componentBackground }}>{confirmLabel}</ThemedText>
                                    </TouchableOpacity>
                                )}
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
    overlayWeb: {
        zIndex: 1000,
        pointerEvents: 'auto',
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
    rangosContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.secondaryText + '40',
    },
    rangosTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.secondaryText,
        marginBottom: 8,
    },
    rangoItem: {
        backgroundColor: colors.warning + '08',
        borderRadius: 8,
        padding: 10,
        marginBottom: 6,
    },
    rangoUsuarioGroup: {
        marginBottom: 8,
    },
    rangoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 6,
    },
    rangoItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: 4,
    },
    rangoUsuario: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    rangoTipoBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    rangoTipoText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    rangoFechas: {
        fontSize: 12,
        color: colors.secondaryText,
        marginLeft: 20,
    },
});
