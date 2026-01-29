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
import { Encuesta, Pregunta, Respuesta } from '../models/Encuesta';
import { useEnviarRespuestasEncuesta } from '../viewmodels/useEncuestas';

interface ResponderEncuestaProps {
  encuesta: Encuesta;
  onCancelar: () => void;
}

export const ResponderEncuesta: React.FC<ResponderEncuestaProps> = ({
  encuesta,
  onCancelar,
}) => {
  const router = useRouter();
  const [respuestas, setRespuestas] = useState<Map<number, Respuesta>>(new Map());
  const { mutate: enviarRespuestas, isPending } = useEnviarRespuestasEncuesta();

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
          Alert.alert(
            'Campo obligatorio',
            `La pregunta "${pregunta.titulo}" es obligatoria`
          );
          return false;
        }

        // Validar según el tipo de pregunta
        if (pregunta.tipo_pregunta === 'texto' && !respuesta.respuesta_texto?.trim()) {
          Alert.alert(
            'Campo obligatorio',
            `Debes responder la pregunta "${pregunta.titulo}"`
          );
          return false;
        }

        if (pregunta.tipo_pregunta === 'rating' && !respuesta.valor_rating) {
          Alert.alert(
            'Campo obligatorio',
            `Debes calificar la pregunta "${pregunta.titulo}"`
          );
          return false;
        }

        if (pregunta.tipo_pregunta === 'multiple_choice' && !respuesta.opcion_id) {
          Alert.alert(
            'Campo obligatorio',
            `Debes seleccionar una opción en "${pregunta.titulo}"`
          );
          return false;
        }
      }
    }

    return true;
  };

  const handleEnviar = () => {
    if (!validarRespuestas()) return;

    const respuestasArray = Array.from(respuestas.values());

    enviarRespuestas(
      { respuesta: respuestasArray },
      {
        onSuccess: () => {
          Alert.alert(
            '¡Éxito!',
            'Tu respuesta ha sido enviada correctamente',
            [
              { 
                text: 'OK', 
                onPress: () => {
                  // Redirigir a la pantalla principal
                  router.push({ pathname: '/' });
                }
              }
            ]
          );
        },
        onError: (error) => {
          Alert.alert('Error', 'No se pudo enviar la encuesta. Intenta nuevamente.');
          console.error(error);
        },
      }
    );
  };

  const renderPregunta = (pregunta: Pregunta) => {
    if (!pregunta.id) return null;

    return (
      <View key={pregunta.id} style={styles.preguntaCard}>
        <View style={styles.preguntaHeader}>
          <Text style={styles.preguntaTitulo}>
            {pregunta.titulo}
            {pregunta.es_obligatoria && <Text style={styles.obligatorio}> *</Text>}
          </Text>
          <Text style={styles.tipoPregunta}>
            {pregunta.tipo_pregunta === 'rating'
              ? '⭐ Calificación'
              : pregunta.tipo_pregunta === 'texto'
              ? '📝 Texto'
              : pregunta.tipo_pregunta === 'multiple_choice'
              ? '☑️ Opción múltiple'
              : '✓/✗ Sí/No'}
          </Text>
        </View>

        {pregunta.tipo_pregunta === 'rating' && (
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((valor) => (
              <TouchableOpacity
                key={valor}
                style={[
                  styles.ratingButton,
                  respuestas.get(pregunta.id!)?.valor_rating === valor &&
                    styles.ratingButtonSelected,
                ]}
                onPress={() => handleRatingChange(pregunta.id!, valor)}
              >
                <Text
                  style={[
                    styles.ratingText,
                    respuestas.get(pregunta.id!)?.valor_rating === valor &&
                      styles.ratingTextSelected,
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
            placeholder="Escribe tu respuesta aquí..."
            multiline
            numberOfLines={4}
            value={respuestas.get(pregunta.id!)?.respuesta_texto || ''}
            onChangeText={(texto) => handleTextoChange(pregunta.id!, texto)}
          />
        )}

        {pregunta.tipo_pregunta === 'multiple_choice' &&
          pregunta.opcionesCompletas && (
            <View style={styles.opcionesContainer}>
              {pregunta.opcionesCompletas.map((opcion) => (
                <TouchableOpacity
                  key={opcion.id}
                  style={[
                    styles.opcionButton,
                    respuestas.get(pregunta.id!)?.opcion_id === opcion.id &&
                      styles.opcionButtonSelected,
                  ]}
                  onPress={() => handleMultipleChoiceChange(pregunta.id!, opcion.id)}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      respuestas.get(pregunta.id!)?.opcion_id === opcion.id &&
                        styles.radioCircleSelected,
                    ]}
                  >
                    {respuestas.get(pregunta.id!)?.opcion_id === opcion.id && (
                      <View style={styles.radioInner} />
                    )}
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
                respuestas.get(pregunta.id!)?.respuesta_texto === 'Sí' &&
                  styles.siNoButtonSelected,
              ]}
              onPress={() => handleSiNoChange(pregunta.id!, 'Sí')}
            >
              <Text
                style={[
                  styles.siNoText,
                  respuestas.get(pregunta.id!)?.respuesta_texto === 'Sí' &&
                    styles.siNoTextSelected,
                ]}
              >
                ✓ Sí
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.siNoButton,
                respuestas.get(pregunta.id!)?.respuesta_texto === 'No' &&
                  styles.siNoButtonSelected,
              ]}
              onPress={() => handleSiNoChange(pregunta.id!, 'No')}
            >
              <Text
                style={[
                  styles.siNoText,
                  respuestas.get(pregunta.id!)?.respuesta_texto === 'No' &&
                    styles.siNoTextSelected,
                ]}
              >
                ✗ No
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{encuesta.titulo}</Text>
        {encuesta.descripcion && (
          <Text style={styles.headerDescripcion}>{encuesta.descripcion}</Text>
        )}
        {encuesta.es_anonima && (
          <View style={styles.anonimaBadge}>
            <Text style={styles.anonimaText}>🔒 Esta encuesta es anónima</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {encuesta.preguntas && encuesta.preguntas.length > 0 ? (
          encuesta.preguntas.map((pregunta) => renderPregunta(pregunta))
        ) : (
          <Text style={styles.emptyText}>No hay preguntas en esta encuesta</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelarButton}
          onPress={onCancelar}
          disabled={isPending}
        >
          <Text style={styles.cancelarButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.enviarButton, isPending && styles.enviarButtonDisabled]}
          onPress={handleEnviar}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.enviarButtonText}>Enviar Respuestas</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerDescripcion: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  anonimaBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  anonimaText: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  preguntaCard: {
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
  preguntaHeader: {
    marginBottom: 15,
  },
  preguntaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  obligatorio: {
    color: '#D32F2F',
  },
  tipoPregunta: {
    fontSize: 12,
    color: '#999',
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
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  ratingTextSelected: {
    color: '#FFFFFF',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#333',
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
    borderColor: '#E0E0E0',
  },
  opcionButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#007AFF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  opcionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  siNoContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  siNoButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  siNoButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  siNoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  siNoTextSelected: {
    color: '#007AFF',
  },
  footer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 10,
  },
  cancelarButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
  },
  cancelarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  enviarButton: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  enviarButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  enviarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
});