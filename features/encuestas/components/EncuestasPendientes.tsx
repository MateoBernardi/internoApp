import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useGetEncuestas } from '../viewmodels/useEncuestas';

const colors = Colors['light'];

export function EncuestasPendientes() {
  const router = useRouter();
  const { data: encuestas, error } = useGetEncuestas();

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Encuestas sin Responder</Text>
        <Text style={styles.headerSubtitle}>
          Tienes {encuestas.length} encuesta{encuestas.length !== 1 ? 's' : ''}{' '}
          pendiente{encuestas.length !== 1 ? 's' : ''}
        </Text>

        <TouchableOpacity style={styles.viewButton} onPress={handleVerPendientes} activeOpacity={0.8}>
          <Text style={styles.viewButtonText}>Ver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.componentBackground,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: colors.componentBackground,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
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
    backgroundColor: colors.lightTint,
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: colors.componentBackground,
    fontSize: 16,
    fontWeight: '600',
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