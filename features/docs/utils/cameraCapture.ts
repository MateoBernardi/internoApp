import { ImagePicker } from '@/features/solicitudesActividades/conversacion/constants';

export interface CapturedMediaFile {
  name: string;
  uri: string;
  type: string;
  size?: number;
}

export type CaptureResult =
  | { ok: true; file: CapturedMediaFile }
  | { ok: false; reason: 'unavailable' | 'permission-denied' | 'canceled' };

export async function captureFromCamera(): Promise<CaptureResult> {
  if (!ImagePicker) return { ok: false, reason: 'unavailable' };

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return { ok: false, reason: 'permission-denied' };

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.8,
    videoMaxDuration: 120,
  });
  if (result.canceled || !result.assets?.length) return { ok: false, reason: 'canceled' };

  const asset = result.assets[0];
  const isVideo = asset.type === 'video';
  const fallbackExt = asset.uri.split('.').pop() ?? (isVideo ? 'mp4' : 'jpg');

  return {
    ok: true,
    file: {
      name: asset.fileName ?? `${isVideo ? 'video' : 'foto'}_${Date.now()}.${fallbackExt}`,
      uri: asset.uri,
      type: asset.mimeType ?? (isVideo ? `video/${fallbackExt}` : `image/${fallbackExt}`),
      size: asset.fileSize ?? undefined,
    },
  };
}
