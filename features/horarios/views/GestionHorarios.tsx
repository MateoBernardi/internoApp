import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { useAuth } from '@/features/auth/context/AuthContext';
import { allRoles } from '@/shared/users/roles';
import type { UserSummary } from '@/shared/users/User';
import { useSearchUsers } from '@/shared/users/useUser';
import { EditarTurnoSheet } from '../components/EditarTurnoSheet';
import { TurnoCard } from '../components/TurnoCard';
import { HorariosToast } from '../components/HorariosToast';
import type { UpdateHorarioPayload } from '../models/HorarioDTO';
import { mapHorarioDTOToTurno, TURNO_LABEL, type Turno } from '../models/Turno';
import { downloadPlantillaShifts, getPlantillaShiftsUrl, type HorariosByDateFilter } from '../services/horariosService';
import {
  useHorariosByDate,
  useSedes,
  useUpdateHorario,
  useUploadShifts,
} from '../viewmodels/useHorarios';

import { CARD, INK, LINE, MUTED, NAVY, RED_FLASH } from '../theme';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tokens } = useAuth();
  const [isDownloadingPlantilla, setIsDownloadingPlantilla] = useState(false);

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
      turno: TURNO_LABEL[editingTurno.turno],
      horario_in: `${editingTurno.fechaISO}T${editingTurno.ingreso}:00`,
      horario_out: `${editingTurno.fechaISO}T${editingTurno.egreso}:00`,
      sede_id_in: editingTurno.sedeIdIngreso,
      sede_id_out: editingTurno.sedeIdEgreso,
      licencia: editingTurno.licencia ? 1 : 0,
      feriado: editingTurno.feriado ? 1 : 0,
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
        type: Platform.OS === 'web' ? ['text/csv', 'text/plain'] : '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const { uri, name } = result.assets[0];
      uploadShifts(
        { uri, name: name ?? 'shifts.csv', fechaISO: selDateISO },
        {
          onSuccess: (resp) => {
            const omitidosSuffix = resp.totalOmitidos > 0 ? ` · ${resp.totalOmitidos} omitido${resp.totalOmitidos !== 1 ? 's' : ''}` : '';
            showToast(`${resp.totalInsertados} turno${resp.totalInsertados !== 1 ? 's' : ''} importados${omitidosSuffix}`);
          },
          onError: (err) => {
            showToast(err instanceof Error ? err.message : 'Error al importar el archivo', true);
          },
        },
      );
    } catch {
      showToast('Error al leer el archivo', true);
    }
  };

  const handleShowCsvHelp = useCallback(() => {
    Alert.alert(
      'Formato del CSV',
      'Columnas: user_context_id, nombre_apellido, turno, horario_in, horario_out, sede_in, sede_out.\n\n' +
        '• La plantilla ya trae, para cada usuario, el turno de este día (o su turno base si el día todavía no tiene uno propio).\n' +
        '• Editá solo lo que necesites cambiar; el resto de las filas se puede dejar tal cual.\n' +
        '• Si un usuario no tiene turno ese día ni turno base, sus columnas vienen vacías: completalas para asignarle un turno, o dejalas vacías para que se lo omita.\n' +
        '• No modifiques la columna user_context_id: es la que identifica al usuario.\n' +
        '• horario_in y horario_out van en formato HHmm (ej: 0800, 1630).\n' +
        '• sede_in y sede_out son el ID numérico de la sede.',
    );
  }, []);

  const handleDownloadPlantilla = async () => {
    if (isDownloadingPlantilla) return;
    const token = tokens?.accessToken;
    if (!token) {
      showToast('No se pudo descargar la plantilla', true);
      return;
    }
    setIsDownloadingPlantilla(true);
    try {
      const fileName = `plantilla_turnos_${selDateISO}.csv`;

      if (Platform.OS === 'web') {
        const blob = await downloadPlantillaShifts(token, selDateISO);
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        const destinationDir = new FileSystem.Directory(FileSystem.Paths.cache, 'Italo-Argentina');
        const destinationFile = new FileSystem.File(destinationDir, fileName);
        await destinationDir.create({ idempotent: true, intermediates: true });

        // RN's Blob no implementa .text(); descargamos directo a disco en vez de pasar por blob.
        await FileSystem.File.downloadFileAsync(getPlantillaShiftsUrl(selDateISO), destinationFile, {
          idempotent: true,
          headers: {
            Authorization: `Bearer ${token}`,
            'x-app-entorno': 'interno',
          },
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(destinationFile.uri, {
            dialogTitle: 'Guardar o compartir plantilla',
            mimeType: 'text/csv',
          });
        } else {
          Alert.alert('Descarga completada', 'La plantilla se descargó en almacenamiento temporal de la app.');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('No se pudo descargar la plantilla', true);
    } finally {
      setIsDownloadingPlantilla(false);
    }
  };

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

        {/* CSV import card */}
        <View style={styles.importCard}>
          <View style={styles.importIcon}>
            {isUploading ? (
              <ActivityIndicator size="small" color={MUTED} />
            ) : (
              <Ionicons name="cloud-upload-outline" size={22} color={MUTED} />
            )}
          </View>
          <View style={styles.importText}>
            <Text style={styles.importTitle}>Importar CSV</Text>
            <Text style={styles.importSub}>
              {isUploading ? 'Subiendo planilla…' : 'Planilla de turnos (.csv)'}
            </Text>
          </View>
          <TouchableOpacity style={styles.importPlantillaBtn} onPress={handleShowCsvHelp}>
            <Ionicons name="help-circle-outline" size={20} color={NAVY} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.importPlantillaBtn}
            onPress={handleDownloadPlantilla}
            disabled={isDownloadingPlantilla}
          >
            {isDownloadingPlantilla ? (
              <ActivityIndicator size="small" color={NAVY} />
            ) : (
              <Ionicons name="download-outline" size={20} color={NAVY} />
            )}
          </TouchableOpacity>
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
        contentContainerStyle={styles.listContent}
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
    ...glassStyles.fieldGlass,
    width: 38,
    height: 38,
    borderRadius: 10,
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
  importPlantillaBtn: {
    ...glassStyles.fieldGlass,
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
