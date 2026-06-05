import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const colors = Colors['light'];

interface EncuestasScreenHeaderProps {
  title: string;
  /** Slot izquierdo (por defecto un espaciador de 40px para centrar el título). */
  left?: React.ReactNode;
  /** Slot derecho (por defecto un espaciador de 40px). */
  right?: React.ReactNode;
}

/**
 * Encabezado de pantalla con título centrado, compartido por las vistas de
 * encuestas (`CrearEncuesta`, `VerResultadosEncuestas`).
 */
export const EncuestasScreenHeader: React.FC<EncuestasScreenHeaderProps> = ({ title, left, right }) => (
  <View style={styles.headerContainer}>
    {left ?? <View style={styles.spacer} />}
    <ThemedText type="title" style={styles.headerTitle}>{title}</ThemedText>
    {right ?? <View style={styles.spacer} />}
  </View>
);

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  spacer: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});
