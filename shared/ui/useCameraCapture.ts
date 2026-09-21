import React, { useCallback, useRef, useState } from 'react';
import { CameraCaptureModal } from './CameraCaptureModal';
import type { CapturedMediaFile, CaptureResult } from './cameraTypes';

export type { CapturedMediaFile, CaptureResult } from './cameraTypes';

/**
 * Cámara con foto/video en un modal propio (expo-camera), en vez del picker
 * nativo del SO (expo-image-picker): en Android ese picker no ofrece grabar
 * video sin importar `mediaTypes` (ver expo/expo#18759, sin resolver).
 *
 * Uso: `const { openCamera, CameraModal } = useCameraCapture();` — llamar
 * `await openCamera()` donde antes se llamaba al picker, y renderizar
 * `{CameraModal}` una vez en el árbol del componente.
 */
export function useCameraCapture() {
  const [visible, setVisible] = useState(false);
  const resolveRef = useRef<((result: CaptureResult) => void) | null>(null);

  const settle = useCallback((result: CaptureResult) => {
    setVisible(false);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const openCamera = useCallback((): Promise<CaptureResult> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setVisible(true);
    });
  }, []);

  const handleCapture = useCallback((file: CapturedMediaFile) => {
    settle({ ok: true, file });
  }, [settle]);

  const handleCancel = useCallback((reason: 'canceled' | 'permission-denied' = 'canceled') => {
    settle({ ok: false, reason });
  }, [settle]);

  const CameraModal = React.createElement(CameraCaptureModal, {
    visible,
    onCapture: handleCapture,
    onCancel: handleCancel,
  });

  return { openCamera, CameraModal };
}
