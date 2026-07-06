import { ThemedText } from '@/components/themed-text';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
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
            {chatsDeduplicados.map((item, index) => (
                <React.Fragment key={item.solicitud_id.toString()}>
                    {index > 0 && <View style={styles.separator} />}
                    <ChatItem
                        chat={item}
                        displayName={getChatDisplayName(item, currentUserId)}
                        hasBadge={tieneNovedadSinVer(item)}
                        onPress={() => onOpenChat(item)}
                    />
                </React.Fragment>
            ))}
        </ScrollView>
    );
}

interface ChatItemProps {
    chat: SolicitudEnviada;
    displayName: string;
    hasBadge: boolean;
    onPress: () => void;
}

function ChatItem({ chat, displayName, hasBadge, onPress }: ChatItemProps) {
    const inicial = displayName.charAt(0).toUpperCase();

    return (
        <TouchableOpacity onPress={onPress} style={styles.itemContainer}>
            <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>{inicial}</ThemedText>
            </View>
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.itemTitle}>
                        {displayName}
                    </ThemedText>
                    {hasBadge && <View style={styles.stateDot} />}
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
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
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
        opacity: 0.3,
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
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.lightTint + '22',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.lightTint,
    },
    itemContent: {
        flex: 1,
        flexDirection: 'column',
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
    preview: {
        fontSize: 13,
        marginTop: 2,
    },
    dateText: {
        fontSize: 12,
    },
});
