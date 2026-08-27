import { GlassTabSelector } from '@/components/ui/GlassTabSelector';
import { SearchBar } from '@/components/ui/SearchBar';
import { useIdempotencyKey } from '@/shared/useIdempotencyKey';
import { glassStyles } from '@/shared/ui/glass';
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

import { INK, LINE, MUTED, TURNO_COLOR } from '../theme';

function formatHoras(n: number): string {
  return `${Math.round(n * 10) / 10}h`;
}

type HorasExtrasTab = 'liquidacion' | 'feriados' | 'semanales';

export function HorasExtras() {
  const [activeTab, setActiveTab] = useState<HorasExtrasTab>('liquidacion');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
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

  const roleDropdownLabel = roleFilter
    ? (SHIFT_ROLES.find((r) => r.value === roleFilter)?.label ?? roleFilter)
    : 'Todos';

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <GlassTabSelector
          tabs={[
            { key: 'liquidacion', label: 'Liquidación' },
            { key: 'feriados', label: 'Feriados' },
            { key: 'semanales', label: 'Horas semanales' },
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

          {/* Role dropdown */}
          <TouchableOpacity style={[glassStyles.fieldGlass, styles.roleDropdown]} onPress={() => setShowRoleMenu((v) => !v)}>
            <Text style={styles.roleDropdownPrefix}>Rol </Text>
            <Text style={styles.roleDropdownValue}>{roleDropdownLabel}</Text>
            <Ionicons name={showRoleMenu ? 'chevron-up' : 'chevron-down'} size={15} color={MUTED} />
          </TouchableOpacity>

          {showRoleMenu && (
            <View style={[glassStyles.modalCard, styles.roleMenuBox]}>
              <TouchableOpacity
                style={[styles.roleMenuItem, roleFilter === null && styles.roleMenuItemActive]}
                onPress={() => { setRoleFilter(null); setShowRoleMenu(false); }}
              >
                <Text style={[styles.roleMenuItemText, roleFilter === null && styles.roleMenuItemTextActive]}>
                  Todos
                </Text>
                {roleFilter === null && <Ionicons name="checkmark" size={16} color={TURNO_COLOR} />}
              </TouchableOpacity>
              {SHIFT_ROLES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.roleMenuItem, roleFilter === r.value && styles.roleMenuItemActive]}
                  onPress={() => { setRoleFilter(r.value); setShowRoleMenu(false); }}
                >
                  <Text style={[styles.roleMenuItemText, roleFilter === r.value && styles.roleMenuItemTextActive]}>
                    {r.label}
                  </Text>
                  {roleFilter === r.value && <Ionicons name="checkmark" size={16} color={TURNO_COLOR} />}
                </TouchableOpacity>
              ))}
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
  roleDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  roleDropdownPrefix: {
    fontSize: 14,
    color: MUTED,
    fontWeight: '500',
  },
  roleDropdownValue: {
    fontSize: 14,
    color: INK,
    fontWeight: '600',
    flex: 1,
  },
  roleMenuBox: {
    overflow: 'hidden',
  },
  roleMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  roleMenuItemActive: {
    backgroundColor: '#e7f2fb',
  },
  roleMenuItemText: {
    fontSize: 15,
    color: INK,
  },
  roleMenuItemTextActive: {
    color: TURNO_COLOR,
    fontWeight: '600',
  },
});
