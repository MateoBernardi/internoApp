import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import SolicitudesView from '@/features/solicitudesActividades/views/Solicitudes';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

const colors = Colors['light'];

export default function TabTwoScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const containerPaddingTop = Platform.OS === 'web' ? 0 : '10%';

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  return (
      <ThemedView style={[styles.container, { paddingTop: containerPaddingTop }]}>
        <SolicitudesView onRefresh={handleRefresh} refreshing={refreshing} />
      </ThemedView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
});
