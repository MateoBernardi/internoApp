import { ThemedView } from '@/components/themed-view';
import Documentos from '@/features/docs/views/Documentos';
import { Platform, StyleSheet } from 'react-native';

export default function DocumentosScreen() {
  const containerPaddingTop = Platform.OS === 'web' ? 0 : '10%';

  return (
        <ThemedView style={[styles.container, { paddingTop: containerPaddingTop }]}> 
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