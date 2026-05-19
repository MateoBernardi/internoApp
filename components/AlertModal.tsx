import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import React from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';

export type AlertModalAction = {
    key: string;
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'destructive' | 'neutral';
};

interface AlertModalProps {
    visible: boolean;
    title: string;
    message?: string;
    actions: AlertModalAction[];
    onClose: () => void;
}

const colors = Colors.light;

export function AlertModal({ visible, title, message, actions, onClose }: AlertModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.card} onPress={() => { }}>
                    <View style={styles.header}>
                        <ThemedText style={styles.title}>{title}</ThemedText>
                        {message ? <ThemedText style={styles.message}>{message}</ThemedText> : null}
                    </View>

                    <View style={styles.actions}>
                        {actions.map((action) => {
                            const buttonStyles: StyleProp<ViewStyle>[] = [styles.actionButton];
                            const textStyles: StyleProp<TextStyle>[] = [styles.actionText];

                            if (action.variant === 'primary') {
                                buttonStyles.push(styles.actionPrimary);
                                textStyles.push(styles.actionPrimaryText);
                            }

                            if (action.variant === 'destructive') {
                                buttonStyles.push(styles.actionDestructive);
                                textStyles.push(styles.actionDestructiveText);
                            }

                            return (
                                <TouchableOpacity
                                    key={action.key}
                                    style={buttonStyles}
                                    onPress={action.onPress}
                                >
                                    <ThemedText style={textStyles}>{action.label}</ThemedText>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 16,
        backgroundColor: colors.componentBackground,
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 20,
        gap: 18,
    },
    header: {
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    message: {
        fontSize: 14,
        color: colors.secondaryText,
    },
    actions: {
        gap: 10,
    },
    actionButton: {
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    actionPrimary: {
        backgroundColor: colors.lightTint,
    },
    actionPrimaryText: {
        color: colors.componentBackground,
    },
    actionDestructive: {
        backgroundColor: colors.error,
    },
    actionDestructiveText: {
        color: colors.componentBackground,
    },
});
