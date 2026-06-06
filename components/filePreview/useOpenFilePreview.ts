import { useGetArchivoUrlFirmada } from '@/features/docs/viewmodels/useArchivos';
import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { getExt, isImageFile, isTextFile } from './fileKind';
import type { FileItem } from './types';

const IS_WEB = Platform.OS === 'web';

function openInNewTab(url: string) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function safeStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ArchivoAbrirInfo {
  id: number;
  nombre: unknown;
  tipo?: unknown;
  tamaño?: unknown;
  nombreCreador?: unknown;
  apellidoCreador?: unknown;
}

export function useOpenFilePreview() {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const { getArchivoUrlFirmada } = useGetArchivoUrlFirmada();

  const openFile = useCallback(async (archivo: ArchivoAbrirInfo) => {
    try {
      const url = await getArchivoUrlFirmada(archivo.id);
      // On desktop (web) just open the signed view URL in a new browser tab.
      if (IS_WEB) { openInNewTab(url); return; }
      const tipo = safeStr(archivo.tipo);
      const nombre = safeStr(archivo.nombre) || 'Archivo';
      const ext = getExt(tipo, nombre);
      const isImage = isImageFile(tipo, nombre);

      const sender = [safeStr(archivo.nombreCreador), safeStr(archivo.apellidoCreador)]
        .filter(Boolean).join(' ') || undefined;

      let textPreview: string | undefined;
      if (!isImage && isTextFile(tipo, nombre)) {
        try {
          const resp = await fetch(url);
          const text = await resp.text();
          textPreview = text.length > 3000 ? `${text.slice(0, 3000)}…` : text;
        } catch { /* no preview */ }
      }

      setPreviewFile({
        id: String(archivo.id),
        kind: isImage ? 'image' : 'file',
        name: nombre,
        ext,
        size: typeof archivo.tamaño === 'number' ? formatBytes(archivo.tamaño) : undefined,
        uri: url,
        sender,
        textPreview,
      });
    } catch {
      Alert.alert('Error', 'No se pudo abrir el archivo');
    }
  }, [getArchivoUrlFirmada]);

  const openWithUri = useCallback((item: FileItem) => {
    if (IS_WEB) { openInNewTab(item.uri); return; }
    setPreviewFile(item);
  }, []);

  const closePreview = useCallback(() => setPreviewFile(null), []);

  return { previewFile, openFile, openWithUri, closePreview };
}
