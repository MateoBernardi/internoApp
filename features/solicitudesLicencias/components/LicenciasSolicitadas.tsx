import { ThemedText } from '@/components/themed-text';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors } from '@/constants/theme';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons'; // Importar iconos
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SolicitudLicencia } from '../models/SolicitudLicencia';
import { formatCantidadLicencia } from '../utils/formatCantidad';
import { useGetSolicitudesLicencias } from '../viewmodels/useSolicitudes';
import { SolicitudLicencia as SolicitudLicenciaModal } from './SolicitudLicencia';

// Mapeo incluyendo "TODOS" para la UI
const estadoMapping: Record<string, string> = {
  'ALL': 'Todos',
  'PENDIENTE': 'Pendiente',
  'PENDIENTE_DOCUMENTACION': 'Pendiente Doc.',
  'PENDIENTE_APROBACION': 'Pendiente Aprob.',
  'APROBADA': 'Aprobada',
  'RECHAZADA': 'Rechazada',
  'CANCELADA': 'Cancelada',
  'EXPIRADA': 'Expirada',
};

const colors = Colors['light'];

export function LicenciasSolicitadas() {
  // Estados
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSolicitudId, setSelectedSolicitudId] = useState<number | null>(null);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: solicitudes, isLoading, refetch, isRefetching } = useGetSolicitudesLicencias({});
  const { data: searchResults, isLoading: isSearching } = useSearchUsers(searchQuery);

  const handleOpenSolicitud = useCallback((solicitudId: number) => {
    setSelectedSolicitudId(solicitudId);
    setDetalleVisible(true);
    setShowSuggestions(false);
  }, []);

  const handleCloseDetalle = useCallback(() => {
    setDetalleVisible(false);
    setSelectedSolicitudId(null);
  }, []);

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

    if (estadoFilter.length > 0) {
      filtered = filtered.filter(s => estadoFilter.includes(s.estado));
    }

    return filtered;
  }, [solicitudes, selectedUserId, estadoFilter]);

  const toggleEstadoFilter = useCallback((value: string) => {
    setEstadoFilter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  }, []);

  const clearFilters = useCallback(() => setEstadoFilter([]), []);

  const users = searchResults || [];

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
      <SearchBar
        placeholder="Buscar un usuario..."
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

      {/* Barra de filtros — mismo patrón que el inbox de Solicitudes */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          onPress={() => setShowFilters(v => !v)}
          style={[
            styles.filterToggle,
            estadoFilter.length > 0 ? styles.filterToggleActive : styles.filterToggleInactive,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Filtrar"
        >
          <Ionicons
            name="filter-outline"
            size={20}
            color={estadoFilter.length > 0 ? glassColors.link : glassColors.textMuted}
          />
          <ThemedText
            style={[
              styles.filterToggleText,
              estadoFilter.length > 0 ? styles.filterToggleTextActive : styles.filterToggleTextInactive,
            ]}
          >
            Filtrar
          </ThemedText>
          {estadoFilter.length > 0 && (
            <View style={styles.filterBadge}>
              <ThemedText style={styles.filterBadgeText}>{estadoFilter.length}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
        {estadoFilter.length > 0 && (
          <TouchableOpacity onPress={clearFilters}>
            <ThemedText style={styles.clearText}>Limpiar</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterGroup}>
            <ThemedText style={styles.filterGroupLabel}>Estado</ThemedText>
            <View style={styles.chipRow}>
              {Object.entries(estadoMapping)
                .filter(([key]) => key !== 'ALL')
                .map(([key, value]) => (
                  <FilterChip
                    key={key}
                    label={value}
                    active={estadoFilter.includes(key)}
                    onPress={() => toggleEstadoFilter(key)}
                  />
                ))}
            </View>
          </View>
        </View>
      )}

      {/* Lista o Mensaje Vacío Personalizado */}
      {filteredSolicitudes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={48} color={colors.icon} />
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
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.tint]}
              tintColor={colors.tint}
            />
          }
        />
      )}

      {selectedSolicitudId !== null && (
        <SolicitudLicenciaModal
          visible={detalleVisible}
          onClose={handleCloseDetalle}
          solicitudId={selectedSolicitudId}
          type="recibida"
        />
      )}
    </View>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <ThemedText style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

interface LicenciaSolicitadaItemProps {
  solicitud: SolicitudLicencia;
  estadoUI: string;
  onPress: () => void;
}

// --- Componente del Item ---
function LicenciaSolicitadaItem({ solicitud, estadoUI, onPress }: LicenciaSolicitadaItemProps) {
  const getEstadoColor = (estado: string) => {
    if (estado.includes('Aprobada')) return colors.success;
    if (estado.includes('Rechazada')) return colors.error;
    if (estado.includes('Pendiente')) return colors.warning;
    if (estado.includes('Expirada')) return '#757575';
    return colors.icon;
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.itemContainer}>
      <View style={styles.itemContent}>
        <ThemedText type="defaultSemiBold">{solicitud.tipo_nombre || 'Licencia'}</ThemedText>
        <ThemedText style={{ color: colors.icon, fontSize: 13 }}>
          {solicitud.usuario_nombre} {solicitud.usuario_apellido} • {formatCantidadLicencia(solicitud.cantidad_dias, solicitud.cantidad_horas)}
        </ThemedText>
        <View style={styles.footerContainer}>
          <ThemedText style={styles.dateText}>{solicitud.fecha_inicio ? new Date(solicitud.fecha_inicio).toLocaleDateString() : 'Sin fecha'}</ThemedText>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(estadoUI) + '15' }]}>
            <ThemedText style={[styles.estadoText, { color: getEstadoColor(estadoUI) }]}>{estadoUI}</ThemedText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.componentBackground },
  title: { color: colors.tint, fontSize: 14, justifyContent: 'center' },
  underline: { height: 3, backgroundColor: colors.tint, width: 100, marginTop: 4, borderRadius: 2 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: '5%' },

  // Buscador y Sugerencias
  suggestionsContainer: {
    backgroundColor: colors.componentBackground,
    marginHorizontal: '4%',
    borderRadius: 8,
    elevation: 5,
    shadowOpacity: 0.1,
    zIndex: 10,
    marginTop: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: '3%',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.background,
    gap: 10
  },
  suggestionText: { fontSize: 14, color: colors.text },

  // Filtros — mismo patrón que SolicitudesList (inbox de Solicitudes)
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '4%',
    paddingVertical: 6,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterToggleActive: {
    borderColor: 'rgba(26,115,232,0.35)',
    backgroundColor: 'rgba(26,115,232,0.12)',
  },
  filterToggleInactive: {
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  filterToggleTextActive: {
    color: glassColors.link,
  },
  filterToggleTextInactive: {
    color: glassColors.textMuted,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: glassColors.link,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: glassColors.link,
  },
  filterPanel: {
    marginHorizontal: '4%',
    marginBottom: 6,
    padding: 12,
    gap: 10,
    ...glassStyles.card,
  },
  filterGroup: {
    gap: 6,
  },
  filterGroupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondaryText,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  filterChipActive: {
    borderColor: 'rgba(26,115,232,0.35)',
    backgroundColor: 'rgba(26,115,232,0.12)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: glassColors.textMuted,
  },
  filterChipTextActive: {
    color: glassColors.link,
  },

  // Lista
  itemContainer: { padding: '4%', marginHorizontal: '4%', marginVertical: 4, ...glassStyles.card },
  itemContent: { gap: 4 },
  footerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  dateText: { fontSize: 12, color: colors.secondaryText },
  estadoBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  estadoText: { fontSize: 11, fontWeight: '700', color: colors.text },

  // Empty State
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: colors.secondaryText, marginTop: 4, textAlign: 'center' }
});