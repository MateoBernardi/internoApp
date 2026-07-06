import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ListaEncuestasPendientes } from '@/features/encuestas/components/ListaEncuestasPendientes';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Redirect } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

const colors = Colors.light;

export default function EncuestasPendientesScreen() {
  const { user } = useAuth();
  const { canRespondEncuestas } = useRoleCheck();

  // Esperar a que el rol esté cargado antes de decidir si redirigir.
  if (user?.rol_nombre && !canRespondEncuestas()) {
    return <Redirect href="/(tabs)" />;
  }

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
