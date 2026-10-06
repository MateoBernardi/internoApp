import { ThemedView } from '@/components/themed-view';
import { Historias } from '@/features/historias/views/Historias';
import { StyleSheet } from 'react-native';

export default function HistoriasScreen() {
  return (
    <ThemedView style={styles.container}>
      <Historias />
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
