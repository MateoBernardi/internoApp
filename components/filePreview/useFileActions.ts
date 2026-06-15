import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import type { FileItem } from './types';

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  }
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function ensureLocalUri(uri: string, name: string): Promise<string> {
  if (uri.startsWith('file://') || uri.startsWith('/')) return uri;
  const cacheDir = new FileSystem.Directory(FileSystem.Paths.cache, 'filePreview');
  const destFile = new FileSystem.File(cacheDir, safeName(name));
  if (!destFile.exists) {
    await FileSystem.File.downloadFileAsync(uri, destFile, { idempotent: false });
  }
  return destFile.uri;
}

export function useFileActions(file: FileItem | null) {
  const [busy, setBusy] = useState(false);

  const share = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    try {
      showToast('Compartiendo archivo…');
      const localUri = await ensureLocalUri(file.uri, file.name);
      await Sharing.shareAsync(localUri);
    } catch {
      Alert.alert('Error', 'No se pudo compartir el archivo');
    } finally {
      setBusy(false);
    }
  }, [file]);

  const download = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    try {
      if (file.kind === 'image' && Platform.OS === 'ios') {
        const localUri = await ensureLocalUri(file.uri, file.name);
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Sin permisos', 'Permite el acceso a la galería para guardar la imagen');
          return;
        }
        await MediaLibrary.saveToLibraryAsync(localUri);
        showToast('Guardado en Galería');
      } else {
        const docDir = new FileSystem.Directory(FileSystem.Paths.document);
        const destFile = new FileSystem.File(docDir, safeName(file.name));
        await FileSystem.File.downloadFileAsync(file.uri, destFile, { idempotent: false });
        showToast('Guardado en Documentos');
      }
    } catch {
      Alert.alert('Error', 'No se pudo descargar el archivo');
    } finally {
      setBusy(false);
    }
  }, [file]);

  const print = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    try {
      showToast('Preparando impresión…');
      const localUri = await ensureLocalUri(file.uri, file.name);
      if (file.kind === 'image') {
        await Print.printAsync({
          html: `<html><body style="margin:0;display:flex;justify-content:center;align-items:center"><img src="${localUri}" style="max-width:100%;max-height:100%"></body></html>`,
        });
      } else {
        await Print.printAsync({ uri: localUri });
      }
    } catch {
      Alert.alert('Error', 'No se pudo imprimir');
    } finally {
      setBusy(false);
    }
  }, [file]);

  return { share, download, print, busy };
}
