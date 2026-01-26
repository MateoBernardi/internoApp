import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/context/AuthContext';
import { KanbanBoard } from '@/features/kanban/views/KanbanBoard';
import TablonNovedades from '@/features/novedades/views/TablonNovedades';
import SolicitudesView from '@/features/solicitudesActividades/views/Solicitudes';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { StyleSheet } from 'react-native';

export default function HomeScreen() {
  const { user } = useAuth();
  const { isEmployeeOrEncargado } = useRoleCheck();

  return (
    <ThemedView style={styles.container}>
      <TablonNovedades />
      {isEmployeeOrEncargado() ? (
        <SolicitudesView />
      ) : (
        <KanbanBoard />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});
