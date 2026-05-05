import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors, UI } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { UserSummary } from '@/shared/users/User';
import { adminRoles, allRoles } from '@/shared/users/roles';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { UserSelector } from '../../../components/UserSelector';
import type { CrearSolicitudRequest, CrearSolicitudResponse, RangoOcupado } from '../models/Solicitud';
import { useCrearSolicitud } from '../viewmodels/useSolicitudes';
import { RoleUserSelectionModal } from './RoleUserSelectionModal';
import { ValidacionFechasModal } from './ValidacionFechasModal';

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

interface CrearSolicitudProps {
  visible: boolean;
  onClose: () => void;
}

export function CrearSolicitud({ visible, onClose }: CrearSolicitudProps) {
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

  // Reset form when modal closes
  const handleClose = useCallback(() => {
    setTitulo('');
    setDescripcion('');
    setFechaInicio(null);
    setFechaFin(null);
    setAllDay(false);
    setTipoActividad('MANDATO');
    setIncludeDates(false);
    setSelectedUsers([]);
    setSearchQuery('');
    setBackendRangosOcupados([]);
    setPendingPayload(null);
    onClose();
  }, [onClose]);

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

  const onDateCancel = useCallback(() => {
    setShowDatePicker(false);
    setActiveDateType(null);
  }, []);

  const onDateConfirm = useCallback((selectedDate: Date) => {
    if (!selectedDate) {
      setActiveDateType(null);
      return;
    }

    if (activeDateType === 'start') {
      setFechaInicio(selectedDate);
    } else {
      setFechaFin(selectedDate);
    }
    setShowDatePicker(false);
    setActiveDateType(null);
  }, [activeDateType]);

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
        handleClose();
      },
      onError: (error: any) => {
        Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
      },
    });
  }, [crearSolicitud, handleClose]);

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="chevron-down" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={[
                styles.contentContainer,
                { paddingBottom: 88 },
              ]}
              keyboardShouldPersistTaps={isKeyboardOpen ? 'handled' : 'never'}
              keyboardDismissMode={isKeyboardOpen ? 'none' : (Platform.OS === 'ios' ? 'interactive' : 'on-drag')}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
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

              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>Archivos enlazados</Text>
                  <TouchableOpacity style={styles.actionButton} onPress={() => { }}>
                    <Ionicons name="add" size={16} color={Colors.light.tint} />
                    <Text style={styles.actionButtonText}>Agregar archivos</Text>
                  </TouchableOpacity>
                </View>

                {/* TODO: renderizar lista de archivos enlazados */}
                <View style={styles.inviteList}>
                  {/* TODO: item de archivo con boton abrir */}
                  <View style={styles.inviteRow}>
                    <View>
                      <Text style={styles.inviteName}>Archivo-ejemplo.pdf</Text>
                      <Text style={styles.inviteMeta}>Documento</Text>
                    </View>
                    <View style={styles.inviteRowActions}>
                      {/* TODO: abrir archivo */}
                      <TouchableOpacity onPress={() => { }}>
                        <Ionicons name="open-outline" size={20} color={Colors.light.tint} />
                      </TouchableOpacity>
                      {/* TODO: eliminar archivo */}
                      <TouchableOpacity onPress={() => { }}>
                        <Ionicons name="trash-outline" size={20} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.uploadButtonContainer]}>
              <TouchableOpacity
                onPress={handleCrearSolicitud}
                style={[styles.uploadButton, { backgroundColor: isFormValid ? Colors['light'].componentBackground : Colors['light'].componentBackground }]}
              >
                <Ionicons name="cloud-upload" size={20} color={isFormValid ? Colors['light'].lightTint : Colors['light'].icon} />
                <ThemedText style={styles.uploadButtonText}>{'Enviar'}</ThemedText>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                visible={showDatePicker}
                testID="dateTimePicker"
                value={getPickerValue()}
                mode={datePickerMode}
                is24Hour={true}
                onConfirm={onDateConfirm}
                onCancel={onDateCancel}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    marginTop: '5%',
    backgroundColor: colors.componentBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  fabContainer: {
    position: 'absolute',
    bottom: UI.fab.offsetBottom,
    right: UI.fab.offsetRight,
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
    minHeight: 150,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tint + '12',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.tint,
  },
  uploadButtonContainer: {
    backgroundColor: Colors['light'].componentBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors['light'].icon,
    paddingHorizontal: '4%',
    paddingTop: 10,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: Colors['light'].lightTint,
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    marginTop: 12,
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  inviteList: {
    gap: 10,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inviteRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  inviteMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});