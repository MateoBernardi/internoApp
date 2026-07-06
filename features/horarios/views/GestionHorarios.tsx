import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { allRoles } from '@/shared/users/roles';
import type { UserSummary } from '@/shared/users/User';
import { useSearchUsers } from '@/shared/users/useUser';
import { EditarTurnoSheet } from '../components/EditarTurnoSheet';
import { TurnoCard } from '../components/TurnoCard';
import type { UpdateHorarioPayload } from '../models/HorarioDTO';
import { mapHorarioDTOToTurno, TURNO_LABEL, type Turno } from '../models/Turno';
import type { HorariosByDateFilter } from '../services/horariosService';
import {
  useHorariosByDate,
  useSedes,
  useUpdateHorario,
  useUploadShifts,
} from '../viewmodels/useHorarios';

const NAVY = '#2b1f5c';
const TURNO_COLOR = '#2f86d6';
const LINE = '#e8eaed';
const MUTED = '#7a8087';
const INK = '#1c2024';
const CARD = '#f6f7f9';
const PANEL = '#eef0f2';
const GREEN_FLASH = '#22c55e';
const RED_FLASH = '#e2543b';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type TurnoFilter = 'Todos' | 'MANANA' | 'TARDE';
const FILTER_OPTS: { value: TurnoFilter; label: string }[] = [
  { value: 'Todos', label: 'Todos' },
  { value: 'MANANA', label: TURNO_LABEL.MANANA },
  { value: 'TARDE', label: TURNO_LABEL.TARDE },
];

// Solo roles con turnos: Encargado, Gerencia y todo el personal operativo.
const SHIFT_ROLES = allRoles.filter(
  (r) => r.value === 'encargado' || r.value === 'gerencia' || r.label.startsWith('Personal '),
);

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftDay(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAY_NAMES[dt.getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function GestionHorarios() {
  const [selDateISO, setSelDateISO] = useState(todayISO);
  const [filter, setFilter] = useState<TurnoFilter>('Todos');
  const [sedeFilter, setSedeFilter] = useState<number | null>(null);
  const [showSedeMenu, setShowSedeMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [rolFilter, setRolFilter] = useState<string | null>(null);
  const [showRolMenu, setShowRolMenu] = useState(false);
  const [editingTurno, setEditingTurno] = useState<Turno | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // El backend solo acepta un filtro por request: prioriza el empleado buscado
  // sobre el rol si por algún motivo ambos quedaran seteados.
  const activeFilter: HorariosByDateFilter | undefined = selectedUser
    ? { key: 'usuario', value: selectedUser.user_context_id }
    : rolFilter
      ? { key: 'rol_nombre', value: rolFilter }
      : undefined;

  const horariosQuery = useHorariosByDate(selDateISO, activeFilter);
  const sedesQuery = useSedes();
  const userSearchQuery = useSearchUsers(searchQuery);
  const { mutate: uploadShifts, isPending: isUploading } = useUploadShifts();
  const { mutate: updateShift, isPending: isSaving } = useUpdateHorario();

  const sedes = sedesQuery.data ?? [];
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

  const dayTurnos = useMemo(() => {
    const dtos = horariosQuery.data ?? [];
    const mapped = dtos.map(mapHorarioDTOToTurno);
    return mapped.filter((t) => {
      if (filter !== 'Todos' && t.turno !== filter) return false;
      if (sedeFilter !== null && t.sedeIdIngreso !== sedeFilter) return false;
      return true;
    });
  }, [horariosQuery.data, filter, sedeFilter]);

  const totalForDay = horariosQuery.data?.length ?? 0;

  const openEdit = useCallback((turno: Turno) => {
    setEditingTurno({ ...turno });
  }, []);

  const setField = useCallback(<K extends keyof Turno>(key: K, value: Turno[K]) => {
    setEditingTurno((d) => (d ? { ...d, [key]: value } : d));
  }, []);

  const closeEdit = useCallback(() => {
    setEditingTurno(null);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingTurno) return;
    const payload: UpdateHorarioPayload = {
      id: editingTurno.id,
      turno: editingTurno.turno,
      horario_in: `${editingTurno.fechaISO}T${editingTurno.ingreso}:00`,
      horario_out: `${editingTurno.fechaISO}T${editingTurno.egreso}:00`,
      sede_id_in: editingTurno.sedeIdIngreso,
      sede_id_out: editingTurno.sedeIdEgreso,
      licencia: editingTurno.licencia ? 1 : 0,
    };
    updateShift(payload, {
      onSuccess: () => {
        showToast('Turno actualizado');
        closeEdit();
      },
      onError: () => {
        showToast('Error al guardar. Intenta de nuevo.', true);
      },
    });
  }, [editingTurno, updateShift, showToast, closeEdit]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'web' ? 'text/plain' : '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const { uri, name } = result.assets[0];
      uploadShifts(
        { uri, name: name ?? 'shifts.txt' },
        {
          onSuccess: (resp) => {
            showToast(`${resp.totalInsertados} turno${resp.totalInsertados !== 1 ? 's' : ''} importados`);
          },
          onError: () => {
            showToast('Error al importar el archivo', true);
          },
        },
      );
    } catch {
      showToast('Error al leer el archivo', true);
    }
  };

  const sedeDropdownLabel =
    sedeFilter !== null
      ? (sedes.find((s) => s.id === sedeFilter)?.nombre ?? `Sede ${sedeFilter}`)
      : 'Todas';

  const rolDropdownLabel =
    rolFilter !== null
      ? (SHIFT_ROLES.find((r) => r.value === rolFilter)?.label ?? rolFilter)
      : 'Todos';

  const selectUser = useCallback((user: UserSummary) => {
    setSelectedUser(user);
    setSearchQuery('');
    setRolFilter(null); // el backend solo admite un filtro por request
  }, []);

  const clearUserSearch = useCallback(() => {
    setSelectedUser(null);
    setSearchQuery('');
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Turnos del día · tocá uno para editarlo</Text>

        {/* Day navigator */}
        <View style={styles.dayNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setSelDateISO((d) => shiftDay(d, -1))}>
            <Ionicons name="chevron-back" size={22} color={NAVY} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dayLabelBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dayLabel}>{formatDayLabel(selDateISO)}</Text>
            <Ionicons name="calendar-outline" size={16} color={NAVY} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setSelDateISO((d) => shiftDay(d, 1))}>
            <Ionicons name="chevron-forward" size={22} color={NAVY} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            visible={showDatePicker}
            value={isoToDate(selDateISO)}
            mode="date"
            onConfirm={(date) => {
              setSelDateISO(dateToISO(date));
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
        )}

        {/* TXT import card */}
        <View style={styles.importCard}>
          <View style={styles.importIcon}>
            {isUploading ? (
              <ActivityIndicator size="small" color={MUTED} />
            ) : (
              <Ionicons name="cloud-upload-outline" size={22} color={MUTED} />
            )}
          </View>
          <View style={styles.importText}>
            <Text style={styles.importTitle}>Importar TXT</Text>
            <Text style={styles.importSub}>
              {isUploading ? 'Subiendo planilla…' : 'Planilla de turnos'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.importBtn, isUploading && styles.importBtnDisabled]}
            onPress={handlePickFile}
            disabled={isUploading}
          >
            <Text style={styles.importBtnText}>Subir</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          {/* Search */}
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

          {/* Turno segmented */}
          <View style={styles.segRow}>
            {FILTER_OPTS.map((f) => {
              const active = filter === f.value;
              return (
                <TouchableOpacity
                  key={f.value}
                  style={[styles.segBtn, active && styles.segBtnActive]}
                  onPress={() => setFilter(f.value)}
                >
                  <Text style={[styles.segLabel, active && styles.segLabelActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sede dropdown */}
          <TouchableOpacity
            style={styles.sedeDropdown}
            onPress={() => { setShowRolMenu(false); setShowSedeMenu((v) => !v); }}
          >
            <Text style={styles.sedeDropdownPrefix}>Sede </Text>
            <Text style={styles.sedeDropdownValue}>{sedeDropdownLabel}</Text>
            <Ionicons name={showSedeMenu ? 'chevron-up' : 'chevron-down'} size={15} color={MUTED} />
          </TouchableOpacity>

          {showSedeMenu && (
            <View style={styles.sedeMenuBox}>
              <TouchableOpacity
                style={[styles.sedeMenuItem, sedeFilter === null && styles.sedeMenuItemActive]}
                onPress={() => { setSedeFilter(null); setShowSedeMenu(false); }}
              >
                <Text style={[styles.sedeMenuItemText, sedeFilter === null && styles.sedeMenuItemTextActive]}>
                  Todas
                </Text>
                {sedeFilter === null && <Ionicons name="checkmark" size={16} color={TURNO_COLOR} />}
              </TouchableOpacity>
              {sedes.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.sedeMenuItem, sedeFilter === s.id && styles.sedeMenuItemActive]}
                  onPress={() => { setSedeFilter(s.id); setShowSedeMenu(false); }}
                >
                  <Text style={[styles.sedeMenuItemText, sedeFilter === s.id && styles.sedeMenuItemTextActive]}>
                    {s.nombre}
                  </Text>
                  {sedeFilter === s.id && <Ionicons name="checkmark" size={16} color={TURNO_COLOR} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Rol dropdown */}
          <TouchableOpacity
            style={styles.sedeDropdown}
            onPress={() => { setShowSedeMenu(false); setShowRolMenu((v) => !v); }}
          >
            <Text style={styles.sedeDropdownPrefix}>Rol </Text>
            <Text style={styles.sedeDropdownValue}>{rolDropdownLabel}</Text>
            <Ionicons name={showRolMenu ? 'chevron-up' : 'chevron-down'} size={15} color={MUTED} />
          </TouchableOpacity>

          {showRolMenu && (
            <View style={styles.sedeMenuBox}>
              <TouchableOpacity
                style={[styles.sedeMenuItem, rolFilter === null && styles.sedeMenuItemActive]}
                onPress={() => { setRolFilter(null); setShowRolMenu(false); }}
              >
                <Text style={[styles.sedeMenuItemText, rolFilter === null && styles.sedeMenuItemTextActive]}>
                  Todos
                </Text>
                {rolFilter === null && <Ionicons name="checkmark" size={16} color={TURNO_COLOR} />}
              </TouchableOpacity>
              {SHIFT_ROLES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.sedeMenuItem, rolFilter === r.value && styles.sedeMenuItemActive]}
                  onPress={() => {
                    setRolFilter(r.value);
                    setSelectedUser(null); // el backend solo admite un filtro por request
                    setShowRolMenu(false);
                  }}
                >
                  <Text style={[styles.sedeMenuItemText, rolFilter === r.value && styles.sedeMenuItemTextActive]}>
                    {r.label}
                  </Text>
                  {rolFilter === r.value && <Ionicons name="checkmark" size={16} color={TURNO_COLOR} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* List */}
        <View style={styles.list}>
          {horariosQuery.isFetching && !horariosQuery.data ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={NAVY} />
              <Text style={styles.stateText}>Cargando turnos…</Text>
            </View>
          ) : horariosQuery.isError ? (
            <View style={styles.centerState}>
              <Ionicons name="alert-circle-outline" size={36} color={RED_FLASH} style={{ marginBottom: 8 }} />
              <Text style={styles.stateText}>No se pudieron cargar los turnos.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => horariosQuery.refetch()}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : dayTurnos.length === 0 ? (
            <View style={styles.centerState}>
              <Ionicons name="calendar-outline" size={36} color={MUTED} style={{ marginBottom: 8 }} />
              <Text style={styles.stateText}>
                {totalForDay === 0
                  ? 'No hay turnos cargados para este día.'
                  : 'Ningún turno coincide con los filtros aplicados.'}
              </Text>
            </View>
          ) : (
            dayTurnos.map((t, i) => {
              const key = t.id != null ? t.id : `${t.userContextId}-${t.fechaISO}-${t.turno}-${i}`;
              if (t.licencia) {
                return (
                  <View key={key} style={styles.licenciaCard}>
                    <Ionicons name="calendar-outline" size={18} color={MUTED} />
                    <Text style={styles.licenciaName}>{t.nombre}</Text>
                    <Text style={styles.licenciaTag}>En licencia</Text>
                  </View>
                );
              }
              return (
                <TurnoCard
                  key={key}
                  turno={t}
                  sedes={sedes}
                  onPress={openEdit}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Info bar */}
      <View style={styles.infoBar}>
        {horariosQuery.isFetching ? (
          <Text style={styles.infoText}>Actualizando…</Text>
        ) : (
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>{dayTurnos.length}</Text>
            {filter !== 'Todos' || sedeFilter !== null || rolFilter !== null || selectedUser ? ` resultado${dayTurnos.length !== 1 ? 's' : ''} · ` : ` turno${dayTurnos.length !== 1 ? 's' : ''} · `}
            <Text style={styles.infoBold}>{totalForDay}</Text>
            {' total en el día'}
          </Text>
        )}
      </View>

      {/* Edit sheet */}
      <EditarTurnoSheet
        visible={editingTurno !== null}
        draft={editingTurno}
        sedes={sedes}
        isSaving={isSaving}
        onClose={closeEdit}
        onField={setField}
        onSave={saveEdit}
      />

      {/* Toast */}
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
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: LINE,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
  },
  dayLabelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'center',
  },
  importCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: LINE,
    gap: 10,
  },
  importIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: PANEL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importText: {
    flex: 1,
  },
  importTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
  },
  importSub: {
    fontSize: 12,
    color: MUTED,
  },
  importBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: NAVY,
  },
  importBtnDisabled: {
    opacity: 0.5,
  },
  importBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
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
  segRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    overflow: 'hidden',
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: CARD,
  },
  segBtnActive: {
    backgroundColor: NAVY,
  },
  segLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
  },
  segLabelActive: {
    color: '#ffffff',
  },
  sedeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sedeDropdownPrefix: {
    fontSize: 14,
    color: MUTED,
    fontWeight: '500',
  },
  sedeDropdownValue: {
    fontSize: 14,
    color: INK,
    fontWeight: '600',
    flex: 1,
  },
  sedeMenuBox: {
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
  sedeMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  sedeMenuItemActive: {
    backgroundColor: '#e7f2fb',
  },
  sedeMenuItemText: {
    fontSize: 15,
    color: INK,
  },
  sedeMenuItemTextActive: {
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
    backgroundColor: GREEN_FLASH,
  },
  toastDotError: {
    backgroundColor: RED_FLASH,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  licenciaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: LINE,
    gap: 10,
  },
  licenciaName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: INK,
  },
  licenciaTag: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
