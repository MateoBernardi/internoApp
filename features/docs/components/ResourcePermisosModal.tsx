import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { ResourcePermisos } from '../models/Permisos';

const colors = Colors.light;

type ResourcePermisosModalProps = {
  visible: boolean;
  title: string;
  isLoading: boolean;
  data?: ResourcePermisos;
  errorMessage?: string;
  onClose: () => void;
};

export function ResourcePermisosModal({
  visible,
  title,
  isLoading,
  data,
  errorMessage,
  onClose,
}: ResourcePermisosModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.tint} />
              <ThemedText style={styles.secondaryText}>Cargando permisos...</ThemedText>
            </View>
          ) : errorMessage ? (
            <View style={styles.loadingContainer}>
              <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
            </View>
          ) : data ? (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Roles permitidos</ThemedText>
                <ThemedText style={styles.valueText}>
                  {data.allowed_roles.length > 0 ? data.allowed_roles.join(', ') : 'Sin roles asignados'}
                </ThemedText>
              </View>

              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Usuarios permitidos</ThemedText>
                <ThemedText style={styles.valueText}>
                  {data.allowed_users.length > 0 ? data.allowed_users.join(', ') : 'Sin usuarios asignados'}
                </ThemedText>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.loadingContainer}>
              <ThemedText style={styles.secondaryText}>No hay permisos para mostrar.</ThemedText>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'center',
    paddingHorizontal: '6%',
  },
  card: {
    backgroundColor: colors.componentBackground,
    borderRadius: 12,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.icon,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondaryText,
  },
  valueText: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  secondaryText: {
    color: colors.secondaryText,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
});
