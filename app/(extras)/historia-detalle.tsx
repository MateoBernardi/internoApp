import { ThemedView } from '@/components/themed-view';
import { HistoriaDetalle } from '@/features/historias/views/HistoriaDetalle';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function HistoriaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ThemedView style={styles.container}>
      {id ? <HistoriaDetalle historiaId={id} /> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
