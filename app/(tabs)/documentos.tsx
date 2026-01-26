import { ThemedView } from '@/components/themed-view';
import Documentos from '@/features/docs/views/Documentos';
import { StyleSheet } from 'react-native';

export default function DocumentosScreen() {
  return (
        <ThemedView style={styles.container}>
          <Documentos />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});