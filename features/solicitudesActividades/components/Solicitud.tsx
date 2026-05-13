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
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { RoleUserSelectionModal } from './RoleUserSelectionModal';
import { ValidacionFechasModal } from './ValidacionFechasModal';

const colors = Colors['light'];

let ImagePicker: typeof ImagePickerTypes | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  console.warn('expo-image-picker native module not available. Image picking will be disabled.');
}

const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

// Estados que deben mostrarse en la vista de mensajes filtrada
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

interface SolicitudProps {
  solicitudId?: number;
  type?: 'enviada' | 'recibida';
  visible?: boolean;
  onClose?: () => void;
}

export function Solicitud({ solicitudId: solicitudIdProp, type: typeProp, visible, onClose }: SolicitudProps = {}) {
  const router = useRouter();
  const { id, type: typeParam } = useLocalSearchParams<{ id?: string; type?: string }>();
  const { user } = useAuth();
  const { hasRole } = useRoleCheck();

  const resolvedType = typeProp ?? (typeParam === 'enviada' ? 'enviada' : 'recibida');
  const solicitudId = solicitudIdProp ?? (id ? parseInt(id, 10) : 0);
  const modalVisible = visible ?? true;
  const handleClose = onClose ?? (() => router.back());

  const { data: bitacora, isLoading: isLoadingBitacora } = useSolicitudBitacora(solicitudId);
  const { mutate: actualizarEstado, isPending: isUpdatingEstado } = useActualizarEstadoInvitacion();
  const { mutate: cancelarSolicitud, isPending: isCancellingSolicitud } = useCancelarSolicitud();
  const { mutate: reenviarSolicitud, isPending: isSharing } = useReenviarSolicitud();
  const { mutate: crearActividad, isPending: isCreatingActividad } = useCrearActividad();
  const { mutateAsync: crearObjetivo, isPending: isCreatingObjetivo } = useCreateObjetivo();
  const { mutateAsync: uploadArchivo } = useUploadArchivo();
  const validacion = useValidacionFechas();

  const { data: enviadas } = useSolicitudesCreadas();
  const { data: recibidas } = useInvitaciones();

  const seenAutoMarkKeyRef = useRef<string | null>(null);
  const messagesScrollRef = useRef<ScrollView | null>(null);

  // Estados para modales
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  // Modal de modificar ahora es solo el date picker inline
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [isModifyModalMinimized, setIsModifyModalMinimized] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddToAgendaModal, setShowAddToAgendaModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFullBitacora, setShowFullBitacora] = useState(false);
  const [acceptObservation, setAcceptObservation] = useState('');
  const [rejectObservation, setRejectObservation] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [pickedFiles, setPickedFiles] = useState<any[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    actions: AlertModalAction[];
  }>({ visible: false, title: '', message: undefined, actions: [] });

  const isMutating = isUpdatingEstado || isCancellingSolicitud || isSharing || isCreatingActividad || isCreatingObjetivo || isSendingMessage;

  const showModal = useCallback((title: string, message?: string, actions?: AlertModalAction[]) => {
    const normalizedActions: AlertModalAction[] = actions && actions.length > 0
      ? actions
      : [{ key: 'ok', label: 'Aceptar', onPress: () => { }, variant: 'primary' }];

    setAlertModal({
      visible: true,
      title,
      message,
      actions: normalizedActions.map((action) => ({
        ...action,
        onPress: () => {
          setAlertModal((prev) => ({ ...prev, visible: false }));
          action.onPress();
        },
      })),
    });
  }, []);

  // Estados para el modal "Agregar a la agenda"
  const [agendaFechaInicio, setAgendaFechaInicio] = useState<Date>(new Date());
  const [agendaFechaFin, setAgendaFechaFin] = useState<Date>(new Date(Date.now() + 3600000));
  const [showAgendaDatePicker, setShowAgendaDatePicker] = useState<{ show: boolean, mode: 'date' | 'time', target: 'start' | 'end' }>({ show: false, mode: 'date', target: 'start' });

  // Estado para modificación — las fechas de modificación se muestran inline en el mensaje
  const [modStartDate, setModStartDate] = useState<Date | null>(null);
  const [modEndDate, setModEndDate] = useState<Date | null>(null);
  // showDatePicker ahora se usa para el picker inline en el composer
  const [showDatePicker, setShowDatePicker] = useState<{ show: boolean, mode: 'date' | 'time', target: 'start' | 'end' }>({ show: false, mode: 'date', target: 'start' });
  const [backendSolicitudRangos, setBackendSolicitudRangos] = useState<RangoOcupado[]>([]);
  const [backendActividadRangos, setBackendActividadRangos] = useState<RangoOcupado[]>([]);
  const [pendingModificarPayload, setPendingModificarPayload] = useState<{
    fecha_inicio_nueva?: Date | null;
    fecha_fin_nueva?: Date | null;
    observacion?: string | null;
  } | null>(null);

  // Controla si el modo "modificar con fechas" está activo en el composer
  const [isModifyMode, setIsModifyMode] = useState(false);

  // Estado para compartir
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsersToShare, setSelectedUsersToShare] = useState<UserSummary[]>([]);
  const { data: searchResults, isLoading: isSearchingUsers } = useSearchUsers(searchQuery);

  // Role Selection Logic (para compartir)
  const [activeRole, setActiveRole] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { data: roleUsersData, isLoading: isLoadingRole } = useGetUserByRole(activeRole);
  const { getArchivoUrlFirmada } = useGetArchivoUrlFirmada();

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
    const data = resolvedType === 'enviada' ? enviadas : recibidas;
    return data?.find(s => s.solicitud_id === solicitudId);
  }, [resolvedType, enviadas, recibidas, solicitudId]);

  const openCrearActividadModal = useCallback(() => {
    if (solicitud?.fecha_inicio && solicitud?.fecha_fin) {
      setAgendaFechaInicio(new Date(solicitud.fecha_inicio));
      setAgendaFechaFin(new Date(solicitud.fecha_fin));
    }
    setShowAddToAgendaModal(true);
  }, [solicitud]);

  // Para REUNION: obtener todos los invitados de esta solicitud (desde enviadas)
  const todosInvitados = useMemo(() => {
    const data = resolvedType === 'enviada' ? enviadas : recibidas;
    return data?.filter(s => s.solicitud_id === solicitudId) ?? [];
  }, [resolvedType, enviadas, recibidas, solicitudId]);

  const participantesTexto = useMemo(() => {
    const nombres: string[] = [];
    const creador = [solicitud?.nombre_creador, solicitud?.apellido_creador]
      .filter(Boolean).join(' ').trim();
    if (creador) nombres.push(creador);

    const invitados = todosInvitados
      .map((inv) => [inv.invitado_nombre, inv.invitado_apellido].filter(Boolean).join(' ').trim())
      .filter(Boolean);

    const unicos = Array.from(new Set([...nombres, ...invitados]));
    if (unicos.length === 0) return 'Sin participantes';
    if (unicos.length <= 3) return unicos.join(', ');
    const visibles = unicos.slice(0, 3).join(', ');
    return `${visibles} +${unicos.length - 3} personas`;
  }, [solicitud, todosInvitados]);

  const paraEnviada = useMemo(() => {
    const nombres = todosInvitados
      .map((inv) => [inv.invitado_nombre, inv.invitado_apellido].filter(Boolean).join(' ').trim())
      .filter(Boolean);
    return Array.from(new Set(nombres)).join(', ');
  }, [todosInvitados]);

  // IDs de participantes aceptados (para REUNION "agregar a la agenda")
  const participantesAceptados = useMemo(() => {
    const ids: number[] = [];
    if (solicitud?.created_by) ids.push(solicitud.created_by);
    return [...new Set(ids)];
  }, [solicitud, todosInvitados]);

  // Todos los IDs de participantes de la solicitud (para crear objetivo con todos)
  const todosParticipantesIds = useMemo(() => {
    const ids: number[] = [];
    if (solicitud?.created_by) ids.push(solicitud.created_by);
    todosInvitados.forEach(inv => {
      // Si el modelo tiene invitado_id úsalo; fallback al usuario actual si es recibida propia
      if ((inv as any).invitado_id) ids.push((inv as any).invitado_id);
    });
    if (user?.user_context_id && !ids.includes(user.user_context_id)) {
      ids.push(user.user_context_id);
    }
    return [...new Set(ids)];
  }, [solicitud, todosInvitados, user]);

  // Todos los archivos de la solicitud y su bitácora
  const todosArchivos = useMemo(() => {
    const archivosBase: any[] = solicitud?.archivos ?? [];
    const archivossBitacora: any[] = (bitacora ?? []).flatMap((b: any) => b.archivos ?? []);
    const map = new Map<number, any>();
    [...archivosBase, ...archivossBitacora].forEach(a => { if (a?.id) map.set(a.id, a); });
    return Array.from(map.values());
  }, [solicitud, bitacora]);

  const puedeAgregarAAgenda = useMemo(() => {
    if (!solicitud) return false;
    if (solicitud.estado === 'ACTIVIDAD_CREADA') return false;
    const esReunion = solicitud.tipo_actividad === 'REUNION';
    const esMandato = solicitud.tipo_actividad === 'MANDATO';

    if (esReunion) {
      const algunAceptado = todosInvitados.some(inv => inv.estado === 'ACCEPTED');
      return resolvedType === 'enviada' && algunAceptado;
    }
    if (esMandato) {
      return resolvedType === 'recibida' && solicitud.estado === 'ACCEPTED';
    }
    return resolvedType === 'recibida' && solicitud.estado === 'ACCEPTED';
  }, [solicitud, resolvedType, todosInvitados]);

  // Para MANDATO aceptado sin fechas: mostrar botones de agenda y objetivo
  const puedeMandatoSinFechas = useMemo(() => {
    if (!solicitud) return false;
    if (solicitud.tipo_actividad !== 'MANDATO') return false;
    if (solicitud.estado !== 'ACCEPTED') return false;
    const tieneFechas = !!(solicitud.fecha_inicio && solicitud.fecha_fin);
    return !tieneFechas;
  }, [solicitud, resolvedType]);

  const esActividadCreada = solicitud?.estado === 'ACTIVIDAD_CREADA';

  const resetModifyDraft = useCallback(() => {
    setShowDatePicker({ show: false, mode: 'date', target: 'start' });
    setModStartDate(null);
    setModEndDate(null);
    setIsModifyMode(false);
    setShowModifyModal(false);
    setIsModifyModalMinimized(false);
  }, []);

  const minimizeModifyModal = useCallback(() => {
    setShowDatePicker(prev => ({ ...prev, show: false }));
    setShowModifyModal(false);
    setIsModifyModalMinimized(true);
  }, []);

  function formatTipoActividad(tipo?: string): string {
    if (tipo === 'MANDATO') return 'Actividad';
    if (tipo === 'REUNION') return 'Reunión';
    if (tipo === 'CHAT') return 'Conversación';

    return tipo ?? 'Solicitud';
  }

  const restoreModifyModal = useCallback(() => {
    setShowModifyModal(true);
    setIsModifyModalMinimized(false);
  }, []);

  // Marcar como visto — corregido para MODIFIED y MODIFIED_BY_HOST según perspectiva
  useEffect(() => {
    if (!solicitud) return;

    let shouldMarkSeen = false;

    if (resolvedType === 'recibida') {
      // El invitado ve: SENT (nuevo), MODIFIED_BY_HOST (el host modificó), ACCEPTED_BY_HOST (el host aceptó sus cambios)
      shouldMarkSeen = ['SENT', 'MODIFIED_BY_HOST', 'ACCEPTED_BY_HOST'].includes(solicitud.estado);
    } else if (resolvedType === 'enviada') {
      // El creador ve: MODIFIED (el invitado modificó)
      shouldMarkSeen = solicitud.estado === 'MODIFIED';
    }

    if (!shouldMarkSeen) {
      seenAutoMarkKeyRef.current = null;
      return;
    }

    const attemptKey = `${resolvedType}:${solicitud.solicitud_id}:${solicitud.estado}`;
    if (seenAutoMarkKeyRef.current === attemptKey) return;

    seenAutoMarkKeyRef.current = attemptKey;

    actualizarEstado(
      { solicitud_id: solicitud.solicitud_id, estado: 'SEEN' as EstadoInvitacionDB },
      { onError: () => { seenAutoMarkKeyRef.current = null; } }
    );
  }, [resolvedType, solicitud, actualizarEstado]);

  const handleAceptarPress = useCallback(() => {
    setAcceptObservation('');
    setShowAcceptModal(true);
  }, []);

  const closeAcceptModal = useCallback(() => {
    setShowAcceptModal(false);
    setAcceptObservation('');
  }, []);

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

  // Activar modo modificar: muestra las fechas inline en el composer
  const handleModificarPress = useCallback(() => {
    if (!solicitud) return;
    if (!isModifyMode) {
      setModStartDate(null);
      setModEndDate(null);
    }
    setIsModifyMode(true);
  }, [solicitud, isModifyMode]);

  const addImageAsset = useCallback((asset: ImagePickerTypes.ImagePickerAsset) => {
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const name = asset.fileName ?? `foto_${Date.now()}.${ext}`;
    const type = asset.mimeType ?? `image/${ext}`;
    setPickedFiles((prev) => [...prev, { name, uri: asset.uri, type, size: asset.fileSize }]);
  }, []);

  const handleTakePhoto = useCallback(async () => {
    if (!ImagePicker) {
      showModal('No disponible', 'La cámara no está disponible. Reconstruí la app con el módulo nativo.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showModal('Permiso denegado', 'Se necesita acceso a la cámara para tomar fotos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) addImageAsset(result.assets[0]);
  }, [addImageAsset, showModal]);

  const handleSeleccionarArchivo = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true, type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const nuevosArchivos = result.assets.map((asset) => ({
          name: asset.name, uri: asset.uri, type: asset.mimeType ?? 'application/octet-stream', size: asset.size,
        }));
        setPickedFiles((prev) => [...prev, ...nuevosArchivos]);
      }
    } catch (err) {
      console.error('Error seleccionando documento', err);
      showModal('Error', 'No se pudo seleccionar el documento. Intenta nuevamente.');
    }
  }, [showModal]);

  const handleAgregarAdjunto = useCallback(() => {
    showModal('Adjuntar archivo', 'Elegí una opción', [
      { key: 'file', label: 'Archivo', onPress: handleSeleccionarArchivo },
      { key: 'camera', label: 'Cámara', onPress: handleTakePhoto },
      { key: 'cancel', label: 'Cancelar', onPress: () => { }, variant: 'neutral' },
    ]);
  }, [handleTakePhoto, handleSeleccionarArchivo, showModal]);

  const isSuccess = <T,>(r: ApiOperationResult<T>): r is ApiOperationResult<T> & { data: T } =>
    r.status === 'success' && r.data !== undefined;

  // Construir invitados para objetivo — incluye TODOS los participantes de la solicitud
  const buildObjetivoInvitadosTodos = useCallback((): Invitado[] => {
    const invitados: Invitado[] = [];
    todosParticipantesIds.forEach((uid) => {
      invitados.push({
        user_id: uid,
        rol: uid === user?.user_context_id ? 'ASSIGNEE' : 'VISUALIZER',
      });
    });
    return invitados;
  }, [todosParticipantesIds, user]);

  const buildObjetivoInvitados = useCallback((): Invitado[] => {
    const invitados: Invitado[] = [];
    if (user?.user_context_id) invitados.push({ user_id: user.user_context_id, rol: 'ASSIGNEE' });
    if (solicitud?.created_by && solicitud.created_by !== user?.user_context_id) {
      invitados.push({ user_id: solicitud.created_by, rol: 'VISUALIZER' });
    }
    return invitados;
  }, [solicitud, user]);

  const handleCrearObjetivoDesdeSolicitud = useCallback(async () => {
    if (!solicitud) return;
    let archivosIds: number[] = [];

    // Subir archivos adjuntos del composer si hay
    if (pickedFiles.length > 0) {
      try {
        const response = await uploadArchivo({
          item: pickedFiles.map((file) => ({
            archivo: { uri: file.uri, name: file.name, type: file.type, size: file.size },
            archivoData: { nombre: file.name, tamaño: file.size, tipo: file.type, uso: ArchivoUso.TAREA },
          })),
        });
        const validos = (response?.exitosos ?? []).filter(isSuccess);
        archivosIds = validos.map((r) => r.data.id);
        if (validos.length === 0) showModal('Error de archivos', 'No se pudo subir ningún archivo. Se continuará sin adjuntos.');
        else if ((response?.fallidos ?? []).length > 0) showModal('Archivos parciales', `Se subieron ${validos.length} de ${pickedFiles.length}`);
      } catch {
        showModal('Error de archivos', 'No se pudieron subir los archivos. Se continuará sin adjuntos.');
      }
    }

    // Añadir IDs de archivos existentes de la solicitud y bitácora
    const archivosExistentesIds = todosArchivos.map((a: any) => a.id).filter(Boolean);
    const todosArchivosIds = [...new Set([...archivosExistentesIds, ...archivosIds])];

    const invitados = buildObjetivoInvitadosTodos();
    const payload: CreateObjetivo = {
      titulo: solicitud.titulo,
      descripcion: solicitud.descripcion ?? '',
      estado: 'PENDIENTE',
      solicitud_id: solicitud.solicitud_id,
      ...(invitados.length > 0 ? { invitados } : {}),
      ...(todosArchivosIds.length > 0 ? { archivosIds: todosArchivosIds } : {}),
    };

    try {
      await crearObjetivo(payload);
      showModal('Éxito', 'Objetivo creado');
    } catch (error) {
      showModal('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
    }
  }, [solicitud, pickedFiles, uploadArchivo, buildObjetivoInvitadosTodos, crearObjetivo, showModal, todosArchivos]);

  const confirmAceptar = useCallback(() => {
    actualizarEstado(
      {
        solicitud_id: solicitudId,
        estado: 'ACCEPTED' as EstadoInvitacionDB,
        observacion: acceptObservation.trim() || null,
      },
      {
        onSuccess: () => {
          closeAcceptModal();
          setMessageDraft('');
          if (!solicitud || solicitud.tipo_actividad === 'CHAT' || (resolvedType === 'recibida' && solicitud.tipo_actividad === 'REUNION')) {
            showModal('Éxito', 'Solicitud aceptada');
            return;
          }
          const hasDatesCurrent = !!(solicitud.fecha_inicio && solicitud.fecha_fin);
          if (hasDatesCurrent) {
            showModal('Solicitud aceptada', '¿Querés crear la actividad ahora?', [
              { key: 'create-activity', label: 'Crear actividad', onPress: () => openCrearActividadModal() },
              { key: 'later', label: 'Ahora no', onPress: () => { } },
            ]);
            return;
          }
          if (solicitud.tipo_actividad === 'MANDATO') {
            showModal('Solicitud aceptada', '¿Querés crear una actividad u objetivo?', [
              { key: 'create-activity', label: 'Crear actividad', onPress: () => openCrearActividadModal() },
              { key: 'create-objetivo', label: 'Crear objetivo', onPress: () => handleCrearObjetivoDesdeSolicitud() },
              { key: 'later', label: 'Ahora no', onPress: () => { } },
            ]);
            return;
          }
          showModal('Éxito', 'Solicitud aceptada');
        },
        onError: (error) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
        },
      }
    );
  }, [solicitudId, actualizarEstado, acceptObservation, closeAcceptModal, solicitud, showModal, openCrearActividadModal, handleCrearObjetivoDesdeSolicitud]);

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
          showModal('Éxito', 'Modificaciones aceptadas');
        },
        onError: (error) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
        },
      }
    );
  }, [solicitudId, actualizarEstado, acceptObservation, closeAcceptModal, showModal]);

  const ejecutarModificar = useCallback((crearDeTodosModos: number = 0) => {
    const payload = {
      fecha_inicio_nueva: modStartDate,
      fecha_fin_nueva: modEndDate,
      observacion: messageDraft.trim() || null,
    };

    setPendingModificarPayload(payload);
    actualizarEstado({
      solicitud_id: solicitudId,
      estado: resolvedType === 'enviada' ? 'MODIFIED_BY_HOST' : 'MODIFIED',
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
        setMessageDraft('');
        Alert.alert('Éxito', 'Solicitud modificada');
      },
      onError: (error) => {
        Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
      }
    });
  }, [solicitudId, modStartDate, modEndDate, messageDraft, actualizarEstado, resolvedType, resetModifyDraft]);

  const forceModificarSolicitud = useCallback(() => {
    if (!pendingModificarPayload) return;
    ejecutarModificar(1);
    setBackendSolicitudRangos([]);
  }, [pendingModificarPayload, ejecutarModificar]);

  const hasDateChanges = useMemo(() => {
    return !!(modStartDate && modEndDate);
  }, [modStartDate, modEndDate]);

  const modNowThreshold = useMemo(
    () => ceilToNextMinute(new Date()),
    [modStartDate, modEndDate, isModifyMode]
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
    () => !modDateErrorMessage && (hasDateChanges || messageDraft.trim().length > 0),
    [modDateErrorMessage, hasDateChanges, messageDraft]
  );

  const confirmModificar = useCallback(() => {
    if (!canSubmitModificar) return;

    if (!hasDateChanges) {
      ejecutarModificar();
      return;
    }

    const participantes: number[] = [solicitud?.created_by ?? 0].filter(id => id > 0);
    if (user?.user_context_id) participantes.push(user.user_context_id);
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

  const onDateCancel = () => {
    setShowDatePicker(prev => ({ ...prev, show: false }));
  };

  const onDateConfirm = (selectedDate: Date) => {
    const currentTarget = showDatePicker.target;
    if (currentTarget === 'start') {
      setModStartDate(selectedDate);
      if (modEndDate && selectedDate > modEndDate) {
        setModEndDate(new Date(selectedDate.getTime() + 3600000));
      }
    } else {
      setModEndDate(selectedDate);
    }
    setShowDatePicker(prev => ({ ...prev, show: false }));
  };

  const showPicker = (mode: 'date' | 'time', target: 'start' | 'end') => {
    if (target === 'start' && !modStartDate) setModStartDate(ceilToNextMinute(new Date()));
    if (target === 'end' && !modEndDate) {
      const seedBase = modStartDate ?? ceilToNextMinute(new Date());
      setModEndDate(new Date(seedBase.getTime() + 3600000));
    }
    setShowDatePicker({ show: true, mode, target });
  };

  const modPickerValue = useMemo(() => {
    if (showDatePicker.target === 'start') return modStartDate ?? ceilToNextMinute(new Date());
    if (modEndDate) return modEndDate;
    const seedBase = modStartDate ?? ceilToNextMinute(new Date());
    return new Date(seedBase.getTime() + 3600000);
  }, [showDatePicker.target, modStartDate, modEndDate]);

  const handleCompartir = useCallback(() => {
    setSelectedUsersToShare([]);
    setSearchQuery('');
    setActiveRole('');
    setShowShareModal(true);
  }, []);

  const handleOpenArchivo = useCallback(async (archivoId: number) => {
    try {
      const url = await getArchivoUrlFirmada(archivoId);
      Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el archivo'));
    } catch {
      Alert.alert('Error', 'No se pudo obtener el enlace del archivo');
    }
  }, [getArchivoUrlFirmada]);

  const handleAgregarAAgenda = useCallback(() => {
    if (solicitud?.fecha_inicio && solicitud?.fecha_fin) {
      setAgendaFechaInicio(new Date(solicitud.fecha_inicio));
      setAgendaFechaFin(new Date(solicitud.fecha_fin));
    }
    setShowAddToAgendaModal(true);
  }, [solicitud]);

  const onAgendaDateCancel = () => {
    setShowAgendaDatePicker(prev => ({ ...prev, show: false }));
  };

  const onAgendaDateConfirm = (selectedDate: Date) => {
    const currentTarget = showAgendaDatePicker.target;
    if (currentTarget === 'start') {
      setAgendaFechaInicio(selectedDate);
      if (selectedDate >= agendaFechaFin) setAgendaFechaFin(new Date(selectedDate.getTime() + 3600000));
    } else {
      setAgendaFechaFin(selectedDate);
    }
    setShowAgendaDatePicker(prev => ({ ...prev, show: false }));
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
    crearActividad(
      {
        titulo: solicitud.titulo,
        descripcion: solicitud.descripcion,
        fecha_inicio: agendaFechaInicio,
        fecha_fin: agendaFechaFin,
        solicitud_id: solicitud.solicitud_id,
        ...(esReunion ? { participantes: participantesAceptados } : {}),
      },
      {
        onError: (error) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
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
    if (agendaDateErrorMessage) return;
    if (!solicitud) return;
    const esReunion = solicitud.tipo_actividad === 'REUNION';
    const participantes: number[] = esReunion
      ? [...participantesAceptados]
      : (user?.user_context_id ? [user.user_context_id] : []);

    validacion.validate(
      {
        fechaInicio: agendaStartDate,
        fechaFin: agendaEndDate,
        participantes,
        tipo_actividad: solicitud.tipo_actividad === 'CHAT' ? undefined : solicitud.tipo_actividad,
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
      validacion.validate(
        {
          fechaInicio: solicitud!.fecha_inicio!,
          fechaFin: solicitud!.fecha_fin!,
          participantes: selectedUsersToShare.map(u => u.user_context_id),
          tipo_actividad: solicitud!.tipo_actividad === 'CHAT' ? undefined : solicitud!.tipo_actividad,
          solicitudIdExcluir: solicitudId,
        },
        () => ejecutarCompartir()
      );
    } else {
      ejecutarCompartir();
    }
  }, [solicitudId, selectedUsersToShare, solicitud, validacion, ejecutarCompartir]);

  const handleToggleUserShare = useCallback((user: UserSummary) => {
    setSelectedUsersToShare(prev => {
      const isSelected = prev.some(u => u.user_context_id === user.user_context_id);
      if (isSelected) return prev.filter(u => u.user_context_id !== user.user_context_id);
      return [...prev, user];
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

  // Corrección del typo — usaba setSelectedUsersToSelect en vez de setSelectedUsersToShare
  const handleDeselectAllRoleUsersFixed = useCallback((usersToDeselect: UserSummary[]) => {
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
  const isFinalState = solicitud?.estado
    ? ['ACTIVIDAD_CREADA', 'EXPIRED', 'ACCEPTED', 'REJECTED'].includes(solicitud.estado)
    : false;

  // ACCEPTED con posibilidad de agregar a agenda NO es estado final para el composer de mensajes
  const isAcceptedWithAgenda = solicitud?.estado === 'ACCEPTED' && puedeAgregarAAgenda;
  const isAcceptedMandatoSinFechas = puedeMandatoSinFechas;
  const composerFinalState = isFinalState && !isAcceptedWithAgenda && !isAcceptedMandatoSinFechas;

  const canSendMessage = useMemo(() => {
    if (composerFinalState) return false;
    return messageDraft.trim().length > 0 || pickedFiles.length > 0;
  }, [composerFinalState, messageDraft, pickedFiles]);

  const handleEnviarMensaje = useCallback(async () => {
    if (!solicitud || !canSendMessage) return;

    // Si hay modo modificar activo, enviar con fechas
    if (isModifyMode) {
      confirmModificar();
      return;
    }

    setIsSendingMessage(true);
    let archivosIds: number[] = [];
    if (pickedFiles.length > 0) {
      try {
        const response = await uploadArchivo({
          item: pickedFiles.map((file) => ({
            archivo: { uri: file.uri, name: file.name, type: file.type, size: file.size },
            archivoData: { nombre: file.name, tamaño: file.size, tipo: file.type, uso: ArchivoUso.TAREA },
          })),
        });
        const validos = (response?.exitosos ?? []).filter(isSuccess);
        const fallidos = response?.fallidos ?? [];
        archivosIds = validos.map((r) => r.data.id);
        if (validos.length === 0) showModal('Error de archivos', 'No se pudo subir ningún archivo.');
        else if (fallidos.length > 0) showModal('Archivos parciales', `Se subieron ${validos.length} de ${pickedFiles.length}`);
      } catch {
        showModal('Error de archivos', 'No se pudieron subir los archivos.');
      }
    }

    const trimmedMessage = messageDraft.trim();
    const hasMessage = trimmedMessage.length > 0;
    const hasArchivos = archivosIds.length > 0;

    if (!hasMessage && !hasArchivos) {
      setIsSendingMessage(false);
      return;
    }

    actualizarEstado(
      {
        solicitud_id: solicitud.solicitud_id,
        estado: resolvedType === 'enviada' ? 'MODIFIED_BY_HOST' : 'MODIFIED',
        observacion: hasMessage ? trimmedMessage : null,
        ...(hasArchivos ? { archivosIds } : {}),
      },
      {
        onSuccess: () => {
          setMessageDraft('');
          setPickedFiles([]);
          setIsSendingMessage(false);
        },
        onError: (error) => {
          setIsSendingMessage(false);
          Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
        },
      }
    );
  }, [solicitud, canSendMessage, pickedFiles, uploadArchivo, isSuccess, messageDraft, actualizarEstado, showModal, resolvedType, isModifyMode, confirmModificar]);

  const isAceptarModificacionesFlow = resolvedType === 'enviada' && solicitud?.estado === 'MODIFIED';
  const puedeCompartirEnviada = resolvedType === 'enviada' && !isExpiredState && !esActividadCreada;
  const puedeCancelarEnviada = resolvedType === 'enviada' && !!solicitud && CANCELABLE_ENVIADA_STATES.includes(solicitud.estado);
  const compartirEnMenuEnviadaVista = resolvedType === 'enviada' && solicitud?.estado === 'SEEN';
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

  const mensajes = useMemo(() => {
    if (!solicitud) return bitacoraVisible;

    const descripcion = solicitud.descripcion?.trim();
    const createdAt = solicitud.fecha_inicio
      ? new Date(solicitud.fecha_inicio).toISOString()
      : new Date().toISOString();

    const mensajesBase = descripcion
      ? [
        {
          id: 'descripcion',
          usuario_id: solicitud.created_by ?? null,
          usuario_nombre: solicitud.nombre_creador ?? '',
          usuario_apellido: solicitud.apellido_creador ?? '',
          created_at: createdAt,
          observacion: descripcion,
          estado: 'MESSAGE',
          fecha_inicio_nueva: null,
          fecha_fin_nueva: null,
          archivos: solicitud.archivos ?? [],
        },
        ...bitacoraVisible,
      ]
      : bitacoraVisible;

    // Agregar mensajes de sistema para estados especiales
    const mensajesSistema: any[] = [];

    if (esActividadCreada) {
      mensajesSistema.push({
        id: 'system-actividad-creada',
        usuario_id: null,
        usuario_nombre: 'Sistema',
        usuario_apellido: '',
        created_at: new Date().toISOString(),
        observacion: '✅ Actividad creada y agregada a la agenda.',
        estado: 'SYSTEM',
        fecha_inicio_nueva: null,
        fecha_fin_nueva: null,
        archivos: [],
        isSystem: true,
      });
    }

    if (isExpiredState) {
      mensajesSistema.push({
        id: 'system-expired',
        usuario_id: null,
        usuario_nombre: 'Sistema',
        usuario_apellido: '',
        created_at: new Date().toISOString(),
        observacion: '⏰ Esta solicitud expiró y ya no puede recibir acciones.',
        estado: 'SYSTEM',
        fecha_inicio_nueva: null,
        fecha_fin_nueva: null,
        archivos: [],
        isSystem: true,
      });
    }

    return [...mensajesBase, ...mensajesSistema];
  }, [bitacoraVisible, solicitud, esActividadCreada, isExpiredState]);

  const isLoadingSolicitud = !solicitud && !enviadas && !recibidas;

  // Mostrar botón de calendario verde cuando estado es ACCEPTED y puede agregar a agenda
  const mostrarBotonAgendaVerde = puedeAgregarAAgenda || isAcceptedMandatoSinFechas;

  return (
    <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.container}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="chevron-down" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            {isLoadingSolicitud ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.lightTint} />
              </View>
            ) : (
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                <View style={styles.contentBlock}>
                  <ThemedText style={styles.label}>Participantes</ThemedText>
                  <ThemedText style={styles.sectionValue}>{participantesTexto}</ThemedText>
                </View>

                <View style={styles.contentBlock}>
                  <ThemedText style={styles.label}>Titulo</ThemedText>

                  <ThemedText style={styles.sectionValue}>
                    {solicitud?.titulo}
                  </ThemedText>

                  <View style={styles.badgeRow}>
                    <View style={styles.chip}>
                      <ThemedText style={styles.chipText}>
                        {formatTipoActividad(solicitud?.tipo_actividad)}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Banner de expirada — solo informativo, el mensaje de sistema aparece en el chat */}
                {isExpiredState && (
                  <View style={styles.expiredBanner}>
                    <Ionicons name="alert-circle-outline" size={20} color="#5F6368" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.expiredBannerTitle}>Solicitud expirada</ThemedText>
                      <ThemedText style={styles.expiredBannerText}>No se pueden realizar acciones sobre esta solicitud.</ThemedText>
                    </View>
                  </View>
                )}

                {/* Botones de agenda verde cuando la solicitud fue aceptada */}
                {mostrarBotonAgendaVerde && (
                  <View style={styles.agendaVerdeBanner}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.success}
                      style={{ marginRight: 8 }}
                    />

                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.agendaVerdeTitulo}>
                        Solicitud aceptada
                      </ThemedText>

                      <View style={styles.agendaVerdeActions}>

                        {/* Agregar a agenda */}
                        {puedeAgregarAAgenda && (
                          <TouchableOpacity
                            style={[styles.agendaVerdeBtn]}
                            onPress={handleAgregarAAgenda}
                            disabled={isCreatingActividad}
                          >
                            <Ionicons name="calendar" size={16} color="#fff" />
                            <ThemedText style={styles.agendaVerdeBtnText}>
                              Agregar a agenda
                            </ThemedText>
                          </TouchableOpacity>
                        )}

                        {/* Crear objetivo */}
                        {isAcceptedMandatoSinFechas && (
                          <TouchableOpacity
                            style={[
                              styles.agendaVerdeBtn,
                              styles.agendaVerdeBtnSecondary
                            ]}
                            onPress={handleCrearObjetivoDesdeSolicitud}
                            disabled={isCreatingObjetivo}
                          >
                            <Ionicons
                              name="flag"
                              size={16}
                              color={colors.success}
                            />
                            <ThemedText
                              style={[
                                styles.agendaVerdeBtnText,
                                { color: colors.success }
                              ]}
                            >
                              Crear objetivo
                            </ThemedText>
                          </TouchableOpacity>
                        )}

                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.messagesCard}>
                  <View style={styles.sectionHeaderRow}>
                    <ThemedText style={styles.label}>Mensajes</ThemedText>
                    <TouchableOpacity onPress={() => setShowFullBitacora(prev => !prev)}>
                      <Text style={styles.sectionActionText}>
                        {showFullBitacora ? 'Ocultar información completa' : 'Mostrar información completa'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.bitacoraContainer}>
                    {isLoadingBitacora ? (
                      <ActivityIndicator size="small" color={colors.lightTint} style={{ marginTop: 20 }} />
                    ) : (
                      mensajes.length > 0 ? (
                        <ScrollView
                          ref={messagesScrollRef}
                          style={styles.messagesList}
                          contentContainerStyle={styles.messagesListContent}
                          showsVerticalScrollIndicator={false}
                          nestedScrollEnabled
                          onContentSizeChange={() => {
                            messagesScrollRef.current?.scrollToEnd({ animated: false });
                          }}
                          onLayout={() => {
                            messagesScrollRef.current?.scrollToEnd({ animated: false });
                          }}
                        >
                          {mensajes.map((b: any) => {
                            const isOwnEntry = b.usuario_id !== null && b.usuario_id === user?.user_context_id;
                            const isDescripcionEntry = b.id === 'descripcion';
                            const isSystemEntry = b.isSystem === true;
                            const estadoKey = typeof b.estado === 'string' && b.estado in estadoInvitacionMapping
                              ? (b.estado as EstadoInvitacionDB)
                              : null;
                            const hideActionTitle = isDescripcionEntry || isSystemEntry || (MODIFIED_STATES.includes(b.estado)
                              && b.estado !== 'ACCEPTED'
                              && b.estado !== 'ACCEPTED_BY_HOST');
                            const fechaInicioMensaje = b.fecha_inicio_nueva
                              ?? (isDescripcionEntry ? solicitud?.fecha_inicio : null);
                            const fechaFinMensaje = b.fecha_fin_nueva
                              ?? (isDescripcionEntry ? solicitud?.fecha_fin : null);
                            const hasFechaMensaje = !!(fechaInicioMensaje && fechaFinMensaje);
                            const archivos = Array.isArray(b.archivos) ? b.archivos : [];

                            if (isSystemEntry) {
                              return (
                                <View key={String(b.id)} style={styles.systemMessageContainer}>
                                  <View style={styles.systemMessageBubble}>
                                    <ThemedText style={styles.systemMessageText}>{b.observacion}</ThemedText>
                                  </View>
                                </View>
                              );
                            }

                            return (
                              <View
                                key={String(b.id)}
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
                                        {estadoKey ? estadoInvitacionMapping[estadoKey] : b.estado}
                                      </ThemedText>
                                    )}
                                    {b.observacion && (
                                      <View style={styles.bitacoraBubble}>
                                        <ThemedText style={styles.bitacoraText}>{b.observacion}</ThemedText>
                                      </View>
                                    )}
                                    {archivos.length > 0 && (
                                      <View style={styles.messageAttachments}>
                                        {archivos.map((archivo: any) => (
                                          <Pressable
                                            key={`archivo-${archivo.id}`}
                                            style={styles.messageAttachmentRow}
                                            onPress={() => handleOpenArchivo(archivo.id)}
                                            android_ripple={{ color: '#00000010' }}
                                          >
                                            <Ionicons name="document-outline" size={16} color={colors.secondaryText} />
                                            <ThemedText style={[styles.messageAttachmentName, styles.linkText]} numberOfLines={1}>
                                              {archivo.nombre}
                                            </ThemedText>
                                          </Pressable>
                                        ))}
                                      </View>
                                    )}
                                    {hasFechaMensaje && (
                                      <View style={styles.changeBubble}>
                                        <ThemedText style={styles.changeText}>
                                          {b.fecha_inicio_nueva ? 'Propuso cambio:' : 'Fechas:'}
                                        </ThemedText>
                                        <ThemedText style={styles.changeText}>
                                          Inicio: {formatDateDDMMYYYY(new Date(fechaInicioMensaje))} {formatTimeHHMM(new Date(fechaInicioMensaje))}
                                        </ThemedText>
                                        <ThemedText style={styles.changeText}>
                                          Fin: {formatDateDDMMYYYY(new Date(fechaFinMensaje))} {formatTimeHHMM(new Date(fechaFinMensaje))}
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
                      )
                    )}
                  </View>

                  {/* Composer con modo modificar inline */}
                  <View style={styles.messageComposer}>
                    {/* Fechas inline cuando modo modificar está activo */}
                    {isModifyMode && (
                      <View style={styles.inlineDateSection}>
                        <View style={styles.inlineDateRow}>
                          <ThemedText style={styles.inlineDateLabel}>Inicio</ThemedText>
                          <TouchableOpacity
                            onPress={() => showPicker('date', 'start')}
                            style={styles.inlineDateBtn}
                          >
                            <Ionicons name="calendar-outline" size={14} color={colors.lightTint} />
                            <ThemedText style={styles.inlineDateBtnText}>
                              {modStartDate ? formatDateDDMMYYYY(modStartDate) : 'Fecha'}
                            </ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => showPicker('time', 'start')}
                            style={styles.inlineDateBtn}
                          >
                            <Ionicons name="time-outline" size={14} color={colors.lightTint} />
                            <ThemedText style={styles.inlineDateBtnText}>
                              {modStartDate ? formatTimeHHMM(modStartDate) : 'Hora'}
                            </ThemedText>
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
                            <TouchableOpacity
                              onPress={() => showPicker('date', 'end')}
                              style={styles.inlineDateBtn}
                            >
                              <Ionicons name="calendar-outline" size={14} color={colors.lightTint} />
                              <ThemedText style={styles.inlineDateBtnText}>
                                {modEndDate ? formatDateDDMMYYYY(modEndDate) : 'Fecha'}
                              </ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => showPicker('time', 'end')}
                              style={styles.inlineDateBtn}
                            >
                              <Ionicons name="time-outline" size={14} color={colors.lightTint} />
                              <ThemedText style={styles.inlineDateBtnText}>
                                {modEndDate ? formatTimeHHMM(modEndDate) : 'Hora'}
                              </ThemedText>
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
                        {pickedFiles.map((file, index) => (
                          <View key={`${file.uri}-${index}`} style={styles.messageComposerAttachmentRow}>
                            <ThemedText style={styles.messageComposerAttachmentName} numberOfLines={1}>
                              {file.name}
                            </ThemedText>
                            <TouchableOpacity
                              onPress={() => setPickedFiles((prev) => prev.filter((_, i) => i !== index))}
                              style={styles.messageComposerAttachmentAction}
                            >
                              <Ionicons name="trash-outline" size={18} color={colors.secondaryText} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Orden de botones: calendario, add, add persona, rechazar, aceptar, enviar */}
                    <View style={styles.messageActionsRow}>
                      {!composerFinalState && (
                        <>
                          {/* Calendario (modificar fechas) */}
                          {solicitud?.tipo_actividad !== 'CHAT' && !isFinalState && (
                            <TouchableOpacity
                              style={[
                                styles.messageActionButton,
                                isModifyMode && styles.messageActionButtonActive,
                              ]}
                              onPress={() => {
                                if (isModifyMode) {
                                  resetModifyDraft();
                                } else {
                                  handleModificarPress();
                                }
                              }}
                            >
                              <Ionicons
                                name="calendar-outline"
                                size={20}
                                color={isModifyMode ? colors.background : colors.lightTint}
                              />
                            </TouchableOpacity>
                          )}

                          {/* Agregar adjunto */}
                          {!composerFinalState && (
                            <TouchableOpacity
                              style={styles.messageActionButton}
                              onPress={handleAgregarAdjunto}
                            >
                              <Ionicons name="add-outline" size={20} color={colors.lightTint} />
                            </TouchableOpacity>
                          )}

                          {/* Compartir / agregar persona (enviada) */}
                          {puedeCompartirEnviada && (
                            <TouchableOpacity
                              style={styles.messageActionButton}
                              onPress={handleCompartir}
                            >
                              <Ionicons name="person-add-outline" size={20} color={colors.lightTint} />
                            </TouchableOpacity>
                          )}

                          {/* Rechazar */}
                          {solicitud?.tipo_actividad !== 'CHAT' && !isFinalState && (
                            <TouchableOpacity
                              style={styles.messageActionButton}
                              onPress={() => {
                                setRejectObservation(messageDraft);
                                setShowRejectModal(true);
                              }}
                            >
                              <Ionicons name="close" size={20} color={colors.error} />
                            </TouchableOpacity>
                          )}

                          {/* Aceptar */}
                          {solicitud?.tipo_actividad !== 'CHAT' && !isFinalState && (
                            <TouchableOpacity
                              style={styles.messageActionButton}
                              onPress={() => {
                                setAcceptObservation(messageDraft);
                                if (isAceptarModificacionesFlow) {
                                  setShowAcceptModal(true);
                                } else {
                                  setShowAcceptModal(true);
                                }
                              }}
                            >
                              <Ionicons name="checkmark" size={20} color={colors.success} />
                            </TouchableOpacity>
                          )}

                          {/* Enviar mensaje */}
                          <TouchableOpacity
                            style={[
                              styles.messageActionButton,
                              styles.messageActionButtonPrimary,
                              !canSendMessage && styles.messageActionButtonDisabled,
                            ]}
                            onPress={handleEnviarMensaje}
                            disabled={!canSendMessage || isSendingMessage}
                          >
                            {isSendingMessage ? (
                              <ActivityIndicator size="small" color={colors.background} />
                            ) : (
                              <Ionicons name="send" size={20} color={colors.background} />
                            )}
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* Date picker inline (para modificar, sin modal separado) */}
            {showDatePicker.show && (
              <DateTimePicker
                visible={showDatePicker.show}
                testID="dateTimePicker"
                value={modPickerValue}
                mode={showDatePicker.mode}
                is24Hour={true}
                onConfirm={onDateConfirm}
                onCancel={onDateCancel}
              />
            )}

            {/* Modal Aceptar */}
            <Modal visible={showAcceptModal} transparent={true} animationType="fade">
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardContainer}
              >
                <TouchableWithoutFeedback onPress={closeAcceptModal}>
                  <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                      <View style={styles.modalContent}>
                        <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
                          {isAceptarModificacionesFlow ? 'Aceptar Modificaciones' : 'Aceptar Solicitud'}
                        </ThemedText>
                        <ThemedText style={{ marginBottom: 8 }}>
                          {isAceptarModificacionesFlow
                            ? '¿Confirmas que deseas aceptar las modificaciones propuestas?'
                            : '¿Confirmas que deseas aceptar esta solicitud?'}
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
                              : <ThemedText style={{ color: colors.background }}>Aceptar</ThemedText>
                            }
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </KeyboardAvoidingView>
            </Modal>

            {/* Modal Rechazar */}
            <Modal visible={showRejectModal} transparent={true} animationType="fade">
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardContainer}
              >
                <TouchableWithoutFeedback onPress={closeRejectModal}>
                  <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                      <View style={styles.modalContent}>
                        <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Rechazar solicitud</ThemedText>
                        <ThemedText style={{ marginBottom: 8 }}>¿Deseas rechazar esta solicitud?</ThemedText>
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
                              : <ThemedText style={{ color: colors.background }}>Rechazar</ThemedText>
                            }
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

            {/* Modal de Selección de Usuarios por Rol */}
            <RoleUserSelectionModal
              visible={showRoleModal}
              onClose={handleCloseRoleModal}
              roleName={activeRole}
              roleUsers={roleUsersData ?? []}
              selectedUsers={selectedUsersToShare}
              onToggleUser={handleToggleUserShare}
              onSelectAll={handleSelectAllRoleUsers}
              onDeselectAll={handleDeselectAllRoleUsersFixed}
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
                          <TouchableOpacity
                            onPress={() => setShowAgendaDatePicker({ show: true, mode: 'date', target: 'start' })}
                            style={styles.dateBtn}
                          >
                            <ThemedText>{formatDateDDMMYYYY(agendaFechaInicio)}</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setShowAgendaDatePicker({ show: true, mode: 'time', target: 'start' })} style={styles.dateBtn}>
                            <ThemedText>{formatTimeHHMM(agendaFechaInicio)}</ThemedText>
                          </TouchableOpacity>
                        </View>

                        <ThemedText style={styles.label}>Fecha de fin</ThemedText>
                        <View style={styles.row}>
                          <TouchableOpacity
                            onPress={() => setShowAgendaDatePicker({ show: true, mode: 'date', target: 'end' })}
                            style={styles.dateBtn}
                          >
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
                    visible={showAgendaDatePicker.show}
                    testID="agendaDateTimePicker"
                    value={showAgendaDatePicker.target === 'start' ? agendaFechaInicio : agendaFechaFin}
                    mode={showAgendaDatePicker.mode}
                    is24Hour={true}
                    onConfirm={onAgendaDateConfirm}
                    onCancel={onAgendaDateCancel}
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

            <AlertModal
              visible={alertModal.visible}
              title={alertModal.title}
              message={alertModal.message}
              actions={alertModal.actions}
              onClose={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelInline: {
    marginBottom: 0,
  },
  badgeRow: {
    marginTop: 8,
  },
  emptyValueText: {
    color: colors.secondaryText,
    fontSize: 14,
    marginTop: 4,
  },
  dateStack: {
    marginTop: 6,
    gap: 6,
  },
  fullScreenContainer: {
    flex: 1,
    marginTop: '5%',
    backgroundColor: Colors['light'].componentBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
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
    fontWeight: '600',
    color: '#6b7280',
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
  // Banner verde para solicitud aceptada
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
  // Mensaje de sistema centrado
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
  // Sección de fechas inline en el composer
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
  modifyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modifyModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: Colors['light'].icon,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modifyModalTitle: {
    fontSize: UI.fontSize.xxl,
    color: colors.tint,
    fontWeight: '500',
  },
  modifyModalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  modifyModalHeaderBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
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
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.tint,
  },
  actionButtonTextDisabled: {
    color: '#9ca3af',
  },
  section: {
    marginTop: 12,
    gap: 10,
  },
  sectionValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
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
  linkText: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
});