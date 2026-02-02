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

interface DocumentoItemProps {
  archivo: Archivo;
  onPress: () => void;
  onOptions: () => void;
}

const colors = Colors['light'];

export function DocumentoItem({ archivo, onPress, onOptions }: DocumentoItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.itemContainer,
        { backgroundColor: colors.componentBackground },
      ]}
    >
      <Ionicons name="document-text-outline" size={28} color={colors.icon} style={styles.documentIcon} />
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
          <TouchableOpacity onPress={onOptions} style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.icon} />
          </TouchableOpacity>
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
  moreButton: {
    padding: 8,
    marginRight: -8,
  },
});
