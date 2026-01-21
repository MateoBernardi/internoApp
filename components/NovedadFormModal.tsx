import type { Novedad } from '@/features/Novedades/models/Novedades';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

interface NovedadFormModalProps {
  visible: boolean;
  novedad?: Novedad | null;
  onClose: () => void;
  onSubmit: (data: Omit<Novedad, 'id' | 'createdAt'>) => Promise<void>;
  mode: 'create' | 'edit';
}

const TIPOS_NOVEDAD = [
  { id: 1, nombre: 'General' },
  { id: 2, nombre: 'Eventos' },
  { id: 3, nombre: 'Supermercado' },
  { id: 4, nombre: 'Mantenimiento' },
  { id: 5, nombre: 'Seguridad e Higiene' },
  { id: 6, nombre: 'Personas y Relaciones' },
  { id: 7, nombre: 'Capacitación' },
  { id: 8, nombre: 'Comunicados' },
  { id: 9, nombre: 'Insumos' },
  { id: 10, nombre: 'Otros' },
];

const PRIORIDADES = [
  { id: 1, nombre: 'Alta' },
  { id: 2, nombre: 'Media' },
  { id: 3, nombre: 'Baja' },
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
        createdBy: novedad?.createdBy || 'usuario', // Se puede obtener del contexto si es necesario
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
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
                    placeholder="Título de la novedad"
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
                    placeholder="Descripción de la novedad"
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Categoría */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Categoría</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={tipo}
                      onValueChange={(value) => setTipo(value)}
                      style={styles.picker}
                    >
                      {TIPOS_NOVEDAD.map((tipoItem) => (
                        <Picker.Item
                          key={tipoItem.id}
                          label={tipoItem.nombre}
                          value={tipoItem.id}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Prioridad */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Prioridad</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={prioridad}
                      onValueChange={(value) => setPrioridad(value)}
                      style={styles.picker}
                    >
                      {PRIORIDADES.map((prioridadItem) => (
                        <Picker.Item
                          key={prioridadItem.id}
                          label={prioridadItem.nombre}
                          value={prioridadItem.id}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Botones */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onClose}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!titulo.trim() || loading) && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!titulo.trim() || loading}
                  >
                    <Text style={styles.submitButtonText}>
                      {loading ? 'Guardando...' : mode === 'create' ? 'Crear' : 'Guardar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollView: {
    flex: 1,
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  picker: {
    height: 50,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
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
