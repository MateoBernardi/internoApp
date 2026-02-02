import { ThemedView } from '@/components/themed-view';
import SolicitudesLicenciasView from '@/features/solicitudesLicencias/views/SolicitudesLicencias';
import { StyleSheet } from 'react-native';

export default function DocumentosScreen() {
  return (
        <ThemedView style={styles.container}>
          <SolicitudesLicenciasView />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});