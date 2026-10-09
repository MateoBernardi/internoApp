import { ThemedView } from '@/components/themed-view';
import { InformeDetalle } from '@/features/informes/views/InformeDetalle';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function InformeDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ThemedView style={styles.container}>
      {id ? <InformeDetalle informeId={id} /> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
