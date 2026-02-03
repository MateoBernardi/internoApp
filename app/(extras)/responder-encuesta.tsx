import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Encuesta } from '@/features/encuestas/models/Encuesta';
import { ResponderEncuesta } from '@/features/encuestas/views/ResponderEncuesta';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
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
  backButton: {
    backgroundColor: colors.lightTint,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
  },
  backButtonText: {
    color: colors.componentBackground,
    fontSize: 16,
    fontWeight: '600',
  },
});