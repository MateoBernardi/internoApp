import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { ScanPayload } from '@/features/horarios/models/HorarioDTO';
import { enviarScan } from '@/features/horarios/services/horariosService';
import { getDeviceIdentifier } from '@/features/horarios/utils/deviceIdentifier';
import { generateIdempotencyKey } from '@/shared/idempotency';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { GlassButton } from '@/shared/ui/GlassButton';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const colors = Colors['light'];

type ScanState = 'scanning' | 'processing' | 'result';

export default function EscanearTurnoScreen() {
  const router = useRouter();
  const { tokens } = useAuth();
  const params = useLocalSearchParams<{ tipo?: string; turno?: string; fecha?: string }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>('scanning');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultIsError, setResultIsError] = useState(false);
  // Evita procesar múltiples lecturas del mismo frame mientras la primera está en vuelo.
  const isProcessingRef = useRef(false);

  const tipo = params.tipo === 'OUT' ? 'OUT' : 'IN';
  const turno = params.turno === 'TARDE' ? 'TARDE' : 'MANANA';
  const fecha = typeof params.fecha === 'string' ? params.fecha : null;

  const finish = useCallback(
    (message: string, isError: boolean) => {
      setResultMessage(message);
      setResultIsError(isError);
      setState('result');
    },
    []
  );

  const handleBarcodeScanned = useCallback(
    async (scanningResult: BarcodeScanningResult) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      setState('processing');

      try {
        const token = tokens?.accessToken;
        if (!token) {
          finish('No se pudo verificar tu sesión. Volvé a iniciar sesión e intentá de nuevo.', true);
          return;
        }
        if (!fecha) {
          finish('Falta información del turno. Volvé al inicio e intentá de nuevo.', true);
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          finish('Necesitamos tu ubicación para validar el escaneo dentro del predio.', true);
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        const deviceIdentifier = await getDeviceIdentifier();

        const payload: ScanPayload = {
          fecha,
          turno,
          time: new Date().toISOString(),
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          device_identifier: deviceIdentifier,
          token: scanningResult.data,
        };

        const idempotencyKey = generateIdempotencyKey();
        const response = await enviarScan(token, payload, idempotencyKey);
        finish(response.message, false);
      } catch (error) {
        finish(
          error instanceof Error ? error.message : 'No se pudo registrar el escaneo. Intentá de nuevo.',
          true
        );
      }
    },
    [fecha, finish, tokens?.accessToken, turno]
  );

  if (!permission) {
    return (
      <View style={[glassStyles.sheet, styles.centerContainer]}>
        <ActivityIndicator size="large" color={glassColors.link} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[glassStyles.sheet, styles.centerContainer]}>
        <Text style={styles.permissionTitle}>Necesitamos acceso a la cámara</Text>
        <View style={[glassStyles.card, styles.permissionCard]}>
        <Text style={styles.permissionSubtitle}>
          Se usa únicamente para escanear el código QR de {tipo === 'IN' ? 'entrada' : 'salida'}.
        </Text>
        {permission.canAskAgain ? (
          <GlassButton label="Dar permiso" onPress={() => void requestPermission()} style={styles.fullWidthButton} />
        ) : (
          <Text style={styles.permissionSubtitle}>
            Habilitá el permiso de cámara desde la configuración del dispositivo.
          </Text>
        )}
          <GlassButton label="Volver" variant="secondary" onPress={() => router.back()} style={styles.fullWidthButton} />
        </View>
      </View>
    );
  }

  if (state === 'result') {
    return (
      <View style={[glassStyles.sheet, styles.centerContainer]}>
        <View style={[glassStyles.card, styles.resultCard]}>
        <Text style={[styles.resultText, resultIsError && styles.resultTextError]}>
          {resultMessage}
        </Text>
          <GlassButton label="Volver al inicio" onPress={() => router.back()} style={styles.fullWidthButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={state === 'scanning' ? handleBarcodeScanned : undefined}
      />

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.overlayText}>
          {tipo === 'IN' ? 'Escaneá el QR para registrar tu entrada' : 'Escaneá el QR para registrar tu salida'}
        </Text>
      </View>

      {state === 'processing' && (
        <View style={styles.processingOverlay}>
          <View style={[glassStyles.modalCard, styles.processingCard]}>
            <ActivityIndicator size="large" color={glassColors.link} />
            <Text style={styles.processingText}>Registrando escaneo...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionSubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 20,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  resultTextError: {
    color: colors.error,
  },
  fullWidthButton: {
    width: '100%',
    marginTop: 14,
  },
  resultCard: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  overlayText: {
    marginTop: 24,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingCard: {
    minWidth: 220,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  processingText: {
    marginTop: 12,
    color: glassColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
