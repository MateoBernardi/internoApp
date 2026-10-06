import { ThemedView } from '@/components/themed-view';
import { CrearHistoria } from '@/features/historias/views/CrearHistoria';
import { StyleSheet } from 'react-native';

export default function CrearHistoriaScreen() {
  return (
    <ThemedView style={styles.container}>
      <CrearHistoria />
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
