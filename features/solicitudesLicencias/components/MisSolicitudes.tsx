import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ListRenderItem,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
// Componentes y Hooks propios
import { CreateButton } from '@/components/ui/CreateButton';
import { EstadoSolicitud, SolicitudLicencia } from '../models/SolicitudLicencia';
import { useGetSolicitudesLicencias } from '../viewmodels/useSolicitudes';

const estadoMapping: Record<EstadoSolicitud, string> = {
  'PENDIENTE': 'Pendiente',
  'PENDIENTE_DOCUMENTACION': 'Pendiente Documentación',
  'PENDIENTE_APROBACION': 'Pendiente Aprobación',
  'APROBADA': 'Aprobada',
  'RECHAZADA': 'Rechazada',
  'CANCELADA': 'Cancelada',
  'CONSUMIDA': 'Consumida',
};

export function MisSolicitudes() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  // 1. Obtención de datos
  const { data: solicitudes, isLoading, error } = useGetSolicitudesLicencias(
    user ? { usuario_id: user.user_context_id } : undefined
  );

  // 2. Navegación
  const handleOpenSolicitud = useCallback(
    (solicitudId: number) => {
      router.push({
        pathname: '/(extras)/solicitud-licencia' as any,
        params: { id: solicitudId.toString(), type: 'enviada' },
      });
    },
    [router]
  );

  const handleCreateNew = useCallback(() => {
    router.push('/(extras)/crear-solicitudes-licencias' as any);
  }, [router]);

  // 3. Renderizado de la lista
  const renderSeparator = useCallback(() => {
    return (
      <View
        style={[
          styles.separator,
          { backgroundColor: colorScheme === 'dark' ? '#333333' : '#CCCCCC' }
        ]}
      />
    );
  }, [colorScheme]);

  const renderItem: ListRenderItem<SolicitudLicencia> = useCallback(
    ({ item }) => {
      const estadoUI = estadoMapping[item.estado];
      return (
        <MiSolicitudItem
          solicitud={item}
          estadoUI={estadoUI}
          onPress={() => handleOpenSolicitud(item.id)}
        />
      );
    },
    [handleOpenSolicitud]
  );

  // 4. Estados de UI (Carga, Error, Vacío)
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
          Error al cargar solicitudes
        </ThemedText>
        <ThemedText style={{ color: colors.icon }}>
          {error instanceof Error ? error.message : 'Intenta nuevamente'}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {(!solicitudes || solicitudes.length === 0) ? (
        <View style={styles.centerContainer}>
          <ThemedText type="subtitle">No hay solicitudes enviadas</ThemedText>
          <ThemedText style={{ color: colors.icon, marginTop: 8 }}>
            Crea una nueva solicitud para comenzar
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={solicitudes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={true}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Botón flotante de creación */}
      <CreateButton 
        onPress={handleCreateNew} 
        style={styles.fab} 
        accessibilityLabel="Crear solicitud de licencia"
      />
    </View>
  );
}

// --- Sub-componente de Item de la lista ---

interface MiSolicitudItemProps {
  solicitud: SolicitudLicencia;
  estadoUI: string;
  onPress: () => void;
}

function MiSolicitudItem({ solicitud, estadoUI, onPress }: MiSolicitudItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getEstadoColor = (estado: string): string => {
    switch (estado) {
      case 'Pendiente':
      case 'Pendiente Documentación':
      case 'Pendiente Aprobación':
        return '#FF9800';
      case 'Aprobada':
        return '#4CAF50';
      case 'Rechazada':
        return '#F44336';
      case 'Cancelada':
        return '#9C27B0';
      case 'Consumida':
        return '#2196F3';
      default:
        return colors.icon;
    }
  };

  const fechaInicioStr = new Date(solicitud.fecha_inicio).toLocaleDateString();
  const fechaFinStr = new Date(solicitud.fecha_fin).toLocaleDateString();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.itemContainer,
        { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' },
      ]}
    >
      <View style={styles.itemContent}>
        {/* Título: Tipo de Licencia */}
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {solicitud.tipo_nombre || 'Licencia'}
        </ThemedText>

        {/* Descripción: Rango de fechas */}
        <ThemedText
          numberOfLines={2}
          style={[styles.description, { color: colors.icon }]}
        >
          {solicitud.cantidad_dias} días | {fechaInicioStr} a {fechaFinStr}
        </ThemedText>

        {/* Footer: Fecha creación + Badge de Estado */}
        <View style={styles.footerContainer}>
          <ThemedText style={[styles.dateText, { color: colors.icon }]}>
            Creada: {new Date(solicitud.created_at).toLocaleDateString()}
          </ThemedText>
          
          <View
            style={[
              styles.estadoBadge,
              { backgroundColor: getEstadoColor(estadoUI) + '20' },
            ]}
          >
            <ThemedText
              style={[styles.estadoText, { color: getEstadoColor(estadoUI) }]}
            >
              {estadoUI}
            </ThemedText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 100, // Espacio para que el FAB no tape el último item
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  errorText: {
    marginBottom: 8,
  },
  itemContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  itemContent: {
    flexDirection: 'column',
  },
  description: {
    fontSize: 13,
    marginTop: 4,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateText: {
    fontSize: 12,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  estadoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
});