import { useIdempotencyKey } from '@/shared/useIdempotencyKey';
import type { UserSummary } from '@/shared/users/User';
import { useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DetalleHorasExtraSheet } from '../components/DetalleHorasExtraSheet';
import { EmpleadoHorasExtraCard } from '../components/EmpleadoHorasExtraCard';
import { LiquidarAmountModal } from '../components/LiquidarAmountModal';
import type { HorasExtraDTO } from '../models/HorasExtra';
import { useHorasExtra, useLiquidarHorasExtra } from '../viewmodels/useHorasExtra';
import { SHIFT_ROLES } from './GestionHorarios';

const NAVY = '#2b1f5c';
const AMBER = '#c98a1a';
const LINE = '#e8eaed';
const MUTED = '#7a8087';
const INK = '#1c2024';
const CARD = '#f6f7f9';
const RED_FLASH = '#e2543b';
const TURNO_COLOR = '#2f86d6';

function formatHoras(n: number): string {
  return `${Math.round(n * 10) / 10}h`;
}

export function HorasExtras() {
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

  const horasExtraQuery = useHorasExtra(filter);
  const userSearchQuery = useSearchUsers(searchQuery);
  const { mutate: liquidar } = useLiquidarHorasExtra();

  const empleados = horasExtraQuery.data ?? [];
  const userResults = userSearchQuery.data ?? [];
  const totalAll = empleados.reduce((s, e) => s + e.horas, 0);

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search */}
        <View style={styles.filters}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={MUTED} style={styles.searchIcon} />
            {selectedUser ? (
              <Text style={styles.searchSelectedText} numberOfLines={1}>
                {selectedUser.nombre} {selectedUser.apellido}
              </Text>
            ) : (
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar empleado"
                placeholderTextColor={MUTED}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            )}
            {(selectedUser !== null || searchQuery.length > 0) && (
              <TouchableOpacity
                onPress={clearUserSearch}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>

          {!selectedUser && searchQuery.trim().length > 1 && (
            <View style={styles.userResultsBox}>
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
          <TouchableOpacity style={styles.roleDropdown} onPress={() => setShowRoleMenu((v) => !v)}>
            <Text style={styles.roleDropdownPrefix}>Rol </Text>
            <Text style={styles.roleDropdownValue}>{roleDropdownLabel}</Text>
            <Ionicons name={showRoleMenu ? 'chevron-up' : 'chevron-down'} size={15} color={MUTED} />
          </TouchableOpacity>

          {showRoleMenu && (
            <View style={styles.roleMenuBox}>
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

        {/* List */}
        <View style={styles.list}>
          {horasExtraQuery.isFetching && !horasExtraQuery.data ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={NAVY} />
              <Text style={styles.stateText}>Cargando horas extra…</Text>
            </View>
          ) : horasExtraQuery.isError ? (
            <View style={styles.centerState}>
              <Ionicons name="alert-circle-outline" size={36} color={RED_FLASH} style={{ marginBottom: 8 }} />
              <Text style={styles.stateText}>No se pudieron cargar las horas extra.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => horasExtraQuery.refetch()}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : empleados.length === 0 ? (
            <View style={styles.centerState}>
              <Ionicons name="time-outline" size={36} color={MUTED} style={{ marginBottom: 8 }} />
              <Text style={styles.stateText}>No hay empleados con los filtros aplicados.</Text>
            </View>
          ) : (
            empleados.map((e) => (
              <EmpleadoHorasExtraCard
                key={e.userContextId}
                empleado={e}
                isLiquidando={liquidandoId === e.userContextId}
                onPress={setDetail}
                onLiquidar={openLiquidar}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Info bar */}
      <View style={styles.infoBar}>
        {horasExtraQuery.isFetching ? (
          <Text style={styles.infoText}>Actualizando…</Text>
        ) : (
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>{empleados.length}</Text>
            {` empleado${empleados.length !== 1 ? 's' : ''} · `}
            <Text style={styles.infoBold}>{formatHoras(totalAll)}</Text>
            {' horas extra de saldo'}
          </Text>
        )}
      </View>

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

      {toast !== '' && (
        <Animated.View
          style={[styles.toast, toastError && styles.toastError, { opacity: toastAnim }]}
        >
          <View style={[styles.toastDot, toastError && styles.toastDotError]} />
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 80,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 14,
    marginTop: 2,
  },
  filters: {
    gap: 10,
    marginBottom: 16,
    zIndex: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: INK,
    paddingVertical: 0,
  },
  searchSelectedText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: INK,
  },
  userResultsBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    maxHeight: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
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
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
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
  list: {
    gap: 0,
  },
  centerState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  stateText: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: NAVY,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  infoBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LINE,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  infoText: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
  },
  infoBold: {
    fontWeight: '700',
    color: INK,
  },
  toast: {
    position: 'absolute',
    bottom: 72,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c2024',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  toastError: {
    backgroundColor: '#3a1515',
  },
  toastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AMBER,
  },
  toastDotError: {
    backgroundColor: RED_FLASH,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
