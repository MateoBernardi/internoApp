import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Encuesta, Pregunta, TipoPregunta } from '../models/Encuesta';
import { useCreateEncuestaCompleta } from '../viewmodels/useEncuestas';

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

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) setFechaFin(selectedDate);
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
          Alert.alert('Error', 'No se pudo crear la encuesta. Intenta nuevamente.');
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      {/* Header con botón de volver */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={onVolver} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>Crear Encuesta</ThemedText>
        <View style={{ width: 40 }} />
      </View>

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
              value={fechaFin || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
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
                Presiona "+ Agregar" para crear una pregunta
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

// Componente auxiliar para crear preguntas
interface FormularioPreguntaProps {
  onAgregarPregunta: (pregunta: Pregunta) => void;
  onCancelar: () => void;
}

const FormularioPregunta: React.FC<FormularioPreguntaProps> = ({
  onAgregarPregunta,
  onCancelar,
}) => {
  const insets = useSafeAreaInsets();
  const [titulo, setTitulo] = useState('');
  const [tipoPregunta, setTipoPregunta] = useState<TipoPregunta>('texto');
  const [esObligatoria, setEsObligatoria] = useState(true);
  const [opciones, setOpciones] = useState<string[]>([]);
  const [nuevaOpcion, setNuevaOpcion] = useState('');

  const agregarOpcion = () => {
    if (nuevaOpcion.trim()) {
      setOpciones([...opciones, nuevaOpcion.trim()]);
      setNuevaOpcion('');
    }
  };

  const eliminarOpcion = (index: number) => {
    setOpciones(opciones.filter((_, i) => i !== index));
  };

  const handleGuardar = () => {
    if (!titulo.trim()) {
      Alert.alert('Error', 'El título de la pregunta es obligatorio');
      return;
    }

    if (tipoPregunta === 'multiple_choice' && opciones.length < 2) {
      Alert.alert(
        'Error',
        'Debes agregar al menos 2 opciones para preguntas de opción múltiple'
      );
      return;
    }

    const pregunta: Pregunta = {
      titulo: titulo.trim(),
      tipo_pregunta: tipoPregunta,
      orden: 0, // Se asignará al agregar
      es_obligatoria: esObligatoria,
      opciones: tipoPregunta === 'multiple_choice' ? opciones : undefined,
    };

    onAgregarPregunta(pregunta);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ThemedText type="title" style={styles.pageTitle}>Nueva Pregunta</ThemedText>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.section}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Escribe la pregunta *"
            placeholderTextColor={colors.secondaryText}
            multiline
            numberOfLines={2}
            value={titulo}
            onChangeText={setTitulo}
          />

          <ThemedText style={styles.subLabel}>Tipo de pregunta</ThemedText>
          <View style={styles.tiposContainer}>
            {[
              { value: 'texto', label: '📝 Texto' },
              { value: 'rating', label: '⭐ Calificación' },
              { value: 'multiple_choice', label: '☑️ Opción múltiple' },
              { value: 'si_no', label: '✓/✗ Sí/No' },
            ].map((tipo) => (
              <TouchableOpacity
                key={tipo.value}
                style={[
                  styles.tipoButton,
                  tipoPregunta === tipo.value && styles.tipoButtonSelected,
                ]}
                onPress={() => setTipoPregunta(tipo.value as TipoPregunta)}
              >
                <Text
                  style={[
                    styles.tipoText,
                    tipoPregunta === tipo.value && styles.tipoTextSelected,
                  ]}
                >
                  {tipo.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tipoPregunta === 'multiple_choice' && (
            <View style={styles.opcionesSection}>
              <ThemedText style={styles.subLabel}>Opciones</ThemedText>
              <View style={styles.agregarOpcionContainer}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Escribe una opción..."
                  placeholderTextColor={colors.secondaryText}
                  value={nuevaOpcion}
                  onChangeText={setNuevaOpcion}
                  onSubmitEditing={agregarOpcion}
                />
                <TouchableOpacity style={styles.addButton} onPress={agregarOpcion}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              {opciones.map((opcion, index) => (
                <View key={index} style={styles.opcionItem}>
                  <Text style={styles.opcionText}>• {opcion}</Text>
                  <TouchableOpacity onPress={() => eliminarOpcion(index)}>
                    <Text style={styles.eliminarOpcion}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Pregunta obligatoria</Text>
            <Switch
              value={esObligatoria}
              onValueChange={setEsObligatoria}
              trackColor={{ false: colors.icon, true: colors.success }}
              thumbColor={esObligatoria ? colors.icon : colors.icon}
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footerDos, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.cancelarButton} onPress={onCancelar}>
          <Text style={styles.cancelarButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.guardarButton} onPress={handleGuardar}>
          <Text style={styles.guardarButtonText}>Guardar Pregunta</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.componentBackground,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: colors.componentBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.componentBackground,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.background,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 15,
  },
  obligatorio: {
    color: colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.componentBackground,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: colors.background,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.componentBackground,
    marginTop: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  categoriasContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  categoriaButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.background,
    alignItems: 'center',
  },
  categoriaButtonSelected: {
    borderColor: colors.lightTint,
    backgroundColor: colors.lightTint + '12',
  },
  categoriaText: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  categoriaTextSelected: {
    color: colors.lightTint,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  agregarPreguntaButton: {
    backgroundColor: colors.lightTint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  agregarPreguntaText: {
    color: colors.componentBackground,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondaryText,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  preguntaCard: {
    backgroundColor: colors.componentBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.background,
  },
  preguntaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  preguntaNumero: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.lightTint,
  },
  eliminarButton: {
    fontSize: 18,
  },
  preguntaTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  preguntaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  preguntaTipo: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  obligatoriaTag: {
    fontSize: 10,
    color: colors.error,
    backgroundColor: colors.error + '12',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  opcionesPreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  opcionesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
    marginBottom: 4,
  },
  opcionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  opcionText: {
    fontSize: 12,
    color: colors.secondaryText,
    flex: 1,
  },
  tiposContainer: {
    gap: 8,
  },
  tipoButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.background,
    alignItems: 'center',
  },
  tipoButtonSelected: {
    borderColor: colors.lightTint,
    backgroundColor: colors.lightTint + '12',
  },
  tipoText: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  tipoTextSelected: {
    color: colors.lightTint,
    fontWeight: '600',
  },
  opcionesSection: {
    marginTop: 12,
  },
  agregarOpcionContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: colors.lightTint,
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.componentBackground,
    fontSize: 20,
    fontWeight: 'bold',
  },
  eliminarOpcion: {
    fontSize: 16,
    color: colors.error,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.componentBackground,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  footerDos: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.componentBackground,
    borderTopWidth: 1,
    borderTopColor: colors.background,
    gap: 12,
  },
  cancelarButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.secondaryText,
    alignItems: 'center',
  },
  cancelarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  guardarButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.lightTint,
    alignItems: 'center',
  },
  guardarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.componentBackground,
  },
  crearButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.success,
    alignItems: 'center',
  },
  crearButtonDisabled: {
    backgroundColor: colors.secondaryText,
  },
  crearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.componentBackground,
  },
});