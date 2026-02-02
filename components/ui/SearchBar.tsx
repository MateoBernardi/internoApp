import { Colors } from '@/constants/theme';
import React, { memo } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { ThemedText } from '../themed-text';

type SearchBarProps = {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export const SearchBar = memo(({
  placeholder = '',
  value,
  onChangeText,
  onClear,
  onFocus,
  onBlur,
  style,
  accessibilityLabel = 'Buscador',
}: SearchBarProps) => {
  const colors = Colors['light'];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.componentBackground,
          borderColor: colors.lightTint,
          borderWidth: 1,
        },
        style,
      ]}
    >
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryText}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="search"
      />
      {value.length > 0 && onClear && (
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessible
          accessibilityLabel="Limpiar búsqueda"
          accessibilityRole="button"
        >
          <ThemedText style={styles.clearIcon}>✕</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
});

SearchBar.displayName = 'SearchBar';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 24,
    height: 40,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
