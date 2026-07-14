import { AlertModal } from '@/components/AlertModal';
import type { FileItem } from '@/components/filePreview';
import { FileAttachment, FilePreview, InlineImageAttachment, getExt, isImageFile, useOpenFilePreview } from '@/components/filePreview';
import { ThemedText } from '@/components/themed-text';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { generateIdempotencyKey } from '@/shared/idempotency';
import { ModalKeyboardView } from '@/shared/ui/ModalKeyboardView';
import { adminRoles, allRoles } from '@/shared/users/roles';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { MESSAGE_STATES, formatDateDDMMYYYY, formatTimeHHMM } from '../conversacion/constants';
import { useAdjuntos } from '../conversacion/hooks/useAdjuntos';
import { useAlertModal } from '../conversacion/hooks/useAlertModal';
import { useCompartirSelection } from '../conversacion/hooks/useCompartirSelection';
import { useMarcarVisto } from '../conversacion/hooks/useMarcarVisto';
import { useMessagesScroll } from '../conversacion/hooks/useMessagesScroll';
import { useParticipantesManager } from '../conversacion/hooks/useParticipantesManager';
import { conversacionStyles } from '../conversacion/styles';
import {
  EstadoInvitacionDB,
  ReenviarSolicitudRequest,
  SolicitudEnviada,
  estadoInvitacionMapping,
} from '../models/Solicitud';
import {
  solicitudesQueryKeys,
  useActualizarEstadoInvitacion,
  useActualizarInvitadosSolicitud,
  useChatArchivos,
  useReenviarSolicitud,
  useSolicitudBitacora,
} from '../viewmodels/useSolicitudes';
import { ParticipantesBlock } from './ParticipantesBlock';
import { RoleUserSelectionModal } from './RoleUserSelectionModal';

const colors = Colors['light'];

/** Entrada optimista de la bitácora: misma forma que un mensaje real más un id
 * temporal y la marca `__optimistic` para pintar el estado "Enviando…". */
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
}

interface ConversacionChatProps {
  solicitud: SolicitudEnviada;
  visible?: boolean;
  onClose?: () => void;
}

export function ConversacionChat({ solicitud, visible, onClose }: ConversacionChatProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { hasRole } = useRoleCheck();

  const solicitudId = solicitud.solicitud_id;
  const isHost = solicitud.is_host;
  const modalVisible = visible ?? true;
  const handleClose = onClose ?? (() => router.back());

  // ─── Estado UI (debe ir antes de los hooks que dependen de él) ───────────
  const [showFullBitacora, setShowFullBitacora] = useState(false);

  // ─── Queries / mutations ──────────────────────────────────────────────────
  const {
    data: bitacoraData,
    isLoading: isLoadingBitacora,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSolicitudBitacora(solicitudId, showFullBitacora);
  const bitacoraItems = useMemo(
    () => (bitacoraData?.pages ?? []).flatMap(p => p.data),
    [bitacoraData],
  );
  // retry:0 → 1 PUT por envío. El optimista + el refetch en onSettled reconcilian;
  // los reintentos solo duplican peticiones sobre falsos negativos de red.
  const { mutate: actualizarEstadoRaw } = useActualizarEstadoInvitacion({ retry: 0 });

  const actualizarEstado = useCallback<typeof actualizarEstadoRaw>(
    (variables, options) =>
      actualizarEstadoRaw({ ...variables, idempotencyKey: generateIdempotencyKey() }, options),
    [actualizarEstadoRaw],
  );
  const { mutate: reenviarSolicitud, isPending: isSharing } = useReenviarSolicitud();
  const { mutate: actualizarInvitados } = useActualizarInvitadosSolicitud();

  // El modal de bloqueo a pantalla completa se reserva SOLO para acciones
  // críticas/irreversibles (compartir). El envío usa feedback local
  // (isSendingMessage + spinner del botón), nunca el overlay global.
  const isBlockingOperation = isSharing;

  // ─── Rol / permisos ───────────────────────────────────────────────────────
  const isConsejo = hasRole('consejo');
  const rolesForSelector = isConsejo ? adminRoles : allRoles;

  // ─── Estado UI ────────────────────────────────────────────────────────────
  const [showArchivosModal, setShowArchivosModal] = useState(false);
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

  const {
    showShareModal, setShowShareModal,
    setSearchQuery,
    selectedUsersToShare, setSelectedUsersToShare,
    activeRole, setActiveRole,
    showRoleModal, setShowRoleModal,
    searchResults, isLoadingUsers,
    roleUsersData,
    handleToggleUserShare, handleSelectAllRoleUsers, handleDeselectAllRoleUsers,
  } = useCompartirSelection();

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

  const { messagesScrollRef, handleMessagesScroll, handleMessagesContentSizeChange } = useMessagesScroll({
    hasNextPage, isFetchingNextPage, fetchNextPage,
  });

  const chatOtherUser = useMemo(() => {
    if (solicitud.es_grupo) return null;
    return displayParticipantes.find(p => p.user_id !== user?.user_context_id) ?? displayParticipantes[0] ?? null;
  }, [solicitud.es_grupo, displayParticipantes, user?.user_context_id]);

  const chatTitle = solicitud.es_grupo
    ? solicitud.titulo
    : (chatOtherUser ? getParticipanteDisplayName(chatOtherUser) : solicitud.titulo);

  const chatSubtitle = solicitud.es_grupo
    ? `${displayParticipantes.length} participantes · toca para ver archivos`
    : 'Conversación directa · toca para ver archivos';

  const contentScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      requestAnimationFrame(() => {
        contentScrollRef.current?.scrollToEnd({ animated: false });
      });
    });
    return () => sub.remove();
  }, []);

  // ─── Derivados del prop solicitud ─────────────────────────────────────────

  const invitadosSinCreador = useMemo(() =>
    solicitud.invitados.filter(inv => inv.user_id !== solicitud.created_by),
    [solicitud.invitados, solicitud.created_by],
  );

  const todosArchivos = useMemo(() => {
    const archivosBase = chatArchivos ?? [];
    return archivosBase;
  }, [chatArchivos]);

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
  }, [bitacoraVisible, solicitud, isExpiredState, hasNextPage, pendingMessages]);

  const canSendMessage = useMemo(() => {
    if (isExpiredState) return false;
    return messageDraft.trim().length > 0 || pickedFiles.length > 0;
  }, [isExpiredState, messageDraft, pickedFiles]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // ─── Marcar como visto ────────────────────────────────────────────────────

  useMarcarVisto({ solicitud, solicitudId, isHost, invitadosSinCreador, actualizarEstado });

  // ─── Enviar mensaje ───────────────────────────────────────────────────────

  const handleEnviarMensaje = useCallback(async () => {
    if (!canSendMessage) return;

    setIsSendingMessage(true);
    const archivosIds = pickedFiles.length > 0 ? await uploadPickedFiles() : [];

    const trimmed = messageDraft.trim();
    if (!trimmed && archivosIds.length === 0) { setIsSendingMessage(false); return; }

    // Mensaje optimista: lo pintamos al instante y limpiamos el input. El id
    // temporal sirve para quitarlo cuando reconciliamos con el servidor.
    const tempId = `pending-${generateIdempotencyKey()}`;
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
    };
    setPendingMessages(prev => [...prev, optimistic]);
    setMessageDraft('');
    setPickedFiles([]);
    setIsSendingMessage(false);

    actualizarEstado(
      {
        solicitud_id: solicitudId,
        estado: isHost ? 'MODIFIED_BY_HOST' : 'MODIFIED',
        observacion: trimmed || null,
        ...(archivosIds.length > 0 ? { archivosIds } : {}),
      },
      {
        // Sin Alert ni rollback: en native el mensaje suele entregarse aunque el
        // fetch falle. Reconciliamos contra el servidor (refetch) y recién ahí
        // quitamos el optimista, para que la copia real ya esté en pantalla.
        onSettled: async () => {
          await queryClient.invalidateQueries({ queryKey: solicitudesQueryKeys.bitacora(solicitudId) });
          setPendingMessages(prev => prev.filter(m => m.id !== tempId));
        },
      },
    );
  }, [canSendMessage, uploadPickedFiles, messageDraft, pickedFiles, actualizarEstado, solicitudId, isHost, setPickedFiles, user, queryClient]);

  // ─── Preview de archivos ──────────────────────────────────────────────────

  const handleOpenAsPreview = useCallback((archivo: any) => openFile(archivo), [openFile]);

  // ─── Compartir ────────────────────────────────────────────────────────────

  const ejecutarCompartir = useCallback(() => {
    // Key por intento de compartir: vive en las variables de la mutación, así
    // los reintentos automáticos reusan exactamente la misma.
    const payload: ReenviarSolicitudRequest & { idempotencyKey?: string } = {
      solicitudId,
      nuevosInvitadosIds: selectedUsersToShare.map(u => u.user_context_id),
      idempotencyKey: generateIdempotencyKey(),
    };
    reenviarSolicitud(payload, {
      onSuccess: () => { setShowShareModal(false); Alert.alert('Éxito', 'Conversación compartida'); },
      onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Intenta nuevamente'),
    });
  }, [solicitudId, selectedUsersToShare, reenviarSolicitud, setShowShareModal]);

  const confirmCompartir = useCallback(() => {
    if (selectedUsersToShare.length === 0) { Alert.alert('Error', 'Selecciona al menos un usuario'); return; }
    ejecutarCompartir();
  }, [selectedUsersToShare, ejecutarCompartir]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <ModalKeyboardView style={styles.keyboardContainer}>
          <View style={[styles.container, { marginTop: insets.top }]}>

            {/* Header */}
            {/* paddingTop con el inset superior: el marginTop '10%' del container
               resuelve contra el ancho (~39px) y queda por debajo del status bar/notch
               de iOS, comiéndose el touch del botón de cerrar. */}
            <View style={[styles.modalHeader, { paddingTop: insets.top + 5 }]}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowArchivosModal(true)} activeOpacity={0.75}>
                <Text style={styles.modalHeaderTitle} numberOfLines={1}>{chatTitle}</Text>
                <Text style={styles.modalHeaderSubtitle} numberOfLines={1}>{chatSubtitle}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowArchivosModal(true)} style={styles.closeButton}>
                <Ionicons name="folder-outline" size={22} color={colors.lightTint} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="chevron-down" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={contentScrollRef}
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {/* Participantes (solo grupos) */}
              {solicitud.es_grupo && (
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
              )}

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
                  {!!solicitud.fecha_inicio && !!solicitud.fecha_fin && hasNextPage && (
                    <View style={styles.pinnedDatesBar}>
                      <ThemedText style={styles.pinnedDatesText}>
                        Fechas: {formatDateDDMMYYYY(new Date(solicitud.fecha_inicio))} {formatTimeHHMM(new Date(solicitud.fecha_inicio))} {'→'} {formatDateDDMMYYYY(new Date(solicitud.fecha_fin))} {formatTimeHHMM(new Date(solicitud.fecha_fin))}
                      </ThemedText>
                    </View>
                  )}
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
                                      // En web no usamos el preview inline de imágenes (abre la
                                      // página de Cloudflare): las mostramos como adjunto de archivo.
                                      isImageFile(a.tipo, a.nombre, rutaR2(a)) && Platform.OS !== 'web' ? (
                                        <InlineImageAttachment
                                          key={`archivo-${a.id}`}
                                          archivoId={a.id}
                                          nombre={typeof a.nombre === 'string' ? a.nombre : 'Imagen'}
                                          onOpen={(uri) => openWithUri(buildFileItem({ ...a, _resolvedUri: uri }))}
                                        />
                                      ) : (
                                        <FileAttachment
                                          key={`archivo-${a.id}`}
                                          file={buildFileItem(a)}
                                          onOpen={() => handleOpenAsPreview(a)}
                                        />
                                      )
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
                                {b.__optimistic && (
                                  <ThemedText style={styles.pendingStatusText}>Enviando…</ThemedText>
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
              <ModalKeyboardView style={{ flex: 1 }}>
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
              </ModalKeyboardView>
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
                                openWithUri(buildFileItem({ ...archivo, _resolvedUri: uri }));
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
      </View>

      <FilePreview file={previewFile} onClose={closePreview} />
    </Modal>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Stored R2 object key; recovers the real extension when the display name was
// renamed or stripped. Raw DTOs expose it as `ruta_r2`, mapped models as `url`.
const rutaR2 = (a: any): unknown => a?.ruta_r2 ?? a?.url;

function buildFileItem(archivo: any): FileItem {
  const tipo: string = typeof archivo.tipo === 'string' ? archivo.tipo : '';
  const nombre: string = typeof archivo.nombre === 'string' ? archivo.nombre : 'Archivo';
  const ruta = rutaR2(archivo);
  return {
    id: String(archivo.id),
    kind: isImageFile(tipo, nombre, ruta) ? 'image' : 'file',
    name: nombre,
    ext: getExt(tipo, nombre, ruta),
    size: archivo.tamaño ? formatBytes(archivo.tamaño) : undefined,
    uri: typeof archivo._resolvedUri === 'string' ? archivo._resolvedUri : '',
  };
}

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
              file={buildFileItem(a)}
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
  archivosCard: {
    width: '90%',
    maxWidth: 450,
    maxHeight: '78%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  pendingStatusText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#9aa3ab',
    marginTop: 4,
    alignSelf: 'flex-end',
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
});

const styles = { ...conversacionStyles, ...localStyles };
