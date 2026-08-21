import React from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { glassColors, glassStyles } from './glass';

type GlassButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';

const VARIANT_STYLE: Record<GlassButtonVariant, ViewStyle> = {
  primary: glassStyles.button,
  secondary: glassStyles.buttonSecondary,
  danger: glassStyles.buttonDanger,
  success: glassStyles.buttonSuccess,
};

interface GlassButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: GlassButtonVariant;
  icon?: (color: string) => React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export function GlassButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  hideLabel = false,
  style,
  textStyle,
  accessibilityLabel,
}: GlassButtonProps) {
  const isDisabled = disabled || loading;
  const contentColor = isDisabled ? glassColors.disabledText : glassColors.text;

  return (
    <Pressable
      style={[VARIANT_STYLE[variant], isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={contentColor} style={styles.icon} />
      ) : (
        icon && <>{icon(contentColor)}</>
      )}
      {!hideLabel && (
        <Text style={[styles.label, { color: contentColor }, textStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.6,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
