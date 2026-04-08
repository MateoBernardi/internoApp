import { ThemedText } from '@/components/themed-text';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  Alert,
  GestureResponderEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SolicitudEnviada, estadoInvitacionMapping } from '../models/Solicitud';
import { useInvitaciones, useOcultarSolicitudInvitado } from '../viewmodels/useSolicitudes';

const colors = Colors['light'];

interface SolicitudesRecibidasProps {
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}

export function SolicitudesRecibidas({ onRefresh, refreshing }: SolicitudesRecibidasProps = {}) {
  const router = useRouter();
  const { data: invitaciones, isLoading, error, refetch } = useInvitaciones();
  const { mutate: ocultarSolicitud, isPending: isHidingSolicitud } = useOcultarSolicitudInvitado();

  const handleOpenSolicitud = useCallback((solicitudId: number) => {
    router.push({
      pathname: '/(extras)/solicitud',
      params: { id: solicitudId.toString(), type: 'recibida' },
    });
  }, [router]);

  const handleRefresh = useCallback(async () => {
    await refetch();
    if (onRefresh) await onRefresh();
  }, [refetch, onRefresh]);

  const handleOcultarSolicitud = useCallback((solicitudId: number) => {
    Alert.alert(
      'Ocultar solicitud',
      'Esta solicitud dejará de verse en tu lista de recibidas. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ocultar',
          style: 'destructive',
          onPress: () => {
            ocultarSolicitud(
              { solicitudId },
              {
                onError: (error) => {
                  Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo ocultar la solicitud');
                },
              }
            );
          },
        },
      ]
    );
  }, [ocultarSolicitud]);



  if (isLoading) {
    return (
      <ScreenSkeleton rows={3} showHeader={false} />
    );
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
    <ScrollView
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing ?? false}
          onRefresh={handleRefresh}
          colors={[colors.lightTint]}
          tintColor={colors.lightTint}
        />
      }
    >
      {invitaciones.map((item, index) => {
        const estadoUI = estadoInvitacionMapping[item.estado];
        return (
          <React.Fragment key={item.solicitud_id.toString()}>
            {index > 0 && (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: colors.secondaryText,
                  marginHorizontal: '4%',
                }}
              />
            )}
            <SolicitudRecibidaItem
              solicitud={item}
              estadoUI={estadoUI}
              onPress={() => handleOpenSolicitud(item.solicitud_id)}
              onHide={() => handleOcultarSolicitud(item.solicitud_id)}
              isHiding={isHidingSolicitud}
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
  onHide: () => void;
  isHiding: boolean;
}

function SolicitudRecibidaItem({ solicitud, estadoUI, onPress, onHide, isHiding }: SolicitudRecibidaItemProps) {
  const getContainerColor = (estado: string): string => {
    switch (estado) {
      case 'Pendiente':
      case 'Modificado por creador':
        return colors.componentBackground;
      case 'Visto':
      case 'Modificado':
      case 'Aceptado':
      case 'Rechazado':
      case 'Actividad creada':
      case 'Expirada':
        return colors.background;
      default:
        return colors.componentBackground;
    }
  };

  const getEstadoIcon = (estado: string): { name: keyof typeof Ionicons.glyphMap; color: string } | null => {
    switch (estado) {
      case 'Modificado por creador':
        return { name: 'create-outline', color: colors.secondaryText };
      case 'Visto':
        return { name: 'checkmark-done', color: '#1E88E5' };
      case 'Aceptado':
        return { name: 'checkmark', color: '#43A047' };
      case 'Rechazado':
        return { name: 'close', color: '#E53935' };
      case 'Actividad creada':
        return { name: 'checkmark-done', color: '#2E7D32' };
      case 'Expirada':
        return { name: 'time-outline', color: '#757575' };
      default:
        return null;
    }
  };

  const estadoIcon = getEstadoIcon(estadoUI);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.itemContainer,
        { backgroundColor: getContainerColor(estadoUI) },
      ]}
    >
      <View style={styles.itemContent}>
        <ThemedText style={[styles.creador, { color: colors.secondaryText }]}>
          De: {solicitud.nombre_creador} {solicitud.apellido_creador}
        </ThemedText>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {solicitud.titulo}
        </ThemedText>
        <ThemedText
          numberOfLines={2}
          style={[styles.description, { color: colors.secondaryText }]}
        >
          {solicitud.descripcion}
        </ThemedText>
        <View style={styles.footerContainer}>
          <ThemedText style={[styles.dateText, { color: colors.secondaryText }]}>
            {solicitud.fecha_inicio ? solicitud.fecha_inicio.toLocaleDateString('es-AR') : 'Sin fecha'}
          </ThemedText>
          <View style={styles.footerRightGroup}>
            {estadoIcon ? (
              <View style={styles.estadoIconContainer}>
                <Ionicons name={estadoIcon.name} size={18} color={estadoIcon.color} />
              </View>
            ) : null}
            <TouchableOpacity
              onPress={(event: GestureResponderEvent) => {
                event.stopPropagation();
                onHide();
              }}
              disabled={isHiding}
              style={[styles.hideButton, isHiding && styles.hideButtonDisabled]}
            >
              <Ionicons name="trash-outline" size={15} color={colors.error} />
            </TouchableOpacity>
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
    paddingHorizontal: '4%',
    backgroundColor: colors.componentBackground,
  },
  errorText: {
    marginBottom: 8,
  },
  itemContainer: {
    marginHorizontal: '4%',
    marginVertical: 4,
    paddingHorizontal: '3%',
    paddingVertical: '3%',
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
  footerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 12,
  },
  hideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error + '14',
  },
  hideButtonDisabled: {
    opacity: 0.6,
  },
  estadoIconContainer: {
    width: 20,
    alignItems: 'center',
  },
});
