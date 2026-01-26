import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
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
import { Solicitud, estadoInvitacionMapping } from '../models/Solicitud';
import { useSolicitudesCreadas } from '../viewmodels/useSolicitudes';

export function SolicitudesEnviadas() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: solicitudes, isLoading, error } = useSolicitudesCreadas();

  const handleOpenSolicitud = useCallback((solicitudId: number) => {
    router.push({
      pathname: '/(extras)/solicitud',
      params: { id: solicitudId.toString(), type: 'enviada' },
    });
  }, [router]);

  const renderSeparator = useCallback(() => {
    return (
      <View
        style={{
          height: StyleSheet.hairlineWidth,
          backgroundColor: colorScheme === 'dark' ? '#333333' : '#CCCCCC',
          marginHorizontal: 16,
        }}
      />
    );
  }, [colorScheme]);

  const renderItem: ListRenderItem<Solicitud> = useCallback(({ item }) => {
    const estadoUI = estadoInvitacionMapping[item.estado];
    
    return (
      <SolicitudEnviadaItem
        solicitud={item}
        estadoUI={estadoUI}
        onPress={() => handleOpenSolicitud(item.solicitud_id)}
      />
    );
  }, [handleOpenSolicitud]);

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

  if (!solicitudes || solicitudes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText type="subtitle">No hay solicitudes enviadas</ThemedText>
        <ThemedText style={{ color: colors.icon, marginTop: 8 }}>
          Crea una nueva solicitud para comenzar
        </ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={solicitudes}
      renderItem={renderItem}
      keyExtractor={(item: Solicitud) => item.solicitud_id.toString()}
      scrollEnabled={true}
      ItemSeparatorComponent={renderSeparator}
    />
  );
}

interface SolicitudEnviadaItemProps {
  solicitud: Solicitud;
  estadoUI: string;
  onPress: () => void;
}

function SolicitudEnviadaItem({ solicitud, estadoUI, onPress }: SolicitudEnviadaItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getEstadoColor = (estado: string): string => {
    switch (estado) {
      case 'Pendiente':
        return '#FF9800';
      case 'Visto':
        return '#2196F3';
      case 'Aceptado':
        return '#4CAF50';
      case 'Rechazado':
        return '#F44336';
      case 'Modificado':
      case 'Modificado por creador':
      case 'Aceptado por creador':
        return '#9C27B0';
      default:
        return colors.icon;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.itemContainer,
        { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' },
      ]}
    >
      <View style={styles.itemContent}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {solicitud.titulo}
        </ThemedText>
        <ThemedText
          numberOfLines={2}
          style={[styles.description, { color: colors.icon }]}
        >
          {solicitud.descripcion}
        </ThemedText>
        <View style={styles.footerContainer}>
          <ThemedText style={[styles.dateText, { color: colors.icon }]}>
            {new Date(solicitud.fecha_inicio).toLocaleDateString()}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
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
});
