import { AlertModal, type AlertModalAction } from '@/components/AlertModal';
import { ThemedText } from '@/components/themed-text';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors, UI } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ArchivoUso } from '@/features/docs/models/Archivo';
import { useGetArchivoUrlFirmada, useUploadArchivo } from '@/features/docs/viewmodels/useArchivos';
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
import {
  EstadoInvitacionDB,
  ReenviarSolicitudRequest,
  SolicitudEnviada,
  SolicitudInvitado,
  estadoInvitacionMapping,
} from '../models/Solicitud';
import {
  useActualizarEstadoInvitacion,
  useActualizarInvitadosSolicitud,
  useChatArchivos,
  useReenviarSolicitud,
  useSolicitudBitacora,
} from '../viewmodels/useSolicitudes';
import { RoleUserSelectionModal } from './RoleUserSelectionModal';

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

// Estados que representan mensajes/cambios relevantes en la conversación.
const MESSAGE_STATES: EstadoInvitacionDB[] = [
  'MODIFIED', 'MODIFIED_BY_HOST', 'ACCEPTED', 'REJECTED', 'ACCEPTED_BY_HOST',
];

function formatDateDDMMYYYY(date: Date): string {
  return DATE_FORMATTER.format(date);
}

function formatTimeHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

interface ConversacionChatProps {
  solicitud: SolicitudEnviada;
  visible?: boolean;
  onClose?: () => void;
}

export function ConversacionChat({ solicitud, visible, onClose }: ConversacionChatProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { hasRole } = useRoleCheck();

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
  const bitacoraItems = useMemo(
    () => (bitacoraData?.pages ?? []).flatMap(p => p.data),
    [bitacoraData],
  );
  const { mutate: actualizarEstado, isPending: isUpdatingEstado } = useActualizarEstadoInvitacion();
  const { mutate: reenviarSolicitud, isPending: isSharing } = useReenviarSolicitud();
  const { mutate: actualizarInvitados } = useActualizarInvitadosSolicitud();
  const { mutateAsync: uploadArchivo } = useUploadArchivo();
  const { getArchivoUrlFirmada } = useGetArchivoUrlFirmada();

  const isMutating = isUpdatingEstado || isSharing;

  // ─── Rol / permisos ───────────────────────────────────────────────────────
  const isConsejo = hasRole('consejo');
  const rolesForSelector = isConsejo ? adminRoles : allRoles;

  // ─── Estado UI ────────────────────────────────────────────────────────────
  const [showShareModal, setShowShareModal] = useState(false);
  const [showArchivosModal, setShowArchivosModal] = useState(false);
  const { data: chatArchivos, isLoading: isLoadingArchivos } = useChatArchivos(solicitudId, showArchivosModal);
  const [showFullBitacora, setShowFullBitacora] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [pickedFiles, setPickedFiles] = useState<any[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean; title: string; message?: string; actions: AlertModalAction[];
  }>({ visible: false, title: '', actions: [] });

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

  const todosArchivos = useMemo(() => {
    const archivosBase = solicitud.archivos ?? [];
    const archivosBitacora = bitacoraItems.flatMap((b: any) => b.archivos ?? []);
    const map = new Map<number, any>();
    [...archivosBase, ...archivosBitacora].forEach(a => { if (a?.id) map.set(a.id, a); });
    return Array.from(map.values());
  }, [solicitud.archivos, bitacoraItems]);

  const todosArchivosChat = useMemo(() => {
    const map = new Map<number, any>();
    (chatArchivos ?? []).forEach(a => { if (a?.id) map.set(a.id, a); });
    todosArchivos.forEach(a => { if (a?.id && !map.has(a.id)) map.set(a.id, a); });
    return Array.from(map.values());
  }, [chatArchivos, todosArchivos]);

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

  const isExpiredState = solicitud.estado === 'EXPIRED';
  const puedeCompartir = isHost && !isExpiredState;

  // ─── Mensajes / bitácora ──────────────────────────────────────────────────

  const bitacoraVisible = useMemo(() => {
    if (bitacoraItems.length === 0) return [];
    if (showFullBitacora) return bitacoraItems;
    return bitacoraItems.filter(b => MESSAGE_STATES.includes(b.estado));
  }, [bitacoraItems, showFullBitacora]);

  const mensajes = useMemo(() => {
    const descripcion = solicitud.descripcion?.trim();
    const createdAt = solicitud.fecha_inicio
      ? new Date(solicitud.fecha_inicio).toISOString()
      : new Date().toISOString();

    // La descripción es el mensaje original (el más antiguo). Solo se muestra
    // cuando ya no quedan páginas anteriores por cargar, para que quede arriba
    // de todo sin contradecir los mensajes más viejos aún sin traer.
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
    if (isExpiredState) sistema.push({
      id: 'system-expired', usuario_id: null,
      usuario_nombre: 'Sistema', usuario_apellido: '',
      created_at: new Date().toISOString(),
      observacion: '⏰ Esta conversación expiró y ya no puede recibir mensajes.',
      estado: 'SYSTEM', fecha_inicio_nueva: null, fecha_fin_nueva: null,
      archivos: [], isSystem: true,
    });

    return [...base, ...sistema];
  }, [bitacoraVisible, solicitud, isExpiredState, hasNextPage]);

  const canSendMessage = useMemo(() => {
    if (isExpiredState) return false;
    return messageDraft.trim().length > 0 || pickedFiles.length > 0;
  }, [isExpiredState, messageDraft, pickedFiles]);

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

  // ─── Enviar mensaje ───────────────────────────────────────────────────────

  const handleEnviarMensaje = useCallback(async () => {
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
  }, [canSendMessage, pickedFiles, uploadArchivo, isSuccess, messageDraft, actualizarEstado, solicitudId, isHost, showModal]);

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
      // Al anteponer mensajes viejos, mantenemos la posición visible en vez de saltar al final.
      const delta = h - prevContentHeightRef.current;
      if (delta > 0) messagesScrollRef.current?.scrollTo({ y: scrollOffsetRef.current + delta, animated: false });
      isPrependingRef.current = false;
    } else {
      messagesScrollRef.current?.scrollToEnd({ animated: false });
    }
    prevContentHeightRef.current = h;
  }, []);

  // ─── Participantes ─────────────────────────────────────────────────────────

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
      onSuccess: () => { setShowShareModal(false); Alert.alert('Éxito', 'Conversación compartida'); },
      onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Intenta nuevamente'),
    });
  }, [solicitudId, selectedUsersToShare, reenviarSolicitud]);

  const confirmCompartir = useCallback(() => {
    if (selectedUsersToShare.length === 0) { Alert.alert('Error', 'Selecciona al menos un usuario'); return; }
    ejecutarCompartir();
  }, [selectedUsersToShare, ejecutarCompartir]);

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
              {/* Participantes (resumen) — solo en grupos */}
              {solicitud.es_grupo && (
                <View style={styles.contentBlock}>
                  <ThemedText style={[styles.label, { marginTop: 4 }]}>
                    Participantes: {participantesTexto}
                  </ThemedText>
                </View>
              )}

              {/* Tipo */}
              <View style={styles.contentBlock}>
                <View style={styles.badgeRow}>
                  <View style={styles.chip}>
                    <ThemedText style={styles.chipText}>Conversación</ThemedText>
                  </View>
                </View>
              </View>

              {/* Participantes + archivos */}
              <View style={styles.participantesSection}>
                <View style={styles.sectionHeaderRow}>
                  {solicitud.es_grupo
                    ? <ThemedText style={styles.label}>Participantes</ThemedText>
                    : <View />}
                  <View style={styles.sectionHeaderActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => setShowArchivosModal(true)}
                      accessibilityLabel="Ver archivos de la conversación"
                    >
                      <Ionicons name="information-circle-outline" size={22} color={colors.tint} />
                    </TouchableOpacity>
                    {solicitud.es_grupo && isHost && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setShowParticipantesSelector(p => !p)}
                      >
                        <Ionicons name="add" size={16} color={colors.tint} />
                        <ThemedText style={styles.actionButtonText}>Agregar</ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {solicitud.es_grupo && isHost && showParticipantesSelector && (
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

                {solicitud.es_grupo && (
                  displayParticipantes.length === 0 ? (
                    <ThemedText style={{ color: colors.secondaryText, fontSize: 14 }}>Sin participantes</ThemedText>
                  ) : (
                    <>
                      {(participantesExpanded ? displayParticipantes : displayParticipantes.slice(0, 3)).map((inv, idx) => (
                        <View key={`${inv.user_id ?? idx}-${idx}`} style={styles.inviteRow}>
                          <View style={styles.participanteAvatar}>
                            <ThemedText style={styles.participanteAvatarText}>
                              {getParticipanteDisplayName(inv).charAt(0).toUpperCase()}
                            </ThemedText>
                          </View>
                          <ThemedText style={[styles.inviteName, { flex: 1 }]}>
                            {getParticipanteDisplayName(inv)}
                          </ThemedText>
                          {isHost && (
                            <TouchableOpacity onPress={() => handleQuitarParticipante(inv.user_id)}>
                              <Ionicons name="close-circle" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      {displayParticipantes.length > 3 && (
                        <TouchableOpacity
                          onPress={() => setParticipantesExpanded(p => !p)}
                          style={styles.collapsibleToggle}
                        >
                          <ThemedText style={styles.collapsibleToggleText}>
                            {participantesExpanded
                              ? 'Ver menos'
                              : `+${displayParticipantes.length - 3} más`}
                          </ThemedText>
                          <Ionicons
                            name={participantesExpanded ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={colors.tint}
                          />
                        </TouchableOpacity>
                      )}
                    </>
                  )
                )}
              </View>

              {/* Banner expirada */}
              {isExpiredState && (
                <View style={styles.expiredBanner}>
                  <Ionicons name="alert-circle-outline" size={20} color="#5F6368" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.expiredBannerTitle}>Conversación expirada</ThemedText>
                    <ThemedText style={styles.expiredBannerText}>No se pueden enviar mensajes.</ThemedText>
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
                          MESSAGE_STATES.includes(b.estado) && b.estado !== 'ACCEPTED' && b.estado !== 'ACCEPTED_BY_HOST'
                        );
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
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <ThemedText style={{ color: colors.secondaryText, textAlign: 'center', marginTop: 20 }}>
                      {showFullBitacora ? 'No hay actividad reciente' : 'No hay mensajes'}
                    </ThemedText>
                  )}
                </View>

                {/* Composer */}
                <View style={styles.messageComposer}>
                  <TextInput
                    style={styles.messageComposerInput}
                    placeholder="Escribir mensaje"
                    placeholderTextColor={colors.secondaryText}
                    value={messageDraft}
                    onChangeText={setMessageDraft}
                    multiline
                    textAlignVertical="top"
                    editable={!isExpiredState}
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
                    {!isExpiredState && (
                      <>
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

                        {/* Enviar */}
                        <TouchableOpacity
                          style={[styles.messageActionButton, styles.messageActionButtonPrimary, !canSendMessage && styles.messageActionButtonDisabled]}
                          onPress={handleEnviarMensaje}
                          disabled={!canSendMessage || isSendingMessage}
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

            {/* Modal Compartir */}
            <Modal visible={showShareModal} transparent animationType="fade" onRequestClose={() => setShowShareModal(false)}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <TouchableWithoutFeedback onPress={() => setShowShareModal(false)}>
                  <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                      <View style={styles.modalContent}>
                        <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Compartir Conversación</ThemedText>
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

            {/* Modal Selección por Rol (compartir) */}
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

            {/* Modal Selección por Rol (participantes) */}
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

            {/* Modal Archivos de la conversación */}
            <Modal visible={showArchivosModal} transparent animationType="fade" onRequestClose={() => setShowArchivosModal(false)}>
              <TouchableWithoutFeedback onPress={() => setShowArchivosModal(false)}>
                <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                    <View style={styles.modalContent}>
                      <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Archivos de la conversación</ThemedText>
                      {isLoadingArchivos ? (
                        <ActivityIndicator size="small" color={colors.lightTint} style={{ marginVertical: 20 }} />
                      ) : todosArchivosChat.length === 0 ? (
                        <ThemedText style={{ color: colors.secondaryText, textAlign: 'center', marginVertical: 20 }}>
                          No hay archivos en esta conversación
                        </ThemedText>
                      ) : (
                        <ScrollView style={{ maxHeight: 360 }}>
                          {todosArchivosChat.map(a => (
                            <Pressable key={`chat-archivo-${a.id}`} style={styles.archivoRow} onPress={() => handleOpenArchivo(a.id)}>
                              <Ionicons name="document-outline" size={18} color={colors.secondaryText} />
                              <ThemedText style={[styles.messageAttachmentName, styles.linkText]} numberOfLines={1}>{a.nombre}</ThemedText>
                            </Pressable>
                          ))}
                        </ScrollView>
                      )}
                      <View style={styles.modalActions}>
                        <TouchableOpacity onPress={() => setShowArchivosModal(false)} style={styles.modalBtnCancel}>
                          <ThemedText style={{ color: colors.error }}>Cerrar</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>

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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  loadingMoreContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  archivoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutralBorder,
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
