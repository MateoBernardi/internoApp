import { ThemedText } from '@/components/themed-text';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
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

interface SolicitudesEnviadasProps {
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  onOpenSolicitud?: (solicitudId: number) => void;
}

export function SolicitudesEnviadas({ onRefresh, refreshing, onOpenSolicitud }: SolicitudesEnviadasProps = {}) {
  const router = useRouter();
  const { data: solicitudes, isLoading, error, refetch } = useSolicitudesCreadas();

  const agrupadas = useMemo(() => {
    if (!solicitudes) return [];
    return agruparSolicitudes(solicitudes);
  }, [solicitudes]);

  const handleOpenSolicitud = useCallback((solicitudId: number) => {
    if (onOpenSolicitud) {
      onOpenSolicitud(solicitudId);
      return;
    }

    router.push({
      pathname: '/(tabs)/explore',
      params: { solicitudId: solicitudId.toString(), type: 'enviada' },
    });
  }, [router, onOpenSolicitud]);

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

  const estadoUI = useMemo(() => {
    const estadoUIList = solicitud.invitados.map((inv) => estadoInvitacionMapping[inv.estado]);
    return estadoUIList.find((estado) => estado !== 'Pendiente') || estadoUIList[0] || 'Pendiente';
  }, [solicitud.invitados]);

  const tipoLabel = useMemo(() => formatTipoSolicitud(solicitud.tipo_actividad), [solicitud.tipo_actividad]);
  const tipoBadgeStyle = useMemo(() => getTipoBadgeStyle(solicitud.tipo_actividad), [solicitud.tipo_actividad]);
  const estadoBadgeStyle = useMemo(() => getEstadoBadgeStyle(estadoUI), [estadoUI]);

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
          <ThemedText style={[styles.dateText, { color: colors.secondaryText }]}
          >
            {solicitud.fecha_inicio ? solicitud.fecha_inicio.toLocaleDateString('es-AR') : 'Sin fecha'}
          </ThemedText>
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
});
