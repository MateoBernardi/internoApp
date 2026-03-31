import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { UserSummary } from '@/shared/users/User';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RoleUserSelectionModal } from '../components/RoleUserSelectionModal';
import { UserSelector } from '../components/UserSelector';
import { ValidacionFechasModal } from '../components/ValidacionFechasModal';
import { useCrearSolicitud } from '../viewmodels/useSolicitudes';
import { useValidacionFechas } from '../viewmodels/useValidacionFechas';

const colors = Colors['light'];

function normalizeToMinute(date: Date): Date {
  const normalized = new Date(date);
  normalized.setSeconds(0, 0);
  return normalized;
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
  
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  const [allDay, setAllDay] = useState(false);
  const [tipoActividad, setTipoActividad] = useState<'REUNION' | 'MANDATO'>('REUNION');
  const [includeDates, setIncludeDates] = useState(true); // MANDATO can skip dates
  const ignoreDatePressUntilRef = useRef(0);
  const { mutate: crearSolicitud, isPending } = useCrearSolicitud();
  const validacion = useValidacionFechas();
  const isValidationInProgress = validacion.state === 'validating' || validacion.state === 'warnings';

  const blockDatePickerFromToggle = useCallback(() => {
    // Evita que un toque residual del Switch abra el picker de fecha.
    ignoreDatePressUntilRef.current = Date.now() + 300;
  }, []);

  const handleToggleAllDay = useCallback((value: boolean) => {
    if (isValidationInProgress) return;
    blockDatePickerFromToggle();
    setAllDay(value);
  }, [blockDatePickerFromToggle, isValidationInProgress]);

  const handleToggleIncludeDates = useCallback((value: boolean) => {
    if (isValidationInProgress) return;
    blockDatePickerFromToggle();
    setIncludeDates(value);
    if (!value) {
      // Borrar las fechas de la memoria cuando el usuario desactiva las fechas
      setFechaInicio(null);
      setFechaFin(null);
    }
  }, [blockDatePickerFromToggle, isValidationInProgress]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [activeDateType, setActiveDateType] = useState<'start' | 'end' | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);

  const users = searchResults || [];

  // Role Selection Logic
  const [activeRole, setActiveRole] = useState('');
  const [roleUsers, setRoleUsers] = useState<UserSummary[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { data: roleUsersData, isLoading: isLoadingRole, error: roleError } = useGetUserByRole(activeRole);

  const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([]);
  const isLoadingUsers = isSearchingUsers || isLoadingRole;

  React.useEffect(() => {
      // Logic: if new role data comes in, prepare it for the modal and open it.
      if (activeRole && roleUsersData) {
          const roleUsersList = roleUsersData;
          setRoleUsers(roleUsersList);
          setShowRoleModal(true);
      } else if (roleError) {
          Alert.alert("No se encontraron usuarios con ese rol");
          setActiveRole('');
      }
  }, [roleUsersData, activeRole, roleError]);

  const handleCloseRoleModal = () => {
      setShowRoleModal(false);
      setActiveRole(''); // Reset to allow re-selection
      setRoleUsers([]);
  };

  const handleToggleUser = useCallback((user: UserSummary) => {
      setSelectedUsers(prev => {
          const isSelected = prev.some(u => u.user_context_id === user.user_context_id);
          if (isSelected) {
              return prev.filter(u => u.user_context_id !== user.user_context_id);
          } else {
              return [...prev, user];
          }
      });
  }, []);

  const handleSelectAllRoleUsers = useCallback((usersToSelect: UserSummary[]) => {
      setSelectedUsers(prev => {
          const prevIds = new Set(prev.map(u => u.user_context_id));
          const newUsers = usersToSelect.filter(u => !prevIds.has(u.user_context_id));
          return [...prev, ...newUsers];
      });
  }, []);

  const handleDeselectAllRoleUsers = useCallback((usersToDeselect: UserSummary[]) => {
      setSelectedUsers(prev => {
          const idsToRemove = new Set(usersToDeselect.map(u => u.user_context_id));
          return prev.filter(u => !idsToRemove.has(u.user_context_id));
      });
  }, []);

  const handleSearchUsers = useCallback((query: string) => {
      setSearchQuery(query);
  }, []);

  const handleRoleSelect = useCallback((role: string) => {
      setActiveRole(role);
  }, []);

  const allRoles = [
  { label: 'Contable', value: 'contable' },
  { label: 'Sistemas', value: 'sistemas' },
  { label: 'Personal Admin', value: 'empleado-admin' },
  { label: 'Personal Insumos', value: 'empleado-insumos' },
  { label: 'Personal Mayorista', value: 'empleado-mayorista' },
  { label: 'Personal Super', value: 'empleado-super' },
  { label: 'Consejo', value: 'consejo' },
  { label: 'Encargado', value: 'encargado' },
  { label: 'Gerencia', value: 'gerencia' },
  { label: 'Personal Limpieza', value: 'empleado-limpieza' },
  { label: 'Personas y Relaciones', value: 'personasRelaciones' },
  { label: 'Presidencia', value: 'presidencia' },
  ];

  const onDateChange = (event: any, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
          setShowDatePicker(false);
      }

      if (event.type === 'dismissed') {
        setActiveDateType(null);
        return;
      }

      if (!selectedDate) {
        setActiveDateType(null);
        return;
      }

      const currentDate = normalizeToMinute(selectedDate);

      if (activeDateType === 'start') {
          setFechaInicio(currentDate);
      } else {
          setFechaFin(currentDate);
      }

      setActiveDateType(null);
  };

  const getPickerValue = useCallback((): Date => {
    if (activeDateType === 'start') {
      return normalizeToMinute(fechaInicio ?? new Date());
    }

    if (activeDateType === 'end') {
      if (fechaFin) {
        return normalizeToMinute(fechaFin);
      }

      if (fechaInicio) {
        return normalizeToMinute(fechaInicio);
      }

      return normalizeToMinute(new Date(Date.now() + 3600000));
    }

    return normalizeToMinute(new Date());
  }, [activeDateType, fechaInicio, fechaFin]);

  const showDatepicker = (type: 'start' | 'end', mode: 'date' | 'time') => {
    if (isValidationInProgress) {
      return;
    }
    if (Date.now() < ignoreDatePressUntilRef.current) {
      return;
    }
    setActiveDateType(type);
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };
    
  // Handlers for specific fields
  const handleStartDate = () => {
      showDatepicker('start', 'date');
  };
  const handleStartTime = () => {
      showDatepicker('start', 'time');
  };
  const handleEndDate = () => {
      showDatepicker('end', 'date');
  };
  const handleEndTime = () => {
      showDatepicker('end', 'time');
  };

  const hasDates = tipoActividad === 'REUNION' || includeDates;
  const now = ceilToNextMinute(new Date());
  const areDatesMissing = hasDates && (!fechaInicio || !fechaFin);
  const isAllDayCurrentDay = hasDates && allDay && !!fechaInicio && isSameLocalDay(fechaInicio, now);
  const effectiveStartDate = hasDates && fechaInicio
    ? (allDay ? toStartOfDay(fechaInicio) : normalizeToMinute(fechaInicio))
    : null;
  const effectiveEndDate = hasDates && fechaFin
    ? (allDay ? toEndOfDay(fechaFin) : normalizeToMinute(fechaFin))
    : null;
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
    const dateValid = !dateErrorMessage;
    return (
      titulo.trim().length > 0 &&
      descripcion.trim().length > 0 &&
      selectedUsers.length > 0 &&
      dateValid
    );
  }, [titulo, descripcion, selectedUsers, dateErrorMessage]);

  const ejecutarCreacion = useCallback((payload: {
    titulo: string;
    descripcion: string;
    tipo_actividad: 'REUNION' | 'MANDATO';
    invitados: number[];
    fecha_inicio?: string;
    fecha_fin?: string;
  }) => {
    crearSolicitud(
      payload,
      {
        onSuccess: () => {
          Alert.alert('Éxito', 'Solicitud creada correctamente');
          router.back();
        },
        onError: (error: any) => {
          Alert.alert(
            'Error',
            error instanceof Error ? error.message : 'Intenta nuevamente'
          );
        },
      }
    );
  }, [crearSolicitud, router]);

  const handleCrearSolicitud = useCallback(() => {
    if (isValidationInProgress) {
      return;
    }

    if (!isFormValid) {
      Alert.alert('Formulario incompleto', 'Por favor completa todos los campos');
      return;
    }

    if (hasDates && (!fechaInicio || !fechaFin)) {
      return;
    }

    let start = normalizeToMinute(new Date(fechaInicio ?? new Date()));
    let end = normalizeToMinute(new Date(fechaFin ?? new Date()));

    if (allDay) {
      start = toStartOfDay(start);
      end = toEndOfDay(end);
    }

    const invitados = selectedUsers.map((u: UserSummary) => u.user_context_id);
    const payload = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      tipo_actividad: tipoActividad,
      invitados,
      ...(hasDates
        ? { fecha_inicio: start.toISOString(), fecha_fin: end.toISOString() }
        : {}),
    };

    if (hasDates) {
      // Validar fechas antes de crear
      validacion.validate(
        {
          fechaInicio: start.toISOString(),
          fechaFin: end.toISOString(),
          participantes: invitados,
          tipo_actividad: tipoActividad,
        },
        () => ejecutarCreacion(payload)
      );
    } else {
      // Sin fechas, crear directamente
      ejecutarCreacion(payload);
    }
  }, [isValidationInProgress, isFormValid, hasDates, fechaInicio, fechaFin, selectedUsers, allDay, tipoActividad, includeDates, titulo, descripcion, validacion, ejecutarCreacion]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 100} // Adjust based on header
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconButton} />
          <ThemedText style={styles.headerTitle}>Redactar invitación</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Dates Section (Moved to Top) */}
          <View style={styles.dateSection}>
             <View style={styles.switchRow}>
                <Ionicons name="time-outline" size={20} color={colors.lightTint} style={{ marginRight: 8 }} />
                <ThemedText style={styles.dateSectionTitle}>Todo el día</ThemedText>
                <View style={{ flex: 1 }} />
                <Switch 
                    value={allDay} 
                    onValueChange={handleToggleAllDay}
                    disabled={isValidationInProgress}
                    trackColor={{ false: colors.secondaryText, true: colors.success }} 
                    thumbColor={colors.componentBackground} 
                />
             </View>

             {/* Solo para MANDATO: mostrar opción de incluir fechas */}
             {tipoActividad === 'MANDATO' && (
               <View style={[styles.switchRow, { marginTop: 4 }]}>
                 <Ionicons name="calendar-outline" size={20} color={colors.secondaryText} style={{ marginRight: 8 }} />
                 <ThemedText style={[styles.dateSectionTitle, { color: colors.secondaryText }]}>Incluir fechas</ThemedText>
                 <View style={{ flex: 1 }} />
                 <Switch
                   value={includeDates}
                   onValueChange={handleToggleIncludeDates}
                   disabled={isValidationInProgress}
                   trackColor={{ false: colors.secondaryText, true: colors.success }}
                   thumbColor={colors.componentBackground}
                 />
               </View>
             )}

             {(tipoActividad === 'REUNION' || includeDates) && (
               <>
                 <View style={styles.dateRow}>
                     <View style={{ flex: 1 }}>
                         <TouchableOpacity 
                            onPress={handleStartDate}
                            activeOpacity={0.7}
                         >
                            <ThemedText style={styles.dateLabel}>Fecha de inicio</ThemedText>
                            <ThemedText style={styles.dateValue}>
                                {fechaInicio
                                  ? fechaInicio.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
                                  : 'Seleccionar fecha'}
                            </ThemedText>
                         </TouchableOpacity>
                     </View>
                     {!allDay && (
                         <View>
                             <TouchableOpacity 
                                onPress={handleStartTime}
                                activeOpacity={0.7}
                             >
                                <ThemedText style={styles.dateLabel}>Hora</ThemedText>
                                <ThemedText style={styles.timeValue}>
                                    {fechaInicio
                                      ? fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                                      : 'Seleccionar hora'}
                                </ThemedText>
                             </TouchableOpacity>
                         </View>
                     )}
                 </View>

                 <View style={styles.dateRow}>
                     <View style={{ flex: 1 }}>
                         <TouchableOpacity 
                            onPress={handleEndDate}
                            activeOpacity={0.7}
                         >
                            <ThemedText style={styles.dateLabel}>Fecha de finalización</ThemedText>
                            <ThemedText style={styles.dateValue}>
                                {fechaFin
                                  ? fechaFin.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
                                  : 'Seleccionar fecha'}
                            </ThemedText>
                         </TouchableOpacity>
                     </View>
                     {!allDay && (
                         <View>
                             <TouchableOpacity 
                                onPress={handleEndTime}
                                activeOpacity={0.7}
                             >
                                <ThemedText style={styles.dateLabel}>Hora</ThemedText>
                                <ThemedText style={styles.timeValue}>
                                    {fechaFin
                                      ? fechaFin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                                      : 'Seleccionar hora'}
                                </ThemedText>
                             </TouchableOpacity>
                         </View>
                     )}
                 </View>

                 {dateErrorMessage && (
                   <ThemedText style={{ color: colors.error, fontSize: 12, marginTop: 8 }}>
                     {dateErrorMessage}
                   </ThemedText>
                 )}
               </>
             )}
          </View>

          {/* UserSelector */}
          <View style={styles.inputSection}>
             <View style={{ flex: 1 }}>
                <UserSelector
                    selectedUsers={selectedUsers}
                    onSelectUsers={setSelectedUsers}
                    users={users}
                    roles={allRoles}
                    isLoadingUsers={isLoadingUsers}
                    isLoadingRoles={false}
                    onSearch={handleSearchUsers}
                    onSelectRole={handleRoleSelect}
                />
             </View>
          </View>
          
          <RoleUserSelectionModal
             visible={showRoleModal}
             onClose={handleCloseRoleModal}
             roleName={activeRole}
             roleUsers={roleUsers}
             selectedUsers={selectedUsers}
             onToggleUser={handleToggleUser}
             onSelectAll={handleSelectAllRoleUsers}
             onDeselectAll={handleDeselectAllRoleUsers}
          />

          {/* Tipo de actividad */}
          <View style={[styles.inputSection, { borderBottomWidth: 0, paddingVertical: 10, alignItems: 'center' }]}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                    style={[
                        styles.chip,
                        tipoActividad === 'REUNION' && { borderColor: colors.lightTint, backgroundColor: 'transparent', borderWidth: 1 }
                    ]}
                    onPress={() => {
                      if (isValidationInProgress) return;
                      setTipoActividad('REUNION');
                      setIncludeDates(true);
                    }}
                >
                    <ThemedText style={[
                        styles.chipText,
                        tipoActividad === 'REUNION' ? { color: colors.lightTint, fontWeight: 'bold' } : { color: colors.secondaryText }
                    ]}>Reunión</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.chip,
                        tipoActividad === 'MANDATO' && { borderColor: colors.lightTint, backgroundColor: 'transparent', borderWidth: 1 }
                    ]}
                    onPress={() => {
                      if (isValidationInProgress) return;
                      setTipoActividad('MANDATO');
                    }}
                >
                    <ThemedText style={[
                         styles.chipText,
                        tipoActividad === 'MANDATO' ? { color: colors.lightTint, fontWeight: 'bold' } : { color: colors.secondaryText }
                    ]}>Tarea</ThemedText>
                </TouchableOpacity>
             </ScrollView>
          </View>

           {/* Asunto */}
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

          {/* Mensaje */}
          <TextInput
            style={styles.messageInput}
            placeholder="Escribe un mensaje"
            placeholderTextColor={colors.secondaryText}
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            textAlignVertical="top"
          />

        </ScrollView>

      </KeyboardAvoidingView>

      {/* Floating Send Button */}
        <TouchableOpacity 
            style={[
                styles.fab, 
            { backgroundColor: !isFormValid || isPending || isValidationInProgress ? colors.icon : colors.lightTint }
            ]}
            onPress={handleCrearSolicitud}
          disabled={!isFormValid || isPending || isValidationInProgress}
        >
            {isPending ? (
                <ActivityIndicator size="small" color={colors.componentBackground} />
            ) : (
                <Ionicons name="send" size={24} color={colors.componentBackground} />
            )}
        </TouchableOpacity>

      {/* Date Picker Component */}
      {(showDatePicker) && (
        <DateTimePicker
          testID="dateTimePicker"
          value={getPickerValue()}
          mode={datePickerMode}
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      {/* Modal de validación de fechas */}
      <ValidacionFechasModal
        state={validacion.state}
        avisos={validacion.avisos}
        rangosOcupados={validacion.rangosOcupados}
        errorMessage={validacion.errorMessage}
        onConfirm={validacion.confirm}
        onCancel={validacion.cancel}
      />

      {/* Modal operación pendiente */}
      <OperacionPendienteModal visible={isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: Platform.OS === 'android' ? 0 : 0, // Cleaned up
  },
  headerTitle: {
    fontSize: 20,
    color: colors.lightTint,
    fontWeight: '500',
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 80,
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
  messageInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      padding: 16,
      minHeight: 250, 
  },
  fab: {
      position: 'absolute',
      bottom: 80,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
  }
});
