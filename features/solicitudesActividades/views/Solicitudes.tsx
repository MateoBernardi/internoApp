import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CreateButton } from '@/components/ui/CreateButton';
import { Colors } from '@/constants/theme';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CrearSolicitud } from '../components/CrearSolicitud';
import { Solicitud } from '../components/Solicitud';
import { SolicitudesEnviadas } from '../components/SolicitudesEnviadas';
import { SolicitudesRecibidas } from '../components/SolicitudesRecibidas';

type TabType = 'enviadas' | 'recibidas';
const colors = Colors['light'];


interface SolicitudesViewProps {
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}

export default function SolicitudesView({ onRefresh, refreshing }: SolicitudesViewProps = {}) {
  const { solicitudId: solicitudIdParam, type: typeParam } = useLocalSearchParams<{ solicitudId?: string; type?: string }>();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>('recibidas');
  const [selectedSolicitudId, setSelectedSolicitudId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<TabType>('recibidas');
  const [showCrearSolicitud, setShowCrearSolicitud] = useState(false);
  const handledParamRef = useRef<string | null>(null);

  const handleCreatePress = useCallback(() => {
    setShowCrearSolicitud(true);
  }, []);

  const handleCloseCrearSolicitud = useCallback(() => {
    setShowCrearSolicitud(false);
  }, []);

  const handleOpenSolicitud = useCallback((solicitudId: number, type: TabType) => {
    setSelectedType(type);
    setSelectedSolicitudId(solicitudId);
  }, []);

  const handleCloseSolicitud = useCallback(() => {
    setSelectedSolicitudId(null);
  }, []);

  useEffect(() => {
    if (!solicitudIdParam) return;
    const key = `${solicitudIdParam}:${typeParam ?? ''}`;
    if (handledParamRef.current === key) return;
    const parsedId = Number(solicitudIdParam);
    if (!Number.isFinite(parsedId) || parsedId <= 0) return;

    setSelectedType(typeParam === 'enviada' ? 'enviadas' : 'recibidas');
    setSelectedSolicitudId(parsedId);
    handledParamRef.current = key;
  }, [solicitudIdParam, typeParam]);

  return (
    <ThemedView style={styles.container}>
      {/* Header con tabs */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'recibidas' && styles.tabActive,
              ]}
              onPress={() => setActiveTab('recibidas')}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === 'recibidas' && {
                    color: colors.tint,
                    fontWeight: 'bold',
                  },
                ]}
              >
                Recibidas
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'enviadas' && styles.tabActive,
              ]}
              onPress={() => setActiveTab('enviadas')}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === 'enviadas' && {
                    color: colors.tint,
                    fontWeight: 'bold',
                  },
                ]}
              >
                Enviadas
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Contenido */}
      <View style={styles.content}>
        {activeTab === 'enviadas' ? (
          <SolicitudesEnviadas
            onRefresh={onRefresh}
            refreshing={refreshing}
            onOpenSolicitud={(id) => handleOpenSolicitud(id, 'enviadas')}
          />
        ) : (
          <SolicitudesRecibidas
            onRefresh={onRefresh}
            refreshing={refreshing}
            onOpenSolicitud={(id) => handleOpenSolicitud(id, 'recibidas')}
          />
        )}
      </View>

      {/* Botón flotante */}
      <View style={[styles.floatingButtonContainer, { bottom: insets.bottom + 8, right: 36 }]}>
        <CreateButton
          onPress={handleCreatePress}
          size={56}
          accessibilityLabel="Crear nueva solicitud"
        />
      </View>

      {/* Modal detalle de solicitud */}
      {selectedSolicitudId !== null && (
        <Solicitud
          visible
          solicitudId={selectedSolicitudId}
          type={selectedType === 'enviadas' ? 'enviada' : 'recibida'}
          onClose={handleCloseSolicitud}
        />
      )}

      {/* Modal crear solicitud */}
      <CrearSolicitud
        visible={showCrearSolicitud}
        onClose={handleCloseCrearSolicitud}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContent: {
    paddingHorizontal: '4%',
    paddingTop: '4%',
  },
  header: {
    backgroundColor: colors.componentBackground,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: '-4%',
    paddingHorizontal: '4%',
  },
  tab: {
    flex: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.tint,
  },
  tabText: {
    fontSize: 18,
    fontWeight: '500',
    paddingBottom: 10
  },
  content: {
    flex: 1,
  },
  floatingButtonContainer: {
    position: 'absolute',
    right: 36,
  },
});