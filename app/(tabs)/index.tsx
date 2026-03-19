import { ThemedView } from '@/components/themed-view';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { EncuestasPendientes } from '@/features/encuestas/components/EncuestasPendientes';
import { useGetEncuestas } from '@/features/encuestas/viewmodels/useEncuestas';
import { KanbanBoard } from '@/features/kanban/views/KanbanBoard';
import TablonNovedades from '@/features/novedades/views/TablonNovedades';
import {
    useInvitaciones,
    useSolicitudesCreadas,
} from '@/features/solicitudesActividades/viewmodels/useSolicitudes';
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
  const canSeeSolicitudes = isEmployeeOrEncargado();

  const { isLoading: isLoadingEncuestas } = useGetEncuestas();
  const { isLoading: isLoadingInvitaciones } = useInvitaciones(canSeeSolicitudes);
  const { isLoading: isLoadingEnviadas } = useSolicitudesCreadas(canSeeSolicitudes);

  const showHomeSkeleton =
    canSeeSolicitudes &&
    (isLoadingEncuestas || isLoadingInvitaciones || isLoadingEnviadas);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  return (
    <ThemedView style={styles.container} lightColor={colors.componentBackground}>
      {showHomeSkeleton ? (
        <ScreenSkeleton rows={6} />
      ) : (
        <>
      {/* Sección superior: novedades y encuestas */}
      <View style={styles.topSection}>
        <TablonNovedades refreshTrigger={refreshTrigger} />
        <EncuestasPendientes />
      </View>

      {/* Sección principal: solicitudes o kanban (fuera del ScrollView para que el FAB flote) */}
      <View style={styles.mainSection}>
        {canSeeSolicitudes ? (
          <SolicitudesView onRefresh={handleRefresh} refreshing={refreshing} />
        ) : (
          <KanbanBoard />
        )}
      </View>
        </>
      )}
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
