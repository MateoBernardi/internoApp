import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = Colors.light;

export interface DocumentOptionAction {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void | Promise<void>;
  destructive?: boolean;
}

interface DocumentOptionsModalProps {
  visible: boolean;
  fileName: string;
  title?: string;
  actions: DocumentOptionAction[];
  onClose: () => void;
}

export function DocumentOptionsModal({ visible, fileName, title = 'Opciones de archivo', actions, onClose }: DocumentOptionsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>{title}</ThemedText>
              <ThemedText style={styles.subtitle} numberOfLines={1}>{fileName}</ThemedText>
            </View>

            <View style={styles.actionsContainer}>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.key}
                  style={styles.actionButton}
                  onPress={() => {
                    onClose();
                    action.onPress();
                  }}
                >
                  <Ionicons
                    name={action.icon}
                    size={18}
                    color={action.destructive ? colors.error : colors.icon}
                  />
                  <ThemedText style={[styles.actionText, action.destructive && styles.actionTextDestructive]}>
                    {action.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <ThemedText style={styles.cancelText}>Cancelar</ThemedText>
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
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.componentBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 12,
  },
  header: {
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  actionsContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.icon,
  },
  actionButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.icon,
    backgroundColor: colors.componentBackground,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  actionTextDestructive: {
    color: colors.error,
  },
  cancelButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.icon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
