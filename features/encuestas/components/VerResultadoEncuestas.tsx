import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetalleResultados } from '../resultados/DetalleResultados';
import { styles } from '../resultados/styles';
import { agruparEncuestas, calcularTotalRespuestas } from '../resultados/utils';
import { useEliminarEncuesta, useGetRespuestasEncuesta } from '../viewmodels/useEncuestas';
import { EncuestasScreenHeader } from './EncuestasScreenHeader';

interface VerResultadosEncuestasProps {
  onVolver: () => void;
}

const colors = Colors['light'];

export const VerResultadosEncuestas: React.FC<VerResultadosEncuestasProps> = ({ onVolver }) => {
  const { data: encuestas, isLoading, error, refetch } = useGetRespuestasEncuesta();
  const { mutate: eliminarEncuesta, isPending: isDeleting } = useEliminarEncuesta();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [encuestaSeleccionada, setEncuestaSeleccionada] = useState<number | null>(null);

  const handleEliminarEncuesta = (encuestaId: number, titulo: string) => {
    Alert.alert(
      'Eliminar Encuesta',
      `¿Estás seguro de que deseas eliminar la encuesta "${titulo}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            eliminarEncuesta(encuestaId, {
              onSuccess: () => {
                Alert.alert('Éxito', 'La encuesta ha sido eliminada correctamente');
                refetch();
              },
              onError: (error) => {
                Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
                console.error(error);
              },
            });
          },
        },
      ]
    );
  };

  const backButton = (
    <TouchableOpacity onPress={onVolver} style={{ width: 40, height: 40, justifyContent: 'center' }}>
      <Ionicons name="chevron-back" size={24} color={colors.lightTint} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <EncuestasScreenHeader title="Resultados" left={backButton} />
        <ScreenSkeleton rows={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <EncuestasScreenHeader title="Resultados" left={backButton} />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorSubtext}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!encuestas || encuestas.length === 0) {
    return (
      <View style={styles.container}>
        <EncuestasScreenHeader title="Resultados" left={backButton} />
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={48} color={colors.secondaryText} />
          <Text style={styles.emptyText}>No hay resultados disponibles</Text>
          <Text style={styles.emptySubtext}>
            Las encuestas completadas aparecerán aquí
          </Text>
        </View>
      </View>
    );
  }

  // Agrupar respuestas por encuesta y pregunta
  const respuestasAgrupadas = encuestas && Array.isArray(encuestas) 
    ? agruparEncuestas(encuestas) 
    : [];

  if (respuestasAgrupadas.length === 0) {
    return (
      <View style={styles.container}>
        <EncuestasScreenHeader title="Resultados" left={backButton} />
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={48} color={colors.secondaryText} />
          <Text style={styles.emptyText}>No hay resultados disponibles</Text>
          <Text style={styles.emptySubtext}>
            Las encuestas completadas aparecerán aquí
          </Text>
        </View>
      </View>
    );
  }

  if (encuestaSeleccionada !== null) {
    const encuesta = respuestasAgrupadas.find(
      (e) => e.encuestaId === encuestaSeleccionada
    );
    if (encuesta) {
      const esCreador = user?.user_context_id === encuesta.created_by;
      return (
        <DetalleResultados
          encuesta={encuesta}
          onVolver={() => setEncuestaSeleccionada(null)}
          onEliminar={() => handleEliminarEncuesta(encuesta.encuestaId, encuesta.encuestaTitulo)}
          isDeleting={isDeleting}
          esCreador={esCreador}
        />
      );
    }
  }

  return (
    <View style={styles.container}>
      <EncuestasScreenHeader title="Resultados" left={backButton} />

      <View style={styles.subHeader}>
        <Text style={styles.headerSubtitle}>
          {respuestasAgrupadas.length} encuesta
          {respuestasAgrupadas.length !== 1 ? 's' : ''} con respuestas
        </Text>
      </View>

      <FlatList
        data={respuestasAgrupadas}
        keyExtractor={(item) => item.encuestaId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.encuestaCard}
            onPress={() => setEncuestaSeleccionada(item.encuestaId)}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={styles.encuestaTitulo}>{item.encuestaTitulo}</Text>
              {item.es_anonima && (
                <View style={styles.anonimaBadge}>
                  <Ionicons name="eye-off-outline" size={12} color={colors.secondaryText} />
                  <Text style={styles.anonimaText}>Anónima</Text>
                </View>
              )}
            </View>
            {item.creador_nombre && (
              <Text style={styles.creadorText}>
                Creada por: {item.creador_nombre} {item.creador_apellido}
              </Text>
            )}
            {item.encuestaDescripcion && (
              <Text style={styles.encuestaDescripcion} numberOfLines={2}>
                {item.encuestaDescripcion}
              </Text>
            )}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Preguntas</Text>
                <Text style={styles.statValue}>{item.preguntas.length}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Respuestas</Text>
                <Text style={styles.statValue}>
                  {calcularTotalRespuestas(item)}
                </Text>
              </View>
            </View>
            <View style={styles.verDetalleButton}>
              <Text style={styles.verDetalleText}>Ver detalles</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.componentBackground} />
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};
