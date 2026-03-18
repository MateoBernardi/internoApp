import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Encuesta, Pregunta, Respuesta } from '../models/Encuesta';
import { useEnviarRespuestasEncuesta } from '../viewmodels/useEncuestas';

interface ResponderEncuestaProps {
  encuesta: Encuesta;
  onCancelar: () => void;
}

const colors = Colors['light'];

export const ResponderEncuesta: React.FC<ResponderEncuestaProps> = ({ encuesta, onCancelar }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [respuestas, setRespuestas] = useState<Map<number, Respuesta>>(new Map());
  const { mutateAsync: enviarRespuestas, isPending } = useEnviarRespuestasEncuesta();

  const handleRatingChange = (preguntaId: number, valor: number) => {
    setRespuestas((prev) => {
      const newMap = new Map(prev);
      newMap.set(preguntaId, {
        pregunta_id: preguntaId,
        valor_rating: valor,
      });
      return newMap;
    });
  };

  const handleTextoChange = (preguntaId: number, texto: string) => {
    setRespuestas((prev) => {
      const newMap = new Map(prev);
      newMap.set(preguntaId, {
        pregunta_id: preguntaId,
        respuesta_texto: texto,
      });
      return newMap;
    });
  };

  const handleMultipleChoiceChange = (preguntaId: number, opcionId: number) => {
    setRespuestas((prev) => {
      const newMap = new Map(prev);
      newMap.set(preguntaId, {
        pregunta_id: preguntaId,
        opcion_id: opcionId,
      });
      return newMap;
    });
  };

  const handleSiNoChange = (preguntaId: number, respuesta: string) => {
    setRespuestas((prev) => {
      const newMap = new Map(prev);
      newMap.set(preguntaId, {
        pregunta_id: preguntaId,
        respuesta_texto: respuesta,
      });
      return newMap;
    });
  };

  const validarRespuestas = (): boolean => {
    if (!encuesta.preguntas) return false;

    for (const pregunta of encuesta.preguntas) {
      if (pregunta.es_obligatoria && pregunta.id) {
        const respuesta = respuestas.get(pregunta.id);
        if (!respuesta) {
          Alert.alert('Campo obligatorio', `La pregunta "${pregunta.titulo}" es obligatoria`);
          return false;
        }

        if (pregunta.tipo_pregunta === 'texto' && !respuesta.respuesta_texto?.trim()) {
          Alert.alert('Campo obligatorio', `Debes responder la pregunta "${pregunta.titulo}"`);
          return false;
        }

        if (pregunta.tipo_pregunta === 'rating' && !respuesta.valor_rating) {
          Alert.alert('Campo obligatorio', `Debes calificar la pregunta "${pregunta.titulo}"`);
          return false;
        }

        if (pregunta.tipo_pregunta === 'multiple_choice' && !respuesta.opcion_id) {
          Alert.alert('Campo obligatorio', `Debes seleccionar una opción en "${pregunta.titulo}"`);
          return false;
        }
      }
    }

    return true;
  };

  const handleEnviar = async () => {
    if (isPending) return;
    if (!validarRespuestas()) return;

    try {
      const result = await enviarRespuestas({ respuestas: Array.from(respuestas.values()) });
      Alert.alert('¡Éxito!', result?.message || 'Tu respuesta ha sido enviada correctamente', [
        {
          text: 'OK',
          onPress: () => router.replace({ pathname: '/' }),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
      console.error(error);
    }
  };

  const renderPregunta = (pregunta: Pregunta) => {
    if (!pregunta.id) return null;
    const preguntaId = pregunta.id;

    return (
      <View key={pregunta.id} style={styles.preguntaCard}>
        <View style={styles.preguntaHeader}>
          <Text style={styles.preguntaTitulo}>
            {pregunta.titulo}
            {pregunta.es_obligatoria && <Text style={styles.obligatorio}> *</Text>}
          </Text>
          <Text style={styles.tipoPregunta}>
            {pregunta.tipo_pregunta === 'rating'
              ? 'Calificacion'
              : pregunta.tipo_pregunta === 'texto'
              ? 'Texto'
              : pregunta.tipo_pregunta === 'multiple_choice'
              ? 'Opcion multiple'
              : 'Si/No'}
          </Text>
        </View>

        {pregunta.tipo_pregunta === 'rating' && (
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((valor) => (
              <TouchableOpacity
                key={valor}
                style={[
                  styles.ratingButton,
                  respuestas.get(preguntaId)?.valor_rating === valor && styles.ratingButtonSelected,
                ]}
                onPress={() => handleRatingChange(preguntaId, valor)}
                disabled={isPending}
              >
                <Text
                  style={[
                    styles.ratingText,
                    respuestas.get(preguntaId)?.valor_rating === valor && styles.ratingTextSelected,
                  ]}
                >
                  {valor}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {pregunta.tipo_pregunta === 'texto' && (
          <TextInput
            style={styles.textInput}
            placeholder="Escribe tu respuesta aqui..."
            multiline
            numberOfLines={4}
            value={respuestas.get(preguntaId)?.respuesta_texto || ''}
            onChangeText={(texto) => handleTextoChange(preguntaId, texto)}
            editable={!isPending}
          />
        )}

        {pregunta.tipo_pregunta === 'multiple_choice' && pregunta.opcionesCompletas && (
          <View style={styles.opcionesContainer}>
            {pregunta.opcionesCompletas.map((opcion) => (
              <TouchableOpacity
                key={opcion.id}
                style={[
                  styles.opcionButton,
                  respuestas.get(preguntaId)?.opcion_id === opcion.id && styles.opcionButtonSelected,
                ]}
                onPress={() => handleMultipleChoiceChange(preguntaId, opcion.id)}
                disabled={isPending}
              >
                <View
                  style={[
                    styles.radioCircle,
                    respuestas.get(preguntaId)?.opcion_id === opcion.id && styles.radioCircleSelected,
                  ]}
                >
                  {respuestas.get(preguntaId)?.opcion_id === opcion.id && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.opcionText}>{opcion.texto_opcion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {pregunta.tipo_pregunta === 'si_no' && (
          <View style={styles.siNoContainer}>
            <TouchableOpacity
              style={[
                styles.siNoButton,
                respuestas.get(preguntaId)?.respuesta_texto === 'Si' && styles.siNoButtonSelected,
              ]}
              onPress={() => handleSiNoChange(preguntaId, 'Si')}
              disabled={isPending}
            >
              <Text
                style={[
                  styles.siNoText,
                  respuestas.get(preguntaId)?.respuesta_texto === 'Si' && styles.siNoTextSelected,
                ]}
              >
                Si
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.siNoButton,
                respuestas.get(preguntaId)?.respuesta_texto === 'No' && styles.siNoButtonSelected,
              ]}
              onPress={() => handleSiNoChange(preguntaId, 'No')}
              disabled={isPending}
            >
              <Text
                style={[
                  styles.siNoText,
                  respuestas.get(preguntaId)?.respuesta_texto === 'No' && styles.siNoTextSelected,
                ]}
              >
                No
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper} pointerEvents={isPending ? 'none' : 'auto'}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{encuesta.titulo}</Text>
          {encuesta.descripcion && <Text style={styles.headerDescripcion}>{encuesta.descripcion}</Text>}
          {encuesta.es_anonima && (
            <View style={styles.anonimaBadge}>
              <Text style={styles.anonimaText}>Esta encuesta es anonima</Text>
            </View>
          )}
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {encuesta.preguntas && encuesta.preguntas.length > 0 ? (
            encuesta.preguntas.map((pregunta) => renderPregunta(pregunta))
          ) : (
            <Text style={styles.emptyText}>No hay preguntas en esta encuesta</Text>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.cancelarButton} onPress={onCancelar} disabled={isPending}>
            <Text style={styles.cancelarButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.enviarButton, isPending && styles.enviarButtonDisabled]}
            onPress={handleEnviar}
            disabled={isPending}
          >
            {isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.enviarButtonText}>Enviar Respuestas</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <OperacionPendienteModal visible={isPending} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  contentWrapper: {
    flex: 1,
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
    marginBottom: 8,
  },
  headerDescripcion: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 20,
    marginBottom: 10,
  },
  anonimaBadge: {
    backgroundColor: colors.componentBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  anonimaText: {
    fontSize: 12,
    color: colors.lightTint,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  preguntaCard: {
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
  preguntaHeader: {
    marginBottom: 15,
  },
  preguntaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 5,
  },
  obligatorio: {
    color: colors.error,
  },
  tipoPregunta: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingButtonSelected: {
    borderColor: colors.lightTint,
    backgroundColor: colors.componentBackground,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.secondaryText,
  },
  ratingTextSelected: {
    color: colors.lightTint,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  opcionesContainer: {
    gap: 10,
  },
  opcionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.background,
  },
  opcionButtonSelected: {
    borderColor: colors.lightTint,
    backgroundColor: colors.componentBackground,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.secondaryText,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: colors.lightTint,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.lightTint,
  },
  opcionText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  siNoContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  siNoButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.background,
    alignItems: 'center',
  },
  siNoButtonSelected: {
    borderColor: colors.lightTint,
    backgroundColor: colors.componentBackground,
  },
  siNoText: {
    fontSize: 14,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  siNoTextSelected: {
    color: colors.lightTint,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.secondaryText,
    marginTop: 50,
  },
  footer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: colors.background,
    backgroundColor: colors.componentBackground,
    gap: 10,
  },
  cancelarButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.secondaryText,
    alignItems: 'center',
  },
  cancelarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  enviarButton: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 8,
    backgroundColor: colors.lightTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enviarButtonDisabled: {
    opacity: 0.7,
  },
  enviarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ResponderEncuesta;
