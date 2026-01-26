import { ThemedView } from '@/components/themed-view';
import AgendaPersonal from '@/features/solicitudesActividades/views/AgendaPersonal';
import { StyleSheet } from 'react-native';

export default function DocumentosScreen() {
  return (
        <ThemedView style={styles.container}>
          <AgendaPersonal />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});