import { ThemedView } from '@/components/themed-view';
import Documentos from '@/features/docs/views/Documentos';
import { StyleSheet } from 'react-native';
import { useSafeTopInset } from '@/hooks/useSafeTopInset';

export default function DocumentosScreen() {
  const top = useSafeTopInset();

  return (
        <ThemedView style={[styles.container, { paddingTop: top }]}>
          <Documentos />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
