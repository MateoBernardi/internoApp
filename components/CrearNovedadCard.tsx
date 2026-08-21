import { CreateButton } from '@/components/ui/CreateButton';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface CrearNovedadCardProps {
  onPress: () => void;
}

export function CrearNovedadCard({ onPress }: CrearNovedadCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <CreateButton onPress={onPress} accessibilityLabel="Nueva novedad" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 132,
    minHeight: 88,
  },
  card: {
    flex: 1,
    minHeight: 88,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#C7D0DA',
  },
});
