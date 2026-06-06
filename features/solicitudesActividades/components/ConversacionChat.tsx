import { AlertModal } from '@/components/AlertModal';
import { ThemedText } from '@/components/themed-text';
import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { DocsList } from '@/features/docs/components/DocsList';
import { ParticipantesBlock } from './ParticipantesBlock';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { adminRoles, allRoles } from '@/shared/users/roles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
  useActualizarEstadoInvitacion,
  useActualizarInvitadosSolicitud,
  useChatArchivos,
  useReenviarSolicitud,
  useSolicitudBitacora,
} from '../viewmodels/useSolicitudes';
import { RoleUserSelectionModal } from './RoleUserSelectionModal';

const colors = Colors['light'];

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

  const isMutating = isUpdatingEstado || isSharing;

  // ─── Rol / permisos ───────────────────────────────────────────────────────
  const isConsejo = hasRole('consejo');
  const rolesForSelector = isConsejo ? adminRoles : allRoles;

  // ─── Estado UI ────────────────────────────────────────────────────────────
  const [showArchivosModal, setShowArchivosModal] = useState(false);
  const { data: chatArchivos, isLoading: isLoadingArchivos } = useChatArchivos(solicitudId, showArchivosModal);
  const [showFullBitacora, setShowFullBitacora] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const { alertModal, showModal, closeAlert } = useAlertModal();
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

  // ─── Derivados del prop solicitud ─────────────────────────────────────────

  const invitadosSinCreador = useMemo(() =>
    solicitud.invitados.filter(inv => inv.user_id !== solicitud.created_by),
    [solicitud.invitados, solicitud.created_by],
  );

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

  // ─── Marcar como visto ────────────────────────────────────────────────────

  useMarcarVisto({ solicitud, solicitudId, isHost, invitadosSinCreador, actualizarEstado });

  // ─── Enviar mensaje ───────────────────────────────────────────────────────

  const handleEnviarMensaje = useCallback(async () => {
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
  }, [canSendMessage, uploadPickedFiles, messageDraft, actualizarEstado, solicitudId, isHost, setPickedFiles]);

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
  }, [solicitudId, selectedUsersToShare, reenviarSolicitud, setShowShareModal]);

  const confirmCompartir = useCallback(() => {
    if (selectedUsersToShare.length === 0) { Alert.alert('Error', 'Selecciona al menos un usuario'); return; }
    ejecutarCompartir();
  }, [selectedUsersToShare, ejecutarCompartir]);

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
              {/* Archivos de la conversación */}
              <View style={[styles.sectionHeaderRow, { marginBottom: 4 }]}>
                <View />
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setShowArchivosModal(true)}
                  accessibilityLabel="Ver archivos de la conversación"
                >
                  <Ionicons name="information-circle-outline" size={22} color={colors.tint} />
                </TouchableOpacity>
              </View>

              {/* Participantes (solo grupos) */}
              {solicitud.es_grupo && (
                <ParticipantesBlock
                  titulo={solicitud.titulo}
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
                      ) : (
                        <ScrollView style={{ maxHeight: 360 }}>
                          <DocsList
                            archivos={todosArchivosChat}
                            onOpen={handleOpenArchivo}
                            emptyMessage="No hay archivos en esta conversación"
                          />
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
              onClose={closeAlert}
            />

            <OperacionPendienteModal visible={isMutating} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
});

const styles = { ...conversacionStyles, ...localStyles };
