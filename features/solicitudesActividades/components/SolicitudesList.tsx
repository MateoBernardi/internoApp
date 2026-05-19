import { ThemedText } from '@/components/themed-text';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo } from 'react';
import {
    Alert,
    GestureResponderEvent,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { EstadoInvitacionDB, SolicitudEnviada, estadoInvitacionMapping } from '../models/Solicitud';
import { useOcultarSolicitudInvitado } from '../viewmodels/useSolicitudes';

const colors = Colors['light'];

function formatTipoSolicitud(tipo?: string): string {
    if (tipo === 'MANDATO') return 'Actividad';
    if (tipo === 'REUNION') return 'Reunión';
    if (tipo === 'CHAT') return 'Conversación';
    return tipo ?? 'Solicitud';
}

function mapEstado(estado: string): string {
    return estadoInvitacionMapping[estado as EstadoInvitacionDB] ?? estado;
}

function getTipoBadgeStyle(tipo?: string) {
    switch (tipo) {
        case 'MANDATO': return { borderColor: '#2563eb', backgroundColor: '#2563eb12', textColor: '#2563eb' };
        case 'REUNION': return { borderColor: '#7c3aed', backgroundColor: '#7c3aed12', textColor: '#7c3aed' };
        case 'CHAT': return { borderColor: '#0ea5e9', backgroundColor: '#0ea5e912', textColor: '#0ea5e9' };
        default: return { borderColor: '#6b7280', backgroundColor: '#6b728012', textColor: '#6b7280' };
    }
}

function getEstadoBadgeStyle(estado: string) {
    switch (estado) {
        case 'Pendiente': return { borderColor: '#9ca3af', backgroundColor: '#9ca3af12', textColor: '#6b7280' };
        case 'Visto': return { borderColor: '#2563eb', backgroundColor: '#2563eb12', textColor: '#2563eb' };
        case 'Modificado':
        case 'Modificado por creador': return { borderColor: '#f59e0b', backgroundColor: '#f59e0b12', textColor: '#b45309' };
        case 'Aceptado': return { borderColor: '#16a34a', backgroundColor: '#16a34a12', textColor: '#15803d' };
        case 'Rechazado': return { borderColor: '#dc2626', backgroundColor: '#dc262612', textColor: '#b91c1c' };
        case 'Actividad creada': return { borderColor: '#0f766e', backgroundColor: '#0f766e12', textColor: '#0f766e' };
        case 'Expirada': return { borderColor: '#64748b', backgroundColor: '#64748b12', textColor: '#475569' };
        default: return { borderColor: '#6b7280', backgroundColor: '#6b728012', textColor: '#6b7280' };
    }
}

const ESTADO_PRIORITY: Record<string, number> = {
    'Modificado': 0,
    'Modificado por creador': 1,
    'Pendiente': 2,
    'Visto': 3,
    'Aceptado': 4,
    'Rechazado': 5,
    'Actividad creada': 6,
    'Expirada': 7,
};

function getEstadoRelevante(solicitud: SolicitudEnviada): string {
    const estadoPropio = mapEstado(solicitud.estado);

    if (!solicitud.is_host) {
        return estadoPropio;
    }

    if (estadoPropio === 'Visto') {
        return 'Visto';
    }

    const invitados = solicitud.invitados.filter(inv => inv.user_id !== solicitud.created_by);

    if (invitados.length === 0) {
        return estadoPropio;
    }

    const estadosUI = invitados.map(inv => mapEstado(inv.estado ?? ''));
    return estadosUI.sort(
        (a, b) => (ESTADO_PRIORITY[a] ?? 99) - (ESTADO_PRIORITY[b] ?? 99)
    )[0];
}

function getContainerColor(estadoUI: string, isHost: boolean): string {
    const activos = isHost
        ? ['Modificado']
        : ['Pendiente', 'Modificado por creador'];
    return activos.includes(estadoUI) ? colors.componentBackground : colors.background;
}

interface SolicitudesListProps {
    solicitudes: SolicitudEnviada[];
    onRefresh?: () => Promise<void>;
    refreshing?: boolean;
    isLoading?: boolean;
    onOpenSolicitud: (solicitud: SolicitudEnviada) => void;
    emptyMessage?: string;
}

export function SolicitudesList({ solicitudes, onRefresh, refreshing, isLoading, onOpenSolicitud, emptyMessage }: SolicitudesListProps) {
    const { mutate: ocultarSolicitud, isPending: isHiding } = useOcultarSolicitudInvitado();

    const solicitudesDeduplicadas = useMemo(() => {
        const seen = new Set<number>();
        return solicitudes.filter(s => {
            if (seen.has(s.solicitud_id)) return false;
            seen.add(s.solicitud_id);
            return true;
        });
    }, [solicitudes]);

    const handleRefresh = useCallback(async () => {
        if (onRefresh) await onRefresh();
    }, [onRefresh]);

    const handleOcultar = useCallback((solicitudId: number) => {
        Alert.alert(
            'Ocultar solicitud',
            'Esta solicitud dejará de verse en tu lista. ¿Deseas continuar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Ocultar',
                    style: 'destructive',
                    onPress: () => ocultarSolicitud(
                        { solicitudId },
                        { onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo ocultar') }
                    ),
                },
            ]
        );
    }, [ocultarSolicitud]);

    if (isLoading && !refreshing) {
        return <ScreenSkeleton rows={6} showHeader={false} />;
    }

    if (solicitudesDeduplicadas.length === 0 && !refreshing) {
        const subtitle = emptyMessage ?? 'No tenés solicitudes';
        return (
            <View style={styles.centerContainer}>
                <ThemedText type="subtitle">{subtitle}</ThemedText>
                {!emptyMessage && (
                    <ThemedText style={{ color: colors.icon, marginTop: 8 }}>
                        Aquí aparecerán las solicitudes en las que participás
                    </ThemedText>
                )}
            </View>
        );
    }

    return (
        <ScrollView
            contentContainerStyle={{ paddingBottom: 140 }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing ?? false}
                    onRefresh={handleRefresh}
                    colors={[colors.lightTint]}
                    tintColor={colors.lightTint}
                />
            }
        >
            {solicitudesDeduplicadas.map((item, index) => (
                <React.Fragment key={item.solicitud_id.toString()}>
                    {index > 0 && (
                        <View style={styles.separator} />
                    )}
                    <SolicitudItem
                        solicitud={item}
                        onPress={() => onOpenSolicitud(item)}
                        onHide={() => handleOcultar(item.solicitud_id)}
                        isHiding={isHiding}
                    />
                </React.Fragment>
            ))}
        </ScrollView>
    );
}

interface SolicitudItemProps {
    solicitud: SolicitudEnviada;
    onPress: () => void;
    onHide: () => void;
    isHiding: boolean;
}

function SolicitudItem({ solicitud, onPress, onHide, isHiding }: SolicitudItemProps) {
    const estadoUI = useMemo(() => getEstadoRelevante(solicitud), [solicitud]);

    const contextoTexto = useMemo(() => {
        if (solicitud.is_host) {
            const destinatarios = solicitud.invitados
                .filter(inv => inv.user_id !== solicitud.created_by)
                .map(inv => [inv.invitado_nombre, inv.invitado_apellido].filter(Boolean).join(' ').trim())
                .filter(Boolean);
            return `Para: ${destinatarios.join(', ') || '—'}`;
        }
        return `De: ${solicitud.nombre_creador} ${solicitud.apellido_creador}`;
    }, [solicitud]);

    const tipoLabel = formatTipoSolicitud(solicitud.tipo_actividad);
    const tipoBadgeStyle = getTipoBadgeStyle(solicitud.tipo_actividad);
    const estadoBadgeStyle = getEstadoBadgeStyle(estadoUI);
    const containerColor = getContainerColor(estadoUI, solicitud.is_host);

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.itemContainer, { backgroundColor: containerColor }]}
        >
            <View style={styles.itemContent}>
                <ThemedText style={[styles.contexto, { color: colors.secondaryText }]} numberOfLines={1}>
                    {contextoTexto}
                </ThemedText>

                <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {solicitud.titulo}
                </ThemedText>

                <ThemedText numberOfLines={2} style={[styles.description, { color: colors.secondaryText }]}>
                    {solicitud.descripcion}
                </ThemedText>

                <View style={styles.badgeRow}>
                    <View style={[styles.badge, { borderColor: tipoBadgeStyle.borderColor, backgroundColor: tipoBadgeStyle.backgroundColor }]}>
                        <ThemedText style={[styles.badgeText, { color: tipoBadgeStyle.textColor }]}>{tipoLabel}</ThemedText>
                    </View>
                    <View style={[styles.badge, { borderColor: estadoBadgeStyle.borderColor, backgroundColor: estadoBadgeStyle.backgroundColor }]}>
                        <ThemedText style={[styles.badgeText, { color: estadoBadgeStyle.textColor }]}>{estadoUI}</ThemedText>
                    </View>
                </View>

                <View style={styles.footerContainer}>
                    <ThemedText style={[styles.dateText, { color: colors.secondaryText }]}>
                        {solicitud.fecha_inicio
                            ? new Date(solicitud.fecha_inicio).toLocaleDateString('es-AR')
                            : 'Sin fecha'}
                    </ThemedText>

                    {!solicitud.is_host && (
                        <TouchableOpacity
                            onPress={(e: GestureResponderEvent) => { e.stopPropagation(); onHide(); }}
                            disabled={isHiding}
                            style={[styles.hideButton, isHiding && styles.hideButtonDisabled]}
                        >
                            <Ionicons name="trash-outline" size={15} color={colors.error} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: '4%',
        paddingVertical: 100,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.secondaryText,
        marginHorizontal: '4%',
        opacity: 0.3
    },
    itemContainer: {
        marginHorizontal: '4%',
        marginVertical: 4,
        paddingHorizontal: '3%',
        paddingVertical: '3%',
        borderRadius: 12,
    },
    itemContent: {
        flexDirection: 'column',
    },
    contexto: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    description: {
        fontSize: 13,
        marginTop: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    dateText: {
        fontSize: 12,
    },
    hideButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.error + '14',
    },
    hideButtonDisabled: {
        opacity: 0.6,
    },
});