import { GlassTabSelector } from '@/components/ui/GlassTabSelector';
import { SearchBar } from '@/components/ui/SearchBar';
import { useIdempotencyKey } from '@/shared/useIdempotencyKey';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import type { UserSummary } from '@/shared/users/User';
import { useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DetalleHorasExtraSheet } from '../components/DetalleHorasExtraSheet';
import { FeriadosList } from '../components/FeriadosList';
import { HorasSemanalesList } from '../components/HorasSemanalesList';
import { HorariosToast } from '../components/HorariosToast';
import { LiquidacionList } from '../components/LiquidacionList';
import { LiquidarAmountModal } from '../components/LiquidarAmountModal';
import type { HorasExtraDTO } from '../models/HorasExtra';
import { useLiquidarHorasExtra } from '../viewmodels/useHorasExtra';
import { SHIFT_ROLES } from './GestionHorarios';

import { INK, LINE, MUTED } from '../theme';

function formatHoras(n: number): string {
  return `${Math.round(n * 10) / 10} hs`;
}

type HorasExtrasTab = 'liquidacion' | 'feriados' | 'semanales';

export function HorasExtras() {
  const [activeTab, setActiveTab] = useState<HorasExtrasTab>('liquidacion');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState<HorasExtraDTO | null>(null);
  const [liquidarTarget, setLiquidarTarget] = useState<HorasExtraDTO | null>(null);
  const [liquidandoId, setLiquidandoId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { idempotencyKey, regenerateIdempotencyKey } = useIdempotencyKey();

  const filter = useMemo(
    () => ({
      userContextId: selectedUser?.user_context_id,
      role: roleFilter ?? undefined,
    }),
    [selectedUser, roleFilter],
  );

  const userSearchQuery = useSearchUsers(searchQuery);
  const { mutate: liquidar } = useLiquidarHorasExtra();

  const userResults = userSearchQuery.data ?? [];

  const showToast = useCallback(
    (msg: string, isError = false) => {
      setToast(msg);
      setToastError(isError);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(''), 2300);
    },
    [toastAnim],
  );

  const selectUser = useCallback((user: UserSummary) => {
    setSelectedUser(user);
    setSearchQuery('');
  }, []);

  const clearUserSearch = useCallback(() => {
    setSelectedUser(null);
    setSearchQuery('');
  }, []);

  const closeDetail = useCallback(() => setDetail(null), []);

  // Ambos puntos de entrada (card de la lista y sheet de detalle) sólo abren
  // el modal de monto: la liquidación real la dispara `confirmLiquidar` una
  // vez que el usuario eligió (y validó) la cantidad.
  const openLiquidar = useCallback(
    (empleado: HorasExtraDTO) => {
      // El backend exige horas > 0 (query param `horas`); `horas` puede venir
      // en 0 o negativo (saldo en contra), en cuyo caso no hay nada liquidable.
      if (empleado.horas <= 0) {
        showToast('No hay horas extra positivas para liquidar.', true);
        return;
      }
      setLiquidarTarget(empleado);
    },
    [showToast],
  );

  const closeLiquidarModal = useCallback(() => setLiquidarTarget(null), []);

  const confirmLiquidar = useCallback(
    (horas: number) => {
      if (!liquidarTarget) return;
      setLiquidandoId(liquidarTarget.userContextId);
      liquidar(
        { userContextId: liquidarTarget.userContextId, horas, idempotencyKey },
        {
          onSuccess: (result) => {
            regenerateIdempotencyKey();
            showToast(
              `Liquidado. Disponible: ${formatHoras(result.horasDisponibles)}`,
            );
            closeDetail();
            closeLiquidarModal();
            setLiquidandoId(null);
          },
          onError: (error) => {
            // El backend responde 422 con mensaje si `horas` excede el
            // disponible (poco probable ya que el input viene topeado, pero
            // puede pasar por una carrera con otra liquidación concurrente).
            showToast(error.message || 'Error al liquidar. Intenta de nuevo.', true);
            setLiquidandoId(null);
          },
        },
      );
    },
    [liquidarTarget, liquidar, idempotencyKey, regenerateIdempotencyKey, showToast, closeDetail, closeLiquidarModal],
  );

  const activeFilterCount = roleFilter !== null ? 1 : 0;

  const clearFilters = useCallback(() => {
    setRoleFilter(null);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <GlassTabSelector
          tabs={[
            { key: 'semanales', label: 'Por semana' },
            { key: 'feriados', label: 'Feriados' },
            { key: 'liquidacion', label: 'Liquidación' },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as HorasExtrasTab)}
        />

        {/* Filters (compartidos por las 3 pestañas) */}
        <View style={styles.filters}>
          <SearchBar
            placeholder="Buscar empleado"
            value={selectedUser ? `${selectedUser.nombre} ${selectedUser.apellido}` : searchQuery}
            onChangeText={(value) => { if (!selectedUser) setSearchQuery(value); }}
            onClear={clearUserSearch}
            style={styles.searchBar}
          />

          {!selectedUser && searchQuery.trim().length > 1 && (
            <View style={[glassStyles.modalCard, styles.userResultsBox]}>
              {userSearchQuery.isFetching ? (
                <ActivityIndicator size="small" color={MUTED} style={styles.userResultsLoading} />
              ) : userResults.length === 0 ? (
                <Text style={styles.userResultsEmpty}>No se encontraron usuarios</Text>
              ) : (
                userResults.map((u) => (
                  <TouchableOpacity
                    key={u.user_context_id}
                    style={styles.userResultItem}
                    onPress={() => selectUser(u)}
                  >
                    <Text style={styles.userResultName}>{u.nombre} {u.apellido}</Text>
                    <Text style={styles.userResultEmail}>{u.email}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Filtrar */}
          <View style={styles.filterBar}>
            <TouchableOpacity
              onPress={() => setShowFilters((v) => !v)}
              style={[styles.filterToggle, activeFilterCount > 0 ? styles.filterToggleActive : styles.filterToggleInactive]}
            >
              <Ionicons
                name="filter-outline"
                size={20}
                color={activeFilterCount > 0 ? glassColors.link : glassColors.textMuted}
              />
              <Text
                style={[
                  styles.filterToggleText,
                  activeFilterCount > 0 ? styles.filterToggleTextActive : styles.filterToggleTextInactive,
                ]}
              >
                Filtrar
              </Text>
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.clearText}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>

          {showFilters && (
            <View style={styles.filterPanel}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Rol</Text>
                <View style={styles.chipRow}>
                  <FilterChip label="Todos" active={roleFilter === null} onPress={() => setRoleFilter(null)} />
                  {SHIFT_ROLES.map((r) => (
                    <FilterChip
                      key={r.value}
                      label={r.label}
                      active={roleFilter === r.value}
                      onPress={() => setRoleFilter(r.value)}
                    />
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {activeTab === 'liquidacion' ? (
        <LiquidacionList
          filter={filter}
          liquidandoId={liquidandoId}
          onOpenDetail={setDetail}
          onOpenLiquidar={openLiquidar}
        />
      ) : activeTab === 'feriados' ? (
        <FeriadosList filter={filter} onToast={showToast} />
      ) : (
        <HorasSemanalesList filter={filter} />
      )}

      <DetalleHorasExtraSheet
        visible={detail !== null}
        empleado={detail}
        isLiquidando={detail !== null && liquidandoId === detail.userContextId}
        onClose={closeDetail}
        onLiquidar={openLiquidar}
      />

      <LiquidarAmountModal
        visible={liquidarTarget !== null}
        empleado={liquidarTarget}
        isLiquidando={liquidarTarget !== null && liquidandoId === liquidarTarget.userContextId}
        onConfirm={confirmLiquidar}
        onClose={closeLiquidarModal}
      />

      <HorariosToast
        message={toast}
        error={toastError}
        opacity={toastAnim}
      />
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topSection: {
    paddingHorizontal: 18,
    paddingTop: 4,
    flexShrink: 0,
  },
  searchBar: {
    marginHorizontal: 0,
    marginVertical: 0,
  },
  filters: {
    gap: 10,
    marginTop: 14,
    marginBottom: 16,
    zIndex: 10,
  },
  userResultsBox: {
    maxHeight: 260,
    overflow: 'hidden',
  },
  userResultsLoading: {
    paddingVertical: 16,
  },
  userResultsEmpty: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  userResultItem: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  userResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: INK,
  },
  userResultEmail: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: MUTED,
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
});
