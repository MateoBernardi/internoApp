import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Componentes UI
import { ThemedView } from '@/components/themed-view';
import { CreateButton } from '@/components/ui/CreateButton';
import { Colors } from '@/constants/theme';

// Componentes de Dominio
import { CrearSolicitud } from '../components/CrearSolicitud';
import { Solicitud } from '../components/Solicitud';
import { SolicitudesList } from '../components/SolicitudesList';

// Modelos, Hooks y Mappers
import { EstadoInvitacionDB, SolicitudEnviada, estadoInvitacionMapping } from '../models/Solicitud';
import { useSolicitudes } from '../viewmodels/useSolicitudes';

const colors = Colors['light'];

// --- HELPERS PARA LÓGICA DE ESTADO (IDÉNTICOS A LA LISTA) ---
const mapEstado = (estado: string): string => estadoInvitacionMapping[estado as EstadoInvitacionDB] ?? estado;

const getEstadoRelevanteUI = (solicitud: SolicitudEnviada): string => {
  if (!solicitud.is_host) return mapEstado(solicitud.estado);
  const invitados = solicitud.invitados.filter(inv => inv.user_id !== solicitud.created_by);
  if (invitados.length === 0) return mapEstado(solicitud.estado);

  const ESTADO_PRIORITY: Record<string, number> = {
    'Modificado': 0, 'Modificado por creador': 1, 'Pendiente': 2, 'Visto': 3,
    'Aceptado': 4, 'Rechazado': 5, 'Actividad creada': 6, 'Expirada': 7,
  };

  const estadosUI = invitados.map(inv => mapEstado(inv.estado ?? ''));
  return estadosUI.sort((a, b) => (ESTADO_PRIORITY[a] ?? 99) - (ESTADO_PRIORITY[b] ?? 99))[0];
};

interface SolicitudesViewProps {
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}

export default function SolicitudesView({ onRefresh, refreshing }: SolicitudesViewProps = {}) {
  const insets = useSafeAreaInsets();
  const { solicitudId: solicitudIdParam } = useLocalSearchParams<{ solicitudId?: string }>();

  // --- ESTADOS ---
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudEnviada | null>(null);
  const [showCrearSolicitud, setShowCrearSolicitud] = useState(false);
  const handledParamRef = useRef<string | null>(null);

  // --- DATA FETCHING ---
  const { data, isLoading, isFetching } = useSolicitudes(page, 20);

  const solicitudes = data?.data ?? [];
  const totalSolicitudesGlobal = data?.total ?? 0;
  const totalPages = Math.ceil(totalSolicitudesGlobal / 20);

  // Mapeo de datos y contador de pendientes en la página actual
  const { sinVerCount } = useMemo(() => {
    const count = solicitudes.reduce((acc, sol) => {
      const estadoUI = getEstadoRelevanteUI(sol);
      const esPendiente = sol.is_host
        ? ['Modificado', 'Modificado por creador'].includes(estadoUI)
        : ['Pendiente', 'Modificado por creador'].includes(estadoUI);
      return esPendiente ? acc + 1 : acc;
    }, 0);
    return { sinVerCount: count };
  }, [solicitudes]);

  // --- HANDLERS ---
  const handleOpenSolicitud = useCallback((solicitud: SolicitudEnviada) => setSelectedSolicitud(solicitud), []);
  const handleCloseSolicitud = useCallback(() => setSelectedSolicitud(null), []);
  const handleNextPage = () => { if (page < totalPages) setPage(p => p + 1); };
  const handlePrevPage = () => { if (page > 1) setPage(p => p - 1); };

  // --- EFECTOS ---
  useEffect(() => { if (refreshing) setPage(1); }, [refreshing]);

  useEffect(() => {
    if (!solicitudIdParam || solicitudes.length === 0 || handledParamRef.current === solicitudIdParam) return;
    const encontrada = solicitudes.find(s => s.solicitud_id === Number(solicitudIdParam));
    if (encontrada) {
      setSelectedSolicitud(encontrada);
      handledParamRef.current = solicitudIdParam;
    }
  }, [solicitudIdParam, solicitudes]);

  return (
    <ThemedView style={styles.container}>
      {/* BUSCADOR */}
      <View style={[styles.searchContainer, { paddingTop: insets.top + 10 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            placeholder="Buscar título, descripción o personas..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#999"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* INFO BAR (Pendientes) */}
      <View style={styles.headerInfo}>
        <View style={styles.infoRow}>
          {sinVerCount > 0 ? (
            <View style={styles.unseenBadge}>
              <Ionicons name="alert-circle" size={14} color={colors.tint} />
              <Text style={styles.unseenText}>
                {sinVerCount} {sinVerCount === 1 ? 'sin ver en esta página' : 'sin ver en esta página'}
              </Text>
            </View>
          ) : (
            <Text style={styles.totalCountText}>Todo al día en esta página</Text>
          )}
        </View>
        {isFetching && <ActivityIndicator size="small" color={colors.tint} />}
      </View>

      {/* LISTA */}
      <SolicitudesList
        solicitudes={solicitudes}
        isLoading={isLoading || isFetching}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onOpenSolicitud={handleOpenSolicitud}
      />

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <View style={[styles.paginationWrapper, { bottom: insets.bottom + 16 }]}>
          <View style={styles.paginationContent}>
            <TouchableOpacity
              style={[styles.pageBtn, page === 1 && styles.btnDisabled]}
              onPress={handlePrevPage}
              disabled={page === 1}
            >
              <Ionicons name="chevron-back" size={16} color="#fff" />
            </TouchableOpacity>

            <View style={styles.pageIndicator}>
              <Text style={styles.pageValue}>{page} de {totalPages}</Text>
            </View>

            <TouchableOpacity
              style={[styles.pageBtn, page === totalPages && styles.btnDisabled]}
              onPress={handleNextPage}
              disabled={page === totalPages}
            >
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* BOTÓN FLOTANTE */}
      <View style={[styles.floatingButtonContainer, { bottom: insets.bottom + 16, right: 24 }]}>
        <CreateButton onPress={() => setShowCrearSolicitud(true)} size={56} />
      </View>

      {/* MODALES */}
      {selectedSolicitud && (
        <Solicitud visible solicitud={selectedSolicitud} onClose={handleCloseSolicitud} />
      )}
      <CrearSolicitud visible={showCrearSolicitud} onClose={() => setShowCrearSolicitud(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  unseenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  unseenText: { fontSize: 12, fontWeight: '700', color: colors.tint },
  totalCountText: { fontSize: 12, color: '#999', fontWeight: '500' },
  paginationWrapper: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  paginationContent: {
    flexDirection: 'row',
    backgroundColor: colors.componentBackground,
    borderRadius: 30,
    padding: 6,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lightTint,
    justifyContent: 'center',
    alignItems: 'center'
  },
  btnDisabled: {
    backgroundColor: '#cbd5e0'
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  pageIndicator: {
    paddingHorizontal: 15
  },
  pageValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text
  },
  floatingButtonContainer: {
    position: 'absolute',
    zIndex: 10
  },
});