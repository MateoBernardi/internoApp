import type { Novedad } from '@/features/Novedades/models/Novedades';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

interface NovedadFormModalProps {
  visible: boolean;
  novedad?: Novedad | null;
  onClose: () => void;
  onSubmit: (data: Omit<Novedad, 'id' | 'createdAt'>) => Promise<void>;
  mode: 'create' | 'edit';
}

// Adaptamos los datos para la librería (label y value)
const TIPOS_NOVEDAD = [
  { label: 'General', value: 1 },
  { label: 'Eventos', value: 2 },
  { label: 'Supermercado', value: 3 },
  { label: 'Mantenimiento', value: 4 },
  { label: 'Seguridad e Higiene', value: 5 },
  { label: 'Personas y Relaciones', value: 6 },
  { label: 'Capacitación', value: 7 },
  { label: 'Comunicados', value: 8 },
  { label: 'Insumos', value: 9 },
  { label: 'Otros', value: 10 },
];

const PRIORIDADES = [
  { label: 'Alta', value: 1 },
  { label: 'Media', value: 2 },
  { label: 'Baja', value: 3 },
];

export function NovedadFormModal({
  visible,
  novedad,
  onClose,
  onSubmit,
  mode,
}: NovedadFormModalProps) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<number>(1);
  const [prioridad, setPrioridad] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && novedad) {
        setTitulo(novedad.titulo);
        setDescripcion(novedad.descripcion);
        setTipo(novedad.id_etiqueta || 1);
        setPrioridad(novedad.prioridad);
      } else {
        setTitulo('');
        setDescripcion('');
        setTipo(1);
        setPrioridad(2);
      }
    }
  }, [mode, novedad, visible]);

  const handleSubmit = async () => {
    if (!titulo.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        id_etiqueta: tipo,
        prioridad,
      });
      onClose();
    } catch (error) {
      console.error('Error al guardar novedad:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Usamos un View simple como overlay para evitar conflictos de gestos */}
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            {/* Quitamos flex: 1 del ScrollView y usamos flexGrow */}
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.headerTitle}>
                {mode === 'create' ? 'Crear Nueva Novedad' : 'Editar Novedad'}
              </Text>

              {/* Título */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Título</Text>
                <TextInput
                  style={styles.input}
                  value={titulo}
                  onChangeText={setTitulo}
                  placeholder="Título"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Descripción */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={descripcion}
                  onChangeText={setDescripcion}
                  placeholder="Descripción"
                  placeholderTextColor="#9ca3af"
                  multiline
                />
              </View>

              {/* Categoría */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Categoría</Text>
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={TIPOS_NOVEDAD}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  value={tipo}
                  onChange={item => setTipo(item.value)}
                />
              </View>

              {/* Prioridad */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Prioridad</Text>
                <Dropdown
                  style={styles.dropdown}
                  data={PRIORIDADES}
                  labelField="label"
                  valueField="value"
                  value={prioridad}
                  onChange={item => setPrioridad(item.value)}
                />
              </View>

              {/* Botones */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, !titulo.trim() && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={!titulo.trim() || loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? '...' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Un poco más oscuro para ver si el modal resalta
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 450,
    // Importante: No uses maxHeight solo, dale un espacio mínimo o deja que crezca
    maxHeight: '85%', 
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1, // Esto asegura que el contenido empuje las paredes del modal
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },
  dropdown: {
    height: 50,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },
  placeholderStyle: {
    fontSize: 15,
    color: '#9ca3af',
  },
  selectedTextStyle: {
    fontSize: 15,
    color: '#111827',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingBottom: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});