import { ThemedView } from '@/components/themed-view';
import { InformeDetalle } from '@/features/informes/views/InformeDetalle';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function InformeDetalleScreen() {
  const { id, empleado } = useLocalSearchParams<{ id: string; empleado?: string }>();
  const empleadoId = Number(empleado) > 0 ? Number(empleado) : undefined;
  return (
    <ThemedView style={styles.container}>
      {id ? <InformeDetalle informeId={id} {...(empleadoId !== undefined ? { empleadoId } : null)} /> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
