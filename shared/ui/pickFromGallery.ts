import type * as ImagePickerTypes from 'expo-image-picker';

// Carga perezosa, igual que en CrearReporte.tsx/CrearSolicitudesLicencias.tsx:
// en algunos entornos (web/SSR) el módulo nativo no está disponible y `require` lanza.
let ImagePicker: typeof ImagePickerTypes | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  console.warn('expo-image-picker no disponible. La galería estará deshabilitada.');
}

export interface GalleryPickedAsset {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export type GalleryPickResult =
  | { ok: true; assets: GalleryPickedAsset[] }
  | { ok: false; reason: 'unavailable' | 'permission-denied' | 'canceled' };

function assetToFile(asset: ImagePickerTypes.ImagePickerAsset): GalleryPickedAsset {
  const ext = asset.uri.split('.').pop()?.toLowerCase() || (asset.type === 'video' ? 'mp4' : 'jpg');
  const fallbackType = asset.type === 'video' ? `video/${ext}` : `image/${ext}`;
  return {
    uri: asset.uri,
    name: asset.fileName ?? `${asset.type === 'video' ? 'video' : 'foto'}_${Date.now()}.${ext}`,
    type: asset.mimeType ?? fallbackType,
    size: asset.fileSize ?? undefined,
  };
}

/**
 * Selección directa desde la galería del dispositivo (fotos y videos), en vez
 * de la cámara o el selector genérico de archivos. En Android usa el Photo
 * Picker del sistema (no requiere permisos runtime); en iOS pide acceso a la
 * librería de fotos la primera vez.
 */
export async function pickFromGallery(opts?: { allowsMultipleSelection?: boolean }): Promise<GalleryPickResult> {
  if (!ImagePicker) return { ok: false, reason: 'unavailable' };

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return { ok: false, reason: 'permission-denied' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: opts?.allowsMultipleSelection ?? false,
    quality: 0.8,
  });

  if (result.canceled || result.assets.length === 0) return { ok: false, reason: 'canceled' };

  return { ok: true, assets: result.assets.map(assetToFile) };
}
