import { LoginForm } from '@/components/LoginForm';
import React from "react";
import { AuthGradientBackground } from "@/shared/ui/AuthGradientBackground";
import { KEYBOARD_BEHAVIOR } from "@/shared/ui/keyboard";
import { KeyboardAvoidingView, ScrollView, StyleSheet } from "react-native";

export default function Login() {
  return (
    <KeyboardAvoidingView
      style={styles.background}
      behavior={KEYBOARD_BEHAVIOR}
    >
      <AuthGradientBackground />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LoginForm />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
