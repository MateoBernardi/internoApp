import { ThemedView } from '@/components/themed-view';
import { CambiarContrasenaView } from '@/shared/views/CambiarContrasenaView';
import { StyleSheet } from 'react-native';

export default function CambiarContrasenaScreen() {
  return (
    <ThemedView style={styles.container} lightColor="#ffffff">
      <CambiarContrasenaView />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});
