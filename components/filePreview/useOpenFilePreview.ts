import { useGetArchivoUrlFirmada } from '@/features/docs/viewmodels/useArchivos';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import type { FileItem } from './types';

const TEXT_EXTS = new Set(['txt', 'csv', 'log', 'md', 'json', 'xml', 'yaml', 'yml']);

function safeStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function getExt(tipo: string, nombre: string): string {
  if (tipo.includes('/')) {
    const sub = tipo.split('/')[1];
    const map: Record<string, string> = {
      jpeg: 'jpg',
      plain: 'txt',
      'vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'vnd.ms-excel': 'xls',
      'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    };
    const mapped = map[sub];
    if (mapped) return mapped;
    if (sub && sub !== 'octet-stream') return sub;
  }
  const dot = nombre.lastIndexOf('.');
  return dot !== -1 ? nombre.slice(dot + 1).toLowerCase() : 'bin';
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
      const tipo = safeStr(archivo.tipo);
      const nombre = safeStr(archivo.nombre) || 'Archivo';
      const ext = getExt(tipo, nombre);
      const isImage = tipo.startsWith('image/');

      const sender = [safeStr(archivo.nombreCreador), safeStr(archivo.apellidoCreador)]
        .filter(Boolean).join(' ') || undefined;

      let textPreview: string | undefined;
      if (!isImage && TEXT_EXTS.has(ext)) {
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
    setPreviewFile(item);
  }, []);

  const closePreview = useCallback(() => setPreviewFile(null), []);

  return { previewFile, openFile, openWithUri, closePreview };
}
