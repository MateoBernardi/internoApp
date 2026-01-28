import { OwnFlatList } from '@/components/FlatList';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SolicitudLicencia } from '../models/SolicitudLicencia';
import { useGetSolicitudesLicencias } from '../viewmodels/useSolicitudes';

interface FrancosPorEmpleadoProps {
  usuarioId: number;
}

export function FrancosPorEmpleado({ usuarioId }: FrancosPorEmpleadoProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const result2 = useGetSolicitudesLicencias({ usuario_id: usuarioId, tipo_licencia_id: 2 });
  const result4 = useGetSolicitudesLicencias({ usuario_id: usuarioId, tipo_licencia_id: 4 });

  const isLoading = result2.isLoading || result4.isLoading;
  const error = result2.error || result4.error;
  const data = [ ...(result2.data ?? []), ...(result4.data ?? []) ];

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText type="subtitle" style={styles.errorText}>
          Error al cargar francos
        </ThemedText>
        <ThemedText style={{ color: colors.icon }}>
          {error instanceof Error ? error.message : 'Intenta nuevamente'}
        </ThemedText>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText type="subtitle">No hay francos solicitados</ThemedText>
      </View>
    );
  }

  return (
    <OwnFlatList
      data={data}
      keyExtractor={item => item.id.toString()}
      renderItem={({ item }) => <FrancoItem item={item} />}
      ListEmptyComponent={null}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

function FrancoItem({ item }: { item: SolicitudLicencia }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {item.fecha_inicio} a {item.fecha_fin}
        </ThemedText>
        <ThemedText style={[styles.estado, { color: colors.text }]}>{item.estado}</ThemedText>
      </View>
      <ThemedText style={styles.label}>Días: <ThemedText>{item.cantidad_dias}</ThemedText></ThemedText>
      <ThemedText style={styles.label}>Solicitada el: <ThemedText>{new Date(item.created_at).toLocaleDateString()}</ThemedText></ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
  },
  estado: {
    fontWeight: 'bold',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  label: {
    color: '#888',
    fontSize: 13,
    marginBottom: 2,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ccc',
    marginHorizontal: 16,
  },
});
