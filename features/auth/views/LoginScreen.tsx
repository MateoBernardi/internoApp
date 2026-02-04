import { LoginForm } from '@/components/LoginForm';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import React, { useRef } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions } from "react-native";

// behavior y offset dinámicos según plataforma
const KEYBOARD_BEHAVIOR = Platform.OS === 'ios' ? 'padding' : 'height';
const KEYBOARD_OFFSET = Platform.OS === 'ios' ? 0 : 20;

export default function Login() {
  // Refs para optimizar KeyboardAvoidingView
  const scrollViewRef = useRef(null);
  const { height: windowHeight } = useWindowDimensions();

  return (
    <KeyboardAvoidingView
      style={styles.background}
      behavior={KEYBOARD_BEHAVIOR}
      keyboardVerticalOffset={KEYBOARD_OFFSET}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { minHeight: windowHeight - 100 } // Dinámico basado en screen height
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
        scrollEventThrottle={16}
        keyboardDismissMode="on-drag"
      >
        <ThemedView style={styles.formSection}>
          <LoginForm />
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: Colors.light.componentBackground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  formSection: {
    backgroundColor: 'transparent',
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});
