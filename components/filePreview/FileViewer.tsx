import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isPdfFile } from './fileKind';
import { fileTypeColor } from './fileTypeColor';
import { PdfBody } from './PdfBody';
import { useFileActions } from './useFileActions';
import type { FileItem } from './types';

interface Props {
  file: FileItem;
  onClose: () => void;
}

export function FileViewer({ file, onClose }: Props) {
  const { share, download, print, busy } = useFileActions(file);
  const { top, bottom } = useSafeAreaInsets();

  const subtitle = [file.ext.toUpperCase(), file.size, file.sender].filter(Boolean).join(' · ');
  const canRenderPdf = !!file.uri && isPdfFile(file.ext, file.name);

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

      {/* Body */}
      {canRenderPdf ? (
        <View style={styles.pdfBody}>
          <PdfBody uri={file.uri} name={file.name} />
        </View>
      ) : (
        <View style={styles.body}>
          {file.textPreview ? (
            <ScrollView style={styles.textCard} contentContainerStyle={styles.textCardContent}>
              <Text style={styles.textPreview}>{file.textPreview}</Text>
            </ScrollView>
          ) : (
            <View style={styles.hero}>
            <View style={[styles.heroBadge, { backgroundColor: fileTypeColor(file.ext) }]}>
              <Text style={styles.heroBadgeText}>{file.ext.toUpperCase().slice(0, 4)}</Text>
            </View>
            <Text style={styles.heroFilename} numberOfLines={2}>{file.name}</Text>
            <Text style={styles.heroMeta}>
              {file.ext.toUpperCase()}{file.size ? ` · ${file.size}` : ''}
            </Text>
            <Text style={styles.heroNote}>Vista previa no disponible para este tipo</Text>
            </View>
          )}
        </View>
      )}

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
    paddingHorizontal: 20,
  },
  pdfBody: {
    flex: 1,
    backgroundColor: '#0e1216',
  },
  textCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '80%',
  },
  textCardContent: {
    padding: 16,
  },
  textPreview: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
    color: '#1c2024',
  },
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  heroBadge: {
    width: 96,
    height: 96,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  heroFilename: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 280,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13.5,
  },
  heroNote: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13.5,
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
