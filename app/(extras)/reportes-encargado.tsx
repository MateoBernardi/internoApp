import { ThemedView } from '@/components/themed-view';
import CrearReporteEncargado from '@/features/reportes/views/CrearReporteEncargado';
import { StyleSheet } from 'react-native';

export default function ReportesEncargadoScreen() {
  return (
    <ThemedView style={styles.container}>
      <CrearReporteEncargado />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});
