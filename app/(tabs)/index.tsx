import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/context/AuthContext';
import { EncuestasPendientes } from '@/features/encuestas/components/EncuestasPendientes';
import { KanbanBoard } from '@/features/kanban/views/KanbanBoard';
import TablonNovedades from '@/features/novedades/views/TablonNovedades';
import SolicitudesView from '@/features/solicitudesActividades/views/Solicitudes';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function HomeScreen() {
  const { user } = useAuth();
  const { isEmployeeOrEncargado } = useRoleCheck();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <TablonNovedades />
        <EncuestasPendientes />
        <View style={styles.mainSection}>
          {isEmployeeOrEncargado() ? (
            <SolicitudesView />
          ) : (
            <KanbanBoard />
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainSection: {
    minHeight: SCREEN_HEIGHT * 0.7,
  },
});
