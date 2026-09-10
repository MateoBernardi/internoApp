import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { ScanPayload } from '@/features/horarios/models/HorarioDTO';
import { enviarScan } from '@/features/horarios/services/horariosService';
import { TURNO_LABEL } from '@/features/horarios/models/Turno';
import { horariosQueryKeys } from '@/features/horarios/viewmodels/useHorarios';
import { getDeviceIdentifier } from '@/features/horarios/utils/deviceIdentifier';
import { generateIdempotencyKey } from '@/shared/idempotency';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { GlassButton } from '@/shared/ui/GlassButton';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const colors = Colors['light'];

type ScanState = 'scanning' | 'processing' | 'result' | 'location-denied';

/**
 * Header presente en todos los estados de la pantalla. El botón de volver es
 * deliberadamente gris/neutro (no el azul de acento), igual que el resto de
 * la app — ver conversacion/styles.ts. `dark` lo adapta al fondo negro de la
 * cámara en vivo (estados 'scanning'/'processing').
 */
function ScanHeader({ title, onBack, dark }: { title: string; onBack: () => void; dark?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 12 },
        dark && styles.headerDark,
        dark && styles.headerAbsolute,
      ]}
    >
      <TouchableOpacity
        style={[styles.backButton, dark && styles.backButtonDark]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <Ionicons name="chevron-back" size={22} color={dark ? '#ffffff' : glassColors.textMuted} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, dark && styles.headerTitleDark]} numberOfLines={1}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

export default function EscanearTurnoScreen() {
  const router = useRouter();
  const { tokens } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ tipo?: string; turno?: string; fecha?: string }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>('scanning');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultIsError, setResultIsError] = useState(false);
  const [locationCanAskAgain, setLocationCanAskAgain] = useState(true);
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

        const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          isProcessingRef.current = false;
          setLocationCanAskAgain(canAskAgain);
          setState('location-denied');
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        const deviceIdentifier = await getDeviceIdentifier();

        const payload: ScanPayload = {
          fecha,
          turno: TURNO_LABEL[turno],
          time: new Date().toISOString(),
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          device_identifier: deviceIdentifier,
          token: scanningResult.data,
        };

        const idempotencyKey = generateIdempotencyKey();
        const response = await enviarScan(token, payload, idempotencyKey);
        await queryClient.invalidateQueries({ queryKey: horariosQueryKeys.all });
        finish(response.message, !response.success);
      } catch (error) {
        finish(
          error instanceof Error ? error.message : 'No se pudo registrar el escaneo. Intentá de nuevo.',
          true
        );
      }
    },
    [fecha, finish, queryClient, tokens?.accessToken, turno]
  );

  const retryLocationPermission = useCallback(async () => {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setState('scanning');
    } else {
      setLocationCanAskAgain(canAskAgain);
    }
  }, []);

  const screenTitle = tipo === 'IN' ? 'Registrar entrada' : 'Registrar salida';
  const goBack = useCallback(() => router.back(), [router]);

  if (!permission) {
    return (
      <View style={styles.root}>
        <ScanHeader title={screenTitle} onBack={goBack} />
        <View style={[glassStyles.sheet, styles.centerContainer]}>
          <ActivityIndicator size="large" color={glassColors.link} />
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <ScanHeader title={screenTitle} onBack={goBack} />
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
            <GlassButton label="Volver" variant="secondary" onPress={goBack} style={styles.fullWidthButton} />
          </View>
        </View>
      </View>
    );
  }

  if (state === 'location-denied') {
    return (
      <View style={styles.root}>
        <ScanHeader title={screenTitle} onBack={goBack} />
        <View style={[glassStyles.sheet, styles.centerContainer]}>
          <Text style={styles.permissionTitle}>Necesitamos tu ubicación</Text>
          <View style={[glassStyles.card, styles.permissionCard]}>
            <Text style={styles.permissionSubtitle}>
              Se usa únicamente para validar que el escaneo se hace dentro del predio.
            </Text>
            {locationCanAskAgain ? (
              <GlassButton label="Reintentar" onPress={() => void retryLocationPermission()} style={styles.fullWidthButton} />
            ) : (
              <Text style={styles.permissionSubtitle}>
                Habilitá el permiso de ubicación desde la configuración del dispositivo y volvé a intentar.
              </Text>
            )}
            <GlassButton label="Volver" variant="secondary" onPress={goBack} style={styles.fullWidthButton} />
          </View>
        </View>
      </View>
    );
  }

  if (state === 'result') {
    return (
      <View style={styles.root}>
        <ScanHeader title={screenTitle} onBack={goBack} />
        <View style={[glassStyles.sheet, styles.centerContainer]}>
          <View style={[glassStyles.card, styles.resultCard]}>
          <Text style={[styles.resultText, resultIsError && styles.resultTextError]}>
            {resultMessage}
          </Text>
            <GlassButton label="Volver al inicio" onPress={goBack} style={styles.fullWidthButton} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={state === 'scanning' ? handleBarcodeScanned : undefined}
        />

        <ScanHeader title={screenTitle} onBack={goBack} dark />

        <View style={styles.overlay}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,24,28,0.08)',
  },
  headerDark: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderBottomWidth: 0,
  },
  headerAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.text,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  headerTitleDark: {
    color: '#ffffff',
  },
  headerSpacer: {
    width: 40,
  },
  // Botón de "volver" — deliberadamente gris/neutro, no el azul de acento.
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
    backgroundColor: 'rgba(17,24,28,0.03)',
  },
  backButtonDark: {
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
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
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
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
    ...StyleSheet.absoluteFill,
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
