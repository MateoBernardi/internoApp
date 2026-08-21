import { ThemedText } from '@/components/themed-text';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
              {!!fileName && (
                <ThemedText style={styles.subtitle} numberOfLines={1}>{fileName}</ThemedText>
              )}
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
                    color={action.destructive ? glassColors.error : glassColors.link}
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
    ...glassStyles.modalOverlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    color: glassColors.textMuted,
  },
  actionsContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.08)',
  },
  actionButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17,24,28,0.08)',
    backgroundColor: '#ffffff',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  actionTextDestructive: {
    color: glassColors.error,
  },
  cancelButton: {
    minHeight: 44,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: glassColors.text,
  },
});
