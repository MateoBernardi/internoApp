import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { ScanPayload } from '@/features/horarios/models/HorarioDTO';
import { enviarScan } from '@/features/horarios/services/horariosService';
import { getDeviceIdentifier } from '@/features/horarios/utils/deviceIdentifier';
import { generateIdempotencyKey } from '@/shared/idempotency';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.lightTint} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionTitle}>Necesitamos acceso a la cámara</Text>
        <Text style={styles.permissionSubtitle}>
          Se usa únicamente para escanear el código QR de {tipo === 'IN' ? 'entrada' : 'salida'}.
        </Text>
        {permission.canAskAgain ? (
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Dar permiso</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.permissionSubtitle}>
            Habilitá el permiso de cámara desde la configuración del dispositivo.
          </Text>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.secondaryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state === 'result') {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.resultText, resultIsError && styles.resultTextError]}>
          {resultMessage}
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Volver al inicio</Text>
        </TouchableOpacity>
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
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.processingText}>Registrando escaneo...</Text>
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
    backgroundColor: colors.componentBackground,
    padding: 24,
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
  primaryButton: {
    backgroundColor: colors.lightTint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: '600',
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
  processingText: {
    marginTop: 12,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
