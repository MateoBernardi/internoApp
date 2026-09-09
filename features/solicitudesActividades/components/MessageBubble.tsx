import { FileAttachment, InlineImageAttachment, isImageFile } from '@/components/filePreview';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { formatDateDDMMYYYY, formatTimeHHMM } from '../conversacion/constants';
import { buildArchivoFileItem, resolvedArchivoUri, rutaR2 } from '../conversacion/fileHelpers';
import { conversacionStyles } from '../conversacion/styles';
import { BitacoraVisto, EstadoInvitacionDB, estadoInvitacionMapping } from '../models/Solicitud';

const colors = Colors['light'];

export interface MessageBubbleProps {
  id: string;
  usuarioNombre: string;
  usuarioApellido: string;
  createdAt: string | Date;
  observacion: string | null;
  isOwn: boolean;
  hideTitle: boolean;
  /** En conversaciones privadas (1 a 1) el nombre es redundante — ya se
   * diferencia por lado (isOwn) y color de burbuja. */
  hideName?: boolean;
  estadoKey: EstadoInvitacionDB | null;
  archivos: any[];
  fechaInicioMsg: Date | string | null;
  fechaFinMsg: Date | string | null;
  esPropuesta: boolean;
  isOptimistic?: boolean;
  /** El envío optimista falló y no se persistió en el backend. */
  isFailed?: boolean;
  onRetryFailed?: () => void;
  onOpenArchivo: (archivo: any) => void;
  onOpenImage: (archivo: any, uri: string) => void;
  /** Quienes ya vieron esta entrada. `undefined` = backend sin soporte todavía (no se muestra nada). */
  seenBy?: BitacoraVisto[];
  /** Resto de participantes (sin el autor) contra quienes se mide "visto por todos". */
  otherParticipantIds: number[];
  resolveParticipantName: (userId: number) => string;
  /** Resaltado por la búsqueda dentro del chat (coincidencia actual). */
  highlighted?: boolean;
  onLayout?: (y: number) => void;
  /** Vista previa del mensaje al que este responde, si corresponde. */
  replyTo?: { id: string; usuarioNombre: string; usuarioApellido: string; observacion: string | null } | null;
  /** Presente solo cuando este mensaje admite ser respondido. */
  onReply?: () => void;
  /** Ir al mensaje citado. Presente solo cuando hay `replyTo`. */
  onReplyPress?: () => void;
}

function MessageBubbleComponent({
  id, usuarioNombre, usuarioApellido, createdAt, observacion, isOwn, hideTitle, hideName, estadoKey,
  archivos, fechaInicioMsg, fechaFinMsg, esPropuesta, isOptimistic, isFailed, onRetryFailed, onOpenArchivo, onOpenImage,
  seenBy, otherParticipantIds, resolveParticipantName, highlighted, onLayout, replyTo, onReply, onReplyPress,
}: MessageBubbleProps) {
  const [showViewers, setShowViewers] = useState(false);

  const seenIds = useMemo(() => new Set((seenBy ?? []).map(v => v.id_usuario)), [seenBy]);
  const nameById = useMemo(() => new Map((seenBy ?? []).map(v => [v.id_usuario, [v.nombre, v.apellido].filter(Boolean).join(' ').trim()])), [seenBy]);

  const allSeen = useMemo(
    () => !!seenBy && otherParticipantIds.length > 0 && otherParticipantIds.every(pid => seenIds.has(pid)),
    [seenBy, otherParticipantIds, seenIds],
  );

  return (
    <View
      key={id}
      style={[conversacionStyles.bitacoraItem, isOwn ? conversacionStyles.bitacoraItemOwn : conversacionStyles.bitacoraItemOther]}
      onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.y) : undefined}
    >
      <View style={[conversacionStyles.bitacoraCard, isOwn && conversacionStyles.bitacoraCardOwn, highlighted && localStyles.bitacoraCardHighlighted]}>
        {!hideName && (
          <View style={conversacionStyles.bitacoraHeader}>
            <ThemedText style={[conversacionStyles.bitacoraUser, isOwn && conversacionStyles.bitacoraUserOwn]}>{usuarioNombre} {usuarioApellido}</ThemedText>
          </View>
        )}
        <View style={conversacionStyles.bitacoraBody}>
          {!hideTitle && estadoKey && (
            <ThemedText style={[conversacionStyles.bitacoraAction, isOwn && conversacionStyles.bitacoraActionOwn]}>
              {estadoInvitacionMapping[estadoKey]}
            </ThemedText>
          )}
          {replyTo && (
            <TouchableOpacity
              activeOpacity={onReplyPress ? 0.6 : 1}
              disabled={!onReplyPress}
              onPress={onReplyPress}
              style={[localStyles.replyQuote, isOwn && localStyles.replyQuoteOwn]}
            >
              <ThemedText style={[localStyles.replyQuoteName, isOwn && localStyles.replyQuoteNameOwn]}>
                {replyTo.usuarioNombre} {replyTo.usuarioApellido}
              </ThemedText>
              <ThemedText
                style={[localStyles.replyQuoteText, isOwn && localStyles.replyQuoteTextOwn]}
                numberOfLines={1}
              >
                {replyTo.observacion || '...'}
              </ThemedText>
            </TouchableOpacity>
          )}
          {!!observacion && (
            <View style={conversacionStyles.bitacoraBubble}>
              <ThemedText style={[conversacionStyles.bitacoraText, isOwn && conversacionStyles.bitacoraTextOwn]}>{observacion}</ThemedText>
            </View>
          )}
          {archivos.length > 0 && (
            <View style={conversacionStyles.messageAttachments}>
              {archivos.map((a: any) => (
                isImageFile(a.tipo, a.nombre, rutaR2(a)) && Platform.OS !== 'web' ? (
                  <InlineImageAttachment
                    key={`archivo-${a.id}`}
                    archivoId={a.id}
                    nombre={typeof a.nombre === 'string' ? a.nombre : 'Imagen'}
                    uri={resolvedArchivoUri(a)}
                    onOpen={(uri) => onOpenImage(a, uri)}
                  />
                ) : (
                  <FileAttachment
                    key={`archivo-${a.id}`}
                    file={buildArchivoFileItem(a)}
                    onOpen={() => onOpenArchivo(a)}
                  />
                )
              ))}
            </View>
          )}
          {!!fechaInicioMsg && !!fechaFinMsg && (
            <View style={[localStyles.changeBubble, isOwn && localStyles.changeBubbleOwn]}>
              <ThemedText style={[localStyles.changeText, isOwn && localStyles.changeTextOwn]}>
                {esPropuesta ? 'Propuso cambio:' : 'Fechas:'}
              </ThemedText>
              <ThemedText style={[localStyles.changeText, isOwn && localStyles.changeTextOwn]}>
                Inicio: {formatDateDDMMYYYY(new Date(fechaInicioMsg))} {formatTimeHHMM(new Date(fechaInicioMsg))}
              </ThemedText>
              <ThemedText style={[localStyles.changeText, isOwn && localStyles.changeTextOwn]}>
                Fin: {formatDateDDMMYYYY(new Date(fechaFinMsg))} {formatTimeHHMM(new Date(fechaFinMsg))}
              </ThemedText>
            </View>
          )}
          {isOptimistic && isFailed && (
            <TouchableOpacity
              onPress={onRetryFailed}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={localStyles.failedRow}
              accessibilityRole="button"
              accessibilityLabel="No se pudo enviar, reintentar"
            >
              <Ionicons name="alert-circle" size={13} color={isOwn ? '#ffd9d3' : colors.error} />
              <ThemedText style={[localStyles.failedStatusText, isOwn && localStyles.failedStatusTextOwn]}>
                No se pudo enviar · Reintentar
              </ThemedText>
            </TouchableOpacity>
          )}
          {isOptimistic && !isFailed && (
            <ThemedText style={[localStyles.pendingStatusText, isOwn && localStyles.pendingStatusTextOwn]}>Enviando…</ThemedText>
          )}
          {!isOptimistic && (
            <View style={localStyles.metaRow}>
              {onReply && (
                <TouchableOpacity
                  onPress={onReply}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Responder a este mensaje"
                >
                  <Ionicons name="arrow-undo-outline" size={14} color={isOwn ? 'rgba(255,255,255,0.75)' : colors.secondaryText} />
                </TouchableOpacity>
              )}
              <ThemedText style={[conversacionStyles.bitacoraDate, isOwn && conversacionStyles.bitacoraDateOwn]}>
                {formatDateDDMMYYYY(new Date(createdAt))} {formatTimeHHMM(new Date(createdAt))}
              </ThemedText>
              {isOwn && seenBy !== undefined && (
                <TouchableOpacity
                  onPress={() => setShowViewers(true)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Ver quién vio este mensaje"
                >
                  <Ionicons
                    name={allSeen ? 'checkmark-done' : 'checkmark'}
                    size={14}
                    color={allSeen ? '#ffffff' : 'rgba(255,255,255,0.65)'}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      <Modal visible={showViewers} transparent animationType="fade" onRequestClose={() => setShowViewers(false)}>
        <TouchableWithoutFeedback onPress={() => setShowViewers(false)}>
          <View style={conversacionStyles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={[conversacionStyles.modalContent, localStyles.viewersModalContent]}>
                <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Visto por</ThemedText>
                {otherParticipantIds.length === 0 ? (
                  <Text style={localStyles.viewersEmpty}>No hay otros participantes</Text>
                ) : otherParticipantIds.map(pid => {
                  const seen = seenIds.has(pid);
                  const name = nameById.get(pid) || resolveParticipantName(pid);
                  return (
                    <View key={pid} style={localStyles.viewerRow}>
                      <Ionicons
                        name={seen ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={seen ? colors.lightTint : colors.secondaryText}
                      />
                      <Text style={localStyles.viewerName}>{name}</Text>
                    </View>
                  );
                })}
                <TouchableOpacity onPress={() => setShowViewers(false)} style={localStyles.viewersCloseBtn}>
                  <Text style={localStyles.viewersCloseBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

export const MessageBubble = React.memo(MessageBubbleComponent);

const localStyles = StyleSheet.create({
  bitacoraCardHighlighted: {
    borderWidth: 2,
    borderColor: '#FFC107',
  },
  replyQuote: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.lightTint,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  replyQuoteOwn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderLeftColor: '#ffffff',
  },
  replyQuoteName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lightTint,
  },
  replyQuoteNameOwn: {
    color: '#ffffff',
  },
  replyQuoteText: {
    fontSize: 12,
    color: colors.text,
  },
  replyQuoteTextOwn: {
    color: 'rgba(255,255,255,0.85)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 4,
  },
  changeBubble: {
    marginTop: 6,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 8,
  },
  changeBubbleOwn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  changeText: {
    fontSize: 13,
    color: colors.text,
  },
  changeTextOwn: {
    color: '#ffffff',
  },
  pendingStatusText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#9aa3ab',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  pendingStatusTextOwn: {
    color: 'rgba(255,255,255,0.75)',
  },
  failedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  failedStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.error,
  },
  failedStatusTextOwn: {
    color: '#ffd9d3',
  },
  viewersModalContent: {
    maxHeight: '60%',
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  viewerName: {
    fontSize: 14,
    color: colors.text,
  },
  viewersEmpty: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  viewersCloseBtn: {
    marginTop: 16,
    alignSelf: 'flex-end',
  },
  viewersCloseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.lightTint,
  },
});
