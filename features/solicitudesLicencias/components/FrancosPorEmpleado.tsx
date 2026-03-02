import { ThemedText } from '@/components/themed-text';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
    FlatList,
    ListRenderItem,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { EstadoSolicitud, SolicitudLicencia } from '../models/SolicitudLicencia';
import { useGetSolicitudesLicencias } from '../viewmodels/useSolicitudes';

const estadoMapping: Record<EstadoSolicitud, string> = {
  'PENDIENTE': 'Pendiente',
  'PENDIENTE_DOCUMENTACION': 'Pendiente Doc.',
  'PENDIENTE_APROBACION': 'Pendiente Aprob.',
  'APROBADA': 'Aprobada',
  'RECHAZADA': 'Rechazada',
  'CANCELADA': 'Cancelada',
  'CONSUMIDA': 'Consumida',
};

const getEstadoColor = (estado: string): string => {
  if (estado.includes('Pendiente')) return '#FF9800';
  if (estado.includes('Aprobada')) return '#4CAF50';
  if (estado.includes('Rechazada')) return '#F44336';
  if (estado.includes('Cancelada')) return '#9C27B0';
  if (estado.includes('Consumida')) return '#2196F3';
  return '#757575';
};

interface FrancosPorEmpleadoProps {
  usuarioId: number;
}

const colors = Colors['light'];

export function FrancosPorEmpleado({ usuarioId }: FrancosPorEmpleadoProps) {
  const router = useRouter();
  const francos = useGetSolicitudesLicencias({ usuario_id: usuarioId, tipo_licencia_id: 2 });
  const diasEspeciales = useGetSolicitudesLicencias({ usuario_id: usuarioId, tipo_licencia_id: 4 });

  const isLoading = francos.isLoading || diasEspeciales.isLoading;
  const error = francos.error || diasEspeciales.error;
  const data = [ ...(francos.data ?? []), ...(diasEspeciales.data ?? []) ];

  const handleOpenSolicitud = useCallback((solicitudId: number) => {
    router.push({
      pathname: '/(extras)/solicitud-licencia' as any,
      params: { id: solicitudId.toString(), type: 'recibida' },
    });
  }, [router]);

  const renderSeparator = useCallback(() => {
    return (
      <View style={[styles.separator, { backgroundColor: colors.icon }]} />
    );
  }, []);

  const renderItem: ListRenderItem<SolicitudLicencia> = useCallback(({ item }) => {
    const estadoUI = estadoMapping[item.estado] || item.estado;
    return (
      <FrancoItem
        item={item}
        estadoUI={estadoUI}
        onPress={() => handleOpenSolicitud(item.id)}
      />
    );
  }, [handleOpenSolicitud]);

  if (isLoading) {
    return <ScreenSkeleton rows={3} showHeader={false} />;
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={{ color: colors.icon }}>
          {error instanceof Error ? error.message : 'Intenta nuevamente'}
        </ThemedText>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText type="subtitle">No hay francos solicitados</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        scrollEnabled={false}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
    </View>
  );
}

interface FrancoItemProps {
  item: SolicitudLicencia;
  estadoUI: string;
  onPress: () => void;
}

function FrancoItem({ item, estadoUI, onPress }: FrancoItemProps) {
  const fechaInicioStr = item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString() : null;
  const fechaFinStr = item.fecha_fin ? new Date(item.fecha_fin).toLocaleDateString() : null;

  return (
    <TouchableOpacity onPress={onPress} style={styles.itemContainer}>
      <View style={styles.itemContent}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {item.tipo_nombre || 'Franco'}
        </ThemedText>
        <ThemedText numberOfLines={2} style={{ color: colors.icon, fontSize: 13, marginTop: 4 }}>
          {item.cantidad_dias} días{fechaInicioStr && fechaFinStr ? ` | ${fechaInicioStr} a ${fechaFinStr}` : ''}
        </ThemedText>
        <View style={styles.footerContainer}>
          <ThemedText style={styles.dateText}>
            Creada: {new Date(item.created_at).toLocaleDateString()}
          </ThemedText>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(estadoUI) + '20' }]}>
            <ThemedText style={[styles.estadoText, { color: getEstadoColor(estadoUI) }]}>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.componentBackground,
  },
  itemContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.componentBackground,
  },
  itemContent: {
    flexDirection: 'column',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateText: {
    fontSize: 12,
    color: colors.secondaryText,
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
  separator: {
    height: 1,
    marginHorizontal: 16,
  },
});
