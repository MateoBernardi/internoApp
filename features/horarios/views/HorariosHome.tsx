import { Colors } from '@/constants/theme';
import { EncuestasScreenHeader } from '@/features/encuestas/components/EncuestasScreenHeader';
import { AppBackButton } from '@/shared/ui/AppBackButton';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestionHorarios } from './GestionHorarios';
import { HorasExtras } from './HorasExtras';

import { AMBER } from '../theme';
const colors = Colors['light'];

type Screen = 'home' | 'turnos' | 'horas';

export function HorariosHome() {
  const [screen, setScreen] = useState<Screen>('home');
  const goHome = () => setScreen('home');

  useEffect(() => {
    if (screen === 'home') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true; // consumir el evento: no propagar al router
    });
    return () => sub.remove();
  }, [screen]);

  // El valor se re-declara en cada estado (no solo cuando es false) porque
  // expo-router no restaura el valor previo al desmontar un <Stack.Screen>
  // condicional: hay que fijarlo explícitamente en true al volver a 'home'.
  const headerToggle = <Stack.Screen options={{ headerShown: screen === 'home' }} />;

  const backButton = <AppBackButton onPress={goHome} />;

  if (screen === 'turnos') {
    return (
      <View style={styles.subScreen}>
        {headerToggle}
        <EncuestasScreenHeader title="Manejo de turnos" left={backButton} />
        <GestionHorarios />
      </View>
    );
  }

  if (screen === 'horas') {
    return (
      <View style={styles.subScreen}>
        {headerToggle}
        <EncuestasScreenHeader title="Horas extra" left={backButton} />
        <HorasExtras />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {headerToggle}

      <View style={styles.menu}>
        <TouchableOpacity style={[glassStyles.fieldGlass, styles.optionCard]} onPress={() => setScreen('turnos')} activeOpacity={0.75}>
          <View style={styles.cardRow}>
            <View style={[glassStyles.button, styles.iconContainer]}>
              <Ionicons name="cloud-upload-outline" size={26} color={colors.lightTint} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.optionTitle}>Manejo de turnos</Text>
              <Text style={styles.optionDescription}>Cargar, editar e importar turnos del día</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={glassColors.textMuted} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[glassStyles.fieldGlass, styles.optionCard]} onPress={() => setScreen('horas')} activeOpacity={0.75}>
          <View style={styles.cardRow}>
            <View style={[glassStyles.button, styles.iconContainer, styles.iconContainerAmber]}>
              <Ionicons name="cash-outline" size={26} color={AMBER} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.optionTitle}>Manejo de horas extras</Text>
              <Text style={styles.optionDescription}>Ver y liquidar horas extra por empleado</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={glassColors.textMuted} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingTop: 24,
  },
  menu: {
    gap: 12,
  },
  optionCard: {
    padding: 18,
    minHeight: 90,
    borderRadius: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerAmber: {
    backgroundColor: 'rgba(201,138,26,0.12)',
    borderColor: 'rgba(201,138,26,0.35)',
  },
  cardTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  subScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
