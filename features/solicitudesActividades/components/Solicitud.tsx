import { AlertModal, type AlertModalAction } from '@/components/AlertModal';
import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors, UI } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ArchivoUso } from '@/features/docs/models/Archivo';
import { useGetArchivoUrlFirmada, useUploadArchivo } from '@/features/docs/viewmodels/useArchivos';
import { useValidacionFechas } from '@/features/solicitudesActividades/viewmodels/useValidacionFechas';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { ApiOperationResult } from '@/shared/types/apiStatus';
import { UserSummary } from '@/shared/users/User';
import { adminRoles, allRoles } from '@/shared/users/roles';
import { useGetUserByRole, useSearchUsers } from '@/shared/users/useUser';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import type * as ImagePickerTypes from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { UserSelector } from '../../../components/UserSelector';
import { useCreateObjetivo } from '../../kanban/hooks/useObjetivos';
import type { CreateObjetivo, Invitado } from '../../kanban/models/Objetivo';
import {
  EstadoInvitacionDB,
  RangoOcupado,
  ReenviarSolicitudRequest,
  SolicitudEnviada,
  SolicitudInvitado,
  UpdateSolicitudResponse,
  estadoInvitacionMapping,
} from '../models/Solicitud';
import { useCrearActividad } from '../viewmodels/useActividades';
import {
  useActualizarEstadoInvitacion,
  useActualizarInvitadosSolicitud,
  useReenviarSolicitud,
  useSolicitudBitacora,
} from '../viewmodels/useSolicitudes';
import { RoleUserSelectionModal } from './RoleUserSelectionModal';
import { ValidacionFechasModal } from './ValidacionFechasModal';

const colors = Colors['light'];

let ImagePicker: typeof ImagePickerTypes | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  console.warn('expo-image-picker not available.');
}

const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
});

const MODIFIED_STATES: EstadoInvitacionDB[] = [
  'MODIFIED', 'MODIFIED_BY_HOST', 'ACCEPTED', 'REJECTED', 'ACCEPTED_BY_HOST',
];

function formatDateDDMMYYYY(date: Date): string {
  return DATE_FORMATTER.format(date);
}

function formatTimeHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

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
  const { mutate: actualizarEstado, isPending: isUpdatingEstado } = useActualizarEstadoInvitacion();
  const { mutate: reenviarSolicitud, isPending: isSharing } = useReenviarSolicitud();
  const { mutate: crearActividad, isPending: isCreatingActividad } = useCrearActividad();
  const { mutateAsync: crearObjetivo, isPending: isCreatingObjetivo } = useCreateObjetivo();
  const { mutateAsync: uploadArchivo } = useUploadArchivo();
  const { getArchivoUrlFirmada } = useGetArchivoUrlFirmada();
  const { mutate: actualizarInvitados } = useActualizarInvitadosSolicitud();
  const validacion = useValidacionFechas();

  const isMutating = isUpdatingEstado || isSharing
    || isCreatingActividad || isCreatingObjetivo;

  // ─── Rol / permisos ───────────────────────────────────────────────────────
  const isConsejo = hasRole('consejo');
  const rolesForSelector = isConsejo ? adminRoles : allRoles;

  // ─── Estado UI ────────────────────────────────────────────────────────────
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddToAgendaModal, setShowAddToAgendaModal] = useState(false);
  const [showFullBitacora, setShowFullBitacora] = useState(false);
  const [acceptObservation, setAcceptObservation] = useState('');
  const [rejectObservation, setRejectObservation] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [pickedFiles, setPickedFiles] = useState<any[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isModifyMode, setIsModifyMode] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean; title: string; message?: string; actions: AlertModalAction[];
  }>({ visible: false, title: '', actions: [] });
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

  // Compartir
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsersToShare, setSelectedUsersToShare] = useState<UserSummary[]>([]);
  const [activeRole, setActiveRole] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);
  const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);
  const isLoadingUsers = isSearchingUsers || isLoadingRole;

  // Participantes (agregar/quitar invitados)
  const [localParticipantes, setLocalParticipantes] = useState<SolicitudInvitado[]>(() => solicitud.invitados);
  const [participantesSelectedUsers, setParticipantesSelectedUsers] = useState<UserSummary[]>(() =>
    solicitud.invitados.map(inv => ({
      user_context_id: inv.user_id,
      username: '',
      nombre: inv.invitado_nombre ?? '',
      apellido: inv.invitado_apellido ?? '',
      email: '',
      role: [],
    }))
  );
  const [showParticipantesSelector, setShowParticipantesSelector] = useState(false);
  const [participantesSearchQuery, setParticipantesSearchQuery] = useState('');
  const [participantesActiveRole, setParticipantesActiveRole] = useState('');
  const [showParticipantesRoleModal, setShowParticipantesRoleModal] = useState(false);
  const [participantesExpanded, setParticipantesExpanded] = useState(false);
  const { data: participantesSearchResults, isLoading: isSearchingParticipantes } = useSearchUsers(participantesSearchQuery);
  const { data: participantesRoleUsersData, isLoading: isLoadingParticipantesRole } = useGetUserByRole(participantesActiveRole);

  const seenAutoMarkKeyRef = useRef<string | null>(null);
  const messagesScrollRef = useRef<ScrollView | null>(null);
  const prevContentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const isPrependingRef = useRef(false);

  // ─── Derivados del prop solicitud ─────────────────────────────────────────

  // Invitados sin el creador (para "Para:")
  const invitadosSinCreador = useMemo(() =>
    solicitud.invitados.filter(inv => inv.user_id !== solicitud.created_by),
    [solicitud.invitados, solicitud.created_by],
  );

  const participantesTexto = useMemo(() => {
    const nombres = solicitud.invitados
      .map(inv => [inv.invitado_nombre, inv.invitado_apellido].filter(Boolean).join(' ').trim())
      .filter(Boolean);
    const unicos = Array.from(new Set(nombres));
    if (unicos.length === 0) return 'Sin participantes';
    if (unicos.length <= 3) return unicos.join(', ');
    return `${unicos.slice(0, 3).join(', ')} +${unicos.length - 3} personas`;
  }, [solicitud.invitados]);

  const todosParticipantesIds = useMemo(() => {
    const ids = solicitud.invitados.map(inv => inv.user_id);
    if (user?.user_context_id && !ids.includes(user.user_context_id)) ids.push(user.user_context_id);
    return [...new Set(ids)];
  }, [solicitud.invitados, user]);

  const participantesAceptados = useMemo(() => {
    const ids: number[] = [];
    if (solicitud.created_by) ids.push(solicitud.created_by);
    invitadosSinCreador
      .filter(inv => inv.estado === 'ACCEPTED')
      .forEach(inv => ids.push(inv.user_id));
    return [...new Set(ids)];
  }, [solicitud.created_by, invitadosSinCreador]);

  const todosArchivos = useMemo(() => {
    const archivosBase = solicitud.archivos ?? [];
    const archivosBitacora = (bitacora ?? []).flatMap((b: any) => b.archivos ?? []);
    const map = new Map<number, any>();
    [...archivosBase, ...archivosBitacora].forEach(a => { if (a?.id) map.set(a.id, a); });
    return Array.from(map.values());
  }, [solicitud.archivos, bitacora]);

  const displayParticipantes = useMemo(
    () => localParticipantes.filter(inv => inv.user_id !== solicitud.created_by),
    [localParticipantes, solicitud.created_by],
  );

  const getParticipanteDisplayName = useCallback((inv: SolicitudInvitado): string => {
    if (inv.invitado_nombre) return `${inv.invitado_nombre} ${inv.invitado_apellido ?? ''}`.trim();
    const matched = participantesSelectedUsers.find(u => u.user_context_id === inv.user_id);
    if (matched?.nombre) return `${matched.nombre} ${matched.apellido}`.trim();
    return `Usuario #${inv.user_id}`;
  }, [participantesSelectedUsers]);

  // ─── Flags de estado ──────────────────────────────────────────────────────

  const efectivoEstado = localEstado ?? solicitud.estado;

  const hasDates = !!(solicitud.fecha_inicio && solicitud.fecha_fin);
  const isExpiredState = efectivoEstado === 'EXPIRED';
  const esActividadCreada = efectivoEstado === 'ACTIVIDAD_CREADA';
  const isFinalState = ['ACTIVIDAD_CREADA', 'EXPIRED', 'ACCEPTED', 'REJECTED'].includes(efectivoEstado);
  const isAceptarModificacionesFlow = isHost && efectivoEstado === 'MODIFIED';
  // El invitado no puede aceptar mientras la solicitud está en estado "Modificado" (propuso un cambio).
  const aceptarDeshabilitado = !isHost && efectivoEstado === 'MODIFIED';
  const puedeCompartir = isHost && !isExpiredState && !esActividadCreada;

  const puedeAgregarAAgenda = useMemo(() => {
    if (esActividadCreada) return false;
    if (solicitud.tipo_actividad === 'REUNION') {
      const algunAceptado = invitadosSinCreador.some(inv => inv.estado === 'ACCEPTED');
      return isHost && algunAceptado;
    }
    if (solicitud.tipo_actividad === 'MANDATO') return !isHost && efectivoEstado === 'ACCEPTED';
    return !isHost && efectivoEstado === 'ACCEPTED';
  }, [solicitud.tipo_actividad, isHost, esActividadCreada, invitadosSinCreador, efectivoEstado]);

  const puedeMandatoSinFechas = useMemo(() =>
    solicitud.tipo_actividad === 'MANDATO'
    && efectivoEstado === 'ACCEPTED'
    && !hasDates,
    [solicitud.tipo_actividad, efectivoEstado, hasDates],
  );

  const mostrarBotonAgendaVerde = puedeAgregarAAgenda || puedeMandatoSinFechas;

  const isAcceptedWithAgenda = efectivoEstado === 'ACCEPTED' && puedeAgregarAAgenda;
  const composerFinalState = isFinalState && !isAcceptedWithAgenda && !puedeMandatoSinFechas;

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

  const bitacoraVisible = useMemo(() => {
    if (!bitacora) return [];
    if (showFullBitacora) return bitacora;
    return bitacora.filter(b => MODIFIED_STATES.includes(b.estado));
  }, [bitacora, showFullBitacora]);

  const mensajes = useMemo(() => {
    const descripcion = solicitud.descripcion?.trim();
    const createdAt = solicitud.fecha_inicio
      ? new Date(solicitud.fecha_inicio).toISOString()
      : new Date().toISOString();

    const base = descripcion && !hasNextPage
      ? [{
        id: 'descripcion',
        usuario_id: solicitud.created_by ?? null,
        usuario_nombre: solicitud.nombre_creador ?? '',
        usuario_apellido: solicitud.apellido_creador ?? '',
        created_at: createdAt,
        observacion: descripcion,
        estado: 'MESSAGE' as const,
        fecha_inicio_nueva: null,
        fecha_fin_nueva: null,
        archivos: solicitud.archivos ?? [],
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
  }, [bitacoraVisible, solicitud, esActividadCreada, isExpiredState, hasNextPage]);

  // ─── Modificar fechas ─────────────────────────────────────────────────────

  const hasDateChanges = !!(modStartDate && modEndDate);

  const modNowThreshold = useMemo(
    () => ceilToNextMinute(new Date()),
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

  const showModal = useCallback((title: string, message?: string, actions?: AlertModalAction[]) => {
    const normalized: AlertModalAction[] = actions?.length
      ? actions
      : [{ key: 'ok', label: 'Aceptar', onPress: () => { }, variant: 'primary' }];
    setAlertModal({
      visible: true, title, message,
      actions: normalized.map(a => ({
        ...a,
        onPress: () => { setAlertModal(p => ({ ...p, visible: false })); a.onPress(); },
      })),
    });
  }, []);

  const resetModifyDraft = useCallback(() => {
    setShowDatePicker({ show: false, mode: 'date', target: 'start' });
    setModStartDate(null);
    setModEndDate(null);
    setIsModifyMode(false);
  }, []);

  const isSuccess = <T,>(r: ApiOperationResult<T>): r is ApiOperationResult<T> & { data: T } =>
    r.status === 'success' && r.data !== undefined;

  // ─── Marcar como visto ────────────────────────────────────────────────────

  useEffect(() => {
    if (!solicitud) return;
    const hasModifiedInvitados = invitadosSinCreador.some(inv => inv.estado === 'MODIFIED');
    const shouldMarkSeen = isHost
      ? hasModifiedInvitados
      : ['SENT', 'MODIFIED_BY_HOST', 'ACCEPTED_BY_HOST'].includes(solicitud.estado);

    if (!shouldMarkSeen) { seenAutoMarkKeyRef.current = null; return; }

    const key = isHost
      ? `${solicitudId}:host:${hasModifiedInvitados}`
      : `${solicitudId}:${solicitud.estado}`;
    if (seenAutoMarkKeyRef.current === key) return;
    seenAutoMarkKeyRef.current = key;

    actualizarEstado(
      { solicitud_id: solicitudId, estado: 'SEEN' },
      { onError: () => { seenAutoMarkKeyRef.current = null; } },
    );
  }, [solicitud, solicitudId, isHost, invitadosSinCreador, actualizarEstado]);

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
    setShowAddToAgendaModal(true);
  }, [solicitud]);

  const buildObjetivoInvitadosTodos = useCallback((): Invitado[] =>
    todosParticipantesIds.map(uid => ({
      user_id: uid,
      rol: uid === user?.user_context_id ? 'ASSIGNEE' : 'VISUALIZER',
    })),
    [todosParticipantesIds, user],
  );

  const handleCrearObjetivoDesdeSolicitud = useCallback(async () => {
    const archivosExistentesIds = todosArchivos.map((a: any) => a.id).filter(Boolean);
    const payload: CreateObjetivo = {
      titulo: solicitud.titulo,
      descripcion: solicitud.descripcion ?? '',
      estado: 'PENDIENTE',
      solicitud_id: solicitudId,
      invitados: buildObjetivoInvitadosTodos(),
      ...(archivosExistentesIds.length > 0 ? { archivosIds: archivosExistentesIds } : {}),
    };
    try {
      await crearObjetivo(payload);
      setLocalEstado('ACTIVIDAD_CREADA');
      showModal('Éxito', 'Objetivo creado');
    } catch (e) {
      showModal('Error', e instanceof Error ? e.message : 'Intenta nuevamente');
    }
  }, [solicitud, solicitudId, todosArchivos, buildObjetivoInvitadosTodos, crearObjetivo, showModal]);

  const confirmAceptar = useCallback(() => {
    actualizarEstado(
      { solicitud_id: solicitudId, estado: 'ACCEPTED', observacion: acceptObservation.trim() || null },
      {
        onSuccess: () => {
          closeAcceptModal();
          setLocalEstado('ACCEPTED');
          setMessageDraft('');
          if (!isHost && solicitud.tipo_actividad === 'REUNION') {
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
          if (solicitud.tipo_actividad === 'MANDATO') {
            showModal('Solicitud aceptada', '¿Querés crear una actividad u objetivo?', [
              { key: 'activity', label: 'Crear actividad', onPress: openCrearActividadModal },
              { key: 'objetivo', label: 'Crear objetivo', onPress: handleCrearObjetivoDesdeSolicitud },
              { key: 'later', label: 'Ahora no', onPress: () => { } },
            ]);
            return;
          }
          showModal('Éxito', 'Solicitud aceptada');
        },
        onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Intenta nuevamente'),
      },
    );
  }, [solicitudId, actualizarEstado, acceptObservation, closeAcceptModal, solicitud, isHost, hasDates, showModal, openCrearActividadModal, handleCrearObjetivoDesdeSolicitud]);

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
    let archivosIds: number[] = [];

    if (pickedFiles.length > 0) {
      try {
        const response = await uploadArchivo({
          item: pickedFiles.map(f => ({
            archivo: { uri: f.uri, name: f.name, type: f.type, size: f.size },
            archivoData: { nombre: f.name, tamaño: f.size, tipo: f.type, uso: ArchivoUso.TAREA },
          })),
        });
        const validos = (response?.exitosos ?? []).filter(isSuccess);
        archivosIds = validos.map(r => r.data.id);
        if (validos.length === 0) showModal('Error de archivos', 'No se pudo subir ningún archivo.');
        else if ((response?.fallidos ?? []).length > 0)
          showModal('Archivos parciales', `Se subieron ${validos.length} de ${pickedFiles.length}`);
      } catch {
        showModal('Error de archivos', 'No se pudieron subir los archivos.');
      }
    }

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
  }, [canSendMessage, canSubmitModificar, isModifyMode, confirmModificar, pickedFiles, uploadArchivo, isSuccess, messageDraft, actualizarEstado, solicitudId, isHost, showModal]);

  // ─── Archivos ─────────────────────────────────────────────────────────────

  const addImageAsset = useCallback((asset: ImagePickerTypes.ImagePickerAsset) => {
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    setPickedFiles(prev => [...prev, {
      name: asset.fileName ?? `foto_${Date.now()}.${ext}`,
      uri: asset.uri,
      type: asset.mimeType ?? `image/${ext}`,
      size: asset.fileSize,
    }]);
  }, []);

  const handleTakePhoto = useCallback(async () => {
    if (!ImagePicker) { showModal('No disponible', 'Cámara no disponible.'); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { showModal('Permiso denegado', 'Se necesita acceso a la cámara.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) addImageAsset(result.assets[0]);
  }, [addImageAsset, showModal]);

  const handleSeleccionarArchivo = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true, type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length > 0) {
        setPickedFiles(prev => [...prev, ...result.assets.map(a => ({
          name: a.name, uri: a.uri, type: a.mimeType ?? 'application/octet-stream', size: a.size,
        }))]);
      }
    } catch { showModal('Error', 'No se pudo seleccionar el documento.'); }
  }, [showModal]);

  const handleAgregarAdjunto = useCallback(() => {
    showModal('Adjuntar archivo', 'Elegí una opción', [
      { key: 'file', label: 'Archivo', onPress: handleSeleccionarArchivo },
      { key: 'camera', label: 'Cámara', onPress: handleTakePhoto },
      { key: 'cancel', label: 'Cancelar', onPress: () => { }, variant: 'neutral' },
    ]);
  }, [handleTakePhoto, handleSeleccionarArchivo, showModal]);

  const handleOpenArchivo = useCallback(async (archivoId: number) => {
    try {
      const url = await getArchivoUrlFirmada(archivoId);
      Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el archivo'));
    } catch { Alert.alert('Error', 'No se pudo obtener el enlace'); }
  }, [getArchivoUrlFirmada]);

  // ─── Scroll / carga de mensajes anteriores ─────────────────────────────────

  const handleMessagesScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollOffsetRef.current = y;
    if (y <= 48 && hasNextPage && !isFetchingNextPage) {
      isPrependingRef.current = true;
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleMessagesContentSizeChange = useCallback((_w: number, h: number) => {
    if (isPrependingRef.current) {
      const delta = h - prevContentHeightRef.current;
      if (delta > 0) messagesScrollRef.current?.scrollTo({ y: scrollOffsetRef.current + delta, animated: false });
      isPrependingRef.current = false;
    } else {
      messagesScrollRef.current?.scrollToEnd({ animated: false });
    }
    prevContentHeightRef.current = h;
  }, []);

  // ─── Agenda ───────────────────────────────────────────────────────────────

  const agendaNow = useMemo(
    () => ceilToNextMinute(new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agendaFechaInicio, agendaFechaFin, showAddToAgendaModal],
  );
  const agendaDateErrorMessage = useMemo(() => {
    if (agendaFechaInicio < agendaNow) return 'La fecha de inicio es menor a la actual.';
    if (agendaFechaFin <= agendaFechaInicio) return 'La fecha de fin debe ser mayor a la de inicio.';
    return null;
  }, [agendaFechaInicio, agendaFechaFin, agendaNow]);

  const ejecutarAgregarAAgenda = useCallback(() => {
    const esReunion = solicitud.tipo_actividad === 'REUNION';
    crearActividad(
      {
        titulo: solicitud.titulo,
        descripcion: solicitud.descripcion,
        fecha_inicio: agendaFechaInicio,
        fecha_fin: agendaFechaFin,
        solicitud_id: solicitudId,
        ...(esReunion ? { participantes: participantesAceptados } : {}),
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
          Alert.alert('Éxito', esReunion
            ? 'Actividad agregada a la agenda de todos los participantes'
            : 'Actividad agregada a tu agenda');
        },
      },
    );
  }, [agendaFechaInicio, agendaFechaFin, solicitud, solicitudId, crearActividad, participantesAceptados]);

  const confirmAgregarAAgenda = useCallback(() => {
    if (agendaDateErrorMessage) return;
    const esReunion = solicitud.tipo_actividad === 'REUNION';
    const participantes = esReunion
      ? [...participantesAceptados]
      : (user?.user_context_id ? [user.user_context_id] : []);
    validacion.validate(
      {
        fechaInicio: agendaFechaInicio, fechaFin: agendaFechaFin,
        participantes,
        tipo_actividad: solicitud.tipo_actividad as 'REUNION' | 'MANDATO',
        actividadIdExcluir: null,
      },
      () => ejecutarAgregarAAgenda(),
    );
  }, [agendaDateErrorMessage, solicitud, user, validacion, ejecutarAgregarAAgenda, participantesAceptados, agendaFechaInicio, agendaFechaFin]);

  // ─── Participantes ───────────────────────────────────────────────────────────

  const handleSelectParticipantes = useCallback((newSelection: UserSummary[]) => {
    const currentIds = new Set(localParticipantes.map(inv => inv.user_id));
    const newIds = new Set(newSelection.map(u => u.user_context_id));
    const toAdd = newSelection.filter(u => !currentIds.has(u.user_context_id));
    const toRemove = localParticipantes.filter(inv => !newIds.has(inv.user_id));
    const snapshot = [...localParticipantes];

    const nextList: SolicitudInvitado[] = [
      ...localParticipantes.filter(inv => newIds.has(inv.user_id)),
      ...toAdd.map(u => ({ user_id: u.user_context_id })),
    ];
    setLocalParticipantes(nextList);
    setParticipantesSelectedUsers(prev => {
      const byId = new Map(prev.map(u => [u.user_context_id, u]));
      newSelection.forEach(u => byId.set(u.user_context_id, u));
      toRemove.forEach(inv => byId.delete(inv.user_id));
      return Array.from(byId.values());
    });

    if (toAdd.length > 0) {
      actualizarInvitados(
        { solicitudId, action: 'add', invitados: toAdd.map(u => u.user_context_id) },
        { onError: () => setLocalParticipantes(snapshot) },
      );
    }
    if (toRemove.length > 0) {
      actualizarInvitados(
        { solicitudId, action: 'remove', invitados: toRemove.map(inv => inv.user_id) },
        { onError: () => setLocalParticipantes(snapshot) },
      );
    }
  }, [localParticipantes, solicitudId, actualizarInvitados]);

  const handleQuitarParticipante = useCallback((userId: number) => {
    const snapshot = [...localParticipantes];
    setLocalParticipantes(prev => prev.filter(inv => inv.user_id !== userId));
    setParticipantesSelectedUsers(prev => prev.filter(u => u.user_context_id !== userId));
    actualizarInvitados(
      { solicitudId, action: 'remove', invitados: [userId] },
      { onError: () => setLocalParticipantes(snapshot) },
    );
  }, [localParticipantes, solicitudId, actualizarInvitados]);

  const handleToggleUserParticipante = useCallback((u: UserSummary) => {
    const snapshot = [...localParticipantes];
    const isInList = localParticipantes.some(inv => inv.user_id === u.user_context_id);
    if (isInList) {
      setLocalParticipantes(prev => prev.filter(inv => inv.user_id !== u.user_context_id));
      setParticipantesSelectedUsers(prev => prev.filter(p => p.user_context_id !== u.user_context_id));
      actualizarInvitados(
        { solicitudId, action: 'remove', invitados: [u.user_context_id] },
        { onError: () => setLocalParticipantes(snapshot) },
      );
    } else {
      setLocalParticipantes(prev => [...prev, { user_id: u.user_context_id }]);
      setParticipantesSelectedUsers(prev =>
        prev.some(p => p.user_context_id === u.user_context_id) ? prev : [...prev, u]
      );
      actualizarInvitados(
        { solicitudId, action: 'add', invitados: [u.user_context_id] },
        { onError: () => setLocalParticipantes(snapshot) },
      );
    }
  }, [localParticipantes, solicitudId, actualizarInvitados]);

  const handleSelectAllParticipantes = useCallback((users: UserSummary[]) => {
    const byId = new Map(participantesSelectedUsers.map(u => [u.user_context_id, u]));
    users.forEach(u => { if (!byId.has(u.user_context_id)) byId.set(u.user_context_id, u); });
    handleSelectParticipantes(Array.from(byId.values()));
  }, [participantesSelectedUsers, handleSelectParticipantes]);

  const handleDeselectAllParticipantes = useCallback((users: UserSummary[]) => {
    const idsToRemove = new Set(users.map(u => u.user_context_id));
    handleSelectParticipantes(participantesSelectedUsers.filter(u => !idsToRemove.has(u.user_context_id)));
  }, [participantesSelectedUsers, handleSelectParticipantes]);

  // ─── Compartir ────────────────────────────────────────────────────────────

  const ejecutarCompartir = useCallback(() => {
    const payload: ReenviarSolicitudRequest = {
      solicitudId,
      nuevosInvitadosIds: selectedUsersToShare.map(u => u.user_context_id),
    };
    reenviarSolicitud(payload, {
      onSuccess: () => { setShowShareModal(false); Alert.alert('Éxito', 'Solicitud reenviada'); },
      onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Intenta nuevamente'),
    });
  }, [solicitudId, selectedUsersToShare, reenviarSolicitud]);

  const confirmCompartir = useCallback(() => {
    if (selectedUsersToShare.length === 0) { Alert.alert('Error', 'Selecciona al menos un usuario'); return; }
    if (hasDates) {
      validacion.validate(
        {
          fechaInicio: solicitud.fecha_inicio!,
          fechaFin: solicitud.fecha_fin!,
          participantes: selectedUsersToShare.map(u => u.user_context_id),
          tipo_actividad: solicitud.tipo_actividad as 'REUNION' | 'MANDATO',
          solicitudIdExcluir: solicitudId,
        },
        () => ejecutarCompartir(),
      );
    } else {
      ejecutarCompartir();
    }
  }, [selectedUsersToShare, hasDates, solicitud, solicitudId, validacion, ejecutarCompartir]);

  const handleToggleUserShare = useCallback((u: UserSummary) => {
    setSelectedUsersToShare(prev => {
      const isSelected = prev.some(p => p.user_context_id === u.user_context_id);
      return isSelected ? prev.filter(p => p.user_context_id !== u.user_context_id) : [...prev, u];
    });
  }, []);

  const handleSelectAllRoleUsers = useCallback((users: UserSummary[]) => {
    setSelectedUsersToShare(prev => {
      const ids = new Set(prev.map(u => u.user_context_id));
      return [...prev, ...users.filter(u => !ids.has(u.user_context_id))];
    });
  }, []);

  const handleDeselectAllRoleUsers = useCallback((users: UserSummary[]) => {
    const ids = new Set(users.map(u => u.user_context_id));
    setSelectedUsersToShare(prev => prev.filter(u => !ids.has(u.user_context_id)));
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardContainer}>
          <View style={styles.container}>

            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="chevron-down" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {/* Participantes */}
              <View style={styles.contentBlock}>
                <ThemedText style={[styles.label, { marginTop: 4 }]}>
                  Participantes: {participantesTexto}
                </ThemedText>
              </View>

              {/* Título */}
              <View style={styles.contentBlock}>
                <ThemedText style={styles.label}>Asunto</ThemedText>
                <ThemedText style={styles.sectionValue}>{solicitud.titulo}</ThemedText>
                <View style={styles.badgeRow}>
                  <View style={styles.chip}>
                    <ThemedText style={styles.chipText}>
                      {formatTipoActividad(solicitud.tipo_actividad)}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Participantes */}
              {isHost && (
                <View style={styles.participantesSection}>
                  <View style={styles.sectionHeaderRow}>
                    <ThemedText style={styles.label}>Participantes</ThemedText>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setShowParticipantesSelector(p => !p)}
                    >
                      <Ionicons name="add" size={16} color={colors.tint} />
                      <ThemedText style={styles.actionButtonText}>Agregar</ThemedText>
                    </TouchableOpacity>
                  </View>

                  {showParticipantesSelector && (
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
                  )}

                  {displayParticipantes.length === 0 ? (
                    <ThemedText style={{ color: colors.secondaryText, fontSize: 14 }}>Sin participantes</ThemedText>
                  ) : (
                    <>
                      {(participantesExpanded ? displayParticipantes : displayParticipantes.slice(0, 2)).map((inv, idx) => (
                        <View key={`${inv.user_id ?? idx}-${idx}`} style={styles.inviteRow}>
                          <View style={styles.participanteAvatar}>
                            <ThemedText style={styles.participanteAvatarText}>
                              {getParticipanteDisplayName(inv).charAt(0).toUpperCase()}
                            </ThemedText>
                          </View>
                          <ThemedText style={[styles.inviteName, { flex: 1 }]}>
                            {getParticipanteDisplayName(inv)}
                          </ThemedText>
                          <TouchableOpacity onPress={() => handleQuitarParticipante(inv.user_id)}>
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {displayParticipantes.length > 2 && (
                        <TouchableOpacity
                          onPress={() => setParticipantesExpanded(p => !p)}
                          style={styles.collapsibleToggle}
                        >
                          <ThemedText style={styles.collapsibleToggleText}>
                            {participantesExpanded
                              ? 'Ver menos'
                              : `+${displayParticipantes.length - 2} más`}
                          </ThemedText>
                          <Ionicons
                            name={participantesExpanded ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={colors.tint}
                          />
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              )}

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
                      {puedeAgregarAAgenda && (
                        <TouchableOpacity style={styles.agendaVerdeBtn} onPress={() => {
                          if (solicitud.fecha_inicio && solicitud.fecha_fin) {
                            setAgendaFechaInicio(new Date(solicitud.fecha_inicio));
                            setAgendaFechaFin(new Date(solicitud.fecha_fin));
                          }
                          setShowAddToAgendaModal(true);
                        }} disabled={isCreatingActividad}>
                          <Ionicons name="calendar" size={16} color="#fff" />
                          <ThemedText style={styles.agendaVerdeBtnText}>Agregar a agenda</ThemedText>
                        </TouchableOpacity>
                      )}
                      {puedeMandatoSinFechas && (
                        <TouchableOpacity
                          style={[styles.agendaVerdeBtn, styles.agendaVerdeBtnSecondary]}
                          onPress={handleCrearObjetivoDesdeSolicitud}
                          disabled={isCreatingObjetivo}
                        >
                          <Ionicons name="flag" size={16} color={colors.success} />
                          <ThemedText style={[styles.agendaVerdeBtnText, { color: colors.success }]}>
                            Crear objetivo
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Mensajes */}
              <View style={styles.messagesCard}>
                <View style={styles.sectionHeaderRow}>
                  <ThemedText style={styles.label}>Mensajes</ThemedText>
                  <TouchableOpacity onPress={() => setShowFullBitacora(p => !p)}>
                    <Text style={styles.sectionActionText}>
                      {showFullBitacora ? 'Ocultar información completa' : 'Mostrar información completa'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.bitacoraContainer}>
                  {isLoadingBitacora ? (
                    <ActivityIndicator size="small" color={colors.lightTint} style={{ marginTop: 20 }} />
                  ) : mensajes.length > 0 ? (
                    <ScrollView
                      ref={messagesScrollRef}
                      style={styles.messagesList}
                      contentContainerStyle={styles.messagesListContent}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled
                      scrollEventThrottle={16}
                      onScroll={handleMessagesScroll}
                      onContentSizeChange={handleMessagesContentSizeChange}
                      onLayout={() => messagesScrollRef.current?.scrollToEnd({ animated: false })}
                    >
                      {isFetchingNextPage && (
                        <View style={styles.loadingMoreContainer}>
                          <ActivityIndicator size="small" color={colors.lightTint} />
                        </View>
                      )}
                      {mensajes.map((b: any) => {
                        const isOwn = b.usuario_id !== null && b.usuario_id === user?.user_context_id;
                        const isDescripcion = b.id === 'descripcion';
                        const isSystem = b.isSystem === true;
                        const estadoKey = b.estado in estadoInvitacionMapping ? b.estado as EstadoInvitacionDB : null;
                        const hideTitle = isDescripcion || isSystem || (
                          MODIFIED_STATES.includes(b.estado) && b.estado !== 'ACCEPTED' && b.estado !== 'ACCEPTED_BY_HOST'
                        );
                        const fechaInicioMsg = b.fecha_inicio_nueva ?? (isDescripcion ? solicitud.fecha_inicio : null);
                        const fechaFinMsg = b.fecha_fin_nueva ?? (isDescripcion ? solicitud.fecha_fin : null);
                        const archivos = Array.isArray(b.archivos) ? b.archivos : [];

                        if (isSystem) return (
                          <View key={String(b.id)} style={styles.systemMessageContainer}>
                            <View style={styles.systemMessageBubble}>
                              <ThemedText style={styles.systemMessageText}>{b.observacion}</ThemedText>
                            </View>
                          </View>
                        );

                        return (
                          <View key={String(b.id)} style={[styles.bitacoraItem, isOwn ? styles.bitacoraItemOwn : styles.bitacoraItemOther]}>
                            <View style={styles.bitacoraCard}>
                              <View style={styles.bitacoraHeader}>
                                <ThemedText style={styles.bitacoraUser}>{b.usuario_nombre} {b.usuario_apellido}</ThemedText>
                                <ThemedText style={styles.bitacoraDate}>
                                  {formatDateDDMMYYYY(new Date(b.created_at))} {formatTimeHHMM(new Date(b.created_at))}
                                </ThemedText>
                              </View>
                              <View style={styles.bitacoraBody}>
                                {!hideTitle && estadoKey && (
                                  <ThemedText style={styles.bitacoraAction}>
                                    {estadoInvitacionMapping[estadoKey]}
                                  </ThemedText>
                                )}
                                {b.observacion && (
                                  <View style={styles.bitacoraBubble}>
                                    <ThemedText style={styles.bitacoraText}>{b.observacion}</ThemedText>
                                  </View>
                                )}
                                {archivos.length > 0 && (
                                  <View style={styles.messageAttachments}>
                                    {archivos.map((a: any) => (
                                      <Pressable key={`archivo-${a.id}`} style={styles.messageAttachmentRow} onPress={() => handleOpenArchivo(a.id)}>
                                        <Ionicons name="document-outline" size={16} color={colors.secondaryText} />
                                        <ThemedText style={[styles.messageAttachmentName, styles.linkText]} numberOfLines={1}>{a.nombre}</ThemedText>
                                      </Pressable>
                                    ))}
                                  </View>
                                )}
                                {fechaInicioMsg && fechaFinMsg && (
                                  <View style={styles.changeBubble}>
                                    <ThemedText style={styles.changeText}>
                                      {b.fecha_inicio_nueva ? 'Propuso cambio:' : 'Fechas:'}
                                    </ThemedText>
                                    <ThemedText style={styles.changeText}>
                                      Inicio: {formatDateDDMMYYYY(new Date(fechaInicioMsg))} {formatTimeHHMM(new Date(fechaInicioMsg))}
                                    </ThemedText>
                                    <ThemedText style={styles.changeText}>
                                      Fin: {formatDateDDMMYYYY(new Date(fechaFinMsg))} {formatTimeHHMM(new Date(fechaFinMsg))}
                                    </ThemedText>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <ThemedText style={{ color: colors.secondaryText, textAlign: 'center', marginTop: 20 }}>
                      {showFullBitacora ? 'No hay actividad reciente' : 'No hay cambios relevantes'}
                    </ThemedText>
                  )}
                </View>

                {/* Composer */}
                <View style={styles.messageComposer}>
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
                    style={styles.messageComposerInput}
                    placeholder={isModifyMode ? 'Observación (opcional)' : 'Escribir mensaje'}
                    placeholderTextColor={colors.secondaryText}
                    value={messageDraft}
                    onChangeText={setMessageDraft}
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
                            <Ionicons name="calendar-outline" size={20} color={isModifyMode ? colors.background : colors.lightTint} />
                          </TouchableOpacity>
                        )}

                        {/* Adjuntar */}
                        <TouchableOpacity style={styles.messageActionButton} onPress={handleAgregarAdjunto}>
                          <Ionicons name="add-outline" size={20} color={colors.lightTint} />
                        </TouchableOpacity>

                        {/* Compartir (solo host) */}
                        {puedeCompartir && (
                          <TouchableOpacity style={styles.messageActionButton} onPress={() => {
                            setSelectedUsersToShare([]);
                            setSearchQuery('');
                            setActiveRole('');
                            setShowShareModal(true);
                          }}>
                            <Ionicons name="person-add-outline" size={20} color={colors.lightTint} />
                          </TouchableOpacity>
                        )}

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
                            ? <ActivityIndicator size="small" color={colors.background} />
                            : <Ionicons name="send" size={20} color={colors.background} />}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </View>
            </ScrollView>

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
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardContainer}>
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
                            <ThemedText style={{ color: colors.error }}>Cancelar</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={isAceptarModificacionesFlow ? confirmAceptarModificaciones : confirmAceptar}
                            style={styles.modalBtnConfirm}
                            disabled={isUpdatingEstado}
                          >
                            {isUpdatingEstado
                              ? <ActivityIndicator color={colors.background} />
                              : <ThemedText style={{ color: colors.background }}>Aceptar</ThemedText>}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </KeyboardAvoidingView>
            </Modal>

            {/* Modal Rechazar */}
            <Modal visible={showRejectModal} transparent animationType="fade">
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardContainer}>
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
                            <ThemedText style={{ color: colors.error }}>Cancelar</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={confirmRechazar}
                            style={[styles.modalBtnConfirm, { backgroundColor: colors.error }]}
                            disabled={isUpdatingEstado}
                          >
                            {isUpdatingEstado
                              ? <ActivityIndicator color={colors.background} />
                              : <ThemedText style={{ color: colors.background }}>Rechazar</ThemedText>}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </KeyboardAvoidingView>
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
                          users={searchResults ?? []}
                          onSearch={setSearchQuery}
                          isLoadingUsers={isLoadingUsers}
                          roles={rolesForSelector}
                          onSelectRole={role => { setActiveRole(role); setShowRoleModal(true); }}
                        />
                        <View style={styles.modalActions}>
                          <TouchableOpacity onPress={() => setShowShareModal(false)} style={styles.modalBtnCancel}>
                            <ThemedText style={{ color: colors.error }}>Cancelar</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={confirmCompartir} style={styles.modalBtnConfirm}>
                            {isSharing
                              ? <ActivityIndicator color={colors.background} />
                              : <ThemedText style={{ color: colors.background }}>Compartir</ThemedText>}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </KeyboardAvoidingView>
            </Modal>

            {/* Modal Selección por Rol */}
            <RoleUserSelectionModal
              visible={showRoleModal}
              onClose={() => { setShowRoleModal(false); setActiveRole(''); }}
              roleName={activeRole}
              roleUsers={roleUsersData ?? []}
              selectedUsers={selectedUsersToShare}
              onToggleUser={handleToggleUserShare}
              onSelectAll={handleSelectAllRoleUsers}
              onDeselectAll={handleDeselectAllRoleUsers}
            />

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
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
                              : <ThemedText style={{ color: colors.background }}>Agregar</ThemedText>}
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
              </KeyboardAvoidingView>
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
              onClose={() => setAlertModal(p => ({ ...p, visible: false }))}
            />

            <OperacionPendienteModal visible={isMutating} />
          </View>
        </KeyboardAvoidingView>
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
    width: '100%',
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },
  contentBlock: {
    gap: 6,
  },
  messagesCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.neutralBorder,
  },
  badgeRow: {
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lightTint,
    backgroundColor: colors.lightTint + '12',
  },
  chipText: {
    fontSize: 12,
    color: colors.lightTint,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  agendaVerdeBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.success,
  },
  agendaVerdeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionActionText: {
    fontSize: 12,
    color: colors.lightTint,
    fontWeight: '600',
  },
  bitacoraContainer: {
    paddingTop: 10,
  },
  messagesList: {
    flexGrow: 1,
    maxHeight: 320,
  },
  messagesListContent: {
    paddingTop: 4,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  loadingMoreContainer: {
    paddingVertical: 8,
    alignItems: 'center',
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
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  systemMessageBubble: {
    backgroundColor: colors.neutralSurface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.neutralBorder,
  },
  systemMessageText: {
    fontSize: 13,
    color: colors.neutralText,
    textAlign: 'center',
  },
  messageAttachments: {
    marginTop: 8,
    gap: 6,
  },
  messageAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageAttachmentName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  messageComposer: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutralBorder,
    backgroundColor: colors.componentBackground,
    overflow: 'hidden',
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
    backgroundColor: colors.background,
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
  messageComposerAttachments: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  messageComposerAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  messageComposerAttachmentName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginRight: 8,
  },
  messageComposerAttachmentAction: {
    padding: 4,
  },
  messageComposerInput: {
    minHeight: 70,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    fontSize: 14,
    color: colors.text,
  },
  messageActionsRow: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
  },
  messageActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  messageActionButtonActive: {
    backgroundColor: colors.lightTint,
  },
  messageActionButtonPrimary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightTint,
  },
  messageActionButtonDisabled: {
    opacity: 0.5,
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
  dateBtn: {
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
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
  sectionValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  participantesSection: {
    gap: 8,
  },
  selectorCard: {
    marginTop: 4,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutralBorder,
    backgroundColor: colors.background,
  },
  participanteAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lightTint + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  participanteAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.lightTint,
  },
  collapsibleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  collapsibleToggleText: {
    fontSize: 13,
    color: colors.tint,
    fontWeight: '600',
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
  inviteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  linkText: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
});