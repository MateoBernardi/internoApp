import { ThemedText } from '@/components/themed-text';
import DateTimePicker from '@/components/ui/CrossPlatformDateTimePicker';
import { Colors } from '@/constants/theme';
import { KEYBOARD_BEHAVIOR } from '@/shared/ui/keyboard';
import { Ionicons } from '@expo/vector-icons';
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
import { formatHorarioSlot } from '../resultados/utils';
import { Pregunta, TipoPregunta } from '../models/Encuesta';
import { styles } from './crearEncuestaStyles';

const colors = Colors['light'];

interface FormularioPreguntaProps {
  onAgregarPregunta: (pregunta: Pregunta) => void;
  onCancelar: () => void;
  preguntaInicial?: Pregunta;
}

type PickerStep = null | 'date' | 'time';

/** Formulario para crear/editar una pregunta de encuesta (tipo, opciones, obligatoria). */
export const FormularioPregunta: React.FC<FormularioPreguntaProps> = ({
  onAgregarPregunta,
  onCancelar,
  preguntaInicial,
}) => {
  const insets = useSafeAreaInsets();
  const esEdicion = !!preguntaInicial;
  const [titulo, setTitulo] = useState(() => preguntaInicial?.titulo ?? '');
  const [tipoPregunta, setTipoPregunta] = useState<TipoPregunta>(
    () => preguntaInicial?.tipo_pregunta ?? 'texto'
  );
  const [esObligatoria, setEsObligatoria] = useState(() => preguntaInicial?.es_obligatoria ?? true);

  // multiple_choice
  const [opciones, setOpciones] = useState<string[]>(
    () => (preguntaInicial?.tipo_pregunta === 'multiple_choice' ? preguntaInicial.opciones ?? [] : [])
  );
  const [nuevaOpcion, setNuevaOpcion] = useState('');

  // horario
  const [slots, setSlots] = useState<string[]>(
    () => (preguntaInicial?.tipo_pregunta === 'horario' ? preguntaInicial.opciones ?? [] : [])
  ); // ISO datetime strings
  const [pickerStep, setPickerStep] = useState<PickerStep>(null);
  const [pendingDate, setPendingDate] = useState<Date>(new Date());

  const agregarOpcion = () => {
    if (nuevaOpcion.trim()) {
      setOpciones([...opciones, nuevaOpcion.trim()]);
      setNuevaOpcion('');
    }
  };

  const eliminarOpcion = (index: number) => {
    setOpciones(opciones.filter((_, i) => i !== index));
  };

  const eliminarSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const iniciarAgregarSlot = () => {
    setPendingDate(new Date());
    setPickerStep('date');
  };

  const onDateConfirm = (date: Date) => {
    setPendingDate(date);
    setPickerStep('time');
  };

  const onTimeConfirm = (time: Date) => {
    // El picker recibe pendingDate como value y devuelve un Date completo
    // (fecha de pendingDate + hora elegida). Se usa directo igual que en solicitudes.
    setSlots([...slots, time.toISOString()]);
    setPickerStep(null);
  };

  const onPickerCancel = () => setPickerStep(null);

  const handleGuardar = () => {
    if (!titulo.trim()) {
      Alert.alert('Error', 'El título de la pregunta es obligatorio');
      return;
    }

    if (tipoPregunta === 'multiple_choice' && opciones.length < 2) {
      Alert.alert('Error', 'Debes agregar al menos 2 opciones para preguntas de opción múltiple');
      return;
    }

    if (tipoPregunta === 'horario' && slots.length < 2) {
      Alert.alert('Error', 'Debes agregar al menos 2 horarios para preguntas de tipo horario');
      return;
    }

    const pregunta: Pregunta = {
      titulo: titulo.trim(),
      tipo_pregunta: tipoPregunta,
      orden: 0,
      es_obligatoria: esObligatoria,
      opciones: tipoPregunta === 'multiple_choice' ? opciones
        : tipoPregunta === 'horario' ? slots
        : undefined,
    };

    onAgregarPregunta(pregunta);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={KEYBOARD_BEHAVIOR}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ThemedText type="title" style={styles.pageTitle}>
        {esEdicion ? 'Editar Pregunta' : 'Nueva Pregunta'}
      </ThemedText>

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
              { value: 'horario', label: '🕐 Horario' },
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

          {tipoPregunta === 'horario' && (
            <View style={styles.opcionesSection}>
              <ThemedText style={styles.subLabel}>Horarios disponibles</ThemedText>

              {slots.map((slot, index) => (
                <View key={index} style={styles.slotItem}>
                  <Ionicons name="time-outline" size={16} color="#2a4f86" style={{ marginRight: 6 }} />
                  <Text style={styles.slotItemText}>{formatHorarioSlot(slot)}</Text>
                  <TouchableOpacity onPress={() => eliminarSlot(index)}>
                    <Ionicons name="close-circle" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.agregarSlotButton} onPress={iniciarAgregarSlot}>
                <Ionicons name="add-circle-outline" size={18} color={colors.lightTint} />
                <Text style={styles.agregarSlotText}>+ Agregar horario</Text>
              </TouchableOpacity>
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
          <Text style={styles.guardarButtonText}>
            {esEdicion ? 'Guardar Cambios' : 'Guardar Pregunta'}
          </Text>
        </TouchableOpacity>
      </View>

      {pickerStep === 'date' && (
        <DateTimePicker
          visible
          value={pendingDate}
          mode="date"
          onConfirm={onDateConfirm}
          onCancel={onPickerCancel}
        />
      )}
      {pickerStep === 'time' && (
        <DateTimePicker
          visible
          value={pendingDate}
          mode="time"
          is24Hour
          onConfirm={onTimeConfirm}
          onCancel={onPickerCancel}
        />
      )}
    </KeyboardAvoidingView>
  );
};
