import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { EncuestasPendientes } from '@/features/encuestas/components/EncuestasPendientes';
import { KanbanBoard } from '@/features/kanban/views/KanbanBoard';
import TablonNovedades from '@/features/novedades/views/TablonNovedades';
import SolicitudesView from '@/features/solicitudesActividades/views/Solicitudes';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const colors = Colors['light'];

export default function HomeScreen() {
  const { user } = useAuth();
  const { isEmployeeOrEncargado } = useRoleCheck();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  return (
    <ThemedView style={styles.container} lightColor={colors.componentBackground}>
      {/* Sección superior scrollable: novedades y encuestas */}
      <View style={styles.topSection}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          alwaysBounceVertical={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.lightTint]}
              tintColor={colors.lightTint}
            />
          }
        >
          <TablonNovedades refreshTrigger={refreshTrigger} />
          <EncuestasPendientes />
        </ScrollView>
      </View>

      {/* Sección principal: solicitudes o kanban (fuera del ScrollView para que el FAB flote) */}
      <View style={styles.mainSection}>
        {isEmployeeOrEncargado() ? (
          <SolicitudesView onRefresh={handleRefresh} refreshing={refreshing} />
        ) : (
          <KanbanBoard />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: '10%',
  },
  topSection: {
    maxHeight: SCREEN_HEIGHT * 0.35,
  },
  mainSection: {
    flex: 1,
  },
});
