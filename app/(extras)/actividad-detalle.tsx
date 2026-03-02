import { ThemedView } from '@/components/themed-view';
import { ActividadDetalle } from '@/features/solicitudesActividades/views/ActividadDetalle';
import { StyleSheet } from 'react-native';

export default function ActividadDetalleScreen() {
  return (
    <ThemedView style={styles.container}>
      <ActividadDetalle />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});
