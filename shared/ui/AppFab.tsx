import { Colors, UI } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

const colors = Colors.light;

type AppFabProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  floating?: boolean;
  bottom?: number;
  right?: number;
  backgroundColor?: string;
  style?: ViewStyle;
};

export function AppFab({
  icon,
  onPress,
  disabled = false,
  isLoading = false,
  floating = true,
  bottom = UI.fab.offsetBottom,
  right = UI.fab.offsetRight,
  backgroundColor,
  style,
}: AppFabProps) {
  const resolvedBackground = backgroundColor ?? (disabled || isLoading ? colors.icon : colors.lightTint);

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          backgroundColor: resolvedBackground,
          ...(floating ? { position: 'absolute' as const, bottom, right } : null),
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.componentBackground} />
      ) : (
        <Ionicons name={icon} size={UI.icon.xl} color={colors.componentBackground} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: UI.fab.size,
    height: UI.fab.size,
    borderRadius: UI.radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: UI.shadow.elevation,
    shadowColor: UI.shadow.color,
    shadowOffset: UI.shadow.offset,
    shadowOpacity: UI.shadow.opacity,
    shadowRadius: UI.shadow.radius,
  },
});
