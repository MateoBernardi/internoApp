import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { glassColors } from '@/shared/ui/glass';
import { Href, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useInformesEmpleado } from '../hooks';
import { InformeCard } from './InformeCard';

/** Informes donde se mencionó al empleado. Solo lectura: se abren con `?empleado=` para management. */
export function InformesEmpleado({ empleadoId }: { empleadoId: number }) {
  const router = useRouter();
  const { informes, isLoading, isRefreshing, error, refresh, loadMore, hasMore } = useInformesEmpleado(empleadoId);

  const abrir = useCallback(
    (id: string) => router.push(`/(extras)/informe-detalle?id=${id}&empleado=${empleadoId}` as Href),
    [router, empleadoId],
  );

  if (isLoading) return <ScreenSkeleton rows={3} showHeader={false} />;

  if (error && informes.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={refresh} accessibilityRole="button">
          <Text style={styles.retry}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={informes}
      keyExtractor={(i) => i.informe_id}
      renderItem={({ item }) => <InformeCard informe={item} onPress={abrir} />}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
      onEndReached={() => hasMore && loadMore()}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={<Text style={styles.empty}>No hay informes que mencionen a este empleado.</Text>}
      ListFooterComponent={hasMore ? <ActivityIndicator style={styles.footer} color={glassColors.link} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  error: { color: glassColors.error, textAlign: 'center' },
  retry: { color: glassColors.link, fontWeight: '600' },
  empty: { textAlign: 'center', color: glassColors.textMuted, marginTop: 40, fontSize: 14 },
  footer: { paddingVertical: 16 },
});
