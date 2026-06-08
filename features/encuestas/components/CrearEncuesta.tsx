import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { Colors } from '@/constants/theme';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KEYBOARD_BEHAVIOR } from '@/shared/ui/keyboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Encuesta, Pregunta } from '../models/Encuesta';
import { useCreateEncuestaCompleta } from '../viewmodels/useEncuestas';
import { styles } from './crearEncuestaStyles';
import { EncuestasScreenHeader } from './EncuestasScreenHeader';
import { FormularioPregunta } from './FormularioPregunta';

interface CrearEncuestaProps {
  onEncuestaCreada: () => void;
  onVolver: () => void;
}

const colors = Colors['light'];

export const CrearEncuesta: React.FC<CrearEncuestaProps> = ({ onEncuestaCreada, onVolver }) => {
  const insets = useSafeAreaInsets();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [esAnonima, setEsAnonima] = useState(false);
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [mostrandoFormularioPregunta, setMostrandoFormularioPregunta] = useState(false);

  const { mutate: crearEncuesta, isPending } = useCreateEncuestaCompleta();

  const onDateCancel = () => setShowDatePicker(false);
  const onDateConfirm = (selectedDate: Date) => {
    setFechaFin(selectedDate);
    setShowDatePicker(false);
  };

  const agregarPregunta = (pregunta: Pregunta) => {
    setPreguntas([...preguntas, { ...pregunta, orden: preguntas.length + 1 }]);
    setMostrandoFormularioPregunta(false);
  };

  const eliminarPregunta = (index: number) => {
    Alert.alert('Confirmar', '¿Deseas eliminar esta pregunta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          const nuevasPreguntas = preguntas.filter((_, i) => i !== index);
          // Reordenar las preguntas
          setPreguntas(
            nuevasPreguntas.map((p, i) => ({ ...p, orden: i + 1 }))
          );
        },
      },
    ]);
  };

  const validarFormulario = (): boolean => {
    if (!titulo.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return false;
    }

    if (preguntas.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos una pregunta');
      return false;
    }

    return true;
  };

  const handleCrearEncuesta = () => {
    if (!validarFormulario()) return;

    const encuestaData: Partial<Encuesta> = {
      titulo,
      descripcion: descripcion || undefined,
      categoria: 'interna',
      es_anonima: esAnonima,
      fecha_fin: fechaFin ? fechaFin.toISOString() : undefined,
    };

    crearEncuesta(
      { encuesta: encuestaData as Encuesta, preguntas: preguntas as any },
      {
        onSuccess: () => {
          Alert.alert(
            '¡Éxito!',
            'La encuesta ha sido creada correctamente',
            [{ text: 'OK', onPress: onEncuestaCreada }]
          );
        },
        onError: (error) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Intenta nuevamente');
          console.error(error);
        },
      }
    );
  };

  if (mostrandoFormularioPregunta) {
    return (
      <FormularioPregunta
        onAgregarPregunta={agregarPregunta}
        onCancelar={() => setMostrandoFormularioPregunta(false)}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={KEYBOARD_BEHAVIOR}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <EncuestasScreenHeader title="Crear Encuesta" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Información básica */}
        <View style={styles.section}>
          <TextInput
            style={styles.input}
            placeholder="Título de la encuesta *"
            placeholderTextColor={colors.secondaryText}
            value={titulo}
            onChangeText={setTitulo}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descripción (opcional)"
            placeholderTextColor={colors.secondaryText}
            multiline
            numberOfLines={3}
            value={descripcion}
            onChangeText={setDescripcion}
          />

          <ThemedText style={styles.subLabel}>Fecha de finalización (opcional)</ThemedText>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dateButtonText, !fechaFin && { color: colors.secondaryText }]}>
              {fechaFin ? fechaFin.toLocaleDateString('es-ES') : 'Seleccionar fecha'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              visible={showDatePicker}
              value={fechaFin || new Date()}
              mode="date"
              onConfirm={onDateConfirm}
              onCancel={onDateCancel}
            />
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Encuesta anónima</Text>
            <Switch
              value={esAnonima}
              onValueChange={setEsAnonima}
              trackColor={{ false: colors.icon, true: colors.success }}
              thumbColor={esAnonima ? colors.icon : colors.icon}
            />
          </View>
        </View>

        {/* Preguntas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Preguntas ({preguntas.length})
            </ThemedText>
            <TouchableOpacity
              style={styles.agregarPreguntaButton}
              onPress={() => setMostrandoFormularioPregunta(true)}
            >
              <Text style={styles.agregarPreguntaText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>

          {preguntas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay preguntas agregadas</Text>
              <Text style={styles.emptySubtext}>
                Presiona &quot;+ Agregar&quot; para crear una pregunta
              </Text>
            </View>
          ) : (
            preguntas.map((pregunta, index) => (
              <View key={index} style={styles.preguntaCard}>
                <View style={styles.preguntaCardHeader}>
                  <Text style={styles.preguntaNumero}>Pregunta {index + 1}</Text>
                  <TouchableOpacity onPress={() => eliminarPregunta(index)}>
                    <Text style={styles.eliminarButton}>🗑️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.preguntaTitulo}>{pregunta.titulo}</Text>
                <View style={styles.preguntaInfo}>
                  <Text style={styles.preguntaTipo}>
                    Tipo: {pregunta.tipo_pregunta}
                  </Text>
                  {pregunta.es_obligatoria && (
                    <Text style={styles.obligatoriaTag}>Obligatoria</Text>
                  )}
                </View>
                {pregunta.opciones && pregunta.opciones.length > 0 && (
                  <View style={styles.opcionesPreview}>
                    <Text style={styles.opcionesLabel}>Opciones:</Text>
                    {pregunta.opciones.map((opcion, i) => (
                      <Text key={i} style={styles.opcionItem}>
                        • {opcion}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.footerDos, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.cancelarButton} onPress={onVolver}>
          <Text style={styles.cancelarButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.guardarButton, isPending && styles.crearButtonDisabled]}
          onPress={handleCrearEncuesta}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={colors.componentBackground} />
          ) : (
            <Text style={styles.guardarButtonText}>Crear Encuesta</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
