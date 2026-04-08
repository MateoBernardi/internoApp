import { ThemedText } from '@/components/themed-text';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { InvitadoResumen, SolicitudEnviada, SolicitudEnviadaAgrupada, estadoInvitacionMapping } from '../models/Solicitud';
import { useSolicitudesCreadas } from '../viewmodels/useSolicitudes';

const colors = Colors['light'];

function agruparSolicitudes(solicitudes: SolicitudEnviada[]): SolicitudEnviadaAgrupada[] {
  const map = new Map<number, SolicitudEnviadaAgrupada>();
  for (const s of solicitudes) {
    const existing = map.get(s.solicitud_id);
    const invitado: InvitadoResumen = {
      nombre: s.invitado_nombre,
      apellido: s.invitado_apellido,
      estado: s.estado,
    };
    if (existing) {
      existing.invitados.push(invitado);
    } else {
      map.set(s.solicitud_id, {
        solicitud_id: s.solicitud_id,
        titulo: s.titulo,
        descripcion: s.descripcion,
        created_by: s.created_by,
        fecha_inicio: s.fecha_inicio,
        fecha_fin: s.fecha_fin,
        tipo_actividad: s.tipo_actividad,
        invitados: [invitado],
      });
    }
  }
  return Array.from(map.values());
}

interface SolicitudesEnviadasProps {
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}

export function SolicitudesEnviadas({ onRefresh, refreshing }: SolicitudesEnviadasProps = {}) {
  const router = useRouter();
  const { data: solicitudes, isLoading, error, refetch } = useSolicitudesCreadas();

  const agrupadas = useMemo(() => {
    if (!solicitudes) return [];
    return agruparSolicitudes(solicitudes);
  }, [solicitudes]);

  const handleOpenSolicitud = useCallback((solicitudId: number) => {
    router.push({
      pathname: '/(extras)/solicitud',
      params: { id: solicitudId.toString(), type: 'enviada' },
    });
  }, [router]);

  const handleRefresh = useCallback(async () => {
    await refetch();
    if (onRefresh) await onRefresh();
  }, [refetch, onRefresh]);

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

  if (agrupadas.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText type="subtitle">No hay solicitudes enviadas por vos</ThemedText>
        <ThemedText style={{ color: colors.icon, marginTop: 8 }}>
          Crea una nueva para comenzar
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
      {agrupadas.map((item, index) => (
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
          <SolicitudEnviadaItem
            solicitud={item}
            onPress={() => handleOpenSolicitud(item.solicitud_id)}
          />
        </React.Fragment>
      ))}
    </ScrollView>
  );
}

interface SolicitudEnviadaItemProps {
  solicitud: SolicitudEnviadaAgrupada;
  onPress: () => void;
}

function SolicitudEnviadaItem({ solicitud, onPress }: SolicitudEnviadaItemProps) {
  const destinatarios = useMemo(() => {
    const nombres = solicitud.invitados
      .map((inv) => [inv.nombre, inv.apellido].filter(Boolean).join(' ').trim())
      .filter(Boolean);
    return nombres.join(', ');
  }, [solicitud.invitados]);

  const getContainerColor = (): string => {
    const estadoUIList = solicitud.invitados.map((inv) => estadoInvitacionMapping[inv.estado]);
    const hasBackgroundState = estadoUIList.some((estado) =>
      ['Visto', 'Modificado por creador', 'Aceptado', 'Rechazado', 'Actividad creada', 'Expirada'].includes(estado)
    );
    const hasOnlyPending = estadoUIList.length > 0 && estadoUIList.every((estado) => estado === 'Pendiente');
    if (hasOnlyPending) return colors.background;
    return hasBackgroundState ? colors.background : colors.componentBackground;
  };

  const getEstadoIcon = (estado: string): { name: keyof typeof Ionicons.glyphMap; color: string } | null => {
    switch (estado) {
      case 'Modificado':
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

  const estadoIcon = useMemo(() => {
    for (const inv of solicitud.invitados) {
      const estadoUI = estadoInvitacionMapping[inv.estado];
      const icon = getEstadoIcon(estadoUI);
      if (icon) return icon;
    }
    return null;
  }, [solicitud.invitados]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.itemContainer,
        { backgroundColor: getContainerColor() },
      ]}
    >
      <View style={styles.itemContent}>
        <ThemedText style={[styles.destinatario, { color: colors.secondaryText }]} numberOfLines={1}>
          Para: {destinatarios}
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
            ) : (
              <View style={styles.estadoIconContainer} />
            )}
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
  destinatario: {
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
  estadoIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
