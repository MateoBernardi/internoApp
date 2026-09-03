import { ThemedText } from '@/components/themed-text';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
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
import { getGroupSeenState, tieneNovedadSinVer } from '../badgeState';
import { buildUltimoMensajePreview } from '../conversacion/constants';
import { useCancelarSolicitud, useOcultarSolicitudInvitado } from '../viewmodels/useSolicitudes';

const colors = Colors['light'];

function mapEstado(estado: string): string {
    return estadoInvitacionMapping[estado as EstadoInvitacionDB] ?? estado;
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

function getContainerColor(isUnseen: boolean): string {
    // Sin ver = requiere acción: card más blanca/opaca para resaltar. Vista =
    // sin acción pendiente: queda en su apariencia glass normal, NUNCA atenuada
    // (una opacidad baja en todo el contenido se leía como "deshabilitado").
    return isUnseen ? '#ffffff' : 'rgba(255,255,255,0.6)';
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
    const { user } = useAuth();
    const currentUserId = user?.user_context_id;
    const { mutate: ocultarSolicitud, isPending: isHiding } = useOcultarSolicitudInvitado();
    const { mutate: cancelarSolicitud, isPending: isCancelling } = useCancelarSolicitud();

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

    const handleCancelar = useCallback((solicitudId: number) => {
        Alert.alert(
            'Cancelar solicitud',
            '¿Deseas cancelar esta solicitud?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: () => cancelarSolicitud(
                        { solicitudId },
                        { onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo cancelar') }
                    ),
                },
            ]
        );
    }, [cancelarSolicitud]);

    // --- FILTROS (derivados de la página actual) ---
    const [showFilters, setShowFilters] = useState(false);
    const [rolFilter, setRolFilter] = useState<string[]>([]);
    const [estadoFilter, setEstadoFilter] = useState<string[]>([]);

    const estadoOptions = useMemo(() => {
        const base = solicitudesDeduplicadas.map(getEstadoRelevante);
        const defaultEstados = [
            estadoInvitacionMapping.MODIFIED,
            estadoInvitacionMapping.MODIFIED_BY_HOST,
        ];
        return Array.from(new Set([...defaultEstados, ...base]));
    }, [solicitudesDeduplicadas]);

    const solicitudesFiltradas = useMemo(
        () => solicitudesDeduplicadas.filter(s => {
            const rol = s.is_host ? 'host' : 'guest';
            const rolOk = rolFilter.length === 0 || rolFilter.includes(rol);
            const estadoOk = estadoFilter.length === 0 || estadoFilter.includes(getEstadoRelevante(s));
            return rolOk && estadoOk;
        }),
        [solicitudesDeduplicadas, rolFilter, estadoFilter],
    );

    const activeFilterCount = rolFilter.length + estadoFilter.length;

    const toggleValue = useCallback(
        (setFn: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
            setFn(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
        },
        [],
    );
    const clearFilters = useCallback(() => {
        setRolFilter([]);
        setEstadoFilter([]);
    }, []);

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
        <View style={styles.wrapper}>
            {/* Barra de filtros */}
            <View style={styles.filterBar}>
                <TouchableOpacity
                    onPress={() => setShowFilters(v => !v)}
                    style={[
                        styles.filterToggle,
                        activeFilterCount > 0 ? styles.filterToggleActive : styles.filterToggleInactive,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Filtrar"
                >
                    <Ionicons
                        name="filter-outline"
                        size={20}
                        color={activeFilterCount > 0 ? glassColors.link : glassColors.textMuted}
                    />
                    <ThemedText
                        style={[
                            styles.filterToggleText,
                            activeFilterCount > 0 ? styles.filterToggleTextActive : styles.filterToggleTextInactive,
                        ]}
                    >
                        Filtrar
                    </ThemedText>
                    {activeFilterCount > 0 && (
                        <View style={styles.filterBadge}>
                            <ThemedText style={styles.filterBadgeText}>{activeFilterCount}</ThemedText>
                        </View>
                    )}
                </TouchableOpacity>
                {activeFilterCount > 0 && (
                    <TouchableOpacity onPress={clearFilters}>
                        <ThemedText style={styles.clearText}>Limpiar</ThemedText>
                    </TouchableOpacity>
                )}
            </View>

            {showFilters && (
                <View style={styles.filterPanel}>
                    <View style={styles.filterGroup}>
                        <ThemedText style={styles.filterGroupLabel}>Rol</ThemedText>
                        <View style={styles.chipRow}>
                            <FilterChip label="Anfitrión" active={rolFilter.includes('host')} onPress={() => toggleValue(setRolFilter, 'host')} />
                            <FilterChip label="Invitado" active={rolFilter.includes('guest')} onPress={() => toggleValue(setRolFilter, 'guest')} />
                        </View>
                    </View>

                    {estadoOptions.length > 0 && (
                        <View style={styles.filterGroup}>
                            <ThemedText style={styles.filterGroupLabel}>Estado</ThemedText>
                            <View style={styles.chipRow}>
                                {estadoOptions.map(e => (
                                    <FilterChip key={e} label={e} active={estadoFilter.includes(e)} onPress={() => toggleValue(setEstadoFilter, e)} />
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            )}

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
                {solicitudesFiltradas.length === 0 ? (
                    <View style={styles.noResults}>
                        <ThemedText style={{ color: colors.icon }}>Sin resultados para los filtros</ThemedText>
                    </View>
                ) : (
                    solicitudesFiltradas.map((item) => (
                        <SolicitudItem
                            key={item.solicitud_id.toString()}
                            solicitud={item}
                            currentUserId={currentUserId}
                            onPress={() => onOpenSolicitud(item)}
                            onHide={() => handleOcultar(item.solicitud_id)}
                            isHiding={isHiding}
                            onCancel={() => handleCancelar(item.solicitud_id)}
                            isCancelling={isCancelling}
                        />
                    ))
                )}
            </ScrollView>
        </View>
    );
}

interface FilterChipProps {
    label: string;
    active: boolean;
    onPress: () => void;
}

function FilterChip({ label, active, onPress }: FilterChipProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.filterChip, active && styles.filterChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
        >
            <ThemedText style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</ThemedText>
        </TouchableOpacity>
    );
}

interface SolicitudItemProps {
    solicitud: SolicitudEnviada;
    currentUserId?: number;
    onPress: () => void;
    onHide: () => void;
    isHiding: boolean;
    onCancel: () => void;
    isCancelling: boolean;
}

function SolicitudItem({ solicitud, currentUserId, onPress, onHide, isHiding, onCancel, isCancelling }: SolicitudItemProps) {
    const estadoUI = useMemo(() => getEstadoRelevante(solicitud), [solicitud]);
    const puedeCancelar = solicitud.is_host
        && solicitud.estado === 'SENT'
        && (!solicitud.fecha_inicio || new Date(solicitud.fecha_inicio) > new Date());

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

    const estadoBadgeStyle = getEstadoBadgeStyle(estadoUI);
    const isUnseen = tieneNovedadSinVer(solicitud);
    const containerColor = getContainerColor(isUnseen);

    // Flecha enviado/recibido: solo si el backend informó quién mandó la
    // última entrada. Sin ese dato no se muestra (degrada al preview simple).
    // Enviado = flecha arriba, recibido = flecha abajo (misma dirección que
    // en Chats).
    const sentByMe = solicitud.ultimo_mensaje_autor_id != null && currentUserId != null
        ? solicitud.ultimo_mensaje_autor_id === currentUserId
        : null;

    const descripcionPreview = useMemo(
        () => buildUltimoMensajePreview(solicitud, currentUserId),
        [solicitud, currentUserId],
    );

    // Marca de visto: solo en grupos (más de 2 participantes) y solo sobre lo
    // que yo mandé, igual que en los mensajes individuales del chat.
    const groupSeenState = solicitud.invitados.length > 2 ? getGroupSeenState(solicitud) : null;
    const showSeenMark = sentByMe === true && groupSeenState !== null;

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.itemContainer, { backgroundColor: containerColor }]}
        >
            <View style={styles.itemContent}>
                <ThemedText style={[styles.contexto, { color: colors.secondaryText }]} numberOfLines={1}>
                    {contextoTexto}
                </ThemedText>

                <View style={styles.tituloRow}>
                    <ThemedText
                        type={isUnseen ? 'defaultSemiBold' : 'default'}
                        numberOfLines={1}
                        style={[isUnseen ? styles.tituloUnseen : styles.tituloSeen, styles.tituloText]}
                    >
                        {solicitud.titulo}
                    </ThemedText>
                    {isUnseen && <View style={styles.stateDot} />}
                </View>

                {!!descripcionPreview && (
                    <View style={styles.descriptionRow}>
                        {sentByMe !== null && (
                            <Ionicons
                                name={sentByMe ? 'arrow-up-outline' : 'arrow-down-outline'}
                                size={12}
                                color={colors.secondaryText}
                            />
                        )}
                        {descripcionPreview.icon && (
                            <Ionicons name={descripcionPreview.icon as any} size={13} color={colors.secondaryText} />
                        )}
                        <ThemedText numberOfLines={1} style={[styles.description, { color: colors.secondaryText, flex: 1 }]}>
                            {descripcionPreview.text}
                        </ThemedText>
                        {showSeenMark && (
                            <Ionicons
                                name={groupSeenState === 'all' ? 'checkmark-done' : 'checkmark'}
                                size={14}
                                color={groupSeenState === 'all' ? colors.lightTint : colors.secondaryText}
                            />
                        )}
                    </View>
                )}

                <View style={styles.badgeRow}>
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

                    {!solicitud.is_host ? (
                        <TouchableOpacity
                            onPress={(e: GestureResponderEvent) => { e.stopPropagation(); onHide(); }}
                            disabled={isHiding}
                            style={[styles.hideButton, isHiding && styles.hideButtonDisabled]}
                        >
                            <Ionicons name="trash-outline" size={15} color={colors.error} />
                        </TouchableOpacity>
                    ) : puedeCancelar ? (
                        <TouchableOpacity
                            onPress={(e: GestureResponderEvent) => { e.stopPropagation(); onCancel(); }}
                            disabled={isCancelling}
                            style={[styles.hideButton, isCancelling && styles.hideButtonDisabled]}
                        >
                            <Ionicons name="close-circle-outline" size={16} color={colors.error} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
    },
    filterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: '4%',
        paddingVertical: 6,
    },
    filterToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
    },
    filterToggleText: {
        fontSize: 13,
        fontWeight: '600',
    },
    filterToggleActive: {
        borderColor: 'rgba(26,115,232,0.35)',
        backgroundColor: 'rgba(26,115,232,0.12)',
    },
    filterToggleInactive: {
        borderColor: 'rgba(17,24,28,0.12)',
        backgroundColor: 'rgba(17,24,28,0.03)',
    },
    filterToggleTextActive: {
        color: glassColors.link,
    },
    filterToggleTextInactive: {
        color: glassColors.textMuted,
    },
    filterBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        backgroundColor: glassColors.link,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
    clearText: {
        fontSize: 13,
        fontWeight: '600',
        color: glassColors.link,
    },
    filterPanel: {
        marginHorizontal: '4%',
        marginBottom: 6,
        padding: 12,
        gap: 10,
        ...glassStyles.card,
    },
    filterGroup: {
        gap: 6,
    },
    filterGroupLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.secondaryText,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(17,24,28,0.12)',
        backgroundColor: 'rgba(17,24,28,0.03)',
    },
    filterChipActive: {
        borderColor: 'rgba(26,115,232,0.35)',
        backgroundColor: 'rgba(26,115,232,0.12)',
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: glassColors.textMuted,
    },
    filterChipTextActive: {
        color: glassColors.link,
    },
    noResults: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: '4%',
        paddingVertical: 100,
    },
    itemContainer: {
        marginHorizontal: '4%',
        marginVertical: 4,
        paddingHorizontal: '3%',
        paddingVertical: '3%',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(17,24,28,0.08)',
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    itemContent: {
        flexDirection: 'column',
    },
    tituloRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tituloText: {
        flex: 1,
    },
    stateDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.error,
        flexShrink: 0,
    },
    tituloUnseen: {
        color: '#000000',
    },
    tituloSeen: {
        color: colors.secondaryText,
        fontWeight: '400',
    },
    contexto: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    descriptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    description: {
        fontSize: 13,
        flexShrink: 1,
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
        backgroundColor: 'rgba(244,67,54,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(244,67,54,0.35)',
    },
    hideButtonDisabled: {
        opacity: 0.6,
    },
});