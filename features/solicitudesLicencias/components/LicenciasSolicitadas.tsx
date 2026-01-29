import { ThemedText } from '@/components/themed-text';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons'; // Importar iconos
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SolicitudLicencia } from '../models/SolicitudLicencia';
import { useGetSolicitudesLicencias } from '../viewmodels/useSolicitudes';

// Mapeo incluyendo "TODOS" para la UI
const estadoMapping: Record<string, string> = {
  'ALL': 'Todos',
  'PENDIENTE': 'Pendiente',
  'PENDIENTE_DOCUMENTACION': 'Pendiente Doc.',
  'PENDIENTE_APROBACION': 'Pendiente Aprob.',
  'APROBADA': 'Aprobada',
  'RECHAZADA': 'Rechazada',
  'CANCELADA': 'Cancelada',
};

export function LicenciasSolicitadas() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Estados
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedEstado, setSelectedEstado] = useState<string>('ALL'); // "Todos" por defecto
  const [showFilters, setShowFilters] = useState(false);

  const { data: solicitudes, isLoading, error } = useGetSolicitudesLicencias({});
  const { data: searchResults, isLoading: isSearching } = useSearchUsers(searchQuery);

  const handleOpenSolicitud = useCallback((solicitudId: number) => {
    router.push({
      pathname: '/(extras)/solicitud-licencia' as any,
      params: { id: solicitudId.toString(), type: 'recibida' },
    });
  }, [router]);

  const handleSelectUser = useCallback((userId: number, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setSearchQuery(userName);
    setShowSuggestions(false);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedUserId(null);
    setSelectedUserName('');
    setShowSuggestions(false);
  }, []);

  const filteredSolicitudes = useMemo(() => {
    let filtered = solicitudes || [];

    if (selectedUserId) {
      filtered = filtered.filter(s => s.usuario_id === selectedUserId);
    }

    if (selectedEstado !== 'ALL') {
      filtered = filtered.filter(s => s.estado === selectedEstado);
    }

    return filtered;
  }, [solicitudes, selectedUserId, selectedEstado]);

  const users = useMemo(() => {
    const list = (searchResults as any)?.data || searchResults;
    return Array.isArray(list) ? list : [];
  }, [searchResults]);

  const renderSeparator = useCallback(() => (
    <View style={[styles.separator, { backgroundColor: colorScheme === 'light' ? '#E0E0E0' : '#333333' }]} />
  ), [colorScheme]);

  const renderItem: ListRenderItem<SolicitudLicencia> = useCallback(({ item }) => {
    // Obtenemos el texto del mapeo (excluimos 'ALL' aquí)
    const estadoUI = estadoMapping[item.estado] || item.estado;
    return (
      <LicenciaSolicitadaItem
        solicitud={item}
        estadoUI={estadoUI}
        onPress={() => handleOpenSolicitud(item.id)}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>Solicitudes Recibidas</ThemedText>
        <View style={styles.underline} />
      </View>

      <SearchBar
        placeholder="Buscar por usuario..."
        value={searchQuery}
        onChangeText={(text) => {
          setSearchQuery(text);
          setShowSuggestions(text.length > 0);
          if (text.length === 0) {
            setSelectedUserId(null);
            setSelectedUserName('');
          }
        }}
        onClear={handleClearSearch}
        onFocus={() => searchQuery.length > 0 && setShowSuggestions(true)}
      />

      {/* Sugerencias con Icono de Usuario */}
      {showSuggestions && searchQuery.length > 0 && !selectedUserId && (
        <View style={styles.suggestionsContainer}>
          {isSearching ? (
            <ActivityIndicator size="small" color={colors.tint} style={{ padding: 10 }} />
          ) : users.length > 0 ? (
            users.map((user: any) => (
              <TouchableOpacity
                key={user.id || user.user_context_id}
                style={styles.suggestionItem}
                onPress={() => handleSelectUser(user.id || user.user_context_id, `${user.nombre} ${user.apellido}`)}
              >
                <Ionicons name="person-circle-outline" size={24} color={colors.icon} />
                <ThemedText style={styles.suggestionText}>{user.nombre} {user.apellido}</ThemedText>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.suggestionItem}>
              <ThemedText style={styles.suggestionText}>No se encontraron usuarios</ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Filtros Collapsible */}
      <View style={styles.filtersSection}>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterToggle}
        >
          <Ionicons name={showFilters ? "chevron-up" : "options-outline"} size={18} color="#00054bff" />
          <ThemedText style={styles.filterToggleText}>
            Estado: {estadoMapping[selectedEstado]}
          </ThemedText>
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.collapsibleContent}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {Object.entries(estadoMapping).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setSelectedEstado(key)}
                  style={[
                    styles.chip,
                    selectedEstado === key && styles.chipSelected
                  ]}
                >
                  <ThemedText style={[styles.chipText, selectedEstado === key && styles.chipTextSelected]}>
                    {value}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Lista o Mensaje Vacío Personalizado */}
      {filteredSolicitudes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={48} color="#ccc" />
          <ThemedText style={styles.emptyTitle}>
            {selectedUserId 
              ? `No hay solicitudes de ${selectedUserName}` 
              : "No hay resultados"}
          </ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Intenta cambiar el filtro de estado o buscar otro usuario
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredSolicitudes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

interface LicenciaSolicitadaItemProps {
  solicitud: SolicitudLicencia;
  estadoUI: string;
  onPress: () => void;
}

// --- Componente del Item ---
function LicenciaSolicitadaItem({ solicitud, estadoUI, onPress }: LicenciaSolicitadaItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getEstadoColor = (estado: string) => {
    if (estado.includes('Aprobada')) return '#4CAF50';
    if (estado.includes('Rechazada')) return '#F44336';
    if (estado.includes('Pendiente')) return '#FF9800';
    return colors.icon;
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.itemContainer}>
      <View style={styles.itemContent}>
        <ThemedText type="defaultSemiBold">{solicitud.tipo_nombre || 'Licencia'}</ThemedText>
        <ThemedText style={{ color: colors.icon, fontSize: 13 }}>
          {solicitud.usuario_nombre} {solicitud.usuario_apellido} • {solicitud.cantidad_dias} días
        </ThemedText>
        <View style={styles.footerContainer}>
          <ThemedText style={styles.dateText}>{new Date(solicitud.fecha_inicio).toLocaleDateString()}</ThemedText>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(estadoUI) + '15' }]}>
            <ThemedText style={[styles.estadoText, { color: getEstadoColor(estadoUI) }]}>{estadoUI}</ThemedText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 },
  title: { color: '#00054bff', fontSize: 14, justifyContent: 'center' },
  underline: { height: 3, backgroundColor: '#00054bff', width: 100, marginTop: 4, borderRadius: 2 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  // Buscador y Sugerencias
  suggestionsContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 5,
    shadowOpacity: 0.1,
    zIndex: 10,
    marginTop: -5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
    gap: 10
  },
  suggestionText: { fontSize: 14, color: '#333' },

  // Filtros Collapsible
  filtersSection: { marginHorizontal: 16, marginBottom: 10 },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6
  },
  filterToggleText: { color: '#00054bff', fontWeight: '600', fontSize: 14 },
  collapsibleContent: { marginTop: 5 },
  chipsScroll: { flexDirection: 'row', paddingVertical: 5 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  chipSelected: { backgroundColor: '#00054bff', borderColor: '#00054bff' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextSelected: { color: '#FFF', fontWeight: '600' },

  // Lista
  itemContainer: { padding: 16, marginHorizontal: 16, marginVertical: 4, backgroundColor: '#f9f9f9', borderRadius: 12 },
  itemContent: { gap: 4 },
  footerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  dateText: { fontSize: 12, color: '#888' },
  estadoBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  estadoText: { fontSize: 11, fontWeight: '700' },
  separator: { height: 1, marginHorizontal: 16 },

  // Empty State
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 12, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#888', marginTop: 4, textAlign: 'center' }
});