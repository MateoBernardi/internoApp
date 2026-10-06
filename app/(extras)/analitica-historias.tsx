import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Analitica } from '@/features/historias/views/Analitica';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Redirect } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function AnaliticaHistoriasScreen() {
  const { user } = useAuth();
  const { hasRole } = useRoleCheck();

  // Esperar a que el rol esté cargado antes de redirigir (mismo patrón que encuestas).
  if (user?.rol_nombre && !hasRole(['gerencia', 'personasRelaciones'])) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ThemedView style={styles.container}>
      <Analitica />
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
