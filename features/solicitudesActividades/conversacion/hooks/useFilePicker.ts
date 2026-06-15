import * as DocumentPicker from 'expo-document-picker';
import type * as ImagePickerTypes from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { ImagePicker } from '../constants';
import type { useAlertModal } from './useAlertModal';

export interface PickedFile {
  name: string;
  uri: string;
  type: string;
  size?: number;
}

type ShowModalFn = ReturnType<typeof useAlertModal>['showModal'];

/**
 * Selección de archivos adjuntos (documento o foto de cámara) con el menú
 * "Adjuntar archivo". Mantiene la lista `pickedFiles`; la subida la maneja
 * cada consumidor (difiere entre conversación y creación de solicitud).
 */
export function useFilePicker({ showModal }: { showModal: ShowModalFn }) {
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([]);

  const addImageAsset = useCallback((asset: ImagePickerTypes.ImagePickerAsset) => {
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    setPickedFiles(prev => [...prev, {
      name: asset.fileName ?? `foto_${Date.now()}.${ext}`,
      uri: asset.uri,
      type: asset.mimeType ?? `image/${ext}`,
      size: asset.fileSize,
    }]);
  }, []);

  const handleTakePhoto = useCallback(async () => {
    if (!ImagePicker) { showModal('No disponible', 'Cámara no disponible.'); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { showModal('Permiso denegado', 'Se necesita acceso a la cámara.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) addImageAsset(result.assets[0]);
  }, [addImageAsset, showModal]);

  const handleSeleccionarArchivo = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true, type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length > 0) {
        setPickedFiles(prev => [...prev, ...result.assets.map(a => ({
          name: a.name, uri: a.uri, type: a.mimeType ?? 'application/octet-stream', size: a.size,
        }))]);
      }
    } catch { showModal('Error', 'No se pudo seleccionar el documento.'); }
  }, [showModal]);

  const handleAgregarAdjunto = useCallback(() => {
    showModal('Adjuntar archivo', 'Elegí una opción', [
      { key: 'file', label: 'Archivo', onPress: handleSeleccionarArchivo },
      { key: 'camera', label: 'Cámara', onPress: handleTakePhoto },
      { key: 'cancel', label: 'Cancelar', onPress: () => { }, variant: 'neutral' },
    ]);
  }, [handleTakePhoto, handleSeleccionarArchivo, showModal]);

  // `handleTakePhoto`/`handleSeleccionarArchivo` se exponen para consumidores
  // que arman su propio menú (con otras etiquetas); `handleAgregarAdjunto` es el
  // menú por defecto ("Archivo"/"Cámara").
  return { pickedFiles, setPickedFiles, handleTakePhoto, handleSeleccionarArchivo, handleAgregarAdjunto };
}
