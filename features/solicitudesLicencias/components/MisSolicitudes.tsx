import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Componentes y Hooks propios
import { CreateButton } from '@/components/ui/CreateButton';
import { EstadoSolicitud, SolicitudLicencia } from '../models/SolicitudLicencia';
import { useGetSolicitudesUsuario } from '../viewmodels/useSolicitudes';

const estadoMapping: Record<EstadoSolicitud, string> = {
  'PENDIENTE': 'Pendiente',
  'PENDIENTE_DOCUMENTACION': 'Pendiente Documentación',
  'PENDIENTE_APROBACION': 'Pendiente Aprobación',
  'APROBADA': 'Aprobada',
  'RECHAZADA': 'Rechazada',
  'CANCELADA': 'Cancelada',
  'CONSUMIDA': 'Consumida',
};

const colors = Colors['light'];


export function MisSolicitudes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 1. Obtención de datos
  const { data: solicitudes, isLoading, error, refetch, isRefetching } = useGetSolicitudesUsuario();

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
          { backgroundColor: colors.icon }
        ]}
      />
    );
  }, [colors]);

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
      <ThemedText type="title" style={styles.pageTitle}>Mis Solicitudes</ThemedText>
      
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
          contentContainerStyle={[styles.listContent, { paddingBottom: 80 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.tint]}
              tintColor={colors.tint}
            />
          }
        />
      )}

      {/* Botón flotante de creación */}
      <CreateButton 
        onPress={handleCreateNew} 
        style={{ ...styles.fab, bottom: insets.bottom + 16, right: 36 }}
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

  const fechaInicioStr = solicitud.fecha_inicio ? new Date(solicitud.fecha_inicio).toLocaleDateString() : null;
  const fechaFinStr = solicitud.fecha_fin ? new Date(solicitud.fecha_fin).toLocaleDateString() : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.itemContainer,
        { backgroundColor: colors.componentBackground },
      ]}
    >
      <View style={styles.itemContent}>
        {/* Título: Tipo de Licencia */}
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {solicitud.tipo_nombre}
        </ThemedText>

        {/* Descripción: Rango de fechas */}
        <ThemedText
          numberOfLines={2}
          style={[styles.description, { color: colors.icon }]}
        >
          {solicitud.cantidad_dias} días{fechaInicioStr && fechaFinStr ? ` | ${fechaInicioStr} a ${fechaFinStr}` : ''}
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
    backgroundColor: colors.componentBackground,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: colors.componentBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
  },
  separator: {
    height: StyleSheet.hairlineWidth,
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
    right: 36,
  },
});