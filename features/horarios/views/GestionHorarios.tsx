import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { FullScreenPortal } from '@/shared/ui/FullScreenPortal';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { SearchBar } from '@/components/ui/SearchBar';
import { allRoles } from '@/shared/users/roles';
import type { UserSummary } from '@/shared/users/User';
import { useSearchUsers } from '@/shared/users/useUser';
import { CrearTurnoSheet } from '../components/CrearTurnoSheet';
import { EditarTurnoSheet } from '../components/EditarTurnoSheet';
import { TurnoCard } from '../components/TurnoCard';
import { HorariosToast } from '../components/HorariosToast';
import { normalizeTurno, type UpdateHorarioPayload } from '../models/HorarioDTO';
import type { CrearTurnoPayload } from '../models/Planificacion';
import { buildUpdatePayload, mapHorarioDTOToTurno, TURNO_LABEL, type Turno } from '../models/Turno';
import type { HorariosByDateFilter } from '../services/horariosService';
import {
  useHorariosByDate,
  useMarcarFeriadoDia,
  useSedes,
  useUpdateHorario,
} from '../viewmodels/useHorarios';
import { useCrearTurno } from '../viewmodels/usePlanificacion';

import { CARD, FERIADO_COLOR, INK, LINE, MUTED, NAVY, RED_FLASH } from '../theme';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type TurnoFilter = 'Todos' | 'MANANA' | 'TARDE';
const FILTER_OPTS: { value: TurnoFilter; label: string }[] = [
  { value: 'Todos', label: 'Todos' },
  { value: 'MANANA', label: TURNO_LABEL.MANANA },
  { value: 'TARDE', label: TURNO_LABEL.TARDE },
];

// Solo roles con turnos: Encargado, Gerencia y todo el personal operativo.
export const SHIFT_ROLES = allRoles.filter(
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
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [rolFilter, setRolFilter] = useState<string | null>(null);
  const [editingTurno, setEditingTurno] = useState<Turno | null>(null);
  const [editSession, setEditSession] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [feriadoMenuOpen, setFeriadoMenuOpen] = useState(false);
  const [feriadoMenuStep, setFeriadoMenuStep] = useState<'main' | 'turno'>('main');
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);
  const [infoBarHeight, setInfoBarHeight] = useState(0);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [crearOpen, setCrearOpen] = useState(false);
  const [crearSession, setCrearSession] = useState(0);
  const [crearError, setCrearError] = useState<string | null>(null);

  // El backend solo acepta un filtro por request: prioriza el empleado buscado,
  // y si no hay uno, el rol.
  const activeFilter: HorariosByDateFilter | undefined = selectedUser
    ? { key: 'usuario', value: selectedUser.user_context_id }
    : rolFilter
      ? { key: 'rol_nombre', value: rolFilter }
      : undefined;

  const horariosQuery = useHorariosByDate(selDateISO, activeFilter);
  const sedesQuery = useSedes();
  const userSearchQuery = useSearchUsers(searchQuery);
  const { mutate: crearTurno, isPending: isCreating } = useCrearTurno();
  const { mutate: updateShift, isPending: isSaving } = useUpdateHorario();
  const { mutate: marcarFeriadoDia, isPending: isMarkingFeriado } = useMarcarFeriadoDia();

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
  const diaEsFeriado = totalForDay > 0 && (horariosQuery.data ?? []).every((d) => d.feriado);

  const turnoCounts = useMemo(() => {
    const data = horariosQuery.data ?? [];
    return {
      MANANA: data.filter((d) => normalizeTurno(d.turno) === 'MANANA').length,
      TARDE: data.filter((d) => normalizeTurno(d.turno) === 'TARDE').length,
    };
  }, [horariosQuery.data]);

  const confirmAndMarkFeriado = useCallback((turno?: 'MANANA' | 'TARDE') => {
    const scoped = turno
      ? (horariosQuery.data ?? []).filter((d) => normalizeTurno(d.turno) === turno)
      : (horariosQuery.data ?? []);
    const total = scoped.length;
    const esFeriado = total > 0 && scoped.every((d) => d.feriado);
    const nuevoValor = !esFeriado;
    const dayLabel = formatDayLabel(selDateISO);
    const scopeSuffix = turno ? ` (${TURNO_LABEL[turno]})` : '';
    Alert.alert(
      nuevoValor ? `Marcar día${scopeSuffix} como feriado` : `Quitar feriado del día${scopeSuffix}`,
      nuevoValor
        ? `Se marcarán como feriado (×2) los ${total} turno${total !== 1 ? 's' : ''} del ${dayLabel}${scopeSuffix}.`
        : `Se quitará la marca de feriado de los ${total} turno${total !== 1 ? 's' : ''} del ${dayLabel}${scopeSuffix}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: nuevoValor ? 'Marcar feriado' : 'Quitar feriado',
          onPress: () => {
            marcarFeriadoDia(
              { fechaISO: selDateISO, feriado: nuevoValor, turno },
              {
                onSuccess: (resp) => {
                  showToast(
                    resp.affected > 0
                      ? `${resp.affected} turno${resp.affected !== 1 ? 's' : ''} actualizados`
                      : 'No hay turnos cargados para este día',
                  );
                },
                onError: () => showToast('Error al actualizar. Intenta de nuevo.', true),
              },
            );
          },
        },
      ],
    );
  }, [horariosQuery.data, selDateISO, marcarFeriadoDia, showToast]);

  const openFeriadoMenu = useCallback(() => {
    setFeriadoMenuStep('main');
    setFeriadoMenuOpen(true);
  }, []);

  const closeFeriadoMenu = useCallback(() => {
    setFeriadoMenuOpen(false);
    setFeriadoMenuStep('main');
  }, []);

  // Otros turnos del mismo empleado ese día: el horario corrido los elimina (se avisa antes de activarlo).
  const otrosTurnosDelDia = useMemo(() => {
    if (!editingTurno) return 0;
    return (horariosQuery.data ?? []).filter(
      (d) => d.user_context_id === editingTurno.userContextId && (d.planificacion_id ?? d.id) !== editingTurno.id,
    ).length;
  }, [horariosQuery.data, editingTurno]);

  const openEdit = useCallback((turno: Turno) => {
    setEditingTurno({ ...turno });
    setEditSession((s) => s + 1);
  }, []);

  const setField = useCallback(<K extends keyof Turno>(key: K, value: Turno[K]) => {
    setEditingTurno((d) => (d ? { ...d, [key]: value } : d));
  }, []);

  const closeEdit = useCallback(() => {
    setEditingTurno(null);
  }, []);

  const saveEdit = useCallback((turno: Turno, extra?: Pick<UpdateHorarioPayload, 'horario_corrido'>) => {
    updateShift(buildUpdatePayload(turno, extra), {
      onSuccess: () => {
        showToast('Turno actualizado');
        closeEdit();
      },
      onError: (error) => {
        showToast(error.message || 'Error al guardar. Intentá de nuevo.', true);
      },
    });
  }, [updateShift, showToast, closeEdit]);

  const openCrear = useCallback(() => {
    setCrearError(null);
    setCrearSession((n) => n + 1);
    setCrearOpen(true);
  }, []);

  const handleCrearTurno = useCallback((payload: CrearTurnoPayload) => {
    setCrearError(null);
    crearTurno(payload, {
      onSuccess: () => {
        setCrearOpen(false);
        showToast('Turno creado');
        // Si se creó en otro día, el usuario lo ve al navegar a esa fecha.
        setSelDateISO(payload.horario_in.slice(0, 10));
      },
      onError: (error) => setCrearError(error.message || 'No se pudo crear el turno. Intentá de nuevo.'),
    });
  }, [crearTurno, showToast]);

  const selectUser = useCallback((user: UserSummary) => {
    setSelectedUser(user);
    setSearchQuery('');
    setRolFilter(null); // el backend solo admite un filtro por request
  }, []);

  const clearUserSearch = useCallback(() => {
    setSelectedUser(null);
    setSearchQuery('');
  }, []);

  const activeFilterCount =
    (filter !== 'Todos' ? 1 : 0) + (sedeFilter !== null ? 1 : 0) + (rolFilter !== null ? 1 : 0);

  const clearFilters = useCallback(() => {
    setFilter('Todos');
    setSedeFilter(null);
    setRolFilter(null);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>

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
            {diaEsFeriado && (
              <View style={styles.dayFeriadoBadge}>
                <Ionicons name="star" size={11} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setSelDateISO((d) => shiftDay(d, 1))}>
            <Ionicons name="chevron-forward" size={22} color={NAVY} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <FullScreenPortal>
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
          </FullScreenPortal>
        )}

        {/* Alta de turno individual (rotativos / turnos puntuales) */}
        <View style={styles.addCard}>
          <View style={styles.addIcon}>
            <Ionicons name="add-circle-outline" size={22} color={NAVY} />
          </View>
          <View style={styles.addText}>
            <Text style={styles.addTitle}>Agregar turno</Text>
            <Text style={styles.addSub}>Para rotativos o un día puntual</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openCrear} accessibilityLabel="Agregar turno">
            <Text style={styles.addBtnText}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {/* Feriado: opens a picker to choose the scope (whole day / one shift / per user) */}
        <TouchableOpacity
          style={[
            styles.feriadoToggle,
            diaEsFeriado && styles.feriadoToggleActive,
            (isMarkingFeriado || totalForDay === 0) && styles.feriadoToggleDisabled,
          ]}
          onPress={openFeriadoMenu}
          disabled={isMarkingFeriado || totalForDay === 0}
        >
          {isMarkingFeriado ? (
            <ActivityIndicator size="small" color={diaEsFeriado ? '#ffffff' : FERIADO_COLOR} />
          ) : (
            <Ionicons name={diaEsFeriado ? 'checkmark-circle' : 'star-outline'} size={16} color={diaEsFeriado ? '#ffffff' : FERIADO_COLOR} />
          )}
          <Text style={[styles.feriadoToggleText, diaEsFeriado && styles.feriadoToggleTextActive]}>
            {diaEsFeriado ? 'Día feriado' : 'Marcar como feriado'}
          </Text>
        </TouchableOpacity>

        {/* Filters */}
        <View style={styles.filters}>
          {/* Search */}
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
                <Text style={styles.filterGroupLabel}>Turno</Text>
                <View style={styles.chipRow}>
                  {FILTER_OPTS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
                      active={filter === opt.value}
                      onPress={() => setFilter(opt.value)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Sede</Text>
                <View style={styles.chipRow}>
                  <FilterChip label="Todas" active={sedeFilter === null} onPress={() => setSedeFilter(null)} />
                  {sedes.map((s) => (
                    <FilterChip
                      key={s.id}
                      label={s.nombre}
                      active={sedeFilter === s.id}
                      onPress={() => setSedeFilter(s.id)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Rol</Text>
                <View style={styles.chipRow}>
                  <FilterChip label="Todos" active={rolFilter === null} onPress={() => setRolFilter(null)} />
                  {SHIFT_ROLES.map((r) => (
                    <FilterChip
                      key={r.value}
                      label={r.label}
                      active={rolFilter === r.value}
                      onPress={() => {
                        setRolFilter(r.value);
                        setSelectedUser(null); // el backend solo admite un filtro por request
                      }}
                    />
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* List */}
      </View>
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={[styles.listContent, { paddingBottom: 16 + infoBarHeight }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
      <View style={styles.infoBar} onLayout={(e) => setInfoBarHeight(e.nativeEvent.layout.height)}>
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

      {/* Feriado scope picker */}
      <Modal transparent visible={feriadoMenuOpen} animationType="fade" onRequestClose={closeFeriadoMenu}>
        <TouchableOpacity style={[glassStyles.modalOverlay, styles.feriadoMenuOverlay]} activeOpacity={1} onPress={closeFeriadoMenu}>
          <View style={[glassStyles.modalCard, styles.feriadoMenu]}>
            {feriadoMenuStep === 'main' ? (
              <>
                <Text style={styles.feriadoMenuTitle}>Marcar como feriado</Text>
                <TouchableOpacity
                  style={[styles.feriadoMenuOption, totalForDay === 0 && styles.feriadoMenuOptionDisabled]}
                  disabled={totalForDay === 0}
                  onPress={() => { closeFeriadoMenu(); confirmAndMarkFeriado(); }}
                >
                  <Ionicons name="calendar-outline" size={18} color={totalForDay === 0 ? MUTED : NAVY} />
                  <View style={styles.feriadoMenuOptionTextWrap}>
                    <Text style={styles.feriadoMenuOptionText}>Todo el día</Text>
                    <Text style={styles.feriadoMenuOptionSub}>Ambos turnos, todos los empleados</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.feriadoMenuOption, totalForDay === 0 && styles.feriadoMenuOptionDisabled]}
                  disabled={totalForDay === 0}
                  onPress={() => setFeriadoMenuStep('turno')}
                >
                  <Ionicons name="sunny-outline" size={18} color={totalForDay === 0 ? MUTED : NAVY} />
                  <View style={styles.feriadoMenuOptionTextWrap}>
                    <Text style={styles.feriadoMenuOptionText}>Un turno</Text>
                    <Text style={styles.feriadoMenuOptionSub}>Un solo turno, todos los empleados</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.feriadoMenuOption}
                  onPress={() => {
                    closeFeriadoMenu();
                    showToast('Tocá el turno del empleado en la lista para marcarlo como feriado.');
                  }}
                >
                  <Ionicons name="person-outline" size={18} color={NAVY} />
                  <View style={styles.feriadoMenuOptionTextWrap}>
                    <Text style={styles.feriadoMenuOptionText}>Por usuario</Text>
                    <Text style={styles.feriadoMenuOptionSub}>Un turno puntual de un empleado</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.feriadoMenuBack} onPress={() => setFeriadoMenuStep('main')}>
                  <Ionicons name="chevron-back" size={18} color={NAVY} />
                  <Text style={styles.feriadoMenuTitle}>Elegí el turno</Text>
                </TouchableOpacity>
                {(['MANANA', 'TARDE'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.feriadoMenuOption, turnoCounts[t] === 0 && styles.feriadoMenuOptionDisabled]}
                    disabled={turnoCounts[t] === 0}
                    onPress={() => { closeFeriadoMenu(); confirmAndMarkFeriado(t); }}
                  >
                    <Ionicons name={t === 'MANANA' ? 'sunny-outline' : 'partly-sunny-outline'} size={18} color={turnoCounts[t] === 0 ? MUTED : NAVY} />
                    <View style={styles.feriadoMenuOptionTextWrap}>
                      <Text style={styles.feriadoMenuOptionText}>{TURNO_LABEL[t]}</Text>
                      <Text style={styles.feriadoMenuOptionSub}>
                        {turnoCounts[t]} turno{turnoCounts[t] !== 1 ? 's' : ''} este día
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit sheet */}
      <EditarTurnoSheet
        visible={editingTurno !== null}
        draft={editingTurno}
        sedes={sedes}
        isSaving={isSaving}
        editKey={editSession}
        otrosTurnosDelDia={otrosTurnosDelDia}
        onClose={closeEdit}
        onField={setField}
        onSave={saveEdit}
      />

      <CrearTurnoSheet
        key={crearSession}
        visible={crearOpen}
        defaultDateISO={selDateISO}
        sedes={sedes}
        isSaving={isCreating}
        submitError={crearError}
        onClose={() => setCrearOpen(false)}
        onSubmit={handleCrearTurno}
      />

      {/* Toast */}
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
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
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
  dayFeriadoBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: FERIADO_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feriadoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.35)',
    backgroundColor: 'rgba(147,51,234,0.08)',
    marginBottom: 14,
  },
  feriadoToggleActive: {
    backgroundColor: FERIADO_COLOR,
    borderColor: FERIADO_COLOR,
  },
  feriadoToggleDisabled: {
    opacity: 0.5,
  },
  feriadoToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: FERIADO_COLOR,
  },
  feriadoToggleTextActive: {
    color: '#ffffff',
  },
  feriadoMenuOverlay: {
    padding: 24,
  },
  feriadoMenu: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    width: '100%',
    maxWidth: 360,
  },
  feriadoMenuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: INK,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  feriadoMenuBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  feriadoMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  feriadoMenuOptionDisabled: {
    opacity: 0.4,
  },
  feriadoMenuOptionTextWrap: {
    flex: 1,
  },
  feriadoMenuOptionText: {
    fontSize: 15,
    color: INK,
    fontWeight: '600',
  },
  feriadoMenuOptionSub: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  addCard: {
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
  addIcon: {
    ...glassStyles.fieldGlass,
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    flex: 1,
  },
  addTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
  },
  addSub: {
    fontSize: 12,
    color: MUTED,
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: NAVY,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  filters: {
    gap: 10,
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
