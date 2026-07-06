import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    BackHandler,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EncuestasScreenHeader } from '../components/EncuestasScreenHeader';
import { CrearEncuesta } from '../components/CrearEncuesta';
import { VerResultadosEncuestas } from '../components/VerResultadoEncuestas';

const colors = Colors['light'];

type OpcionSeleccionada = 'crear' | 'resultados' | null;

export const Encuestas: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [opcionSeleccionada, setOpcionSeleccionada] =
    useState<OpcionSeleccionada>(null);

  const handleVolver = () => {
    setOpcionSeleccionada(null);
  };

  const handleEncuestaCreada = () => {
    setOpcionSeleccionada(null);
  };

  useEffect(() => {
    if (!opcionSeleccionada) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleVolver();
      return true; // consumir el evento: no propagar al router
    });
    return () => sub.remove();
  }, [opcionSeleccionada]);

  // Si hay una opción seleccionada, mostrar el componente correspondiente
  if (opcionSeleccionada === 'crear') {
    return <CrearEncuesta onEncuestaCreada={handleEncuestaCreada} onVolver={handleVolver} />;
  }

  if (opcionSeleccionada === 'resultados') {
    return <VerResultadosEncuestas onVolver={handleVolver} />;
  }

  // Pantalla de selección de opciones
  const backButton = (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{ width: 40, height: 40, justifyContent: 'center' }}
    >
      <Ionicons name="chevron-back" size={24} color={colors.lightTint} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <EncuestasScreenHeader title="Encuestas" left={backButton} />
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => setOpcionSeleccionada('crear')}
          activeOpacity={0.7}
        >
          <View style={styles.cardRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="create-outline" size={28} color={colors.lightTint} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.optionTitle}>Crear Encuesta</Text>
              <Text style={styles.optionDescription}>
                Crea una nueva encuesta con preguntas personalizadas
              </Text>
            </View>
            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={24} color={colors.lightTint} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => setOpcionSeleccionada('resultados')}
          activeOpacity={0.7}
        >
          <View style={styles.cardRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="bar-chart-outline" size={28} color={colors.lightTint} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.optionTitle}>Ver Resultados</Text>
              <Text style={styles.optionDescription}>
                Consulta y analiza las respuestas de las encuestas
              </Text>
            </View>
            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={24} color={colors.lightTint} />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 16,
  },
  optionCard: {
    backgroundColor: colors.componentBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.background,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.lightTint + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  arrowContainer: {
    marginLeft: 8,
  },
});