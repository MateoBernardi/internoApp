import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const colors = Colors['light'];

interface EncuestasScreenHeaderProps {
  title: string;
  /** Slot izquierdo (por defecto un espaciador de 40px para centrar el título). */
  left?: React.ReactNode;
  /** Slot derecho (por defecto un espaciador de 40px). */
  right?: React.ReactNode;
}

export const EncuestasScreenHeader: React.FC<EncuestasScreenHeaderProps> = ({ title, left, right }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
      {left ?? <View style={styles.spacer} />}
      <ThemedText type="title" style={styles.headerTitle}>{title}</ThemedText>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
