import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors, UI } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AppFab } from '@/shared/ui/AppFab';
import { UserSummary } from '@/shared/users/User';
import { adminRoles, allRoles } from '@/shared/users/roles';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { UserSelector } from '../../../components/UserSelector';
import { RoleUserSelectionModal } from '../components/RoleUserSelectionModal';
import { ValidacionFechasModal } from '../components/ValidacionFechasModal';
import type { CrearSolicitudRequest, CrearSolicitudResponse, RangoOcupado } from '../models/Solicitud';
import { useCrearSolicitud } from '../viewmodels/useSolicitudes';

const colors = Colors['light'];

function formatDateDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTimeHHMM(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function ceilToNextMinute(date: Date): Date {
  const normalized = new Date(date);
  if (normalized.getSeconds() > 0 || normalized.getMilliseconds() > 0) {
    normalized.setMinutes(normalized.getMinutes() + 1);
  }
  normalized.setSeconds(0, 0);
  return normalized;
}

function toStartOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function toEndOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 0, 0);
  return normalized;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CrearSolicitud() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { user } = useAuth();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  const [allDay, setAllDay] = useState(false);
  const [tipoActividad, setTipoActividad] = useState<'REUNION' | 'MANDATO'>('MANDATO');
  const [includeDates, setIncludeDates] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [activeRole, setActiveRole] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [activeDateType, setActiveDateType] = useState<'start' | 'end' | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [backendRangosOcupados, setBackendRangosOcupados] = useState<RangoOcupado[]>([]);
  const [pendingPayload, setPendingPayload] = useState<CrearSolicitudRequest | null>(null);
  const isKeyboardOpen = keyboardHeight > 0;

  const ignoreDatePressUntilRef = useRef(0);
  const { mutate: crearSolicitud, isPending } = useCrearSolicitud();
  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
  const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);

  const users = searchResults || [];
  const isLoadingUsers = isSearchingUsers || isLoadingRole;
  const isConsejo = (user?.rol_nombre ?? '').toLowerCase() === 'consejo';

  const rolesForSelector = useMemo(
    () => (isConsejo ? adminRoles : allRoles),
    [isConsejo]
  );

  const blockDatePickerFromToggle = useCallback(() => {
    ignoreDatePressUntilRef.current = Date.now() + 300;
  }, []);

  const handleToggleAllDay = useCallback((value: boolean) => {
    blockDatePickerFromToggle();
    setAllDay(value);
  }, [blockDatePickerFromToggle]);

  const handleToggleIncludeDates = useCallback((value: boolean) => {
    blockDatePickerFromToggle();
    setIncludeDates(value);
    if (!value) {
      setFechaInicio(null);
      setFechaFin(null);
    }
  }, [blockDatePickerFromToggle]);

  const handleToggleUser = useCallback((selectedUser: UserSummary) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u.user_context_id === selectedUser.user_context_id);
      return exists
        ? prev.filter((u) => u.user_context_id !== selectedUser.user_context_id)
        : [...prev, selectedUser];
    });
  }, []);

  const handleSelectAllRoleUsers = useCallback((usersToSelect: UserSummary[]) => {
    setSelectedUsers((prev) => {
      const prevIds = new Set(prev.map((u) => u.user_context_id));
      const newUsers = usersToSelect.filter((u) => !prevIds.has(u.user_context_id));
      return [...prev, ...newUsers];
    });
  }, []);

  const handleDeselectAllRoleUsers = useCallback((usersToDeselect: UserSummary[]) => {
    setSelectedUsers((prev) => {
      const idsToRemove = new Set(usersToDeselect.map((u) => u.user_context_id));
      return prev.filter((u) => !idsToRemove.has(u.user_context_id));
    });
  }, []);

  const handleRoleSelect = useCallback((role: string) => {
    setActiveRole(role);
    setShowRoleModal(true);
  }, []);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      setActiveDateType(null);
      return;
    }

    const currentDate = selectedDate;
    if (activeDateType === 'start') {
      setFechaInicio(currentDate);
    } else {
      setFechaFin(currentDate);
    }
    setActiveDateType(null);
  };

  const getPickerValue = useCallback((): Date => {
    if (activeDateType === 'start') return fechaInicio ?? new Date();
    if (activeDateType === 'end') {
      if (fechaFin) return fechaFin;
      if (fechaInicio) return fechaInicio;
      return new Date(Date.now() + 3600000);
    }
    return new Date();
  }, [activeDateType, fechaInicio, fechaFin]);

  const showDatepicker = (type: 'start' | 'end', mode: 'date' | 'time') => {
    if (Date.now() < ignoreDatePressUntilRef.current) return;
    setActiveDateType(type);
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const hasDates = tipoActividad === 'REUNION' || includeDates;
  const now = ceilToNextMinute(new Date());
  const areDatesMissing = hasDates && (!fechaInicio || !fechaFin);
  const isAllDayCurrentDay = hasDates && allDay && !!fechaInicio && isSameLocalDay(fechaInicio, now);
  const effectiveStartDate = hasDates && fechaInicio ? (allDay ? toStartOfDay(fechaInicio) : fechaInicio) : null;
  const effectiveEndDate = hasDates && fechaFin ? (allDay ? toEndOfDay(fechaFin) : fechaFin) : null;
  const isStartDatePast = !!effectiveStartDate && effectiveStartDate < now;
  const isDateRangeInvalid = !!effectiveStartDate && !!effectiveEndDate && effectiveEndDate <= effectiveStartDate;

  const dateErrorMessage = useMemo(() => {
    if (!hasDates) return null;
    if (areDatesMissing) return 'Completá la fecha de inicio y finalización.';
    if (isAllDayCurrentDay) return 'El día ya comenzó, elegí un día a partir de mañana.';
    if (isStartDatePast) return 'La fecha de inicio es menor a la actual.';
    if (isDateRangeInvalid) return 'La fecha de fin debe ser mayor a la de inicio.';
    return null;
  }, [hasDates, areDatesMissing, isAllDayCurrentDay, isStartDatePast, isDateRangeInvalid]);

  const isFormValid = useMemo(() => {
    return (
      titulo.trim().length > 0 &&
      descripcion.trim().length > 0 &&
      (isConsejo || selectedUsers.length > 0) &&
      !dateErrorMessage
    );
  }, [titulo, descripcion, selectedUsers, dateErrorMessage, isConsejo]);

  const avisosBackend = useMemo(() => {
    const grouped = new Map<string, number>();
    backendRangosOcupados.forEach((rango) => {
      grouped.set(rango.usuario, (grouped.get(rango.usuario) ?? 0) + 1);
    });

    return Array.from(grouped.entries()).map(([usuario, cantidad]) =>
      `${usuario}: ${cantidad} solapamiento${cantidad > 1 ? 's' : ''}`
    );
  }, [backendRangosOcupados]);

  const closeBackendConflicts = useCallback(() => {
    setBackendRangosOcupados([]);
  }, []);

  const ejecutarCreacion = useCallback((payload: CrearSolicitudRequest) => {
    setPendingPayload(payload);
    crearSolicitud(payload, {
      onSuccess: (response: CrearSolicitudResponse) => {
        if (!response.success && (response.rangosOcupados?.length ?? 0) > 0) {
          setBackendRangosOcupados(response.rangosOcupados ?? []);
          return;
        }

        Alert.alert('Éxito', 'Solicitud creada correctamente');
        router.back();
      },
      onError: (error: any) => {
        Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
      },
    });
  }, [crearSolicitud, router]);

  const forceCreateSolicitud = useCallback(() => {
    if (!pendingPayload) return;

    ejecutarCreacion({
      ...pendingPayload,
      crear_de_todos_modos: 1,
    });
    setBackendRangosOcupados([]);
  }, [pendingPayload, ejecutarCreacion]);

  const handleCrearSolicitud = useCallback(() => {
    if (!isFormValid) {
      Alert.alert('Formulario incompleto', 'Por favor completa todos los campos');
      return;
    }

    if (hasDates && (!fechaInicio || !fechaFin)) return;

    let start = new Date(fechaInicio ?? new Date());
    let end = new Date(fechaFin ?? new Date());
    if (allDay) {
      start = toStartOfDay(start);
      end = toEndOfDay(end);
    }

    const payload: CrearSolicitudRequest = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      tipo_actividad: tipoActividad,
      invitados: selectedUsers.map((u) => u.user_context_id),
      crear_de_todos_modos: 0,
      ...(hasDates ? { fecha_inicio: start, fecha_fin: end } : {}),
    };

    ejecutarCreacion(payload);
  }, [isFormValid, hasDates, fechaInicio, fechaFin, allDay, tipoActividad, selectedUsers, titulo, descripcion, ejecutarCreacion]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: UI.fab.offsetBottom + keyboardHeight + 16 },
          ]}
          keyboardShouldPersistTaps={isKeyboardOpen ? 'handled' : 'never'}
          keyboardDismissMode={isKeyboardOpen ? 'none' : (Platform.OS === 'ios' ? 'interactive' : 'on-drag')}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {!isConsejo ? (
            <View style={styles.inputSection}>
              <View style={{ flex: 1 }}>
                <UserSelector
                  selectedUsers={selectedUsers}
                  onSelectUsers={setSelectedUsers}
                  users={users}
                  roles={rolesForSelector}
                  isLoadingUsers={isLoadingUsers}
                  isLoadingRoles={false}
                  onSearch={setSearchQuery}
                  onSelectRole={handleRoleSelect}
                />
              </View>
            </View>
          ) : (
            <View style={styles.inputSection}>
              <View style={styles.rolesOnlyRow}>
                <ThemedText style={styles.rolesOnlyLabel}>Seleccionar por rol</ThemedText>
                <TouchableOpacity style={styles.rolesOnlyBtn} onPress={() => setShowRoleModal(true)}>
                  <ThemedText style={styles.rolesOnlyBtnText}>Roles</ThemedText>
                  <Ionicons name="chevron-down" size={16} color={colors.icon} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
              <View style={styles.selectedUsersWrap}>
                {selectedUsers.map((selected) => (
                  <TouchableOpacity key={selected.user_context_id} onPress={() => handleToggleUser(selected)} style={styles.selectedUserChip}>
                    <ThemedText style={styles.selectedUserChipText}>{selected.nombre} {selected.apellido}</ThemedText>
                    <Ionicons name="close" size={14} color={colors.secondaryText} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.inputSection, { borderBottomWidth: 0, paddingVertical: 10, alignItems: 'center' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.chip, tipoActividad === 'MANDATO' && { borderColor: colors.lightTint, backgroundColor: 'transparent', borderWidth: 1 }]}
                onPress={() => {
                  setTipoActividad('MANDATO');
                  handleToggleIncludeDates(false);
                }}
              >
                <ThemedText style={[styles.chipText, tipoActividad === 'MANDATO' ? { color: colors.lightTint, fontWeight: 'bold' } : { color: colors.secondaryText }]}>Actividad</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, tipoActividad === 'REUNION' && { borderColor: colors.lightTint, backgroundColor: 'transparent', borderWidth: 1 }]}
                onPress={() => {
                  setTipoActividad('REUNION');
                  setIncludeDates(true);
                }}
              >
                <ThemedText style={[styles.chipText, tipoActividad === 'REUNION' ? { color: colors.lightTint, fontWeight: 'bold' } : { color: colors.secondaryText }]}>Reunión</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={styles.dateSection}>
            {tipoActividad === 'MANDATO' && (
              <View style={[styles.switchRow, { marginTop: 4 }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.secondaryText} style={{ marginRight: 8 }} />
                <ThemedText style={[styles.dateSectionTitle, { color: colors.secondaryText }]}>Incluir fechas</ThemedText>
                <View style={{ flex: 1 }} />
                <Switch
                  value={includeDates}
                  onValueChange={handleToggleIncludeDates}
                  trackColor={{ false: colors.secondaryText, true: colors.success }}
                  thumbColor={colors.componentBackground}
                />
              </View>
            )}

            {(tipoActividad === 'REUNION' || includeDates) && (
              <View style={styles.switchRow}>
                <Ionicons name="time-outline" size={20} color={colors.lightTint} style={{ marginRight: 8 }} />
                <ThemedText style={styles.dateSectionTitle}>Todo el día</ThemedText>
                <View style={{ flex: 1 }} />
                <Switch
                  value={allDay}
                  onValueChange={handleToggleAllDay}
                  trackColor={{ false: colors.secondaryText, true: colors.success }}
                  thumbColor={colors.componentBackground}
                />
              </View>
            )}

            {(tipoActividad === 'REUNION' || includeDates) && (
              <>
                <View style={styles.dateRow}>
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity onPress={() => showDatepicker('start', 'date')} activeOpacity={0.7}>
                      <ThemedText style={styles.dateLabel}>Fecha de inicio</ThemedText>
                      <ThemedText style={styles.dateValue}>{fechaInicio ? formatDateDDMMYYYY(fechaInicio) : 'Día'}</ThemedText>
                    </TouchableOpacity>
                  </View>
                  {!allDay && (
                    <TouchableOpacity onPress={() => showDatepicker('start', 'time')} activeOpacity={0.7}>
                      <ThemedText style={styles.dateLabel}></ThemedText>
                      <ThemedText style={styles.timeValue}>{fechaInicio ? formatTimeHHMM(fechaInicio) : 'Hora'}</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.dateRow}>
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity onPress={() => showDatepicker('end', 'date')} activeOpacity={0.7}>
                      <ThemedText style={styles.dateLabel}>Fecha de cierre</ThemedText>
                      <ThemedText style={styles.dateValue}>{fechaFin ? formatDateDDMMYYYY(fechaFin) : 'Día'}</ThemedText>
                    </TouchableOpacity>
                  </View>
                  {!allDay && (
                    <TouchableOpacity onPress={() => showDatepicker('end', 'time')} activeOpacity={0.7}>
                      <ThemedText style={styles.dateLabel}></ThemedText>
                      <ThemedText style={styles.timeValue}>{fechaFin ? formatTimeHHMM(fechaFin) : 'Hora'}</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>

                {dateErrorMessage && <ThemedText style={styles.errorText}>{dateErrorMessage}</ThemedText>}
              </>
            )}
          </View>

          <View style={styles.inputSection}>
            <TextInput
              style={styles.input}
              placeholder="Asunto"
              placeholderTextColor={colors.secondaryText}
              value={titulo}
              onChangeText={setTitulo}
              maxLength={100}
            />
          </View>

          <TextInput
            style={styles.messageInput}
            placeholder="Escribí un mensaje descriptivo para el/los invitado/s"
            placeholderTextColor={colors.secondaryText}
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <RoleUserSelectionModal
        visible={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setActiveRole('');
        }}
        roleName={activeRole}
        roleUsers={roleUsersData ?? []}
        selectedUsers={selectedUsers}
        onToggleUser={handleToggleUser}
        onSelectAll={handleSelectAllRoleUsers}
        onDeselectAll={handleDeselectAllRoleUsers}
      />

      <AppFab
        icon="send"
        onPress={handleCrearSolicitud}
        disabled={!isFormValid}
        isLoading={isPending}
      />

      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={getPickerValue()}
          mode={datePickerMode}
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      <OperacionPendienteModal visible={isPending} />

      <ValidacionFechasModal
        state={backendRangosOcupados.length > 0 ? 'warnings' : 'idle'}
        avisos={avisosBackend}
        rangosOcupados={backendRangosOcupados}
        onConfirm={forceCreateSolicitud}
        onCancel={closeBackendConflicts}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  inputSection: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.componentBackground,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  rolesOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rolesOnlyLabel: {
    fontSize: 16,
    color: colors.secondaryText,
  },
  rolesOnlyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.componentBackground,
    borderRadius: 16,
  },
  rolesOnlyBtnText: {
    fontSize: 14,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  selectedUsersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lightTint,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.componentBackground,
  },
  selectedUserChipText: {
    color: colors.text,
    fontSize: 13,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.componentBackground,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
  },
  dateSection: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.componentBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.componentBackground,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateSectionTitle: {
    fontSize: 16,
    color: colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    color: colors.lightTint,
  },
  timeValue: {
    fontSize: 16,
    color: colors.lightTint,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 8,
  },
  messageInput: {
    fontSize: 16,
    color: colors.text,
    padding: 16,
    minHeight: 250,
  },
});
