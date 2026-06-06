import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface PendingFile {
  name: string;
  uri: string;
  type: string;
  size?: number;
}

export interface DocsListItem {
  id: number;
  nombre: string;
  tipo?: string;
}

interface DocsListProps {
  archivos: DocsListItem[];
  pendingFiles?: PendingFile[];
  onOpen: (archivoId: number) => void;
  onRemove?: (archivoId: number) => void;
  emptyMessage?: string;
}

const colors = Colors['light'];

function getFileIcon(nombre: string): { icon: string; color: string } {
  const ext = nombre.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, { icon: string; color: string }> = {
    pdf:  { icon: 'document-text', color: '#ef4444' },
    doc:  { icon: 'document-text', color: '#2563eb' },
    docx: { icon: 'document-text', color: '#2563eb' },
    word: { icon: 'document-text', color: '#2563eb' },
    xls:  { icon: 'document-text', color: '#16a34a' },
    xlsx: { icon: 'document-text', color: '#16a34a' },
    csv:  { icon: 'document-text', color: '#16a34a' },
    jpg:  { icon: 'image', color: '#eab308' },
    jpeg: { icon: 'image', color: '#eab308' },
    png:  { icon: 'image', color: '#eab308' },
    gif:  { icon: 'image', color: '#eab308' },
    svg:  { icon: 'image', color: '#eab308' },
    txt:  { icon: 'document-text', color: '#6b7280' },
    mp4:  { icon: 'play-circle', color: '#8b5cf6' },
    avi:  { icon: 'play-circle', color: '#8b5cf6' },
    mov:  { icon: 'play-circle', color: '#8b5cf6' },
    mkv:  { icon: 'play-circle', color: '#8b5cf6' },
    mp3:  { icon: 'musical-note', color: '#06b6d4' },
    wav:  { icon: 'musical-note', color: '#06b6d4' },
    flac: { icon: 'musical-note', color: '#06b6d4' },
    zip:  { icon: 'folder', color: '#f97316' },
    rar:  { icon: 'folder', color: '#f97316' },
    '7z': { icon: 'folder', color: '#f97316' },
  };
  return map[ext] ?? { icon: 'document-text', color: '#9ca3af' };
}

export function DocsList({
  archivos,
  pendingFiles = [],
  onOpen,
  onRemove,
  emptyMessage = 'Sin archivos enlazados',
}: DocsListProps) {
  if (archivos.length === 0 && pendingFiles.length === 0) {
    return <Text style={styles.emptyText}>{emptyMessage}</Text>;
  }

  return (
    <View style={styles.list}>
      {archivos.map((archivo) => {
        const { icon, color } = getFileIcon(archivo.nombre);
        return (
          <View key={archivo.id} style={styles.item}>
            <TouchableOpacity
              onPress={() => onOpen(archivo.id)}
              style={styles.itemPressable}
              activeOpacity={0.7}
            >
              <Ionicons name={icon as any} size={26} color={color} style={styles.fileIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.fileName} numberOfLines={1}>{archivo.nombre}</Text>
                <Text style={styles.fileMeta} numberOfLines={1}>{archivo.tipo}</Text>
              </View>
            </TouchableOpacity>
            {onRemove && (
              <TouchableOpacity
                onPress={() => onRemove(archivo.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.actionBtn}
              >
                <Ionicons name="trash-outline" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {pendingFiles.map((file, index) => (
        <View key={`${file.uri}-${index}`} style={styles.item}>
          <View style={styles.itemPressable}>
            <Ionicons name="document-text" size={26} color="#9ca3af" style={styles.fileIcon} />
            <View style={styles.itemContent}>
              <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
              <Text style={styles.fileMeta}>Subiendo...</Text>
            </View>
          </View>
          <ActivityIndicator size="small" color={colors.tint} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  list: {
    gap: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.componentBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  itemPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    marginRight: 10,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  fileMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionBtn: {
    padding: 6,
    marginLeft: 4,
  },
});
