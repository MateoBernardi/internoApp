import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

const colors = Colors.light;

type PartialSaveBannerProps = {
  message: string;
  onClose: () => void;
};

export function PartialSaveBanner({ message, onClose }: PartialSaveBannerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="warning-outline" size={18} color={colors.warning} />
          <ThemedText style={styles.title}>Guardado parcial</ThemedText>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={18} color={colors.secondaryText} />
        </TouchableOpacity>
      </View>
      <ThemedText style={styles.message}>{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F6D58E',
    backgroundColor: '#FFF7E6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontWeight: '700',
    color: colors.warning,
  },
  closeButton: {
    padding: 2,
  },
  message: {
    fontSize: 13,
    color: colors.text,
  },
});
