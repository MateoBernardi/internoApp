import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useState } from 'react';
import { useCameraCapture } from '@/shared/ui/useCameraCapture';
import type { useAlertModal } from './useAlertModal';

export interface PickedFile {
  name: string;
  uri: string;
  type: string;
  size?: number;
}

type ShowModalFn = ReturnType<typeof useAlertModal>['showModal'];

/**
 * Selección de archivos adjuntos (documento o foto/video de cámara) con el
 * menú "Adjuntar archivo". Mantiene la lista `pickedFiles`; la subida la
 * maneja cada consumidor (difiere entre conversación y creación de solicitud).
 */
export function useFilePicker({ showModal }: { showModal: ShowModalFn }) {
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([]);
  const { openCamera, CameraModal } = useCameraCapture();

  const handleTakePhoto = useCallback(async () => {
    const result = await openCamera();
    if (result.ok) {
      setPickedFiles(prev => [...prev, result.file]);
    } else if (result.reason === 'unavailable') {
      showModal('No disponible', 'Cámara no disponible.');
    }
  }, [openCamera, showModal]);

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
  // menú por defecto ("Archivo"/"Cámara"). `CameraModal` debe renderizarse una
  // vez en el árbol del consumidor para que `handleTakePhoto` funcione.
  return { pickedFiles, setPickedFiles, handleTakePhoto, handleSeleccionarArchivo, handleAgregarAdjunto, CameraModal };
}
