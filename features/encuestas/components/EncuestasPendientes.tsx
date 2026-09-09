import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { GlassButton } from '@/shared/ui/GlassButton';
import { glassStyles } from '@/shared/ui/glass';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useGetEncuestas } from '../viewmodels/useEncuestas';

const colors = Colors['light'];

interface EncuestasPendientesProps {
  enabled?: boolean;
}

export function EncuestasPendientes({ enabled = true }: EncuestasPendientesProps) {
  const router = useRouter();
  const { data: encuestas, error } = useGetEncuestas(enabled);

  const handleVerPendientes = () => {
    router.push('/(extras)/encuestas-pendientes');
  };

  if (error) {
    console.error(error);
    return <ThemedText style={styles.errorText}>{error instanceof Error ? error.message : 'Intenta nuevamente'}</ThemedText>;
  }

  if (!encuestas || encuestas.length === 0) {
    return null;
  }

  const tieneEncuestaHorario = encuestas.every((encuesta) =>
    encuesta.preguntas?.every((pregunta) => pregunta.tipo_pregunta === 'horario')
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, glassStyles.card]}>
        <Text style={styles.headerTitle}>
          {tieneEncuestaHorario ? 'Turnero disponible' : 'Encuestas sin Responder'}
        </Text>
        <Text style={styles.headerSubtitle}>
          Tienes {encuestas.length} encuesta{encuestas.length !== 1 ? 's' : ''}{' '}
          pendiente{encuestas.length !== 1 ? 's' : ''}
        </Text>

        <GlassButton label="Ver" onPress={handleVerPendientes} style={styles.viewButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: colors.componentBackground,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  viewButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.secondaryText,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 5,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
  },
});