import { ThemedView } from '@/components/themed-view';
import SolicitudesView from '@/features/solicitudesActividades/views/Solicitudes';
import { StyleSheet } from 'react-native';


export default function TabTwoScreen() {
  return (
      <ThemedView style={styles.container}>
        <SolicitudesView />
      </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});
