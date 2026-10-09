import { ThemedView } from '@/components/themed-view';
import { CrearInforme } from '@/features/informes/views/CrearInforme';
import { StyleSheet } from 'react-native';

export default function CrearInformeScreen() {
  return (
    <ThemedView style={styles.container}>
      <CrearInforme />
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
