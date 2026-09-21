import { Ionicons } from '@expo/vector-icons';
import { CameraMode, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { File } from 'expo-file-system';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackButton } from './AppBackButton';
import { GlassButton } from './GlassButton';
import { GlassTabSelector } from '@/components/ui/GlassTabSelector';
import { glassColors, glassStyles } from './glass';
import type { CapturedMediaFile } from './cameraTypes';

// Tope de grabación: ~ los mismos ~90-150MB que un celular produce en H.264
// 1080p30 a bitrate típico (~6-10 Mbps) para 120s. Solo se aplica acá (no en
// el picker nativo, que en Android ni siquiera ofrece grabar video).
const RECORDING_MAX_DURATION_SECONDS = 120;

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  '3gp': 'video/3gpp',
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface CameraCaptureModalProps {
  visible: boolean;
  onCapture: (file: CapturedMediaFile) => void;
  onCancel: (reason?: 'canceled' | 'permission-denied') => void;
}

export function CameraCaptureModal({ visible, onCapture, onCancel }: CameraCaptureModalProps) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const discardRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mode, setMode] = useState<CameraMode>('picture');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (visible && !cameraPermission?.granted && cameraPermission?.canAskAgain !== false) {
      void requestCameraPermission();
    }
  }, [visible, cameraPermission, requestCameraPermission]);

  useEffect(() => {
    if (!visible) {
      setMode('picture');
      setIsRecording(false);
      setElapsed(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [visible]);

  const finalizeCapture = useCallback((uri: string, kind: 'picture' | 'video') => {
    const ext = uri.split('.').pop()?.toLowerCase() || (kind === 'video' ? 'mp4' : 'jpg');
    const type = EXT_MIME[ext] ?? (kind === 'video' ? `video/${ext}` : `image/${ext}`);
    let size: number | undefined;
    try {
      size = new File(uri).size ?? undefined;
    } catch {
      size = undefined;
    }
    onCapture({
      name: `${kind === 'video' ? 'video' : 'foto'}_${Date.now()}.${ext}`,
      uri,
      type,
      size,
    });
  }, [onCapture]);

  const handleTakePicture = useCallback(async () => {
    const picture = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
    if (picture?.uri) finalizeCapture(picture.uri, 'picture');
  }, [finalizeCapture]);

  const handleStartRecording = useCallback(async () => {
    if (!microphonePermission?.granted) {
      const result = await requestMicrophonePermission();
      if (!result.granted) return;
    }

    setIsRecording(true);
    setElapsed(0);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    try {
      const video = await cameraRef.current?.recordAsync({ maxDuration: RECORDING_MAX_DURATION_SECONDS });
      const wasDiscarded = discardRef.current;
      discardRef.current = false;
      if (wasDiscarded) {
        onCancel('canceled');
      } else if (video?.uri) {
        finalizeCapture(video.uri, 'video');
      }
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      setElapsed(0);
    }
  }, [microphonePermission, requestMicrophonePermission, finalizeCapture, onCancel]);

  const handleCapturePress = useCallback(() => {
    if (mode === 'picture') {
      void handleTakePicture();
    } else if (isRecording) {
      cameraRef.current?.stopRecording();
    } else {
      void handleStartRecording();
    }
  }, [mode, isRecording, handleTakePicture, handleStartRecording]);

  const handleBack = useCallback(() => {
    if (isRecording) {
      discardRef.current = true;
      cameraRef.current?.stopRecording();
      return;
    }
    onCancel('canceled');
  }, [isRecording, onCancel]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleBack}>
      <View style={styles.root}>
        {!cameraPermission ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={glassColors.link} />
          </View>
        ) : !cameraPermission.granted ? (
          <View style={styles.centerContainer}>
            <View style={[styles.headerAbsolute, { paddingTop: insets.top + 12 }]}>
              <AppBackButton onPress={() => onCancel('permission-denied')} iconName="close" />
            </View>
            <Text style={styles.permissionTitle}>Necesitamos acceso a la cámara</Text>
            <View style={[glassStyles.card, styles.permissionCard]}>
              <Text style={styles.permissionSubtitle}>
                Se usa para tomar fotos y grabar videos.
              </Text>
              {cameraPermission.canAskAgain ? (
                <GlassButton label="Dar permiso" onPress={() => void requestCameraPermission()} style={styles.fullWidthButton} />
              ) : (
                <Text style={styles.permissionSubtitle}>
                  Habilitá el permiso de cámara desde la configuración del dispositivo.
                </Text>
              )}
              <GlassButton label="Volver" variant="secondary" onPress={() => onCancel('permission-denied')} style={styles.fullWidthButton} />
            </View>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" mode={mode} />

            <View style={[styles.headerAbsolute, { paddingTop: insets.top + 12 }]}>
              <AppBackButton onPress={handleBack} iconName="close" />
            </View>

            {isRecording && (
              <View style={styles.recordingBadge}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>{formatElapsed(elapsed)}</Text>
              </View>
            )}

            <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
              {!isRecording && (
                <View style={styles.modeSelectorWrap}>
                  <GlassTabSelector
                    tabs={[{ key: 'picture', label: 'Foto' }, { key: 'video', label: 'Video' }]}
                    activeKey={mode}
                    onChange={(key) => setMode(key as CameraMode)}
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.captureButton, isRecording && styles.captureButtonRecording]}
                onPress={handleCapturePress}
                accessibilityRole="button"
                accessibilityLabel={mode === 'picture' ? 'Tomar foto' : isRecording ? 'Detener grabación' : 'Grabar video'}
              >
                {isRecording ? (
                  <View style={styles.stopIcon} />
                ) : mode === 'video' ? (
                  <View style={styles.recordIcon} />
                ) : (
                  <Ionicons name="camera" size={30} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  headerAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: glassColors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  permissionSubtitle: {
    fontSize: 14,
    color: glassColors.textMuted,
    textAlign: 'center',
  },
  fullWidthButton: {
    width: '100%',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  recordingBadge: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  recordingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: 20,
  },
  modeSelectorWrap: {
    width: 180,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonRecording: {
    borderColor: '#ef4444',
  },
  recordIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ef4444',
  },
  stopIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
});
