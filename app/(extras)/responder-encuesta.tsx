import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Encuesta } from '@/features/encuestas/models/Encuesta';
import { ResponderEncuesta } from '@/features/encuestas/views/ResponderEncuesta';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    View,
} from 'react-native';

import { KEYBOARD_BEHAVIOR } from '@/shared/ui/keyboard';
const colors = Colors['light'];

export default function ResponderEncuestaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { canRespondEncuestas } = useRoleCheck();
  const { encuesta: encuestaParam } = useLocalSearchParams<{ encuesta: string }>();

  // Solo empleado-*, encargado y gerencia pueden responder.
  if (user?.rol_nombre && !canRespondEncuestas()) {
    return <Redirect href="/(tabs)" />;
  }

  if (!encuestaParam) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.errorText}>Error: No se encontró la encuesta</ThemedText>
      </View>
    );
  }

  let encuesta: Encuesta;
  try {
    encuesta = JSON.parse(encuestaParam);
  } catch (error) {
    console.error('Error parsing encuesta:', error);
    return (
      <View style={styles.container}>
        <ThemedText style={styles.errorText}>Error: No se pudo cargar la encuesta</ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={KEYBOARD_BEHAVIOR}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Stack.Screen options={{ title: encuesta.titulo }} />
      <ResponderEncuesta
        encuesta={encuesta}
        onCancelar={() => router.back()}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
    textAlign: 'center',
    marginVertical: 20,
  },
});