import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors, UI } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useValidacionFechas } from '@/features/solicitudesActividades/viewmodels/useValidacionFechas';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { AppFab } from '@/shared/ui/AppFab';
import { UserSummary } from '@/shared/users/User';
import { adminRoles, allRoles } from '@/shared/users/roles';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { UserSelector } from '../../../components/UserSelector';
import { RoleUserSelectionModal } from '../components/RoleUserSelectionModal';
import { ValidacionFechasModal } from '../components/ValidacionFechasModal';
import { EstadoInvitacionDB, estadoInvitacionMapping, RangoOcupado, ReenviarSolicitudRequest, UpdateSolicitudResponse } from '../models/Solicitud';
import { useCrearActividad } from '../viewmodels/useActividades';
import {
  useActualizarEstadoInvitacion,
  useCancelarSolicitud,
  useInvitaciones,
  useReenviarSolicitud,
  useSolicitudBitacora,
  useSolicitudesCreadas
} from '../viewmodels/useSolicitudes';

const colors = Colors['light'];

const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const MODIFIED_STATES: EstadoInvitacionDB[] = ['MODIFIED', 'MODIFIED_BY_HOST', 'ACCEPTED', 'REJECTED', 'ACCEPTED_BY_HOST'];
const CANCELABLE_ENVIADA_STATES: EstadoInvitacionDB[] = ['SENT', 'SEEN', 'MODIFIED', 'MODIFIED_BY_HOST', 'ACCEPTED_BY_HOST'];

function formatDateDDMMYYYY(date: Date): string {
  return DATE_FORMATTER.format(date);
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

// Para este ejemplo, asumimos que obtenemos la solicitud del caché o desde un parámetro
export function Solicitud() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const { user } = useAuth();
  const { hasRole } = useRoleCheck();

  const solicitudId = parseInt(id);

  const { data: bitacora, isLoading: isLoadingBitacora } = useSolicitudBitacora(solicitudId);
  const { mutate: actualizarEstado, isPending: isUpdatingEstado } = useActualizarEstadoInvitacion();
  const { mutate: cancelarSolicitud, isPending: isCancellingSolicitud } = useCancelarSolicitud();
  const { mutate: reenviarSolicitud, isPending: isSharing } = useReenviarSolicitud();
  const { mutate: crearActividad, isPending: isCreatingActividad } = useCrearActividad();
  const validacion = useValidacionFechas();

  const { data: enviadas } = useSolicitudesCreadas();
  const { data: recibidas } = useInvitaciones();

  const isMutating = isUpdatingEstado || isCancellingSolicitud || isSharing || isCreatingActividad;
  const seenAutoMarkKeyRef = useRef<string | null>(null);

  // Estados para modales
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [isModifyModalMinimized, setIsModifyModalMinimized] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddToAgendaModal, setShowAddToAgendaModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFullBitacora, setShowFullBitacora] = useState(false);
  const [acceptObservation, setAcceptObservation] = useState('');
  const [rejectObservation, setRejectObservation] = useState('');

  // Estados para el modal "Agregar a la agenda"
  const [agendaFechaInicio, setAgendaFechaInicio] = useState<Date>(new Date());
  const [agendaFechaFin, setAgendaFechaFin] = useState<Date>(new Date(Date.now() + 3600000));
  const [showAgendaDatePicker, setShowAgendaDatePicker] = useState<{ show: boolean, mode: 'date' | 'time', target: 'start' | 'end' }>({ show: false, mode: 'date', target: 'start' });

  // Estado para modificación
  const [modStartDate, setModStartDate] = useState<Date | null>(null);
  const [modEndDate, setModEndDate] = useState<Date | null>(null);
  const [modObservation, setModObservation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState<{ show: boolean, mode: 'date' | 'time', target: 'start' | 'end' }>({ show: false, mode: 'date', target: 'start' });
  const [backendSolicitudRangos, setBackendSolicitudRangos] = useState<RangoOcupado[]>([]);
  const [backendActividadRangos, setBackendActividadRangos] = useState<RangoOcupado[]>([]);
  const [pendingModificarPayload, setPendingModificarPayload] = useState<{
    fecha_inicio_nueva?: Date | null;
    fecha_fin_nueva?: Date | null;
    observacion?: string | null;
  } | null>(null);

  // Estado para compartir
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsersToShare, setSelectedUsersToShare] = useState<UserSummary[]>([]);
  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);

  // Role Selection Logic (para compartir)
  const [activeRole, setActiveRole] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);

  const users = searchResults || [];
  const isLoadingUsers = isSearchingUsers || isLoadingRole;
  const isConsejo = hasRole('consejo');
  const rolesForSelector = isConsejo ? adminRoles : allRoles;

  const avisosBackendSolicitud = useMemo(() => {
    const grouped = new Map<string, number>();
    backendSolicitudRangos.forEach((rango) => {
      grouped.set(rango.usuario, (grouped.get(rango.usuario) ?? 0) + 1);
    });

    return Array.from(grouped.entries()).map(([usuario, cantidad]) =>
      `${usuario}: ${cantidad} solapamiento${cantidad > 1 ? 's' : ''}`
    );
  }, [backendSolicitudRangos]);

  const avisosBackendActividad = useMemo(() => {
    const grouped = new Map<string, number>();
    backendActividadRangos.forEach((rango) => {
      grouped.set(rango.usuario, (grouped.get(rango.usuario) ?? 0) + 1);
    });

    return Array.from(grouped.entries()).map(([usuario, cantidad]) =>
      `${usuario}: ${cantidad} solapamiento${cantidad > 1 ? 's' : ''}`
    );
  }, [backendActividadRangos]);

  const solicitud = useMemo(() => {
    if (type === 'enviada') {
      return enviadas?.find(s => s.solicitud_id === solicitudId);
    }
    return recibidas?.find(s => s.solicitud_id === solicitudId);
  }, [type, solicitudId, enviadas, recibidas]);

  // Para REUNION: obtener todos los invitados de esta solicitud (desde enviadas)
  const todosInvitados = useMemo(() => {
    if (!enviadas) return [];
    return enviadas.filter(s => s.solicitud_id === solicitudId);
  }, [enviadas, solicitudId]);

  const paraEnviada = useMemo(() => {
    const nombres = todosInvitados
      .map((inv) => [inv.invitado_nombre, inv.invitado_apellido].filter(Boolean).join(' ').trim())
      .filter(Boolean);
    return Array.from(new Set(nombres)).join(', ');
  }, [todosInvitados]);

  // IDs de participantes aceptados (para REUNION "agregar a la agenda")
  const participantesAceptados = useMemo(() => {
    const ids: number[] = [];
    // Agregar al creador
    if (solicitud?.created_by) ids.push(solicitud.created_by);
    // Agregar a todos los invitados aceptados
    // Necesitamos obtener los IDs de invitados — el modelo SolicitudEnviada no tiene invitado_id directamente
    // Usamos los datos disponibles: para REUNION el backend debe agregar a todos
    return [...new Set(ids)];
  }, [solicitud, todosInvitados]);

  // Determinar si se puede "agregar a la agenda" según tipo
  const puedeAgregarAAgenda = useMemo(() => {
    if (!solicitud) return false;
    // Si ya se creó la actividad, no se puede agregar nuevamente
    if (solicitud.estado === 'ACTIVIDAD_CREADA') return false;
    const esReunion = solicitud.tipo_actividad === 'REUNION';
    const esMandato = solicitud.tipo_actividad === 'MANDATO';

    if (esReunion) {
      // REUNION: solo el creador (ve la solicitud como "enviada") puede agregar
      // Y al menos un invitado debe haber aceptado
      const algunAceptado = todosInvitados.some(inv => inv.estado === 'ACCEPTED');
      return type === 'enviada' && algunAceptado;
    }
    if (esMandato) {
      // MANDATO: el invitado (recibida) agrega a su propia agenda cuando acepta
      return type === 'recibida' && solicitud.estado === 'ACCEPTED';
    }
    // Fallback: comportamiento anterior
    return type === 'recibida' && solicitud.estado === 'ACCEPTED';
  }, [solicitud, type, todosInvitados]);

  const esActividadCreada = solicitud?.estado === 'ACTIVIDAD_CREADA';

  const resetModifyDraft = useCallback(() => {
    setShowDatePicker({ show: false, mode: 'date', target: 'start' });
    setModStartDate(null);
    setModEndDate(null);
    setModObservation('');
    setShowModifyModal(false);
    setIsModifyModalMinimized(false);
  }, []);

  const minimizeModifyModal = useCallback(() => {
    setShowDatePicker(prev => ({ ...prev, show: false }));
    setShowModifyModal(false);
    setIsModifyModalMinimized(true);
  }, []);

  const restoreModifyModal = useCallback(() => {
    setShowModifyModal(true);
    setIsModifyModalMinimized(false);
  }, []);

  // Marcar como visto
  useEffect(() => {
    if (!solicitud) return;

    const shouldMarkSeen =
      (type === 'recibida' && ['SENT', 'MODIFIED_BY_HOST', 'ACCEPTED_BY_HOST'].includes(solicitud.estado))
      || (type === 'enviada' && solicitud.estado === 'MODIFIED');

    if (!shouldMarkSeen) {
      seenAutoMarkKeyRef.current = null;
      return;
    }

    const attemptKey = `${type}:${solicitud.solicitud_id}:${solicitud.estado}`;
    if (seenAutoMarkKeyRef.current === attemptKey) {
      return;
    }

    seenAutoMarkKeyRef.current = attemptKey;

    actualizarEstado(
      {
        solicitud_id: solicitud.solicitud_id,
        estado: 'SEEN' as EstadoInvitacionDB,
      },
      {
        onError: () => {
          seenAutoMarkKeyRef.current = null;
        },
      }
    );
  }, [type, solicitud, actualizarEstado]);

  const handleAceptarPress = useCallback(() => {
    setAcceptObservation('');
    setShowAcceptModal(true);
  }, []);

  const closeAcceptModal = useCallback(() => {
    setShowAcceptModal(false);
    setAcceptObservation('');
  }, []);

  const confirmAceptar = useCallback(() => {
    // Lógica normal para recibidas
    actualizarEstado(
      {
        solicitud_id: solicitudId,
        estado: 'ACCEPTED' as EstadoInvitacionDB,
        observacion: acceptObservation.trim() || null,
      },
      {
        onSuccess: () => {
          closeAcceptModal();
          Alert.alert('Éxito', 'Solicitud aceptada');
          // router.back(); // Opcional: volver atrás o quedarse
        },
        onError: (error) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
        },
      }
    );
  }, [solicitudId, actualizarEstado, acceptObservation, closeAcceptModal]);

  const confirmAceptarModificaciones = useCallback(() => {
    actualizarEstado(
      {
        solicitud_id: solicitudId,
        estado: 'ACCEPTED_BY_HOST' as EstadoInvitacionDB,
        observacion: acceptObservation.trim() || null,
      },
      {
        onSuccess: () => {
          closeAcceptModal();
          Alert.alert('Éxito', 'Modificaciones aceptadas');
        },
        onError: (error) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
        },
      }
    );
  }, [solicitudId, actualizarEstado, acceptObservation, closeAcceptModal]);

  const handleRechazar = useCallback(() => {
    setRejectObservation('');
    setShowRejectModal(true);
  }, []);

  const closeRejectModal = useCallback(() => {
    setShowRejectModal(false);
    setRejectObservation('');
  }, []);

  const confirmRechazar = useCallback(() => {
    actualizarEstado(
      {
        solicitud_id: solicitudId,
        estado: 'REJECTED' as EstadoInvitacionDB,
        observacion: rejectObservation.trim() || null,
      },
      {
        onSuccess: () => {
          closeRejectModal();
          Alert.alert('Éxito', 'Solicitud rechazada');
          router.back();
        },
        onError: (error) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
        },
      }
    );
  }, [solicitudId, actualizarEstado, rejectObservation, closeRejectModal, router]);

  const handleCancelarSolicitud = useCallback(() => {
    if (!solicitud) return;

    Alert.alert(
      'Cancelar solicitud',
      '¿Deseas cancelar esta solicitud?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => {
            cancelarSolicitud(
              { solicitudId: solicitud.solicitud_id },
              {
                onSuccess: () => {
                  setMenuOpen(false);
                  Alert.alert('Éxito', 'Solicitud cancelada');
                  router.back();
                },
                onError: (error) => {
                  Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
                },
              }
            );
          },
        },
      ]
    );
  }, [solicitud, cancelarSolicitud, router]);

  const handleModificarPress = useCallback(() => {
    if (!solicitud) return;

    if (!isModifyModalMinimized) {
      setModStartDate(null);
      setModEndDate(null);
      setModObservation('');
    }

    restoreModifyModal();
  }, [solicitud, isModifyModalMinimized, restoreModifyModal]);

  const ejecutarModificar = useCallback((crearDeTodosModos: number = 0) => {
    const payload = {
      fecha_inicio_nueva: modStartDate,
      fecha_fin_nueva: modEndDate,
      observacion: modObservation.trim() || null,
    };

    setPendingModificarPayload(payload);
    actualizarEstado({
      solicitud_id: solicitudId,
      estado: type === 'enviada' ? 'MODIFIED_BY_HOST' : 'MODIFIED',
      ...payload,
      crear_de_todos_modos: crearDeTodosModos,
    }, {
      onSuccess: (response: UpdateSolicitudResponse) => {
        if (!response.success && (response.rangosOcupados?.length ?? 0) > 0) {
          setBackendSolicitudRangos(response.rangosOcupados ?? []);
          return;
        }

        setBackendSolicitudRangos([]);
        resetModifyDraft();
        Alert.alert('Éxito', 'Solicitud modificada');
      },
      onError: (error) => {
        Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
      }
    });
  }, [solicitudId, modStartDate, modEndDate, modObservation, actualizarEstado, type, solicitud, resetModifyDraft]);

  const forceModificarSolicitud = useCallback(() => {
    if (!pendingModificarPayload) return;
    ejecutarModificar(1);
    setBackendSolicitudRangos([]);
  }, [pendingModificarPayload, ejecutarModificar]);

  const hasDateChanges = useMemo(() => {
    if (!modStartDate || !modEndDate) {
      return false;
    }
  }, [modStartDate, modEndDate]);

  const modNowThreshold = useMemo(
    () => ceilToNextMinute(new Date()),
    [modStartDate, modEndDate, showModifyModal]
  );
  const modDateErrorMessage = useMemo(() => {
    const hasAnyDateSelection = !!modStartDate || !!modEndDate;
    if (hasAnyDateSelection && (!modStartDate || !modEndDate)) {
      return 'Completá fecha de inicio y fin para aplicar cambios de fecha.';
    }
    if (!modStartDate || !modEndDate) return null;
    if (modStartDate < modNowThreshold) return 'La fecha de inicio es menor a la actual.';
    if (modEndDate <= modStartDate) return 'La fecha de fin debe ser mayor a la de inicio.';
    return null;
  }, [modStartDate, modEndDate, modNowThreshold]);

  const canSubmitModificar = useMemo(
    () => !modDateErrorMessage && (hasDateChanges || modObservation.trim().length > 0),
    [modDateErrorMessage, hasDateChanges, modObservation]
  );

  const confirmModificar = useCallback(() => {
    if (!canSubmitModificar) return;

    if (!hasDateChanges) {
      ejecutarModificar();
      return;
    }

    // Obtener participantes disponibles
    const participantes: number[] = [solicitud?.created_by ?? 0].filter(id => id > 0);
    if (user?.user_context_id) {
      participantes.push(user.user_context_id);
    }
    // Deduplicar
    const uniqueParticipantes = [...new Set(participantes)];

    if (!modStartDate || !modEndDate) {
      ejecutarModificar();
      return;
    }

    validacion.validate(
      {
        fechaInicio: modStartDate,
        fechaFin: modEndDate,
        participantes: uniqueParticipantes,
        solicitudIdExcluir: solicitudId,
      },
      () => ejecutarModificar()
    );
  }, [canSubmitModificar, hasDateChanges, solicitudId, solicitud, user, validacion, ejecutarModificar, modStartDate, modEndDate]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentTarget = showDatePicker.target;
    setShowDatePicker(prev => ({ ...prev, show: Platform.OS === 'ios' })); // En Android se cierra

    if (selectedDate && event.type !== 'dismissed') {
      const normalizedSelectedDate = selectedDate;
      if (currentTarget === 'start') {
        setModStartDate(normalizedSelectedDate);
        // Validar fin
        if (modEndDate && normalizedSelectedDate > modEndDate) {
          setModEndDate(new Date(normalizedSelectedDate.getTime() + 3600000));
        }
      } else {
        setModEndDate(normalizedSelectedDate);
      }
    }

    if (Platform.OS === 'android') {
      setShowDatePicker(prev => ({ ...prev, show: false }));
    }
  };

  const showPicker = (mode: 'date' | 'time', target: 'start' | 'end') => {
    if (target === 'start' && !modStartDate) {
      setModStartDate(ceilToNextMinute(new Date()));
    }

    if (target === 'end' && !modEndDate) {
      const seedBase = modStartDate ?? ceilToNextMinute(new Date());
      setModEndDate(new Date(seedBase.getTime() + 3600000));
    }

    setShowDatePicker({ show: true, mode, target });
  };

  const modPickerValue = useMemo(() => {
    if (showDatePicker.target === 'start') {
      return modStartDate ?? ceilToNextMinute(new Date());
    }

    if (modEndDate) {
      return modEndDate;
    }

    const seedBase = modStartDate ?? ceilToNextMinute(new Date());
    return (new Date(seedBase.getTime() + 3600000));
  }, [showDatePicker.target, modStartDate, modEndDate]);

  const handleCompartir = useCallback(() => {
    setSelectedUsersToShare([]);
    setSearchQuery('');
    setActiveRole('');
    setShowShareModal(true);
  }, []);

  const handleAgregarAAgenda = useCallback(() => {
    // Prellena fechas desde la solicitud si existen
    if (solicitud?.fecha_inicio && solicitud?.fecha_fin) {
      setAgendaFechaInicio(new Date(solicitud.fecha_inicio));
      setAgendaFechaFin(new Date(solicitud.fecha_fin));
    }
    setShowAddToAgendaModal(true);
  }, [solicitud]);

  const onAgendaDateChange = (event: any, selectedDate?: Date) => {
    const currentTarget = showAgendaDatePicker.target;
    if (Platform.OS === 'android') {
      setShowAgendaDatePicker(prev => ({ ...prev, show: false }));
    }
    if (selectedDate && event.type !== 'dismissed') {
      const normalizedSelectedDate = selectedDate;
      if (currentTarget === 'start') {
        setAgendaFechaInicio(normalizedSelectedDate);
        if (normalizedSelectedDate >= agendaFechaFin) {
          setAgendaFechaFin(new Date(normalizedSelectedDate.getTime() + 3600000));
        }
      } else {
        setAgendaFechaFin(normalizedSelectedDate);
      }
    }
  };

  const agendaStartDate = useMemo(() => agendaFechaInicio, [agendaFechaInicio]);
  const agendaEndDate = useMemo(() => agendaFechaFin, [agendaFechaFin]);
  const agendaNow = useMemo(() => ceilToNextMinute(new Date()), [agendaFechaInicio, agendaFechaFin, showAddToAgendaModal]);
  const agendaDateErrorMessage = useMemo(() => {
    if (agendaStartDate < agendaNow) return 'La fecha de inicio es menor a la actual.';
    if (agendaEndDate <= agendaStartDate) return 'La fecha de fin debe ser mayor a la de inicio.';
    return null;
  }, [agendaStartDate, agendaEndDate, agendaNow]);

  const ejecutarAgregarAAgenda = useCallback(() => {
    if (!solicitud) return;
    const esReunion = solicitud.tipo_actividad === 'REUNION';
    const start = agendaFechaInicio;
    const end = agendaFechaFin;

    crearActividad(
      {
        titulo: solicitud.titulo,
        descripcion: solicitud.descripcion,
        fecha_inicio: start,
        fecha_fin: end,
        solicitud_id: solicitud.solicitud_id,
        // Para REUNION: enviar todos los participantes aceptados
        ...(esReunion ? { participantes: participantesAceptados } : {}),
      },
      {
        onError: (error) => {
          const msg = error instanceof Error ? error.message : 'Intenta nuevamente';
          Alert.alert('Error', msg);
        },
        onSuccess: (response) => {
          if (!response.success && (response.rangosOcupados?.length ?? 0) > 0) {
            setBackendActividadRangos(response.rangosOcupados ?? []);
            return;
          }

          setBackendActividadRangos([]);
          setShowAddToAgendaModal(false);
          Alert.alert('Éxito', esReunion
            ? 'Actividad agregada a la agenda de todos los participantes'
            : 'Actividad agregada a tu agenda');
        },
      }
    );
  }, [agendaFechaInicio, agendaFechaFin, solicitud, crearActividad, participantesAceptados]);

  const confirmAgregarAAgenda = useCallback(() => {
    if (agendaDateErrorMessage) {
      return;
    }
    if (!solicitud) return;

    const esReunion = solicitud.tipo_actividad === 'REUNION';

    // Para REUNION: validar con todos los participantes; para MANDATO: solo el usuario actual
    const participantes: number[] = esReunion
      ? [...participantesAceptados]
      : (user?.user_context_id ? [user.user_context_id] : []);

    validacion.validate(
      {
        fechaInicio: agendaStartDate,
        fechaFin: agendaEndDate,
        participantes,
        tipo_actividad: solicitud.tipo_actividad,
        actividadIdExcluir: null,
      },
      () => ejecutarAgregarAAgenda()
    );
  }, [agendaDateErrorMessage, solicitud, user, validacion, ejecutarAgregarAAgenda, participantesAceptados, agendaStartDate, agendaEndDate]);

  const ejecutarCompartir = useCallback(() => {
    const payload: ReenviarSolicitudRequest = {
      solicitudId,
      nuevosInvitadosIds: selectedUsersToShare.map(u => u.user_context_id),
    };

    reenviarSolicitud(payload, {
      onSuccess: () => {
        setShowShareModal(false);
        Alert.alert('Éxito', 'Solicitud reenviada correctamente');
      },
      onError: (error) => {
        Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
      },
    });
  }, [solicitudId, selectedUsersToShare, reenviarSolicitud]);

  const confirmCompartir = useCallback(() => {
    if (selectedUsersToShare.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un usuario');
      return;
    }

    const hasDates = !!(solicitud?.fecha_inicio && solicitud?.fecha_fin);

    if (hasDates) {
      // Validar fechas para los nuevos participantes
      validacion.validate(
        {
          fechaInicio: solicitud!.fecha_inicio!,
          fechaFin: solicitud!.fecha_fin!,
          participantes: selectedUsersToShare.map(u => u.user_context_id),
          tipo_actividad: solicitud!.tipo_actividad,
          solicitudIdExcluir: solicitudId,
        },
        () => ejecutarCompartir()
      );
    } else {
      // Sin fechas, compartir directamente
      ejecutarCompartir();
    }
  }, [solicitudId, selectedUsersToShare, solicitud, validacion, ejecutarCompartir]);

  const handleToggleUserShare = useCallback((user: UserSummary) => {
    setSelectedUsersToShare(prev => {
      const isSelected = prev.some(u => u.user_context_id === user.user_context_id);
      if (isSelected) {
        return prev.filter(u => u.user_context_id !== user.user_context_id);
      } else {
        return [...prev, user];
      }
    });
  }, []);

  const handleSelectAllRoleUsers = useCallback((usersToSelect: UserSummary[]) => {
    setSelectedUsersToShare(prev => {
      const prevIds = new Set(prev.map(u => u.user_context_id));
      const newUsers = usersToSelect.filter(u => !prevIds.has(u.user_context_id));
      return [...prev, ...newUsers];
    });
  }, []);

  const handleDeselectAllRoleUsers = useCallback((usersToDeselect: UserSummary[]) => {
    setSelectedUsersToShare(prev => {
      const idsToRemove = new Set(usersToDeselect.map(u => u.user_context_id));
      return prev.filter(u => !idsToRemove.has(u.user_context_id));
    });
  }, []);

  const handleCloseRoleModal = useCallback(() => {
    setShowRoleModal(false);
    setActiveRole('');
  }, []);

  const handleRoleSelect = useCallback((role: string) => {
    setActiveRole(role);
    setShowRoleModal(true);
  }, []);

  const hasDates = !!(solicitud?.fecha_inicio && solicitud?.fecha_fin);
  const fechaInicio = solicitud?.fecha_inicio ? new Date(solicitud.fecha_inicio) : new Date();
  const fechaFin = solicitud?.fecha_fin ? new Date(solicitud.fecha_fin) : new Date();
  const fechaInicioPasada = hasDates ? fechaInicio < new Date() : false;
  const isExpiredState = solicitud?.estado === 'EXPIRED';
  const isSentState = solicitud?.estado === 'SENT';
  const isAceptarModificacionesFlow = type === 'enviada' && solicitud?.estado === 'MODIFIED';
  const puedeCompartirEnviada = type === 'enviada' && !isExpiredState && !esActividadCreada;
  const puedeCancelarEnviada = type === 'enviada' && !!solicitud && CANCELABLE_ENVIADA_STATES.includes(solicitud.estado);
  const compartirEnMenuEnviadaVista = type === 'enviada' && solicitud?.estado === 'SEEN';
  const canOpenMenu = !esActividadCreada
    && !isExpiredState
    && solicitud?.estado !== 'ACCEPTED'
    && solicitud?.estado !== 'REJECTED'
    && (!fechaInicioPasada || isSentState || puedeCancelarEnviada);
  const bitacoraVisible = useMemo(() => {
    if (!bitacora) return [];
    if (showFullBitacora) return bitacora;
    return bitacora.filter((entrada) => MODIFIED_STATES.includes(entrada.estado));
  }, [bitacora, showFullBitacora]);

  if (!solicitud && !enviadas && !recibidas) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.lightTint} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Detalles */}
        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>{type === 'enviada' ? 'Para' : 'De'}</ThemedText>
          <View style={styles.userChip}>
            <ThemedText style={{ color: colors.lightTint }}>
              {type === 'enviada'
                ? paraEnviada
                : `${solicitud?.nombre_creador || ''} ${solicitud?.apellido_creador || ''}`}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.inputSection, { borderBottomWidth: 0, paddingVertical: 10 }]}>
          <View style={[styles.chip, { borderColor: colors.lightTint, backgroundColor: 'transparent', borderWidth: 1 }]}>
            <ThemedText style={[styles.chipText, { color: colors.lightTint, fontWeight: 'bold' }]}>
              {solicitud?.tipo_actividad === 'MANDATO' ? 'Actividad' : 'Reunión'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.dateSection}>
          <View style={styles.switchRow}>
            <Ionicons name="time-outline" size={20} color={colors.lightTint} style={{ marginRight: 8 }} />
            <ThemedText style={styles.dateSectionTitle}>
              Fecha
            </ThemedText>
          </View>

          {hasDates ? (
            <>
              <View style={styles.dateRow}>
                <ThemedText style={styles.dateValue}>
                  {formatDateDDMMYYYY(fechaInicio)}
                </ThemedText>
                <ThemedText style={styles.timeValue}>
                  {formatTimeHHMM(fechaInicio)}
                </ThemedText>
              </View>

              <View style={styles.dateRow}>
                <ThemedText style={styles.dateValue}>
                  {formatDateDDMMYYYY(fechaFin)}
                </ThemedText>
                <ThemedText style={styles.timeValue}>
                  {formatTimeHHMM(fechaFin)}
                </ThemedText>
              </View>
            </>
          ) : (
            <ThemedText style={{ color: colors.secondaryText, fontSize: 14, marginTop: 4 }}>
              Sin fecha definida
            </ThemedText>
          )}
        </View>

        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>Asunto</ThemedText>
          <ThemedText style={styles.valueText}>{solicitud?.titulo}</ThemedText>
        </View>

        <View style={styles.messageSection}>
          <ThemedText style={styles.label}>Mensaje</ThemedText>
          <ThemedText style={styles.messageText}>{solicitud?.descripcion}</ThemedText>
        </View>

        {isExpiredState && (
          <View style={styles.expiredBanner}>
            <Ionicons name="alert-circle-outline" size={20} color="#5F6368" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.expiredBannerTitle}>Solicitud expirada</ThemedText>
              <ThemedText style={styles.expiredBannerText}>No se pueden realizar acciones sobre esta solicitud.</ThemedText>
            </View>
          </View>
        )}

        {/* Separador Bitácora */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Respuestas</ThemedText>
          <TouchableOpacity onPress={() => setShowFullBitacora(prev => !prev)}>
            <ThemedText style={styles.sectionActionText}>
              {showFullBitacora ? 'Ocultar información completa' : 'Mostrar información completa'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Bitácora Integrada */}
        <View style={styles.bitacoraContainer}>
          {isLoadingBitacora ? (
            <ActivityIndicator size="small" color={colors.lightTint} style={{ marginTop: 20 }} />
          ) : (
            bitacoraVisible.length > 0 ? (
              bitacoraVisible.map((b) => {
                const isOwnEntry = b.usuario_id !== null && b.usuario_id === user?.user_context_id;
                const hideActionTitle = MODIFIED_STATES.includes(b.estado)
                  && b.estado !== 'ACCEPTED'
                  && b.estado !== 'ACCEPTED_BY_HOST';

                return (
                  <View
                    key={b.id}
                    style={[
                      styles.bitacoraItem,
                      isOwnEntry ? styles.bitacoraItemOwn : styles.bitacoraItemOther,
                    ]}
                  >
                    <View style={styles.bitacoraCard}>
                      <View style={styles.bitacoraHeader}>
                        <ThemedText style={styles.bitacoraUser}>{b.usuario_nombre} {b.usuario_apellido}</ThemedText>
                        <ThemedText style={styles.bitacoraDate}>{formatDateDDMMYYYY(new Date(b.created_at))} {formatTimeHHMM(new Date(b.created_at))}</ThemedText>
                      </View>
                      <View style={styles.bitacoraBody}>
                        {!hideActionTitle && (
                          <ThemedText style={styles.bitacoraAction}>
                            {estadoInvitacionMapping[b.estado] || b.estado}
                          </ThemedText>
                        )}
                        {b.observacion && (
                          <View style={styles.bitacoraBubble}>
                            <ThemedText style={styles.bitacoraText}>{b.observacion}</ThemedText>
                          </View>
                        )}
                        {b.fecha_inicio_nueva && (
                          <View style={styles.changeBubble}>
                            <ThemedText style={styles.changeText}>
                              Propuso cambio:
                            </ThemedText>
                            <ThemedText style={styles.changeText}>
                              Inicio: {formatDateDDMMYYYY(new Date(b.fecha_inicio_nueva))} {formatTimeHHMM(new Date(b.fecha_inicio_nueva))}
                            </ThemedText>
                            {b.fecha_fin_nueva && (
                              <ThemedText style={styles.changeText}>
                                Fin: {formatDateDDMMYYYY(new Date(b.fecha_fin_nueva))} {formatTimeHHMM(new Date(b.fecha_fin_nueva))}
                              </ThemedText>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <ThemedText style={{ color: colors.secondaryText, textAlign: 'center', marginTop: 20 }}>
                {showFullBitacora ? 'No hay actividad reciente' : 'No hay cambios relevantes'}
              </ThemedText>
            )
          )}
        </View>
      </ScrollView>

      {/* Footer Actions (FABs) */}
      <View style={styles.fabContainer}>
        {isModifyModalMinimized && (
          <View style={styles.minimizedModifyDraftContainer}>
            <TouchableOpacity style={styles.minimizedModifyDraftMain} onPress={restoreModifyModal}>
              <Ionicons name="chevron-up" size={18} color={colors.lightTint} />
              <ThemedText style={styles.minimizedModifyDraftText}>Borrador de modificación</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.minimizedModifyDraftClose} onPress={resetModifyDraft}>
              <Ionicons name="close" size={16} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>
        )}

        {/* Indicador de actividad creada */}
        {esActividadCreada && (
          <View style={[styles.fab, { backgroundColor: colors.activityCreated, marginBottom: 16, width: 'auto', paddingHorizontal: 16, borderRadius: 28, flexDirection: 'row', gap: 6 }]}>
            <Ionicons name="checkmark-done" size={20} color={colors.background} />
            <ThemedText style={{ color: colors.background, fontSize: 13, fontWeight: '600' }}>Actividad creada</ThemedText>
          </View>
        )}

        {isExpiredState && (
          <View style={[styles.fab, styles.expiredFabIndicator]}>
            <Ionicons name="time-outline" size={20} color={colors.background} />
            <ThemedText style={styles.expiredFabText}>Expirada</ThemedText>
          </View>
        )}

        {/* Secondary Actions (Revealed via Menu) */}
        {menuOpen && canOpenMenu && (
          <>
            {/* Opciones para Recibidas */}
            {type === 'recibida' && solicitud?.estado !== 'ACCEPTED' && solicitud?.estado !== 'REJECTED' && !fechaInicioPasada && (
              <>
                <AppFab icon="close" floating={false} backgroundColor={colors.error} onPress={handleRechazar} style={{ marginBottom: 16 }} />
                <AppFab icon="create-outline" floating={false} backgroundColor={colors.lightTint} onPress={handleModificarPress} style={{ marginBottom: 16 }} />
              </>
            )}

            {/* Opciones para Enviadas */}
            {type === 'enviada' && solicitud?.estado !== 'ACCEPTED' && solicitud?.estado !== 'REJECTED' && solicitud?.estado !== 'ACCEPTED_BY_HOST' && (!fechaInicioPasada || isSentState) && (
              <>
                {compartirEnMenuEnviadaVista && puedeCompartirEnviada && (
                  <AppFab icon="share-social-outline" floating={false} backgroundColor={colors.icon} onPress={handleCompartir} style={{ marginBottom: 16 }} />
                )}
                <AppFab icon="create-outline" floating={false} backgroundColor={colors.lightTint} onPress={handleModificarPress} style={{ marginBottom: 16 }} />
              </>
            )}

            {puedeCancelarEnviada && (
              <AppFab
                icon="trash-outline"
                floating={false}
                backgroundColor={colors.error}
                onPress={handleCancelarSolicitud}
                style={{ marginBottom: 16 }}
              />
            )}
          </>
        )}

        {/* Agregar a la agenda (REUNION: solo creador/enviada; MANDATO: invitado/recibida aceptada) */}
        {!isExpiredState && !fechaInicioPasada && puedeAgregarAAgenda && (
          <AppFab icon="calendar-outline" floating={false} backgroundColor={colors.success} onPress={handleAgregarAAgenda} style={{ marginBottom: 16 }} />
        )}

        {/* Main Action: Accept */}
        {!esActividadCreada && !isExpiredState && !fechaInicioPasada && (
          (type === 'recibida' && solicitud?.estado !== 'ACCEPTED' && solicitud?.estado !== 'REJECTED' && solicitud?.estado !== 'MODIFIED')
          || (type === 'enviada' && solicitud?.estado === 'MODIFIED')
        ) && (
            <AppFab icon="checkmark" floating={false} backgroundColor={colors.success} onPress={handleAceptarPress} style={{ marginBottom: 16 }} />
          )}

        {puedeCompartirEnviada && !compartirEnMenuEnviadaVista && (
          <AppFab icon="share-social-outline" floating={false} backgroundColor={colors.icon} onPress={handleCompartir} style={{ marginBottom: 16 }} />
        )}

        {/* Menu Button */}
        {canOpenMenu && (
          <AppFab icon={menuOpen ? 'close' : 'ellipsis-horizontal'} floating={false} backgroundColor={colors.icon} onPress={() => setMenuOpen(!menuOpen)} />
        )}
      </View>

      {/* Modal Aceptar */}
      <Modal visible={showAcceptModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={closeAcceptModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <ThemedText type="subtitle" style={{ marginBottom: 16 }}>{isAceptarModificacionesFlow ? 'Aceptar Modificaciones' : 'Aceptar Solicitud'}</ThemedText>
                <ThemedText style={{ marginBottom: 8 }}>{isAceptarModificacionesFlow ? '¿Confirmas que deseas aceptar las modificaciones propuestas?' : '¿Confirmas que deseas aceptar esta solicitud?'}</ThemedText>
                <ThemedText style={styles.modalInputLabel}>Observación (opcional)</ThemedText>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Podés agregar una observación"
                  value={acceptObservation}
                  onChangeText={setAcceptObservation}
                  multiline
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={closeAcceptModal} style={styles.modalBtnCancel}>
                    <ThemedText style={{ color: colors.error }}>Cancelar</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={isAceptarModificacionesFlow ? confirmAceptarModificaciones : confirmAceptar}
                    style={styles.modalBtnConfirm}
                    disabled={isUpdatingEstado}
                  >
                    {isUpdatingEstado
                      ? <ActivityIndicator color={colors.background} />
                      : <ThemedText style={{ color: colors.background }}>Aceptar</ThemedText>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Rechazar */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={closeRejectModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Rechazar solicitud</ThemedText>
                <ThemedText style={{ marginBottom: 8 }}>¿Deseas rechazar esta solicitud?</ThemedText>
                <ThemedText style={styles.modalInputLabel}>Observación (opcional)</ThemedText>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Podés agregar un motivo"
                  value={rejectObservation}
                  onChangeText={setRejectObservation}
                  multiline
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={closeRejectModal} style={styles.modalBtnCancel}>
                    <ThemedText style={{ color: colors.error }}>Cancelar</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={confirmRechazar}
                    style={[styles.modalBtnConfirm, { backgroundColor: colors.error }]}
                    disabled={isUpdatingEstado}
                  >
                    {isUpdatingEstado
                      ? <ActivityIndicator color={colors.background} />
                      : <ThemedText style={{ color: colors.background }}>Rechazar</ThemedText>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Modificar */}
      <Modal visible={showModifyModal} transparent={false} animationType="slide" onRequestClose={minimizeModifyModal}>
        <View style={styles.container}>
          <View style={styles.modifyModalHeader}>
            <ThemedText style={styles.modifyModalTitle}>Modificar solicitud</ThemedText>
            <View style={styles.modifyModalHeaderActions}>
              <TouchableOpacity onPress={minimizeModifyModal} style={styles.modifyModalHeaderBtn}>
                <Ionicons name="chevron-down" size={24} color={colors.secondaryText} />
              </TouchableOpacity>
              <TouchableOpacity onPress={resetModifyDraft} style={styles.modifyModalHeaderBtn}>
                <Ionicons name="close" size={22} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.dateSection}>
              <ThemedText style={styles.label}>Nueva Fecha Inicio</ThemedText>
              <View style={styles.row}>
                <TouchableOpacity onPress={() => showPicker('date', 'start')} style={styles.dateBtn}>
                  <ThemedText>{modStartDate ? formatDateDDMMYYYY(modStartDate) : 'Día'}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => showPicker('time', 'start')} style={styles.dateBtn}>
                  <ThemedText>{modStartDate ? formatTimeHHMM(modStartDate) : 'Hora'}</ThemedText>
                </TouchableOpacity>
              </View>

              <ThemedText style={styles.label}>Nueva Fecha Fin</ThemedText>
              <View style={styles.row}>
                <TouchableOpacity onPress={() => showPicker('date', 'end')} style={styles.dateBtn}>
                  <ThemedText>{modEndDate ? formatDateDDMMYYYY(modEndDate) : 'Día'}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => showPicker('time', 'end')} style={styles.dateBtn}>
                  <ThemedText>{modEndDate ? formatTimeHHMM(modEndDate) : 'Hora'}</ThemedText>
                </TouchableOpacity>
              </View>

              <ThemedText style={styles.label}>Observación</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Respuesta"
                value={modObservation}
                onChangeText={setModObservation}
                multiline
              />

              {modDateErrorMessage && (
                <ThemedText style={{ color: colors.error, fontSize: 12, marginTop: 8 }}>
                  {modDateErrorMessage}
                </ThemedText>
              )}

              {!hasDateChanges && (
                <ThemedText style={{ color: colors.secondaryText, fontSize: 12, marginTop: 8 }}>
                  Podés enviar solo una observación sin cambiar fechas.
                </ThemedText>
              )}
            </View>
          </ScrollView>

          <AppFab
            icon="checkmark"
            onPress={confirmModificar}
            disabled={!canSubmitModificar}
            isLoading={isUpdatingEstado}
          />

          {showDatePicker.show && (
            <DateTimePicker
              testID="dateTimePicker"
              value={modPickerValue}
              mode={showDatePicker.mode}
              is24Hour={true}
              display="default"
              onChange={onDateChange}
            />
          )}
        </View>
      </Modal>

      {/* Modal Compartir */}
      <Modal visible={showShareModal} transparent animationType="fade" onRequestClose={() => setShowShareModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={() => setShowShareModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Compartir Solicitud</ThemedText>
                  <UserSelector
                    selectedUsers={selectedUsersToShare}
                    onSelectUsers={setSelectedUsersToShare}
                    users={users || []}
                    onSearch={setSearchQuery}
                    isLoadingUsers={isLoadingUsers}
                    roles={rolesForSelector}
                    onSelectRole={handleRoleSelect}
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity onPress={() => setShowShareModal(false)} style={styles.modalBtnCancel}>
                      <ThemedText style={{ color: colors.error }}>Cancelar</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={confirmCompartir} style={styles.modalBtnConfirm}>
                      {isSharing ? <ActivityIndicator color={colors.background} /> : <ThemedText style={{ color: colors.background }}>Compartir</ThemedText>}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Selección de Usuarios por Rol */}
      <RoleUserSelectionModal
        visible={showRoleModal}
        onClose={handleCloseRoleModal}
        roleName={activeRole}
        roleUsers={roleUsersData ?? []}
        selectedUsers={selectedUsersToShare}
        onToggleUser={handleToggleUserShare}
        onSelectAll={handleSelectAllRoleUsers}
        onDeselectAll={handleDeselectAllRoleUsers}
      />

      {/* Modal Agregar a la Agenda */}
      <Modal visible={showAddToAgendaModal} transparent animationType="fade" onRequestClose={() => setShowAddToAgendaModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={() => setShowAddToAgendaModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <ThemedText type="subtitle" style={{ marginBottom: 8 }}>Agregar a la agenda</ThemedText>
                  {!hasDates && (
                    <ThemedText style={{ color: colors.secondaryText, marginBottom: 16, fontSize: 13 }}>
                      Esta tarea no tiene fechas. Ingresa las fechas para agendar la actividad.
                    </ThemedText>
                  )}

                  <ThemedText style={styles.label}>Fecha de inicio</ThemedText>
                  <View style={styles.row}>
                    <TouchableOpacity onPress={() => setShowAgendaDatePicker({ show: true, mode: 'date', target: 'start' })} style={styles.dateBtn}>
                      <ThemedText>{formatDateDDMMYYYY(agendaFechaInicio)}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowAgendaDatePicker({ show: true, mode: 'time', target: 'start' })} style={styles.dateBtn}>
                      <ThemedText>{formatTimeHHMM(agendaFechaInicio)}</ThemedText>
                    </TouchableOpacity>
                  </View>

                  <ThemedText style={styles.label}>Fecha de fin</ThemedText>
                  <View style={styles.row}>
                    <TouchableOpacity onPress={() => setShowAgendaDatePicker({ show: true, mode: 'date', target: 'end' })} style={styles.dateBtn}>
                      <ThemedText>{formatDateDDMMYYYY(agendaFechaFin)}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowAgendaDatePicker({ show: true, mode: 'time', target: 'end' })} style={styles.dateBtn}>
                      <ThemedText>{formatTimeHHMM(agendaFechaFin)}</ThemedText>
                    </TouchableOpacity>
                  </View>

                  {agendaDateErrorMessage && (
                    <ThemedText style={{ color: colors.error, fontSize: 12, marginBottom: 8 }}>
                      {agendaDateErrorMessage}
                    </ThemedText>
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity onPress={() => setShowAddToAgendaModal(false)} style={styles.modalBtnCancel}>
                      <ThemedText style={{ color: colors.error }}>Cancelar</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={confirmAgregarAAgenda}
                      style={[styles.modalBtnConfirm, { opacity: agendaDateErrorMessage ? 0.5 : 1 }]}
                      disabled={isCreatingActividad || !!agendaDateErrorMessage}
                    >
                      {isCreatingActividad
                        ? <ActivityIndicator color={colors.background} />
                        : <ThemedText style={{ color: colors.background }}>Agregar</ThemedText>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
          {showAgendaDatePicker.show && (
            <DateTimePicker
              testID="agendaDateTimePicker"
              value={showAgendaDatePicker.target === 'start' ? agendaFechaInicio : agendaFechaFin}
              mode={showAgendaDatePicker.mode}
              is24Hour={true}
              display="default"
              onChange={onAgendaDateChange}
            />
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de validación de fechas */}
      <ValidacionFechasModal
        state={validacion.state}
        avisos={validacion.avisos}
        rangosOcupados={validacion.rangosOcupados}
        errorMessage={validacion.errorMessage}
        onConfirm={validacion.confirm}
        onCancel={validacion.cancel}
      />

      <ValidacionFechasModal
        state={backendSolicitudRangos.length > 0 ? 'warnings' : 'idle'}
        avisos={avisosBackendSolicitud}
        rangosOcupados={backendSolicitudRangos}
        onConfirm={forceModificarSolicitud}
        onCancel={() => setBackendSolicitudRangos([])}
      />

      <ValidacionFechasModal
        state={backendActividadRangos.length > 0 ? 'warnings' : 'idle'}
        avisos={avisosBackendActividad}
        rangosOcupados={backendActividadRangos}
        onConfirm={() => setBackendActividadRangos([])}
        onCancel={() => setBackendActividadRangos([])}
        showConfirmAction={false}
        cancelLabel="Modificar fechas"
        questionText="Modificá las fechas y volvé a intentar."
      />

      {/* Modal operación pendiente */}
      <OperacionPendienteModal visible={isMutating} />

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
    paddingHorizontal: UI.header.horizontalPadding,
    paddingVertical: UI.header.verticalPadding,
  },
  headerTitle: {
    fontSize: UI.fontSize.xxl,
    color: colors.tint,
    fontWeight: '500',
    marginLeft: UI.spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
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
    marginBottom: 12,
  },
  dateSectionTitle: {
    fontSize: 16,
    color: colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dateValue: {
    fontSize: 16,
    color: colors.tint,
    flex: 1,
  },
  timeValue: {
    fontSize: 16,
    color: colors.tint,
    textAlign: 'right',
  },
  inputSection: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.componentBackground,
  },
  label: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 4,
  },
  valueText: {
    fontSize: 16,
    color: colors.text,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.background,
  },
  chipText: {
    fontSize: 14,
  },
  messageSection: {
    padding: 16,
    minHeight: 100,
  },
  messageText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  expiredBanner: {
    marginHorizontal: UI.spacing.lg,
    marginTop: UI.spacing.sm,
    marginBottom: UI.spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutralBorder,
    backgroundColor: colors.neutralSurface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  expiredBannerTitle: {
    color: colors.neutralTextStrong,
    fontWeight: '700',
    fontSize: 14,
  },
  expiredBannerText: {
    color: colors.neutralText,
    fontSize: 13,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondaryText,
  },
  sectionActionText: {
    fontSize: 12,
    color: colors.lightTint,
    fontWeight: '600',
  },
  bitacoraContainer: {
    padding: 16,
  },
  bitacoraItem: {
    width: '100%',
    marginBottom: 16,
  },
  bitacoraItemOwn: {
    alignItems: 'flex-end',
  },
  bitacoraItemOther: {
    alignItems: 'flex-start',
  },
  bitacoraCard: {
    width: '90%',
    backgroundColor: colors.componentBackground,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bitacoraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bitacoraBody: {
    paddingVertical: 4,
  },
  bitacoraUser: {
    fontWeight: 'bold',
    color: colors.text,
    fontSize: 13,
  },
  bitacoraDate: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  bitacoraAction: {
    color: colors.lightTint,
    fontSize: 14,
    fontWeight: '500',
  },
  bitacoraBubble: {
    marginTop: 6,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 8,
  },
  bitacoraText: {
    fontSize: 14,
    color: colors.text,
  },
  changeBubble: {
    marginTop: 6,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 13,
    color: colors.text,
  },
  fabContainer: {
    position: 'absolute',
    bottom: UI.fab.offsetBottom,
    right: UI.fab.offsetRight,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  minimizedModifyDraftContainer: {
    position: 'absolute',
    right: 8,
    bottom: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.neutralBorder,
    borderRadius: UI.radius.md,
    paddingLeft: UI.spacing.sm,
    paddingRight: UI.spacing.xs,
    paddingVertical: UI.spacing.xs,
    shadowColor: UI.shadow.color,
    shadowOffset: UI.shadow.offset,
    shadowOpacity: UI.shadow.opacity,
    shadowRadius: UI.shadow.radius,
    elevation: UI.shadow.elevation,
  },
  minimizedModifyDraftMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: UI.spacing.xs,
  },
  minimizedModifyDraftText: {
    marginLeft: 6,
    color: colors.text,
    fontSize: UI.fontSize.sm,
    fontWeight: '600',
  },
  minimizedModifyDraftClose: {
    marginLeft: 6,
    padding: 4,
  },
  fab: {
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
  },
  expiredFabIndicator: {
    width: 'auto',
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: colors.neutralMuted,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  expiredFabText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 450,
    maxHeight: '85%',
    backgroundColor: colors.componentBackground,
    borderRadius: 16,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  modalBtnCancel: {
    padding: 10,
    marginRight: 10,
  },
  modalBtnConfirm: {
    backgroundColor: colors.tint,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalInputLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 4,
    marginBottom: 6,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 70,
    color: colors.text,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modifyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: UI.header.horizontalPadding,
    paddingVertical: UI.header.verticalPadding,
  },
  modifyModalTitle: {
    fontSize: UI.fontSize.xxl,
    color: colors.tint,
    fontWeight: '500',
  },
  modifyModalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modifyModalHeaderBtn: {
    padding: 4,
    marginLeft: 8,
  },
  dateBtn: {
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    paddingVertical: 8,
    fontSize: 16,
  }
});