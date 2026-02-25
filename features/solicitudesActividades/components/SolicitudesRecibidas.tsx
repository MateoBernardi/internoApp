import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SolicitudEnviada, estadoInvitacionMapping } from '../models/Solicitud';
import { useInvitaciones } from '../viewmodels/useSolicitudes';

const colors = Colors['light'];

interface SolicitudesRecibidasProps {
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}

export function SolicitudesRecibidas({ onRefresh, refreshing }: SolicitudesRecibidasProps = {}) {
  const router = useRouter();
  const { data: invitaciones, isLoading, error } = useInvitaciones();

  const handleOpenSolicitud = useCallback((solicitudId: number) => {
    router.push({
      pathname: '/(extras)/solicitud',
      params: { id: solicitudId.toString(), type: 'recibida' },
    });
  }, [router]);



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
          No se encontró ninguna solicitud recibida.
        </ThemedText>
        <ThemedText style={{ color: colors.icon }}>
          {error instanceof Error ? error.message : 'Intenta nuevamente'}
        </ThemedText>
      </View>
    );
  }

  if (!invitaciones || invitaciones.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText type="subtitle">No tenés solicitudes</ThemedText>
        <ThemedText style={{ color: colors.icon, marginTop: 8 }}>
          Aquí aparecerán las invitaciones que recibas
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
      {invitaciones.map((item, index) => {
        const estadoUI = estadoInvitacionMapping[item.estado];
        return (
          <React.Fragment key={item.solicitud_id.toString()}>
            {index > 0 && (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: colors.secondaryText,
                  marginHorizontal: 16,
                }}
              />
            )}
            <SolicitudRecibidaItem
              solicitud={item}
              estadoUI={estadoUI}
              onPress={() => handleOpenSolicitud(item.solicitud_id)}
            />
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}

interface SolicitudRecibidaItemProps {
  solicitud: SolicitudEnviada;
  estadoUI: string;
  onPress: () => void;
}

function SolicitudRecibidaItem({ solicitud, estadoUI, onPress }: SolicitudRecibidaItemProps) {
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
        { backgroundColor: colors.componentBackground },
      ]}
    >
      <View style={styles.itemContent}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {solicitud.titulo}
        </ThemedText>
        <ThemedText style={[styles.creador, { color: colors.secondaryText }]}>
          De: {solicitud.creador_nombre} {solicitud.creador_apellido}
        </ThemedText>
        <ThemedText
          numberOfLines={2}
          style={[styles.description, { color: colors.secondaryText }]}
        >
          {solicitud.descripcion}
        </ThemedText>
        <View style={styles.footerContainer}>
          <ThemedText style={[styles.dateText, { color: colors.secondaryText }]}>
            {solicitud.fecha_inicio ? new Date(solicitud.fecha_inicio).toLocaleDateString() : 'Sin fecha'}
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
  creador: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
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
