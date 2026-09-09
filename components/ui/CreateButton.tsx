import { boxShadow } from '@/shared/ui/boxShadow';
import { glassColors } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet } from 'react-native';

const SIZE = 40;

type CreateButtonProps = {
  onPress: (event: GestureResponderEvent) => void;
  accessibilityLabel: string;
};

/**
 * The one "create new X" trigger used everywhere in the app — same size,
 * same colors, same icon. Intentionally has no `size`/`style` props so no
 * call site can drift from any other.
 */
export const CreateButton = memo(({ onPress, accessibilityLabel }: CreateButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="add" size={22} color={glassColors.link} />
    </Pressable>
  );
});

CreateButton.displayName = 'CreateButton';

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26,115,232,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(26,115,232,0.35)',
    boxShadow: boxShadow({ width: 0, height: 4 }, 0.08, 16),
  },
});
