import { fileTypeColor, getExt, isImageFile } from '@/components/filePreview';
import { showGlobalToast } from '@/shared/ui/toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileFile } from '../models/Archivo';
import {
  confirmarUploadArchivo,
  getUrlCargaArchivo,
  uploadArchivoR2,
} from '../services/archivosApi';
import { ARCHIVOS_KEYS } from '../viewmodels/useArchivos';

// ─── Design tokens (shared with the file preview module) ─────────────────────────
const INK = '#1c2024';
const MUTED = '#7a8087';
const MUTED2 = '#9aa3ab';
const LINE = '#e8eaed';
const CARD = '#f6f7f9';
const PANEL = '#eef0f2';
const BLUE = '#2f78e8';
const BLUE_BTN = '#5b86f0';
const BLUE_BTN_DISABLED = '#aebfe8';
const NAVY = '#2b1f5c';
const GREEN = '#1f9d57';
const PROGRESS_TRACK = '#e3e6ea';
const REMOVE_BG = '#dfe3e8';
const REMOVE_GLYPH = '#6b727a';

// ─── Types ───────────────────────────────────────────────────────────────────────
type FileStatus = 'pending' | 'uploading' | 'done';

interface SelFile {
  id: string;
  name: string;
  ext: string;
  bytes: number;
  uri: string;
  mimeType: string;
  isImage: boolean;
  status: FileStatus;
  progress: number; // 0..100, only meaningful while 'uploading'
  archivoId?: number;
  leaving?: boolean;
}

interface CrearDocumentoProps {
  visible: boolean;
  onClose: () => void;
  initialFiles?: MobileFile[];
  initialFolderId?: number | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  csv: 'text/csv',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  zip: 'application/zip',
  mp4: 'video/mp4',
};

function resolveMime(type: string | undefined, name: string): string {
  if (type && type.includes('/') && type !== 'application/octet-stream') return type;
  return MIME_MAP[getExt(type, name)] ?? type ?? 'application/octet-stream';
}

let _seq = 0;
function toSelFile(f: { name: string; uri: string; type?: string; size?: number }): SelFile {
  // DocumentPicker assets expose `mimeType`; MobileFile exposes `type`. Tolerate both.
  const rawType = f.type ?? (f as { mimeType?: string }).mimeType;
  const ext = getExt(rawType, f.name);
  return {
    id: `${f.uri}__${_seq++}`,
    name: f.name,
    ext,
    bytes: f.size ?? 0,
    uri: f.uri,
    mimeType: resolveMime(rawType, f.name),
    isImage: isImageFile(rawType, f.name),
    status: 'pending',
    progress: 0,
  };
}

// ─── Main component ──────────────────────────────────────────────────────────────
export function CrearDocumento({ visible, onClose, initialFiles, initialFolderId }: CrearDocumentoProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useAuth();
  const queryClient = useQueryClient();

  const [files, setFiles] = useState<SelFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const batchSizeRef = useRef(0);
  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Seed from the files picked by the caller; reset everything when the sheet closes.
  useEffect(() => {
    if (visible) {
      setFiles(initialFiles?.length ? initialFiles.map(toSelFile) : []);
    } else {
      setFiles([]);
      setUploading(false);
      batchSizeRef.current = 0;
      timersRef.current.forEach(clearInterval);
      timersRef.current.clear();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear any in-flight progress timers on unmount.
  useEffect(() => () => {
    timersRef.current.forEach(clearInterval);
    timersRef.current.clear();
  }, []);

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const pendingFiles = useMemo(() => files.filter(f => f.status === 'pending'), [files]);
  const doneFiles = useMemo(() => files.filter(f => f.status === 'done'), [files]);
  const uploadingNow = useMemo(() => files.filter(f => f.status === 'uploading').length, [files]);
  const completedInBatch = batchSizeRef.current - uploadingNow;

  const totalBytes = useMemo(() => files.reduce((s, f) => s + f.bytes, 0), [files]);
  const pendingBytes = useMemo(() => pendingFiles.reduce((s, f) => s + f.bytes, 0), [pendingFiles]);

  const allDone = files.length > 0 && pendingFiles.length === 0 && !uploading;
  const hasPending = pendingFiles.length > 0 && !uploading;
  const pendingLabel = pendingFiles.length === 1 ? '1 archivo' : `${pendingFiles.length} archivos`;

  const subtitle = useMemo(() => {
    if (files.length === 0) return 'Ninguno seleccionado';
    if (uploading) return `Subiendo… ${completedInBatch}/${batchSizeRef.current}`;
    if (allDone) {
      const n = doneFiles.length;
      return `${n} ${n === 1 ? 'archivo subido' : 'archivos subidos'}`;
    }
    if (doneFiles.length > 0 && pendingFiles.length > 0) {
      return `${doneFiles.length} subidos · ${pendingFiles.length} pendientes`;
    }
    return `${files.length} ${files.length === 1 ? 'archivo' : 'archivos'} · ${formatBytes(totalBytes)}`;
  }, [files.length, uploading, completedInBatch, allDone, doneFiles.length, pendingFiles.length, totalBytes]);

  // ─── File management ───────────────────────────────────────────────────────────
  const addFiles = useCallback((incoming: { name: string; uri: string; type?: string; size?: number }[]) => {
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.uri));
      const fresh = incoming.filter(p => !existing.has(p.uri)).map(toSelFile);
      if (!fresh.length) return prev;
      showGlobalToast(fresh.length === 1 ? 'Archivo agregado' : `${fresh.length} archivos agregados`);
      return [...prev, ...fresh];
    });
  }, []);

  // Remove animates the row out (opacity→0, translateX 14px, 200ms) before it leaves the list.
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, leaving: true } : f)));
    setTimeout(() => setFiles(prev => prev.filter(f => f.id !== id)), 200);
  }, []);

  const handleSelectFiles = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        addFiles(result.assets.map(a => ({
          name: a.name,
          uri: a.uri,
          type: a.mimeType ?? undefined,
          size: a.size ?? undefined,
        })));
      }
    } catch (err) {
      console.error('Error seleccionando documento', err);
      Alert.alert('Error', 'No se pudo seleccionar el archivo.');
    }
  }, [addFiles]);

  // ─── Upload ──────────────────────────────────────────────────────────────────
  const stopTimer = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) { clearInterval(t); timersRef.current.delete(id); }
  }, []);

  // Real transport (PUT to R2) has no progress events, so we animate an optimistic
  // bar up to 80% while the request is in flight, then snap to 90/100 on confirm.
  const startProgressTimer = useCallback((id: string) => {
    const timer = setInterval(() => {
      setFiles(prev => prev.map(f =>
        f.id === id && f.status === 'uploading'
          ? { ...f, progress: Math.min(f.progress + 3, 80) }
          : f
      ));
    }, 120);
    timersRef.current.set(id, timer);
  }, []);

  // Only PENDING files are uploaded. Files already in `done` keep their state —
  // they are never re-uploaded and never show progress again.
  const startUpload = useCallback(async () => {
    const pending = files.filter(f => f.status === 'pending');
    if (!pending.length || uploading) return;

    const token = tokens?.accessToken;
    if (!token) {
      Alert.alert('Error', 'No se identificó al usuario.');
      return;
    }

    batchSizeRef.current = pending.length;
    setUploading(true);
    setFiles(prev => prev.map(f =>
      f.status === 'pending' ? { ...f, status: 'uploading', progress: 0 } : f
    ));

    let urlsResponse: Awaited<ReturnType<typeof getUrlCargaArchivo>>;
    try {
      urlsResponse = await getUrlCargaArchivo(token, {
        files: pending.map(f => ({ fileName: f.name, contentType: f.mimeType })),
      });
    } catch {
      // Whole batch failed to start → revert to pending so the user can retry.
      setFiles(prev => prev.map(f =>
        f.status === 'uploading' ? { ...f, status: 'pending', progress: 0 } : f
      ));
      setUploading(false);
      batchSizeRef.current = 0;
      Alert.alert('Error', 'No se pudo iniciar la subida. Verificá tu conexión e intentá de nuevo.');
      return;
    }

    const results = await Promise.allSettled(
      pending.map(async (file, index) => {
        const urlInfo = urlsResponse.urls[index];
        startProgressTimer(file.id);
        try {
          await uploadArchivoR2(urlInfo.uploadUrl, file.uri, file.mimeType);
          stopTimer(file.id);
          setFiles(prev => prev.map(f => (f.id === file.id ? { ...f, progress: 90 } : f)));

          const archivado = await confirmarUploadArchivo(token, {
            nombre: file.name,
            ruta_r2: urlInfo.ruta_r2,
            tamaño: file.bytes,
            tipo: file.mimeType,
            ...(initialFolderId !== undefined ? { id_carpeta: initialFolderId } : {}),
          });

          setFiles(prev => prev.map(f =>
            f.id === file.id
              ? { ...f, status: 'done', progress: 100, archivoId: archivado.id }
              : f
          ));
          return archivado.id;
        } catch {
          stopTimer(file.id);
          setFiles(prev => prev.map(f =>
            f.id === file.id ? { ...f, status: 'pending', progress: 0 } : f
          ));
          return null;
        }
      })
    );

    setUploading(false);
    batchSizeRef.current = 0;

    const succeeded = results.filter(
      (r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled' && r.value !== null
    );

    if (succeeded.length) {
      queryClient.invalidateQueries({ queryKey: ARCHIVOS_KEYS.all });
    }

    const failedCount = pending.length - succeeded.length;
    if (failedCount > 0 && succeeded.length > 0) {
      Alert.alert('Subida parcial', `Se subieron ${succeeded.length} de ${pending.length} archivos. Los demás quedaron pendientes para reintentar.`);
    } else if (failedCount > 0) {
      Alert.alert('Error', 'No se pudo subir ningún archivo. Intentá de nuevo.');
    }
  }, [files, uploading, tokens, initialFolderId, startProgressTimer, stopTimer, queryClient]);

  // ─── Close ─────────────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (uploading) return; // never interrupt an in-flight batch

    if (pendingFiles.length > 0) {
      if (Platform.OS === 'web') {
        const ok = typeof globalThis.confirm === 'function'
          ? globalThis.confirm('Hay archivos sin subir. ¿Deseas descartarlos?')
          : true;
        if (ok) onClose();
        return;
      }
      Alert.alert('Descartar selección', 'Hay archivos sin subir. ¿Deseas descartarlos?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: onClose },
      ]);
      return;
    }
    onClose();
  }, [uploading, pendingFiles.length, onClose]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { paddingTop: insets.top || 12 }]}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerText}>
              <Text style={s.title} numberOfLines={2}>Archivos seleccionados</Text>
              <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={s.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color="#5a6068" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {files.length === 0 ? (
            <EmptyState onSelect={handleSelectFiles} />
          ) : (
            <ScrollView
              style={s.list}
              contentContainerStyle={s.listContent}
              showsVerticalScrollIndicator={false}
            >
              {files.map(file => (
                <FileRow key={file.id} file={file} onRemove={uploading ? undefined : removeFile} />
              ))}

              {/* Add more — available whenever not actively uploading */}
              {!uploading && (
                <TouchableOpacity style={s.addMore} onPress={handleSelectFiles} activeOpacity={0.7}>
                  <Ionicons name="add" size={18} color={NAVY} />
                  <Text style={s.addMoreText}>Seleccionar más archivos</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}

          {/* Footer */}
          {files.length > 0 && (
            <View style={[s.footer, { paddingBottom: (insets.bottom || 0) + 14 }]}>
              {uploading && (
                <View style={[s.footerBtn, { backgroundColor: BLUE_BTN_DISABLED }]}>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
                  <Text style={s.footerBtnLabel}>
                    Subiendo… {completedInBatch}/{batchSizeRef.current}
                  </Text>
                </View>
              )}

              {hasPending && (
                <>
                  <View style={s.footerSummary}>
                    <Text style={s.footerSummaryLabel}>Listos para subir</Text>
                    <Text style={s.footerSummaryValue} numberOfLines={1}>
                      {pendingFiles.length} · {formatBytes(pendingBytes)}
                    </Text>
                  </View>
                  <TouchableOpacity style={s.footerBtn} onPress={startUpload} activeOpacity={0.85}>
                    <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
                    <Text style={s.footerBtnLabel}>Subir {pendingLabel}</Text>
                  </TouchableOpacity>
                </>
              )}

              {allDone && (
                <View style={[s.footerBtn, s.footerBtnDone]}>
                  <Ionicons name="checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={s.footerBtnLabel}>Subida completa</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── FileRow ───────────────────────────────────────────────────────────────────
function FileRow({ file, onRemove }: { file: SelFile; onRemove?: (id: string) => void }) {
  const anim = useRef(new Animated.Value(0)).current; // 0 = visible, 1 = removed

  useEffect(() => {
    if (file.leaving) {
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [file.leaving, anim]);

  const animStyle = {
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }],
  };

  const isPending = file.status === 'pending';
  const isUploading = file.status === 'uploading';
  const isDone = file.status === 'done';

  return (
    <Animated.View style={[s.row, animStyle]}>
      <FileBadge file={file} />

      <View style={s.rowMeta}>
        <Text style={s.rowName} numberOfLines={1}>{file.name}</Text>
        {isUploading ? (
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${file.progress}%` }]} />
          </View>
        ) : (
          <Text style={s.rowSub} numberOfLines={1}>
            {file.ext.toUpperCase()} · {formatBytes(file.bytes)}{isDone && ' · Subido'}
          </Text>
        )}
      </View>

      {isPending && onRemove && (
        <TouchableOpacity
          onPress={() => onRemove(file.id)}
          style={s.removeBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          activeOpacity={0.7}
          accessibilityLabel="Quitar"
        >
          <Ionicons name="close" size={15} color={REMOVE_GLYPH} />
        </TouchableOpacity>
      )}
      {isUploading && <Text style={s.progressPct}>{file.progress}%</Text>}
      {isDone && (
        <View style={s.doneCheck}>
          <Ionicons name="checkmark" size={17} color="#fff" />
        </View>
      )}
    </Animated.View>
  );
}

// ─── FileBadge ───────────────────────────────────────────────────────────────────
// Image → real thumbnail (panel fallback). Other types → solid color + EXT label.
function FileBadge({ file }: { file: SelFile }) {
  const [imgError, setImgError] = useState(false);

  if (file.isImage && file.uri && !imgError) {
    return (
      <View style={[s.badge, { backgroundColor: PANEL }]}>
        <Image
          source={{ uri: file.uri }}
          style={s.badgeImage}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  if (file.isImage) {
    return (
      <View style={[s.badge, { backgroundColor: PANEL }]}>
        <Ionicons name="image-outline" size={22} color={MUTED2} />
      </View>
    );
  }

  return (
    <View style={[s.badge, { backgroundColor: fileTypeColor(file.ext) }]}>
      <Text style={s.badgeText}>{file.ext.toUpperCase().slice(0, 4)}</Text>
    </View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────────
function EmptyState({ onSelect }: { onSelect: () => void }) {
  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyIcon}>
        <Ionicons name="document-outline" size={40} color={MUTED2} />
      </View>
      <Text style={s.emptyTitle}>No hay archivos</Text>
      <Text style={s.emptySub}>Seleccioná uno o varios archivos para adjuntar.</Text>
      <TouchableOpacity style={s.emptyBtn} onPress={onSelect} activeOpacity={0.85}>
        <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={s.emptyBtnText}>Seleccionar archivos</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '94%',
    flexShrink: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 6,
  },
  headerText: { flex: 1, minWidth: 0, paddingRight: 12 },
  title: { fontSize: 20, fontWeight: '800', color: INK, lineHeight: 25, letterSpacing: -0.2 },
  subtitle: { fontSize: 13.5, color: MUTED, marginTop: 5 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PANEL,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  list: { flexGrow: 0 },
  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

  // File row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 10,
  },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 11,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeImage: { width: '100%', height: '100%' },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  rowMeta: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14.5, fontWeight: '600', color: INK },
  rowSub: { fontSize: 12.5, color: MUTED, marginTop: 3 },
  progressTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: PROGRESS_TRACK,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: BLUE_BTN },
  progressPct: { fontSize: 12.5, fontWeight: '700', color: BLUE, minWidth: 38, textAlign: 'right' },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: REMOVE_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Add more
  addMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.6,
    borderStyle: 'dashed',
    borderColor: '#c2c7cd',
    borderRadius: 13,
    paddingVertical: 14,
    backgroundColor: '#fff',
    gap: 9,
    marginTop: 2,
  },
  addMoreText: { fontSize: 15, fontWeight: '700', color: NAVY },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: PANEL,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: INK, marginBottom: 6 },
  emptySub: { fontSize: 13.5, color: MUTED, textAlign: 'center', maxWidth: 240, marginBottom: 18 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BLUE_BTN,
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 22,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  footerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  footerSummaryLabel: { fontSize: 13, color: MUTED },
  footerSummaryValue: { fontSize: 13, fontWeight: '600', color: INK },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE_BTN,
    borderRadius: 14,
    paddingVertical: 16,
  },
  footerBtnDone: { backgroundColor: GREEN },
  footerBtnLabel: { fontSize: 16.5, fontWeight: '700', color: '#fff' },
});
