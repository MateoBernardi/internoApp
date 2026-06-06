import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFileActions } from './useFileActions';
import type { FileItem } from './types';

interface Props {
  file: FileItem;
  onClose: () => void;
}

export function ImageViewer({ file, onClose }: Props) {
  const { share, download, print, busy } = useFileActions(file);
  const { top, bottom } = useSafeAreaInsets();

  const subtitle = [file.sender, file.date].filter(Boolean).join(' · ');

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: top }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeGlyph}>×</Text>
        </TouchableOpacity>
        <View style={styles.topTitleBlock}>
          <Text style={styles.topTitle} numberOfLines={1}>{file.name}</Text>
          {subtitle ? (
            <Text style={styles.topSubtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      {/* Image body */}
      <View style={styles.body}>
        <Image
          source={{ uri: file.uri }}
          style={styles.image}
          contentFit="contain"
          transition={200}
        />
        <View style={styles.captionChip}>
          <Text style={styles.captionText}>
            {file.ext.toUpperCase()}{file.size ? ` · ${file.size}` : ''}
          </Text>
        </View>
      </View>

      {/* Action bar */}
      <View style={[styles.actionBar, { paddingBottom: Math.max(bottom, 16) }]}>
        <ActionBtn icon="share-outline" label="Compartir" onPress={share} disabled={busy} />
        <ActionBtn icon="download-outline" label="Descargar" onPress={download} disabled={busy} />
        <ActionBtn icon="print-outline" label="Imprimir" onPress={print} disabled={busy} />
      </View>
    </View>
  );
}

function ActionBtn({ icon, label, onPress, disabled }: { icon: any; label: string; onPress: () => void; disabled: boolean }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} disabled={disabled} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color="#fff" />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0e1216',
  },
  topBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '400',
  },
  topTitleBlock: {
    flex: 1,
  },
  topTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  topSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  captionChip: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  captionText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 13,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '600',
  },
});
