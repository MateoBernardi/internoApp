import { ThemedView } from '@/components/themed-view';
import { MisSolicitudes } from '@/features/solicitudesLicencias/components/MisSolicitudes';
import { StyleSheet } from 'react-native';

export default function MisSolicitudesLicenciasScreen() {
  return (
        <ThemedView style={styles.container} lightColor="#ffffff">
          <MisSolicitudes />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});