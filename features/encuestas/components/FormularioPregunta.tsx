import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import React, { useState } from 'react';
import {
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pregunta, TipoPregunta } from '../models/Encuesta';
import { styles } from './crearEncuestaStyles';

const colors = Colors['light'];

interface FormularioPreguntaProps {
  onAgregarPregunta: (pregunta: Pregunta) => void;
  onCancelar: () => void;
}

/** Formulario para crear una pregunta de encuesta (tipo, opciones, obligatoria). */
export const FormularioPregunta: React.FC<FormularioPreguntaProps> = ({
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
