import { Colors, UI } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

const colors = Colors.light;

type AppBackButtonProps = {
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
};

export function AppBackButton({ onPress, iconName = 'arrow-back' }: AppBackButtonProps) {
  return (
    <Pressable onPress={onPress} hitSlop={UI.spacing.sm} style={styles.button}>
      <Ionicons name={iconName} size={UI.icon.lg} color={colors.lightTint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: UI.spacing.xs,
  },
});
