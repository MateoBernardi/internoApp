import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CrearNovedadCardProps {
  onPress: () => void;
}

export function CrearNovedadCard({ onPress }: CrearNovedadCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.iconContainer}>
          <Text style={styles.plusIcon}>+</Text>
        </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 60,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderStyle: 'dashed',
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
