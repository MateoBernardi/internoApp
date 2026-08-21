import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { GlassButton } from '@/shared/ui/GlassButton';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TURNO_LABEL } from '../models/Turno';
import { useTurnoScanActivo } from '../viewmodels/useTurnoScanActivo';

const colors = Colors['light'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatCountdown(msLeft: number): string {
  const totalSeconds = Math.floor(Math.abs(msLeft) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Card que aparece en el Home cuando corresponde escanear la entrada o
 * salida de un turno (ventana de 20 min antes del horario esperado hasta que
 * se registra el marcado). Se re-tickea cada segundo para el countdown; no
 * renderiza nada mientras no haya un prompt activo.
 */
export function TurnoScanCard() {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const activo = useTurnoScanActivo(now);

  if (!activo) return null;

  const isEntrada = activo.tipo === 'IN';
  const yaComenzo = activo.msLeft <= 0;
  const countdownLabel = yaComenzo
    ? `Ya podés escanear (hace ${formatCountdown(activo.msLeft)})`
    : `Faltan ${formatCountdown(activo.msLeft)}`;

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
        <Text style={styles.subtitle} numberOfLines={1}>
          Turno {TURNO_LABEL[activo.turno]} · {countdownLabel}
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
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
  subtitle: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
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
