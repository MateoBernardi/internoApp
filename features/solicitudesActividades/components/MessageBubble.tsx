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
  estadoKey: EstadoInvitacionDB | null;
  archivos: any[];
  fechaInicioMsg: Date | string | null;
  fechaFinMsg: Date | string | null;
  esPropuesta: boolean;
  isOptimistic?: boolean;
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
}

export function MessageBubble({
  id, usuarioNombre, usuarioApellido, createdAt, observacion, isOwn, hideTitle, estadoKey,
  archivos, fechaInicioMsg, fechaFinMsg, esPropuesta, isOptimistic, onOpenArchivo, onOpenImage,
  seenBy, otherParticipantIds, resolveParticipantName, highlighted, onLayout,
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
        <View style={conversacionStyles.bitacoraHeader}>
          <ThemedText style={[conversacionStyles.bitacoraUser, isOwn && conversacionStyles.bitacoraUserOwn]}>{usuarioNombre} {usuarioApellido}</ThemedText>
          <ThemedText style={[conversacionStyles.bitacoraDate, isOwn && conversacionStyles.bitacoraDateOwn]}>
            {formatDateDDMMYYYY(new Date(createdAt))} {formatTimeHHMM(new Date(createdAt))}
          </ThemedText>
        </View>
        <View style={conversacionStyles.bitacoraBody}>
          {!hideTitle && estadoKey && (
            <ThemedText style={[conversacionStyles.bitacoraAction, isOwn && conversacionStyles.bitacoraActionOwn]}>
              {estadoInvitacionMapping[estadoKey]}
            </ThemedText>
          )}
          {observacion && (
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
          {fechaInicioMsg && fechaFinMsg && (
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
          {isOptimistic && (
            <ThemedText style={[localStyles.pendingStatusText, isOwn && localStyles.pendingStatusTextOwn]}>Enviando…</ThemedText>
          )}
          {isOwn && seenBy !== undefined && (
            <TouchableOpacity
              onPress={() => setShowViewers(true)}
              style={localStyles.seenRow}
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

const localStyles = StyleSheet.create({
  bitacoraCardHighlighted: {
    borderWidth: 2,
    borderColor: '#FFC107',
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
  seenRow: {
    marginTop: 4,
    alignSelf: 'flex-end',
    padding: 2,
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
