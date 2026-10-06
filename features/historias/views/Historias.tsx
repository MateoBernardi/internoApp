import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { CreateButton } from '@/components/ui/CreateButton';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { glassColors } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { HistoriaCard } from '../components/HistoriaCard';
import { useHistorias } from '../viewmodels/useHistorias';

export function Historias() {
  const router = useRouter();
  const { hasRole } = useRoleCheck();
  const canSeeAnalitica = hasRole(['gerencia', 'personasRelaciones']);
  const { data, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useHistorias();

  const historias = useMemo(() => data?.pages.flatMap((p) => p.historias) ?? [], [data]);

  const openHistoria = useCallback(
    (id: string) => router.push(`/(extras)/historia-detalle?id=${id}` as Href),
    [router],
  );

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        {canSeeAnalitica && (
          <Pressable
            onPress={() => router.push('/(extras)/analitica-historias' as Href)}
            style={styles.analyticsButton}
            accessibilityRole="button"
            accessibilityLabel="Ver analítica de historias"
          >
            <Ionicons name="stats-chart-outline" size={18} color={glassColors.link} />
            <Text style={styles.analyticsLabel}>Analítica</Text>
          </Pressable>
        )}
        <CreateButton onPress={() => router.push('/(extras)/crear-historia' as Href)} accessibilityLabel="Crear historia" />
      </View>

      {isLoading ? (
        <ScreenSkeleton rows={4} showHeader={false} />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error instanceof Error ? error.message : 'No se pudieron cargar las historias.'}</Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button">
            <Text style={styles.retry}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={historias}
          keyExtractor={(h) => h.historia_id}
          renderItem={({ item }) => <HistoriaCard historia={item} onPress={openHistoria} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={refetch} />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Text style={styles.empty}>Todavía no hay historias. Creá la primera con el botón +.</Text>
          }
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={glassColors.link} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, paddingVertical: 10 },
  analyticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(26,115,232,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(26,115,232,0.35)',
  },
  analyticsLabel: { color: glassColors.link, fontWeight: '600', fontSize: 14 },
  list: { paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  error: { color: glassColors.error, textAlign: 'center' },
  retry: { color: glassColors.link, fontWeight: '600' },
  empty: { textAlign: 'center', color: glassColors.textMuted, marginTop: 40 },
  footer: { paddingVertical: 16 },
});
