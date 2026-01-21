import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CrearNovedadCardProps {
  onPress: () => void;
}

export function CrearNovedadCard({ onPress }: CrearNovedadCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.plusIcon}>+</Text>
        </View>
        <Text style={styles.label}>Nueva Novedad</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    marginHorizontal: 8,
  },
  card: {
    height: 130,
    borderRadius: 12,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    fontSize: 32,
    color: '#6b7280',
    fontWeight: '300',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
});
