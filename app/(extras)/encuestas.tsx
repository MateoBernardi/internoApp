import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Encuestas } from '@/features/encuestas/views/Encuestas';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Redirect } from 'expo-router';
import { StyleSheet } from 'react-native';

const ROLES_FULL_ACCESS = ['gerencia', 'encargado', 'contable', 'personasRelaciones', 'consejo', 'presidencia'] as const;

export default function EncuestasScreen() {
  const { user } = useAuth();
  const { hasRole } = useRoleCheck();

  // Esperar a que el rol esté cargado antes de decidir si redirigir.
  // Si se redirige con user === null el consejo queda bloqueado en el primer render.
  if (user?.rol_nombre && !hasRole([...ROLES_FULL_ACCESS])) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ThemedView style={styles.container}>
      <Encuestas />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
