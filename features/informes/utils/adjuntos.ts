import { pickFromGallery } from '@/shared/ui/pickFromGallery';
import * as DocumentPicker from 'expo-document-picker';
import type { AdjuntoPendiente, TipoAdjunto } from '../dto/InformeDTO';

const tipoDeMime = (mime: string): TipoAdjunto =>
  mime.startsWith('image/') ? 'imagen' : mime.startsWith('video/') ? 'video' : 'documento';

export async function elegirMedia(): Promise<{ adjuntos: AdjuntoPendiente[]; error?: string }> {
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

export async function elegirDocumentos(): Promise<AdjuntoPendiente[]> {
  const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (res.canceled) return [];
  return res.assets.map((a) => {
    const mime = a.mimeType ?? 'application/octet-stream';
    return { uri: a.uri, nombre: a.name, mime, tamano: a.size ?? 0, tipo: tipoDeMime(mime) };
  });
}
