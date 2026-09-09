import { ThemedView } from '@/components/themed-view';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { EncuestasPendientes } from '@/features/encuestas/components/EncuestasPendientes';
import { useGetEncuestas } from '@/features/encuestas/viewmodels/useEncuestas';
import { TurnoScanCard } from '@/features/horarios/components/TurnoScanCard';
import { KanbanBoard } from '@/features/kanban/views/KanbanBoard';
import TablonNovedades from '@/features/novedades/views/TablonNovedades';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

const colors = Colors['light'];

export default function HomeScreen() {
  const { user } = useAuth();
  const { isEmployeeOrEncargado, canRespondEncuestas } = useRoleCheck();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const isUserContextReady = Boolean(user?.user_context_id);
  const puedeResponderEncuestas = canRespondEncuestas();
  const shouldEnableHomeQueries = isUserContextReady && puedeResponderEncuestas;

  const { isLoading: isLoadingEncuestas } = useGetEncuestas(shouldEnableHomeQueries);

  const showHomeSkeleton = shouldEnableHomeQueries && isLoadingEncuestas;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  return (
    <ThemedView
      style={styles.container}
      lightColor={colors.componentBackground}
    >
      {showHomeSkeleton ? (
        <ScreenSkeleton rows={6} />
      ) : (
        <>
          {/* Sección superior: novedades y encuestas (con pull-to-refresh) */}
          <ScrollView
            style={styles.topSection}
            contentContainerStyle={styles.topSectionContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.tint]}
                tintColor={colors.tint}
              />
            }
          >
            <TablonNovedades enabled={isUserContextReady} />
            <TurnoScanCard />
            {puedeResponderEncuestas && <EncuestasPendientes enabled={shouldEnableHomeQueries} />}
          </ScrollView>

          {/* Sección principal: solicitudes o kanban (fuera del ScrollView para que el FAB flote) */}
          <View style={styles.mainSection}>
            <KanbanBoard />
          </View>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    flexGrow: 0,
  },
  topSectionContent: {
    paddingBottom: 20,
  },
  mainSection: {
    flex: 1,
  },
});
