import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
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
  const { data: solicitudes, isLoading, error } = useSolicitudesCreadas();

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
          No se encontraron solicitudes enviadas por vos.
        </ThemedText>
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
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
      {agrupadas.map((item, index) => (
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
        <ThemedText
          numberOfLines={2}
          style={[styles.description, { color: colors.secondaryText }]}
        >
          {solicitud.descripcion}
        </ThemedText>

        {/* Lista de invitados con su estado */}
        <View style={styles.invitadosContainer}>
          {solicitud.invitados.map((inv, idx) => {
            const estadoUI = estadoInvitacionMapping[inv.estado];
            return (
              <View key={`${inv.nombre}-${inv.apellido}-${idx}`} style={styles.invitadoRow}>
                <ThemedText style={styles.invitadoName} numberOfLines={1}>
                  {inv.nombre} {inv.apellido}
                </ThemedText>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(estadoUI) + '20' }]}>
                  <ThemedText style={[styles.estadoText, { color: getEstadoColor(estadoUI) }]}>
                    {estadoUI}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>

        <ThemedText style={[styles.dateText, { color: colors.secondaryText }]}>
          {solicitud.fecha_inicio ? new Date(solicitud.fecha_inicio).toLocaleDateString() : 'Sin fecha'}
        </ThemedText>
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
  invitadosContainer: {
    marginTop: 8,
    gap: 4,
  },
  invitadoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invitadoName: {
    fontSize: 13,
    color: colors.secondaryText,
    flex: 1,
    marginRight: 8,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateText: {
    fontSize: 12,
    marginTop: 8,
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
