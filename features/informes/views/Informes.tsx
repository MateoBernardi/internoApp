import { CreateButton } from '@/components/ui/CreateButton';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { glassColors } from '@/shared/ui/glass';
import { Href, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { InformeCard } from '../components/InformeCard';
import { useInformes } from '../hooks';

export function Informes() {
  const router = useRouter();
  const { informes, isLoading, isRefreshing, error, refresh, loadMore, hasMore } = useInformes();

  const abrir = useCallback((id: string) => router.push(`/(extras)/informe-detalle?id=${id}` as Href), [router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>Los que creaste o donde te mencionaron</Text>
        <CreateButton onPress={() => router.push('/(extras)/crear-informe' as Href)} accessibilityLabel="Nuevo informe" />
      </View>

      {isLoading ? (
        <ScreenSkeleton rows={4} showHeader={false} />
      ) : error && informes.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={refresh} accessibilityRole="button">
            <Text style={styles.retry}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={informes}
          keyExtractor={(i) => i.informe_id}
          renderItem={({ item }) => <InformeCard informe={item} onPress={abrir} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
          onEndReached={() => hasMore && loadMore()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={styles.empty}>No tenés informes todavía.</Text>}
          ListFooterComponent={hasMore ? <ActivityIndicator style={styles.footer} color={glassColors.link} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10 },
  subtitle: { flex: 1, fontSize: 13, color: glassColors.textMuted },
  list: { paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  error: { color: glassColors.error, textAlign: 'center' },
  retry: { color: glassColors.link, fontWeight: '600' },
  empty: { textAlign: 'center', color: glassColors.textMuted, marginTop: 40, fontSize: 14 },
  footer: { paddingVertical: 16 },
});
