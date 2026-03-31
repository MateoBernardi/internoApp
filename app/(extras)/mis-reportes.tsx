import { ThemedView } from '@/components/themed-view';
import { MisReportes } from '@/features/reportes/components/MisReportes';
import { StyleSheet } from 'react-native';

export default function MisReportesScreen() {
  return (
        <ThemedView style={styles.container}>
          <MisReportes />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});