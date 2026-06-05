import { AlertModal } from '@/components/AlertModal';
import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ArchivoUso } from '@/features/docs/models/Archivo';
import { useUploadArchivo } from '@/features/docs/viewmodels/useArchivos';
import { ApiOperationResult } from '@/shared/types/apiStatus';
import { useIdempotencyKey } from '@/shared/useIdempotencyKey';
import { UserSummary } from '@/shared/users/User';
import { adminRoles, allRoles } from '@/shared/users/roles';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { UserSelector } from '../../../components/UserSelector';
import { useAlertModal } from '../conversacion/hooks/useAlertModal';
import { useFilePicker } from '../conversacion/hooks/useFilePicker';
import type { CrearSolicitudRequest, CrearSolicitudResponse, RangoOcupado } from '../models/Solicitud';
import { useCrearSolicitud } from '../viewmodels/useSolicitudes';
import { styles } from './crearSolicitudStyles';
import { ceilToNextMinute, formatDateDDMMYYYY, formatTimeHHMM, isSameLocalDay, toEndOfDay, toStartOfDay } from './crearSolicitudUtils';
import { RoleUserSelectionModal } from './RoleUserSelectionModal';
import { ValidacionFechasModal } from './ValidacionFechasModal';

const colors = Colors['light'];

interface CrearSolicitudProps {
  visible: boolean;
  onClose: () => void;
  /** Cuando se abre desde la pestaña Chats, renderiza el formulario simplificado de chat. */
  fromChatsTab?: boolean;
}

export function CrearSolicitud({ visible, onClose, fromChatsTab = false }: CrearSolicitudProps) {
  const { user } = useAuth();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  const [allDay, setAllDay] = useState(false);
  const [tipoActividad, setTipoActividad] = useState<'REUNION' | 'MANDATO'>('MANDATO');
  const [includeDates, setIncludeDates] = useState(false);
  const [enviarPorSeparado, setEnviarPorSeparado] = useState(false);
  const [esGrupo, setEsGrupo] = useState(false);
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
  // UUID v4 generado UNA vez al montar el formulario. Persiste entre re-renders,
  // por lo que los reintentos automáticos de TanStack Query reutilizan la misma
  // X-Idempotency-Key. Se regenera cuando comienza una operación lógica nueva
  // (tras crear con éxito, o antes de forzar la creación ante un conflicto).
  const { idempotencyKey, regenerateIdempotencyKey } = useIdempotencyKey();
  const { mutate: crearSolicitud, isPending } = useCrearSolicitud(idempotencyKey);
  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
  const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);

  const users = searchResults || [];
  const isLoadingUsers = isSearchingUsers || isLoadingRole;
  const isConsejo = (user?.rol_nombre ?? '').toLowerCase() === 'consejo';

  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const { mutateAsync: uploadArchivo } = useUploadArchivo(idempotencyKey);
  const { alertModal, showModal, closeAlert } = useAlertModal();
  const { pickedFiles, setPickedFiles, handleTakePhoto, handleSeleccionarArchivo } = useFilePicker({ showModal });

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
    setPickedFiles([]);
    setEnviarPorSeparado(false);
    setEsGrupo(false);
    onClose();
  }, [onClose, setPickedFiles]);

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

  const hasDates = !fromChatsTab && (tipoActividad === 'REUNION' || includeDates);
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
    if (fromChatsTab) {
      return (
        selectedUsers.length > 0 &&
        descripcion.trim().length > 0 &&
        (!esGrupo || titulo.trim().length > 0)
      );
    }
    return (
      titulo.trim().length > 0 &&
      descripcion.trim().length > 0 &&
      (isConsejo || selectedUsers.length > 0) &&
      !dateErrorMessage
    );
  }, [fromChatsTab, esGrupo, titulo, descripcion, selectedUsers, dateErrorMessage, isConsejo]);

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
          // El backend rechazó por solapamientos. Si el usuario fuerza la
          // creación (crear_de_todos_modos), es una operación lógica nueva:
          // renovamos la key para que un backend idempotente no devuelva la
          // respuesta cacheada de conflicto. El re-render ocurre antes de que el
          // usuario confirme el modal, así que la nueva key ya estará vigente.
          regenerateIdempotencyKey();
          return;
        }

        if (response.solicitudIds && response.solicitudIds.length > 1) {
          showModal('Éxito', `Se crearon ${response.solicitudIds.length} solicitudes`);
        } else {
          showModal('Éxito', 'Solicitud creada correctamente');
        }
        handleClose();
        // Próxima solicitud = nueva operación lógica = nueva key.
        regenerateIdempotencyKey();
      },
      onError: (error: any) => {
        // No regeneramos la key en error: si el fallo fue un timeout donde el
        // servidor sí procesó la solicitud, un reintento del usuario con la
        // misma key permite que el backend deduplique en lugar de duplicar.
        const msg = error instanceof Error ? error.message : 'Intenta nuevamente';
        showModal('Error', msg);
      },
    });
  }, [crearSolicitud, handleClose, showModal, regenerateIdempotencyKey]);

  const forceCreateSolicitud = useCallback(() => {
    if (!pendingPayload) return;

    ejecutarCreacion({
      ...pendingPayload,
      crear_de_todos_modos: 1,
    });
    setBackendRangosOcupados([]);
  }, [pendingPayload, ejecutarCreacion]);

  const isSuccess = <T,>(r: ApiOperationResult<T>): r is ApiOperationResult<T> & { data: T } =>
    r.status === 'success' && r.data !== undefined;

  const handleCrearSolicitud = useCallback(async () => {
    if (!isFormValid) {
      showModal('Formulario incompleto', 'Por favor completa todos los campos');
      return;
    }

    if (hasDates && (!fechaInicio || !fechaFin)) return;

    let start = new Date(fechaInicio ?? new Date());
    let end = new Date(fechaFin ?? new Date());
    if (allDay) {
      start = toStartOfDay(start);
      end = toEndOfDay(end);
    }

    let archivosIds: number[] = [];

    if (pickedFiles.length > 0) {
      setIsUploadingFile(true);
      try {
        const response = await uploadArchivo({
          item: pickedFiles.map((file) => ({
            archivo: { uri: file.uri, name: file.name, type: file.type, size: file.size },
            archivoData: { nombre: file.name, tamaño: file.size, tipo: file.type, uso: ArchivoUso.TAREA, usuarios_compartidos: selectedUsers.map((u) => u.user_context_id) },
          })),
        });

        const resultados = (response?.exitosos ?? []);
        const fallidos = response?.fallidos ?? [];

        const validos = resultados.filter(isSuccess);
        archivosIds = validos.map((r) => r.data.id);

        if (validos.length === 0) {
          showModal('Error de archivos', 'No se pudo subir ningún archivo. Se continuará sin adjuntos.');
        } else if (fallidos.length > 0) {
          showModal('Archivos parciales', `Se subieron ${validos.length} de ${pickedFiles.length}`);
        }
      } catch {
        showModal('Error de archivos', 'No se pudieron subir los archivos. Se continuará sin adjuntos.');
      } finally {
        setIsUploadingFile(false);
      }
    }

    const enviarSeparado = enviarPorSeparado && selectedUsers.length > 1 && (!fromChatsTab || !esGrupo);
    const invitadoIds = selectedUsers.map((u) => u.user_context_id);

    const payload: CrearSolicitudRequest = {
      titulo: fromChatsTab ? (esGrupo ? titulo.trim() : '') : titulo.trim(),
      descripcion: descripcion.trim(),
      tipo_actividad: fromChatsTab ? 'CHAT' : tipoActividad,
      invitados: invitadoIds,
      crear_de_todos_modos: 0,
      es_grupo: fromChatsTab ? esGrupo : false,
      ...(archivosIds.length > 0 ? { archivosIds } : {}),
      ...(hasDates ? { fecha_inicio: start, fecha_fin: end } : {}),
      ...(enviarSeparado ? { enviar_por_separado: 1 } : {}),
    };

    ejecutarCreacion(payload);
  }, [isFormValid, hasDates, fechaInicio, fechaFin, allDay, tipoActividad, selectedUsers, titulo, descripcion, ejecutarCreacion, showModal, pickedFiles, fromChatsTab, esGrupo, enviarPorSeparado]);

  const handleAgregarAdjunto = useCallback(() => {
    showModal('Adjuntar archivo', 'Elegí una opción', [
      {
        key: 'file',
        label: 'Seleccionar archivo',
        onPress: handleSeleccionarArchivo,
      },
      {
        key: 'camera',
        label: 'Crear imagen',
        onPress: handleTakePhoto,
      },
      {
        key: 'cancel',
        label: 'Cancelar',
        onPress: () => { },
        variant: 'neutral',
      },
    ]);
  }, [handleTakePhoto, handleSeleccionarArchivo, showModal]);

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

              {!fromChatsTab && (
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
              )}

              <View style={styles.dateSection}>
                {fromChatsTab && (
                  <View style={[styles.switchRow, { marginTop: 4 }]}>
                    <Ionicons name="people-circle-outline" size={20} color={colors.secondaryText} style={{ marginRight: 8 }} />
                    <ThemedText style={[styles.dateSectionTitle, { color: colors.secondaryText }]}>Crear grupo</ThemedText>
                    <View style={{ flex: 1 }} />
                    <Switch
                      value={esGrupo}
                      onValueChange={(value) => {
                        setEsGrupo(value);
                        if (value) setEnviarPorSeparado(false);
                      }}
                      trackColor={{ false: colors.secondaryText, true: colors.success }}
                      thumbColor={colors.componentBackground}
                    />
                  </View>
                )}

                {selectedUsers.length > 1 && (!fromChatsTab || !esGrupo) && (
                  <View style={[styles.switchRow, { marginTop: 4 }]}>
                    <Ionicons name="people-outline" size={20} color={colors.secondaryText} style={{ marginRight: 8 }} />
                    <ThemedText style={[styles.dateSectionTitle, { color: colors.secondaryText }]}>Enviar por separado</ThemedText>
                    <View style={{ flex: 1 }} />
                    <Switch
                      value={enviarPorSeparado}
                      onValueChange={setEnviarPorSeparado}
                      trackColor={{ false: colors.secondaryText, true: colors.success }}
                      thumbColor={colors.componentBackground}
                    />
                  </View>
                )}

                {!fromChatsTab && tipoActividad === 'MANDATO' && (
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

                {!fromChatsTab && (tipoActividad === 'REUNION' || includeDates) && (
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

                {!fromChatsTab && (tipoActividad === 'REUNION' || includeDates) && (
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

              {(!fromChatsTab || esGrupo) && (
                <View style={styles.inputSection}>
                  <TextInput
                    style={styles.input}
                    placeholder={fromChatsTab ? 'Nombre del grupo' : 'Asunto'}
                    placeholderTextColor={colors.secondaryText}
                    value={titulo}
                    onChangeText={setTitulo}
                    maxLength={100}
                  />
                </View>
              )}

              <View style={styles.messageBox}>
                <TextInput
                  style={styles.messageInput}
                  placeholder={fromChatsTab ? 'Escribí el primer mensaje' : 'Escribí un mensaje descriptivo para el/los usuario/s'}
                  placeholderTextColor={colors.secondaryText}
                  value={descripcion}
                  onChangeText={setDescripcion}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.messageFooter}>
                  <TouchableOpacity
                    onPress={handleAgregarAdjunto}
                    style={styles.closeButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-outline" size={24} color={Colors.light.tint} />
                  </TouchableOpacity>
                </View>
              </View>

              {pickedFiles.length > 0 && (
                <View style={styles.attachmentsList}>
                  {pickedFiles.map((file, index) => (
                    <View key={`${file.uri}-${index}`} style={styles.attachmentRow}>
                      <ThemedText style={styles.attachmentName} numberOfLines={1}>
                        {file.name}
                      </ThemedText>
                      <TouchableOpacity
                        onPress={() =>
                          setPickedFiles((prev) => prev.filter((_, i) => i !== index))
                        }
                        style={styles.attachmentAction}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.secondaryText} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={[styles.uploadButtonContainer]}>
              {(() => {
                // `isPending` permanece true durante TODOS los reintentos de
                // TanStack Query, por lo que el botón no se desbloquea mientras
                // un reintento corre en segundo plano. Sumamos la subida de
                // archivos (paso previo) y la validez del formulario.
                const isBusy = isPending || isUploadingFile;
                const isDisabled = isBusy || !isFormValid;
                return (
                  <TouchableOpacity
                    onPress={handleCrearSolicitud}
                    disabled={isDisabled}
                    accessibilityState={{ disabled: isDisabled, busy: isBusy }}
                    style={[styles.uploadButton, { opacity: isDisabled ? 0.5 : 1 }]}
                  >
                    <Ionicons name="cloud-upload" size={20} color={isFormValid ? Colors['light'].lightTint : Colors['light'].icon} />
                    <ThemedText style={styles.uploadButtonText}>
                      {isBusy ? 'Enviando…' : 'Enviar'}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })()}
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

            <AlertModal
              visible={alertModal.visible}
              title={alertModal.title}
              message={alertModal.message}
              actions={alertModal.actions}
              onClose={closeAlert}
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

