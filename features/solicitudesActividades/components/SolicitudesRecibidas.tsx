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

function formatTipoSolicitud(tipo?: string): string {
  if (tipo === 'MANDATO') return 'Actividad';
  if (tipo === 'REUNION') return 'Reunión';
  if (tipo === 'CHAT') return 'Conversación';
  return tipo ? tipo : 'Solicitud';
}

function getTipoBadgeStyle(tipo?: string): { borderColor: string; backgroundColor: string; textColor: string } {
  switch (tipo) {
    case 'MANDATO':
      return { borderColor: '#2563eb', backgroundColor: '#2563eb12', textColor: '#2563eb' };
    case 'REUNION':
      return { borderColor: '#7c3aed', backgroundColor: '#7c3aed12', textColor: '#7c3aed' };
    case 'CHAT':
      return { borderColor: '#0ea5e9', backgroundColor: '#0ea5e912', textColor: '#0ea5e9' };
    default:
      return { borderColor: '#6b7280', backgroundColor: '#6b728012', textColor: '#6b7280' };
  }
}

function getEstadoBadgeStyle(estado: string): { borderColor: string; backgroundColor: string; textColor: string } {
  switch (estado) {
    case 'Pendiente':
      return { borderColor: '#9ca3af', backgroundColor: '#9ca3af12', textColor: '#6b7280' };
    case 'Visto':
      return { borderColor: '#2563eb', backgroundColor: '#2563eb12', textColor: '#2563eb' };
    case 'Modificado':
    case 'Modificado por creador':
      return { borderColor: '#f59e0b', backgroundColor: '#f59e0b12', textColor: '#b45309' };
    case 'Aceptado':
      return { borderColor: '#16a34a', backgroundColor: '#16a34a12', textColor: '#15803d' };
    case 'Rechazado':
      return { borderColor: '#dc2626', backgroundColor: '#dc262612', textColor: '#b91c1c' };
    case 'Actividad creada':
      return { borderColor: '#0f766e', backgroundColor: '#0f766e12', textColor: '#0f766e' };
    case 'Expirada':
      return { borderColor: '#64748b', backgroundColor: '#64748b12', textColor: '#475569' };
    default:
      return { borderColor: '#6b7280', backgroundColor: '#6b728012', textColor: '#6b7280' };
  }
}

interface SolicitudesRecibidasProps {
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  onOpenSolicitud?: (solicitudId: number) => void;
}

export function SolicitudesRecibidas({ onRefresh, refreshing, onOpenSolicitud }: SolicitudesRecibidasProps = {}) {
  const router = useRouter();
  const { data: invitaciones, isLoading, error, refetch } = useInvitaciones();
  const { mutate: ocultarSolicitud, isPending: isHidingSolicitud } = useOcultarSolicitudInvitado();

  const handleOpenSolicitud = useCallback((solicitudId: number) => {
    if (onOpenSolicitud) {
      onOpenSolicitud(solicitudId);
      return;
    }

    router.push({
      pathname: '/(tabs)/explore',
      params: { solicitudId: solicitudId.toString(), type: 'recibida' },
    });
  }, [router, onOpenSolicitud]);

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

  const tipoLabel = formatTipoSolicitud(solicitud.tipo_actividad);
  const tipoBadgeStyle = getTipoBadgeStyle(solicitud.tipo_actividad);
  const estadoBadgeStyle = getEstadoBadgeStyle(estadoUI);

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
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              { borderColor: tipoBadgeStyle.borderColor, backgroundColor: tipoBadgeStyle.backgroundColor },
            ]}
          >
            <ThemedText style={[styles.badgeText, { color: tipoBadgeStyle.textColor }]}>{tipoLabel}</ThemedText>
          </View>
          <View
            style={[
              styles.badge,
              { borderColor: estadoBadgeStyle.borderColor, backgroundColor: estadoBadgeStyle.backgroundColor },
            ]}
          >
            <ThemedText style={[styles.badgeText, { color: estadoBadgeStyle.textColor }]}>{estadoUI}</ThemedText>
          </View>
        </View>
        <View style={styles.footerContainer}>
          <ThemedText style={[styles.dateText, { color: colors.secondaryText }]}>
            {solicitud.fecha_inicio ? solicitud.fecha_inicio.toLocaleDateString('es-AR') : 'Sin fecha'}
          </ThemedText>
          <View style={styles.footerRightGroup}>
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
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
});
