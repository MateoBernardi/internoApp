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
import { StyleSheet, View } from 'react-native';

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
      {/* Sección superior: novedades y encuestas */}
      <View style={styles.topSection}>
        <TablonNovedades refreshTrigger={refreshTrigger} />
        <EncuestasPendientes />
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
    paddingBottom: 8,
  },
  mainSection: {
    flex: 1,
  },
});
