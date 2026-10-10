import { pickFromGallery } from '@/shared/ui/pickFromGallery';
import type { CaptureResult } from '@/shared/ui/cameraTypes';
import * as DocumentPicker from 'expo-document-picker';
import type { AdjuntoPendiente, TipoAdjunto } from '../dto/InformeDTO';

/** Archivo recién elegido; el `orden` lo asigna el editor al insertarlo en el texto. */
export type AdjuntoElegido = Omit<AdjuntoPendiente, 'orden'>;

const tipoDeMime = (mime: string): TipoAdjunto =>
  mime.startsWith('image/') ? 'imagen' : mime.startsWith('video/') ? 'video' : 'documento';

export async function elegirMedia(): Promise<{ adjuntos: AdjuntoElegido[]; error?: string }> {
  const res = await pickFromGallery({ allowsMultipleSelection: true });
  if (res.ok) {
    return {
      adjuntos: res.assets.map((a) => ({
        uri: a.uri,
        nombre: a.name,
        mime: a.type,
        tamano: a.size ?? 0,
        tipo: tipoDeMime(a.type),
      })),
    };
  }
  if (res.reason === 'canceled') return { adjuntos: [] };
  return {
    adjuntos: [],
    error: res.reason === 'permission-denied' ? 'Sin permiso para acceder a la galería.' : 'La galería no está disponible.',
  };
}

/** Foto o video con la cámara (`openCamera` viene de `useCameraCapture`). */
export async function elegirCamara(
  openCamera: () => Promise<CaptureResult>,
): Promise<{ adjuntos: AdjuntoElegido[]; error?: string }> {
  const res = await openCamera();
  if (res.ok) {
    const { file } = res;
    return {
      adjuntos: [{ uri: file.uri, nombre: file.name, mime: file.type, tamano: file.size ?? 0, tipo: tipoDeMime(file.type) }],
    };
  }
  if (res.reason === 'canceled') return { adjuntos: [] };
  return {
    adjuntos: [],
    error: res.reason === 'permission-denied' ? 'Sin permiso para usar la cámara.' : 'La cámara no está disponible.',
  };
}

export async function elegirDocumentos(): Promise<AdjuntoElegido[]> {
  const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (res.canceled) return [];
  return res.assets.map((a) => {
    const mime = a.mimeType ?? 'application/octet-stream';
    return { uri: a.uri, nombre: a.name, mime, tamano: a.size ?? 0, tipo: tipoDeMime(mime) };
  });
}
