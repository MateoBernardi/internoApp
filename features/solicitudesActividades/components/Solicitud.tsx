import { AlertModal } from '@/components/AlertModal';
import { FilePreview, useOpenFilePreview } from '@/components/filePreview';
import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useValidacionFechas } from '@/features/solicitudesActividades/viewmodels/useValidacionFechas';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { generateIdempotencyKey } from '@/shared/idempotency';
import { GlassButton } from '@/shared/ui/GlassButton';
import { focusBorderStyles, glassColors } from '@/shared/ui/glass';
import { useFocusBorder } from '@/shared/ui/useFocusBorder';
import { useSafeBottomInset } from '@/hooks/useSafeBottomInset';
import { adminRoles, allRoles } from '@/shared/users/roles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { FullScreenPortal } from '@/shared/ui/FullScreenPortal';
import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { useKeyboardVisible } from '@/shared/ui/keyboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserSelector } from '../../../components/UserSelector';
import { useCreateObjetivo } from '../../kanban/hooks/useObjetivos';
import type { CreateObjetivo, Invitado } from '../../kanban/models/Objetivo';
import { MESSAGE_STATES, formatDateDDMMYYYY, formatDayLabel, formatTimeHHMM, isSameCalendarDay } from '../conversacion/constants';
import { buildArchivoFileItem } from '../conversacion/fileHelpers';
import { useAdjuntos } from '../conversacion/hooks/useAdjuntos';
import { useAlertModal } from '../conversacion/hooks/useAlertModal';
import { useMarcarVisto } from '../conversacion/hooks/useMarcarVisto';
import { useMessagesScroll } from '../conversacion/hooks/useMessagesScroll';
import { useParticipantesManager } from '../conversacion/hooks/useParticipantesManager';
import { conversacionStyles } from '../conversacion/styles';
import {
  EstadoInvitacionDB,
  RangoOcupado,
  SolicitudEnviada,
  SolicitudInvitado,
  UpdateSolicitudResponse,
  estadoInvitacionMapping,
} from '../models/Solicitud';
import { useCrearActividad } from '../viewmodels/useActividades';
import {
  useActualizarEstadoInvitacion,
  useActualizarInvitadosSolicitud,
  useMarcarSolicitudVisto,
  useSolicitudBitacora,
} from '../viewmodels/useSolicitudes';
import { MessageBubble } from './MessageBubble';
import { ParticipantesBlock } from './ParticipantesBlock';
import { RoleUserSelectionModal } from './RoleUserSelectionModal';
import { ValidacionFechasModal } from './ValidacionFechasModal';

const colors = Colors['light'];

function ceilToNextMinute(date: Date): Date {
  const d = new Date(date);
  if (d.getSeconds() > 0 || d.getMilliseconds() > 0) d.setMinutes(d.getMinutes() + 1);
  d.setSeconds(0, 0);
  return d;
}

function formatTipoActividad(tipo?: string): string {
  if (tipo === 'MANDATO') return 'Actividad';
  if (tipo === 'REUNION') return 'Reunión';
  return tipo ?? 'Solicitud';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SolicitudProps {
  solicitud: SolicitudEnviada;
  visible?: boolean;
  onClose?: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function Solicitud({ solicitud, visible, onClose }: SolicitudProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useSafeBottomInset();
  const composerFocus = useFocusBorder();
  const { user } = useAuth();
  const { hasRole } = useRoleCheck();

  // Derivados estables del prop
  const solicitudId = solicitud.solicitud_id;
  const isHost = solicitud.is_host;
  const modalVisible = visible ?? true;
  const handleClose = onClose ?? (() => router.back());

  // ─── Queries / mutations ──────────────────────────────────────────────────
  const {
    data: bitacoraData,
    isLoading: isLoadingBitacora,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSolicitudBitacora(solicitudId);
  const bitacora = useMemo(
    () => (bitacoraData?.pages ?? []).flatMap(p => p.data),
    [bitacoraData],
  );
  const { mutate: actualizarEstadoRaw, isPending: isUpdatingEstado } = useActualizarEstadoInvitacion();
  // Inyecta una X-Idempotency-Key nueva por cada operación. Queda fijada a esa
  // mutación (estable entre reintentos automáticos) y no se pisa con otras
  // mutaciones concurrentes que comparten esta misma función `actualizarEstado`.
  const actualizarEstado = useCallback<typeof actualizarEstadoRaw>(
    (variables, options) =>
      actualizarEstadoRaw({ ...variables, idempotencyKey: generateIdempotencyKey() }, options),
    [actualizarEstadoRaw],
  );
  // Instancia dedicada solo para el auto-mark de useMarcarVisto: su
  // isPending se mantiene fuera de isMutating a propósito. Si contribuyera a
  // isMutating, dispararía OperacionPendienteModal mientras el <Modal
  // animationType="slide"> exterior todavía está en su transición de
  // apertura al montar — en iOS eso puede colgar la app.
  const { mutate: marcarVisto } = useMarcarSolicitudVisto();
  const { mutate: crearActividad, isPending: isCreatingActividad } = useCrearActividad();
  const { mutateAsync: crearObjetivo, isPending: isCreatingObjetivo } = useCreateObjetivo();
  const { mutate: actualizarInvitados } = useActualizarInvitadosSolicitud();
  const validacion = useValidacionFechas();

  const isMutating = isUpdatingEstado
    || isCreatingActividad || isCreatingObjetivo;

  // ─── Rol / permisos ───────────────────────────────────────────────────────
  const isConsejo = hasRole('consejo');
  const rolesForSelector = isConsejo ? adminRoles : allRoles;

  // ─── Estado UI ────────────────────────────────────────────────────────────
  const { previewFile, openFile, openWithUri, closePreview } = useOpenFilePreview();
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAddToAgendaModal, setShowAddToAgendaModal] = useState(false);
  const [acceptObservation, setAcceptObservation] = useState('');
  const [rejectObservation, setRejectObservation] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isModifyMode, setIsModifyMode] = useState(false);
  const { alertModal, showModal, closeAlert, onModalDismiss } = useAlertModal();
  const {
    pickedFiles, setPickedFiles, handleAgregarAdjunto, handleOpenArchivo, uploadPickedFiles,
  } = useAdjuntos({ showModal });
  const [localEstado, setLocalEstado] = useState<string | null>(null);

  // Modificar fechas
  const [modStartDate, setModStartDate] = useState<Date | null>(null);
  const [modEndDate, setModEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<{
    show: boolean; mode: 'date' | 'time'; target: 'start' | 'end';
  }>({ show: false, mode: 'date', target: 'start' });
  const [backendSolicitudRangos, setBackendSolicitudRangos] = useState<RangoOcupado[]>([]);
  const [backendActividadRangos, setBackendActividadRangos] = useState<RangoOcupado[]>([]);
  const [pendingModificarPayload, setPendingModificarPayload] = useState<{
    fecha_inicio_nueva?: Date | null;
    fecha_fin_nueva?: Date | null;
    observacion?: string | null;
  } | null>(null);

  // Agenda
  const [agendaFechaInicio, setAgendaFechaInicio] = useState<Date>(new Date());
  const [agendaFechaFin, setAgendaFechaFin] = useState<Date>(new Date(Date.now() + 3600000));
  const [showAgendaDatePicker, setShowAgendaDatePicker] = useState<{
    show: boolean; mode: 'date' | 'time'; target: 'start' | 'end';
  }>({ show: false, mode: 'date', target: 'start' });

  // Selección de destinatarios (a quién se les crea la actividad/objetivo)
  const [selectedActivityParticipantIds, setSelectedActivityParticipantIds] = useState<number[]>([]);
  const [showObjetivoParticipantesModal, setShowObjetivoParticipantesModal] = useState(false);

  const toggleActivityParticipant = useCallback((id: number) => {
    setSelectedActivityParticipantIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const {
    participantesSelectedUsers,
    showParticipantesSelector, setShowParticipantesSelector,
    setParticipantesSearchQuery,
    participantesActiveRole, setParticipantesActiveRole,
    showParticipantesRoleModal, setShowParticipantesRoleModal,

    participantesSearchResults, isSearchingParticipantes,
    participantesRoleUsersData, isLoadingParticipantesRole,
    displayParticipantes,
    getParticipanteDisplayName,
    handleSelectParticipantes, handleQuitarParticipante, handleToggleUserParticipante,
    handleSelectAllParticipantes, handleDeselectAllParticipantes,
  } = useParticipantesManager({ solicitud, solicitudId, actualizarInvitados });

  const { messagesScrollRef, handleMessagesScroll, handleMessagesContentSizeChange, isNearBottomRef } = useMessagesScroll({
    hasNextPage, isFetchingNextPage, fetchNextPage,
  });

  const keyboardVisible = useKeyboardVisible();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const onShow = Keyboard.addListener(showEvent, () => {
      if (!isNearBottomRef.current) return;
      requestAnimationFrame(() => {
        messagesScrollRef.current?.scrollToEnd({ animated: false });
      });
    });

    // Android only: rAF lets KeyboardAvoidingView remove its padding and the
    // layout settle before we scroll, so scrollToEnd resolves against the
    // full viewport and re-clamps the stale offset. Only if the user was
    // already at the bottom — otherwise a scrolled-up read position is
    // preserved instead of being yanked back down.
    const onHide = Platform.OS === 'android'
      ? Keyboard.addListener('keyboardDidHide', () => {
        if (!isNearBottomRef.current) return;
        requestAnimationFrame(() => {
          messagesScrollRef.current?.scrollToEnd({ animated: false });
        });
      })
      : null;

    return () => {
      onShow.remove();
      onHide?.remove();
    };
  }, [messagesScrollRef, isNearBottomRef]);

  // ─── Derivados del prop solicitud ─────────────────────────────────────────

  // Invitados sin el creador (para "Para:")
  const invitadosSinCreador = useMemo(() =>
    solicitud.invitados.filter(inv => inv.user_id !== solicitud.created_by),
    [solicitud.invitados, solicitud.created_by],
  );

  const todosParticipantesIds = useMemo(() => {
    const ids = solicitud.invitados.map(inv => inv.user_id);
    if (user?.user_context_id && !ids.includes(user.user_context_id)) ids.push(user.user_context_id);
    return [...new Set(ids)];
  }, [solicitud.invitados, user]);

  const todosArchivos = useMemo(() => {
    const archivosBase = solicitud.archivos ?? [];
    const archivosBitacora = (bitacora ?? []).flatMap((b: any) => b.archivos ?? []);
    const map = new Map<number, any>();
    [...archivosBase, ...archivosBitacora].forEach(a => { if (a?.id) map.set(a.id, a); });
    return Array.from(map.values());
  }, [solicitud.archivos, bitacora]);

  // ─── Flags de estado ──────────────────────────────────────────────────────

  const efectivoEstado = localEstado ?? solicitud.estado;

  const hasDates = !!(solicitud.fecha_inicio && solicitud.fecha_fin);
  const isExpiredState = efectivoEstado === 'EXPIRED';
  const esActividadCreada = efectivoEstado === 'ACTIVIDAD_CREADA';
  const isFinalState = ['ACTIVIDAD_CREADA', 'EXPIRED', 'ACCEPTED', 'REJECTED'].includes(efectivoEstado);
  const isAceptarModificacionesFlow = isHost && efectivoEstado === 'MODIFIED';
  // Ninguna de las dos partes puede aceptar mientras la solicitud está en el
  // estado que su propio último mensaje/propuesta generó: el invitado no
  // puede aceptar su propia propuesta ("Modificado"), y el creador no puede
  // autoaceptar su propio mensaje/propuesta ("Modificado por creador") — debe
  // esperar la respuesta del invitado.
  const aceptarDeshabilitado =
    (!isHost && efectivoEstado === 'MODIFIED') ||
    (isHost && efectivoEstado === 'MODIFIED_BY_HOST');

  // Reglas de creación: por cantidad de participantes (no por tipo).
  // - 2 participantes (creador + 1 invitado): ambos pueden crear una vez que el invitado acepta.
  // - Más de 2: solo el creador, habilitado apenas algún invitado aceptó.
  const totalParticipantes = solicitud.invitados.length; // incluye al creador
  const esCreacionElegible = solicitud.tipo_actividad !== 'CHAT' && !esActividadCreada;
  const invitadoUnico = totalParticipantes === 2 ? invitadosSinCreador[0] : undefined;
  const algunInvitadoAceptado = invitadosSinCreador.some(inv => inv.estado === 'ACCEPTED');

  const puedeCrearActividad = useMemo(() => {
    if (!esCreacionElegible) return false;
    if (totalParticipantes === 2) return invitadoUnico?.estado === 'ACCEPTED';
    return isHost && algunInvitadoAceptado;
  }, [esCreacionElegible, totalParticipantes, invitadoUnico, isHost, algunInvitadoAceptado]);

  const puedeCrearObjetivo = puedeCrearActividad && !hasDates;

  const mostrarBotonAgendaVerde = puedeCrearActividad;

  const isAcceptedWithAgenda = efectivoEstado === 'ACCEPTED' && puedeCrearActividad;
  const composerFinalState = isFinalState && !isAcceptedWithAgenda && !puedeCrearObjetivo;

  // ─── Avisos backend ───────────────────────────────────────────────────────

  const avisosBackendSolicitud = useMemo(() => {
    const grouped = new Map<string, number>();
    backendSolicitudRangos.forEach(r => grouped.set(r.usuario, (grouped.get(r.usuario) ?? 0) + 1));
    return Array.from(grouped.entries()).map(([u, n]) => `${u}: ${n} solapamiento${n > 1 ? 's' : ''}`);
  }, [backendSolicitudRangos]);

  const avisosBackendActividad = useMemo(() => {
    const grouped = new Map<string, number>();
    backendActividadRangos.forEach(r => grouped.set(r.usuario, (grouped.get(r.usuario) ?? 0) + 1));
    return Array.from(grouped.entries()).map(([u, n]) => `${u}: ${n} solapamiento${n > 1 ? 's' : ''}`);
  }, [backendActividadRangos]);

  // ─── Mensajes / bitácora ──────────────────────────────────────────────────

  const bitacoraVisible = useMemo(
    () => (bitacora ?? []).filter(b => MESSAGE_STATES.includes(b.estado)),
    [bitacora],
  );

  // Si ya hubo alguna propuesta de fecha en la bitácora, `solicitud.fecha_inicio`/
  // `fecha_fin` reflejan la propuesta MÁS RECIENTE (se sobrescriben en cada
  // modificación) — no la fecha original de la solicitud. Usarlas como fallback
  // en el mensaje sintético de "descripción" duplicaría esa fecha en el primer
  // mensaje en vez de mostrarla solo en el mensaje que realmente la propuso.
  const hasAnyFechaPropuesta = useMemo(
    () => (bitacora ?? []).some(b => b.fecha_inicio_nueva && b.fecha_fin_nueva),
    [bitacora],
  );

  const mensajes = useMemo(() => {
    const descripcion = solicitud.descripcion?.trim();
    const createdAt = solicitud.fecha_inicio
      ? new Date(solicitud.fecha_inicio).toISOString()
      : solicitud.created_at.toISOString();
    // La entrada 'SENT' real (creación) trae su propio acuse de lectura;
    // la reusamos para que el mensaje original también muestre el tilde.
    const entradaInicial = (bitacora ?? []).find(b => b.estado === 'SENT');

    const base = (descripcion || (solicitud.fecha_inicio && solicitud.fecha_fin)) && !hasNextPage
      ? [{
        id: 'descripcion',
        usuario_id: solicitud.created_by ?? null,
        usuario_nombre: solicitud.nombre_creador ?? '',
        usuario_apellido: solicitud.apellido_creador ?? '',
        created_at: createdAt,
        observacion: descripcion || '',
        estado: 'MESSAGE' as const,
        fecha_inicio_nueva: null,
        fecha_fin_nueva: null,
        archivos: solicitud.archivos ?? [],
        seen_by: entradaInicial?.seen_by,
      }, ...bitacoraVisible]
      : bitacoraVisible;

    const sistema: any[] = [];
    if (esActividadCreada) sistema.push({
      id: 'system-actividad-creada', usuario_id: null,
      usuario_nombre: 'Sistema', usuario_apellido: '',
      created_at: new Date().toISOString(),
      observacion: '✅ Actividad creada y agregada a la agenda.',
      estado: 'SYSTEM', fecha_inicio_nueva: null, fecha_fin_nueva: null,
      archivos: [], isSystem: true,
    });
    if (isExpiredState) sistema.push({
      id: 'system-expired', usuario_id: null,
      usuario_nombre: 'Sistema', usuario_apellido: '',
      created_at: new Date().toISOString(),
      observacion: '⏰ Esta solicitud expiró y ya no puede recibir acciones.',
      estado: 'SYSTEM', fecha_inicio_nueva: null, fecha_fin_nueva: null,
      archivos: [], isSystem: true,
    });

    return [...base, ...sistema];
  }, [bitacora, bitacoraVisible, solicitud, esActividadCreada, isExpiredState, hasNextPage]);

  // La propuesta de fecha vigente es la del mensaje más reciente que trae
  // fecha_inicio_nueva/fecha_fin_nueva — solo se muestra mientras el estado
  // efectivo siga "MODIFIED" (todavía no fue aceptada ni rechazada).
  const isPendingModificacion = efectivoEstado === 'MODIFIED' || efectivoEstado === 'MODIFIED_BY_HOST';
  const latestProposedDate = useMemo(() => {
    if (!isPendingModificacion) return null;
    for (let i = mensajes.length - 1; i >= 0; i--) {
      const item = mensajes[i] as any;
      if (item.fecha_inicio_nueva && item.fecha_fin_nueva) {
        return { inicio: item.fecha_inicio_nueva, fin: item.fecha_fin_nueva };
      }
    }
    return null;
  }, [mensajes, isPendingModificacion]);

  // ─── Modificar fechas ─────────────────────────────────────────────────────

  const hasDateChanges = !!(modStartDate && modEndDate);

  const modNowThreshold = useMemo(
    () => ceilToNextMinute(new Date()),
    // Deps usadas como disparadores: recalculamos "ahora" cuando cambian las
    // fechas o se abre el modo edición, no porque el body las consuma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modStartDate, modEndDate, isModifyMode],
  );

  const modDateErrorMessage = useMemo(() => {
    const hasAny = !!modStartDate || !!modEndDate;
    if (hasAny && (!modStartDate || !modEndDate)) return 'Completá fecha de inicio y fin.';
    if (!modStartDate || !modEndDate) return null;
    if (modStartDate < modNowThreshold) return 'La fecha de inicio es menor a la actual.';
    if (modEndDate <= modStartDate) return 'La fecha de fin debe ser mayor a la de inicio.';
    return null;
  }, [modStartDate, modEndDate, modNowThreshold]);

  const canSubmitModificar = useMemo(
    () => !modDateErrorMessage && (hasDateChanges || messageDraft.trim().length > 0),
    [modDateErrorMessage, hasDateChanges, messageDraft],
  );

  const canSendMessage = useMemo(() => {
    if (composerFinalState) return false;
    return messageDraft.trim().length > 0 || pickedFiles.length > 0;
  }, [composerFinalState, messageDraft, pickedFiles]);

  // En modo modificar, alcanza con cambiar las fechas (sin observación) para habilitar el envío.
  const canSubmitComposer = isModifyMode ? canSubmitModificar : canSendMessage;

  const modPickerValue = useMemo(() => {
    if (showDatePicker.target === 'start') return modStartDate ?? ceilToNextMinute(new Date());
    if (modEndDate) return modEndDate;
    return new Date((modStartDate ?? ceilToNextMinute(new Date())).getTime() + 3600000);
  }, [showDatePicker.target, modStartDate, modEndDate]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const resetModifyDraft = useCallback(() => {
    setShowDatePicker({ show: false, mode: 'date', target: 'start' });
    setModStartDate(null);
    setModEndDate(null);
    setIsModifyMode(false);
  }, []);

  // ─── Marcar como visto ────────────────────────────────────────────────────

  useMarcarVisto({ solicitud, solicitudId, invitadosSinCreador, marcarVisto });

  // ─── Handlers aceptar / rechazar ─────────────────────────────────────────

  const closeAcceptModal = useCallback(() => {
    setShowAcceptModal(false);
    setAcceptObservation('');
  }, []);

  const closeRejectModal = useCallback(() => {
    setShowRejectModal(false);
    setRejectObservation('');
  }, []);

  const openCrearActividadModal = useCallback(() => {
    if (solicitud.fecha_inicio && solicitud.fecha_fin) {
      setAgendaFechaInicio(new Date(solicitud.fecha_inicio));
      setAgendaFechaFin(new Date(solicitud.fecha_fin));
    }
    setSelectedActivityParticipantIds(todosParticipantesIds);
    setShowAddToAgendaModal(true);
  }, [solicitud, todosParticipantesIds]);

  const openCrearObjetivoModal = useCallback(() => {
    setSelectedActivityParticipantIds(todosParticipantesIds);
    setShowObjetivoParticipantesModal(true);
  }, [todosParticipantesIds]);

  const buildObjetivoInvitadosSeleccionados = useCallback((): Invitado[] =>
    selectedActivityParticipantIds.map(uid => ({
      user_id: uid,
      rol: uid === user?.user_context_id ? 'ASSIGNEE' : 'VISUALIZER',
    })),
    [selectedActivityParticipantIds, user],
  );

  const handleCrearObjetivoDesdeSolicitud = useCallback(async () => {
    const archivosExistentesIds = todosArchivos.map((a: any) => a.id).filter(Boolean);
    const payload: CreateObjetivo = {
      titulo: solicitud.titulo,
      descripcion: solicitud.descripcion ?? '',
      estado: 'PENDIENTE',
      solicitud_id: solicitudId,
      invitados: buildObjetivoInvitadosSeleccionados(),
      ...(archivosExistentesIds.length > 0 ? { archivosIds: archivosExistentesIds } : {}),
    };
    try {
      await crearObjetivo(payload);
      setLocalEstado('ACTIVIDAD_CREADA');
      setShowObjetivoParticipantesModal(false);
      showModal('Éxito', 'Objetivo creado');
    } catch (e) {
      showModal('Error', e instanceof Error ? e.message : 'Intenta nuevamente');
    }
  }, [solicitud, solicitudId, todosArchivos, buildObjetivoInvitadosSeleccionados, crearObjetivo, showModal]);

  const handleOpenAsPreview = useCallback((archivo: any) => openFile(archivo), [openFile]);

  const confirmAceptar = useCallback(() => {
    actualizarEstado(
      { solicitud_id: solicitudId, estado: 'ACCEPTED', observacion: acceptObservation.trim() || null },
      {
        onSuccess: () => {
          closeAcceptModal();
          setLocalEstado('ACCEPTED');
          setMessageDraft('');
          // Este flujo solo corre para el invitado que acepta (el creador no
          // "acepta" su propia solicitud), por eso alcanza con chequear que
          // la solicitud sea 1 a 1: con más participantes, solo el creador
          // podrá crear la actividad más adelante desde el banner verde.
          const puedeCrearAhora = solicitud.tipo_actividad !== 'CHAT' && totalParticipantes === 2;
          if (!puedeCrearAhora) {
            showModal('Éxito', 'Solicitud aceptada');
            return;
          }
          if (hasDates) {
            showModal('Solicitud aceptada', '¿Querés crear la actividad ahora?', [
              { key: 'create', label: 'Crear actividad', onPress: openCrearActividadModal },
              { key: 'later', label: 'Ahora no', onPress: () => { } },
            ]);
            return;
          }
          showModal('Solicitud aceptada', '¿Querés crear una actividad u objetivo?', [
            { key: 'activity', label: 'Crear actividad', onPress: openCrearActividadModal },
            { key: 'objetivo', label: 'Crear objetivo', onPress: openCrearObjetivoModal },
            { key: 'later', label: 'Ahora no', onPress: () => { } },
          ]);
        },
        onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Intenta nuevamente'),
      },
    );
  }, [solicitudId, actualizarEstado, acceptObservation, closeAcceptModal, solicitud, totalParticipantes, hasDates, showModal, openCrearActividadModal, openCrearObjetivoModal]);

  const confirmAceptarModificaciones = useCallback(() => {
    actualizarEstado(
      { solicitud_id: solicitudId, estado: 'ACCEPTED_BY_HOST', observacion: acceptObservation.trim() || null },
      {
        onSuccess: () => { closeAcceptModal(); showModal('Éxito', 'Modificaciones aceptadas'); },
        onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Intenta nuevamente'),
      },
    );
  }, [solicitudId, actualizarEstado, acceptObservation, closeAcceptModal, showModal]);

  const confirmRechazar = useCallback(() => {
    actualizarEstado(
      { solicitud_id: solicitudId, estado: 'REJECTED', observacion: rejectObservation.trim() || null },
      {
        onSuccess: () => { closeRejectModal(); Alert.alert('Éxito', 'Solicitud rechazada'); router.back(); },
        onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Intenta nuevamente'),
      },
    );
  }, [solicitudId, actualizarEstado, rejectObservation, closeRejectModal, router]);

  // ─── Modificar ────────────────────────────────────────────────────────────

  const ejecutarModificar = useCallback((crearDeTodosModos: number = 0) => {
    const payload = {
      fecha_inicio_nueva: modStartDate,
      fecha_fin_nueva: modEndDate,
      observacion: messageDraft.trim() || null,
    };
    setPendingModificarPayload(payload);
    actualizarEstado(
      {
        solicitud_id: solicitudId,
        estado: isHost ? 'MODIFIED_BY_HOST' : 'MODIFIED',
        ...payload,
        crear_de_todos_modos: crearDeTodosModos,
      },
      {
        onSuccess: (response: UpdateSolicitudResponse) => {
          if (!response.success && (response.rangosOcupados?.length ?? 0) > 0) {
            setBackendSolicitudRangos(response.rangosOcupados ?? []);
            return;
          }
          setBackendSolicitudRangos([]);
          resetModifyDraft();
          setMessageDraft('');
          Alert.alert('Éxito', 'Solicitud modificada');
        },
        onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Intenta nuevamente'),
      },
    );
  }, [solicitudId, modStartDate, modEndDate, messageDraft, actualizarEstado, isHost, resetModifyDraft]);

  const forceModificarSolicitud = useCallback(() => {
    if (!pendingModificarPayload) return;
    ejecutarModificar(1);
    setBackendSolicitudRangos([]);
  }, [pendingModificarPayload, ejecutarModificar]);

  const confirmModificar = useCallback(() => {
    if (!canSubmitModificar) return;
    if (!hasDateChanges) { ejecutarModificar(); return; }

    const participantes = [...new Set([
      solicitud.created_by,
      ...(user?.user_context_id ? [user.user_context_id] : []),
    ])].filter(Boolean) as number[];

    validacion.validate(
      { fechaInicio: modStartDate!, fechaFin: modEndDate!, participantes, solicitudIdExcluir: solicitudId },
      () => ejecutarModificar(),
    );
  }, [canSubmitModificar, hasDateChanges, solicitud.created_by, user, validacion, modStartDate, modEndDate, solicitudId, ejecutarModificar]);

  const showPicker = (mode: 'date' | 'time', target: 'start' | 'end') => {
    if (target === 'start' && !modStartDate) setModStartDate(ceilToNextMinute(new Date()));
    if (target === 'end' && !modEndDate) {
      const seed = modStartDate ?? ceilToNextMinute(new Date());
      setModEndDate(new Date(seed.getTime() + 3600000));
    }
    setShowDatePicker({ show: true, mode, target });
  };

  // ─── Enviar mensaje ───────────────────────────────────────────────────────

  const handleEnviarMensaje = useCallback(async () => {
    if (isModifyMode) {
      if (!canSubmitModificar) return;
      confirmModificar();
      return;
    }
    if (!canSendMessage) return;

    setIsSendingMessage(true);
    const archivosIds = await uploadPickedFiles();

    const trimmed = messageDraft.trim();
    if (!trimmed && archivosIds.length === 0) { setIsSendingMessage(false); return; }

    actualizarEstado(
      {
        solicitud_id: solicitudId,
        estado: isHost ? 'MODIFIED_BY_HOST' : 'MODIFIED',
        observacion: trimmed || null,
        ...(archivosIds.length > 0 ? { archivosIds } : {}),
      },
      {
        onSuccess: () => { setMessageDraft(''); setPickedFiles([]); setIsSendingMessage(false); },
        onError: e => { setIsSendingMessage(false); Alert.alert('Error', e instanceof Error ? e.message : 'Intenta nuevamente'); },
      },
    );
  }, [canSendMessage, canSubmitModificar, isModifyMode, confirmModificar, uploadPickedFiles, messageDraft, actualizarEstado, solicitudId, isHost, setPickedFiles]);

  // ─── Agenda ───────────────────────────────────────────────────────────────

  const agendaNow = useMemo(
    () => ceilToNextMinute(new Date()),
    // Deps usadas como disparadores: recalculamos "ahora" cuando cambian las
    // fechas o se abre el modal de agenda, no porque el body las consuma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agendaFechaInicio, agendaFechaFin, showAddToAgendaModal],
  );
  const agendaDateErrorMessage = useMemo(() => {
    if (agendaFechaInicio < agendaNow) return 'La fecha de inicio es menor a la actual.';
    if (agendaFechaFin <= agendaFechaInicio) return 'La fecha de fin debe ser mayor a la de inicio.';
    return null;
  }, [agendaFechaInicio, agendaFechaFin, agendaNow]);

  const ejecutarAgregarAAgenda = useCallback(() => {
    const esGrupal = selectedActivityParticipantIds.length > 1;
    crearActividad(
      {
        titulo: solicitud.titulo,
        descripcion: solicitud.descripcion,
        fecha_inicio: agendaFechaInicio,
        fecha_fin: agendaFechaFin,
        solicitud_id: solicitudId,
        participantes: selectedActivityParticipantIds,
      },
      {
        onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Intenta nuevamente'),
        onSuccess: response => {
          if (!response.success && (response.rangosOcupados?.length ?? 0) > 0) {
            setBackendActividadRangos(response.rangosOcupados ?? []);
            return;
          }
          setBackendActividadRangos([]);
          setLocalEstado('ACTIVIDAD_CREADA');
          setShowAddToAgendaModal(false);
          Alert.alert('Éxito', esGrupal
            ? 'Actividad agregada a la agenda de los participantes seleccionados'
            : 'Actividad agregada a tu agenda');
        },
      },
    );
  }, [agendaFechaInicio, agendaFechaFin, solicitud, solicitudId, crearActividad, selectedActivityParticipantIds]);

  const confirmAgregarAAgenda = useCallback(() => {
    if (agendaDateErrorMessage || selectedActivityParticipantIds.length === 0) return;
    validacion.validate(
      {
        fechaInicio: agendaFechaInicio, fechaFin: agendaFechaFin,
        participantes: selectedActivityParticipantIds,
        tipo_actividad: solicitud.tipo_actividad as 'REUNION' | 'MANDATO',
        actividadIdExcluir: null,
      },
      () => ejecutarAgregarAAgenda(),
    );
  }, [agendaDateErrorMessage, solicitud, validacion, ejecutarAgregarAAgenda, selectedActivityParticipantIds, agendaFechaInicio, agendaFechaFin]);

  // ─── Render ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!modalVisible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [modalVisible, handleClose]);

  if (!modalVisible) return null;

  return (
    <FullScreenPortal>
    <View style={styles.fullScreen}>
      <ModalKeyboardView style={styles.keyboardContainer}>
        <View style={[styles.container, { paddingBottom: keyboardVisible ? 0 : bottomInset }]}>

          {/* Header */}
          {/* paddingTop con el inset superior: el marginTop '10%' del container antiguo
             resolvía contra el ancho (~39px) y quedaba por debajo del status bar/notch
             de iOS; ahora es full screen, pero el inset sigue siendo necesario para no
             comerse el touch del botón de cerrar bajo el status bar/notch. */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + 5 }]}>
              <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color={glassColors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>{solicitud.titulo}</Text>
            </View>

            <View style={styles.contentBody}>
              <ScrollView
                style={styles.topSection}
                contentContainerStyle={styles.topSectionContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
              {/* Participantes */}
              <ParticipantesBlock
                participantes={displayParticipantes.map(inv => ({
                  id: inv.user_id,
                  nombre: getParticipanteDisplayName(inv),
                }))}
                onRemove={isHost ? handleQuitarParticipante : undefined}
                onAgregar={isHost ? () => setShowParticipantesSelector(p => !p) : undefined}
                canManage={isHost}
                extraContent={
                  isHost && showParticipantesSelector ? (
                    <View style={styles.selectorCard}>
                      <UserSelector
                        selectedUsers={participantesSelectedUsers}
                        onSelectUsers={handleSelectParticipantes}
                        users={participantesSearchResults ?? []}
                        roles={rolesForSelector}
                        isLoadingUsers={isSearchingParticipantes || isLoadingParticipantesRole}
                        onSearch={setParticipantesSearchQuery}
                        onSelectRole={role => { setParticipantesActiveRole(role); setShowParticipantesRoleModal(true); }}
                        showSelectedChips={false}
                      />
                    </View>
                  ) : null
                }
              />

              {/* Título */}
              <View style={styles.contentBlock}>
                <View style={styles.badgeRow}>
                  <View style={styles.chip}>
                    <Ionicons name="pricetag-outline" size={12} color={colors.lightTint} style={{ marginRight: 5 }} />
                    <ThemedText style={styles.chipText}>
                      {formatTipoActividad(solicitud.tipo_actividad)}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Banner expirada */}
              {isExpiredState && (
                <View style={styles.expiredBanner}>
                  <Ionicons name="alert-circle-outline" size={20} color="#5F6368" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.expiredBannerTitle}>Solicitud expirada</ThemedText>
                    <ThemedText style={styles.expiredBannerText}>No se pueden realizar acciones.</ThemedText>
                  </View>
                </View>
              )}

              {/* Banner agenda verde */}
              {mostrarBotonAgendaVerde && (
                <View style={styles.agendaVerdeBanner}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.agendaVerdeTitulo}>Solicitud aceptada</ThemedText>
                    <View style={styles.agendaVerdeActions}>
                      {puedeCrearActividad && (
                        <GlassButton
                          variant="success"
                          label="Agregar a agenda"
                          onPress={openCrearActividadModal}
                          disabled={isCreatingActividad}
                          icon={(color) => <Ionicons name="calendar" size={16} color={color} />}
                          style={styles.agendaVerdeBtn}
                          textStyle={styles.agendaVerdeBtnText}
                        />
                      )}
                      {puedeCrearObjetivo && (
                        <GlassButton
                          variant="secondary"
                          label="Crear objetivo"
                          onPress={openCrearObjetivoModal}
                          disabled={isCreatingObjetivo}
                          icon={() => <Ionicons name="flag" size={16} color={glassColors.success} />}
                          style={styles.agendaVerdeBtn}
                          textStyle={[styles.agendaVerdeBtnText, { color: glassColors.success }]}
                        />
                      )}
                    </View>
                  </View>
                </View>
              )}
              </ScrollView>

              {/* Mensajes: usa todo el espacio restante debajo de participantes/banners */}
              <View style={[styles.messagesCard, styles.messagesCardFlex]}>
                <View style={styles.sectionHeaderRow}>
                  <ThemedText style={styles.label}>Mensajes</ThemedText>
                </View>

                <View style={[styles.bitacoraContainer, styles.bitacoraFlex]}>
                  {latestProposedDate && (
                    <View style={styles.proposedDateBanner}>
                      <Ionicons name="time-outline" size={16} color={colors.warning} style={{ marginRight: 8 }} />
                      <ThemedText style={styles.proposedDateText}>
                        Fecha propuesta: {formatDateDDMMYYYY(new Date(latestProposedDate.inicio))} {formatTimeHHMM(new Date(latestProposedDate.inicio))} {'→'} {formatDateDDMMYYYY(new Date(latestProposedDate.fin))} {formatTimeHHMM(new Date(latestProposedDate.fin))}
                      </ThemedText>
                    </View>
                  )}
                  {hasDates && hasNextPage && (
                    <View style={styles.pinnedDatesBar}>
                      <ThemedText style={styles.pinnedDatesText}>
                        Fechas: {formatDateDDMMYYYY(new Date(solicitud.fecha_inicio!))} {formatTimeHHMM(new Date(solicitud.fecha_inicio!))} {'-'} {formatDateDDMMYYYY(new Date(solicitud.fecha_fin!))} {formatTimeHHMM(new Date(solicitud.fecha_fin!))}
                      </ThemedText>
                    </View>
                  )}
                  {isLoadingBitacora ? (
                    <ActivityIndicator size="small" color={colors.lightTint} style={{ marginTop: 20 }} />
                  ) : mensajes.length > 0 ? (
                    <ScrollView
                      ref={messagesScrollRef}
                      style={styles.messagesListFlex}
                      contentContainerStyle={styles.messagesListContent}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled
                      scrollEventThrottle={16}
                      onScroll={handleMessagesScroll}
                      onContentSizeChange={handleMessagesContentSizeChange}
                    >
                      {isFetchingNextPage && (
                        <View style={styles.loadingMoreContainer}>
                          <ActivityIndicator size="small" color={colors.lightTint} />
                        </View>
                      )}
                      {mensajes.map((b: any, index: number) => {
                        const isOwn = b.usuario_id !== null && b.usuario_id === user?.user_context_id;
                        const isDescripcion = b.id === 'descripcion';
                        const isSystem = b.isSystem === true;
                        const estadoKey = b.estado in estadoInvitacionMapping ? b.estado as EstadoInvitacionDB : null;
                        const hideTitle = isDescripcion || isSystem || (
                          MESSAGE_STATES.includes(b.estado) && b.estado !== 'ACCEPTED' && b.estado !== 'ACCEPTED_BY_HOST'
                        );
                        const fechaInicioMsg = b.fecha_inicio_nueva ?? (isDescripcion && !hasAnyFechaPropuesta ? solicitud.fecha_inicio : null);
                        const fechaFinMsg = b.fecha_fin_nueva ?? (isDescripcion && !hasAnyFechaPropuesta ? solicitud.fecha_fin : null);
                        const archivos = Array.isArray(b.archivos) ? b.archivos : [];

                        const currentDate = new Date(b.created_at);
                        const previousDate = index > 0 ? new Date(mensajes[index - 1].created_at) : null;
                        const showDaySeparator = !previousDate || !isSameCalendarDay(currentDate, previousDate);
                        const daySeparator = showDaySeparator && (
                          <View key={`day-${String(b.id)}`} style={styles.daySeparator}>
                            <View style={styles.daySeparatorPill}>
                              <Text style={styles.daySeparatorText}>{formatDayLabel(currentDate)}</Text>
                            </View>
                          </View>
                        );

                        if (isSystem) return (
                          <React.Fragment key={String(b.id)}>
                            {daySeparator}
                            <View style={styles.systemMessageContainer}>
                              <View style={styles.systemMessageBubble}>
                                <ThemedText style={styles.systemMessageText}>{b.observacion}</ThemedText>
                              </View>
                            </View>
                          </React.Fragment>
                        );

                        return (
                          <React.Fragment key={String(b.id)}>
                            {daySeparator}
                            <MessageBubble
                              id={String(b.id)}
                              usuarioNombre={b.usuario_nombre}
                              usuarioApellido={b.usuario_apellido}
                              createdAt={b.created_at}
                              observacion={b.observacion}
                              isOwn={isOwn}
                              hideTitle={hideTitle}
                              estadoKey={estadoKey}
                              archivos={archivos}
                              fechaInicioMsg={fechaInicioMsg}
                              fechaFinMsg={fechaFinMsg}
                              esPropuesta={!!b.fecha_inicio_nueva}
                              onOpenArchivo={handleOpenAsPreview}
                              onOpenImage={(archivo, uri) => openWithUri(buildArchivoFileItem({ ...archivo, _resolvedUri: uri }))}
                              seenBy={b.seen_by}
                              otherParticipantIds={todosParticipantesIds.filter(id => id !== b.usuario_id)}
                              resolveParticipantName={(uid) => {
                                const p = displayParticipantes.find(inv => inv.user_id === uid);
                                return p ? getParticipanteDisplayName(p) : '';
                              }}
                            />
                          </React.Fragment>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <ThemedText style={{ color: colors.secondaryText, textAlign: 'center', marginTop: 20 }}>
                      No hay cambios relevantes
                    </ThemedText>
                  )}
                </View>

                {/* Composer */}
                <View style={[styles.messageComposer, composerFocus.isFocused && { borderColor: glassColors.link }]}>
                  {isModifyMode && (
                    <View style={styles.inlineDateSection}>
                      <View style={styles.inlineDateRow}>
                        <ThemedText style={styles.inlineDateLabel}>Inicio</ThemedText>
                        <TouchableOpacity onPress={() => showPicker('date', 'start')} style={styles.inlineDateBtn}>
                          <Ionicons name="calendar-outline" size={14} color={colors.lightTint} />
                          <ThemedText style={styles.inlineDateBtnText}>{modStartDate ? formatDateDDMMYYYY(modStartDate) : 'Fecha'}</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => showPicker('time', 'start')} style={styles.inlineDateBtn}>
                          <Ionicons name="time-outline" size={14} color={colors.lightTint} />
                          <ThemedText style={styles.inlineDateBtnText}>{modStartDate ? formatTimeHHMM(modStartDate) : 'Hora'}</ThemedText>
                        </TouchableOpacity>
                        {modStartDate && (
                          <TouchableOpacity onPress={() => { setModStartDate(null); setModEndDate(null); }} style={styles.inlineDateClear}>
                            <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
                          </TouchableOpacity>
                        )}
                      </View>
                      {modStartDate && (
                        <View style={styles.inlineDateRow}>
                          <ThemedText style={styles.inlineDateLabel}>Fin</ThemedText>
                          <TouchableOpacity onPress={() => showPicker('date', 'end')} style={styles.inlineDateBtn}>
                            <Ionicons name="calendar-outline" size={14} color={colors.lightTint} />
                            <ThemedText style={styles.inlineDateBtnText}>{modEndDate ? formatDateDDMMYYYY(modEndDate) : 'Fecha'}</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => showPicker('time', 'end')} style={styles.inlineDateBtn}>
                            <Ionicons name="time-outline" size={14} color={colors.lightTint} />
                            <ThemedText style={styles.inlineDateBtnText}>{modEndDate ? formatTimeHHMM(modEndDate) : 'Hora'}</ThemedText>
                          </TouchableOpacity>
                        </View>
                      )}
                      {modDateErrorMessage && (
                        <ThemedText style={styles.inlineDateError}>{modDateErrorMessage}</ThemedText>
                      )}
                    </View>
                  )}

                  <TextInput
                    style={[styles.messageComposerInput, focusBorderStyles.inputNoOutline]}
                    placeholder={isModifyMode ? 'Observación (opcional)' : 'Escribir mensaje'}
                    placeholderTextColor={colors.secondaryText}
                    value={messageDraft}
                    onChangeText={setMessageDraft}
                    onFocus={composerFocus.onFocus}
                    onBlur={composerFocus.onBlur}
                    multiline
                    textAlignVertical="top"
                  />

                  {pickedFiles.length > 0 && (
                    <View style={styles.messageComposerAttachments}>
                      {pickedFiles.map((f, i) => (
                        <View key={`${f.uri}-${i}`} style={styles.messageComposerAttachmentRow}>
                          <ThemedText style={styles.messageComposerAttachmentName} numberOfLines={1}>{f.name}</ThemedText>
                          <TouchableOpacity onPress={() => setPickedFiles(p => p.filter((_, j) => j !== i))} style={styles.messageComposerAttachmentAction}>
                            <Ionicons name="trash-outline" size={18} color={colors.secondaryText} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.messageActionsRow}>
                    {!composerFinalState && (
                      <>
                        {/* Modificar fechas */}
                        {!isFinalState && (
                          <TouchableOpacity
                            style={[styles.messageActionButton, isModifyMode && styles.messageActionButtonActive]}
                            onPress={() => isModifyMode ? resetModifyDraft() : setIsModifyMode(true)}
                          >
                            <Ionicons name="calendar-outline" size={20} color={colors.lightTint} />
                          </TouchableOpacity>
                        )}

                        {/* Adjuntar */}
                        <TouchableOpacity style={styles.messageActionButton} onPress={handleAgregarAdjunto}>
                          <Ionicons name="attach" size={20} color={colors.lightTint} />
                        </TouchableOpacity>

                        {/* Rechazar */}
                        {!isFinalState && (
                          <TouchableOpacity style={styles.messageActionButton} onPress={() => {
                            setRejectObservation(messageDraft);
                            setShowRejectModal(true);
                          }}>
                            <Ionicons name="close" size={20} color={colors.error} />
                          </TouchableOpacity>
                        )}

                        {/* Aceptar */}
                        {!isFinalState && (
                          <TouchableOpacity
                            style={[styles.messageActionButton, aceptarDeshabilitado && styles.messageActionButtonDisabled]}
                            disabled={aceptarDeshabilitado}
                            onPress={() => {
                              setAcceptObservation(messageDraft);
                              setShowAcceptModal(true);
                            }}>
                            <Ionicons name="checkmark" size={20} color={colors.success} />
                          </TouchableOpacity>
                        )}

                        {/* Enviar */}
                        <TouchableOpacity
                          style={[styles.messageActionButton, styles.messageActionButtonPrimary, !canSubmitComposer && styles.messageActionButtonDisabled]}
                          onPress={handleEnviarMensaje}
                          disabled={!canSubmitComposer || isSendingMessage}
                        >
                          {isSendingMessage
                            ? <ActivityIndicator size="small" color={colors.lightTint} />
                            : <Ionicons name="send" size={20} color={colors.lightTint} />}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Date picker inline */}
            {showDatePicker.show && (
              <DateTimePicker
                visible={showDatePicker.show}
                testID="dateTimePicker"
                value={modPickerValue}
                mode={showDatePicker.mode}
                is24Hour
                onConfirm={date => {
                  const target = showDatePicker.target;
                  if (target === 'start') {
                    setModStartDate(date);
                    if (modEndDate && date > modEndDate) setModEndDate(new Date(date.getTime() + 3600000));
                  } else {
                    setModEndDate(date);
                  }
                  setShowDatePicker(p => ({ ...p, show: false }));
                }}
                onCancel={() => setShowDatePicker(p => ({ ...p, show: false }))}
              />
            )}

            {/* Modal Aceptar */}
            <Modal visible={showAcceptModal} transparent animationType="fade">
              <ModalKeyboardView style={styles.keyboardContainer}>
                <TouchableWithoutFeedback onPress={closeAcceptModal}>
                  <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                      <View style={styles.modalContent}>
                        <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
                          {isAceptarModificacionesFlow ? 'Aceptar Modificaciones' : 'Aceptar Solicitud'}
                        </ThemedText>
                        <ThemedText style={{ marginBottom: 8 }}>
                          {isAceptarModificacionesFlow
                            ? '¿Confirmás que deseás aceptar las modificaciones propuestas?'
                            : '¿Confirmás que deseás aceptar esta solicitud?'}
                        </ThemedText>
                        {acceptObservation.trim().length > 0 && (
                          <>
                            <ThemedText style={styles.modalInputLabel}>Observación</ThemedText>
                            <View style={[styles.modalTextInput, { backgroundColor: colors.background }]}>
                              <ThemedText style={{ color: colors.text }}>{acceptObservation}</ThemedText>
                            </View>
                          </>
                        )}
                        <View style={styles.modalActions}>
                          <TouchableOpacity onPress={closeAcceptModal} style={styles.modalBtnCancel}>
                            <ThemedText style={{ color: glassColors.textMuted }}>Cancelar</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={isAceptarModificacionesFlow ? confirmAceptarModificaciones : confirmAceptar}
                            style={styles.modalBtnConfirm}
                            disabled={isUpdatingEstado}
                          >
                            {isUpdatingEstado
                              ? <ActivityIndicator color={glassColors.text} />
                              : <ThemedText style={{ color: glassColors.text }}>Aceptar</ThemedText>}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </ModalKeyboardView>
            </Modal>

            {/* Modal Rechazar */}
            <Modal visible={showRejectModal} transparent animationType="fade">
              <ModalKeyboardView style={styles.keyboardContainer}>
                <TouchableWithoutFeedback onPress={closeRejectModal}>
                  <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                      <View style={styles.modalContent}>
                        <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Rechazar solicitud</ThemedText>
                        <ThemedText style={{ marginBottom: 8 }}>¿Deseás rechazar esta solicitud?</ThemedText>
                        {rejectObservation.trim().length > 0 && (
                          <>
                            <ThemedText style={styles.modalInputLabel}>Observación</ThemedText>
                            <View style={[styles.modalTextInput, { backgroundColor: colors.background }]}>
                              <ThemedText style={{ color: colors.text }}>{rejectObservation}</ThemedText>
                            </View>
                          </>
                        )}
                        <View style={styles.modalActions}>
                          <TouchableOpacity onPress={closeRejectModal} style={styles.modalBtnCancel}>
                            <ThemedText style={{ color: glassColors.textMuted }}>Cancelar</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={confirmRechazar}
                            style={[styles.modalBtnConfirm, styles.modalBtnConfirmDanger]}
                            disabled={isUpdatingEstado}
                          >
                            {isUpdatingEstado
                              ? <ActivityIndicator color={glassColors.text} />
                              : <ThemedText style={{ color: glassColors.text }}>Rechazar</ThemedText>}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </ModalKeyboardView>
            </Modal>

            {/* Modal Selección por Rol */}
            <RoleUserSelectionModal
              visible={showParticipantesRoleModal}
              onClose={() => { setShowParticipantesRoleModal(false); setParticipantesActiveRole(''); }}
              roleName={participantesActiveRole}
              roleUsers={participantesRoleUsersData ?? []}
              selectedUsers={participantesSelectedUsers}
              onToggleUser={handleToggleUserParticipante}
              onSelectAll={handleSelectAllParticipantes}
              onDeselectAll={handleDeselectAllParticipantes}
            />

            {/* Modal Agregar a la Agenda */}
            <Modal visible={showAddToAgendaModal} transparent animationType="fade" onRequestClose={() => setShowAddToAgendaModal(false)}>
              <ModalKeyboardView style={{ flex: 1 }}>
                <TouchableWithoutFeedback onPress={() => setShowAddToAgendaModal(false)}>
                  <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                      <View style={styles.modalContent}>
                        <ThemedText type="subtitle" style={{ marginBottom: 8 }}>Agregar a la agenda</ThemedText>
                        {!hasDates && (
                          <ThemedText style={{ color: colors.secondaryText, marginBottom: 16, fontSize: 13 }}>
                            Esta tarea no tiene fechas. Ingresá las fechas para agendar.
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
                        <ThemedText style={styles.label}>¿Quién verá esta actividad?</ThemedText>
                        <ParticipantesCheckList
                          invitados={displayParticipantes}
                          selectedIds={selectedActivityParticipantIds}
                          onToggle={toggleActivityParticipant}
                          getLabel={getParticipanteDisplayName}
                        />
                        <View style={styles.modalActions}>
                          <TouchableOpacity onPress={() => setShowAddToAgendaModal(false)} style={styles.modalBtnCancel}>
                            <ThemedText style={{ color: glassColors.textMuted }}>Cancelar</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={confirmAgregarAAgenda}
                            style={[styles.modalBtnConfirm, { opacity: (agendaDateErrorMessage || selectedActivityParticipantIds.length === 0) ? 0.5 : 1 }]}
                            disabled={isCreatingActividad || !!agendaDateErrorMessage || selectedActivityParticipantIds.length === 0}
                          >
                            {isCreatingActividad
                              ? <ActivityIndicator color={glassColors.text} />
                              : <ThemedText style={{ color: glassColors.text }}>Agregar</ThemedText>}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
                {showAgendaDatePicker.show && (
                  <DateTimePicker
                    visible={showAgendaDatePicker.show}
                    testID="agendaDateTimePicker"
                    value={showAgendaDatePicker.target === 'start' ? agendaFechaInicio : agendaFechaFin}
                    mode={showAgendaDatePicker.mode}
                    is24Hour
                    onConfirm={date => {
                      if (showAgendaDatePicker.target === 'start') {
                        setAgendaFechaInicio(date);
                        if (date >= agendaFechaFin) setAgendaFechaFin(new Date(date.getTime() + 3600000));
                      } else {
                        setAgendaFechaFin(date);
                      }
                      setShowAgendaDatePicker(p => ({ ...p, show: false }));
                    }}
                    onCancel={() => setShowAgendaDatePicker(p => ({ ...p, show: false }))}
                  />
                )}
              </ModalKeyboardView>
            </Modal>

            {/* Modal Crear Objetivo: selección de destinatarios */}
            <Modal visible={showObjetivoParticipantesModal} transparent animationType="fade" onRequestClose={() => setShowObjetivoParticipantesModal(false)}>
              <ModalKeyboardView style={{ flex: 1 }}>
                <TouchableWithoutFeedback onPress={() => setShowObjetivoParticipantesModal(false)}>
                  <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                      <View style={styles.modalContent}>
                        <ThemedText type="subtitle" style={{ marginBottom: 8 }}>Crear objetivo</ThemedText>
                        <ThemedText style={styles.label}>¿Quién verá este objetivo?</ThemedText>
                        <ParticipantesCheckList
                          invitados={displayParticipantes}
                          selectedIds={selectedActivityParticipantIds}
                          onToggle={toggleActivityParticipant}
                          getLabel={getParticipanteDisplayName}
                        />
                        <View style={styles.modalActions}>
                          <TouchableOpacity onPress={() => setShowObjetivoParticipantesModal(false)} style={styles.modalBtnCancel}>
                            <ThemedText style={{ color: glassColors.textMuted }}>Cancelar</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleCrearObjetivoDesdeSolicitud}
                            style={[styles.modalBtnConfirm, { opacity: selectedActivityParticipantIds.length === 0 ? 0.5 : 1 }]}
                            disabled={isCreatingObjetivo || selectedActivityParticipantIds.length === 0}
                          >
                            {isCreatingObjetivo
                              ? <ActivityIndicator color={glassColors.text} />
                              : <ThemedText style={{ color: glassColors.text }}>Crear</ThemedText>}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </ModalKeyboardView>
            </Modal>

            {/* Validación de fechas */}
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

            <AlertModal
              visible={alertModal.visible}
              title={alertModal.title}
              message={alertModal.message}
              actions={alertModal.actions}
              onClose={closeAlert}
              onDismiss={onModalDismiss}
            />

            <OperacionPendienteModal visible={isMutating} />
        </View>
      </ModalKeyboardView>

      <FilePreview file={previewFile} onClose={closePreview} />
    </View>
    </FullScreenPortal>
  );
}

// ─── ParticipantesCheckList ─────────────────────────────────────────────────

function ParticipantesCheckList({ invitados, selectedIds, onToggle, getLabel }: {
  invitados: SolicitudInvitado[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  getLabel: (inv: SolicitudInvitado) => string;
}) {
  return (
    <ScrollView style={localStyles.checkList} nestedScrollEnabled showsVerticalScrollIndicator>
      {invitados.map(inv => {
        const checked = selectedIds.includes(inv.user_id);
        return (
          <TouchableOpacity
            key={inv.user_id}
            style={localStyles.checkRow}
            onPress={() => onToggle(inv.user_id)}
          >
            <Ionicons
              name={checked ? 'checkbox' : 'square-outline'}
              size={20}
              color={checked ? colors.tint : colors.secondaryText}
            />
            <ThemedText style={localStyles.checkRowText}>{getLabel(inv)}</ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── localStyles ───────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  // Sin scroll de pantalla completa: participantes/chip/banners quedan en un
  // bloque acotado arriba, y la tarjeta de mensajes ocupa el resto del alto
  // disponible con su propio scroll interno (mismo patrón que ConversacionChat).
  contentBody: {
    flex: 1,
    paddingHorizontal: 16,
  },
  topSection: {
    flexGrow: 0,
    maxHeight: '42%',
  },
  topSectionContent: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 14,
  },
  bitacoraFlex: {
    flex: 1,
  },
  messagesCardFlex: {
    flex: 1,
  },
  messagesListFlex: {
    flex: 1,
  },
  agendaVerdeBanner: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success + '40',
    backgroundColor: colors.success + '12',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  agendaVerdeTitulo: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
  },
  agendaVerdeActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  agendaVerdeBtn: {
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  agendaVerdeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  proposedDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.warning + '12',
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  proposedDateText: {
    flex: 1,
    fontSize: 12,
    color: colors.warning,
    fontWeight: '700',
  },
  pinnedDatesBar: {
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutralBorder,
  },
  pinnedDatesText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  inlineDateSection: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutralBorder,
  },
  inlineDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineDateLabel: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: '600',
    width: 34,
  },
  inlineDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  inlineDateBtnText: {
    fontSize: 12,
    color: colors.lightTint,
  },
  inlineDateClear: {
    padding: 2,
    marginLeft: 'auto',
  },
  inlineDateError: {
    fontSize: 11,
    color: colors.error,
    marginTop: 2,
  },
  messageActionButtonActive: {
    borderColor: 'rgba(26,115,232,0.35)',
    backgroundColor: 'rgba(26,115,232,0.12)',
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
  dateBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  checkList: {
    maxHeight: 160,
    marginBottom: 12,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  checkRowText: {
    fontSize: 14,
    color: colors.text,
  },
});

const styles = { ...conversacionStyles, ...localStyles };
