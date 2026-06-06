import { AlertModal } from '@/components/AlertModal';
import { FileTypeBadge } from '@/components/filePreview';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ArchivoUso } from '@/features/docs/models/Archivo';
import {
  confirmarUploadArchivo,
  getUrlCargaArchivo,
  uploadArchivoR2,
} from '@/features/docs/services/archivosApi';
import { useAlertModal } from '@/features/solicitudesActividades/conversacion/hooks/useAlertModal';
import { ImagePicker } from '@/features/solicitudesActividades/conversacion/constants';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Design tokens ──────────────────────────────────────────────────────────────

const INK = '#1c2024';
const MUTED = '#7a8087';
const LINE = '#e8eaed';
const CARD = '#f6f7f9';
const PANEL = '#eef0f2';
const BLUE_BTN = '#5b86f0';
const NAVY = '#2b1f5c';
const GREEN = '#1f9d57';
const PROGRESS_TRACK = '#e3e6ea';
const REMOVE_BG = '#dfe3e8';
const REMOVE_GLYPH = '#6b727a';

// ─── Types ──────────────────────────────────────────────────────────────────────

type FileStatus = 'pending' | 'uploading' | 'done';

interface SelFile {
  id: string;
  name: string;
  ext: string;
  bytes: number;
  uri: string;
  mimeType: string;
  status: FileStatus;
  progress: number;
  archivoId?: number;
}

export interface PickedFileInput {
  name: string;
  uri: string;
  type: string;
  size?: number;
}

export interface FileUploadSheetProps {
  visible: boolean;
  onClose: () => void;
  onFilesUploaded?: (archivoIds: number[]) => void;
  archivoUso?: ArchivoUso;
  usuariosCompartidos?: number[];
  initialFiles?: PickedFileInput[];
  idempotencyKey?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getExtFromName(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot !== -1 ? name.slice(dot + 1).toLowerCase() : 'bin';
}

function resolveMime(type: string, name: string): string {
  if (type && type.includes('/')) return type;
  const ext = getExtFromName(name);
  const map: Record<string, string> = {
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
    zip: 'application/zip',
    mp4: 'video/mp4',
  };
  return map[ext] ?? 'application/octet-stream';
}

function toSelFile(f: PickedFileInput): SelFile {
  const ext = getExtFromName(f.name);
  return {
    id: `${f.uri}__${Math.random().toString(36).slice(2)}`,
    name: f.name,
    ext,
    bytes: f.size ?? 0,
    uri: f.uri,
    mimeType: resolveMime(f.type, f.name),
    status: 'pending',
    progress: 0,
  };
}

// ─── Main component ─────────────────────────────────────────────────────────────

export function FileUploadSheet({
  visible,
  onClose,
  onFilesUploaded,
  archivoUso = ArchivoUso.TAREA,
  usuariosCompartidos,
  initialFiles,
  idempotencyKey: _idempotencyKey,
}: FileUploadSheetProps) {
  const { tokens } = useAuth();
  const { alertModal, showModal, closeAlert } = useAlertModal();

  const [files, setFiles] = useState<SelFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const batchSizeRef = useRef(0);
  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (visible) {
      if (initialFiles?.length) {
        setFiles(initialFiles.map(toSelFile));
      }
    } else {
      setFiles([]);
      setUploading(false);
      batchSizeRef.current = 0;
      timersRef.current.forEach(clearInterval);
      timersRef.current.clear();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Derived ──────────────────────────────────────────────────────────────────

  const pendingFiles = useMemo(() => files.filter(f => f.status === 'pending'), [files]);
  const doneFiles = useMemo(() => files.filter(f => f.status === 'done'), [files]);
  const uploadingNow = useMemo(() => files.filter(f => f.status === 'uploading').length, [files]);
  const completedInBatch = batchSizeRef.current - uploadingNow;

  const subtitle = useMemo(() => {
    if (files.length === 0) return 'Ninguno seleccionado';
    if (uploading) return `Subiendo… ${completedInBatch}/${batchSizeRef.current}`;
    if (doneFiles.length === files.length) {
      const n = doneFiles.length;
      return `${n} archivo${n !== 1 ? 's' : ''} subido${n !== 1 ? 's' : ''}`;
    }
    if (doneFiles.length > 0) {
      return `${doneFiles.length} subido${doneFiles.length !== 1 ? 's' : ''} · ${pendingFiles.length} pendiente${pendingFiles.length !== 1 ? 's' : ''}`;
    }
    const totalBytes = pendingFiles.reduce((s, f) => s + f.bytes, 0);
    return `${files.length} archivo${files.length !== 1 ? 's' : ''} · ${formatBytes(totalBytes)}`;
  }, [files, uploading, completedInBatch, doneFiles, pendingFiles]);

  // ─── File management ──────────────────────────────────────────────────────────

  const addFiles = useCallback((incoming: PickedFileInput[]) => {
    setFiles(prev => {
      const existingUris = new Set(prev.map(f => f.uri));
      const fresh = incoming
        .filter(p => !existingUris.has(p.uri))
        .map(toSelFile);
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // ─── Pickers ──────────────────────────────────────────────────────────────────

  const openDocumentPicker = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        addFiles(result.assets.map(a => ({
          name: a.name,
          uri: a.uri,
          type: a.mimeType ?? 'application/octet-stream',
          size: a.size,
        })));
      }
    } catch {
      showModal('Error', 'No se pudo seleccionar el documento.');
    }
  }, [addFiles, showModal]);

  const openCamera = useCallback(async () => {
    if (!ImagePicker) { showModal('No disponible', 'Cámara no disponible en este dispositivo.'); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { showModal('Permiso denegado', 'Se necesita acceso a la cámara.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      addFiles([{
        name: asset.fileName ?? `foto_${Date.now()}.${ext}`,
        uri: asset.uri,
        type: asset.mimeType ?? `image/${ext}`,
        size: asset.fileSize,
      }]);
    }
  }, [addFiles, showModal]);

  const handleSelectFiles = useCallback(() => {
    showModal('Seleccionar archivos', 'Elegí una opción', [
      { key: 'file', label: 'Seleccionar archivo', onPress: openDocumentPicker },
      { key: 'camera', label: 'Tomar foto', onPress: openCamera },
      { key: 'cancel', label: 'Cancelar', onPress: () => {}, variant: 'neutral' },
    ]);
  }, [showModal, openDocumentPicker, openCamera]);

  // ─── Upload ───────────────────────────────────────────────────────────────────

  const stopTimer = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) { clearInterval(t); timersRef.current.delete(id); }
  }, []);

  const startProgressTimer = useCallback((id: string) => {
    const timer = setInterval(() => {
      setFiles(prev => prev.map(f =>
        f.id === id && f.status === 'uploading'
          ? { ...f, progress: Math.min(f.progress + 2, 80) }
          : f
      ));
    }, 120);
    timersRef.current.set(id, timer);
  }, []);

  const startUpload = useCallback(async () => {
    const pending = files.filter(f => f.status === 'pending');
    if (!pending.length || uploading || !tokens?.accessToken) return;

    const token = tokens.accessToken;
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
      setFiles(prev => prev.map(f =>
        f.status === 'uploading' ? { ...f, status: 'pending', progress: 0 } : f
      ));
      setUploading(false);
      batchSizeRef.current = 0;
      showModal('Error', 'No se pudo iniciar la subida. Verificá tu conexión e intentá de nuevo.');
      return;
    }

    const results = await Promise.allSettled(
      pending.map(async (file, index) => {
        const urlInfo = urlsResponse.urls[index];
        startProgressTimer(file.id);
        try {
          await uploadArchivoR2(urlInfo.uploadUrl, file.uri, file.mimeType);
          stopTimer(file.id);
          setFiles(prev => prev.map(f => f.id === file.id ? { ...f, progress: 90 } : f));

          const archived = await confirmarUploadArchivo(token, {
            nombre: file.name,
            tamaño: file.bytes,
            tipo: file.mimeType,
            uso: archivoUso,
            ruta_r2: urlInfo.ruta_r2,
            ...(usuariosCompartidos?.length ? { usuarios_compartidos: usuariosCompartidos } : {}),
          });

          setFiles(prev => prev.map(f =>
            f.id === file.id
              ? { ...f, status: 'done', progress: 100, archivoId: archived.id }
              : f
          ));
          return archived.id;
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

    const succeeded = results
      .filter((r): r is PromiseFulfilledResult<number> =>
        r.status === 'fulfilled' && r.value !== null
      )
      .map(r => r.value);

    if (succeeded.length) onFilesUploaded?.(succeeded);

    const failedCount = pending.length - succeeded.length;
    if (failedCount > 0 && succeeded.length > 0) {
      showModal('Subida parcial', `${succeeded.length} de ${pending.length} archivos subidos.`);
    } else if (failedCount > 0) {
      showModal('Error', 'No se pudo subir ningún archivo. Intentá de nuevo.');
    }
  }, [files, uploading, tokens, archivoUso, usuariosCompartidos, onFilesUploaded, showModal, startProgressTimer, stopTimer]);

  // ─── Footer state ─────────────────────────────────────────────────────────────

  const allDone = files.length > 0 && doneFiles.length === files.length && !uploading;
  const hasPending = pendingFiles.length > 0 && !uploading;
  const pendingSize = formatBytes(pendingFiles.reduce((s, f) => s + f.bytes, 0));
  const pendingLabel = pendingFiles.length === 1 ? '1 archivo' : `${pendingFiles.length} archivos`;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerText}>
              <Text style={s.title} numberOfLines={1}>Archivos seleccionados</Text>
              <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#5a6068" />
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
                <FileRow
                  key={file.id}
                  file={file}
                  onRemove={uploading ? undefined : removeFile}
                />
              ))}

              {/* Add more button — hidden while uploading */}
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
            <View style={s.footer}>
              {uploading && (
                <View style={s.footerBtn}>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
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
                      {pendingLabel} · {pendingSize}
                    </Text>
                  </View>
                  <TouchableOpacity style={s.footerBtn} onPress={startUpload} activeOpacity={0.85}>
                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={s.footerBtnLabel}>
                      Subir {pendingLabel}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {allDone && (
                <View style={[s.footerBtn, s.footerBtnDone]}>
                  <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={s.footerBtnLabel}>Subida completa</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        actions={alertModal.actions}
        onClose={closeAlert}
      />
    </Modal>
  );
}

// ─── FileRow ────────────────────────────────────────────────────────────────────

function FileRow({ file, onRemove }: { file: SelFile; onRemove?: (id: string) => void }) {
  const isPending = file.status === 'pending';
  const isUploading = file.status === 'uploading';
  const isDone = file.status === 'done';

  return (
    <View style={s.row}>
      {/* Badge */}
      <View style={s.badgeWrap}>
        <FileTypeBadge ext={file.ext} />
      </View>

      {/* Middle */}
      <View style={s.rowMeta}>
        <Text style={s.rowName} numberOfLines={1}>{file.name}</Text>
        {isUploading ? (
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${file.progress}%` }]} />
          </View>
        ) : (
          <Text style={s.rowSub} numberOfLines={1}>
            {file.ext.toUpperCase()} · {formatBytes(file.bytes)}
            {isDone && ' · Subido'}
          </Text>
        )}
      </View>

      {/* Right */}
      {isPending && onRemove && (
        <TouchableOpacity
          onPress={() => onRemove(file.id)}
          style={s.removeBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={14} color={REMOVE_GLYPH} />
        </TouchableOpacity>
      )}
      {isUploading && (
        <Text style={s.progressPct}>{file.progress}%</Text>
      )}
      {isDone && (
        <View style={s.doneCheck}>
          <Ionicons name="checkmark" size={16} color="#fff" />
        </View>
      )}
    </View>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────────

function EmptyState({ onSelect }: { onSelect: () => void }) {
  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyIcon}>
        <Ionicons name="document-outline" size={36} color={MUTED} />
      </View>
      <Text style={s.emptyTitle}>No hay archivos</Text>
      <Text style={s.emptySub}>Seleccioná archivos para adjuntarlos</Text>
      <TouchableOpacity style={s.emptyBtn} onPress={onSelect} activeOpacity={0.85}>
        <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
        <Text style={s.emptyBtnText}>Seleccionar archivos</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: INK,
    lineHeight: 25,
  },
  subtitle: {
    fontSize: 13.5,
    color: MUTED,
    marginTop: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PANEL,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },

  // File row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 13,
    padding: 11,
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 10,
  },
  badgeWrap: {
    width: 46,
    height: 46,
    borderRadius: 11,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: INK,
  },
  rowSub: {
    fontSize: 12.5,
    color: MUTED,
    marginTop: 2,
  },
  progressTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: PROGRESS_TRACK,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: BLUE_BTN,
  },
  progressPct: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2f78e8',
    minWidth: 38,
    textAlign: 'right',
  },
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
    gap: 6,
    marginBottom: 4,
  },
  addMoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: PANEL,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: INK,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13.5,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BLUE_BTN,
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

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
  footerSummaryLabel: {
    fontSize: 13.5,
    color: MUTED,
  },
  footerSummaryValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: INK,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE_BTN,
    borderRadius: 14,
    paddingVertical: 15,
  },
  footerBtnDone: {
    backgroundColor: GREEN,
  },
  footerBtnLabel: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#fff',
  },
});
