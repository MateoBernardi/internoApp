import React, { useState } from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { CrearEncuesta } from '../components/CrearEncuesta';
import { VerResultadosEncuestas } from '../components/VerResultadoEncuestas';

type OpcionSeleccionada = 'crear' | 'resultados' | null;

export const Encuestas: React.FC = () => {
  const [opcionSeleccionada, setOpcionSeleccionada] =
    useState<OpcionSeleccionada>(null);

  const handleEncuestaCreada = () => {
    setOpcionSeleccionada(null);
  };

  // Si hay una opción seleccionada, mostrar el componente correspondiente
  if (opcionSeleccionada === 'crear') {
    return <CrearEncuesta onEncuestaCreada={handleEncuestaCreada} />;
  }

  if (opcionSeleccionada === 'resultados') {
    return <VerResultadosEncuestas />;
  }

  // Pantalla de selección de opciones
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestión de Encuestas</Text>
        <Text style={styles.headerSubtitle}>
          Selecciona una opción para continuar
        </Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => setOpcionSeleccionada('crear')}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📝</Text>
          </View>
          <Text style={styles.optionTitle}>Crear Encuesta</Text>
          <Text style={styles.optionDescription}>
            Crea una nueva encuesta con preguntas personalizadas para tus
            usuarios
          </Text>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => setOpcionSeleccionada('resultados')}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📊</Text>
          </View>
          <Text style={styles.optionTitle}>Ver Resultados</Text>
          <Text style={styles.optionDescription}>
            Consulta y analiza las respuestas de las encuestas completadas
          </Text>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: Las encuestas te ayudan a obtener feedback valioso de tus
          usuarios
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  arrowContainer: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});