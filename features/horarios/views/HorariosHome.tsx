import { Colors } from '@/constants/theme';
import { EncuestasScreenHeader } from '@/features/encuestas/components/EncuestasScreenHeader';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestionHorarios } from './GestionHorarios';
import { HorasExtras } from './HorasExtras';

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

  const backButton = (
    <TouchableOpacity onPress={goHome} style={{ width: 40, height: 40, justifyContent: 'center' }}>
      <Ionicons name="chevron-back" size={24} color={colors.lightTint} />
    </TouchableOpacity>
  );

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
        <TouchableOpacity style={styles.optionCard} onPress={() => setScreen('turnos')} activeOpacity={0.7}>
          <View style={styles.cardRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="cloud-upload-outline" size={26} color={colors.lightTint} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.optionTitle}>Manejo de turnos</Text>
              <Text style={styles.optionDescription}>Cargar, editar e importar turnos del día</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.lightTint} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => setScreen('horas')} activeOpacity={0.7}>
          <View style={styles.cardRow}>
            <View style={[styles.iconContainer, styles.iconContainerAmber]}>
              <Ionicons name="cash-outline" size={26} color="#c98a1a" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.optionTitle}>Manejo de horas extras</Text>
              <Text style={styles.optionDescription}>Ver y liquidar horas extra por empleado</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.lightTint} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
    paddingHorizontal: 18,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 4,
    marginBottom: 20,
  },
  menu: {
    gap: 14,
  },
  optionCard: {
    backgroundColor: colors.componentBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.background,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.lightTint + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerAmber: {
    backgroundColor: '#fbf1dd',
  },
  cardTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
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
