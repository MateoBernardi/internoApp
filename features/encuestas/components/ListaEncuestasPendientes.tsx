import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Encuesta } from '../models/Encuesta';
import { useGetEncuestas } from '../viewmodels/useEncuestas';

const colors = Colors.light;

export function ListaEncuestasPendientes() {
  const router = useRouter();
  const { data: encuestas, error } = useGetEncuestas();

  const handleResponderEncuesta = (encuesta: Encuesta) => {
    router.push({
      pathname: '/(extras)/responder-encuesta',
      params: { encuesta: JSON.stringify(encuesta) },
    });
  };

  if (error) {
    console.error(error);
    return <ThemedText style={styles.errorText}>{error instanceof Error ? error.message : 'Intenta nuevamente'}</ThemedText>;
  }

  if (!encuestas || encuestas.length === 0) {
    return <ThemedText style={styles.emptyText}>No hay encuestas pendientes</ThemedText>;
  }

  return (
    <View style={styles.listContent}>
      {encuestas.map((item: Encuesta) => {
        const fechaFin = new Date(item.fecha_fin);
        const fechaFinFormateada = fechaFin.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        return (
          <TouchableOpacity
            key={item.id.toString()}
            style={styles.encuestaCard}
            onPress={() => handleResponderEncuesta(item)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={styles.alertBadge}>
                <Text style={styles.alertText}>Pendiente</Text>
              </View>
              {item.es_anonima && (
                <View style={styles.anonimaBadge}>
                  <Text style={styles.anonimaText}>Anonima</Text>
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
              <Text style={styles.buttonText}>Responder ahora</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 15,
  },
  encuestaCard: {
    backgroundColor: colors.componentBackground,
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
    backgroundColor: colors.componentBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  alertText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  anonimaBadge: {
    backgroundColor: colors.componentBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  anonimaText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  descripcion: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 20,
    marginBottom: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  fechaContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  fechaLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 3,
  },
  fechaValue: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  buttonContainer: {
    backgroundColor: colors.lightTint,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.componentBackground,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
    marginHorizontal: 15,
    marginTop: 15,
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: 24,
  },
});
