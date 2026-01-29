import { ThemedText } from '@/components/themed-text';
import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Encuesta } from '../models/Encuesta';
import { useGetEncuestas } from '../viewmodels/useEncuestas';
import { ResponderEncuesta } from '../views/ResponderEncuesta';

export function EncuestasPendientes() {
  const { data: encuestas, error } = useGetEncuestas();
  const [encuestaSeleccionada, setEncuestaSeleccionada] = useState<Encuesta | null>(null);

  // Si hay una encuesta seleccionada, mostrar el formulario para responderla
  if (encuestaSeleccionada) {
    return (
      <ResponderEncuesta
        encuesta={encuestaSeleccionada}
        onCancelar={() => setEncuestaSeleccionada(null)}
      />
    );
  }

  if (error) {
    console.error(error);
    return <ThemedText style={styles.errorText}>Error al cargar las encuestas.</ThemedText>;
  }

  if (!encuestas || encuestas.length === 0) {
    return null;
  }

  const renderEncuestaItem = ({ item }: { item: Encuesta }) => {
    const fechaFin = new Date(item.fecha_fin);
    const fechaFinFormateada = fechaFin.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
    })

    return (
      <TouchableOpacity
        style={styles.encuestaCard}
        onPress={() => setEncuestaSeleccionada(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.alertBadge}>
            <Text style={styles.alertText}>📋 Pendiente</Text>
          </View>
          {item.es_anonima && (
            <View style={styles.anonimaBadge}>
              <Text style={styles.anonimaText}>🔒 Anónima</Text>
            </View>
          )}
        </View>

        <Text style={styles.titulo}>{item.titulo}</Text>

        {item.descripcion && (
          <Text style={styles.descripcion} numberOfLines={3}>
            {item.descripcion}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.fechaContainer}>
            <Text style={styles.fechaLabel}>Finaliza:</Text>
            <Text style={styles.fechaValue}>{fechaFinFormateada}</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Text style={styles.buttonText}>Responder ahora →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Encuestas sin Responder</Text>
        <Text style={styles.headerSubtitle}>
          Tienes {encuestas.length} encuesta{encuestas.length !== 1 ? 's' : ''}{' '}
          pendiente{encuestas.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={encuestas}
        renderItem={renderEncuestaItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 15,
  },
  encuestaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  alertBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  alertText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
  },
  anonimaBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  anonimaText: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '600',
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  descripcion: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  categoriaContainer: {
    flex: 1,
  },
  categoriaLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },
  categoriaValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  fechaContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  fechaLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },
  fechaValue: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '600',
  },
  buttonContainer: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 5,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});