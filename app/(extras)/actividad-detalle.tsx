import { ThemedView } from '@/components/themed-view';
import { ActividadDetalle } from '@/features/solicitudesActividades/views/ActividadDetalle';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function ActividadDetalleScreen() {
  const { actividadId, id, rol } = useLocalSearchParams<{
    actividadId?: string | string[];
    id?: string | string[];
    rol?: string | string[];
  }>();
  const rawActividadId = Array.isArray(actividadId) ? actividadId[0] : actividadId;
  const rawId = rawActividadId ?? (Array.isArray(id) ? id[0] : id);
  const resolvedActividadId = rawId ? Number(rawId) : Number.NaN;
  const rawRol = Array.isArray(rol) ? rol[0] : rol;

  return (
    <ThemedView style={styles.container}>
      <ActividadDetalle actividadId={resolvedActividadId} rol={rawRol} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
