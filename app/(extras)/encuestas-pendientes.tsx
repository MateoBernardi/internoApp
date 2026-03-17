import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { ListaEncuestasPendientes } from '@/features/encuestas/components/ListaEncuestasPendientes';
import React from 'react';
import { StyleSheet } from 'react-native';

const colors = Colors.light;

export default function EncuestasPendientesScreen() {
  return (
    <ThemedView style={styles.container} lightColor={colors.componentBackground}>
      <ListaEncuestasPendientes />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
