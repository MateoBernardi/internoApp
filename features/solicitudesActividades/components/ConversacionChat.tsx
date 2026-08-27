import { AlertModal } from '@/components/AlertModal';
import { FileAttachment, FilePreview, InlineImageAttachment, isImageFile, useOpenFilePreview } from '@/components/filePreview';
import { ThemedText } from '@/components/themed-text';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { generateIdempotencyKey } from '@/shared/idempotency';
import { FullScreenPortal } from '@/shared/ui/FullScreenPortal';
import { focusBorderStyles, glassColors, glassStyles } from '@/shared/ui/glass';
import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { useKeyboardVisible } from '@/shared/ui/keyboard';
import { useFocusBorder } from '@/shared/ui/useFocusBorder';
import { useSafeBottomInset } from '@/hooks/useSafeBottomInset';
import { adminRoles, allRoles } from '@/shared/users/roles';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { UserSelector } from '../../../components/UserSelector';
import { MESSAGE_STATES, formatDateDDMMYYYY, formatDayLabel, formatTimeHHMM, isSameCalendarDay } from '../conversacion/constants';
import { buildArchivoFileItem, rutaR2 } from '../conversacion/fileHelpers';
import { useAdjuntos } from '../conversacion/hooks/useAdjuntos';
import { useAlertModal } from '../conversacion/hooks/useAlertModal';
import { useMarcarVisto } from '../conversacion/hooks/useMarcarVisto';
import { useMensajesSearch } from '../conversacion/hooks/useMensajesSearch';
import { useMessagesScroll } from '../conversacion/hooks/useMessagesScroll';
import { useParticipantesManager } from '../conversacion/hooks/useParticipantesManager';
import { conversacionStyles } from '../conversacion/styles';
import {
  ActualizarEstadoInvitacionRequest,
  EstadoInvitacionDB,
  SolicitudEnviada,
  estadoInvitacionMapping,
} from '../models/Solicitud';
import {
  solicitudesQueryKeys,
  useActualizarEstadoInvitacion,
  useActualizarInvitadosSolicitud,
  useChatArchivos,
  useMarcarSolicitudVisto,
  useOcultarSolicitudInvitado,
  useSolicitudBitacora,
} from '../viewmodels/useSolicitudes';
import { MessageBubble } from './MessageBubble';
import { ParticipantesBlock } from './ParticipantesBlock';
import { RoleUserSelectionModal } from './RoleUserSelectionModal';

const colors = Colors['light'];

/** Entrada optimista de la bitácora: misma forma que un mensaje real más un id
 * temporal y la marca `__optimistic` para pintar el estado "Enviando…"/"Falló".
 * Guarda el payload e idempotency key originales para poder reintentar. */
interface OptimisticMessage {
  id: string;
  usuario_id: number | null;
  usuario_nombre: string;
  usuario_apellido: string;
  created_at: string;
  observacion: string | null;
  estado: 'MESSAGE';
  fecha_inicio_nueva: null;
  fecha_fin_nueva: null;
  archivos: never[];
  __optimistic: true;
  failed: boolean;
  retryPayload: ActualizarEstadoInvitacionRequest;
  idempotencyKey: string;
}

interface ConversacionChatProps {
  solicitud: SolicitudEnviada;
  visible?: boolean;
  onClose?: () => void;
}

export function ConversacionChat({ solicitud, visible, onClose }: ConversacionChatProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useSafeBottomInset();
  const searchFocus = useFocusBorder();
  const composerFocus = useFocusBorder();
  const tituloFocus = useFocusBorder();
  const { user } = useAuth();
  const { hasRole } = useRoleCheck();

  const solicitudId = solicitud.solicitud_id;
  const isHost = solicitud.is_host;
  const modalVisible = visible ?? true;
  const handleClose = useCallback(() => {
    if (onClose) onClose();
    else router.back();
  }, [onClose, router]);

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
  const { mutate: actualizarEstadoRaw, isPending: isUpdatingTitulo } = useActualizarEstadoInvitacion();

  const actualizarEstado = useCallback<typeof actualizarEstadoRaw>(
    (variables, options) =>
      actualizarEstadoRaw({ ...variables, idempotencyKey: generateIdempotencyKey() }, options),
    [actualizarEstadoRaw],
  );
  const { mutate: marcarVisto } = useMarcarSolicitudVisto();
  const { mutate: actualizarInvitados } = useActualizarInvitadosSolicitud();
  const { mutate: ocultarSolicitud, isPending: isHidingSolicitud } = useOcultarSolicitudInvitado();

  // El modal de bloqueo a pantalla completa se reserva SOLO para acciones
  // críticas/irreversibles (ocultar conversación). El envío usa feedback local
  // (isSendingMessage + spinner del botón), nunca el overlay global.
  const isBlockingOperation = isHidingSolicitud;

  // ─── Rol / permisos ───────────────────────────────────────────────────────
  const isConsejo = hasRole('consejo');
  const rolesForSelector = isConsejo ? adminRoles : allRoles;

  // ─── Estado UI ────────────────────────────────────────────────────────────
  const [showArchivosModal, setShowArchivosModal] = useState(false);
  const [showParticipantesModal, setShowParticipantesModal] = useState(false);
  const { previewFile, openFile, openWithUri, closePreview } = useOpenFilePreview();
  const { data: chatArchivos, isLoading: isLoadingArchivos } = useChatArchivos(solicitudId, showArchivosModal);
  const [messageDraft, setMessageDraft] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<OptimisticMessage[]>([]);
  const queryClient = useQueryClient();
  const { alertModal, showModal, closeAlert, onModalDismiss } = useAlertModal();
  const {
    pickedFiles, setPickedFiles, handleAgregarAdjunto, handleOpenArchivo, uploadPickedFiles,
  } = useAdjuntos({ showModal });

  const [showEditTituloModal, setShowEditTituloModal] = useState(false);
  const [tituloDraft, setTituloDraft] = useState('');

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

  const chatOtherUser = useMemo(() => {
    if (solicitud.es_grupo) return null;
    return displayParticipantes.find(p => p.user_id !== user?.user_context_id) ?? displayParticipantes[0] ?? null;
  }, [solicitud.es_grupo, displayParticipantes, user?.user_context_id]);

  const chatTitle = solicitud.es_grupo
    ? solicitud.titulo
    : (chatOtherUser ? getParticipanteDisplayName(chatOtherUser) : solicitud.titulo);

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

  const invitadosSinCreador = useMemo(() =>
    solicitud.invitados.filter(inv => inv.user_id !== solicitud.created_by),
    [solicitud.invitados, solicitud.created_by],
  );

  const todosParticipantesIds = useMemo(() =>
    solicitud.invitados.map(inv => inv.user_id),
    [solicitud.invitados],
  );

  const todosArchivos = useMemo(() => {
    const archivosBase = chatArchivos ?? [];
    return archivosBase;
  }, [chatArchivos]);

  // ─── Flags de estado ──────────────────────────────────────────────────────

  const isExpiredState = solicitud.estado === 'EXPIRED';

  // ─── Mensajes / bitácora ──────────────────────────────────────────────────

  const bitacoraVisible = useMemo(
    () => bitacoraItems.filter(b => MESSAGE_STATES.includes(b.estado)),
    [bitacoraItems],
  );

  // Ver comentario equivalente en Solicitud.tsx: `solicitud.fecha_inicio`/`fecha_fin`
  // reflejan la propuesta más reciente, no la original — no usarlas como
  // fallback en el mensaje sintético si ya hubo una propuesta real.
  const hasAnyFechaPropuesta = useMemo(
    () => bitacoraItems.some(b => b.fecha_inicio_nueva && b.fecha_fin_nueva),
    [bitacoraItems],
  );

  const mensajes = useMemo(() => {
    const descripcion = solicitud.descripcion?.trim();
    const createdAt = solicitud.fecha_inicio
      ? new Date(solicitud.fecha_inicio).toISOString()
      : solicitud.created_at.toISOString();
    // La entrada 'SENT' real (creación) trae su propio acuse de lectura;
    // la reusamos para que el mensaje original también muestre el tilde.
    const entradaInicial = (bitacoraItems ?? []).find(b => b.estado === 'SENT');

    // La descripción es el mensaje original (el más antiguo). Solo se muestra
    // cuando ya no quedan páginas anteriores por cargar, para que quede arriba
    // de todo sin contradecir los mensajes más viejos aún sin traer.
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
    if (isExpiredState) sistema.push({
      id: 'system-expired', usuario_id: null,
      usuario_nombre: 'Sistema', usuario_apellido: '',
      created_at: new Date().toISOString(),
      observacion: '⏰ Esta conversación expiró y ya no puede recibir mensajes.',
      estado: 'SYSTEM', fecha_inicio_nueva: null, fecha_fin_nueva: null,
      archivos: [], isSystem: true,
    });

    // Los mensajes optimistas son siempre los más nuevos (van al final).
    return [...base, ...sistema, ...pendingMessages];
  }, [bitacoraItems, bitacoraVisible, solicitud, isExpiredState, hasNextPage, pendingMessages]);

  const canSendMessage = useMemo(() => {
    if (isExpiredState) return false;
    return messageDraft.trim().length > 0 || pickedFiles.length > 0;
  }, [isExpiredState, messageDraft, pickedFiles]);

  // ─── Búsqueda dentro del chat ─────────────────────────────────────────────

  const mensajesSearch = useMensajesSearch(solicitudId, mensajes, messagesScrollRef, {
    hasNextPage, isFetchingNextPage, fetchNextPage,
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // ─── Marcar como visto ────────────────────────────────────────────────────

  useMarcarVisto({ solicitud, solicitudId, invitadosSinCreador, marcarVisto });

  // ─── Enviar mensaje ───────────────────────────────────────────────────────

  // Único punto de envío real, usado tanto por el primer intento como por el
  // reintento manual tras un fallo. Reutiliza la MISMA idempotency key en el
  // reintento: si el intento anterior en realidad sí llegó a persistirse (una
  // respuesta perdida por un socket zombie en native), el backend deduplica en
  // vez de crear un mensaje repetido.
  const attemptSend = useCallback((
    tempId: string,
    payload: ActualizarEstadoInvitacionRequest,
    idempotencyKey: string,
  ) => {
    setPendingMessages(prev => prev.map(m => (m.id === tempId ? { ...m, failed: false } : m)));
    actualizarEstadoRaw(
      { ...payload, idempotencyKey },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: solicitudesQueryKeys.bitacora(solicitudId) });
          setPendingMessages(prev => prev.filter(m => m.id !== tempId));
        },
        // No se borra el optimista: se marca como fallido para que el usuario
        // vea que NO se guardó y pueda reintentar, en vez de desaparecer en
        // silencio (el mensaje se perdía sin ningún aviso).
        onError: () => {
          setPendingMessages(prev => prev.map(m => (m.id === tempId ? { ...m, failed: true } : m)));
        },
      },
    );
  }, [actualizarEstadoRaw, queryClient, solicitudId]);

  const handleEnviarMensaje = useCallback(async () => {
    if (!canSendMessage) return;

    setIsSendingMessage(true);
    const archivosIds = pickedFiles.length > 0 ? await uploadPickedFiles() : [];

    const trimmed = messageDraft.trim();
    if (!trimmed && archivosIds.length === 0) { setIsSendingMessage(false); return; }

    // Mensaje optimista: lo pintamos al instante y limpiamos el input. El id
    // temporal sirve para quitarlo cuando reconciliamos con el servidor.
    const idempotencyKey = generateIdempotencyKey();
    const tempId = `pending-${idempotencyKey}`;
    const payload: ActualizarEstadoInvitacionRequest = {
      solicitud_id: solicitudId,
      estado: isHost ? 'MODIFIED_BY_HOST' : 'MODIFIED',
      observacion: trimmed || null,
      ...(archivosIds.length > 0 ? { archivosIds } : {}),
    };
    const optimistic: OptimisticMessage = {
      id: tempId,
      usuario_id: user?.user_context_id ?? null,
      usuario_nombre: user?.nombre ?? '',
      usuario_apellido: user?.apellido ?? '',
      created_at: new Date().toISOString(),
      observacion: trimmed || (archivosIds.length > 0 ? '📎 Adjunto' : null),
      estado: 'MESSAGE',
      fecha_inicio_nueva: null,
      fecha_fin_nueva: null,
      archivos: [],
      __optimistic: true,
      failed: false,
      retryPayload: payload,
      idempotencyKey,
    };
    setPendingMessages(prev => [...prev, optimistic]);
    setMessageDraft('');
    setPickedFiles([]);
    setIsSendingMessage(false);

    attemptSend(tempId, payload, idempotencyKey);
  }, [canSendMessage, uploadPickedFiles, messageDraft, pickedFiles, attemptSend, solicitudId, isHost, setPickedFiles, user]);

  const handleRetryMessage = useCallback((tempId: string) => {
    const pending = pendingMessages.find(m => m.id === tempId);
    if (!pending || !pending.failed) return;
    attemptSend(tempId, pending.retryPayload, pending.idempotencyKey);
  }, [pendingMessages, attemptSend]);

  // ─── Preview de archivos ──────────────────────────────────────────────────

  const handleOpenAsPreview = useCallback((archivo: any) => openFile(archivo), [openFile]);

  // ─── Opciones (editar título / ocultar) ────────────────────────────────────

  const handleAbrirEditarTitulo = useCallback(() => {
    setTituloDraft(solicitud.titulo);
    setShowEditTituloModal(true);
  }, [solicitud.titulo]);

  const handleGuardarTitulo = useCallback(() => {
    const nuevoTitulo = tituloDraft.trim();
    if (!nuevoTitulo) return;
    // estado 'SEEN' es el único valor que no dispara una transición de estado
    // ni queda incluido en MESSAGE_STATES: actualiza el título sin generar un
    // mensaje visible en la bitácora del chat.
    actualizarEstado(
      { solicitud_id: solicitudId, estado: 'SEEN', titulo: nuevoTitulo },
      {
        onSuccess: () => setShowEditTituloModal(false),
        onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Intenta nuevamente'),
      },
    );
  }, [tituloDraft, actualizarEstado, solicitudId]);

  const handleOcultarConversacion = useCallback(() => {
    // En grupos esto se presenta como "salir" (dejás de ver la conversación),
    // en privadas como "ocultar" — misma acción subyacente, distinto encuadre.
    const esGrupo = solicitud.es_grupo;
    Alert.alert(
      esGrupo ? 'Salir de la conversación' : 'Ocultar conversación',
      esGrupo
        ? 'Ya no verás esta conversación ni sus mensajes. ¿Deseas continuar?'
        : 'Esta conversación dejará de verse en tu lista. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: esGrupo ? 'Salir' : 'Ocultar',
          style: 'destructive',
          onPress: () => ocultarSolicitud(
            { solicitudId },
            {
              onSuccess: handleClose,
              onError: e => Alert.alert('Error', e instanceof Error ? e.message : (esGrupo ? 'No se pudo salir de la conversación' : 'No se pudo ocultar la conversación')),
            },
          ),
        },
      ],
    );
  }, [solicitud.es_grupo, ocultarSolicitud, solicitudId, handleClose]);

  const handleAbrirOpciones = useCallback(() => {
    const actions: { key: string; label: string; onPress: () => void; variant?: 'primary' | 'destructive' | 'neutral' }[] = [];
    if (solicitud.es_grupo && isHost) {
      actions.push({ key: 'editar-titulo', label: 'Editar título', onPress: handleAbrirEditarTitulo });
    }
    actions.push({
      key: 'ocultar',
      label: solicitud.es_grupo ? 'Salir de la conversación' : 'Ocultar conversación',
      onPress: handleOcultarConversacion,
      variant: 'destructive',
    });
    actions.push({ key: 'cancel', label: 'Cancelar', onPress: () => { }, variant: 'neutral' });
    showModal('Opciones', undefined, actions);
  }, [solicitud.es_grupo, isHost, handleAbrirEditarTitulo, handleOcultarConversacion, showModal]);

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
        <View style={styles.container}>

          {/* Header */}
          {/* paddingTop con el inset superior: el marginTop '10%' del container antiguo
             resolvía contra el ancho (~39px) y quedaba por debajo del status bar/notch
             de iOS; ahora es full screen, pero el inset sigue siendo necesario para no
             comerse el touch del botón de cerrar bajo el status bar/notch. */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + 5 }]}>
              <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color={glassColors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => solicitud.es_grupo && setShowParticipantesModal(true)}
                activeOpacity={solicitud.es_grupo ? 0.75 : 1}
              >
                <Text style={styles.modalHeaderTitle} numberOfLines={1}>{chatTitle}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => (mensajesSearch.active ? mensajesSearch.close() : mensajesSearch.setActive(true))}
                style={localStyles.headerIconButton}
              >
                <Ionicons name={mensajesSearch.active ? 'close' : 'search-outline'} size={20} color={glassColors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowArchivosModal(true)} style={localStyles.headerIconButton}>
                <Ionicons name="folder-outline" size={22} color={glassColors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAbrirOpciones} style={localStyles.headerIconButton}>
                <Ionicons name="ellipsis-vertical" size={20} color={glassColors.textMuted} />
              </TouchableOpacity>
            </View>

            {mensajesSearch.active && (
              <View style={[localStyles.searchBar, searchFocus.isFocused && { borderBottomColor: glassColors.link }]}>
                <Ionicons name="search" size={16} color={colors.secondaryText} />
                <TextInput
                  style={[localStyles.searchInput, focusBorderStyles.inputNoOutline]}
                  placeholder="Buscar en la conversación"
                  placeholderTextColor={colors.secondaryText}
                  value={mensajesSearch.query}
                  onChangeText={mensajesSearch.setQuery}
                  onFocus={searchFocus.onFocus}
                  onBlur={searchFocus.onBlur}
                  autoFocus
                />
                {mensajesSearch.query.trim().length > 0 && (
                  mensajesSearch.isSearching ? (
                    <ActivityIndicator size="small" color={colors.lightTint} />
                  ) : (
                    <>
                      <Text style={localStyles.searchCounter}>
                        {mensajesSearch.matchIds.length > 0 ? `${mensajesSearch.currentIndex + 1}/${mensajesSearch.matchIds.length}` : '0/0'}
                      </Text>
                      <TouchableOpacity onPress={mensajesSearch.goPrev} disabled={mensajesSearch.matchIds.length === 0}>
                        <Ionicons name="chevron-up" size={18} color={mensajesSearch.matchIds.length > 0 ? colors.lightTint : colors.secondaryText} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={mensajesSearch.goNext} disabled={mensajesSearch.matchIds.length === 0}>
                        <Ionicons name="chevron-down" size={18} color={mensajesSearch.matchIds.length > 0 ? colors.lightTint : colors.secondaryText} />
                      </TouchableOpacity>
                    </>
                  )
                )}
              </View>
            )}

            <View style={styles.contentBody}>
              {isExpiredState && (
                <View style={styles.topSection}>
                  <View style={styles.expiredBanner}>
                    <Ionicons name="alert-circle-outline" size={20} color="#5F6368" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.expiredBannerTitle}>Conversación expirada</ThemedText>
                      <ThemedText style={styles.expiredBannerText}>No se pueden enviar mensajes.</ThemedText>
                    </View>
                  </View>
                </View>
              )}

              {/* Mensajes: usan todo el espacio disponible debajo del encabezado */}
              <View style={[styles.bitacoraContainer, styles.bitacoraFlex, styles.chatBitacoraContainer]}>
                  {!!solicitud.fecha_inicio && !!solicitud.fecha_fin && hasNextPage && (
                    <View style={styles.pinnedDatesBar}>
                      <ThemedText style={styles.pinnedDatesText}>
                        Fechas: {formatDateDDMMYYYY(new Date(solicitud.fecha_inicio))} {formatTimeHHMM(new Date(solicitud.fecha_inicio))} {'-'} {formatDateDDMMYYYY(new Date(solicitud.fecha_fin))} {formatTimeHHMM(new Date(solicitud.fecha_fin))}
                      </ThemedText>
                    </View>
                  )}
                  {isLoadingBitacora ? (
                    <ActivityIndicator size="small" color={colors.lightTint} style={{ marginTop: 20 }} />
                  ) : mensajes.length > 0 ? (
                    <ScrollView
                      ref={messagesScrollRef}
                      style={styles.messagesListFlex}
                      contentContainerStyle={[styles.messagesListContent, styles.chatMessagesListContent]}
                      showsVerticalScrollIndicator={false}
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
                              hideName={!solicitud.es_grupo}
                              estadoKey={estadoKey}
                              archivos={archivos}
                              fechaInicioMsg={fechaInicioMsg}
                              fechaFinMsg={fechaFinMsg}
                              esPropuesta={!!b.fecha_inicio_nueva}
                              isOptimistic={!!b.__optimistic}
                              isFailed={!!b.failed}
                              onRetryFailed={b.__optimistic ? () => handleRetryMessage(b.id) : undefined}
                              onOpenArchivo={handleOpenAsPreview}
                              onOpenImage={(archivo, uri) => openWithUri(buildArchivoFileItem({ ...archivo, _resolvedUri: uri }))}
                              seenBy={b.seen_by}
                              otherParticipantIds={todosParticipantesIds.filter(id => id !== b.usuario_id)}
                              resolveParticipantName={(uid) => {
                                const p = displayParticipantes.find(inv => inv.user_id === uid);
                                return p ? getParticipanteDisplayName(p) : '';
                              }}
                              highlighted={mensajesSearch.isCurrentMatch(String(b.id))}
                              onLayout={(y) => mensajesSearch.registerLayout(String(b.id), y)}
                            />
                          </React.Fragment>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <ThemedText style={{ color: colors.secondaryText, textAlign: 'center', marginTop: 20 }}>
                      No hay mensajes
                    </ThemedText>
                  )}
                </View>

                {/* Composer */}
                <View style={[styles.chatComposer, { marginBottom: keyboardVisible ? 0 : bottomInset }]}>
                  {pickedFiles.length > 0 && (
                    <View style={styles.chatComposerAttachments}>
                      {pickedFiles.map((f, i) => (
                        <View key={`${f.uri}-${i}`} style={styles.chatComposerAttachmentRow}>
                          <ThemedText style={styles.chatComposerAttachmentName} numberOfLines={1}>{f.name}</ThemedText>
                          <TouchableOpacity onPress={() => setPickedFiles(p => p.filter((_, j) => j !== i))} style={styles.chatComposerAttachmentAction}>
                            <Ionicons name="trash-outline" size={18} color={colors.secondaryText} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={[styles.chatComposerRow, composerFocus.isFocused && { borderColor: glassColors.link }]}>
                    {!isExpiredState && (
                      <TouchableOpacity style={styles.chatActionButton} onPress={handleAgregarAdjunto}>
                        <Ionicons name="attach" size={20} color={colors.lightTint} />
                      </TouchableOpacity>
                    )}

                    <TextInput
                      style={[styles.chatComposerInput, focusBorderStyles.inputNoOutline]}
                      placeholder="Escribir mensaje"
                      placeholderTextColor={colors.secondaryText}
                      value={messageDraft}
                      onChangeText={setMessageDraft}
                      onFocus={composerFocus.onFocus}
                      onBlur={composerFocus.onBlur}
                      multiline
                      editable={!isExpiredState}
                    />

                    {!isExpiredState && (
                      <TouchableOpacity
                        style={[styles.chatActionButton, styles.chatActionButtonPrimary, !canSendMessage && styles.messageActionButtonDisabled]}
                        onPress={handleEnviarMensaje}
                        disabled={!canSendMessage || isSendingMessage}
                      >
                        {isSendingMessage
                          ? <ActivityIndicator size="small" color={colors.lightTint} />
                          : <Ionicons name="send" size={18} color={colors.lightTint} />}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
            </View>

            {/* Modal Editar título */}
            <Modal visible={showEditTituloModal} transparent animationType="fade" onRequestClose={() => setShowEditTituloModal(false)}>
              <ModalKeyboardView style={{ flex: 1 }}>
                <TouchableWithoutFeedback onPress={() => setShowEditTituloModal(false)}>
                  <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                      <View style={styles.modalContent}>
                        <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Editar título</ThemedText>
                        <TextInput
                          style={[
                            localStyles.tituloInput,
                            focusBorderStyles.inputNoOutline,
                            tituloFocus.isFocused && { borderColor: glassColors.link },
                          ]}
                          value={tituloDraft}
                          onChangeText={setTituloDraft}
                          onFocus={tituloFocus.onFocus}
                          onBlur={tituloFocus.onBlur}
                          placeholder="Nombre del grupo"
                          placeholderTextColor={colors.secondaryText}
                          maxLength={100}
                          autoFocus
                        />
                        <View style={styles.modalActions}>
                          <TouchableOpacity onPress={() => setShowEditTituloModal(false)} style={styles.modalBtnCancel}>
                            <ThemedText style={{ color: glassColors.textMuted }}>Cancelar</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleGuardarTitulo}
                            style={[styles.modalBtnConfirm, { opacity: tituloDraft.trim().length === 0 ? 0.5 : 1 }]}
                            disabled={isUpdatingTitulo || tituloDraft.trim().length === 0}
                          >
                            {isUpdatingTitulo
                              ? <ActivityIndicator color={glassColors.text} />
                              : <ThemedText style={{ color: glassColors.text }}>Guardar</ThemedText>}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </ModalKeyboardView>
            </Modal>

            {/* Modal Participantes (solo grupos, se abre al tocar el nombre del grupo) */}
            <Modal visible={showParticipantesModal} transparent animationType="fade" onRequestClose={() => setShowParticipantesModal(false)}>
              <TouchableWithoutFeedback onPress={() => setShowParticipantesModal(false)}>
                <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                    <View style={styles.modalContent}>
                      <View style={localStyles.participantesModalHeader}>
                        <ThemedText type="subtitle">Participantes</ThemedText>
                        <TouchableOpacity onPress={() => setShowParticipantesModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close" size={22} color={colors.secondaryText} />
                        </TouchableOpacity>
                      </View>
                      <ParticipantesBlock
                        initialExpanded
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
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>

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
                    <View style={localStyles.archivosCard}>
                      <Text style={localStyles.archivosCardTitle}>Archivos de la conversación</Text>
                      {isLoadingArchivos ? (
                        <ActivityIndicator size="small" color={colors.lightTint} style={{ marginVertical: 20 }} />
                      ) : (
                        <>
                          <Text style={localStyles.archivosCardSubtitle}>
                            {countByKind(todosArchivos).images} imágenes · {countByKind(todosArchivos).files} archivos
                          </Text>
                          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                            <ArchivosModalContent
                              archivos={todosArchivos}
                              onOpen={archivo => {
                                setShowArchivosModal(false);
                                handleOpenAsPreview(archivo);
                              }}
                              onOpenImage={(archivo, uri) => {
                                setShowArchivosModal(false);
                                openWithUri(buildArchivoFileItem({ ...archivo, _resolvedUri: uri }));
                              }}
                            />
                          </ScrollView>
                        </>
                      )}
                      <TouchableOpacity
                        onPress={() => setShowArchivosModal(false)}
                        style={localStyles.archivosCloseBtn}
                      >
                        <Text style={localStyles.archivosCloseBtnText}>Cerrar</Text>
                      </TouchableOpacity>
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
              onClose={closeAlert}
              onDismiss={onModalDismiss}
            />

            <OperacionPendienteModal visible={isBlockingOperation} />
        </View>
      </ModalKeyboardView>

      <FilePreview file={previewFile} onClose={closePreview} />
    </View>
    </FullScreenPortal>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countByKind(archivos: any[]): { images: number; files: number } {
  let images = 0, files = 0;
  for (const a of archivos) {
    if (isImageFile(a.tipo, a.nombre, rutaR2(a))) images++;
    else files++;
  }
  return { images, files };
}

// ─── ArchivosModalContent ──────────────────────────────────────────────────────

function ArchivosModalContent({
  archivos,
  onOpen,
  onOpenImage,
}: {
  archivos: any[];
  onOpen: (a: any) => void;
  onOpenImage: (a: any, uri: string) => void;
}) {
  // En web no usamos el preview inline de imágenes (abre la página de
  // Cloudflare): se listan como archivos junto al resto.
  const isWeb = Platform.OS === 'web';
  const images = isWeb ? [] : archivos.filter(a => isImageFile(a.tipo, a.nombre, rutaR2(a)));
  const files = isWeb ? archivos : archivos.filter(a => !isImageFile(a.tipo, a.nombre, rutaR2(a)));

  if (archivos.length === 0) {
    return <Text style={localStyles.archivosEmpty}>No hay archivos en esta conversación</Text>;
  }

  return (
    <View style={{ gap: 16 }}>
      {images.length > 0 && (
        <View>
          <Text style={localStyles.archivosGroupLabel}>IMÁGENES</Text>
          <View style={localStyles.archivosGrid}>
            {images.map(a => (
              <View key={`img-${a.id}`} style={localStyles.archivosGridItem}>
                <InlineImageAttachment
                  archivoId={a.id}
                  nombre={typeof a.nombre === 'string' ? a.nombre : 'Imagen'}
                  onOpen={(uri) => onOpenImage(a, uri)}
                />
              </View>
            ))}
          </View>
        </View>
      )}
      {files.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={localStyles.archivosGroupLabel}>ARCHIVOS</Text>
          {files.map(a => (
            <FileAttachment
              key={`file-${a.id}`}
              file={buildArchivoFileItem(a)}
              onOpen={() => onOpen(a)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  // Igual tamaño que `conversacionStyles.closeButton`, pero gris/neutro como
  // `backButton` en vez del azul de acento compartido con Solicitud.tsx.
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  participantesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tituloInput: {
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(17,24,28,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,24,28,0.12)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 2,
  },
  searchCounter: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  archivosCard: {
    width: '90%',
    maxWidth: 450,
    maxHeight: '78%',
    padding: 24,
    ...glassStyles.modalCard,
  },
  archivosCardTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1c2024',
    marginBottom: 4,
  },
  archivosCardSubtitle: {
    fontSize: 13,
    color: '#7a8087',
    marginBottom: 16,
  },
  archivosGroupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9aa3ab',
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  archivosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  archivosGridItem: {
    width: '47%',
  },
  archivosGridThumb: {
    height: 104,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archivosGridCaption: {
    fontSize: 11.5,
    color: '#7a8087',
    marginTop: 4,
  },
  archivosEmpty: {
    fontSize: 14,
    color: '#9aa3ab',
    textAlign: 'center',
    paddingVertical: 16,
  },
  archivosCloseBtn: {
    marginTop: 16,
    alignSelf: 'flex-end',
  },
  archivosCloseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2543b',
  },
  pinnedDatesBar: {
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.neutralSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutralBorder,
  },
  pinnedDatesText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  contentBody: {
    flex: 1,
    backgroundColor: colors.componentBackground,
    paddingHorizontal: 16,
  },
  topSection: {
    paddingTop: 12,
  },
  bitacoraFlex: {
    flex: 1,
  },
  chatBitacoraContainer: {
    paddingTop: 0,
  },
  chatMessagesListContent: {
    paddingTop: 0,
    paddingBottom: 10,
  },
  messagesListFlex: {
    flex: 1,
  },
  chatComposer: {
    marginTop: 8,
  },
  chatComposerAttachments: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    gap: 6,
  },
  chatComposerAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutralSurface,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  chatComposerAttachmentName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginRight: 8,
  },
  chatComposerAttachmentAction: {
    padding: 4,
  },
  chatComposerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  chatComposerInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 110,
    paddingVertical: Platform.OS === 'web' ? 6 : 8,
    fontSize: 14,
    color: colors.text,
    ...(Platform.OS === 'web' ? { lineHeight: 20, textAlignVertical: 'center' as const } : null),
  },
  chatActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  chatActionButtonPrimary: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
});

const styles = { ...conversacionStyles, ...localStyles };
