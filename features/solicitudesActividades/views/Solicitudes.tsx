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
import { ChatsList } from '../components/ChatsList';
import { ConversacionChat } from '../components/ConversacionChat';
import { CrearSolicitud } from '../components/CrearSolicitud';
import { Solicitud } from '../components/Solicitud';
import { SolicitudesList } from '../components/SolicitudesList';

// Modelos, Hooks y Mappers
import { EstadoInvitacionDB, SolicitudEnviada, estadoInvitacionMapping } from '../models/Solicitud';
import { useBuscarSolicitudes, useSolicitudes } from '../viewmodels/useSolicitudes';

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'solicitudes' | 'chats'>('solicitudes');
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudEnviada | null>(null);
  const [selectedChat, setSelectedChat] = useState<SolicitudEnviada | null>(null);
  const [showCrearSolicitud, setShowCrearSolicitud] = useState(false);
  const handledParamRef = useRef<string | null>(null);

  const isChatsTab = activeTab === 'chats';

  // --- DATA FETCHING ---
  const isSearching = debouncedSearch.trim().length > 0;
  const tipoConversacion = isChatsTab ? ('CHAT' as const) : undefined;
  const { data, isLoading, isFetching } = useSolicitudes(page, 20, !isSearching, tipoConversacion);
  const { data: searchResults, isLoading: isLoadingSearch, isFetching: isFetchingSearch } = useBuscarSolicitudes(
    debouncedSearch,
    tipoConversacion,
  );
  // Queries de badge: siempre activas, page 1, para mostrar el dot en la tab inactiva.
  // Sin type → solicitudes tab badge. Con CHAT → chats tab badge.
  // Cuando coincide con la display query (mismo key) React Query reutiliza cache → sin llamadas extra.
  const { data: solBadgeSource } = useSolicitudes(1, 20, !isSearching, undefined);
  const { data: chatBadgeSource } = useSolicitudes(1, 20, !isSearching, 'CHAT');

  const solicitudesRaw = isSearching ? (searchResults ?? []) : (data?.data ?? []);
  const solicitudes = useMemo(
    () => solicitudesRaw.filter(s => isChatsTab ? s.tipo_actividad === 'CHAT' : s.tipo_actividad !== 'CHAT'),
    [solicitudesRaw, isChatsTab],
  );
  const totalSolicitudesGlobal = isSearching ? 0 : (data?.total ?? 0);
  const totalPages = isSearching ? 0 : Math.ceil(totalSolicitudesGlobal / 20);

  // Contador de pendientes en la página actual (para el info bar)
  const { sinVerCount } = useMemo(() => {
    const count = solicitudes.reduce((acc, sol) => {
      const estadoUI = getEstadoRelevanteUI(sol);
      const esPendiente = sol.is_host
        ? estadoUI === 'Modificado'
        : ['Pendiente', 'Modificado por creador'].includes(estadoUI);
      return esPendiente ? acc + 1 : acc;
    }, 0);
    return { sinVerCount: count };
  }, [solicitudes]);

  // Badges de tabs: cada query alimenta su propia tab.
  const solicitudesTabBadge = useMemo(() =>
    (solBadgeSource?.data ?? [])
      .filter(s => s.tipo_actividad !== 'CHAT')
      .some(sol => {
        const estadoUI = getEstadoRelevanteUI(sol);
        return sol.is_host
          ? estadoUI === 'Modificado'
          : ['Pendiente', 'Modificado por creador'].includes(estadoUI);
      }),
    [solBadgeSource],
  );

  const chatsTabBadge = useMemo(() =>
    (chatBadgeSource?.data ?? []).some(s =>
      s.is_host
        ? s.estado === 'MODIFIED'
        : s.estado === 'SENT' || s.estado === 'MODIFIED_BY_HOST',
    ),
    [chatBadgeSource],
  );

  // --- HANDLERS ---
  const handleOpenSolicitud = useCallback((solicitud: SolicitudEnviada) => setSelectedSolicitud(solicitud), []);
  const handleCloseSolicitud = useCallback(() => setSelectedSolicitud(null), []);
  const handleOpenChat = useCallback((chat: SolicitudEnviada) => setSelectedChat(chat), []);
  const handleCloseChat = useCallback(() => setSelectedChat(null), []);
  const handleChangeTab = useCallback((tab: 'solicitudes' | 'chats') => {
    setActiveTab(prev => {
      if (prev === tab) return prev;
      setPage(1);
      return tab;
    });
  }, []);
  const handleNextPage = () => { if (page < totalPages) setPage(p => p + 1); };
  const handlePrevPage = () => { if (page > 1) setPage(p => p - 1); };

  // --- EFECTOS ---
  useEffect(() => { if (refreshing) setPage(1); }, [refreshing]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!solicitudIdParam || solicitudesRaw.length === 0 || handledParamRef.current === solicitudIdParam) return;
    const encontrada = solicitudesRaw.find(s => s.solicitud_id === Number(solicitudIdParam));
    if (encontrada) {
      if (encontrada.tipo_actividad === 'CHAT') setSelectedChat(encontrada);
      else setSelectedSolicitud(encontrada);
      handledParamRef.current = solicitudIdParam;
    }
  }, [solicitudIdParam, solicitudesRaw]);

  return (
    <ThemedView style={styles.container}>
      {/* BUSCADOR */}
      <View style={[styles.searchContainer, { paddingTop: 10 }]}>
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

        {/* SELECTOR DE PESTAÑAS */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, !isChatsTab && styles.tabItemActive]}
            onPress={() => handleChangeTab('solicitudes')}
          >
            <View style={styles.tabLabelRow}>
              <Text style={[styles.tabText, !isChatsTab && styles.tabTextActive]}>Solicitudes</Text>
              {solicitudesTabBadge && <View style={styles.tabBadgeDot} />}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, isChatsTab && styles.tabItemActive]}
            onPress={() => handleChangeTab('chats')}
          >
            <View style={styles.tabLabelRow}>
              <Text style={[styles.tabText, isChatsTab && styles.tabTextActive]}>Chats</Text>
              {chatsTabBadge && <View style={styles.tabBadgeDot} />}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* INFO BAR (Pendientes) */}
      {!isChatsTab && (
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
          {(isFetching || isFetchingSearch) && <ActivityIndicator size="small" color={colors.tint} />}
        </View>
      )}

      {/* LISTA */}
      {isChatsTab ? (
        <ChatsList
          chats={solicitudes}
          isLoading={isSearching ? (isLoadingSearch || isFetchingSearch) : (isLoading || isFetching)}
          onRefresh={isSearching ? undefined : onRefresh}
          refreshing={isSearching ? false : refreshing}
          onOpenChat={handleOpenChat}
          emptyMessage={isSearching ? 'No se encontraron conversaciones' : undefined}
        />
      ) : (
        <SolicitudesList
          solicitudes={solicitudes}
          isLoading={isSearching ? (isLoadingSearch || isFetchingSearch) : (isLoading || isFetching)}
          onRefresh={isSearching ? undefined : onRefresh}
          refreshing={isSearching ? false : refreshing}
          onOpenSolicitud={handleOpenSolicitud}
          emptyMessage={isSearching ? 'No se encontraron solicitudes' : undefined}
        />
      )}

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
      {selectedChat && (
        <ConversacionChat visible solicitud={selectedChat} onClose={handleCloseChat} />
      )}
      <CrearSolicitud visible={showCrearSolicitud} onClose={() => setShowCrearSolicitud(false)} fromChatsTab={isChatsTab} />
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
  tabBar: {
    flexDirection: 'row',
    marginTop: 10,
    backgroundColor: '#f0f2f5',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabItemActive: {
    backgroundColor: colors.componentBackground,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: colors.tint,
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tabBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.error,
    flexShrink: 0,
  },
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