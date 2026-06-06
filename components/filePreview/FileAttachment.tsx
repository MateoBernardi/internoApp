import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FileTypeBadge, fileTypeColor } from './fileTypeColor';
import type { FileItem } from './types';

interface Props {
  file: FileItem;
  onOpen: () => void;
}

export function FileAttachment({ file, onOpen }: Props) {
  if (file.kind === 'image') {
    return <ImageAttachment file={file} onOpen={onOpen} />;
  }
  return <FileChip file={file} onOpen={onOpen} />;
}

function ImageAttachment({ file, onOpen }: Props) {
  return (
    <TouchableOpacity onPress={onOpen} activeOpacity={0.85} style={styles.imageWrapper}>
      <View style={[styles.imagePlaceholder, { backgroundColor: fileTypeColor(file.ext) + '22' }]}>
        <Ionicons name="image-outline" size={36} color={fileTypeColor(file.ext)} style={{ opacity: 0.6 }} />
      </View>
      <View style={styles.expandBadge}>
        <Ionicons name="expand-outline" size={14} color="#fff" />
      </View>
      <View style={styles.imageCaptionRow}>
        <Ionicons name="image-outline" size={13} color="#7a8087" />
        <Text style={styles.imageCaption} numberOfLines={1}>{file.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

function FileChip({ file, onOpen }: Props) {
  return (
    <TouchableOpacity onPress={onOpen} activeOpacity={0.8} style={styles.chip}>
      <FileTypeBadge ext={file.ext} />
      <View style={styles.chipMeta}>
        <Text style={styles.chipName} numberOfLines={1}>{file.name}</Text>
        <Text style={styles.chipSub} numberOfLines={1}>
          {file.ext.toUpperCase()}{file.size ? ` · ${file.size}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#9aa3ab" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  imageWrapper: {
    width: '100%',
  },
  imagePlaceholder: {
    height: 158,
    borderRadius: 11,
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
  imageCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  imageCaption: {
    flex: 1,
    fontSize: 13,
    color: '#7a8087',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8eaed',
    borderRadius: 12,
    padding: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  chipMeta: {
    flex: 1,
  },
  chipName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1c2024',
  },
  chipSub: {
    fontSize: 12.5,
    color: '#7a8087',
    marginTop: 1,
  },
});
