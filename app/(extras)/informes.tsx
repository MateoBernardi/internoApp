import { ThemedView } from '@/components/themed-view';
import { Informes } from '@/features/informes/views/Informes';
import { StyleSheet } from 'react-native';

export default function InformesScreen() {
  return (
    <ThemedView style={styles.container}>
      <Informes />
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
