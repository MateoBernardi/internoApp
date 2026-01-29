import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Encuesta, Pregunta, TipoPregunta } from '../models/Encuesta';
import { useCreateEncuestaCompleta } from '../viewmodels/useEncuestas';

interface CrearEncuestaProps {
  onEncuestaCreada: () => void;
}

export const CrearEncuesta: React.FC<CrearEncuestaProps> = ({ onEncuestaCreada }) => {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<'interna' | 'externa' | 'feedback_empleado'>(
    'interna'
  );
  const [esAnonima, setEsAnonima] = useState(false);
  const [fechaFin, setFechaFin] = useState('');
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [mostrandoFormularioPregunta, setMostrandoFormularioPregunta] = useState(false);

  const { mutate: crearEncuesta, isPending } = useCreateEncuestaCompleta();

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
      categoria,
      es_anonima: esAnonima,
      fecha_fin: fechaFin || undefined,
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crear Nueva Encuesta</Text>
        <Text style={styles.headerSubtitle}>
          Completa los datos y agrega preguntas
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Información básica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Básica</Text>

          <Text style={styles.label}>
            Título <Text style={styles.obligatorio}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Encuesta de satisfacción 2024"
            value={titulo}
            onChangeText={setTitulo}
          />

          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe brevemente el propósito de la encuesta..."
            multiline
            numberOfLines={3}
            value={descripcion}
            onChangeText={setDescripcion}
          />

          <Text style={styles.label}>
            Categoría <Text style={styles.obligatorio}>*</Text>
          </Text>
          <View style={styles.categoriasContainer}>
            {[
              { value: 'interna', label: 'Interna' },
              { value: 'externa', label: 'Externa' },
              { value: 'feedback_empleado', label: 'Feedback Empleado' },
            ].map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoriaButton,
                  categoria === cat.value && styles.categoriaButtonSelected,
                ]}
                onPress={() => setCategoria(cat.value as any)}
              >
                <Text
                  style={[
                    styles.categoriaText,
                    categoria === cat.value && styles.categoriaTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Fecha de finalización (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            value={fechaFin}
            onChangeText={setFechaFin}
          />

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Encuesta anónima</Text>
            <Switch
              value={esAnonima}
              onValueChange={setEsAnonima}
              trackColor={{ false: '#D0D0D0', true: '#4CAF50' }}
              thumbColor={esAnonima ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>

        {/* Preguntas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Preguntas ({preguntas.length})
            </Text>
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

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.crearButton, isPending && styles.crearButtonDisabled]}
          onPress={handleCrearEncuesta}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.crearButtonText}>Crear Encuesta</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nueva Pregunta</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.label}>
            Título de la pregunta <Text style={styles.obligatorio}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Escribe la pregunta..."
            multiline
            numberOfLines={2}
            value={titulo}
            onChangeText={setTitulo}
          />

          <Text style={styles.label}>Tipo de pregunta</Text>
          <View style={styles.tiposContainer}>
            {[
              { value: 'texto', label: '📝 Texto', icon: '📝' },
              { value: 'rating', label: '⭐ Calificación', icon: '⭐' },
              { value: 'multiple_choice', label: '☑️ Opción múltiple', icon: '☑️' },
              { value: 'si_no', label: '✓/✗ Sí/No', icon: '✓/✗' },
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
              <Text style={styles.label}>Opciones</Text>
              <View style={styles.agregarOpcionContainer}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Escribe una opción..."
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
              trackColor={{ false: '#D0D0D0', true: '#4CAF50' }}
              thumbColor={esObligatoria ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelarButton} onPress={onCancelar}>
          <Text style={styles.cancelarButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.guardarButton} onPress={handleGuardar}>
          <Text style={styles.guardarButtonText}>Guardar Pregunta</Text>
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
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  obligatorio: {
    color: '#D32F2F',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoriasContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  categoriaButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  categoriaButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  categoriaText: {
    fontSize: 14,
    color: '#666',
  },
  categoriaTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  agregarPreguntaButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  agregarPreguntaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#BBB',
  },
  preguntaCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
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
    color: '#007AFF',
  },
  eliminarButton: {
    fontSize: 18,
  },
  preguntaTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  preguntaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  preguntaTipo: {
    fontSize: 12,
    color: '#666',
  },
  obligatoriaTag: {
    fontSize: 10,
    color: '#D32F2F',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  opcionesPreview: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  opcionesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  opcionItem: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  tiposContainer: {
    gap: 10,
  },
  tipoButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  tipoButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  tipoText: {
    fontSize: 14,
    color: '#666',
  },
  tipoTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  opcionesSection: {
    marginTop: 15,
  },
  agregarOpcionContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  opcionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  eliminarOpcion: {
    fontSize: 18,
    color: '#D32F2F',
    paddingHorizontal: 10,
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
  guardarButton: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  guardarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  crearButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  crearButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  crearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});