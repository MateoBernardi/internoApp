import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Encuesta } from '@/features/encuestas/models/Encuesta';
import { ResponderEncuesta } from '@/features/encuestas/views/ResponderEncuesta';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const colors = Colors['light'];

export default function ResponderEncuestaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { encuesta: encuestaParam } = useLocalSearchParams<{ encuesta: string }>();

  if (!encuestaParam) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
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
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedText style={styles.errorText}>Error: No se pudo cargar la encuesta</ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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