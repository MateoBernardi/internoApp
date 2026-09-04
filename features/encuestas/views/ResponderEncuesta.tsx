import { OperacionPendienteModal } from '@/components/ui/OperacionPendienteModal';
import { Colors } from '@/constants/theme';
import { GlassButton } from '@/shared/ui/GlassButton';
import { glassColors, glassStyles } from '@/shared/ui/glass';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useIdempotencyKey } from '@/shared/useIdempotencyKey';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatHorarioSlot } from '../resultados/utils';
import { Encuesta, Pregunta, Respuesta, TIPO_PREGUNTA_META } from '../models/Encuesta';
import { useEnviarRespuestasEncuesta } from '../viewmodels/useEncuestas';

interface ResponderEncuestaProps {
  encuesta: Encuesta;
  onCancelar: () => void;
}

const colors = Colors['light'];

export const ResponderEncuesta: React.FC<ResponderEncuestaProps> = ({ encuesta, onCancelar }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const esHorario = encuesta.preguntas?.some((p) => p.tipo_pregunta === 'horario') ?? false;
  const [respuestas, setRespuestas] = useState<Map<number, Respuesta>>(new Map());
  const [focusedPreguntaId, setFocusedPreguntaId] = useState<number | null>(null);
  const { idempotencyKey } = useIdempotencyKey();
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

        if (pregunta.tipo_pregunta === 'horario' && !respuesta.opcion_id) {
          Alert.alert('Campo obligatorio', `Debes seleccionar un horario en "${pregunta.titulo}"`);
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
      const result = await enviarRespuestas({ respuestas: Array.from(respuestas.values()), idempotencyKey });
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
            {TIPO_PREGUNTA_META[pregunta.tipo_pregunta].label}
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
            style={[
              styles.textInput,
              styles.inputNoOutline,
              focusedPreguntaId === preguntaId && styles.inputFocused,
            ]}
            placeholder="Escribe tu respuesta aqui..."
            placeholderTextColor={glassColors.placeholder}
            multiline
            numberOfLines={4}
            value={respuestas.get(preguntaId)?.respuesta_texto || ''}
            onChangeText={(texto) => handleTextoChange(preguntaId, texto)}
            editable={!isPending}
            onFocus={() => setFocusedPreguntaId(preguntaId)}
            onBlur={() => setFocusedPreguntaId(null)}
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

        {pregunta.tipo_pregunta === 'horario' && pregunta.opcionesCompletas && (
          <View style={styles.opcionesContainer}>
            {pregunta.opcionesCompletas.map((opcion) => {
              const isOcupado = (opcion.respuestas_count ?? 0) > 0;
              const isSelected = respuestas.get(preguntaId)?.opcion_id === opcion.id;
              return (
                <TouchableOpacity
                  key={opcion.id}
                  style={[
                    styles.opcionButton,
                    isSelected && styles.opcionButtonSelected,
                    isOcupado && styles.opcionButtonDisabled,
                  ]}
                  onPress={() => !isOcupado && handleMultipleChoiceChange(preguntaId, opcion.id)}
                  disabled={isPending || isOcupado}
                  activeOpacity={isOcupado ? 1 : 0.7}
                >
                  <View style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleSelected,
                    isOcupado && { borderColor: colors.secondaryText + '50' },
                  ]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={isOcupado ? colors.secondaryText + '50' : colors.lightTint}
                    style={{ marginRight: 6 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.opcionText,
                      isOcupado && { color: colors.secondaryText + '80' },
                    ]}>
                      {formatHorarioSlot(opcion.texto_opcion)}
                    </Text>
                    {isOcupado && (
                      <Text style={styles.noDisponibleText}>No disponible</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
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
      <View style={[styles.contentWrapper, { pointerEvents: isPending ? 'none' : 'auto' }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{esHorario ? 'Turnero disponible' : encuesta.titulo}</Text>
          {encuesta.descripcion && <Text style={styles.headerDescripcion}>{encuesta.descripcion}</Text>}
          {esHorario && (
            <View style={styles.opcionalBadge}>
              <Text style={styles.opcionalText}>Votar tu turno es opcional</Text>
            </View>
          )}
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
          <GlassButton
            label="Cancelar"
            onPress={onCancelar}
            disabled={isPending}
            variant="secondary"
            style={styles.cancelarButton}
          />

          <GlassButton
            label="Enviar Respuestas"
            onPress={handleEnviar}
            disabled={isPending}
            loading={isPending}
            style={styles.enviarButton}
          />
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
    backgroundColor: 'rgba(26,115,232,0.08)',
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
  opcionalBadge: {
    backgroundColor: 'rgba(17,24,28,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  opcionalText: {
    fontSize: 12,
    color: colors.secondaryText,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  preguntaCard: {
    ...glassStyles.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
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
    backgroundColor: 'rgba(26,115,232,0.08)',
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
    ...glassStyles.fieldGlass,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: glassColors.link,
  },
  inputNoOutline: {
    outlineStyle: 'none',
    outlineWidth: 0,
  } as any,
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
    backgroundColor: 'rgba(26,115,232,0.08)',
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
  opcionButtonDisabled: {
    borderColor: colors.background,
    backgroundColor: colors.background + '60',
  },
  noDisponibleText: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2,
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
    backgroundColor: 'rgba(26,115,232,0.08)',
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
  },
  enviarButton: {
    flex: 2,
  },
});

export default ResponderEncuesta;
