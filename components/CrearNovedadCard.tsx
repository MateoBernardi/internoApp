import { CreateButton } from '@/components/ui/CreateButton';
import { glassStyles } from '@/shared/ui/glass';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface CrearNovedadCardProps {
  onPress: () => void;
}

export function CrearNovedadCard({ onPress }: CrearNovedadCardProps) {
  return (
    <View style={styles.container}>
      <View style={[glassStyles.card, styles.card]}>
        <CreateButton onPress={onPress} accessibilityLabel="Nueva novedad" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 132,
    minHeight: 92,
    marginRight: 10,
  },
  card: {
    flex: 1,
    minHeight: 92,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
});
