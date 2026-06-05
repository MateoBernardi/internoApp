import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { RespuestasMultipleChoice } from './RespuestasMultipleChoice';
import { RespuestasRating } from './RespuestasRating';
import { RespuestasSiNo } from './RespuestasSiNo';
import { RespuestasTexto } from './RespuestasTexto';
import { styles } from './styles';
import { getTipoPreguntaLabel, type RespuestaAgrupada } from './utils';

const colors = Colors['light'];

interface DetalleResultadosProps {
  encuesta: RespuestaAgrupada;
  onVolver: () => void;
  onEliminar: () => void;
  isDeleting: boolean;
  esCreador: boolean;
}

/** Detalle de resultados de una encuesta: una tarjeta por pregunta con su tipo. */
export const DetalleResultados: React.FC<DetalleResultadosProps> = ({
  encuesta,
  onVolver,
  onEliminar,
  isDeleting,
  esCreador,
}) => {
  const esEncuestaEnProgreso = () => {
    if (!encuesta.fecha_fin) return false;
    return new Date(encuesta.fecha_fin) > new Date();
  };

  return (
    <View style={styles.container}>
      <View style={styles.detailHeaderContainer}>
        <TouchableOpacity onPress={onVolver} style={styles.resultadosButton}>
          <Text style={styles.resultadosButtonText}>Resultados</Text>
        </TouchableOpacity>
        <View style={styles.detailTitleContainer}>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>{encuesta.encuestaTitulo}</Text>
          {encuesta.es_anonima && (
            <View style={styles.anonimaBadgeSmall}>
              <Ionicons name="eye-off-outline" size={10} color={colors.secondaryText} />
              <Text style={styles.anonimaTextSmall}>Anónima</Text>
            </View>
          )}
        </View>
        {esCreador ? (
          <TouchableOpacity
            onPress={onEliminar}
            style={styles.deleteButton}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.deleteButton} />
        )}
      </View>

      {encuesta.encuestaDescripcion && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.detailDescription}>{encuesta.encuestaDescripcion}</Text>
        </View>
      )}

      {esEncuestaEnProgreso() && (
        <View style={styles.enProgresoCartel}>
          <Ionicons name="time-outline" size={16} color={colors.componentBackground} />
          <Text style={styles.enProgresoText}>En progreso</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollViewContent}>
        {encuesta.preguntas.map((item, index) => (
          <View key={index} style={styles.preguntaResultadoCard}>
            <View style={styles.preguntaHeader}>
              <Text style={styles.preguntaNumero}>Pregunta {index + 1}</Text>
              <Text style={styles.tipoPreguntaBadge}>
                {getTipoPreguntaLabel(item.pregunta.tipo_pregunta)}
              </Text>
            </View>

            <Text style={styles.preguntaTitulo}>{item.pregunta.titulo}</Text>

            <View style={styles.respuestasContainer}>
              <Text style={styles.respuestasHeader}>
                Respuestas ({item.respuestas.length})
              </Text>

              {item.pregunta.tipo_pregunta === 'rating' && (
                <RespuestasRating respuestas={item.respuestas} />
              )}

              {item.pregunta.tipo_pregunta === 'texto' && (
                <RespuestasTexto respuestas={item.respuestas} />
              )}

              {item.pregunta.tipo_pregunta === 'multiple_choice' && (
                <RespuestasMultipleChoice
                  respuestas={item.respuestas}
                  pregunta={item.pregunta}
                />
              )}

              {item.pregunta.tipo_pregunta === 'si_no' && (
                <RespuestasSiNo respuestas={item.respuestas} />
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};
