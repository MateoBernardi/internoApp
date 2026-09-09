import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { deriveQrCode, currentCounter, QR_STEP_SECONDS } from '@/features/horarios/utils/qrToken';
import { getKioskSecret } from '@/features/horarios/services/horariosService';
import { useSedes } from '@/features/horarios/viewmodels/useHorarios';
import type { SedeDTO } from '@/features/horarios/models/HorarioDTO';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { secureStorage } from '@/shared/secureStorage';
import { boxShadow } from '@/shared/ui/boxShadow';
import { GlassButton } from '@/shared/ui/GlassButton';
import { glassStyles } from '@/shared/ui/glass';
import { Redirect } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const colors = Colors['light'];

const KIOSK_CONFIG_STORAGE_KEY = 'kiosk_qr_config';
// El kiosco no necesita recomputar el código cada 30s exactos: refrescar cada
// ~10s alcanza para que nunca se muestre un código vencido y da margen de
// sobra frente al `step` real (ver "Token contract" en el plan de QR).
const REFRESH_INTERVAL_MS = 10_000;

interface KioskConfig {
  sedeId: number;
  qrSecret: string;
  step: number;
}

function isKioskConfig(value: unknown): value is KioskConfig {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sedeId === 'number' &&
    typeof v.qrSecret === 'string' &&
    v.qrSecret.length > 0 &&
    typeof v.step === 'number'
  );
}

export default function KioscoQrScreen() {
  const { user, tokens, signOut } = useAuth();
  const { isKiosk } = useRoleCheck();
  const token = tokens?.accessToken;
  const insets = useSafeAreaInsets();

  const [config, setConfig] = useState<KioskConfig | null | undefined>(undefined); // undefined = todavía no se leyó SecureStore
  const [loadingSecret, setLoadingSecret] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);

  const sedesQuery = useSedes();

  // Carga la config cacheada (si el operador ya eligió sede antes).
  useEffect(() => {
    let mounted = true;
    secureStorage
      .getItem(KIOSK_CONFIG_STORAGE_KEY)
      .then((raw) => {
        if (!mounted) return;
        if (!raw) {
          setConfig(null);
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          setConfig(isKioskConfig(parsed) ? parsed : null);
        } catch {
          setConfig(null);
        }
      })
      .catch(() => {
        if (mounted) setConfig(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handlePickSede = useCallback(
    async (sede: SedeDTO) => {
      if (!token) return;
      setLoadingSecret(true);
      setErrorMessage(null);
      try {
        const secret = await getKioskSecret(token, sede.id);
        if (!secret.qrSecret) {
          setErrorMessage('La sede no tiene un secreto QR configurado.');
          return;
        }
        const nextConfig: KioskConfig = {
          sedeId: sede.id,
          qrSecret: secret.qrSecret,
          step: secret.step || QR_STEP_SECONDS,
        };
        await secureStorage.setItem(KIOSK_CONFIG_STORAGE_KEY, JSON.stringify(nextConfig));
        setConfig(nextConfig);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo obtener el secreto QR.');
      } finally {
        setLoadingSecret(false);
      }
    },
    [token]
  );

  const handleChangeSede = useCallback(async () => {
    await secureStorage.deleteItem(KIOSK_CONFIG_STORAGE_KEY);
    setConfig(null);
    setQrValue(null);
  }, []);

  // Recomputa el código rotativo cada REFRESH_INTERVAL_MS mientras haya una
  // sede configurada.
  useEffect(() => {
    if (!config) {
      setQrValue(null);
      return;
    }

    const tick = () => {
      const code = deriveQrCode(config.qrSecret, currentCounter());
      setQrValue(JSON.stringify({ s: config.sedeId, c: code }));
    };

    tick();
    const id = setInterval(tick, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [config]);

  const sedeNombre = useMemo(() => {
    if (!config) return null;
    return sedesQuery.data?.find((s) => s.id === config.sedeId)?.nombre ?? `Sede #${config.sedeId}`;
  }, [config, sedesQuery.data]);

  // Esperar a que el rol esté cargado antes de decidir si redirigir.
  if (user?.rol_nombre && !isKiosk()) {
    return <Redirect href="/(tabs)" />;
  }

  if (config === undefined) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.lightTint} />
      </View>
    );
  }

  if (!config) {
    return (
      <View style={[styles.pickContainer, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.pickTitle}>Elegí la sede de este kiosco</Text>
        <Text style={styles.pickSubtitle}>
          Esta elección queda guardada en el dispositivo; no hace falta repetirla.
        </Text>

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        {sedesQuery.isLoading ? (
          <ActivityIndicator size="large" color={colors.lightTint} style={styles.pickLoading} />
        ) : (
          <FlatList
            data={sedesQuery.data ?? []}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[glassStyles.card, styles.sedeOption]}
                onPress={() => handlePickSede(item)}
                disabled={loadingSecret}
                activeOpacity={0.7}
              >
                <Text style={styles.sedeOptionText}>{item.nombre}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {loadingSecret && (
          <ActivityIndicator size="small" color={colors.lightTint} style={styles.pickLoading} />
        )}

        <GlassButton
          label="Cerrar sesión"
          variant="secondary"
          onPress={signOut}
          style={styles.logoutButton}
        />
      </View>
    );
  }

  return (
    <View style={[styles.kioskContainer, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.sedeLabel}>{sedeNombre}</Text>
      <Text style={styles.kioskHint}>Escaneá este código para registrar tu entrada o salida</Text>

      <View style={styles.qrWrapper}>
        {qrValue ? (
          <QRCode value={qrValue} size={280} backgroundColor="#ffffff" color="#000000" />
        ) : (
          <ActivityIndicator size="large" color={colors.lightTint} />
        )}
      </View>

      <GlassButton
        label="Cambiar sede"
        variant="secondary"
        onPress={handleChangeSede}
        style={styles.changeSedeButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.componentBackground,
  },
  pickContainer: {
    flex: 1,
    backgroundColor: colors.componentBackground,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  pickTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  pickSubtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 6,
    marginBottom: 20,
  },
  pickLoading: {
    marginTop: 20,
  },
  logoutButton: {
    marginTop: 20,
    marginBottom: 20,
    alignSelf: 'center',
    minWidth: 160,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: 16,
  },
  sedeOption: {
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  sedeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  separator: {
    height: 10,
  },
  kioskContainer: {
    flex: 1,
    backgroundColor: colors.lightTint,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sedeLabel: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  kioskHint: {
    fontSize: 14,
    color: '#ffffffcc',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  qrWrapper: {
    // Sólido a propósito (no glass translúcido): es una superficie que
    // "flota" sobre el fondo navy del kiosco, igual que cualquier modal/diálogo
    // de la app — ver regla de glassStyles.modalCard.
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    minHeight: 328,
    minWidth: 328,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: boxShadow({ width: 0, height: 4 }, 0.15, 12),
  },
  changeSedeButton: {
    marginTop: 40,
    minWidth: 160,
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
});
