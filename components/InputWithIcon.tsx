import { Feather } from '@expo/vector-icons';
import React, { forwardRef, memo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { ThemedText } from './themed-text';

import type { TextInputProps } from 'react-native';

type InputWithIconProps = {
  icon?: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  accessibilityLabel?: string;
  returnKeyType?: TextInputProps['returnKeyType'];
  textContentType?: TextInputProps['textContentType'];
  keyboardType?: TextInputProps['keyboardType'];
  hasError?: boolean;
  onToggleSecure?: () => void;
  variant?: 'solid' | 'glass';
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
};

export const InputWithIcon = memo(forwardRef<TextInput, InputWithIconProps>(({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  accessibilityLabel,
  returnKeyType = "next",
  textContentType,
  keyboardType = "default",
  hasError = false,
  onToggleSecure,
  variant = 'solid',
  onSubmitEditing,
  blurOnSubmit,
}, ref) => {
  const isGlass = variant === 'glass';
  const toggleIconColor = isGlass ? glassColors.text : '#999';
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[
      styles.inputContainer,
      isGlass && glassStyles.box,
      isGlass && styles.inputContainerGlass,
      isFocused && styles.inputContainerFocused,
      hasError && styles.inputError,
    ]}>
      {icon && (
        <View style={styles.inputIcon}>
          <ThemedText style={styles.iconText}>{icon}</ThemedText>
        </View>
      )}
      <TextInput
        ref={ref}
        style={[styles.input, isGlass && styles.inputGlass, styles.inputNoOutline]}
        placeholder={placeholder}
        placeholderTextColor={isGlass ? glassColors.placeholder : '#999'}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        accessible
        accessibilityLabel={accessibilityLabel}
        returnKeyType={returnKeyType}
        textContentType={textContentType}
        keyboardType={keyboardType}
        importantForAccessibility="yes"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={blurOnSubmit}
      />
      {onToggleSecure && (
        <Pressable
          style={styles.toggleButton}
          onPress={onToggleSecure}
          accessibilityRole="button"
          accessibilityLabel={secureTextEntry ? "Mostrar contraseña" : "Ocultar contraseña"}
        >
          <Feather
            name={secureTextEntry ? "eye" : "eye-off"}
            size={20}
            color={toggleIconColor}
          />
        </Pressable>
      )}
    </View>
  );
}));

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e3e7',
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  inputContainerFocused: {
    borderColor: glassColors.link,
  },
  inputIcon: {
    marginRight: 8,
  },
  iconText: {
    fontSize: 18,
    color: '#b0b6be',
  },
  input: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontSize: 16,
    borderRadius: 12,
    color: '#222',
    backgroundColor: 'transparent',
  },
  // React Native Web renders TextInput as a real <input>, which gets the
  // browser's default focus ring. That ring only wraps the <input> itself
  // (not the glass box around it) and ignores app styling, so it reads as
  // a mismatched outline. We draw our own focus state on the container
  // (inputContainerFocused) instead and suppress the native one here.
  inputNoOutline: {
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,
  inputError: {
    borderColor: '#e57373',
  },
  toggleButton: {
    padding: 8,
    marginLeft: 4,
  },
  inputContainerGlass: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  inputGlass: {
    color: '#11181C',
  },
});
