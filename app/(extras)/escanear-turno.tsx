import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { ScanPayload } from '@/features/horarios/models/HorarioDTO';
import { enviarScan } from '@/features/horarios/services/horariosService';
import { TURNO_LABEL, turnoNombreFromBackend } from '@/features/horarios/models/Turno';
import { horariosQueryKeys } from '@/features/horarios/viewmodels/useHorarios';
import { usePreciseLocation } from '@/features/horarios/viewmodels/usePreciseLocation';
import { getDeviceIdentifier } from '@/features/horarios/utils/deviceIdentifier';
import { generateIdempotencyKey, isTransportError } from '@/shared/idempotency';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { GlassButton } from '@/shared/ui/GlassButton';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const colors = Colors['light'];

type ScanState = 'scanning' | 'processing' | 'result' | 'location-denied' | 'location-imprecise';

/**
 * - success: el backend confirmó el registro.
 * - error: el backend (o la validación local) rechazó el escaneo: seguro NO se registró.
 * - unconfirmed: la respuesta nunca llegó (red): no sabemos si se registró.
 */
type ScanResult = { kind: 'success' | 'error' | 'unconfirmed'; message: string };

const WARNING_COLOR = '#F59E0B';

/**
 * Si pasa este tiempo sin leer ningún QR se sugiere alejar el teléfono: desde
 * el iPhone 14 Pro la cámara no enfoca a menos de ~20 cm y, demasiado cerca,
 * simplemente no detecta nada.
 */
const DISTANCE_HINT_DELAY_MS = 4000;

const formatAccuracy = (accuracy: number | null) => (accuracy != null ? ` (±${Math.round(accuracy)} m)` : '');

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
  const params = useLocalSearchParams<{ tipo?: string; turno?: string; turnoNombre?: string; fecha?: string }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>('scanning');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [locationCanAskAgain, setLocationCanAskAgain] = useState(true);
  // Permiso de ubicación precisa concedido: recién ahí se enciende el GPS y se habilita el escaneo.
  const [locationReady, setLocationReady] = useState(false);
  const [processingStep, setProcessingStep] = useState<'location' | 'sending'>('location');
  const [showDistanceHint, setShowDistanceHint] = useState(false);
  // Evita procesar múltiples lecturas del mismo frame mientras la primera está en vuelo.
  const isProcessingRef = useRef(false);

  const tipo = params.tipo === 'OUT' ? 'OUT' : 'IN';
  const turno = params.turno === 'TARDE' ? 'TARDE' : 'MANANA';
  // Nombre exacto del turno (Rotativo/Noche incluidos): si falta (navegación vieja) se deduce de MANANA/TARDE.
  const turnoNombre = typeof params.turnoNombre === 'string' ? turnoNombreFromBackend(params.turnoNombre) : TURNO_LABEL[turno];
  const fecha = typeof params.fecha === 'string' ? params.fecha : null;

  // El GPS arranca al abrir la pantalla (no al leer el QR) para que, cuando el
  // usuario apunta al código, ya haya una ubicación precisa.
  const { waitForPreciseFix, currentAccuracy } = usePreciseLocation(locationReady && state !== 'result');

  const applyLocationPermission = useCallback((response: Location.LocationPermissionResponse) => {
    const { status, canAskAgain, ios, android } = response;
    if (status !== 'granted') {
      setLocationReady(false);
      setLocationCanAskAgain(canAskAgain);
      setState('location-denied');
      return;
    }
    // "Ubicación exacta" desactivada (iOS) o permiso aproximado (Android): el
    // error puede ser de kilómetros y el escaneo daría siempre fuera del área.
    if (ios?.accuracy === 'reduced' || android?.accuracy === 'coarse') {
      setLocationReady(false);
      setState('location-imprecise');
      return;
    }
    setLocationReady(true);
    setState('scanning');
  }, []);

  const checkLocationPermission = useCallback(
    () => Location.requestForegroundPermissionsAsync().then(applyLocationPermission),
    [applyLocationPermission]
  );

  const cameraGranted = permission?.granted ?? false;
  useEffect(() => {
    if (cameraGranted) void checkLocationPermission();
  }, [cameraGranted, checkLocationPermission]);

  useEffect(() => {
    if (!cameraGranted || state !== 'scanning') return;
    const timeout = setTimeout(() => setShowDistanceHint(true), DISTANCE_HINT_DELAY_MS);
    return () => {
      clearTimeout(timeout);
      setShowDistanceHint(false);
    };
  }, [cameraGranted, state]);

  const finish = useCallback(
    (kind: ScanResult['kind'], message: string) => {
      setResult({ kind, message });
      setState('result');
    },
    []
  );

  const retry = useCallback(() => {
    setResult(null);
    isProcessingRef.current = false;
    setState('scanning');
  }, []);

  const accessToken = tokens?.accessToken;
  const handleBarcodeScanned = useCallback(
    async (scanningResult: BarcodeScanningResult) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      setProcessingStep('location');
      setState('processing');

      try {
        const token = accessToken;
        if (!token) {
          finish('error', 'No se pudo verificar tu sesión. Volvé a iniciar sesión e intentá de nuevo.');
          return;
        }
        if (!fecha) {
          finish('error', 'Falta información del turno. Volvé al inicio e intentá de nuevo.');
          return;
        }

        const { fix: position, accuracy } = await waitForPreciseFix();
        if (!position) {
          finish(
            'error',
            `No pudimos obtener una ubicación precisa${formatAccuracy(accuracy)}. Activá el GPS, salí a un lugar abierto e intentá de nuevo.`
          );
          return;
        }

        setProcessingStep('sending');
        const deviceIdentifier = await getDeviceIdentifier();

        const payload: ScanPayload = {
          fecha,
          turno: turnoNombre,
          time: new Date().toISOString(),
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          device_identifier: deviceIdentifier,
          token: scanningResult.data,
        };

        const idempotencyKey = generateIdempotencyKey();
        const response = await enviarScan(token, payload, idempotencyKey);
        await queryClient.invalidateQueries({ queryKey: horariosQueryKeys.all });
        finish(response.success ? 'success' : 'error', response.message);
      } catch (error) {
        if (isTransportError(error)) {
          // La respuesta nunca llegó: el backend pudo haberlo procesado. Se refresca el
          // estado del turno para que el inicio refleje lo que realmente quedó guardado.
          void queryClient.invalidateQueries({ queryKey: horariosQueryKeys.all });
          finish(
            'unconfirmed',
            `No pudimos confirmar si se registró tu ${tipo === 'IN' ? 'entrada' : 'salida'} por un problema de conexión. Revisá en el inicio si figura marcada; si no, volvé a escanear.`
          );
          return;
        }
        finish('error', error instanceof Error ? error.message : 'No se pudo registrar el escaneo. Intentá de nuevo.');
      }
    },
    [accessToken, fecha, finish, queryClient, tipo, turnoNombre, waitForPreciseFix]
  );

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
              <GlassButton label="Reintentar" onPress={() => void checkLocationPermission()} style={styles.fullWidthButton} />
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

  if (state === 'location-imprecise') {
    return (
      <View style={styles.root}>
        <ScanHeader title={screenTitle} onBack={goBack} />
        <View style={[glassStyles.sheet, styles.centerContainer]}>
          <Text style={styles.permissionTitle}>Necesitamos tu ubicación exacta</Text>
          <View style={[glassStyles.card, styles.permissionCard]}>
            <Text style={styles.permissionSubtitle}>
              La app tiene acceso solo a tu ubicación aproximada y así no podemos validar que estés dentro del predio.
              Activá &quot;Ubicación exacta&quot; en la configuración de la app y volvé a intentar.
            </Text>
            <GlassButton label="Abrir configuración" onPress={() => void Linking.openSettings()} style={styles.fullWidthButton} />
            <GlassButton label="Reintentar" variant="secondary" onPress={() => void checkLocationPermission()} style={styles.fullWidthButton} />
            <GlassButton label="Volver" variant="secondary" onPress={goBack} style={styles.fullWidthButton} />
          </View>
        </View>
      </View>
    );
  }

  if (state === 'result' && result) {
    const accion = tipo === 'IN' ? 'entrada' : 'salida';
    const view = {
      success: {
        icon: 'checkmark-circle' as const,
        color: colors.success,
        title: tipo === 'IN' ? 'Entrada registrada' : 'Salida registrada',
      },
      error: {
        icon: 'close-circle' as const,
        color: colors.error,
        title: `No se registró tu ${accion}`,
      },
      unconfirmed: {
        icon: 'alert-circle' as const,
        color: WARNING_COLOR,
        title: 'No pudimos confirmar tu marcación',
      },
    }[result.kind];

    return (
      <View style={styles.root}>
        <ScanHeader title={screenTitle} onBack={goBack} />
        <View style={[glassStyles.sheet, styles.centerContainer]}>
          <View style={[glassStyles.card, styles.resultCard]}>
            <Ionicons name={view.icon} size={64} color={view.color} />
            <Text style={[styles.resultTitle, { color: view.color }]}>{view.title}</Text>
            <Text style={styles.resultText}>{result.message}</Text>
            {result.kind === 'error' && (
              <GlassButton label="Reintentar" onPress={retry} style={styles.fullWidthButton} />
            )}
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
          onBarcodeScanned={state === 'scanning' && locationReady ? handleBarcodeScanned : undefined}
        />

        <ScanHeader title={screenTitle} onBack={goBack} dark />

        <View style={styles.overlay}>
          <View style={styles.frame} />
          <Text style={styles.overlayText}>
            {tipo === 'IN' ? 'Escaneá el QR para registrar tu entrada' : 'Escaneá el QR para registrar tu salida'}
          </Text>
          {showDistanceHint && (
            <Text style={styles.distanceHint}>¿No lee? Alejá la cámara unos 20 cm del QR</Text>
          )}
        </View>

        {state === 'processing' && (
          <View style={styles.processingOverlay}>
            <View style={[glassStyles.modalCard, styles.processingCard]}>
              <ActivityIndicator size="large" color={glassColors.link} />
              <Text style={styles.processingText}>
                {processingStep === 'location'
                  ? `Obteniendo ubicación precisa…${formatAccuracy(currentAccuracy)}`
                  : 'Registrando escaneo...'}
              </Text>
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
  resultTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultText: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
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
  distanceHint: {
    marginTop: 12,
    marginHorizontal: 32,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    overflow: 'hidden',
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
