import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Archivo } from '../models/Archivo';

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// Mapeo de extensiones a iconos con colores
const getTipoIcon = (nombreArchivo: string): { icon: string; color: string } => {
  const extension = nombreArchivo.split('.').pop()?.toLowerCase() || '';
  
  const iconMap: Record<string, { icon: string; color: string }> = {
    // PDF - Rojo
    'pdf': { icon: 'document-text', color: '#ef4444' },
    // Word - Azul
    'doc': { icon: 'document-text', color: '#2563eb' },
    'docx': { icon: 'document-text', color: '#2563eb' },
    'word': { icon: 'document-text', color: '#2563eb' },
    // Excel - Verde
    'xls': { icon: 'document-text', color: '#16a34a' },
    'xlsx': { icon: 'document-text', color: '#16a34a' },
    'excel': { icon: 'document-text', color: '#16a34a' },
    'csv': { icon: 'document-text', color: '#16a34a' },
    // Imágenes - Amarillo
    'jpg': { icon: 'image', color: '#eab308' },
    'jpeg': { icon: 'image', color: '#eab308' },
    'png': { icon: 'image', color: '#eab308' },
    'gif': { icon: 'image', color: '#eab308' },
    'bmp': { icon: 'image', color: '#eab308' },
    'svg': { icon: 'image', color: '#eab308' },
    // Texto - Gris
    'txt': { icon: 'document-text', color: '#6b7280' },
    // Vídeos
    'mp4': { icon: 'play-circle', color: '#8b5cf6' },
    'avi': { icon: 'play-circle', color: '#8b5cf6' },
    'mov': { icon: 'play-circle', color: '#8b5cf6' },
    'mkv': { icon: 'play-circle', color: '#8b5cf6' },
    // Audio
    'mp3': { icon: 'musical-note', color: '#06b6d4' },
    'wav': { icon: 'musical-note', color: '#06b6d4' },
    'flac': { icon: 'musical-note', color: '#06b6d4' },
    // Comprimidos
    'zip': { icon: 'folder', color: '#f97316' },
    'rar': { icon: 'folder', color: '#f97316' },
    '7z': { icon: 'folder', color: '#f97316' },
  };
  
  return iconMap[extension] || { icon: 'document-text', color: '#9ca3af' };
};

interface DocumentoItemProps {
  archivo: Archivo;
  onPress: () => void;
  onOptions: () => void;
  onDelete?: () => void;
}

const colors = Colors['light'];

export function DocumentoItem({ archivo, onPress, onOptions, onDelete }: DocumentoItemProps) {
  const { icon, color } = getTipoIcon(archivo.nombre);
  
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.itemContainer,
        { backgroundColor: colors.componentBackground },
      ]}
    >
      <Ionicons name={icon as any} size={28} color={color} style={styles.documentIcon} />
      <View style={styles.itemContent}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {archivo.nombre}
        </ThemedText>
        <ThemedText style={[styles.creador, { color: colors.secondaryText }]}>
          De: {archivo.nombreCreador} {archivo.apellidoCreador}
        </ThemedText>
        <View style={styles.footerContainer}>
          <ThemedText style={[styles.dateText, { color: colors.secondaryText }]}>
            {formatBytes(archivo.tamaño)} • {new Date(archivo.createdAt).toLocaleDateString()}
          </ThemedText>
          <View style={styles.actionButtons}>
            {onDelete && (
              <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
                <Ionicons name="trash" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onOptions} style={styles.moreButton}>
              <Ionicons name="ellipsis-vertical" size={18} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  documentIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'column',
  },
  creador: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateText: {
    fontSize: 11,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButton: {
    padding: 8,
    marginRight: -4,
  },
  moreButton: {
    padding: 8,
    marginRight: -8,
  },
});
