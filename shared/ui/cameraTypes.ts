export interface CapturedMediaFile {
  name: string;
  uri: string;
  type: string;
  size?: number;
}

export type CaptureResult =
  | { ok: true; file: CapturedMediaFile }
  | { ok: false; reason: 'unavailable' | 'permission-denied' | 'canceled' };
