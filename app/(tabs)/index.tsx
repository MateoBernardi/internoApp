import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import TablonNovedades from '@/features/Novedades/views/TablonNovedades';
import { useAuth } from '@/features/auth/context/AuthContext';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const { user, userContext } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Tablón de Novedades
        </ThemedText>
        {user && (
          <Text style={styles.welcomeText}>
            Bienvenido, {user.nombre || user.username}
          </Text>
        )}
      </View>
      
      <TablonNovedades />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
