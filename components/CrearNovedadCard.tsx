import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const REFERENCE_WIDTH = 375;
const scale = (size: number) => Math.round(size * (width / REFERENCE_WIDTH));

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
        <Text style={styles.label}>Nueva</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: scale(60),
    marginHorizontal: scale(4),
  },
  card: {
    height: scale(110),
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(6),
  },
  iconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    fontSize: scale(22),
    color: '#6b7280',
    fontWeight: '300',
    marginTop: -1,
  },
  label: {
    fontSize: scale(10),
    fontWeight: '600',
    color: '#6b7280',
  },
});
