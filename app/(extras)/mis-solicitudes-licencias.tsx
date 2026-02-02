import { ThemedView } from '@/components/themed-view';
import { MisSolicitudes } from '@/features/solicitudesLicencias/components/MisSolicitudes';
import { StyleSheet } from 'react-native';

export default function DocumentosScreen() {
  return (
        <ThemedView style={styles.container}>
          <MisSolicitudes />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});