import { UI } from '@/constants/theme';
import { glassColors } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

type AppBackButtonProps = {
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
};

export function AppBackButton({ onPress, iconName = 'arrow-back' }: AppBackButtonProps) {
  return (
    <Pressable onPress={onPress} hitSlop={UI.spacing.sm} style={styles.button}>
      <Ionicons name={iconName} size={UI.icon.lg} color={glassColors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,28,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,28,0.12)',
  },
});
