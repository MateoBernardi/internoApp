import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useArchivoUrl } from '@/features/docs/viewmodels/useArchivos';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  archivoId: number;
  nombre: string;
  onOpen: (uri: string) => void;
}

export function InlineImageAttachment({ archivoId, nombre, onOpen }: Props) {
  const { data: uri, isLoading } = useArchivoUrl(archivoId);

  return (
    <TouchableOpacity
      onPress={() => uri ? onOpen(uri) : undefined}
      activeOpacity={uri ? 0.9 : 1}
      style={styles.wrapper}
    >
      {uri ? (
        <>
          <Image source={{ uri }} style={styles.image} contentFit="cover" transition={300} />
          <View style={styles.expandBadge}>
            <Ionicons name="expand-outline" size={14} color="#fff" />
          </View>
        </>
      ) : (
        <View style={styles.placeholder}>
          {isLoading
            ? <ActivityIndicator color="#7a8087" size="small" />
            : <Ionicons name="image-outline" size={36} color="#9aa3ab" />
          }
        </View>
      )}
      <View style={styles.captionRow}>
        <Ionicons name="image-outline" size={13} color="#7a8087" />
        <Text style={styles.caption} numberOfLines={1}>{nombre}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 11,
    backgroundColor: '#f0f2f4',
  },
  placeholder: {
    width: '100%',
    height: 200,
    borderRadius: 11,
    backgroundColor: '#f0f2f4',
    borderWidth: 1,
    borderColor: '#e8eaed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(17,21,27,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  caption: {
    flex: 1,
    fontSize: 13,
    color: '#7a8087',
  },
});
