import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { GlassButton } from '@/shared/ui/GlassButton';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTurnoScanActivo } from '../viewmodels/useTurnoScanActivo';

const colors = Colors['light'];

/**
 * Card que aparece en el Home cuando corresponde escanear la entrada o
 * salida de un turno (ventana de 20 min antes del horario esperado hasta que
 * se registra el marcado). Se re-tickea cada segundo para reevaluar la
 * ventana activa; no renderiza nada mientras no haya un prompt activo.
 */
export function TurnoScanCard() {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const { isDesktop } = useResponsiveLayout();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const activo = useTurnoScanActivo(now);

  // Escanear un QR solo tiene sentido desde la cámara del teléfono.
  if (Platform.OS === 'web' && isDesktop) return null;
  if (!activo) return null;

  const isEntrada = activo.tipo === 'IN';

  const handlePress = () => {
    router.push({
      // Cast defensivo: expo-router typed routes recién genera el literal
      // para esta pantalla nueva al correr el dev server / build.
      pathname: '/(extras)/escanear-turno' as any,
      params: { tipo: activo.tipo, turno: activo.turno, fecha: activo.fecha },
    });
  };

  return (
    <ThemedView style={[styles.card, glassStyles.card]} lightColor={colors.componentBackground}>
      <View style={[glassStyles.button, styles.iconContainer]}>
        <Ionicons
          name={isEntrada ? 'log-in-outline' : 'log-out-outline'}
          size={24}
          color={glassColors.link}
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {isEntrada ? 'Registrá tu entrada' : 'Registrá tu salida'}
        </Text>
      </View>

      <GlassButton
        label={isEntrada ? 'Escanear entrada' : 'Escanear salida'}
        onPress={handlePress}
        style={styles.button}
        textStyle={styles.buttonText}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexShrink: 0,
  },
  buttonText: {
    fontSize: 13,
  },
});
