import { ThemedText } from '@/components/themed-text';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { glassColors } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { SolicitudEnviada } from '../models/Solicitud';
import { tieneNovedadSinVer } from '../badgeState';
import { buildUltimoMensajePreview, formatListTimestamp } from '../conversacion/constants';

const colors = Colors['light'];

function getChatDisplayName(solicitud: SolicitudEnviada, currentUserId?: number): string {
    if (!solicitud.es_grupo) {
        const otro = solicitud.invitados.find(inv => inv.user_id !== currentUserId);
        const nombre = otro
            ? [otro.invitado_nombre, otro.invitado_apellido].filter(Boolean).join(' ').trim()
            : '';
        return nombre || solicitud.titulo;
    }
    return solicitud.titulo;
}

interface ChatsListProps {
    chats: SolicitudEnviada[];
    onRefresh?: () => Promise<void>;
    refreshing?: boolean;
    isLoading?: boolean;
    onOpenChat: (chat: SolicitudEnviada) => void;
    emptyMessage?: string;
}

export function ChatsList({ chats, onRefresh, refreshing, isLoading, onOpenChat, emptyMessage }: ChatsListProps) {
    const { user } = useAuth();
    const currentUserId = user?.user_context_id;

    const chatsDeduplicados = useMemo(() => {
        const seen = new Set<number>();
        return chats.filter(c => {
            if (seen.has(c.solicitud_id)) return false;
            seen.add(c.solicitud_id);
            return true;
        });
    }, [chats]);

    const handleRefresh = useCallback(async () => {
        if (onRefresh) await onRefresh();
    }, [onRefresh]);

    if (isLoading && !refreshing) {
        return <ScreenSkeleton rows={6} showHeader={false} />;
    }

    if (chatsDeduplicados.length === 0 && !refreshing) {
        const subtitle = emptyMessage ?? 'No tenés conversaciones';
        return (
            <View style={styles.centerContainer}>
                <ThemedText type="subtitle">{subtitle}</ThemedText>
                {!emptyMessage && (
                    <ThemedText style={{ color: colors.icon, marginTop: 8 }}>
                        Aquí aparecerán tus conversaciones
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
            {chatsDeduplicados.map((item) => (
                <ChatItem
                    key={item.solicitud_id.toString()}
                    chat={item}
                    displayName={getChatDisplayName(item, currentUserId)}
                    hasBadge={tieneNovedadSinVer(item)}
                    currentUserId={currentUserId}
                    onPress={() => onOpenChat(item)}
                />
            ))}
        </ScrollView>
    );
}

interface ChatItemProps {
    chat: SolicitudEnviada;
    displayName: string;
    hasBadge: boolean;
    currentUserId?: number;
    onPress: () => void;
}

function ChatItem({ chat, displayName, hasBadge, currentUserId, onPress }: ChatItemProps) {
    const inicial = displayName.charAt(0).toUpperCase();
    const preview = buildUltimoMensajePreview(chat, currentUserId);

    // Flecha enviado/recibido: solo si el backend informó quién mandó la
    // última entrada. Sin ese dato no se muestra (degrada al preview simple).
    const sentByMe = chat.ultimo_mensaje_autor_id != null && currentUserId != null
        ? chat.ultimo_mensaje_autor_id === currentUserId
        : null;
    const timeLabel = chat.ultimo_mensaje_at ? formatListTimestamp(new Date(chat.ultimo_mensaje_at)) : null;

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.itemContainer, { backgroundColor: hasBadge ? '#ffffff' : 'rgba(255,255,255,0.6)' }]}
        >
            <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>{inicial}</ThemedText>
            </View>
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <ThemedText
                        type="defaultSemiBold"
                        numberOfLines={1}
                        style={[styles.itemTitle, hasBadge && styles.tituloUnseen]}
                    >
                        {displayName}
                    </ThemedText>
                    {!!timeLabel && (
                        <ThemedText style={[styles.dateText, { color: colors.secondaryText }]}>
                            {timeLabel}
                        </ThemedText>
                    )}
                    {hasBadge && <View style={styles.stateDot} />}
                    <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
                </View>
                {chat.invitados.length > 2 && (
                    <ThemedText
                        style={[styles.invitadoName, { color: colors.secondaryText }]}
                        numberOfLines={1}
                    >
                        {chat.invitados
                            .slice(0, 3)
                            .map(inv => [inv.invitado_nombre, inv.invitado_apellido].filter(Boolean).join(' ').trim())
                            .join(', ')}
                        {chat.invitados.length > 3 ? `, ${chat.invitados.length - 3}+` : ''}
                    </ThemedText>
                )}
                {!!preview && (
                    <View style={styles.previewRow}>
                        {sentByMe !== null && (
                            <Ionicons
                                name={sentByMe ? 'arrow-up-outline' : 'arrow-down-outline'}
                                size={12}
                                color={colors.secondaryText}
                            />
                        )}
                        {preview.icon && (
                            <Ionicons name={preview.icon as any} size={13} color={colors.secondaryText} />
                        )}
                        <ThemedText
                            style={[styles.preview, hasBadge ? styles.previewUnseen : { color: colors.secondaryText }]}
                            numberOfLines={1}
                        >
                            {preview.text}
                        </ThemedText>
                    </View>
                )}
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
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
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
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(26,115,232,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(26,115,232,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: glassColors.link,
    },
    itemContent: {
        flex: 1,
        flexDirection: 'column',
    },
    tituloUnseen: {
        color: '#000000',
    },
    previewUnseen: {
        color: '#000000',
        fontWeight: '600',
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    itemTitle: {
        flex: 1,
    },
    stateDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.error,
        flexShrink: 0,
    },
    invitadoName: {
        marginTop: 4,
        fontSize: 12,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    preview: {
        fontSize: 13,
        flexShrink: 1,
    },
    dateText: {
        fontSize: 12,
    },
});
