import React, { memo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from './themed-text';

import type { TextInputProps } from 'react-native';

type InputWithIconProps = {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  accessibilityLabel?: string;
  returnKeyType?: TextInputProps['returnKeyType'];
  textContentType?: TextInputProps['textContentType'];
  hasError?: boolean;
};

export const InputWithIcon = memo(({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  accessibilityLabel,
  returnKeyType = "next",
  textContentType,
  hasError = false
}: InputWithIconProps) => (
  <View style={[styles.inputContainer, hasError && styles.inputError]}>
    <View style={styles.inputIcon}>
      <ThemedText style={styles.iconText}>{icon}</ThemedText>
    </View>
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
      accessible
      accessibilityLabel={accessibilityLabel}
      returnKeyType={returnKeyType}
      textContentType={textContentType}
      importantForAccessibility="yes"
    />
  </View>
));

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e3e7',
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
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
    paddingVertical: 10,
    fontSize: 16,
    borderRadius: 12,
    color: '#222',
    backgroundColor: 'transparent',
  },
  inputError: {
    borderColor: '#e57373',
  },
});