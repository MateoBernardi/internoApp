import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Archivo } from '../models/Archivo';
import { isArchivoInAuditWindow } from '../utils/auditWindow';

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const getTipoIcon = (nombreArchivo: string): { icon: string; color: string } => {
  const extension = nombreArchivo.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, { icon: string; color: string }> = {
    'pdf': { icon: 'document-text', color: '#ef4444' },
    'doc': { icon: 'document-text', color: '#2563eb' },
    'docx': { icon: 'document-text', color: '#2563eb' },
    'word': { icon: 'document-text', color: '#2563eb' },
    'xls': { icon: 'document-text', color: '#16a34a' },
    'xlsx': { icon: 'document-text', color: '#16a34a' },
    'excel': { icon: 'document-text', color: '#16a34a' },
    'csv': { icon: 'document-text', color: '#16a34a' },
    'jpg': { icon: 'image', color: '#eab308' },
    'jpeg': { icon: 'image', color: '#eab308' },
    'png': { icon: 'image', color: '#eab308' },
    'gif': { icon: 'image', color: '#eab308' },
    'bmp': { icon: 'image', color: '#eab308' },
    'svg': { icon: 'image', color: '#eab308' },
    'txt': { icon: 'document-text', color: '#6b7280' },
    'mp4': { icon: 'play-circle', color: '#8b5cf6' },
    'avi': { icon: 'play-circle', color: '#8b5cf6' },
    'mov': { icon: 'play-circle', color: '#8b5cf6' },
    'mkv': { icon: 'play-circle', color: '#8b5cf6' },
    'mp3': { icon: 'musical-note', color: '#06b6d4' },
    'wav': { icon: 'musical-note', color: '#06b6d4' },
    'flac': { icon: 'musical-note', color: '#06b6d4' },
    'zip': { icon: 'folder', color: '#f97316' },
    'rar': { icon: 'folder', color: '#f97316' },
    '7z': { icon: 'folder', color: '#f97316' },
  };
  return iconMap[extension] || { icon: 'document-text', color: '#9ca3af' };
};

interface DocumentoItemProps {
  archivo: Archivo;
  currentUserId?: number;
  onPress: () => void;
  onOptions: () => void;
  onDelete?: () => void;
}

const colors = Colors['light'];

function DescripcionModal({
  visible,
  titulo,
  nombre,
  onClose,
}: {
  visible: boolean;
  titulo: string;
  nombre: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalCard, { marginBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle} numberOfLines={1}>{nombre}</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={20} color={glassColors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalDivider} />
          <ThemedText style={styles.modalDescripcion}>{titulo}</ThemedText>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DocumentoItem({ archivo, currentUserId, onPress, onOptions, onDelete }: DocumentoItemProps) {
  const { icon, color } = getTipoIcon(archivo.nombre);
  const [showDescripcion, setShowDescripcion] = useState(false);
  const showUnreadBadge =
    currentUserId !== undefined &&
    archivo.creadorId !== currentUserId &&
    !archivo.openedAt &&
    isArchivoInAuditWindow(archivo.createdAt);

  return (
    <>
      {/*
        El View exterior contiene la fila completa.
        El TouchableOpacity solo cubre icono + texto (left side).
        Los botones de acción viven fuera del TouchableOpacity para que
        sus onPress no compitan con el onPress del item.
      */}
      <View style={[styles.itemContainer, showUnreadBadge && styles.itemContainerUnread]}>
        <TouchableOpacity onPress={onPress} style={styles.itemPressable} activeOpacity={0.7}>
          <Ionicons name={icon as any} size={28} color={color} style={styles.documentIcon} />
          <View style={styles.itemContent}>
            <ThemedText
              type="defaultSemiBold"
              numberOfLines={1}
              style={showUnreadBadge ? styles.nombreUnread : undefined}
            >
              {archivo.nombre}
            </ThemedText>
            <ThemedText style={[styles.creador, { color: colors.secondaryText }]}>
              De: {archivo.nombreCreador} {archivo.apellidoCreador}
            </ThemedText>
            <ThemedText style={[styles.dateText, { color: colors.secondaryText }]}>
              {formatBytes(archivo.tamaño)} • {new Date(archivo.createdAt).toLocaleDateString()}
            </ThemedText>
          </View>
          {showUnreadBadge && <View style={styles.unreadDot} />}
        </TouchableOpacity>

        {/* Botones fuera del TouchableOpacity — cada uno maneja su propio onPress */}
        <View style={styles.actionButtons}>
          {!!archivo.titulo && (
            <TouchableOpacity
              onPress={() => setShowDescripcion(true)}
              style={styles.actionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="information-circle-outline" size={18} color={glassColors.link} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              style={styles.actionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={glassColors.error} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onOptions}
            style={styles.actionButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={glassColors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {!!archivo.titulo && (
        <DescripcionModal
          visible={showDescripcion}
          titulo={archivo.titulo}
          nombre={archivo.nombre}
          onClose={() => setShowDescripcion(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    marginHorizontal: '4%',
    marginVertical: 4,
    paddingHorizontal: '3%',
    paddingVertical: '3%',
    flexDirection: 'row',
    alignItems: 'center',
    ...glassStyles.card,
  },
  // Item con acción pendiente: fill casi sólido + título en negrita para
  // que resalte por sobre los items normales (nunca se atenúan los normales).
  itemContainerUnread: {
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  nombreUnread: {
    fontWeight: '700',
  },
  // Ocupa todo el espacio disponible menos los botones de acción
  itemPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentIcon: {
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'column',
    gap: 3,
  },
  creador: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 11,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    backgroundColor: '#FF3B30',
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,28,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.1)',
  },
  // Modal
  modalBackdrop: {
    ...glassStyles.modalOverlay,
    justifyContent: 'flex-end',
    paddingHorizontal: '4%',
  },
  modalCard: {
    paddingHorizontal: '5%',
    paddingTop: '4%',
    paddingBottom: '5%',
    ...glassStyles.modalCard,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.icon,
    marginBottom: 14,
  },
  modalDescripcion: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
  },
});