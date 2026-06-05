import { ArchivoUso } from '@/features/docs/models/Archivo';
import { useGetArchivoUrlFirmada, useUploadArchivo } from '@/features/docs/viewmodels/useArchivos';
import { ApiOperationResult } from '@/shared/types/apiStatus';
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import type { useAlertModal } from './useAlertModal';
import { useFilePicker } from './useFilePicker';

type ShowModalFn = ReturnType<typeof useAlertModal>['showModal'];

/**
 * Selección, subida y apertura de archivos adjuntos en una conversación.
 * Compartido por `Solicitud` y `ConversacionChat`. Recibe `showModal` (del
 * `useAlertModal` del componente) para los avisos de error / subida parcial.
 */
export function useAdjuntos({ showModal }: { showModal: ShowModalFn }) {
  const { mutateAsync: uploadArchivo } = useUploadArchivo();
  const { getArchivoUrlFirmada } = useGetArchivoUrlFirmada();

  const { pickedFiles, setPickedFiles, handleAgregarAdjunto } = useFilePicker({ showModal });

  const isSuccess = <T,>(r: ApiOperationResult<T>): r is ApiOperationResult<T> & { data: T } =>
    r.status === 'success' && r.data !== undefined;

  const handleOpenArchivo = useCallback(async (archivoId: number) => {
    try {
      const url = await getArchivoUrlFirmada(archivoId);
      Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el archivo'));
    } catch { Alert.alert('Error', 'No se pudo obtener el enlace'); }
  }, [getArchivoUrlFirmada]);

  /**
   * Sube los archivos seleccionados y devuelve los IDs subidos con éxito.
   * Muestra avisos de error / subida parcial. No limpia `pickedFiles`.
   */
  const uploadPickedFiles = useCallback(async (): Promise<number[]> => {
    if (pickedFiles.length === 0) return [];
    try {
      const response = await uploadArchivo({
        item: pickedFiles.map(f => ({
          archivo: { uri: f.uri, name: f.name, type: f.type, size: f.size },
          archivoData: { nombre: f.name, tamaño: f.size, tipo: f.type, uso: ArchivoUso.TAREA },
        })),
      });
      const validos = (response?.exitosos ?? []).filter(isSuccess);
      if (validos.length === 0) {
        showModal('Error de archivos', 'No se pudo subir ningún archivo.');
      } else if ((response?.fallidos ?? []).length > 0) {
        showModal('Archivos parciales', `Se subieron ${validos.length} de ${pickedFiles.length}`);
      }
      return validos.map(r => r.data.id);
    } catch {
      showModal('Error de archivos', 'No se pudieron subir los archivos.');
      return [];
    }
  }, [pickedFiles, uploadArchivo, showModal]);

  return {
    pickedFiles,
    setPickedFiles,
    handleAgregarAdjunto,
    handleOpenArchivo,
    uploadPickedFiles,
  };
}
