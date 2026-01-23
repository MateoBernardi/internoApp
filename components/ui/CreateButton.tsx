import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { memo } from 'react';
import {
  GestureResponderEvent,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { ThemedText } from '../themed-text';

type CreateButtonProps = {
  onPress: (event: GestureResponderEvent) => void;
  size?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export const CreateButton = memo(({
  onPress,
  size = 56,
  style,
  accessibilityLabel = 'Crear nuevo elemento',
}: CreateButtonProps) => {
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          backgroundColor: '#00054bff', // Azul marino
        },
        style,
      ]}
      activeOpacity={0.7}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <ThemedText
        style={[
          styles.icon,
          {
            fontSize: size * 0.5,
            color: 'white',
          },
        ]}
      >
        +
      </ThemedText>
    </TouchableOpacity>
  );
});

CreateButton.displayName = 'CreateButton';

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  icon: {
    fontWeight: 'bold',
  },
});
