import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useState, type RefObject } from 'react';
import { pickFromGallery } from '@/shared/ui/pickFromGallery';
import { useAttachMenu } from '@/shared/ui/AttachMenu';
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

  const handlePickFromGallery = useCallback(async () => {
    const result = await pickFromGallery({ allowsMultipleSelection: true });
    if (result.ok) {
      setPickedFiles(prev => [...prev, ...result.assets]);
    } else if (result.reason === 'unavailable') {
      showModal('No disponible', 'La galería no está disponible.');
    } else if (result.reason === 'permission-denied') {
      showModal('Permiso denegado', 'Se necesita acceso a la galería para adjuntar imágenes o videos.');
    }
  }, [showModal]);

  const { openAttachMenu, AttachMenu } = useAttachMenu({
    onGallery: handlePickFromGallery,
    onCamera: handleTakePhoto,
    onFile: handleSeleccionarArchivo,
  });

  // Con `anchorRef` (el botón de adjuntar) el menú se despliega desde ese botón; sin él se usa el
  // diálogo centrado de siempre. `AttachMenu` debe renderizarse una vez en el árbol del consumidor.
  const handleAgregarAdjunto = useCallback((anchorRef?: RefObject<any>) => {
    if (anchorRef) {
      openAttachMenu(anchorRef);
      return;
    }
    showModal('Adjuntar archivo', 'Elegí una opción', [
      { key: 'file', label: 'Archivo', onPress: handleSeleccionarArchivo },
      { key: 'gallery', label: 'Galería', onPress: handlePickFromGallery },
      { key: 'camera', label: 'Cámara', onPress: handleTakePhoto },
      { key: 'cancel', label: 'Cancelar', onPress: () => { }, variant: 'neutral' },
    ]);
  }, [handleTakePhoto, handlePickFromGallery, handleSeleccionarArchivo, showModal, openAttachMenu]);

  // `handleTakePhoto`/`handlePickFromGallery`/`handleSeleccionarArchivo` se
  // exponen para consumidores que arman su propio menú (con otras etiquetas);
  // `handleAgregarAdjunto` es el menú por defecto ("Archivo"/"Galería"/"Cámara").
  // `CameraModal` debe renderizarse una vez en el árbol del consumidor para
  // que `handleTakePhoto` funcione.
  return {
    pickedFiles, setPickedFiles, handleTakePhoto, handlePickFromGallery, handleSeleccionarArchivo,
    handleAgregarAdjunto, CameraModal, AttachMenu,
  };
}
