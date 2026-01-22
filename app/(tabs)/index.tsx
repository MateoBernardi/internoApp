import { ThemedView } from '@/components/themed-view';
import TablonNovedades from '@/features/Novedades/views/TablonNovedades';
import { KanbanBoard } from '@/features/Kanban/views/KanbanBoard';
import { useAuth } from '@/features/auth/context/AuthContext';
import { StyleSheet } from 'react-native';

export default function HomeScreen() {
  const { user } = useAuth();
  return (
    <ThemedView style={styles.container}>
      <TablonNovedades />
      <KanbanBoard />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '15%',
  },
  title: {
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
