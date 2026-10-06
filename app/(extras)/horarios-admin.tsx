import { useAuth } from '@/features/auth/context/AuthContext';
import { HorariosHome } from '@/features/horarios/views/HorariosHome';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function HorariosAdminScreen() {
  const { user } = useAuth();
  const { canVerHorasCumplidas } = useRoleCheck();

  // Esperar a que el rol esté cargado antes de decidir si redirigir (ver encuestas.tsx).
  if (user?.rol_nombre && !canVerHorasCumplidas()) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.container}>
      <HorariosHome />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
